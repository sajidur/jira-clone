using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace JiraClone.Api.Models;

public class Workspace
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty; // e.g. "RexSystem Enterprise", "AKIJ Group"
    public string Slug { get; set; } = string.Empty; // e.g. "rexsystem", "akij-erp" -> rexsystem.atlassian.net
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string Domain { get; set; } = "akij.net";
    public string PlanTier { get; set; } = "Enterprise"; // "Free", "Standard", "Premium", "Enterprise"
    public string Timezone { get; set; } = "UTC+06:00 (Asia/Dhaka)";
    public string DateFormat { get; set; } = "YYYY-MM-DD";
    public string DefaultLanguage { get; set; } = "English (US)";

    // Security Configurations
    public bool RequireTwoFactor { get; set; } = true;
    public bool EnforceSso { get; set; } = false;
    public string AllowedDomainRestrictions { get; set; } = "akij.net, vendor.com";
    public int SessionTimeoutMinutes { get; set; } = 1440; // 24 hours
    public string? IpAllowlist { get; set; }

    // Feature Flags & Modules
    public bool EnableSprints { get; set; } = true;
    public bool EnableRoadmaps { get; set; } = true;
    public bool EnableTimeTracking { get; set; } = true;
    public bool EnableJqlAdvancedSearch { get; set; } = true;
    public bool EnableAutomations { get; set; } = true;
    public bool EnableExternalSharing { get; set; } = true;
    public bool EnableAiAssistance { get; set; } = true;

    // Storage & Quotas
    public double StorageUsedMb { get; set; } = 124.5;
    public double StorageLimitMb { get; set; } = 102400.0; // 100 GB

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public List<WorkspaceMember> Members { get; set; } = new();

    [JsonIgnore]
    public List<Project> Projects { get; set; } = new();
}

public class WorkspaceMember
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; }
    public int UserId { get; set; }
    public string Role { get; set; } = "Member"; // "Owner", "Admin", "Member", "Guest"
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Workspace? Workspace { get; set; }
    public AppUser? User { get; set; }
}

public class WorkspaceAuditLog
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; }
    public string ActorName { get; set; } = string.Empty;
    public string ActorEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
