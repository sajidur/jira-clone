using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class Issue
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty; // e.g. "ERP-101"
    public int IssueNumber { get; set; } // e.g. 101
    public int ProjectId { get; set; }
    
    public string IssueType { get; set; } = "Story"; // "Epic", "Story", "Task", "Bug", "Subtask"
    public string Summary { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "To Do"; // "To Do", "In Progress", "In Review", "Done"
    public string Priority { get; set; } = "Medium"; // "Highest", "High", "Medium", "Low", "Lowest"
    
    public string? Resolution { get; set; } = "Unresolved";
    public DateTime? ResolvedAt { get; set; }

    public string? AssigneeId { get; set; }
    public string? AssigneeName { get; set; }
    public string? AssigneeEmail { get; set; }
    public string? AssigneeAvatarUrl { get; set; }

    public string? ReporterId { get; set; }
    public string? ReporterName { get; set; } = "Admin";
    public string? ReporterEmail { get; set; } = "admin@example.com";
    public string? ReporterAvatarUrl { get; set; }

    public double? StoryPoints { get; set; }
    public int? OriginalEstimateMinutes { get; set; }
    public int? RemainingEstimateMinutes { get; set; }
    public int? TimeSpentMinutes { get; set; }

    public int? SprintId { get; set; }
    public string? EpicKey { get; set; }
    public string? ParentIssueKey { get; set; }

    public string? Labels { get; set; }
    public string? Components { get; set; }
    public string? FixVersion { get; set; }
    public string? BlockedBy { get; set; }
    public string? CustomFieldsJson { get; set; } // Key-value JSON of custom fields

    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }

    public double Order { get; set; } = 1.0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Project? Project { get; set; }
    public Sprint? Sprint { get; set; }

    public List<IssueComment> Comments { get; set; } = new();
    public List<Worklog> Worklogs { get; set; } = new();
    public List<ActivityLog> Activities { get; set; } = new();
}
