using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace JiraClone.Api.Models;

public static class SmtpSecurity
{
    public const string StartTls = "StartTls";         // usually port 587
    public const string SslOnConnect = "SslOnConnect"; // usually port 465
    public const string None = "None";                 // usually port 25

    public static readonly string[] All = { StartTls, SslOnConnect, None };
}

/// <summary>Outgoing mail server, configured by administrators. A single row.</summary>
public class SmtpSettings
{
    public int Id { get; set; }
    public bool IsEnabled { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Security { get; set; } = SmtpSecurity.StartTls;
    public string? Username { get; set; }
    public string? EncryptedPassword { get; set; } // ASP.NET Data Protection; never returned by the API
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "Jira";
    public string SiteUrl { get; set; } = string.Empty; // public URL of the web app, used for links in emails
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? UpdatedBy { get; set; }

    [NotMapped]
    public bool IsReady =>
        IsEnabled &&
        !string.IsNullOrWhiteSpace(Host) &&
        !string.IsNullOrWhiteSpace(FromAddress) &&
        !string.IsNullOrWhiteSpace(SiteUrl);
}
