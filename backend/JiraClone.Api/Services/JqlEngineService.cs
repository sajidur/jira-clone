using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Auth;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Services;

public class JqlSearchResult
{
    public string Jql { get; set; } = string.Empty;
    public int Total { get; set; }
    public List<Issue> Issues { get; set; } = new();
    public List<string> ParsedClauses { get; set; } = new();
    public string? ErrorMessage { get; set; }
}

public interface IJqlEngineService
{
    Task<JqlSearchResult> ExecuteJqlAsync(string? jql, int? projectId = null, int startAt = 0, int maxResults = 50);
}

public class JqlEngineService : IJqlEngineService
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public JqlEngineService(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<JqlSearchResult> ExecuteJqlAsync(string? jql, int? projectId = null, int startAt = 0, int maxResults = 50)
    {
        var result = new JqlSearchResult { Jql = jql ?? string.Empty };

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

        if (string.IsNullOrWhiteSpace(jql))
        {
            var all = await query.OrderByDescending(i => i.Id).ToListAsync();
            result.Total = all.Count;
            result.Issues = all.Skip(startAt).Take(maxResults).ToList();
            return result;
        }

        try
        {
            var rawJql = jql.Trim();
            string? orderByClause = null;

            // Separate ORDER BY
            var orderByIdx = rawJql.IndexOf("order by", StringComparison.OrdinalIgnoreCase);
            if (orderByIdx >= 0)
            {
                orderByClause = rawJql.Substring(orderByIdx + 8).Trim();
                rawJql = rawJql.Substring(0, orderByIdx).Trim();
            }

            // Split into clauses by AND
            // (Jira standard queries commonly combine expressions with AND)
            var clauses = SplitTopLevel(rawJql, "AND");

            foreach (var clause in clauses)
            {
                var trimmed = clause.Trim();
                if (string.IsNullOrEmpty(trimmed)) continue;

                result.ParsedClauses.Add(trimmed);

                // Check "is EMPTY" or "is NULL" or "is not EMPTY"
                if (Regex.IsMatch(trimmed, @"(\w+)\s+is\s+not\s+(empty|null)", RegexOptions.IgnoreCase))
                {
                    var m = Regex.Match(trimmed, @"(\w+)\s+is\s+not\s+(empty|null)", RegexOptions.IgnoreCase);
                    var field = m.Groups[1].Value.ToLower();
                    query = ApplyNullCheck(query, field, isNotNull: true);
                    continue;
                }
                if (Regex.IsMatch(trimmed, @"(\w+)\s+is\s+(empty|null)", RegexOptions.IgnoreCase))
                {
                    var m = Regex.Match(trimmed, @"(\w+)\s+is\s+(empty|null)", RegexOptions.IgnoreCase);
                    var field = m.Groups[1].Value.ToLower();
                    query = ApplyNullCheck(query, field, isNotNull: false);
                    continue;
                }

                // Check "in (...)" or "not in (...)"
                var inMatch = Regex.Match(trimmed, @"(\w+)\s+(not\s+in|in)\s*\(([^)]+)\)", RegexOptions.IgnoreCase);
                if (inMatch.Success)
                {
                    var field = inMatch.Groups[1].Value.ToLower();
                    var isNotIn = inMatch.Groups[2].Value.ToLower().Contains("not");
                    var rawVals = inMatch.Groups[3].Value.Split(',', StringSplitOptions.TrimEntries);
                    var vals = rawVals.Select(CleanQuote).Where(s => !string.IsNullOrEmpty(s)).ToList();

                    query = ApplyInClause(query, field, vals, isNotIn);
                    continue;
                }

                // Check text contains "~"
                var containsMatch = Regex.Match(trimmed, @"(\w+)\s*~\s*(.+)", RegexOptions.IgnoreCase);
                if (containsMatch.Success)
                {
                    var field = containsMatch.Groups[1].Value.ToLower();
                    var val = CleanQuote(containsMatch.Groups[2].Value.Trim());
                    query = ApplyContainsClause(query, field, val);
                    continue;
                }

                // Check binary operators: !=, =, >=, <=, >, <
                var opMatch = Regex.Match(trimmed, @"(\w+)\s*(!=|>=|<=|=|>|<)\s*(.+)", RegexOptions.IgnoreCase);
                if (opMatch.Success)
                {
                    var field = opMatch.Groups[1].Value.ToLower();
                    var op = opMatch.Groups[2].Value;
                    var val = CleanQuote(opMatch.Groups[3].Value.Trim());

                    // Normalize currentUser()
                    if (val.Equals("currentUser()", StringComparison.OrdinalIgnoreCase))
                    {
                        val = _httpContextAccessor.HttpContext?.User.GetDisplayName() ?? "System";
                    }

                    query = ApplyBinaryClause(query, field, op, val);
                    continue;
                }
            }

            var issuesList = await query.ToListAsync();

            // Apply ORDER BY
            if (!string.IsNullOrWhiteSpace(orderByClause))
            {
                issuesList = ApplyOrderBy(issuesList, orderByClause);
            }
            else
            {
                issuesList = issuesList.OrderBy(i => i.Order).ThenByDescending(i => i.Id).ToList();
            }

            result.Total = issuesList.Count;
            result.Issues = issuesList.Skip(startAt).Take(maxResults).ToList();
        }
        catch (Exception ex)
        {
            result.ErrorMessage = $"JQL Parse Warning: {ex.Message}";
            var fallback = await _db.Issues.Include(i => i.Project).Include(i => i.Sprint).AsNoTracking().ToListAsync();
            result.Total = fallback.Count;
            result.Issues = fallback.Skip(startAt).Take(maxResults).ToList();
        }

        return result;
    }

    private static IQueryable<Issue> ApplyNullCheck(IQueryable<Issue> q, string field, bool isNotNull)
    {
        return field switch
        {
            "assignee" => isNotNull ? q.Where(i => i.AssigneeName != null && i.AssigneeName != "") : q.Where(i => i.AssigneeName == null || i.AssigneeName == ""),
            "sprint" => isNotNull ? q.Where(i => i.SprintId != null) : q.Where(i => i.SprintId == null),
            "resolution" => isNotNull ? q.Where(i => i.Resolution != null && i.Resolution != "Unresolved") : q.Where(i => i.Resolution == null || i.Resolution == "Unresolved"),
            "fixversion" => isNotNull ? q.Where(i => i.FixVersion != null && i.FixVersion != "") : q.Where(i => i.FixVersion == null || i.FixVersion == ""),
            "epic" or "epickey" => isNotNull ? q.Where(i => i.EpicKey != null) : q.Where(i => i.EpicKey == null),
            _ => q
        };
    }

    private static IQueryable<Issue> ApplyInClause(IQueryable<Issue> q, string field, List<string> vals, bool isNotIn)
    {
        var lowerVals = vals.Select(v => v.ToLower()).ToList();
        return field switch
        {
            "project" => isNotIn ? q.Where(i => i.Project != null && !lowerVals.Contains(i.Project.Key.ToLower())) : q.Where(i => i.Project != null && lowerVals.Contains(i.Project.Key.ToLower())),
            "status" => isNotIn ? q.Where(i => !lowerVals.Contains(i.Status.ToLower())) : q.Where(i => lowerVals.Contains(i.Status.ToLower())),
            "priority" => isNotIn ? q.Where(i => !lowerVals.Contains(i.Priority.ToLower())) : q.Where(i => lowerVals.Contains(i.Priority.ToLower())),
            "type" or "issuetype" => isNotIn ? q.Where(i => !lowerVals.Contains(i.IssueType.ToLower())) : q.Where(i => lowerVals.Contains(i.IssueType.ToLower())),
            "assignee" => isNotIn ? q.Where(i => i.AssigneeName == null || !lowerVals.Contains(i.AssigneeName.ToLower())) : q.Where(i => i.AssigneeName != null && lowerVals.Contains(i.AssigneeName.ToLower())),
            "resolution" => isNotIn ? q.Where(i => i.Resolution == null || !lowerVals.Contains(i.Resolution.ToLower())) : q.Where(i => i.Resolution != null && lowerVals.Contains(i.Resolution.ToLower())),
            _ => q
        };
    }

    private static IQueryable<Issue> ApplyContainsClause(IQueryable<Issue> q, string field, string val)
    {
        var lower = val.ToLower();
        return field switch
        {
            "text" => q.Where(i => i.Summary.ToLower().Contains(lower) || (i.Description != null && i.Description.ToLower().Contains(lower)) || (i.Labels != null && i.Labels.ToLower().Contains(lower))),
            "summary" => q.Where(i => i.Summary.ToLower().Contains(lower)),
            "description" => q.Where(i => i.Description != null && i.Description.ToLower().Contains(lower)),
            "labels" or "label" => q.Where(i => i.Labels != null && i.Labels.ToLower().Contains(lower)),
            _ => q.Where(i => i.Summary.ToLower().Contains(lower))
        };
    }

    private static IQueryable<Issue> ApplyBinaryClause(IQueryable<Issue> q, string field, string op, string val)
    {
        var lower = val.ToLower();
        var isEqual = op == "=";
        var isNotEqual = op == "!=";

        switch (field)
        {
            case "project":
                return isEqual
                    ? q.Where(i => i.Project != null && (i.Project.Key.ToLower() == lower || i.Project.Name.ToLower() == lower))
                    : q.Where(i => i.Project == null || (i.Project.Key.ToLower() != lower && i.Project.Name.ToLower() != lower));

            case "status":
                return isEqual
                    ? q.Where(i => i.Status.ToLower() == lower)
                    : q.Where(i => i.Status.ToLower() != lower);

            case "priority":
                return isEqual
                    ? q.Where(i => i.Priority.ToLower() == lower)
                    : q.Where(i => i.Priority.ToLower() != lower);

            case "type":
            case "issuetype":
                return isEqual
                    ? q.Where(i => i.IssueType.ToLower() == lower)
                    : q.Where(i => i.IssueType.ToLower() != lower);

            case "assignee":
                return isEqual
                    ? q.Where(i => i.AssigneeName != null && i.AssigneeName.ToLower().Contains(lower))
                    : q.Where(i => i.AssigneeName == null || !i.AssigneeName.ToLower().Contains(lower));

            case "reporter":
                return isEqual
                    ? q.Where(i => i.ReporterName != null && i.ReporterName.ToLower().Contains(lower))
                    : q.Where(i => i.ReporterName == null || !i.ReporterName.ToLower().Contains(lower));

            case "key":
            case "issuekey":
                return isEqual
                    ? q.Where(i => i.Key.ToLower() == lower)
                    : q.Where(i => i.Key.ToLower() != lower);

            case "sprint":
                if (int.TryParse(val, out var sId))
                {
                    return isEqual ? q.Where(i => i.SprintId == sId) : q.Where(i => i.SprintId != sId);
                }
                return isEqual
                    ? q.Where(i => i.Sprint != null && i.Sprint.Name.ToLower().Contains(lower))
                    : q.Where(i => i.Sprint == null || !i.Sprint.Name.ToLower().Contains(lower));

            case "fixversion":
                return isEqual
                    ? q.Where(i => i.FixVersion != null && i.FixVersion.ToLower() == lower)
                    : q.Where(i => i.FixVersion == null || i.FixVersion.ToLower() != lower);

            case "resolution":
                return isEqual
                    ? q.Where(i => i.Resolution != null && i.Resolution.ToLower() == lower)
                    : q.Where(i => i.Resolution == null || i.Resolution.ToLower() != lower);

            case "storypoints":
            case "points":
                if (double.TryParse(val, out var pts))
                {
                    return op switch
                    {
                        ">=" => q.Where(i => i.StoryPoints >= pts),
                        "<=" => q.Where(i => i.StoryPoints <= pts),
                        ">" => q.Where(i => i.StoryPoints > pts),
                        "<" => q.Where(i => i.StoryPoints < pts),
                        _ => q.Where(i => i.StoryPoints == pts)
                    };
                }
                return q;

            default:
                return q;
        }
    }

    private static List<Issue> ApplyOrderBy(List<Issue> list, string orderClause)
    {
        var parts = orderClause.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        var field = parts.Length > 0 ? parts[0].ToLower() : "created";
        var isDesc = parts.Length > 1 && parts[1].Equals("desc", StringComparison.OrdinalIgnoreCase);

        return field switch
        {
            "created" or "createdat" => isDesc ? list.OrderByDescending(i => i.CreatedAt).ToList() : list.OrderBy(i => i.CreatedAt).ToList(),
            "updated" or "updatedat" => isDesc ? list.OrderByDescending(i => i.UpdatedAt).ToList() : list.OrderBy(i => i.UpdatedAt).ToList(),
            "priority" => isDesc ? list.OrderByDescending(i => PriorityRank(i.Priority)).ToList() : list.OrderBy(i => PriorityRank(i.Priority)).ToList(),
            "status" => isDesc ? list.OrderByDescending(i => i.Status).ToList() : list.OrderBy(i => i.Status).ToList(),
            "key" => isDesc ? list.OrderByDescending(i => i.IssueNumber).ToList() : list.OrderBy(i => i.IssueNumber).ToList(),
            "storypoints" => isDesc ? list.OrderByDescending(i => i.StoryPoints ?? 0).ToList() : list.OrderBy(i => i.StoryPoints ?? 0).ToList(),
            _ => list
        };
    }

    private static int PriorityRank(string priority) => priority.ToLower() switch
    {
        "highest" or "blocker" => 5,
        "high" => 4,
        "medium" => 3,
        "low" => 2,
        "lowest" => 1,
        _ => 0
    };

    private static string CleanQuote(string s) => s.Trim('\'', '"', ' ');

    private static List<string> SplitTopLevel(string str, string separator)
    {
        var result = new List<string>();
        var pattern = $@"\s+{separator}\s+";
        var parts = Regex.Split(str, pattern, RegexOptions.IgnoreCase);
        foreach (var p in parts)
        {
            if (!string.IsNullOrWhiteSpace(p)) result.Add(p.Trim());
        }
        return result;
    }
}
