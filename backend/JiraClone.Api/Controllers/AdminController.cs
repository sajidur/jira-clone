using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Auth;
using JiraClone.Api.Data;
using JiraClone.Api.Models;
using JiraClone.Api.Services.Email;
using MimeKit;

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

public class AdminPasswordEmailDto
{
    public string Purpose { get; set; } = PasswordResetPurpose.Reset; // "reset" or "invite"
}

public class SmtpSettingsDto
{
    public bool IsEnabled { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Security { get; set; } = SmtpSecurity.StartTls;
    public string? Username { get; set; }
    public string? Password { get; set; } // null or empty keeps the saved password
    public bool ClearPassword { get; set; }
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "Jira";
    public string SiteUrl { get; set; } = string.Empty;
}

public class SmtpTestDto : SmtpSettingsDto
{
    public string To { get; set; } = string.Empty;
}

[ApiController]
[Route("api/admin")]
[Authorize(Roles = ClaimsPrincipalExtensions.AdministratorRole)]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly CredentialValidator _credentials;
    private readonly EmailService _email;
    private readonly PasswordResetService _passwordResets;

    public AdminController(AppDbContext db, CredentialValidator credentials, EmailService email,
        PasswordResetService passwordResets)
    {
        _db = db;
        _credentials = credentials;
        _email = email;
        _passwordResets = passwordResets;
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

    [HttpPost("users/{id:int}/password-email")]
    public async Task<IActionResult> SendPasswordEmail(int id, [FromBody] AdminPasswordEmailDto dto)
    {
        var user = await _db.AppUsers.FindAsync(id);
        if (user == null) return NotFound();
        if (!user.Active) return BadRequest(new { message = "Reactivate this user before sending them an email." });
        if (!MailboxAddress.TryParse(user.EmailAddress, out _))
            return BadRequest(new { message = $"{user.DisplayName} doesn't have a valid email address." });

        var settings = await _email.GetSettingsAsync();
        if (!settings.IsReady)
            return BadRequest(new { message = "Set up outgoing email in Administration → Email first." });

        var purpose = dto.Purpose == PasswordResetPurpose.Invite ? PasswordResetPurpose.Invite : PasswordResetPurpose.Reset;
        var message = await _passwordResets.CreateEmailAsync(user, purpose, settings.SiteUrl,
            HttpContext.Connection.RemoteIpAddress?.ToString(), enforceCooldown: false);

        try
        {
            await _email.SendWithSavedSettingsAsync(message!, HttpContext.RequestAborted);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = EmailService.DescribeFailure(ex) });
        }

        return Ok(new { message = $"Email sent to {user.EmailAddress}." });
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

    [HttpGet("smtp")]
    public async Task<IActionResult> GetSmtpSettings() => Ok(ToSmtpResponse(await _email.GetSettingsAsync()));

    [HttpPut("smtp")]
    public async Task<IActionResult> SaveSmtpSettings([FromBody] SmtpSettingsDto dto)
    {
        var error = ValidateSmtp(dto, requireComplete: dto.IsEnabled, requireSiteUrl: dto.IsEnabled);
        if (error != null) return BadRequest(new { message = error });

        var settings = await _db.SmtpSettings.OrderBy(s => s.Id).FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new SmtpSettings();
            _db.SmtpSettings.Add(settings);
        }

        ApplySmtp(settings, dto);
        if (dto.ClearPassword) settings.EncryptedPassword = null;
        else if (!string.IsNullOrEmpty(dto.Password)) settings.EncryptedPassword = _email.ProtectPassword(dto.Password);
        settings.UpdatedAt = DateTime.UtcNow;
        settings.UpdatedBy = User.GetDisplayName();

        await _db.SaveChangesAsync();
        return Ok(ToSmtpResponse(settings));
    }

    /// <summary>Sends a test email with the submitted (possibly unsaved) settings.</summary>
    [HttpPost("smtp/test")]
    public async Task<IActionResult> TestSmtpSettings([FromBody] SmtpTestDto dto)
    {
        if (!MailboxAddress.TryParse(dto.To, out _))
            return BadRequest(new { message = "Enter a valid recipient email address." });

        var error = ValidateSmtp(dto, requireComplete: true, requireSiteUrl: false);
        if (error != null) return BadRequest(new { message = error });

        var saved = await _email.GetSettingsAsync();
        var settings = new SmtpSettings();
        ApplySmtp(settings, dto);

        var password = dto.ClearPassword ? null
            : !string.IsNullOrEmpty(dto.Password) ? dto.Password
            : _email.TryUnprotectPassword(saved);

        try
        {
            await EmailService.SendAsync(settings, password, EmailTemplates.Test(dto.To.Trim(), settings.SiteUrl),
                HttpContext.RequestAborted);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = EmailService.DescribeFailure(ex) });
        }

        return Ok(new { message = $"Test email sent to {dto.To.Trim()}." });
    }

    private static string? ValidateSmtp(SmtpSettingsDto dto, bool requireComplete, bool requireSiteUrl)
    {
        if (!requireComplete) return null;

        if (string.IsNullOrWhiteSpace(dto.Host)) return "Enter the SMTP server host.";
        if (dto.Port is < 1 or > 65535) return "Enter a port between 1 and 65535.";
        if (!SmtpSecurity.All.Contains(dto.Security)) return "Choose a valid connection security option.";
        if (!MailboxAddress.TryParse(dto.FromAddress, out _)) return "Enter a valid sender (From) email address.";
        if (requireSiteUrl &&
            !(Uri.TryCreate(dto.SiteUrl?.Trim(), UriKind.Absolute, out var uri) && (uri.Scheme == "http" || uri.Scheme == "https")))
            return "Enter the Jira site URL people open in their browser, e.g. http://194.233.85.194:3001";
        return null;
    }

    private static void ApplySmtp(SmtpSettings settings, SmtpSettingsDto dto)
    {
        settings.IsEnabled = dto.IsEnabled;
        settings.Host = dto.Host?.Trim() ?? string.Empty;
        settings.Port = dto.Port;
        settings.Security = SmtpSecurity.All.Contains(dto.Security) ? dto.Security : SmtpSecurity.StartTls;
        settings.Username = string.IsNullOrWhiteSpace(dto.Username) ? null : dto.Username.Trim();
        settings.FromAddress = dto.FromAddress?.Trim() ?? string.Empty;
        settings.FromName = string.IsNullOrWhiteSpace(dto.FromName) ? "Jira" : dto.FromName.Trim();
        settings.SiteUrl = dto.SiteUrl?.Trim().TrimEnd('/') ?? string.Empty;
    }

    private object ToSmtpResponse(SmtpSettings s) => new
    {
        s.IsEnabled,
        s.Host,
        s.Port,
        s.Security,
        s.Username,
        hasPassword = s.EncryptedPassword != null,
        passwordUnreadable = s.EncryptedPassword != null && _email.TryUnprotectPassword(s) == null,
        s.FromAddress,
        s.FromName,
        s.SiteUrl,
        isReady = s.IsReady,
        updatedAt = s.Id == 0 ? (DateTime?)null : s.UpdatedAt,
        s.UpdatedBy
    };

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
