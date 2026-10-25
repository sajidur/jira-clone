using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Controllers;

public class CreateUserDto
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string EmailAddress { get; set; } = string.Empty;
    public string Role { get; set; } = "Developer";
    public string UserType { get; set; } = "Internal"; // "Internal", "External", "Contractor"
    public string? Department { get; set; } = "Engineering";
    public string? JobTitle { get; set; } = "Software Engineer";
    public string? AvatarUrl { get; set; }
    public List<string>? Groups { get; set; }
    public List<string>? AppAccess { get; set; }
}

public class UpdateUserDto
{
    public string? DisplayName { get; set; }
    public string? EmailAddress { get; set; }
    public string? Role { get; set; }
    public string? UserType { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? AvatarUrl { get; set; }
    public bool? Active { get; set; }
    public List<string>? Groups { get; set; }
    public List<string>? AppAccess { get; set; }
}

public class AddProjectMemberDto
{
    public int ProjectId { get; set; }
    public int UserId { get; set; }
    public string Role { get; set; } = "Developer";
}

public class TogglePermissionDto
{
    public int ProjectId { get; set; }
    public string PermissionKey { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsAllowed { get; set; }
}

public class CreateGroupDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;
}

public class CreateTeamDto
{
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LeadName { get; set; }
    public string? LeadEmail { get; set; }
    public List<string>? Members { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _db.AppUsers.OrderBy(u => u.DisplayName).ToListAsync();
        return Ok(users);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetUserById(int id)
    {
        var user = await _db.AppUsers.FindAsync(id);
        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.DisplayName) || string.IsNullOrWhiteSpace(dto.EmailAddress))
        {
            return BadRequest(new { message = "Display name and email are required." });
        }

        var accountId = "usr-" + Guid.NewGuid().ToString("N")[..8];
        var username = string.IsNullOrWhiteSpace(dto.Name)
            ? dto.DisplayName.ToLower().Replace(" ", ".")
            : dto.Name.Trim();

        var groups = dto.Groups ?? new List<string> { "jira-software-users" };
        var apps = dto.AppAccess ?? new List<string> { "jira-software" };

