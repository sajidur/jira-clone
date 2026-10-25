using System;
using System.Security.Cryptography;
using System.Text;

namespace JiraClone.Api.Auth;

public static class SessionTokens
{
    public static string Create() => Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    public static string Hash(string token) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public static string GeneratePassword()
    {
        // Unambiguous characters only, so the password can be read off a log line or screen
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        return RandomNumberGenerator.GetString(alphabet, 16);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
