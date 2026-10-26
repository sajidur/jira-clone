using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Auth;
using JiraClone.Api.Data;
using JiraClone.Api.Models;
using JiraClone.Api.Services.Email;

namespace JiraClone.Api.Controllers;

public class LoginDto
{
    public string Username { get; set; } = string.Empty; // username or email address
    public string Password { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class ForgotPasswordDto
{
    public string Email { get; set; } = string.Empty; // email address or username
}

public class ResetPasswordDto
{
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    public const string LoginRateLimitPolicy = "login";
    public const string PasswordResetRateLimitPolicy = "password-reset";

    private static readonly TimeSpan SessionLifetime = TimeSpan.FromHours(12);
    private static readonly TimeSpan RememberedSessionLifetime = TimeSpan.FromDays(30);

    private readonly AppDbContext _db;
    private readonly CredentialValidator _credentials;
    private readonly PasswordResetService _passwordResets;
    private readonly EmailService _email;
    private readonly EmailQueue _emailQueue;

    public AuthController(AppDbContext db, CredentialValidator credentials, PasswordResetService passwordResets,
        EmailService email, EmailQueue emailQueue)
    {
        _db = db;
        _credentials = credentials;
        _passwordResets = passwordResets;
        _email = email;
        _emailQueue = emailQueue;
    }

    [AllowAnonymous]
    [EnableRateLimiting(LoginRateLimitPolicy)]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrEmpty(dto.Password))
            return BadRequest(new { message = "Enter your email or username and your password." });

        var user = await _credentials.ValidateAsync(dto.Username, dto.Password);
        if (user == null)
            return Unauthorized(new { message = "Incorrect email address or username and / or password." });

        var now = DateTime.UtcNow;
        var token = SessionTokens.Create();
        var userAgent = Request.Headers.UserAgent.ToString();
        var session = new UserSession
        {
            UserId = user.Id,
            TokenHash = SessionTokens.Hash(token),
            CreatedAt = now,
            LastSeenAt = now,
            ExpiresAt = now + (dto.RememberMe ? RememberedSessionLifetime : SessionLifetime),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = userAgent.Length > 300 ? userAgent[..300] : userAgent
        };

        _db.UserSessions.Add(session);
        user.LastLoginAt = now;
        await _db.SaveChangesAsync();

        await _db.UserSessions.Where(s => s.ExpiresAt < now).ExecuteDeleteAsync();

        return Ok(new { token, expiresAt = session.ExpiresAt, user });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _db.AppUsers.FindAsync(User.GetUserId());
        return user == null ? Unauthorized() : Ok(user);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var sessionId = User.GetSessionId();
        if (sessionId.HasValue)
            await _db.UserSessions.Where(s => s.Id == sessionId.Value).ExecuteDeleteAsync();
        return NoContent();
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var user = await _db.AppUsers.FindAsync(User.GetUserId());
        if (user == null) return Unauthorized();

        if (!_credentials.VerifyPassword(user, dto.CurrentPassword))
            return BadRequest(new { message = "Your current password is incorrect." });

        var policyError = CredentialValidator.ValidatePasswordPolicy(dto.NewPassword);
        if (policyError != null) return BadRequest(new { message = policyError });

        _credentials.SetPassword(user, dto.NewPassword);
        await _db.SaveChangesAsync();

        // Sign out every other session for this account
        var currentSessionId = User.GetSessionId() ?? 0;
        await _db.UserSessions
            .Where(s => s.UserId == user.Id && s.Id != currentSessionId)
            .ExecuteDeleteAsync();

        return NoContent();
    }

    [AllowAnonymous]
    [EnableRateLimiting(PasswordResetRateLimitPolicy)]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Enter your email address." });

        var settings = await _email.GetSettingsAsync();
        if (!settings.IsReady)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Password reset by email isn't set up on this site yet. Ask your Jira administrator to reset your password."
            });

        var login = dto.Email.Trim().ToLower();
        var users = await _db.AppUsers
            .Where(u => u.Active && u.EmailAddress != "" &&
                        (u.EmailAddress.ToLower() == login || u.Name.ToLower() == login))
            .ToListAsync();

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        foreach (var user in users)
        {
            var email = await _passwordResets.CreateEmailAsync(user, PasswordResetPurpose.Reset, settings.SiteUrl, ip, enforceCooldown: true);
            if (email != null) _emailQueue.Enqueue(email);
        }

        // Same answer whether or not the account exists
        return Ok(new { message = "If an account exists for that email, we've sent a recovery link to it." });
    }

    [AllowAnonymous]
    [HttpGet("reset-password")]
    public async Task<IActionResult> ValidateResetToken([FromQuery] string? token)
    {
        var reset = await _passwordResets.FindValidAsync(token);
        if (reset == null)
            return NotFound(new { message = "This link is invalid, has expired, or has already been used." });

        return Ok(new
        {
            email = reset.User!.EmailAddress,
            displayName = reset.User.DisplayName,
            purpose = reset.Purpose,
            expiresAt = reset.ExpiresAt
        });
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var reset = await _passwordResets.FindValidAsync(dto.Token);
        if (reset == null)
            return NotFound(new { message = "This link is invalid, has expired, or has already been used." });

        var policyError = CredentialValidator.ValidatePasswordPolicy(dto.NewPassword);
        if (policyError != null) return BadRequest(new { message = policyError });

        _credentials.SetPassword(reset.User!, dto.NewPassword);
        reset.UsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // A reset means the old password may be compromised: sign out everywhere
        await _db.UserSessions.Where(s => s.UserId == reset.UserId).ExecuteDeleteAsync();

        return Ok(new { message = "Your password has been changed.", email = reset.User!.EmailAddress });
    }
}
