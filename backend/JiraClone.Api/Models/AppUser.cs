using System;

namespace JiraClone.Api.Models;

public class AppUser
{
    public int Id { get; set; }
    public string AccountId { get; set; } = string.Empty; // Jira accountId or username
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string EmailAddress { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool Active { get; set; } = true;
    public string Role { get; set; } = "Developer"; // "Administrator", "Project Lead", "Developer", "QA Engineer", "Product Owner", "Viewer"
    public string UserType { get; set; } = "Internal"; // "Internal", "External", "Contractor"
    public string GroupsJson { get; set; } = "[\"jira-software-users\"]";
    public string AppAccessJson { get; set; } = "[\"jira-software\"]";
    public string? Department { get; set; } = "Engineering";
    public string? JobTitle { get; set; } = "Software Engineer";
    public string? TimeZone { get; set; } = "UTC";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
