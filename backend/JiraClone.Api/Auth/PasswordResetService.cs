using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Data;
using JiraClone.Api.Models;
using JiraClone.Api.Services.Email;

namespace JiraClone.Api.Auth;

public class PasswordResetService
{
    public static readonly TimeSpan ResetLinkLifetime = TimeSpan.FromHours(1);
    public static readonly TimeSpan InviteLinkLifetime = TimeSpan.FromDays(3);

    // Stops "forgot password" from being used to flood someone's inbox
    private static readonly TimeSpan ResendCooldown = TimeSpan.FromMinutes(2);

    private readonly AppDbContext _db;

    public PasswordResetService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Issues a new single-use link for the user (older unused links stop working) and returns the
    /// email to send, or null when <paramref name="enforceCooldown"/> is set and one was sent recently.
    /// </summary>
    public async Task<EmailMessage?> CreateEmailAsync(AppUser user, string purpose, string siteUrl,
        string? requestedIp, bool enforceCooldown)
    {
        var now = DateTime.UtcNow;
        if (enforceCooldown)
        {
            var cooldownStart = now - ResendCooldown;
            if (await _db.PasswordResetTokens.AnyAsync(t => t.UserId == user.Id && t.CreatedAt > cooldownStart))
                return null;
        }

        await _db.PasswordResetTokens
            .Where(t => (t.UserId == user.Id && t.UsedAt == null) || t.ExpiresAt < now)
            .ExecuteDeleteAsync();

        var lifetime = purpose == PasswordResetPurpose.Invite ? InviteLinkLifetime : ResetLinkLifetime;
        var token = SessionTokens.Create();
        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = SessionTokens.Hash(token),
            Purpose = purpose,
            CreatedAt = now,
            ExpiresAt = now + lifetime,
            RequestedIp = requestedIp
        });
        await _db.SaveChangesAsync();

        var link = $"{siteUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(token)}";
        return purpose == PasswordResetPurpose.Invite
            ? EmailTemplates.Invite(user, link, lifetime)
            : EmailTemplates.PasswordReset(user, link, lifetime);
    }

    /// <summary>The unused, unexpired token for an active user, or null.</summary>
    public Task<PasswordResetToken?> FindValidAsync(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return Task.FromResult<PasswordResetToken?>(null);

        var hash = SessionTokens.Hash(token.Trim());
        var now = DateTime.UtcNow;
        return _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.UsedAt == null && t.ExpiresAt > now && t.User!.Active);
    }
}
