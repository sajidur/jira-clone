using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Auth;

public static class AdminGuard
{
    /// <summary>
    /// Returns an error message when changing the target's role or active flag would remove the
    /// actor's own admin access or leave the site without an administrator who can sign in.
    /// </summary>
    public static async Task<string?> CheckAccessChangeAsync(
        AppDbContext db, ClaimsPrincipal actor, AppUser target, string? newRole, bool? newActive)
    {
        var isAdminNow = target.Active && target.Role == ClaimsPrincipalExtensions.AdministratorRole;
        var staysAdmin = (newActive ?? target.Active) && (newRole ?? target.Role) == ClaimsPrincipalExtensions.AdministratorRole;
        if (!isAdminNow || staysAdmin) return null;

        if (target.Id == actor.GetUserId())
            return "You can't remove your own administrator access.";

        var otherAdminExists = await db.AppUsers.AnyAsync(u =>
            u.Id != target.Id && u.Active && u.PasswordHash != null &&
            u.Role == ClaimsPrincipalExtensions.AdministratorRole);

        return otherAdminExists ? null : "At least one active administrator is required.";
    }
}
