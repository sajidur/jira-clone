using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Auth;

/// <summary>
/// Authenticates requests with a session token (Authorization: Bearer) issued by /api/auth/login,
/// or with HTTP Basic credentials for Jira REST API clients.
/// </summary>
public class SessionAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Session";

    private readonly AppDbContext _db;
    private readonly CredentialValidator _credentials;

    public SessionAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AppDbContext db,
        CredentialValidator credentials) : base(options, logger, encoder)
    {
        _db = db;
        _credentials = credentials;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string? header = Request.Headers.Authorization;

        if (header != null && header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return await AuthenticateTokenAsync(header["Bearer ".Length..].Trim());

        if (header != null && header.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
            return await AuthenticateBasicAsync(header["Basic ".Length..].Trim());

        // File downloads (<a href>) can't send headers, so GET requests may carry the token in the query string
        if (HttpMethods.IsGet(Request.Method) && Request.Query.TryGetValue("access_token", out var queryToken))
            return await AuthenticateTokenAsync(queryToken.ToString());

        return AuthenticateResult.NoResult();
    }

    private async Task<AuthenticateResult> AuthenticateTokenAsync(string token)
    {
        if (string.IsNullOrEmpty(token)) return AuthenticateResult.Fail("Missing session token.");

        var hash = SessionTokens.Hash(token);
        var now = DateTime.UtcNow;
        var session = await _db.UserSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.TokenHash == hash && s.ExpiresAt > now);

        if (session?.User == null || !session.User.Active)
            return AuthenticateResult.Fail("Invalid or expired session.");

        // Throttle last-seen writes to one per minute per session
        if (now - session.LastSeenAt > TimeSpan.FromMinutes(1))
        {
            session.LastSeenAt = now;
            await _db.SaveChangesAsync();
        }

        return Success(session.User, session.Id);
    }

    private async Task<AuthenticateResult> AuthenticateBasicAsync(string encoded)
    {
        string decoded;
        try
        {
            decoded = Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
        }
        catch (FormatException)
        {
            return AuthenticateResult.Fail("Malformed Basic credentials.");
        }

        var separator = decoded.IndexOf(':');
        if (separator < 0) return AuthenticateResult.Fail("Malformed Basic credentials.");

        var user = await _credentials.ValidateAsync(decoded[..separator], decoded[(separator + 1)..]);
        return user == null ? AuthenticateResult.Fail("Invalid credentials.") : Success(user, null);
    }

    private AuthenticateResult Success(AppUser user, int? sessionId)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.DisplayName),
            new(ClaimTypes.Email, user.EmailAddress),
            new(ClaimTypes.Role, user.Role)
        };
        if (sessionId.HasValue)
            claims.Add(new Claim(ClaimsPrincipalExtensions.SessionIdClaim, sessionId.Value.ToString()));

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name));
        return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
    }
}
