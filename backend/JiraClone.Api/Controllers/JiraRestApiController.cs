using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Auth;
using JiraClone.Api.Data;
using JiraClone.Api.DTOs;
using JiraClone.Api.Services;

namespace JiraClone.Api.Controllers;

[ApiController]
[Route("rest/api/2")]
[Route("rest/api/3")]
public class JiraRestApiController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IJiraCompatibilityService _jiraService;
    private readonly IJqlEngineService _jqlEngine;

    public JiraRestApiController(AppDbContext db, IJiraCompatibilityService jiraService, IJqlEngineService jqlEngine)
    {
        _db = db;
        _jiraService = jiraService;
        _jqlEngine = jqlEngine;
    }

    [HttpGet("serverInfo")]
    public IActionResult GetServerInfo()
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        return Ok(new
        {
            baseUrl,
            version = "9.12.0",
            versionNumbers = new[] { 9, 12, 0 },
            deploymentType = "Server",
            buildNumber = 9120001,
            buildDate = DateTime.UtcNow.ToString("o"),
            serverTime = DateTime.UtcNow.ToString("o"),
            scmInfo = "Git",
            serverTitle = ".NET 10 Jira Clone Enterprise Server"
        });
    }

    [HttpGet("myself")]
    public async Task<IActionResult> GetMyself()
    {
        var user = await _db.AppUsers.FindAsync(User.GetUserId());
        if (user == null) return Unauthorized();

        var groups = JsonSerializer.Deserialize<string[]>(user.GroupsJson) ?? Array.Empty<string>();
        return Ok(new
        {
            self = $"{Request.Scheme}://{Request.Host}/rest/api/2/user?username={Uri.EscapeDataString(user.Name)}",
            name = user.Name,
            key = user.Name,
            accountId = user.AccountId,
            emailAddress = user.EmailAddress,
            displayName = user.DisplayName,
            active = user.Active,
            timeZone = user.TimeZone ?? "UTC",
            groups = new { size = groups.Length, items = groups.Select(g => new { name = g }) }
        });
    }

    [HttpGet("project")]
    public async Task<IActionResult> GetProjects()
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var projects = await _db.Projects.AsNoTracking().ToListAsync();

        var result = projects.Select(p => new
        {
            self = $"{baseUrl}/rest/api/2/project/{p.Key}",
            id = p.Id.ToString(),
            key = p.Key,
            name = p.Name,
            projectTypeKey = p.ProjectTypeKey ?? "software",
            simplified = true,
            lead = new
            {
                displayName = p.LeadName,
                name = p.LeadName.ToLower().Replace(" ", ".")
            }
        });

        return Ok(result);
    }

    [HttpGet("project/{key}")]
    public async Task<IActionResult> GetProjectByKey(string key)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var p = await _db.Projects.FirstOrDefaultAsync(pr => pr.Key.ToUpper() == key.ToUpper());
        if (p == null) return NotFound(new { errorMessages = new[] { $"Project '{key}' does not exist." } });

        return Ok(new
        {
            self = $"{baseUrl}/rest/api/2/project/{p.Key}",
            id = p.Id.ToString(),
            key = p.Key,
            name = p.Name,
            description = p.Description,
            lead = new { displayName = p.LeadName, key = p.LeadName.ToLower() },
            projectTypeKey = p.ProjectTypeKey ?? "software"
        });
    }

    [HttpGet("issue/{key}")]
    public async Task<IActionResult> GetIssueByKey(string key)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var export = await _jiraService.ExportJiraJsonAsync(null, baseUrl);
        var issue = export.Issues.FirstOrDefault(i => i.Key.Equals(key, StringComparison.OrdinalIgnoreCase) || i.Id == key);

        if (issue == null)
        {
            return NotFound(new { errorMessages = new[] { $"Issue Does Not Exist: '{key}'" }, errors = new { } });
        }

        return Ok(issue);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? jql = null, [FromQuery] int startAt = 0, [FromQuery] int maxResults = 50)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var jqlResult = await _jqlEngine.ExecuteJqlAsync(jql, null, startAt, maxResults);
        
        // Export matching issues to standard Jira REST format
        var matchingKeys = jqlResult.Issues.Select(i => i.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var export = await _jiraService.ExportJiraJsonAsync(null, baseUrl);
        var matchingIssues = export.Issues.Where(i => matchingKeys.Contains(i.Key)).ToList();

        return Ok(new
        {
            expand = "names,schema",
            startAt,
            maxResults,
            total = jqlResult.Total,
            issues = matchingIssues,
            parsedClauses = jqlResult.ParsedClauses,
            warningMessages = !string.IsNullOrEmpty(jqlResult.ErrorMessage) ? new[] { jqlResult.ErrorMessage } : Array.Empty<string>()
        });
    }

    [HttpPost("search")]
    public async Task<IActionResult> PostSearch([FromBody] JsonElement body)
    {
        var jql = body.TryGetProperty("jql", out var j) ? j.GetString() : null;
        var startAt = body.TryGetProperty("startAt", out var s) ? s.GetInt32() : 0;
        var maxResults = body.TryGetProperty("maxResults", out var m) ? m.GetInt32() : 50;
        return await Search(jql, startAt, maxResults);
    }

    [HttpPost("issue")]
    public async Task<IActionResult> CreateIssueJiraFormat([FromBody] JsonElement body)
    {
        try
        {
            using var ms = new System.IO.MemoryStream(System.Text.Encoding.UTF8.GetBytes(body.GetRawText()));
            var res = await _jiraService.ImportJiraJsonAsync(ms);
            if (res.Success && res.ImportedKeys.Count > 0)
            {
                var key = res.ImportedKeys[0];
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                return Created($"{baseUrl}/rest/api/2/issue/{key}", new { id = "1000", key, self = $"{baseUrl}/rest/api/2/issue/{key}" });
            }
            return BadRequest(new { errorMessages = res.Warnings });
        }
        catch (Exception ex)
        {
            return BadRequest(new { errorMessages = new[] { ex.Message } });
        }
    }
}
