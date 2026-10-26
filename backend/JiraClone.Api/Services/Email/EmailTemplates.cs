using System;
using System.Net;
using JiraClone.Api.Models;

namespace JiraClone.Api.Services.Email;

public static class EmailTemplates
{
    public static EmailMessage PasswordReset(AppUser user, string link, TimeSpan validFor) => Build(
        to: user.EmailAddress,
        subject: "Reset your Jira password",
        heading: "Reset your password",
        intro: $"We received a request to reset the password for {user.EmailAddress}. Click the button below to choose a new one.",
        buttonText: "Reset password",
        link: link,
        footnote: $"This link expires in {Describe(validFor)} and can only be used once. If you didn't ask to reset your password, you can ignore this email — your password won't change.");

    public static EmailMessage Invite(AppUser user, string link, TimeSpan validFor) => Build(
        to: user.EmailAddress,
        subject: "You've been invited to Jira",
        heading: $"Welcome to Jira, {user.DisplayName}",
        intro: $"An administrator created a Jira account for you. You can log in with {user.EmailAddress} or the username @{user.Name} once you've chosen a password.",
        buttonText: "Choose your password",
        link: link,
        footnote: $"This link expires in {Describe(validFor)} and can only be used once.");

    public static EmailMessage Test(string to, string? siteUrl) => Build(
        to: to,
        subject: "Jira test email",
        heading: "Your email settings work",
        intro: "This is a test message from Jira. If you can read it, outgoing email is configured correctly and password reset emails will be delivered.",
        buttonText: string.IsNullOrWhiteSpace(siteUrl) ? null : "Open Jira",
        link: siteUrl,
        footnote: "You received this because an administrator sent a test email from Administration → Email.");

    private static EmailMessage Build(string to, string subject, string heading, string intro,
        string? buttonText, string? link, string footnote)
    {
        static string E(string value) => WebUtility.HtmlEncode(value);

        var button = buttonText == null || link == null
            ? string.Empty
            : $"""
              <tr><td style="padding:8px 0 24px">
                <a href="{E(link)}" style="display:inline-block;background:#0052CC;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:3px">{E(buttonText)}</a>
              </td></tr>
              <tr><td style="padding:0 0 24px;font-size:12px;color:#5E6C84;line-height:18px">
                Button not working? Paste this link into your browser:<br>
                <a href="{E(link)}" style="color:#0052CC;word-break:break-all">{E(link)}</a>
              </td></tr>
              """;

        var html = $"""
            <!doctype html>
            <html><body style="margin:0;padding:0;background:#F4F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;padding:32px 16px">
                <tr><td align="center">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:3px;box-shadow:0 1px 2px rgba(9,30,66,0.25)">
                    <tr><td style="padding:24px 32px 0;font-size:22px;font-weight:700;color:#0052CC;letter-spacing:-0.3px">Jira</td></tr>
                    <tr><td style="padding:16px 32px 0">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr><td style="padding:0 0 12px;font-size:20px;font-weight:600;color:#172B4D">{E(heading)}</td></tr>
                        <tr><td style="padding:0 0 20px;font-size:14px;color:#172B4D;line-height:22px">{E(intro)}</td></tr>
                        {button}
                        <tr><td style="padding:0 0 28px;font-size:12px;color:#5E6C84;line-height:18px">{E(footnote)}</td></tr>
                      </table>
                    </td></tr>
                  </table>
                  <div style="padding-top:16px;font-size:11px;color:#7A869A">Sent by Jira</div>
                </td></tr>
              </table>
            </body></html>
            """;

        var text = $"{heading}\n\n{intro}\n\n" +
                   (link != null && buttonText != null ? $"{buttonText}: {link}\n\n" : string.Empty) +
                   footnote;

        return new EmailMessage(to, subject, html, text);
    }

    private static string Describe(TimeSpan span) =>
        span.TotalDays >= 1 ? $"{span.TotalDays:0} day{(span.TotalDays >= 2 ? "s" : "")}"
        : span.TotalHours >= 1 ? $"{span.TotalHours:0} hour{(span.TotalHours >= 2 ? "s" : "")}"
        : $"{span.TotalMinutes:0} minutes";
}
