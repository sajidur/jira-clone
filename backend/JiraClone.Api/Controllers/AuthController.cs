using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Auth;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

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

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    public const string LoginRateLimitPolicy = "login";

    private static readonly TimeSpan SessionLifetime = TimeSpan.FromHours(12);
    private static readonly TimeSpan RememberedSessionLifetime = TimeSpan.FromDays(30);

    private readonly AppDbContext _db;
    private readonly CredentialValidator _credentials;

    public AuthController(AppDbContext db, CredentialValidator credentials)
    {
        _db = db;
        _credentials = credentials;
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
}
