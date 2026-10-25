using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Auth;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Controllers;

public class AdminCreateUserDto
{
    public string Name { get; set; } = string.Empty; // username
    public string DisplayName { get; set; } = string.Empty;
    public string EmailAddress { get; set; } = string.Empty;
    public string Role { get; set; } = "Developer";
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string Password { get; set; } = string.Empty;
}

public class AdminUpdateUserDto
{
    public string? Name { get; set; }
    public string? DisplayName { get; set; }
    public string? EmailAddress { get; set; }
    public string? Role { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public bool? Active { get; set; }
}

public class AdminSetPasswordDto
{
    public string Password { get; set; } = string.Empty;
}

[ApiController]
[Route("api/admin")]
[Authorize(Roles = ClaimsPrincipalExtensions.AdministratorRole)]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly CredentialValidator _credentials;

    public AdminController(AppDbContext db, CredentialValidator credentials)
    {
        _db = db;
        _credentials = credentials;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var now = DateTime.UtcNow;
        var users = await _db.AppUsers.ToListAsync();

        return Ok(new
        {
            totalUsers = users.Count,
            activeUsers = users.Count(u => u.Active),
            deactivatedUsers = users.Count(u => !u.Active),
            administrators = users.Count(u => u.Active && u.Role == ClaimsPrincipalExtensions.AdministratorRole),
            usersWithoutPassword = users.Count(u => u.Active && !u.HasPassword),
            activeSessions = await _db.UserSessions.CountAsync(s => s.ExpiresAt > now),
            recentLogins = users
                .Where(u => u.LastLoginAt != null)
                .OrderByDescending(u => u.LastLoginAt)
                .Take(8)
                .Select(u => new { u.Id, u.DisplayName, u.EmailAddress, u.AvatarUrl, u.Role, u.LastLoginAt })
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var now = DateTime.UtcNow;
        var sessionCounts = await _db.UserSessions
            .Where(s => s.ExpiresAt > now)
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

        var users = await _db.AppUsers.OrderBy(u => u.DisplayName).ToListAsync();
        return Ok(users.Select(u => ToAdminUser(u, sessionCounts.GetValueOrDefault(u.Id))));
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] AdminCreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.DisplayName) || string.IsNullOrWhiteSpace(dto.EmailAddress))
            return BadRequest(new { message = "Full name and email address are required." });

        var policyError = CredentialValidator.ValidatePasswordPolicy(dto.Password);
        if (policyError != null) return BadRequest(new { message = policyError });

        var username = string.IsNullOrWhiteSpace(dto.Name)
            ? dto.EmailAddress.Trim().Split('@')[0].ToLower()
            : dto.Name.Trim().ToLower();

        var conflict = await FindLoginConflictAsync(null, username, dto.EmailAddress.Trim());
        if (conflict != null) return Conflict(new { message = conflict });

