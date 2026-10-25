using System;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class UserNotification
{
    public int Id { get; set; }
    public string RecipientName { get; set; } = "Sajidur Rahman";
    public string? RecipientEmail { get; set; } = "sajidur@akij.net";
    public string ActorName { get; set; } = "System";
    public string? ActorAvatarUrl { get; set; }
    public string Action { get; set; } = "assigned"; // "assigned" | "status_changed" | "commented" | "created" | "sprint_started" | "sprint_completed" | "worklog"
    public string Category { get; set; } = "direct"; // "direct" | "watching" | "system"
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? IssueId { get; set; }
    public string? IssueKey { get; set; }
    public string? IssueSummary { get; set; }
    public int? ProjectId { get; set; }
    public string? ProjectKey { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
