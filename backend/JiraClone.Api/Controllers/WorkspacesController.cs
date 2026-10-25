using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Auth;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Controllers;

public class CreateWorkspaceDto
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Domain { get; set; } = "akij.net";
    public string PlanTier { get; set; } = "Enterprise";
}

public class UpdateWorkspaceGeneralDto
{
    public string? Name { get; set; }
    public string? Slug { get; set; }
    public string? Description { get; set; }
    public string? Domain { get; set; }
    public string? Timezone { get; set; }
    public string? DateFormat { get; set; }
    public string? DefaultLanguage { get; set; }
    public string? LogoUrl { get; set; }
}

public class UpdateWorkspaceSecurityDto
{
    public bool RequireTwoFactor { get; set; }
    public bool EnforceSso { get; set; }
    public string? AllowedDomainRestrictions { get; set; }
    public int SessionTimeoutMinutes { get; set; }
    public string? IpAllowlist { get; set; }
}

public class UpdateWorkspaceFeaturesDto
{
    public bool EnableSprints { get; set; }
    public bool EnableRoadmaps { get; set; }
    public bool EnableTimeTracking { get; set; }
    public bool EnableJqlAdvancedSearch { get; set; }
    public bool EnableAutomations { get; set; }
    public bool EnableExternalSharing { get; set; }
    public bool EnableAiAssistance { get; set; }
}

public class AddWorkspaceMemberDto
{
    public int UserId { get; set; }
    public string Role { get; set; } = "Member";
}

[ApiController]
[Route("api/[controller]")]
public class WorkspacesController : ControllerBase
{
    private readonly AppDbContext _db;

