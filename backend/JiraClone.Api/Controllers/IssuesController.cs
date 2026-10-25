using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Auth;
using JiraClone.Api.Data;
using JiraClone.Api.DTOs;
using JiraClone.Api.Models;

namespace JiraClone.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IssuesController : ControllerBase
{
    private readonly AppDbContext _db;

    public IssuesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetIssues(
        [FromQuery] int? projectId = null,
        [FromQuery] string? sprint = null, // "active", "backlog", or sprintId
        [FromQuery] int? sprintId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        [FromQuery] string? priority = null,
        [FromQuery] string? assignee = null,
        [FromQuery] string? search = null)
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

        if (sprintId.HasValue)
        {
            query = query.Where(i => i.SprintId == sprintId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(sprint))
        {
            if (sprint.Equals("backlog", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(i => i.SprintId == null);
            }
            else if (sprint.Equals("active", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(i => i.Sprint != null && i.Sprint.State == "active");
            }
            else if (int.TryParse(sprint, out var sId))
            {
                query = query.Where(i => i.SprintId == sId);
            }
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(i => i.Status.ToLower() == status.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(i => i.IssueType.ToLower() == type.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(priority))
        {
            query = query.Where(i => i.Priority.ToLower() == priority.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(assignee))
        {
            query = query.Where(i => i.AssigneeName != null && i.AssigneeName.ToLower().Contains(assignee.ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(i => i.Key.ToLower().Contains(s) || 
                                     i.Summary.ToLower().Contains(s) || 
                                     (i.Description != null && i.Description.ToLower().Contains(s)) ||
                                     (i.Labels != null && i.Labels.ToLower().Contains(s)));
        }

        var issues = await query
            .OrderBy(i => i.Order)
            .ThenByDescending(i => i.Id)
            .Select(i => new
            {
                i.Id,
                i.Key,
                i.IssueNumber,
                i.ProjectId,
                ProjectKey = i.Project != null ? i.Project.Key : "",
                ProjectName = i.Project != null ? i.Project.Name : "",
                i.IssueType,
                i.Summary,
                i.Description,
                i.Status,
                i.Priority,
                i.Resolution,
                i.AssigneeName,
                i.AssigneeEmail,
                i.AssigneeAvatarUrl,
                i.ReporterName,
                i.ReporterEmail,
                i.StoryPoints,
                i.OriginalEstimateMinutes,
                i.RemainingEstimateMinutes,
                i.TimeSpentMinutes,
                i.SprintId,
                SprintName = i.Sprint != null ? i.Sprint.Name : null,
                i.EpicKey,
                i.ParentIssueKey,
                Labels = !string.IsNullOrEmpty(i.Labels) ? i.Labels.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) : Array.Empty<string>(),
                Components = !string.IsNullOrEmpty(i.Components) ? i.Components.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) : Array.Empty<string>(),
                CommentCount = i.Comments.Count,
                i.DueDate,
                i.StartDate,
                i.FixVersion,
                i.BlockedBy,
                i.CustomFieldsJson,
                i.Order,
                i.CreatedAt,
                i.UpdatedAt
            })
            .ToListAsync();

        return Ok(issues);
    }

    [HttpGet("{idOrKey}")]
    public async Task<IActionResult> GetIssue(string idOrKey)
    {
        var query = _db.Issues
            .Include(i => i.Project)
            .Include(i => i.Sprint)
            .Include(i => i.Comments.OrderByDescending(c => c.CreatedAt))
            .Include(i => i.Worklogs.OrderByDescending(w => w.CreatedAt))
            .Include(i => i.Activities.OrderByDescending(a => a.CreatedAt))
            .AsNoTracking();

        Issue? issue = null;
        if (int.TryParse(idOrKey, out var id))
        {
            issue = await query.FirstOrDefaultAsync(i => i.Id == id);
        }
        
        if (issue == null)
        {
            issue = await query.FirstOrDefaultAsync(i => i.Key.ToUpper() == idOrKey.ToUpper());
        }

        if (issue == null) return NotFound(new { message = $"Issue '{idOrKey}' not found." });

        return Ok(new
        {
            issue.Id,
            issue.Key,
            issue.IssueNumber,
            issue.ProjectId,
            ProjectKey = issue.Project?.Key,
            ProjectName = issue.Project?.Name,
            issue.IssueType,
            issue.Summary,
            issue.Description,
            issue.Status,
            issue.Priority,
            issue.Resolution,
            issue.ResolvedAt,
            issue.AssigneeId,
            issue.AssigneeName,
            issue.AssigneeEmail,
            issue.AssigneeAvatarUrl,
            issue.ReporterId,
            issue.ReporterName,
            issue.ReporterEmail,
            issue.StoryPoints,
            issue.OriginalEstimateMinutes,
            issue.RemainingEstimateMinutes,
            issue.TimeSpentMinutes,
            issue.SprintId,
            SprintName = issue.Sprint?.Name,
            SprintState = issue.Sprint?.State,
            issue.EpicKey,
            issue.ParentIssueKey,
            Labels = !string.IsNullOrEmpty(issue.Labels) ? issue.Labels.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) : Array.Empty<string>(),
            Components = !string.IsNullOrEmpty(issue.Components) ? issue.Components.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) : Array.Empty<string>(),
            issue.DueDate,
            issue.StartDate,
            issue.FixVersion,
            issue.BlockedBy,
            issue.CustomFieldsJson,
            issue.Order,
            issue.CreatedAt,
            issue.UpdatedAt,
            issue.Comments,
            issue.Worklogs,
            issue.Activities
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateIssue([FromBody] CreateIssueDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Summary))
        {
            return BadRequest(new { message = "Issue summary is required." });
        }

        var project = await _db.Projects.FindAsync(dto.ProjectId);
        if (project == null) return NotFound(new { message = "Project not found." });

        var lastNumber = await _db.Issues
            .Where(i => i.ProjectId == project.Id)
            .MaxAsync(i => (int?)i.IssueNumber) ?? 0;

        var nextNumber = lastNumber + 1;
        var key = $"{project.Key}-{nextNumber}";

        var issue = new Issue
        {
            Key = key,
            IssueNumber = nextNumber,
            ProjectId = project.Id,
            IssueType = dto.IssueType ?? "Story",
            Summary = dto.Summary.Trim(),
            Description = dto.Description,
            Status = dto.Status ?? "To Do",
            Priority = dto.Priority ?? "Medium",
            AssigneeName = dto.AssigneeName,
            AssigneeEmail = dto.AssigneeEmail,
            AssigneeAvatarUrl = !string.IsNullOrWhiteSpace(dto.AssigneeName) ? $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(dto.AssigneeName)}&background=0D8ABC&color=fff" : null,
            ReporterName = dto.ReporterName ?? "Admin",
            ReporterEmail = dto.ReporterEmail ?? "admin@example.com",
            StoryPoints = dto.StoryPoints,
            OriginalEstimateMinutes = dto.OriginalEstimateMinutes,
            RemainingEstimateMinutes = dto.OriginalEstimateMinutes,
            TimeSpentMinutes = 0,
            SprintId = dto.SprintId,
            EpicKey = dto.EpicKey,
            ParentIssueKey = dto.ParentIssueKey,
            Labels = dto.Labels != null ? string.Join(",", dto.Labels) : null,
            Components = dto.Components != null ? string.Join(",", dto.Components) : null,
            FixVersion = dto.FixVersion,
            BlockedBy = dto.BlockedBy,
            StartDate = dto.StartDate,
            DueDate = dto.DueDate,
            CustomFieldsJson = dto.CustomFieldsJson,
            Order = nextNumber,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        issue.Activities.Add(new ActivityLog
        {
            AuthorName = issue.ReporterName ?? "Admin",
            Action = "Created",
            Details = $"Created issue {issue.Key}: {issue.Summary}",
            CreatedAt = DateTime.UtcNow
        });

        _db.Issues.Add(issue);
        await _db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(issue.AssigneeName))
        {
            _db.UserNotifications.Add(new UserNotification
            {
                RecipientName = issue.AssigneeName,
                RecipientEmail = issue.AssigneeEmail,
                ActorName = issue.ReporterName ?? User.GetDisplayName(),
                Action = "assigned",
                Category = "direct",
                Title = $"Assigned to you: {issue.Key}",
                Message = $"{issue.ReporterName ?? "A team member"} assigned {issue.Key} ({issue.Summary}) to you.",
                IssueId = issue.Id,
                IssueKey = issue.Key,
                IssueSummary = issue.Summary,
                ProjectId = issue.ProjectId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetIssue), new { idOrKey = issue.Key }, issue);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateIssue(int id, [FromBody] UpdateIssueDto dto)
    {
        var issue = await _db.Issues.Include(i => i.Activities).FirstOrDefaultAsync(i => i.Id == id);
        if (issue == null) return NotFound();

        var changes = new List<string>();

        if (dto.Summary != null && dto.Summary != issue.Summary)
        {
            changes.Add($"Summary updated to '{dto.Summary}'");
            issue.Summary = dto.Summary;
        }

        if (dto.Description != null && dto.Description != issue.Description)
        {
            changes.Add("Description updated");
            issue.Description = dto.Description;
        }

        if (dto.Status != null && dto.Status != issue.Status)
        {
            var oldStatus = issue.Status;
            changes.Add($"Status changed from '{issue.Status}' to '{dto.Status}'");
            issue.Status = dto.Status;
            if (dto.Status == "Done")
            {
                issue.Resolution = "Done";
                issue.ResolvedAt = DateTime.UtcNow;
            }
            else
            {
                issue.Resolution = "Unresolved";
                issue.ResolvedAt = null;
            }
            await ApplyWorkflowRulesAsync(issue, oldStatus, dto.Status);

            if (!string.IsNullOrWhiteSpace(issue.AssigneeName))
            {
                _db.UserNotifications.Add(new UserNotification
                {
                    RecipientName = issue.AssigneeName,
                    RecipientEmail = issue.AssigneeEmail,
                    ActorName = User.GetDisplayName(),
                    Action = "status_changed",
                    Category = "watching",
                    Title = $"{issue.Key} status updated",
                    Message = $"{issue.Key} status was changed from '{oldStatus}' to '{dto.Status}'.",
                    IssueId = issue.Id,
                    IssueKey = issue.Key,
                    IssueSummary = issue.Summary,
                    ProjectId = issue.ProjectId,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        if (dto.Priority != null && dto.Priority != issue.Priority)
        {
            changes.Add($"Priority changed to '{dto.Priority}'");
            issue.Priority = dto.Priority;
        }

        if (dto.IssueType != null && dto.IssueType != issue.IssueType)
        {
            changes.Add($"Issue type changed to '{dto.IssueType}'");
            issue.IssueType = dto.IssueType;
        }

        if (dto.AssigneeName != null && dto.AssigneeName != issue.AssigneeName)
        {
            changes.Add($"Assignee changed to '{dto.AssigneeName}'");
            issue.AssigneeName = dto.AssigneeName;
            issue.AssigneeEmail = dto.AssigneeEmail;
            issue.AssigneeAvatarUrl = !string.IsNullOrWhiteSpace(dto.AssigneeName) ? $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(dto.AssigneeName)}&background=0D8ABC&color=fff" : null;

            if (!string.IsNullOrWhiteSpace(issue.AssigneeName))
            {
                _db.UserNotifications.Add(new UserNotification
                {
                    RecipientName = issue.AssigneeName,
                    RecipientEmail = issue.AssigneeEmail,
                    ActorName = User.GetDisplayName(),
                    Action = "assigned",
                    Category = "direct",
                    Title = $"Assigned to you: {issue.Key}",
                    Message = $"You were assigned to {issue.Key} ({issue.Summary}).",
                    IssueId = issue.Id,
                    IssueKey = issue.Key,
                    IssueSummary = issue.Summary,
                    ProjectId = issue.ProjectId,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        if (dto.StoryPoints.HasValue) issue.StoryPoints = dto.StoryPoints;
        if (dto.OriginalEstimateMinutes.HasValue) issue.OriginalEstimateMinutes = dto.OriginalEstimateMinutes;
        if (dto.RemainingEstimateMinutes.HasValue) issue.RemainingEstimateMinutes = dto.RemainingEstimateMinutes;
        if (dto.SprintId.HasValue) issue.SprintId = dto.SprintId.Value == 0 ? null : dto.SprintId;
        if (dto.EpicKey != null) issue.EpicKey = dto.EpicKey;
        if (dto.ParentIssueKey != null) issue.ParentIssueKey = dto.ParentIssueKey;
        if (dto.Labels != null) issue.Labels = string.Join(",", dto.Labels);
        if (dto.Components != null) issue.Components = string.Join(",", dto.Components);
        if (dto.FixVersion != null) issue.FixVersion = dto.FixVersion;
        if (dto.BlockedBy != null) issue.BlockedBy = dto.BlockedBy;
        if (dto.StartDate.HasValue) issue.StartDate = dto.StartDate;
        if (dto.DueDate.HasValue) issue.DueDate = dto.DueDate;
        if (dto.CustomFieldsJson != null) issue.CustomFieldsJson = dto.CustomFieldsJson;
        if (dto.Order.HasValue) issue.Order = dto.Order.Value;

        issue.UpdatedAt = DateTime.UtcNow;

        if (changes.Count > 0)
        {
            issue.Activities.Add(new ActivityLog
            {
                AuthorName = User.GetDisplayName(),
                Action = "Updated",
                Details = string.Join("; ", changes),
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(issue);
    }

    [HttpPatch("{id:int}/move")]
    public async Task<IActionResult> MoveIssue(int id, [FromBody] MoveIssueDto dto)
    {
        var issue = await _db.Issues.Include(i => i.Activities).FirstOrDefaultAsync(i => i.Id == id);
        if (issue == null) return NotFound();

        var changes = new List<string>();

        if (!string.IsNullOrWhiteSpace(dto.Status) && dto.Status != issue.Status)
        {
            var oldStatus = issue.Status;
            changes.Add($"Moved to status '{dto.Status}'");
            issue.Status = dto.Status;
            if (dto.Status == "Done")
            {
                issue.Resolution = "Done";
                issue.ResolvedAt = DateTime.UtcNow;
            }
            else if (issue.Resolution == "Done")
            {
                issue.Resolution = "Unresolved";
                issue.ResolvedAt = null;
            }
            await ApplyWorkflowRulesAsync(issue, oldStatus, dto.Status);

            if (!string.IsNullOrWhiteSpace(issue.AssigneeName))
            {
                _db.UserNotifications.Add(new UserNotification
                {
                    RecipientName = issue.AssigneeName,
                    RecipientEmail = issue.AssigneeEmail,
                    ActorName = User.GetDisplayName(),
                    Action = "status_changed",
                    Category = "watching",
                    Title = $"{issue.Key} status updated",
                    Message = $"{issue.Key} status was changed from '{oldStatus}' to '{dto.Status}'.",
                    IssueId = issue.Id,
                    IssueKey = issue.Key,
                    IssueSummary = issue.Summary,
                    ProjectId = issue.ProjectId,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        if (dto.SprintId.HasValue)
        {
            var newSprintId = dto.SprintId.Value == 0 ? (int?)null : dto.SprintId.Value;
            if (newSprintId != issue.SprintId)
            {
                changes.Add(newSprintId.HasValue ? $"Moved to Sprint {newSprintId}" : "Moved to Backlog");
                issue.SprintId = newSprintId;
            }
        }

        if (dto.Order.HasValue)
        {
            issue.Order = dto.Order.Value;
        }

        issue.UpdatedAt = DateTime.UtcNow;

        if (changes.Count > 0)
        {
            issue.Activities.Add(new ActivityLog
            {
                AuthorName = User.GetDisplayName(),
                Action = "Moved",
                Details = string.Join("; ", changes),
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true, issue.Id, issue.Key, issue.Status, issue.SprintId, issue.Order });
    }

    [HttpPost("{id:int}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] AddCommentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Body))
        {
            return BadRequest(new { message = "Comment body cannot be empty." });
        }

        var issue = await _db.Issues.Include(i => i.Activities).FirstOrDefaultAsync(i => i.Id == id);
        if (issue == null) return NotFound();

        var comment = new IssueComment
        {
            IssueId = id,
            AuthorName = dto.AuthorName,
            AuthorEmail = dto.AuthorEmail,
            AuthorAvatarUrl = $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(dto.AuthorName)}&background=0D8ABC&color=fff",
            Body = dto.Body,
            CreatedAt = DateTime.UtcNow
        };

        issue.Activities.Add(new ActivityLog
        {
            AuthorName = dto.AuthorName,
            Action = "Commented",
            Details = $"Added comment: {(dto.Body.Length > 50 ? dto.Body[..50] + "..." : dto.Body)}",
            CreatedAt = DateTime.UtcNow
        });

        _db.IssueComments.Add(comment);
        issue.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(issue.AssigneeName) && !string.Equals(issue.AssigneeName, dto.AuthorName, StringComparison.OrdinalIgnoreCase))
        {
            var snippet = dto.Body.Length > 60 ? dto.Body[..60] + "..." : dto.Body;
            _db.UserNotifications.Add(new UserNotification
            {
                RecipientName = issue.AssigneeName,
                RecipientEmail = issue.AssigneeEmail,
                ActorName = dto.AuthorName,
                ActorAvatarUrl = comment.AuthorAvatarUrl,
                Action = "commented",
                Category = dto.Body.Contains("@") ? "direct" : "watching",
                Title = $"New comment on {issue.Key}",
                Message = $"{dto.AuthorName}: \"{snippet}\"",
                IssueId = issue.Id,
                IssueKey = issue.Key,
                IssueSummary = issue.Summary,
                ProjectId = issue.ProjectId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        return Ok(comment);
    }

    [HttpDelete("{id:int}/comments/{commentId:int}")]
    public async Task<IActionResult> DeleteComment(int id, int commentId)
    {
        var comment = await _db.IssueComments.FirstOrDefaultAsync(c => c.Id == commentId && c.IssueId == id);
        if (comment == null) return NotFound();

        _db.IssueComments.Remove(comment);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/worklogs")]
    public async Task<IActionResult> LogWork(int id, [FromBody] LogWorkDto dto)
    {
        if (dto.TimeSpentMinutes <= 0)
        {
            return BadRequest(new { message = "Time spent must be greater than 0 minutes." });
        }

        var issue = await _db.Issues.Include(i => i.Activities).FirstOrDefaultAsync(i => i.Id == id);
        if (issue == null) return NotFound();

        var worklog = new Worklog
        {
            IssueId = id,
            AuthorName = dto.AuthorName,
            TimeSpentMinutes = dto.TimeSpentMinutes,
            StartedAt = dto.StartedAt.HasValue ? DateTime.SpecifyKind(dto.StartedAt.Value, DateTimeKind.Utc) : DateTime.UtcNow,
            Comment = dto.Comment,
            CreatedAt = DateTime.UtcNow
        };

        issue.TimeSpentMinutes = (issue.TimeSpentMinutes ?? 0) + dto.TimeSpentMinutes;
        if (dto.RemainingEstimateMinutes.HasValue)
        {
            issue.RemainingEstimateMinutes = dto.RemainingEstimateMinutes.Value;
        }
        else if (issue.RemainingEstimateMinutes.HasValue)
        {
            issue.RemainingEstimateMinutes = Math.Max(0, issue.RemainingEstimateMinutes.Value - dto.TimeSpentMinutes);
        }

        issue.Activities.Add(new ActivityLog
        {
            AuthorName = dto.AuthorName,
            Action = "Logged Work",
            Details = $"Logged {dto.TimeSpentMinutes} minutes of work. Comment: {dto.Comment}",
            CreatedAt = DateTime.UtcNow
        });

        _db.Worklogs.Add(worklog);
        issue.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(worklog);
    }

    // -------------------------------------------------------------
    // CHILD ISSUES & SUBTASKS
    // -------------------------------------------------------------
    [HttpGet("{idOrKey}/children")]
    public async Task<IActionResult> GetChildIssues(string idOrKey)
    {
        var issue = await FindIssueByIdOrKeyAsync(idOrKey);
        if (issue == null) return NotFound(new { message = $"Issue '{idOrKey}' not found." });

        var children = await _db.Issues
            .Where(i => i.ParentIssueKey == issue.Key || i.EpicKey == issue.Key)
            .OrderBy(i => i.Order)
            .ThenBy(i => i.Id)
            .Select(i => new
            {
                i.Id,
                i.Key,
                i.IssueNumber,
                i.ProjectId,
                i.IssueType,
                i.Summary,
                i.Status,
                i.Priority,
                i.AssigneeName,
                i.AssigneeAvatarUrl,
                i.StoryPoints,
                i.SprintId,
                i.ParentIssueKey,
                i.EpicKey,
                i.DueDate,
                i.CreatedAt,
                i.UpdatedAt
            })
            .ToListAsync();

        return Ok(children);
    }

    [HttpPost("{idOrKey}/children")]
    public async Task<IActionResult> CreateChildIssue(string idOrKey, [FromBody] CreateChildIssueDto dto)
    {
        var parent = await FindIssueByIdOrKeyAsync(idOrKey);
        if (parent == null) return NotFound(new { message = $"Parent issue '{idOrKey}' not found." });

        if (string.IsNullOrWhiteSpace(dto.Summary))
        {
            return BadRequest(new { message = "Child issue summary is required." });
        }

        var project = await _db.Projects.FindAsync(parent.ProjectId);
        if (project == null) return NotFound(new { message = "Project not found." });

        var lastNumber = await _db.Issues
            .Where(i => i.ProjectId == project.Id)
            .MaxAsync(i => (int?)i.IssueNumber) ?? 0;

        var nextNumber = lastNumber + 1;
        var key = $"{project.Key}-{nextNumber}";
        var issueType = string.IsNullOrWhiteSpace(dto.IssueType) ? "Subtask" : dto.IssueType.Trim();

        var child = new Issue
        {
            Key = key,
            IssueNumber = nextNumber,
            ProjectId = project.Id,
            IssueType = issueType,
            Summary = dto.Summary.Trim(),
            Status = "To Do",
            Priority = dto.Priority ?? "Medium",
            AssigneeName = dto.AssigneeName ?? parent.AssigneeName,
            AssigneeEmail = dto.AssigneeEmail ?? parent.AssigneeEmail,
            AssigneeAvatarUrl = !string.IsNullOrWhiteSpace(dto.AssigneeName ?? parent.AssigneeName)
                ? $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(dto.AssigneeName ?? parent.AssigneeName!)}&background=0D8ABC&color=fff"
                : null,
            ReporterName = User.GetDisplayName(),
            ReporterEmail = "sajidur@akij.net",
            StoryPoints = dto.StoryPoints,
            SprintId = dto.SprintId ?? parent.SprintId,
            ParentIssueKey = parent.Key,
            EpicKey = parent.IssueType == "Epic" ? parent.Key : parent.EpicKey,
            Order = nextNumber,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Issues.Add(child);

        parent.Activities.Add(new ActivityLog
        {
            AuthorName = User.GetDisplayName(),
            Action = "Added Child Issue",
            Details = $"Created {issueType} {key}: {child.Summary}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(child);
    }

    [HttpPut("{idOrKey}/parent")]
    public async Task<IActionResult> SetParentIssue(string idOrKey, [FromBody] SetParentIssueDto dto)
    {
        var issue = await FindIssueByIdOrKeyAsync(idOrKey);
        if (issue == null) return NotFound(new { message = $"Issue '{idOrKey}' not found." });

        string? oldParent = issue.ParentIssueKey;
        issue.ParentIssueKey = string.IsNullOrWhiteSpace(dto.ParentIssueKey) ? null : dto.ParentIssueKey.Trim().ToUpper();
        issue.UpdatedAt = DateTime.UtcNow;

        issue.Activities.Add(new ActivityLog
        {
            AuthorName = User.GetDisplayName(),
            Action = "Updated Parent",
            Details = string.IsNullOrWhiteSpace(issue.ParentIssueKey) ? $"Removed parent (was {oldParent})" : $"Set parent to {issue.ParentIssueKey}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Parent issue updated successfully.", issue.Key, issue.ParentIssueKey });
    }

    // -------------------------------------------------------------
    // ISSUE LINKS
    // -------------------------------------------------------------
    [HttpGet("{idOrKey}/links")]
    public async Task<IActionResult> GetIssueLinks(string idOrKey)
    {
        var issue = await FindIssueByIdOrKeyAsync(idOrKey);
        if (issue == null) return NotFound(new { message = $"Issue '{idOrKey}' not found." });

        var links = await _db.IssueLinks
            .Where(l => l.SourceIssueKey == issue.Key || l.TargetIssueKey == issue.Key)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var otherKeys = links
            .Select(l => l.SourceIssueKey == issue.Key ? l.TargetIssueKey : l.SourceIssueKey)
            .Distinct()
            .ToList();

        var relatedIssues = await _db.Issues
            .Where(i => otherKeys.Contains(i.Key))
            .Select(i => new
            {
                i.Id,
                i.Key,
                i.Summary,
                i.Status,
                i.IssueType,
                i.Priority,
                i.AssigneeName,
                i.AssigneeAvatarUrl
            })
            .ToDictionaryAsync(i => i.Key, StringComparer.OrdinalIgnoreCase);

        var result = links.Select(l =>
        {
            bool isOutward = string.Equals(l.SourceIssueKey, issue.Key, StringComparison.OrdinalIgnoreCase);
            var otherKey = isOutward ? l.TargetIssueKey : l.SourceIssueKey;
            relatedIssues.TryGetValue(otherKey, out var related);

            string displayRel = l.Relationship;
            if (!isOutward)
            {
                displayRel = l.Relationship switch
                {
                    "blocks" => "is blocked by",
                    "is blocked by" => "blocks",
                    "duplicates" => "is duplicated by",
                    "is duplicated by" => "duplicates",
                    "causes" => "is caused by",
                    "is caused by" => "causes",
                    _ => l.Relationship
                };
            }

            return new
            {
                l.Id,
                Relationship = displayRel,
                IsOutward = isOutward,
                TargetKey = otherKey,
                LinkedIssue = related,
                l.CreatedAt
            };
        });

        return Ok(result);
    }

    [HttpPost("{idOrKey}/links")]
    public async Task<IActionResult> CreateIssueLink(string idOrKey, [FromBody] CreateIssueLinkDto dto)
    {
        var sourceIssue = await FindIssueByIdOrKeyAsync(idOrKey);
        if (sourceIssue == null) return NotFound(new { message = $"Source issue '{idOrKey}' not found." });

        if (string.IsNullOrWhiteSpace(dto.TargetIssueKey))
        {
            return BadRequest(new { message = "Target issue key is required." });
        }

        var targetKey = dto.TargetIssueKey.Trim().ToUpper();
        if (string.Equals(sourceIssue.Key, targetKey, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Cannot link an issue to itself." });
        }

        var targetIssue = await _db.Issues.FirstOrDefaultAsync(i => i.Key.ToUpper() == targetKey);
        if (targetIssue == null)
        {
            return NotFound(new { message = $"Target issue '{targetKey}' not found." });
        }

        var exists = await _db.IssueLinks.AnyAsync(l =>
            (l.SourceIssueKey == sourceIssue.Key && l.TargetIssueKey == targetIssue.Key && l.Relationship == dto.Relationship) ||
            (l.SourceIssueKey == targetIssue.Key && l.TargetIssueKey == sourceIssue.Key && l.Relationship == dto.Relationship));

        if (exists)
        {
            return Conflict(new { message = "This link already exists between these two issues." });
        }

        var link = new IssueLink
        {
            SourceIssueId = sourceIssue.Id,
            SourceIssueKey = sourceIssue.Key,
            TargetIssueId = targetIssue.Id,
            TargetIssueKey = targetIssue.Key,
            Relationship = string.IsNullOrWhiteSpace(dto.Relationship) ? "relates to" : dto.Relationship.Trim().ToLower(),
            CreatedAt = DateTime.UtcNow
        };

        _db.IssueLinks.Add(link);

        sourceIssue.Activities.Add(new ActivityLog
        {
            AuthorName = User.GetDisplayName(),
            Action = "Linked Issue",
            Details = $"{link.Relationship} {targetIssue.Key}: {targetIssue.Summary}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(link);
    }

    [HttpDelete("links/{linkId:int}")]
    public async Task<IActionResult> DeleteIssueLink(int linkId)
    {
        var link = await _db.IssueLinks.FindAsync(linkId);
        if (link == null) return NotFound(new { message = "Issue link not found." });

        _db.IssueLinks.Remove(link);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<Issue?> FindIssueByIdOrKeyAsync(string idOrKey)
    {
        if (int.TryParse(idOrKey, out var id))
        {
            return await _db.Issues.FirstOrDefaultAsync(i => i.Id == id);
        }
        return await _db.Issues.FirstOrDefaultAsync(i => i.Key.ToUpper() == idOrKey.ToUpper());
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteIssue(int id)
    {
        var issue = await _db.Issues.FindAsync(id);
        if (issue == null) return NotFound();

        _db.Issues.Remove(issue);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task ApplyWorkflowRulesAsync(Issue issue, string oldStatus, string newStatus)
    {
        try
        {
            var rules = await _db.WorkflowRules
                .Where(r => r.ProjectId == issue.ProjectId && r.IsEnabled && r.TriggerEvent == "OnStatusChange")
                .ToListAsync();

            foreach (var rule in rules)
            {
                if (string.Equals(rule.ConditionStatus, newStatus, StringComparison.OrdinalIgnoreCase))
                {
                    if (rule.ActionType == "SetResolution")
                    {
                        issue.Resolution = rule.ActionValue;
                        issue.ResolvedAt = rule.ActionValue == "Done" ? DateTime.UtcNow : null;
                        issue.Activities.Add(new ActivityLog
                        {
                            AuthorName = "Workflow Automation",
                            Action = "Rule Triggered",
                            Details = $"Workflow rule '{rule.Name}' set resolution to '{rule.ActionValue}'",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                    else if (rule.ActionType == "AutoAssign")
                    {
                        issue.AssigneeName = rule.ActionValue;
                        issue.AssigneeAvatarUrl = $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(rule.ActionValue)}&background=0D8ABC&color=fff";
                        issue.Activities.Add(new ActivityLog
                        {
                            AuthorName = "Workflow Automation",
                            Action = "Rule Triggered",
                            Details = $"Workflow rule '{rule.Name}' auto-assigned issue to '{rule.ActionValue}'",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Workflow Rule Engine Warning] {ex.Message}");
        }
    }
}