        var user = new AppUser
        {
            AccountId = "usr-" + Guid.NewGuid().ToString("N")[..8],
            Name = username,
            DisplayName = dto.DisplayName.Trim(),
            EmailAddress = dto.EmailAddress.Trim(),
            Role = string.IsNullOrWhiteSpace(dto.Role) ? "Developer" : dto.Role,
            Department = dto.Department,
            JobTitle = dto.JobTitle,
            AvatarUrl = $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(dto.DisplayName.Trim())}&background=0052cc&color=fff",
            Active = true,
            CreatedAt = DateTime.UtcNow
        };
        _credentials.SetPassword(user, dto.Password);

        _db.AppUsers.Add(user);
        await _db.SaveChangesAsync();
        return Ok(ToAdminUser(user, 0));
    }

    [HttpPut("users/{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] AdminUpdateUserDto dto)
    {
        var user = await _db.AppUsers.FindAsync(id);
        if (user == null) return NotFound();

        var accessError = await AdminGuard.CheckAccessChangeAsync(_db, User, user, dto.Role, dto.Active);
        if (accessError != null) return BadRequest(new { message = accessError });

        var newUsername = string.IsNullOrWhiteSpace(dto.Name) ? null : dto.Name.Trim().ToLower();
        var newEmail = string.IsNullOrWhiteSpace(dto.EmailAddress) ? null : dto.EmailAddress.Trim();
        if (string.Equals(newUsername, user.Name, StringComparison.OrdinalIgnoreCase)) newUsername = null;
        if (string.Equals(newEmail, user.EmailAddress, StringComparison.OrdinalIgnoreCase)) newEmail = null;

        var conflict = await FindLoginConflictAsync(user.Id, newUsername, newEmail);
        if (conflict != null) return Conflict(new { message = conflict });

        if (newUsername != null) user.Name = newUsername;
        if (newEmail != null) user.EmailAddress = newEmail;
        if (!string.IsNullOrWhiteSpace(dto.DisplayName)) user.DisplayName = dto.DisplayName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Role)) user.Role = dto.Role;
        if (dto.Department != null) user.Department = dto.Department;
        if (dto.JobTitle != null) user.JobTitle = dto.JobTitle;
        if (dto.Active.HasValue) user.Active = dto.Active.Value;

        await _db.SaveChangesAsync();

        if (!user.Active)
            await _db.UserSessions.Where(s => s.UserId == user.Id).ExecuteDeleteAsync();

        return Ok(ToAdminUser(user, await CountActiveSessionsAsync(user.Id)));
    }

    [HttpPost("users/{id:int}/password")]
    public async Task<IActionResult> SetPassword(int id, [FromBody] AdminSetPasswordDto dto)
    {
        var user = await _db.AppUsers.FindAsync(id);
        if (user == null) return NotFound();

        var policyError = CredentialValidator.ValidatePasswordPolicy(dto.Password);
        if (policyError != null) return BadRequest(new { message = policyError });

        _credentials.SetPassword(user, dto.Password);
        await _db.SaveChangesAsync();
        await SignOutAsync(user.Id);

        return Ok(ToAdminUser(user, await CountActiveSessionsAsync(user.Id)));
    }

    [HttpPost("users/{id:int}/sign-out")]
    public async Task<IActionResult> SignOutUser(int id)
    {
        if (!await _db.AppUsers.AnyAsync(u => u.Id == id)) return NotFound();
        await SignOutAsync(id);
        return NoContent();
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions()
    {
        var now = DateTime.UtcNow;
        var currentSessionId = User.GetSessionId();

        var sessions = await _db.UserSessions
            .Include(s => s.User)
            .Where(s => s.ExpiresAt > now)
            .OrderByDescending(s => s.LastSeenAt)
            .ToListAsync();

        return Ok(sessions.Select(s => new
        {
            s.Id,
            s.UserId,
            s.User!.DisplayName,
            s.User.EmailAddress,
            s.User.AvatarUrl,
            s.User.Role,
            s.CreatedAt,
            s.LastSeenAt,
            s.ExpiresAt,
            s.IpAddress,
            s.UserAgent,
            isCurrent = s.Id == currentSessionId
        }));
    }

    [HttpDelete("sessions/{id:int}")]
    public async Task<IActionResult> RevokeSession(int id)
    {
        var deleted = await _db.UserSessions.Where(s => s.Id == id).ExecuteDeleteAsync();
        return deleted == 0 ? NotFound() : NoContent();
    }

    // Signs the user out everywhere, except the admin's own current session
    private Task<int> SignOutAsync(int userId)
    {
        var currentSessionId = User.GetSessionId() ?? 0;
        return _db.UserSessions
            .Where(s => s.UserId == userId && s.Id != currentSessionId)
            .ExecuteDeleteAsync();
    }

    private Task<int> CountActiveSessionsAsync(int userId)
    {
        var now = DateTime.UtcNow;
        return _db.UserSessions.CountAsync(s => s.UserId == userId && s.ExpiresAt > now);
    }

    // Checks only the values given (null = unchanged) against every other user
    private async Task<string?> FindLoginConflictAsync(int? userId, string? username, string? email)
    {
        if (username != null &&
            await _db.AppUsers.AnyAsync(u => u.Id != userId && u.Name.ToLower() == username))
            return $"The username '{username}' is already taken.";

        var lowerEmail = email?.ToLower();
        if (lowerEmail != null &&
            await _db.AppUsers.AnyAsync(u => u.Id != userId && u.EmailAddress.ToLower() == lowerEmail))
            return $"A user with the email '{email}' already exists.";

        return null;
    }

    private static object ToAdminUser(AppUser u, int activeSessions) => new
    {
        u.Id,
        u.AccountId,
        u.Name,
        u.DisplayName,
        u.EmailAddress,
        u.AvatarUrl,
        u.Active,
        u.Role,
        u.UserType,
        u.Department,
        u.JobTitle,
        u.CreatedAt,
        u.LastLoginAt,
        u.HasPassword,
        activeSessions
    };
}
