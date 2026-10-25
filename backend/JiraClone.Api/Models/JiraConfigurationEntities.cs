using System;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class ProjectComponent
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "Frontend Web", "Core DB"
    public string? Description { get; set; }
    public string? LeadName { get; set; }
    public string? DefaultAssignee { get; set; }

    [JsonIgnore]
    public Project? Project { get; set; }
}

public class ProjectIssueType
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty; // "Epic", "Story", "Task", "Bug", "Subtask", "Spike", "Improvement"
    public string? Description { get; set; }
    public string Icon { get; set; } = "Story";
    public bool IsSubtask { get; set; } = false;
    public int Order { get; set; } = 1;

    [JsonIgnore]
    public Project? Project { get; set; }
}

public class ProjectPriority
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty; // "Highest", "High", "Medium", "Low", "Lowest"
    public string Color { get; set; } = "#ff5630";
    public string? Description { get; set; }
    public int Order { get; set; } = 1;

    [JsonIgnore]
    public Project? Project { get; set; }
}

public class ProjectResolution
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty; // "Done", "Fixed", "Won't Fix", "Duplicate", "Cannot Reproduce"
    public string? Description { get; set; }
    public int Order { get; set; } = 1;

    [JsonIgnore]
    public Project? Project { get; set; }
}

public class SavedFilter
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "My Open Issues"
    public string Jql { get; set; } = string.Empty; // e.g. "assignee = 'Sajidur Rahman' AND resolution = 'Unresolved'"
    public string? Description { get; set; }
    public string OwnerName { get; set; } = "Sajidur Rahman";
    public bool IsFavorite { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ProjectWebhook
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "Slack Notifications", "GitHub Sync"
    public string Url { get; set; } = string.Empty;
    public string EventsJson { get; set; } = "[\"issue_created\", \"issue_updated\"]";
    public bool IsEnabled { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Project? Project { get; set; }
}
