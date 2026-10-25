using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class Project
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty; // e.g. "KAN", "ERP"
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ProjectTypeKey { get; set; } = "software";
    public string? AvatarUrl { get; set; }
    public string LeadName { get; set; } = "Admin";
    public string LeadEmail { get; set; } = "admin@example.com";
    public int? WorkspaceId { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public List<Issue> Issues { get; set; } = new();

    [JsonIgnore]
    public List<Sprint> Sprints { get; set; } = new();
}
