using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using JiraClone.Api.Auth;
using JiraClone.Api.Models;

namespace JiraClone.Api.Data;

public static class AdminSeeder
{
    /// <summary>
    /// Makes sure the built-in admin account exists and can sign in. The password comes from
    /// Admin:Password (env: Admin__Password); without it a random one is generated and logged once.
    /// An existing admin password is never overwritten.
    /// </summary>
    public static async Task EnsureAdminAsync(AppDbContext db, CredentialValidator credentials, IConfiguration config)
    {
        var username = config["Admin:Username"] ?? "admin";
        var admin = await db.AppUsers.FirstOrDefaultAsync(u => u.Name == username);
        if (admin?.PasswordHash != null) return;

        var password = config["Admin:Password"];
        var generated = string.IsNullOrWhiteSpace(password);
        if (generated) password = SessionTokens.GeneratePassword();

        if (admin == null)
        {
            admin = new AppUser
            {
                AccountId = "usr-" + username,
                Name = username,
                DisplayName = "Administrator",
                EmailAddress = config["Admin:Email"] ?? "admin@jira.local",
                UserType = "Internal",
                Department = "IT",
                JobTitle = "Site Administrator",
                GroupsJson = "[\"jira-administrators\",\"jira-software-users\"]",
                AvatarUrl = "https://ui-avatars.com/api/?name=Administrator&background=403294&color=fff",
                CreatedAt = DateTime.UtcNow
            };
            db.AppUsers.Add(admin);
        }

        admin.Role = ClaimsPrincipalExtensions.AdministratorRole;
        admin.Active = true;
        credentials.SetPassword(admin, password!);
        await db.SaveChangesAsync();

        Console.WriteLine(generated
            ? $"[Auth] Admin account '{username}' is ready. Generated password: {password} (change it after signing in)"
            : $"[Auth] Admin account '{username}' is ready (password from configuration).");
    }
}
