using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace JiraClone.Api.DTOs;

public class CreateProjectDto
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProjectTypeKey { get; set; } = "software";
    public string? AvatarUrl { get; set; }
    public string LeadName { get; set; } = "Admin";
    public string LeadEmail { get; set; } = "admin@example.com";
    public int? WorkspaceId { get; set; } = 1;
}

public class UpdateProjectDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? AvatarUrl { get; set; }
    public string? LeadName { get; set; }
    public string? LeadEmail { get; set; }
    public string? ProjectTypeKey { get; set; }
    public int? WorkspaceId { get; set; }
}

public class CreateSprintDto
{
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Goal { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class UpdateSprintDto
{
    public string? Name { get; set; }
    public string? Goal { get; set; }
    public string? State { get; set; } // "future", "active", "closed"
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class CreateIssueDto
{
    public int ProjectId { get; set; }
    public string IssueType { get; set; } = "Story"; // "Epic", "Story", "Task", "Bug", "Subtask"
    public string Summary { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "To Do";
    public string Priority { get; set; } = "Medium";
    
    public string? AssigneeName { get; set; }
    public string? AssigneeEmail { get; set; }
    public string? ReporterName { get; set; }
    public string? ReporterEmail { get; set; }
    
    public double? StoryPoints { get; set; }
    public int? OriginalEstimateMinutes { get; set; }
    public int? SprintId { get; set; }
    public string? EpicKey { get; set; }
    public string? ParentIssueKey { get; set; }

    public List<string>? Labels { get; set; }
    public List<string>? Components { get; set; }
    public string? FixVersion { get; set; }
    public string? BlockedBy { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? CustomFieldsJson { get; set; }
}

public class CreateIssueLinkDto
{
    public string TargetIssueKey { get; set; } = string.Empty;
    public string Relationship { get; set; } = "relates to";
}

public class SetParentIssueDto
{
    public string? ParentIssueKey { get; set; }
}

public class CreateChildIssueDto
{
    public string Summary { get; set; } = string.Empty;
    public string? IssueType { get; set; } = "Subtask";
    public string? Priority { get; set; } = "Medium";
    public string? AssigneeName { get; set; }
    public string? AssigneeEmail { get; set; }
    public double? StoryPoints { get; set; }
    public int? SprintId { get; set; }
}

public class UpdateIssueDto
{
    public string? Summary { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? IssueType { get; set; }
    public string? Resolution { get; set; }
    public string? FixVersion { get; set; }
    public string? BlockedBy { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? CustomFieldsJson { get; set; }
    
    public string? AssigneeName { get; set; }
    public string? AssigneeEmail { get; set; }
    public string? ReporterName { get; set; }
    
    public double? StoryPoints { get; set; }
    public int? OriginalEstimateMinutes { get; set; }
    public int? RemainingEstimateMinutes { get; set; }
    public int? SprintId { get; set; }
    public string? EpicKey { get; set; }
    public string? ParentIssueKey { get; set; }

    public List<string>? Labels { get; set; }
    public List<string>? Components { get; set; }
    public double? Order { get; set; }
}

public class MoveIssueDto
{
    public string? Status { get; set; }
    public int? SprintId { get; set; }
    public double? Order { get; set; }
}

public class AddCommentDto
{
    public string AuthorName { get; set; } = "Admin";
    public string? AuthorEmail { get; set; } = "admin@example.com";
    public string Body { get; set; } = string.Empty;
}

public class LogWorkDto
{
    public string AuthorName { get; set; } = "Admin";
    public int TimeSpentMinutes { get; set; }
    public DateTime? StartedAt { get; set; }
    public string? Comment { get; set; }
    public int? RemainingEstimateMinutes { get; set; }
}

// Jira Standard JSON schema representations (compatible with Jira Cloud & Jira Server API)
public class JiraExportRootDto
{
    [JsonPropertyName("expand")]
    public string Expand { get; set; } = "names,schema";

    [JsonPropertyName("startAt")]
    public int StartAt { get; set; } = 0;

    [JsonPropertyName("maxResults")]
    public int MaxResults { get; set; } = 500;

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("issues")]
    public List<JiraIssueExportDto> Issues { get; set; } = new();
}

public class JiraIssueExportDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("self")]
    public string Self { get; set; } = string.Empty;

    [JsonPropertyName("fields")]
    public JiraIssueFieldsDto Fields { get; set; } = new();
}

public class JiraIssueFieldsDto
{
    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public object? Description { get; set; }

    [JsonPropertyName("issuetype")]
    public JiraNamedObject? IssueType { get; set; }

    [JsonPropertyName("project")]
    public JiraProjectFieldDto? Project { get; set; }

    [JsonPropertyName("status")]
    public JiraStatusFieldDto? Status { get; set; }

    [JsonPropertyName("priority")]
    public JiraNamedObject? Priority { get; set; }

    [JsonPropertyName("resolution")]
    public JiraNamedObject? Resolution { get; set; }

    [JsonPropertyName("resolutiondate")]
    public string? ResolutionDate { get; set; }

    [JsonPropertyName("assignee")]
    public JiraUserFieldDto? Assignee { get; set; }

    [JsonPropertyName("reporter")]
    public JiraUserFieldDto? Reporter { get; set; }

    [JsonPropertyName("labels")]
    public List<string> Labels { get; set; } = new();

    [JsonPropertyName("components")]
    public List<JiraNamedObject> Components { get; set; } = new();

    [JsonPropertyName("customfield_10026")]
    public double? StoryPoints { get; set; } // Common Jira Story Points field

    [JsonPropertyName("customfield_10014")]
    public string? EpicKey { get; set; } // Jira Epic Link

    [JsonPropertyName("customfield_10020")]
    public List<JiraSprintFieldDto>? Sprints { get; set; } // Jira Sprint field

    [JsonPropertyName("parent")]
    public JiraParentIssueDto? Parent { get; set; }

    [JsonPropertyName("created")]
    public string? Created { get; set; }

    [JsonPropertyName("updated")]
    public string? Updated { get; set; }

    [JsonPropertyName("timetracking")]
    public JiraTimeTrackingDto? TimeTracking { get; set; }

    [JsonPropertyName("comment")]
    public JiraCommentsContainerDto? Comment { get; set; }
}

public class JiraNamedObject
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("subtask")]
    public bool? Subtask { get; set; }
}

public class JiraProjectFieldDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("projectTypeKey")]
    public string? ProjectTypeKey { get; set; }
}

