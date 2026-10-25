using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class ProjectMember
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public int UserId { get; set; }
    public string Role { get; set; } = "Developer"; // "Administrator", "Project Lead", "Developer", "QA Engineer", "Product Owner", "Viewer"
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Project? Project { get; set; }
    public AppUser? User { get; set; }
}

public class ProjectPermission
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string PermissionKey { get; set; } = string.Empty; // e.g. "CREATE_ISSUES", "EDIT_ISSUES", "TRANSITION_ISSUES", "MANAGE_SPRINTS", "ADMINISTER_PROJECTS"
    public string Role { get; set; } = string.Empty; // e.g. "Administrator", "Developer", etc.
    public bool IsAllowed { get; set; } = true;

    [JsonIgnore]
    public Project? Project { get; set; }
}

public class UserGroup
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "jira-administrators", "jira-software-users", "external-contractors"
    public string Description { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;
    public int UserCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ProjectTeam
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "Core Platform Squad", "Frontend UI Team"
    public string? Description { get; set; }
    public string? LeadName { get; set; }
    public string? LeadEmail { get; set; }
    public string MembersJson { get; set; } = "[]"; // Array of user IDs or names
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Project? Project { get; set; }
}

public class AppAccessSetting
{
    public int Id { get; set; }
    public string AppKey { get; set; } = string.Empty; // "jira-software", "jira-service-management", "confluence", "jira-work-management"
    public string AppName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public string DefaultGroup { get; set; } = "jira-software-users";
    public int LicensedSeats { get; set; } = 25;
    public int AssignedSeats { get; set; } = 4;
}
