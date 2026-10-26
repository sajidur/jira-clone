using System;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MimeKit;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Services.Email;

public record EmailMessage(string To, string Subject, string HtmlBody, string TextBody);

public class EmailService
{
    private const string PasswordProtectorPurpose = "JiraClone.SmtpSettings.Password";

    private readonly AppDbContext _db;
    private readonly IDataProtector _protector;
    private readonly ILogger<EmailService> _logger;

    public EmailService(AppDbContext db, IDataProtectionProvider dataProtection, ILogger<EmailService> logger)
    {
        _db = db;
        _protector = dataProtection.CreateProtector(PasswordProtectorPurpose);
        _logger = logger;
    }

    /// <summary>The saved settings, or unsaved defaults when email has never been configured.</summary>
    public async Task<SmtpSettings> GetSettingsAsync() =>
        await _db.SmtpSettings.OrderBy(s => s.Id).FirstOrDefaultAsync() ?? new SmtpSettings();

    public string ProtectPassword(string password) => _protector.Protect(password);

    /// <summary>Decrypts the saved password; null when none is saved or it can't be decrypted.</summary>
    public string? TryUnprotectPassword(SmtpSettings settings)
    {
        if (string.IsNullOrEmpty(settings.EncryptedPassword)) return null;
        try
        {
            return _protector.Unprotect(settings.EncryptedPassword);
        }
        catch (CryptographicException ex)
        {
            _logger.LogWarning(ex, "The saved SMTP password could not be decrypted");
            return null;
        }
    }

    /// <summary>Sends with the saved settings. Throws when email isn't set up or the server rejects the message.</summary>
    public async Task SendWithSavedSettingsAsync(EmailMessage email, CancellationToken cancellationToken = default)
    {
        var settings = await GetSettingsAsync();
        if (!settings.IsReady)
            throw new InvalidOperationException("Outgoing email isn't set up. Configure it in Administration → Email.");

        var password = TryUnprotectPassword(settings);
        if (password == null && settings.EncryptedPassword != null)
            throw new InvalidOperationException("The saved SMTP password can't be read on this server. Re-enter it in Administration → Email.");

        await SendAsync(settings, password, email, cancellationToken);
    }

    public static async Task SendAsync(SmtpSettings settings, string? password, EmailMessage email, CancellationToken cancellationToken = default)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress));
        message.To.Add(MailboxAddress.Parse(email.To));
        message.Subject = email.Subject;
        message.Body = new BodyBuilder { HtmlBody = email.HtmlBody, TextBody = email.TextBody }.ToMessageBody();

        var socketOptions = settings.Security switch
        {
            SmtpSecurity.SslOnConnect => SecureSocketOptions.SslOnConnect,
            SmtpSecurity.None => SecureSocketOptions.None,
            _ => SecureSocketOptions.StartTls
        };

        using var client = new SmtpClient { Timeout = 20000 };
        await client.ConnectAsync(settings.Host, settings.Port, socketOptions, cancellationToken);
        if (!string.IsNullOrEmpty(settings.Username))
            await client.AuthenticateAsync(settings.Username, password ?? string.Empty, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }

    /// <summary>Turns MailKit and socket failures into a message an administrator can act on.</summary>
    public static string DescribeFailure(Exception ex) => ex switch
    {
        AuthenticationException => "The mail server rejected the username or password.",
        SslHandshakeException => "Couldn't establish a secure connection. Check the security setting and port (STARTTLS is usually 587, SSL/TLS 465).",
        System.Net.Sockets.SocketException => $"Couldn't connect to the mail server: {ex.Message}",
        TimeoutException or OperationCanceledException => "The mail server didn't respond in time. Check the host and port.",
        SmtpCommandException smtp => $"The mail server refused the message: {smtp.Message}",
        SmtpProtocolException => $"The mail server returned an unexpected response: {ex.Message}",
        _ => ex.Message
    };
}
