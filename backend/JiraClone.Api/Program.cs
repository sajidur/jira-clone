using System;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using JiraClone.Api.Auth;
using JiraClone.Api.Controllers;
using JiraClone.Api.Data;
using JiraClone.Api.Models;
using JiraClone.Api.Services;

// Enable Npgsql legacy timestamp behavior so Unspecified DateTimes do not throw exceptions
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Add Database Context with PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: System.TimeSpan.FromSeconds(5), errorCodesToAdd: null);
    });
});

// Add DI Services
builder.Services.AddScoped<IJiraCompatibilityService, JiraCompatibilityService>();
builder.Services.AddScoped<IJqlEngineService, JqlEngineService>();
builder.Services.AddHttpContextAccessor();

// Authentication: session tokens from /api/auth/login (Bearer) or Basic credentials for REST clients
builder.Services.AddSingleton<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
builder.Services.AddScoped<CredentialValidator>();
builder.Services.AddAuthentication(SessionAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(SessionAuthenticationHandler.SchemeName, null);
builder.Services.AddAuthorization(options =>
{
    // Every endpoint requires a signed-in user unless it is marked [AllowAnonymous]
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

// Slow down password guessing: login attempts and Basic-auth requests are limited per client IP
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(AuthController.LoginRateLimitPolicy, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            "login:" + context.Connection.RemoteIpAddress,
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        context.Request.Headers.Authorization.ToString().StartsWith("Basic ", StringComparison.OrdinalIgnoreCase)
            ? RateLimitPartition.GetFixedWindowLimiter(
                "basic:" + context.Connection.RemoteIpAddress,
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 60, Window = TimeSpan.FromMinutes(1) })
            : RateLimitPartition.GetNoLimiter(string.Empty));
});

// Add Controllers with JSON serialization configuration
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// Enable CORS for Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true) // allow localhost:3000 and any dev port
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Add OpenAPI / Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Jira Clone API (.NET 10 + PostgreSQL)", Version = "v1" });
});

var app = builder.Build();

// Run DB Initializer / Schema Creation
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await DbInitializer.InitializeAsync(db);
        Console.WriteLine("[DB Initializer] PostgreSQL connected and initialized successfully.");

        var credentials = scope.ServiceProvider.GetRequiredService<CredentialValidator>();
        await AdminSeeder.EnsureAdminAsync(db, credentials, app.Configuration);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DB Initializer Error] {ex.Message}");
    }
}

// Configure HTTP pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Jira Clone API v1");
    });
}

app.UseCors("AllowFrontend");

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
