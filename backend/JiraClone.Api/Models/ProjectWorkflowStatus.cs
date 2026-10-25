using System;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class ProjectWorkflowStatus
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "To Do", "In Progress", "In Review", "QA Testing", "Done"
    public string Category { get; set; } = "To Do"; // "To Do", "In Progress", "Done"
    public string Color { get; set; } = "#4c9aff"; // Hex color
    public int Order { get; set; } = 1;
    public int? WipLimit { get; set; } // Work-in-progress limit for Kanban

    [JsonIgnore]
    public Project? Project { get; set; }
}
