using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Data;
using JiraClone.Api.DTOs;
using JiraClone.Api.Models;

namespace JiraClone.Api.Services;

public class JiraCompatibilityService : IJiraCompatibilityService
{
    private readonly AppDbContext _db;

    public JiraCompatibilityService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<JiraExportRootDto> ExportJiraJsonAsync(int? projectId = null, string? baseUrl = "http://localhost:5000")
    {
        var query = _db.Issues
            .Include(i => i.Project)
            .Include(i => i.Sprint)
            .Include(i => i.Comments)
            .Include(i => i.Worklogs)
            .AsNoTracking()
            .AsQueryable();

        if (projectId.HasValue)
        {
            query = query.Where(i => i.ProjectId == projectId.Value);
        }

        var issues = await query.OrderBy(i => i.Id).ToListAsync();

        var root = new JiraExportRootDto
        {
            StartAt = 0,
            MaxResults = issues.Count,
            Total = issues.Count,
            Issues = new List<JiraIssueExportDto>()
        };

        foreach (var issue in issues)
        {
            var exportIssue = new JiraIssueExportDto
            {
                Id = issue.Id.ToString(),
                Key = issue.Key,
                Self = $"{baseUrl}/rest/api/2/issue/{issue.Key}",
                Fields = new JiraIssueFieldsDto
                {
                    Summary = issue.Summary,
                    Description = issue.Description,
                    IssueType = new JiraNamedObject
                    {
                        Id = issue.IssueType == "Subtask" ? "10005" : "10001",
                        Name = issue.IssueType,
                        Subtask = issue.IssueType.Equals("Subtask", StringComparison.OrdinalIgnoreCase)
                    },
                    Project = new JiraProjectFieldDto
                    {
                        Id = issue.Project?.Id.ToString() ?? issue.ProjectId.ToString(),
                        Key = issue.Project?.Key ?? "JIRA",
                        Name = issue.Project?.Name ?? "Jira Project",
                        ProjectTypeKey = issue.Project?.ProjectTypeKey ?? "software"
                    },
                    Status = new JiraStatusFieldDto
                    {
                        Name = issue.Status,
                        StatusCategory = new JiraStatusCategoryDto
                        {
                            Id = issue.Status == "Done" ? 3 : (issue.Status == "In Progress" || issue.Status == "In Review" ? 4 : 2),
                            Key = issue.Status == "Done" ? "done" : (issue.Status == "In Progress" || issue.Status == "In Review" ? "indeterminate" : "new"),
                            Name = issue.Status
                        }
                    },
                    Priority = new JiraNamedObject
                    {
                        Name = issue.Priority
                    },
                    Resolution = !string.IsNullOrEmpty(issue.Resolution) ? new JiraNamedObject { Name = issue.Resolution } : null,
                    ResolutionDate = issue.ResolvedAt?.ToString("o"),
                    Assignee = !string.IsNullOrEmpty(issue.AssigneeName) ? new JiraUserFieldDto
                    {
                        AccountId = issue.AssigneeId ?? "usr-" + (issue.AssigneeName.GetHashCode() & 0x7FFFFFFF),
                        DisplayName = issue.AssigneeName,
                        EmailAddress = issue.AssigneeEmail,
                        AvatarUrls = new Dictionary<string, string>
                        {
                            ["48x48"] = issue.AssigneeAvatarUrl ?? $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(issue.AssigneeName)}&background=0D8ABC&color=fff"
                        }
                    } : null,
                    Reporter = new JiraUserFieldDto
                    {
                        AccountId = issue.ReporterId ?? "usr-admin",
                        DisplayName = issue.ReporterName ?? "Administrator",
                        EmailAddress = issue.ReporterEmail,
                        AvatarUrls = new Dictionary<string, string>
                        {
                            ["48x48"] = issue.ReporterAvatarUrl ?? "https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff"
                        }
                    },
                    StoryPoints = issue.StoryPoints,
                    EpicKey = issue.EpicKey,
                    Parent = !string.IsNullOrEmpty(issue.ParentIssueKey) ? new JiraParentIssueDto { Key = issue.ParentIssueKey } : null,
                    Labels = !string.IsNullOrEmpty(issue.Labels) 
                        ? issue.Labels.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
                        : new List<string>(),
                    Components = !string.IsNullOrEmpty(issue.Components)
                        ? issue.Components.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                            .Select(c => new JiraNamedObject { Name = c }).ToList()
                        : new List<JiraNamedObject>(),
                    Created = issue.CreatedAt.ToString("o"),
                    Updated = issue.UpdatedAt.ToString("o"),
                    TimeTracking = new JiraTimeTrackingDto
                    {
                        OriginalEstimateSeconds = (issue.OriginalEstimateMinutes ?? 0) * 60,
                        RemainingEstimateSeconds = (issue.RemainingEstimateMinutes ?? 0) * 60,
                        TimeSpentSeconds = (issue.TimeSpentMinutes ?? 0) * 60,
                        OriginalEstimate = FormatDuration(issue.OriginalEstimateMinutes),
                        RemainingEstimate = FormatDuration(issue.RemainingEstimateMinutes),
                        TimeSpent = FormatDuration(issue.TimeSpentMinutes)
                    },
                    Comment = new JiraCommentsContainerDto
                    {
                        Comments = issue.Comments.Select(c => new JiraCommentDto
                        {
                            Id = c.Id.ToString(),
                            Author = new JiraUserFieldDto
                            {
                                DisplayName = c.AuthorName,
                                EmailAddress = c.AuthorEmail
                            },
                            Body = c.Body,
                            Created = c.CreatedAt.ToString("o"),
                            Updated = c.UpdatedAt?.ToString("o")
                        }).ToList()
                    }
                }
            };

            if (issue.Sprint != null)
            {
                exportIssue.Fields.Sprints = new List<JiraSprintFieldDto>
                {
                    new JiraSprintFieldDto
                    {
                        Id = issue.Sprint.Id,
                        Name = issue.Sprint.Name,
                        State = issue.Sprint.State
                    }
                };
            }

            root.Issues.Add(exportIssue);
        }

