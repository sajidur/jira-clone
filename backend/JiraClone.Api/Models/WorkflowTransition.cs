using System;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class WorkflowTransition
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string FromStatus { get; set; } = string.Empty; // e.g. "To Do", or "*" for any status
    public string ToStatus { get; set; } = string.Empty; // e.g. "In Progress"
    public string Name { get; set; } = string.Empty; // e.g. "Start Working", "Submit for Review"
    public string? Description { get; set; }
    public string? RequiredRole { get; set; } // "Any", "Lead", "Developer", "QA"
    public string? AutoResolution { get; set; } // e.g. "Done"
    public string? AutoAssignee { get; set; } // e.g. "Sarah Connor"

    [JsonIgnore]
    public Project? Project { get; set; }
}
