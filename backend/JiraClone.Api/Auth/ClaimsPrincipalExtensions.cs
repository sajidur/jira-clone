using System.Security.Claims;

namespace JiraClone.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    public const string SessionIdClaim = "session_id";
    public const string AdministratorRole = "Administrator";

    public static int? GetUserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static int? GetSessionId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(SessionIdClaim), out var id) ? id : null;

    public static string GetDisplayName(this ClaimsPrincipal user) =>
        user.Identity?.Name ?? "System";
}