        var user = new AppUser
        {
            AccountId = accountId,
            Name = username,
            DisplayName = dto.DisplayName.Trim(),
            EmailAddress = dto.EmailAddress.Trim(),
            Role = dto.Role ?? "Developer",
            UserType = dto.UserType ?? "Internal",
            Department = dto.Department ?? "Engineering",
            JobTitle = dto.JobTitle ?? "Software Engineer",
            GroupsJson = JsonSerializer.Serialize(groups),
            AppAccessJson = JsonSerializer.Serialize(apps),
            AvatarUrl = !string.IsNullOrWhiteSpace(dto.AvatarUrl)
                ? dto.AvatarUrl
                : $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(dto.DisplayName)}&background=0052cc&color=fff",
            Active = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.AppUsers.Add(user);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, user);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        var user = await _db.AppUsers.FindAsync(id);
        if (user == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.DisplayName)) user.DisplayName = dto.DisplayName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.EmailAddress)) user.EmailAddress = dto.EmailAddress.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Role)) user.Role = dto.Role;
        if (!string.IsNullOrWhiteSpace(dto.UserType)) user.UserType = dto.UserType;
        if (dto.Department != null) user.Department = dto.Department;
        if (dto.JobTitle != null) user.JobTitle = dto.JobTitle;
        if (dto.AvatarUrl != null) user.AvatarUrl = dto.AvatarUrl;
        if (dto.Active.HasValue) user.Active = dto.Active.Value;
        if (dto.Groups != null) user.GroupsJson = JsonSerializer.Serialize(dto.Groups);
        if (dto.AppAccess != null) user.AppAccessJson = JsonSerializer.Serialize(dto.AppAccess);

        await _db.SaveChangesAsync();
        return Ok(user);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.AppUsers.FindAsync(id);
        if (user == null) return NotFound();

        user.Active = false; // Soft deactivate
        await _db.SaveChangesAsync();
        return Ok(new { message = "User deactivated successfully." });
    }

    [HttpGet("roles")]
    public IActionResult GetAvailableRoles()
    {
        var roles = new[]
        {
            new { name = "Administrator", description = "Full management access across all project settings, members, and issues." },
            new { name = "Project Lead", description = "Leads sprint planning, architecture, releases, and assignment." },
            new { name = "Developer", description = "Can create, update, log work, and transition code issues through workflow." },
            new { name = "QA Engineer", description = "Focuses on bug reports, test verifications, and quality transitions." },
            new { name = "Product Owner", description = "Manages epics, user stories, prioritization, and sprint goals." },
            new { name = "Viewer", description = "Read-only access to view boards, backlog, reports, and dashboards." }
        };
        return Ok(roles);
    }

    // -------------------------------------------------------------
    // GROUPS MANAGEMENT
    // -------------------------------------------------------------

    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups()
    {
        var groups = await _db.UserGroups.OrderBy(g => g.Name).ToListAsync();
        return Ok(groups);
    }

    [HttpPost("groups")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Group name is required." });

        var group = new UserGroup
        {
            Name = dto.Name.Trim().ToLower().Replace(" ", "-"),
            Description = dto.Description?.Trim() ?? string.Empty,
            IsDefault = dto.IsDefault,
            UserCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        _db.UserGroups.Add(group);
        await _db.SaveChangesAsync();
        return Ok(group);
    }

    [HttpDelete("groups/{id:int}")]
    public async Task<IActionResult> DeleteGroup(int id)
    {
        var g = await _db.UserGroups.FindAsync(id);
        if (g == null) return NotFound();
        _db.UserGroups.Remove(g);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // -------------------------------------------------------------
    // TEAMS MANAGEMENT
    // -------------------------------------------------------------

    [HttpGet("teams/{projectId:int}")]
    public async Task<IActionResult> GetTeams(int projectId)
    {
        var teams = await _db.ProjectTeams.Where(t => t.ProjectId == projectId).OrderBy(t => t.Name).ToListAsync();
        return Ok(teams);
    }

    [HttpPost("teams")]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Team name is required." });

        var team = new ProjectTeam
        {
            ProjectId = dto.ProjectId,
            Name = dto.Name.Trim(),
            Description = dto.Description,
            LeadName = dto.LeadName,
            LeadEmail = dto.LeadEmail,
            MembersJson = dto.Members != null ? JsonSerializer.Serialize(dto.Members) : "[]",
            CreatedAt = DateTime.UtcNow
        };

        _db.ProjectTeams.Add(team);
        await _db.SaveChangesAsync();
        return Ok(team);
    }

    [HttpDelete("teams/{id:int}")]
    public async Task<IActionResult> DeleteTeam(int id)
    {
        var team = await _db.ProjectTeams.FindAsync(id);
        if (team == null) return NotFound();
        _db.ProjectTeams.Remove(team);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // -------------------------------------------------------------
    // APPLICATION ACCESS & LICENSING
    // -------------------------------------------------------------

    [HttpGet("app-access")]
    public async Task<IActionResult> GetAppAccessSettings()
    {
        var settings = await _db.AppAccessSettings.OrderBy(a => a.AppName).ToListAsync();
        return Ok(settings);
    }

    [HttpPost("app-access/toggle/{id:int}")]
    public async Task<IActionResult> ToggleAppAccess(int id)
    {
        var setting = await _db.AppAccessSettings.FindAsync(id);
        if (setting == null) return NotFound();
        setting.IsEnabled = !setting.IsEnabled;
        await _db.SaveChangesAsync();
        return Ok(setting);
    }

    [HttpPut("app-access/{id:int}")]
    public async Task<IActionResult> UpdateAppAccess(int id, [FromBody] JsonElement body)
    {
        var setting = await _db.AppAccessSettings.FindAsync(id);
        if (setting == null) return NotFound();

        if (body.TryGetProperty("licensedSeats", out var seats)) setting.LicensedSeats = seats.GetInt32();
        if (body.TryGetProperty("defaultGroup", out var grp)) setting.DefaultGroup = grp.GetString() ?? setting.DefaultGroup;

        await _db.SaveChangesAsync();
        return Ok(setting);
    }

    // -------------------------------------------------------------
    // PROJECT MEMBERSHIP & ASSIGNMENT
    // -------------------------------------------------------------

    [HttpGet("project-members/{projectId:int}")]
    public async Task<IActionResult> GetProjectMembers(int projectId)
    {
        var members = await _db.ProjectMembers
            .Include(pm => pm.User)
            .Where(pm => pm.ProjectId == projectId)
            .OrderBy(pm => pm.Role)
            .ThenBy(pm => pm.User!.DisplayName)
            .ToListAsync();

        return Ok(members);
    }

    [HttpPost("project-members")]
    public async Task<IActionResult> AddProjectMember([FromBody] AddProjectMemberDto dto)
    {
        var exists = await _db.ProjectMembers.AnyAsync(pm => pm.ProjectId == dto.ProjectId && pm.UserId == dto.UserId);
        if (exists)
        {
            return BadRequest(new { message = "User is already a member of this project." });
        }

        var member = new ProjectMember
        {
            ProjectId = dto.ProjectId,
            UserId = dto.UserId,
            Role = dto.Role ?? "Developer",
            JoinedAt = DateTime.UtcNow
        };

        _db.ProjectMembers.Add(member);
        await _db.SaveChangesAsync();

        var loaded = await _db.ProjectMembers
            .Include(pm => pm.User)
            .FirstOrDefaultAsync(pm => pm.Id == member.Id);

        return Ok(loaded);
    }

    [HttpDelete("project-members/{id:int}")]
    public async Task<IActionResult> RemoveProjectMember(int id)
    {
        var member = await _db.ProjectMembers.FindAsync(id);
        if (member == null) return NotFound();

        _db.ProjectMembers.Remove(member);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // -------------------------------------------------------------
    // PERMISSION SCHEMES MATRIX
    // -------------------------------------------------------------

    [HttpGet("permissions/{projectId:int}")]
    public async Task<IActionResult> GetProjectPermissions(int projectId)
    {
        var permissions = await _db.ProjectPermissions
            .Where(pp => pp.ProjectId == projectId)
            .ToListAsync();

        var permissionDefs = new[]
        {
            // Project
            new { key = "ADMINISTER_PROJECTS", name = "Administer Projects", category = "Project Permissions", description = "Ability to configure project workflow, components, members, and settings." },
            new { key = "BROWSE_PROJECTS", name = "Browse Projects", category = "Project Permissions", description = "Ability to navigate, view issues, and open boards and backlogs in this project." },
            
            // Issue
            new { key = "CREATE_ISSUES", name = "Create Issues", category = "Issue Permissions", description = "Ability to create new tasks, stories, bugs, and epics." },
            new { key = "EDIT_ISSUES", name = "Edit Issues", category = "Issue Permissions", description = "Ability to edit summaries, descriptions, story points, and fields." },
            new { key = "ASSIGN_ISSUES", name = "Assign Issues", category = "Issue Permissions", description = "Ability to reassign issues to different team members." },
            new { key = "ASSIGNABLE_USER", name = "Assignable User", category = "Issue Permissions", description = "Users with this role can be assigned to issues." },
            new { key = "RESOLVE_ISSUES", name = "Resolve & Close Issues", category = "Issue Permissions", description = "Ability to mark issues as resolved or closed." },
            new { key = "DELETE_ISSUES", name = "Delete Issues", category = "Issue Permissions", description = "Ability to delete issues and attachments permanently." },
            new { key = "LINK_ISSUES", name = "Link Issues", category = "Issue Permissions", description = "Ability to link issues to one another and specify dependencies." },

            // Workflow & Agile
            new { key = "TRANSITION_ISSUES", name = "Transition Issues", category = "Workflow Permissions", description = "Ability to move issues across workflow columns and change status." },
            new { key = "MANAGE_SPRINTS", name = "Manage & Plan Sprints", category = "Agile Permissions", description = "Ability to create, reorder, plan, and delete sprints." },
            new { key = "START_STOP_SPRINTS", name = "Start / Complete Sprints", category = "Agile Permissions", description = "Ability to start an active sprint and close completed sprints." },

            // Comments
            new { key = "ADD_COMMENTS", name = "Add Comments", category = "Comments Permissions", description = "Ability to add comments to issues." },
            new { key = "EDIT_ALL_COMMENTS", name = "Edit All Comments", category = "Comments Permissions", description = "Ability to edit comments made by any user." },
            new { key = "DELETE_ALL_COMMENTS", name = "Delete Comments", category = "Comments Permissions", description = "Ability to delete comments." },

            // Time Tracking
            new { key = "WORK_ON_ISSUES", name = "Log Work & Time", category = "Time Tracking Permissions", description = "Ability to log work hours and update remaining estimates." },
            new { key = "MANAGE_WATCHERS", name = "Manage Watchers", category = "Voters & Watchers", description = "Ability to add and remove watchers from issues." }
        };

        return Ok(new
        {
            definitions = permissionDefs,
            matrix = permissions
        });
    }

    [HttpPost("permissions/toggle")]
    public async Task<IActionResult> ToggleProjectPermission([FromBody] TogglePermissionDto dto)
    {
        var perm = await _db.ProjectPermissions.FirstOrDefaultAsync(
            pp => pp.ProjectId == dto.ProjectId && pp.PermissionKey == dto.PermissionKey && pp.Role == dto.Role
        );

        if (perm == null)
        {
            perm = new ProjectPermission
            {
                ProjectId = dto.ProjectId,
                PermissionKey = dto.PermissionKey,
                Role = dto.Role,
                IsAllowed = dto.IsAllowed
            };
            _db.ProjectPermissions.Add(perm);
        }
        else
        {
            perm.IsAllowed = dto.IsAllowed;
        }

        await _db.SaveChangesAsync();
        return Ok(perm);
    }
}
