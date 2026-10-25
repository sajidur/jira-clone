using System;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class WorkflowRule
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "Auto-resolve when moved to Done"
    public string TriggerEvent { get; set; } = "OnStatusChange"; // "OnStatusChange", "OnCreate", "OnAssign"
    public string? ConditionStatus { get; set; } // e.g. "Done", "In Review"
    public string ActionType { get; set; } = "SetResolution"; // "SetResolution", "AutoAssign", "AddComment"
    public string ActionValue { get; set; } = "Done"; // e.g. "Done", "Sarah Connor", "Ready for deployment"
    public bool IsEnabled { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Project? Project { get; set; }
}
