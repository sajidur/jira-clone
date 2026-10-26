using System;

namespace JiraClone.Api.Models;

public static class PasswordResetPurpose
{
    public const string Reset = "reset";   // "Forgot password" or an admin-sent reset
    public const string Invite = "invite"; // new account: the user chooses their first password
}

public class PasswordResetToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty; // SHA-256 of the emailed token
    public string Purpose { get; set; } = PasswordResetPurpose.Reset;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public string? RequestedIp { get; set; }

    public AppUser? User { get; set; }
}