public class JiraStatusFieldDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("statusCategory")]
    public JiraStatusCategoryDto? StatusCategory { get; set; }
}

public class JiraStatusCategoryDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class JiraUserFieldDto
{
    [JsonPropertyName("accountId")]
    public string? AccountId { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("emailAddress")]
    public string? EmailAddress { get; set; }

    [JsonPropertyName("avatarUrls")]
    public Dictionary<string, string>? AvatarUrls { get; set; }
}

public class JiraSprintFieldDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("state")]
    public string State { get; set; } = string.Empty;
}

public class JiraParentIssueDto
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;
}

public class JiraTimeTrackingDto
{
    [JsonPropertyName("originalEstimate")]
    public string? OriginalEstimate { get; set; }

    [JsonPropertyName("remainingEstimate")]
    public string? RemainingEstimate { get; set; }

    [JsonPropertyName("timeSpent")]
    public string? TimeSpent { get; set; }

    [JsonPropertyName("originalEstimateSeconds")]
    public int? OriginalEstimateSeconds { get; set; }

    [JsonPropertyName("remainingEstimateSeconds")]
    public int? RemainingEstimateSeconds { get; set; }

    [JsonPropertyName("timeSpentSeconds")]
    public int? TimeSpentSeconds { get; set; }
}

public class JiraCommentsContainerDto
{
    [JsonPropertyName("comments")]
    public List<JiraCommentDto> Comments { get; set; } = new();

    [JsonPropertyName("total")]
    public int Total => Comments.Count;
}

public class JiraCommentDto
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("author")]
    public JiraUserFieldDto? Author { get; set; }

    [JsonPropertyName("body")]
    public object? Body { get; set; }

    [JsonPropertyName("created")]
    public string? Created { get; set; }

    [JsonPropertyName("updated")]
    public string? Updated { get; set; }
}

// Jira CSV Record representation
public class JiraCsvRecord
{
    public string? IssueType { get; set; }
    public string? IssueKey { get; set; }
    public string? Summary { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? Resolution { get; set; }
    public string? Assignee { get; set; }
    public string? Reporter { get; set; }
    public string? StoryPoints { get; set; }
    public string? Sprint { get; set; }
    public string? Labels { get; set; }
    public string? Components { get; set; }
    public string? Created { get; set; }
    public string? Updated { get; set; }
    public string? Comment { get; set; }
}

public class JiraImportResultDto
{
    public bool Success { get; set; }
    public int TotalRead { get; set; }
    public int IssuesImported { get; set; }
    public int SprintsCreated { get; set; }
    public List<string> ImportedKeys { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}
