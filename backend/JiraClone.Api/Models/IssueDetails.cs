using System;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class IssueComment
{
    public int Id { get; set; }
    public int IssueId { get; set; }
    public string AuthorId { get; set; } = "user-1";
    public string AuthorName { get; set; } = "Sajidur Rahman";
    public string? AuthorEmail { get; set; } = "sajid@example.com";
    public string? AuthorAvatarUrl { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    [JsonIgnore]
    public Issue? Issue { get; set; }
}

public class Worklog
{
    public int Id { get; set; }
    public int IssueId { get; set; }
    public string AuthorName { get; set; } = "Sajidur Rahman";
    public int TimeSpentMinutes { get; set; } // e.g. 120 = 2h
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Issue? Issue { get; set; }
}

public class ActivityLog
{
    public int Id { get; set; }
    public int IssueId { get; set; }
    public string AuthorName { get; set; } = "Sajidur Rahman";
    public string Action { get; set; } = string.Empty; // "Status Changed", "Comment Added", "Assigned", "Updated"
    public string Details { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Issue? Issue { get; set; }
}

public class IssueLink
{
    public int Id { get; set; }
    public int SourceIssueId { get; set; }
    public string SourceIssueKey { get; set; } = string.Empty;
    public int TargetIssueId { get; set; }
    public string TargetIssueKey { get; set; } = string.Empty;
    public string Relationship { get; set; } = "relates to"; // "blocks", "is blocked by", "relates to", "duplicates", "causes"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
