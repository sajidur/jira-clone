using System;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JiraClone.Api.Services.Email;

/// <summary>
/// Sends emails in the background, so requests such as "forgot password" respond in the same time
/// whether or not an email was sent (which would otherwise reveal whether an account exists).
/// </summary>
public class EmailQueue : BackgroundService
{
    private readonly Channel<EmailMessage> _channel = Channel.CreateUnbounded<EmailMessage>();
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailQueue> _logger;

    public EmailQueue(IServiceScopeFactory scopeFactory, ILogger<EmailQueue> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public void Enqueue(EmailMessage message) => _channel.Writer.TryWrite(message);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var email = scope.ServiceProvider.GetRequiredService<EmailService>();
                await email.SendWithSavedSettingsAsync(message, stoppingToken);
                _logger.LogInformation("Sent \"{Subject}\" to {To}", message.Subject, message.To);
            }
            catch (Exception ex) when (ex is not OperationCanceledException || !stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Failed to send \"{Subject}\" to {To}: {Reason}",
                    message.Subject, message.To, EmailService.DescribeFailure(ex));
            }
        }
    }
}