    public WorkspacesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetWorkspaces()
    {
        var workspaces = await _db.Workspaces
            .OrderBy(w => w.Name)
            .ToListAsync();

        var result = new List<object>();
        foreach (var w in workspaces)
        {
            var projectCount = await _db.Projects.CountAsync(p => p.WorkspaceId == w.Id);
            var memberCount = await _db.WorkspaceMembers.CountAsync(m => m.WorkspaceId == w.Id);
            if (memberCount == 0) memberCount = await _db.AppUsers.CountAsync(); // fallback to total users

            result.Add(new
            {
                w.Id,
                w.Name,
                w.Slug,
                w.Description,
                w.LogoUrl,
                w.Domain,
                w.PlanTier,
                w.Timezone,
                w.DateFormat,
                w.DefaultLanguage,
                w.RequireTwoFactor,
                w.EnforceSso,
                w.AllowedDomainRestrictions,
                w.SessionTimeoutMinutes,
                w.IpAllowlist,
                w.EnableSprints,
                w.EnableRoadmaps,
                w.EnableTimeTracking,
                w.EnableJqlAdvancedSearch,
                w.EnableAutomations,
                w.EnableExternalSharing,
                w.EnableAiAssistance,
                w.StorageUsedMb,
                w.StorageLimitMb,
                w.CreatedAt,
                w.UpdatedAt,
                ProjectCount = projectCount,
                MemberCount = memberCount
            });
        }

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetWorkspaceById(int id)
    {
        var w = await _db.Workspaces.FindAsync(id);
        if (w == null) return NotFound();

        var projectCount = await _db.Projects.CountAsync(p => p.WorkspaceId == w.Id);
        var memberCount = await _db.WorkspaceMembers.CountAsync(m => m.WorkspaceId == w.Id);
        if (memberCount == 0) memberCount = await _db.AppUsers.CountAsync();

        return Ok(new
        {
            w.Id,
            w.Name,
            w.Slug,
            w.Description,
            w.LogoUrl,
            w.Domain,
            w.PlanTier,
            w.Timezone,
            w.DateFormat,
            w.DefaultLanguage,
            w.RequireTwoFactor,
            w.EnforceSso,
            w.AllowedDomainRestrictions,
            w.SessionTimeoutMinutes,
            w.IpAllowlist,
            w.EnableSprints,
            w.EnableRoadmaps,
            w.EnableTimeTracking,
            w.EnableJqlAdvancedSearch,
            w.EnableAutomations,
            w.EnableExternalSharing,
            w.EnableAiAssistance,
            w.StorageUsedMb,
            w.StorageLimitMb,
            w.CreatedAt,
            w.UpdatedAt,
            ProjectCount = projectCount,
            MemberCount = memberCount
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateWorkspace([FromBody] CreateWorkspaceDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Workspace name is required." });

        var slug = string.IsNullOrWhiteSpace(dto.Slug)
            ? dto.Name.Trim().ToLower().Replace(" ", "-")
            : dto.Slug.Trim().ToLower().Replace(" ", "-");

        var exists = await _db.Workspaces.AnyAsync(w => w.Slug == slug);
        if (exists)
        {
            slug = $"{slug}-{Guid.NewGuid().ToString("N")[..4]}";
        }

        var workspace = new Workspace
        {
            Name = dto.Name.Trim(),
            Slug = slug,
            Description = dto.Description?.Trim(),
            Domain = string.IsNullOrWhiteSpace(dto.Domain) ? "akij.net" : dto.Domain.Trim(),
            PlanTier = string.IsNullOrWhiteSpace(dto.PlanTier) ? "Enterprise" : dto.PlanTier.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Workspaces.Add(workspace);
        await _db.SaveChangesAsync();

        // Log audit event
        _db.WorkspaceAuditLogs.Add(new WorkspaceAuditLog
        {
            WorkspaceId = workspace.Id,
            ActorName = User.GetDisplayName(),
            ActorEmail = "sajidur@akij.net",
            Action = "WORKSPACE_CREATED",
            Details = $"Workspace '{workspace.Name}' ({workspace.Slug}.atlassian.net) created.",
            Timestamp = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetWorkspaceById), new { id = workspace.Id }, workspace);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateGeneral(int id, [FromBody] UpdateWorkspaceGeneralDto dto)
    {
        var w = await _db.Workspaces.FindAsync(id);
        if (w == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Name)) w.Name = dto.Name.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Slug)) w.Slug = dto.Slug.Trim().ToLower().Replace(" ", "-");
        if (dto.Description != null) w.Description = dto.Description.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Domain)) w.Domain = dto.Domain.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Timezone)) w.Timezone = dto.Timezone.Trim();
        if (!string.IsNullOrWhiteSpace(dto.DateFormat)) w.DateFormat = dto.DateFormat.Trim();
        if (!string.IsNullOrWhiteSpace(dto.DefaultLanguage)) w.DefaultLanguage = dto.DefaultLanguage.Trim();
        if (dto.LogoUrl != null) w.LogoUrl = dto.LogoUrl;
        w.UpdatedAt = DateTime.UtcNow;

