using System;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class CustomFieldDefinition
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string FieldKey { get; set; } = string.Empty; // e.g. "customer_tier", "target_env", "pr_link"
    public string Name { get; set; } = string.Empty; // Display label
    public string FieldType { get; set; } = "text"; // "text", "number", "select", "date", "checkbox", "url"
    public string? OptionsJson { get; set; } // JSON array of options for select fields e.g. ["Enterprise", "Mid-Market", "SMB"]
    public bool IsRequired { get; set; } = false;
    public bool ShowInListView { get; set; } = true;
    public int Order { get; set; } = 1;

    [JsonIgnore]
    public Project? Project { get; set; }
}