        return root;
    }

    public async Task<byte[]> ExportJiraCsvAsync(int? projectId = null)
    {
        var query = _db.Issues
            .Include(i => i.Project)
            .Include(i => i.Sprint)
            .Include(i => i.Comments)
            .AsNoTracking()
            .AsQueryable();

        if (projectId.HasValue)
        {
            query = query.Where(i => i.ProjectId == projectId.Value);
        }

        var issues = await query.OrderBy(i => i.Id).ToListAsync();

        using var memoryStream = new MemoryStream();
        using var writer = new StreamWriter(memoryStream, Encoding.UTF8);
        using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true
        });

        // Write Header matching standard Jira CSV Export
        csv.WriteField("Issue Type");
        csv.WriteField("Issue key");
        csv.WriteField("Summary");
        csv.WriteField("Description");
        csv.WriteField("Status");
        csv.WriteField("Priority");
        csv.WriteField("Resolution");
        csv.WriteField("Assignee");
        csv.WriteField("Reporter");
        csv.WriteField("Story Points");
        csv.WriteField("Sprint");
        csv.WriteField("Labels");
        csv.WriteField("Components");
        csv.WriteField("Created");
        csv.WriteField("Updated");
        csv.WriteField("Comment");
        await csv.NextRecordAsync();

        foreach (var issue in issues)
        {
            csv.WriteField(issue.IssueType);
            csv.WriteField(issue.Key);
            csv.WriteField(issue.Summary);
            csv.WriteField(issue.Description ?? string.Empty);
            csv.WriteField(issue.Status);
            csv.WriteField(issue.Priority);
            csv.WriteField(issue.Resolution ?? string.Empty);
            csv.WriteField(issue.AssigneeName ?? string.Empty);
            csv.WriteField(issue.ReporterName ?? string.Empty);
            csv.WriteField(issue.StoryPoints?.ToString() ?? string.Empty);
            csv.WriteField(issue.Sprint?.Name ?? string.Empty);
            csv.WriteField(issue.Labels ?? string.Empty);
            csv.WriteField(issue.Components ?? string.Empty);
            csv.WriteField(issue.CreatedAt.ToString("g"));
            csv.WriteField(issue.UpdatedAt.ToString("g"));
            
            var commentsCombined = string.Join(" --- ", issue.Comments.Select(c => $"{c.AuthorName} [{c.CreatedAt:g}]: {c.Body}"));
            csv.WriteField(commentsCombined);

            await csv.NextRecordAsync();
        }

        await writer.FlushAsync();
        return memoryStream.ToArray();
    }

    public async Task<JiraImportResultDto> ImportJiraJsonAsync(Stream jsonStream, int? targetProjectId = null)
    {
        var result = new JiraImportResultDto();

        using var doc = await JsonDocument.ParseAsync(jsonStream);
        var root = doc.RootElement;

        JsonElement issuesElement;
        if (root.TryGetProperty("issues", out var foundIssues))
        {
            issuesElement = foundIssues;
        }
        else if (root.ValueKind == JsonValueKind.Array)
        {
            issuesElement = root;
        }
        else
        {
            result.Success = false;
            result.Message = "Invalid Jira JSON: Expected an 'issues' array or root array of Jira issues.";
            return result;
        }

        Project? project = null;
        if (targetProjectId.HasValue)
        {
            project = await _db.Projects.Include(p => p.Sprints).FirstOrDefaultAsync(p => p.Id == targetProjectId.Value);
        }

        var importedCount = 0;
        var sprintsCreated = 0;

        foreach (var item in issuesElement.EnumerateArray())
        {
            result.TotalRead++;

            string key = item.TryGetProperty("key", out var kElem) ? kElem.GetString() ?? "" : "";
            JsonElement fields = item.TryGetProperty("fields", out var fElem) ? fElem : item;

            string summary = GetStringProperty(fields, "summary");
            if (string.IsNullOrWhiteSpace(summary))
            {
                result.Warnings.Add($"Issue item {result.TotalRead} skipped: summary is empty.");
                continue;
            }

            // Determine Project
            if (project == null)
            {
                string projectKey = "";
                string projectName = "Imported Project";

                if (fields.TryGetProperty("project", out var projElem))
                {
                    projectKey = GetStringProperty(projElem, "key");
                    projectName = GetStringProperty(projElem, "name");
                }
                else if (!string.IsNullOrEmpty(key) && key.Contains('-'))
                {
                    projectKey = key.Split('-')[0];
                }

                if (string.IsNullOrEmpty(projectKey))
                {
                    projectKey = "JIRA";
                }

                project = await _db.Projects.Include(p => p.Sprints).FirstOrDefaultAsync(p => p.Key.ToUpper() == projectKey.ToUpper());
                if (project == null)
                {
                    project = new Project
                    {
                        Key = projectKey.ToUpper(),
                        Name = string.IsNullOrWhiteSpace(projectName) ? $"Project {projectKey}" : projectName,
                        Description = "Imported from Jira JSON",
                        ProjectTypeKey = "software"
                    };
                    _db.Projects.Add(project);
                    await _db.SaveChangesAsync();
                }
            }

            // Parse Issue Type
            string issueType = "Story";
            if (fields.TryGetProperty("issuetype", out var itElem))
            {
                issueType = GetStringProperty(itElem, "name");
            }
            if (string.IsNullOrWhiteSpace(issueType)) issueType = "Story";

            // Description can be string or Atlassian Document Format (ADF) object
            string description = ExtractDescription(fields);

            // Status
            string status = "To Do";
            if (fields.TryGetProperty("status", out var stElem))
            {
                status = GetStringProperty(stElem, "name");
            }
            if (string.IsNullOrWhiteSpace(status)) status = "To Do";

            // Priority
            string priority = "Medium";
            if (fields.TryGetProperty("priority", out var priElem))
            {
                priority = GetStringProperty(priElem, "name");
            }
            if (string.IsNullOrWhiteSpace(priority)) priority = "Medium";

            // Assignee
            string? assigneeName = null;
            string? assigneeEmail = null;
            if (fields.TryGetProperty("assignee", out var assElem) && assElem.ValueKind == JsonValueKind.Object)
            {
                assigneeName = GetStringProperty(assElem, "displayName") ?? GetStringProperty(assElem, "name");
                assigneeEmail = GetStringProperty(assElem, "emailAddress");
            }

            // Reporter
            string? reporterName = "Admin";
            string? reporterEmail = null;
            if (fields.TryGetProperty("reporter", out var repElem) && repElem.ValueKind == JsonValueKind.Object)
            {
                reporterName = GetStringProperty(repElem, "displayName") ?? GetStringProperty(repElem, "name");
                reporterEmail = GetStringProperty(repElem, "emailAddress");
            }

            // Story Points
            double? storyPoints = null;
            if (fields.TryGetProperty("customfield_10026", out var spElem) && spElem.TryGetDouble(out var spVal))
            {
                storyPoints = spVal;
            }
            else if (fields.TryGetProperty("storypoints", out var spElem2) && spElem2.TryGetDouble(out var spVal2))
            {
                storyPoints = spVal2;
            }

            // Sprints
            int? sprintId = null;
            if (fields.TryGetProperty("customfield_10020", out var sprintElem) && sprintElem.ValueKind == JsonValueKind.Array)
            {
                var firstSprint = sprintElem.EnumerateArray().FirstOrDefault();
                if (firstSprint.ValueKind == JsonValueKind.Object)
                {
                    string sprintName = GetStringProperty(firstSprint, "name");
                    string sprintState = GetStringProperty(firstSprint, "state");
                    if (!string.IsNullOrWhiteSpace(sprintName))
                    {
                        var existingSprint = project.Sprints.FirstOrDefault(s => s.Name.Equals(sprintName, StringComparison.OrdinalIgnoreCase));
                        if (existingSprint == null)
                        {
                            existingSprint = new Sprint
                            {
                                ProjectId = project.Id,
                                Name = sprintName,
                                State = string.IsNullOrWhiteSpace(sprintState) ? "active" : sprintState.ToLower()
                            };
                            _db.Sprints.Add(existingSprint);
                            await _db.SaveChangesAsync();
                            project.Sprints.Add(existingSprint);
                            sprintsCreated++;
                        }
                        sprintId = existingSprint.Id;
                    }
                }
            }

            // Labels
            string? labels = null;
            if (fields.TryGetProperty("labels", out var lblElem) && lblElem.ValueKind == JsonValueKind.Array)
            {
                var lblList = lblElem.EnumerateArray().Select(l => l.GetString()).Where(l => !string.IsNullOrEmpty(l));
                labels = string.Join(",", lblList);
            }

            // Components
            string? components = null;
            if (fields.TryGetProperty("components", out var cmpElem) && cmpElem.ValueKind == JsonValueKind.Array)
            {
                var cmpList = cmpElem.EnumerateArray()
                    .Select(c => c.ValueKind == JsonValueKind.Object ? GetStringProperty(c, "name") : c.GetString())
                    .Where(c => !string.IsNullOrEmpty(c));
                components = string.Join(",", cmpList);
            }

            // Ensure unique Issue Number and Key
            var lastIssueNum = await _db.Issues.Where(i => i.ProjectId == project.Id).MaxAsync(i => (int?)i.IssueNumber) ?? 0;
            var issueNum = lastIssueNum + 1;
            var newKey = $"{project.Key}-{issueNum}";

            // Check if key from Jira already exists
            if (!string.IsNullOrEmpty(key))
            {
                var existingByKey = await _db.Issues.FirstOrDefaultAsync(i => i.Key.ToUpper() == key.ToUpper());
                if (existingByKey != null)
                {
                    // update existing
                    existingByKey.Summary = summary;
                    existingByKey.Description = description;
                    existingByKey.Status = status;
                    existingByKey.Priority = priority;
                    existingByKey.IssueType = issueType;
                    existingByKey.AssigneeName = assigneeName;
                    existingByKey.AssigneeEmail = assigneeEmail;
                    existingByKey.StoryPoints = storyPoints;
                    existingByKey.Labels = labels;
                    existingByKey.Components = components;
                    existingByKey.UpdatedAt = DateTime.UtcNow;
                    importedCount++;
                    result.ImportedKeys.Add(existingByKey.Key);
                    continue;
                }
                newKey = key;
                if (int.TryParse(key.Split('-').LastOrDefault(), out var parsedNum))
                {
                    issueNum = parsedNum;
                }
            }

            var newIssue = new Issue
            {
                Key = newKey,
                IssueNumber = issueNum,
                ProjectId = project.Id,
                IssueType = issueType,
                Summary = summary,
                Description = description,
                Status = NormalizeStatus(status),
                Priority = NormalizePriority(priority),
                AssigneeName = assigneeName,
                AssigneeEmail = assigneeEmail,
                ReporterName = reporterName ?? "Admin",
                ReporterEmail = reporterEmail,
                StoryPoints = storyPoints,
                SprintId = sprintId,
                Labels = labels,
                Components = components,
                Order = issueNum,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Process Comments if present
            if (fields.TryGetProperty("comment", out var commentsElem) && commentsElem.TryGetProperty("comments", out var commArr) && commArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var c in commArr.EnumerateArray())
                {
                    string commentBody = ExtractCommentBody(c);
                    string authorName = "Jira User";
                    if (c.TryGetProperty("author", out var authorElem))
                    {
                        authorName = GetStringProperty(authorElem, "displayName") ?? GetStringProperty(authorElem, "name") ?? "Jira User";
                    }

                    if (!string.IsNullOrWhiteSpace(commentBody))
                    {
                        newIssue.Comments.Add(new IssueComment
                        {
                            AuthorName = authorName,
                            Body = commentBody,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            _db.Issues.Add(newIssue);
            importedCount++;
            result.ImportedKeys.Add(newIssue.Key);
        }

        await _db.SaveChangesAsync();

        result.Success = true;
        result.IssuesImported = importedCount;
        result.SprintsCreated = sprintsCreated;
        result.Message = $"Successfully imported {importedCount} issues into project '{project?.Name ?? "Jira"}'.";
        return result;
    }

    public async Task<JiraImportResultDto> ImportJiraCsvAsync(Stream csvStream, int targetProjectId)
    {
        var result = new JiraImportResultDto();

        var project = await _db.Projects.Include(p => p.Sprints).FirstOrDefaultAsync(p => p.Id == targetProjectId);
        if (project == null)
        {
            result.Success = false;
            result.Message = $"Target project with ID {targetProjectId} not found.";
            return result;
        }

        using var reader = new StreamReader(csvStream, Encoding.UTF8);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HeaderValidated = null,
            MissingFieldFound = null,
            PrepareHeaderForMatch = args => args.Header.ToLower().Replace(" ", "").Replace("_", "").Replace("-", "")
        });

        var records = csv.GetRecords<dynamic>().ToList();
        result.TotalRead = records.Count;

        var lastIssueNum = await _db.Issues.Where(i => i.ProjectId == project.Id).MaxAsync(i => (int?)i.IssueNumber) ?? 0;
        var importedCount = 0;
        var sprintsCreated = 0;

        foreach (var record in records)
        {
            var dict = (IDictionary<string, object>)record;
            
            string summary = GetDictValue(dict, "summary", "title", "issue summary") ?? "";
            if (string.IsNullOrWhiteSpace(summary))
            {
                result.Warnings.Add($"Row {importedCount + 1} skipped because summary was missing.");
                continue;
            }

            string issueType = GetDictValue(dict, "issuetype", "type", "issue type") ?? "Story";
            string key = GetDictValue(dict, "issuekey", "key", "issue id") ?? "";
            string description = GetDictValue(dict, "description", "details", "body") ?? "";
            string status = GetDictValue(dict, "status", "issue status", "state") ?? "To Do";
            string priority = GetDictValue(dict, "priority", "urgency") ?? "Medium";
            string resolution = GetDictValue(dict, "resolution") ?? "Unresolved";
            string assignee = GetDictValue(dict, "assignee", "assigned to") ?? "";
            string reporter = GetDictValue(dict, "reporter", "created by") ?? "Admin";
            string storyPointsStr = GetDictValue(dict, "storypoints", "story points", "estimate") ?? "";
            string sprintName = GetDictValue(dict, "sprint", "sprints") ?? "";
            string labels = GetDictValue(dict, "labels", "tags") ?? "";
            string components = GetDictValue(dict, "components", "component") ?? "";
            string commentsStr = GetDictValue(dict, "comment", "comments") ?? "";

            double? storyPoints = null;
            if (double.TryParse(storyPointsStr, out var sp)) storyPoints = sp;

            int? sprintId = null;
            if (!string.IsNullOrWhiteSpace(sprintName))
            {
                var existingSprint = project.Sprints.FirstOrDefault(s => s.Name.Equals(sprintName.Trim(), StringComparison.OrdinalIgnoreCase));
                if (existingSprint == null)
                {
                    existingSprint = new Sprint
                    {
                        ProjectId = project.Id,
                        Name = sprintName.Trim(),
                        State = "active"
                    };
                    _db.Sprints.Add(existingSprint);
                    await _db.SaveChangesAsync();
                    project.Sprints.Add(existingSprint);
                    sprintsCreated++;
                }
                sprintId = existingSprint.Id;
            }

            var nextNum = ++lastIssueNum;
            var issueKey = string.IsNullOrWhiteSpace(key) ? $"{project.Key}-{nextNum}" : key;

            var issue = new Issue
            {
                Key = issueKey,
                IssueNumber = nextNum,
                ProjectId = project.Id,
                IssueType = issueType,
                Summary = summary,
                Description = description,
                Status = NormalizeStatus(status),
                Priority = NormalizePriority(priority),
                Resolution = resolution,
                AssigneeName = string.IsNullOrWhiteSpace(assignee) ? null : assignee,
                ReporterName = string.IsNullOrWhiteSpace(reporter) ? "Admin" : reporter,
                StoryPoints = storyPoints,
                SprintId = sprintId,
                Labels = labels,
                Components = components,
                Order = nextNum,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (!string.IsNullOrWhiteSpace(commentsStr))
            {
                issue.Comments.Add(new IssueComment
                {
                    AuthorName = reporter ?? "Jira User",
                    Body = commentsStr,
                    CreatedAt = DateTime.UtcNow
                });
            }

            _db.Issues.Add(issue);
            importedCount++;
            result.ImportedKeys.Add(issue.Key);
        }

        await _db.SaveChangesAsync();

        result.Success = true;
        result.IssuesImported = importedCount;
        result.SprintsCreated = sprintsCreated;
        result.Message = $"Successfully imported {importedCount} issues from CSV into project '{project.Name}'.";
        return result;
    }

    public async Task<string> GenerateSampleJiraJsonAsync()
    {
        var sample = new JiraExportRootDto
        {
            StartAt = 0,
            MaxResults = 3,
            Total = 3,
            Issues = new List<JiraIssueExportDto>
            {
                new JiraIssueExportDto
                {
                    Id = "10001",
                    Key = "JIRA-1",
                    Self = "http://localhost:5000/rest/api/2/issue/JIRA-1",
                    Fields = new JiraIssueFieldsDto
                    {
                        Summary = "Set up user authentication and JWT tokens",
                        Description = "Implement secure JWT authentication endpoint for the system.",
                        IssueType = new JiraNamedObject { Id = "10001", Name = "Story", Subtask = false },
                        Project = new JiraProjectFieldDto { Id = "100", Key = "JIRA", Name = "Jira Sample Project", ProjectTypeKey = "software" },
                        Status = new JiraStatusFieldDto { Name = "In Progress" },
                        Priority = new JiraNamedObject { Name = "High" },
                        Assignee = new JiraUserFieldDto { AccountId = "usr-1", DisplayName = "Sajidur Rahman", EmailAddress = "sajid@example.com" },
                        Reporter = new JiraUserFieldDto { AccountId = "usr-admin", DisplayName = "Product Owner", EmailAddress = "po@example.com" },
                        StoryPoints = 5,
                        Labels = new List<string> { "backend", "security" },
                        Components = new List<JiraNamedObject> { new() { Name = "Auth" } },
                        Created = DateTime.UtcNow.AddDays(-2).ToString("o"),
                        Updated = DateTime.UtcNow.ToString("o"),
                        Comment = new JiraCommentsContainerDto
                        {
                            Comments = new List<JiraCommentDto>
                            {
                                new()
                                {
                                    Id = "1",
                                    Author = new JiraUserFieldDto { DisplayName = "Sajidur Rahman" },
                                    Body = "Initial token generation logic is complete, tests are passing.",
                                    Created = DateTime.UtcNow.AddHours(-3).ToString("o")
                                }
                            }
                        }
                    }
                },
                new JiraIssueExportDto
                {
                    Id = "10002",
                    Key = "JIRA-2",
                    Self = "http://localhost:5000/rest/api/2/issue/JIRA-2",
                    Fields = new JiraIssueFieldsDto
                    {
                        Summary = "Fix issue drag and drop reordering in Kanban board",
                        Description = "Cards should persist their status and sequence order when dragged.",
                        IssueType = new JiraNamedObject { Id = "10002", Name = "Bug", Subtask = false },
                        Project = new JiraProjectFieldDto { Id = "100", Key = "JIRA", Name = "Jira Sample Project", ProjectTypeKey = "software" },
                        Status = new JiraStatusFieldDto { Name = "To Do" },
                        Priority = new JiraNamedObject { Name = "Highest" },
                        Assignee = new JiraUserFieldDto { AccountId = "usr-2", DisplayName = "Frontend Engineer", EmailAddress = "fe@example.com" },
                        Reporter = new JiraUserFieldDto { AccountId = "usr-admin", DisplayName = "QA Lead" },
                        StoryPoints = 3,
                        Labels = new List<string> { "ui", "kanban", "bug" },
                        Created = DateTime.UtcNow.AddDays(-1).ToString("o"),
                        Updated = DateTime.UtcNow.ToString("o")
                    }
                },
                new JiraIssueExportDto
                {
                    Id = "10003",
                    Key = "JIRA-3",
                    Self = "http://localhost:5000/rest/api/2/issue/JIRA-3",
                    Fields = new JiraIssueFieldsDto
                    {
                        Summary = "Implement standard Jira CSV & JSON bulk export/import",
                        Description = "Allow full interoperability with Jira Cloud and Jira Server backup files.",
                        IssueType = new JiraNamedObject { Id = "10003", Name = "Epic", Subtask = false },
                        Project = new JiraProjectFieldDto { Id = "100", Key = "JIRA", Name = "Jira Sample Project", ProjectTypeKey = "software" },
                        Status = new JiraStatusFieldDto { Name = "Done" },
                        Priority = new JiraNamedObject { Name = "High" },
                        Resolution = new JiraNamedObject { Name = "Done" },
                        Assignee = new JiraUserFieldDto { AccountId = "usr-1", DisplayName = "Sajidur Rahman" },
                        StoryPoints = 8,
                        Labels = new List<string> { "import-export", "interop" },
                        Created = DateTime.UtcNow.AddDays(-5).ToString("o"),
                        Updated = DateTime.UtcNow.ToString("o")
                    }
                }
            }
        };

        return await Task.FromResult(JsonSerializer.Serialize(sample, new JsonSerializerOptions { WriteIndented = true }));
    }

    public string GenerateSampleJiraCsv()
    {
        var sb = new StringBuilder();
        sb.AppendLine("Issue Type,Issue key,Summary,Description,Status,Priority,Resolution,Assignee,Reporter,Story Points,Sprint,Labels,Components,Created,Updated,Comment");
        sb.AppendLine("Story,ERP-1,Design Database Schema for Inventory,Design PostgreSQL schema for items and warehouses,In Progress,High,Unresolved,Sajidur Rahman,Admin,5,Sprint 1,\"db,backend\",Inventory,2026-10-20 10:00,2026-10-22 14:00,Schema draft reviewed with team");
        sb.AppendLine("Bug,ERP-2,Stock balance calculation mismatch,Fix floating point rounding error on batch deduction,To Do,Highest,Unresolved,Sajidur Rahman,QA Tester,3,Sprint 1,\"bug,critical\",Inventory,2026-10-21 09:30,2026-10-22 11:15,Reproducible in test environment");
        sb.AppendLine("Task,ERP-3,Implement Jira compatible REST API endpoints,Create /rest/api/2/issue and /rest/api/2/search endpoints,Done,Medium,Fixed,Backend Lead,Admin,8,Sprint 1,\"api,jira\",Integration,2026-10-18 08:00,2026-10-22 17:00,Verified using curl and Postman");
        sb.AppendLine("Story,ERP-4,Create responsive Next.js Jira Board UI,Build interactive Kanban board with column filters and modals,In Progress,High,Unresolved,Frontend Lead,Admin,5,Sprint 1,\"frontend,nextjs\",UI,2026-10-21 14:00,2026-10-22 16:30,Columns and drag-drop implemented");
        return sb.ToString();
    }

    private static string NormalizeStatus(string status)
    {
        var s = status.Trim().ToLowerInvariant();
        if (s.Contains("progress") || s == "doing") return "In Progress";
        if (s.Contains("review") || s.Contains("test") || s.Contains("qa")) return "In Review";
        if (s.Contains("done") || s.Contains("closed") || s.Contains("resolved")) return "Done";
        return "To Do";
    }

    private static string NormalizePriority(string priority)
    {
        var p = priority.Trim().ToLowerInvariant();
        if (p == "highest" || p == "blocker" || p == "critical") return "Highest";
        if (p == "high" || p == "major") return "High";
        if (p == "low" || p == "minor") return "Low";
        if (p == "lowest" || p == "trivial") return "Lowest";
        return "Medium";
    }

    private static string? GetDictValue(IDictionary<string, object> dict, params string[] possibleKeys)
    {
        foreach (var key in possibleKeys)
        {
            var matchKey = dict.Keys.FirstOrDefault(k => k.Equals(key.Replace(" ", "").Replace("_", "").Replace("-", ""), StringComparison.OrdinalIgnoreCase));
            if (matchKey != null && dict[matchKey] != null)
            {
                var val = dict[matchKey].ToString();
                if (!string.IsNullOrWhiteSpace(val)) return val;
            }
        }
        return null;
    }

    private static string GetStringProperty(JsonElement elem, string prop)
    {
        if (elem.TryGetProperty(prop, out var p))
        {
            if (p.ValueKind == JsonValueKind.String) return p.GetString() ?? "";
            if (p.ValueKind == JsonValueKind.Number) return p.GetRawText();
        }
        return "";
    }

    private static string ExtractDescription(JsonElement fields)
    {
        if (fields.TryGetProperty("description", out var descElem))
        {
            if (descElem.ValueKind == JsonValueKind.String) return descElem.GetString() ?? "";
            if (descElem.ValueKind == JsonValueKind.Object)
            {
                // Jira ADF (Atlassian Document Format) simple extraction
                try
                {
                    var sb = new StringBuilder();
                    ExtractAdfText(descElem, sb);
                    var text = sb.ToString().Trim();
                    return string.IsNullOrEmpty(text) ? descElem.GetRawText() : text;
                }
                catch
                {
                    return descElem.GetRawText();
                }
            }
        }
        return "";
    }

    private static void ExtractAdfText(JsonElement node, StringBuilder sb)
    {
        if (node.TryGetProperty("text", out var textNode) && textNode.ValueKind == JsonValueKind.String)
        {
            sb.Append(textNode.GetString()).Append(' ');
        }
        if (node.TryGetProperty("content", out var contentNode) && contentNode.ValueKind == JsonValueKind.Array)
        {
            foreach (var child in contentNode.EnumerateArray())
            {
                ExtractAdfText(child, sb);
            }
            sb.AppendLine();
        }
    }

    private static string ExtractCommentBody(JsonElement commentElem)
    {
        if (commentElem.TryGetProperty("body", out var b))
        {
            if (b.ValueKind == JsonValueKind.String) return b.GetString() ?? "";
            if (b.ValueKind == JsonValueKind.Object)
            {
                var sb = new StringBuilder();
                ExtractAdfText(b, sb);
                return sb.ToString().Trim();
            }
        }
        return "";
    }

    private static string? FormatDuration(int? minutes)
    {
        if (!minutes.HasValue || minutes.Value <= 0) return null;
        var m = minutes.Value;
        var days = m / (8 * 60);
        m %= (8 * 60);
        var hours = m / 60;
        var mins = m % 60;

        var parts = new List<string>();
        if (days > 0) parts.Add($"{days}d");
        if (hours > 0) parts.Add($"{hours}h");
        if (mins > 0) parts.Add($"{mins}m");
        return parts.Count > 0 ? string.Join(" ", parts) : "0m";
    }
}