        _db.WorkspaceAuditLogs.Add(new WorkspaceAuditLog
        {
            WorkspaceId = w.Id,
            ActorName = User.GetDisplayName(),
            ActorEmail = "sajidur@akij.net",
            Action = "GENERAL_PROFILE_UPDATED",
            Details = "Workspace general settings and organizational parameters updated.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(w);
    }

    [HttpPut("{id:int}/security")]
    public async Task<IActionResult> UpdateSecurity(int id, [FromBody] UpdateWorkspaceSecurityDto dto)
    {
        var w = await _db.Workspaces.FindAsync(id);
        if (w == null) return NotFound();

        w.RequireTwoFactor = dto.RequireTwoFactor;
        w.EnforceSso = dto.EnforceSso;
        w.AllowedDomainRestrictions = dto.AllowedDomainRestrictions?.Trim() ?? string.Empty;
        w.SessionTimeoutMinutes = dto.SessionTimeoutMinutes > 0 ? dto.SessionTimeoutMinutes : 1440;
        w.IpAllowlist = dto.IpAllowlist?.Trim();
        w.UpdatedAt = DateTime.UtcNow;

        _db.WorkspaceAuditLogs.Add(new WorkspaceAuditLog
        {
            WorkspaceId = w.Id,
            ActorName = User.GetDisplayName(),
            ActorEmail = "sajidur@akij.net",
            Action = "SECURITY_POLICIES_UPDATED",
            Details = $"Security governance updated: 2FA={dto.RequireTwoFactor}, SSO={dto.EnforceSso}, Domains={dto.AllowedDomainRestrictions}.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(w);
    }

    [HttpPut("{id:int}/features")]
    public async Task<IActionResult> UpdateFeatures(int id, [FromBody] UpdateWorkspaceFeaturesDto dto)
    {
        var w = await _db.Workspaces.FindAsync(id);
        if (w == null) return NotFound();

        w.EnableSprints = dto.EnableSprints;
        w.EnableRoadmaps = dto.EnableRoadmaps;
        w.EnableTimeTracking = dto.EnableTimeTracking;
        w.EnableJqlAdvancedSearch = dto.EnableJqlAdvancedSearch;
        w.EnableAutomations = dto.EnableAutomations;
        w.EnableExternalSharing = dto.EnableExternalSharing;
        w.EnableAiAssistance = dto.EnableAiAssistance;
        w.UpdatedAt = DateTime.UtcNow;

        _db.WorkspaceAuditLogs.Add(new WorkspaceAuditLog
        {
            WorkspaceId = w.Id,
            ActorName = User.GetDisplayName(),
            ActorEmail = "sajidur@akij.net",
            Action = "FEATURE_FLAGS_UPDATED",
            Details = "Workspace feature modules and capabilities updated.",
            Timestamp = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(w);
    }

    [HttpGet("{id:int}/members")]
    public async Task<IActionResult> GetMembers(int id)
    {
        var members = await _db.WorkspaceMembers
            .Include(m => m.User)
            .Where(m => m.WorkspaceId == id)
            .OrderBy(m => m.Role)
            .ThenBy(m => m.User!.DisplayName)
            .ToListAsync();

        if (members.Count == 0)
        {
            // Auto seed members from AppUsers
            var allUsers = await _db.AppUsers.ToListAsync();
            foreach (var u in allUsers)
            {
                var role = u.Role == "Administrator" ? "Admin" : u.UserType == "Contractor" ? "Guest" : "Member";
                _db.WorkspaceMembers.Add(new WorkspaceMember
                {
                    WorkspaceId = id,
                    UserId = u.Id,
                    Role = role,
                    JoinedAt = DateTime.UtcNow
                });
            }
            await _db.SaveChangesAsync();

            members = await _db.WorkspaceMembers
                .Include(m => m.User)
                .Where(m => m.WorkspaceId == id)
                .ToListAsync();
        }

        return Ok(members);
    }

    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> AddMember(int id, [FromBody] AddWorkspaceMemberDto dto)
    {
        var exists = await _db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == id && m.UserId == dto.UserId);
        if (exists)
        {
            return BadRequest(new { message = "User is already a member of this workspace." });
        }

        var member = new WorkspaceMember
        {
            WorkspaceId = id,
            UserId = dto.UserId,
            Role = dto.Role ?? "Member",
            JoinedAt = DateTime.UtcNow
        };

        _db.WorkspaceMembers.Add(member);
        await _db.SaveChangesAsync();

        var loaded = await _db.WorkspaceMembers
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.Id == member.Id);

        _db.WorkspaceAuditLogs.Add(new WorkspaceAuditLog
        {
            WorkspaceId = id,
            ActorName = User.GetDisplayName(),
            ActorEmail = "sajidur@akij.net",
            Action = "MEMBER_ADDED",
            Details = $"User ID {dto.UserId} added with role {dto.Role}.",
            Timestamp = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        return Ok(loaded);
    }

    [HttpDelete("{id:int}/members/{memberId:int}")]
    public async Task<IActionResult> RemoveMember(int id, int memberId)
    {
        var m = await _db.WorkspaceMembers.FirstOrDefaultAsync(x => x.Id == memberId && x.WorkspaceId == id);
        if (m == null) return NotFound();

        _db.WorkspaceMembers.Remove(m);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:int}/audit-logs")]
    public async Task<IActionResult> GetAuditLogs(int id)
    {
        var logs = await _db.WorkspaceAuditLogs
            .Where(l => l.WorkspaceId == id)
            .OrderByDescending(l => l.Timestamp)
            .Take(100)
            .ToListAsync();

        return Ok(logs);
    }
}
