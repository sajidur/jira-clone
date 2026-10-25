using System;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class ProjectVersion
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "v1.0.0", "v2.1.0"
    public string? Description { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public bool IsReleased { get; set; } = false;
    public bool IsArchived { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Project? Project { get; set; }
}
