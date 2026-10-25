using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Auth;

public class CredentialValidator
{
    public const int MinPasswordLength = 8;

    private readonly AppDbContext _db;
    private readonly IPasswordHasher<AppUser> _hasher;

    public CredentialValidator(AppDbContext db, IPasswordHasher<AppUser> hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    public static string? ValidatePasswordPolicy(string? password) =>
        string.IsNullOrEmpty(password) || password.Length < MinPasswordLength
            ? $"Password must be at least {MinPasswordLength} characters."
            : null;

    /// <summary>Returns the active user matching the username or email and password, or null.</summary>
    public async Task<AppUser?> ValidateAsync(string login, string password)
    {
        var normalized = login.Trim().ToLower();
        var candidates = await _db.AppUsers
            .Where(u => u.Active && u.PasswordHash != null &&
                        (u.Name.ToLower() == normalized || u.EmailAddress.ToLower() == normalized))
            .ToListAsync();

        foreach (var user in candidates)
        {
            var result = _hasher.VerifyHashedPassword(user, user.PasswordHash!, password);
            if (result == PasswordVerificationResult.Failed) continue;

            if (result == PasswordVerificationResult.SuccessRehashNeeded)
            {
                user.PasswordHash = _hasher.HashPassword(user, password);
                await _db.SaveChangesAsync();
            }
            return user;
        }
        return null;
    }

    public void SetPassword(AppUser user, string password) =>
        user.PasswordHash = _hasher.HashPassword(user, password);

    public bool VerifyPassword(AppUser user, string password) =>
        user.PasswordHash != null &&
        _hasher.VerifyHashedPassword(user, user.PasswordHash, password) != PasswordVerificationResult.Failed;
}
