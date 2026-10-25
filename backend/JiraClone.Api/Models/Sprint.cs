using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class Sprint
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Goal { get; set; }
    public string State { get; set; } = "active"; // "future", "active", "closed"
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? CompleteDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Project? Project { get; set; }

    [JsonIgnore]
    public List<Issue> Issues { get; set; } = new();
}
