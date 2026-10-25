using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Data;
using JiraClone.Api.Models;
using JiraClone.Api.Services;

namespace JiraClone.Api.Controllers;

public class JqlQueryDto
{
    public string? Jql { get; set; }
    public int? ProjectId { get; set; }
    public int StartAt { get; set; } = 0;
    public int MaxResults { get; set; } = 50;
}

public class CreateSavedFilterDto
{
    public string Name { get; set; } = string.Empty;
    public string Jql { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string OwnerName { get; set; } = "Sajidur Rahman";
    public bool IsFavorite { get; set; } = true;
}

[ApiController]
[Route("api/[controller]")]
public class JqlController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IJqlEngineService _jqlService;

    public JqlController(AppDbContext db, IJqlEngineService jqlService)
    {
        _db = db;
        _jqlService = jqlService;
    }

    [HttpPost("search")]
    public async Task<IActionResult> ExecuteSearch([FromBody] JqlQueryDto dto)
    {
        var result = await _jqlService.ExecuteJqlAsync(dto.Jql, dto.ProjectId, dto.StartAt, dto.MaxResults);
        return Ok(new
        {
            result.Jql,
            result.Total,
            result.ParsedClauses,
            result.ErrorMessage,
            Issues = result.Issues.Select(i => new
            {
                i.Id,
                i.Key,
                i.IssueNumber,
                i.ProjectId,
                ProjectKey = i.Project?.Key ?? "",
                ProjectName = i.Project?.Name ?? "",
                i.IssueType,
                i.Summary,
                i.Status,
                i.Priority,
                i.Resolution,
                i.AssigneeName,
                i.AssigneeAvatarUrl,
                i.ReporterName,
                i.StoryPoints,
                i.SprintId,
                SprintName = i.Sprint?.Name,
                i.FixVersion,
                i.DueDate,
                i.CreatedAt,
                i.UpdatedAt
            })
        });
    }

    [HttpGet("saved-filters")]
    public async Task<IActionResult> GetSavedFilters()
    {
        var filters = await _db.SavedFilters.OrderByDescending(f => f.IsFavorite).ThenBy(f => f.Name).ToListAsync();
        if (filters.Count == 0)
        {
            var defaultFilters = new List<SavedFilter>
            {
                new() { Name = "My Open Issues", Jql = "assignee = currentUser() AND resolution = EMPTY ORDER BY priority DESC", Description = "Issues assigned to me that are not yet resolved", OwnerName = "Sajidur Rahman", IsFavorite = true },
                new() { Name = "Reported by Me", Jql = "reporter = currentUser() ORDER BY created DESC", Description = "Issues I have created", OwnerName = "Sajidur Rahman", IsFavorite = true },
                new() { Name = "High Priority Bugs", Jql = "type = 'Bug' AND priority in ('Highest', 'High') AND resolution = EMPTY", Description = "Urgent defects requiring immediate attention", OwnerName = "Sajidur Rahman", IsFavorite = true },
                new() { Name = "Active Sprint Work", Jql = "sprint is not EMPTY AND status != 'Done' ORDER BY storypoints DESC", Description = "In-flight work items in active sprint", OwnerName = "Sajidur Rahman", IsFavorite = true },
                new() { Name = "Recently Resolved", Jql = "status = 'Done' ORDER BY updated DESC", Description = "Completed issues in reverse chronological order", OwnerName = "Sajidur Rahman", IsFavorite = false }
            };
            await _db.SavedFilters.AddRangeAsync(defaultFilters);
            await _db.SaveChangesAsync();
            return Ok(defaultFilters);
        }
        return Ok(filters);
    }

    [HttpPost("saved-filters")]
    public async Task<IActionResult> CreateSavedFilter([FromBody] CreateSavedFilterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Jql))
        {
            return BadRequest(new { message = "Filter name and JQL query are required." });
        }

        var filter = new SavedFilter
        {
            Name = dto.Name.Trim(),
            Jql = dto.Jql.Trim(),
            Description = dto.Description,
            OwnerName = dto.OwnerName,
            IsFavorite = dto.IsFavorite,
            CreatedAt = DateTime.UtcNow
        };

        _db.SavedFilters.Add(filter);
        await _db.SaveChangesAsync();
        return Ok(filter);
    }

    [HttpDelete("saved-filters/{id:int}")]
    public async Task<IActionResult> DeleteSavedFilter(int id)
    {
        var filter = await _db.SavedFilters.FindAsync(id);
        if (filter == null) return NotFound();

        _db.SavedFilters.Remove(filter);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("autocomplete")]
    public IActionResult GetAutocompleteKeywords()
    {
        var fields = new[]
        {
            new { name = "project", type = "string", example = "project = 'ERP'" },
            new { name = "status", type = "string", example = "status in ('In Progress', 'In Review')" },
            new { name = "priority", type = "string", example = "priority in ('Highest', 'High')" },
            new { name = "type", type = "string", example = "type = 'Bug'" },
            new { name = "assignee", type = "user", example = "assignee = currentUser()" },
            new { name = "reporter", type = "user", example = "reporter = 'Sarah Connor'" },
            new { name = "summary", type = "text", example = "summary ~ 'PostgreSQL'" },
            new { name = "text", type = "text", example = "text ~ 'architecture'" },
            new { name = "sprint", type = "number", example = "sprint is not EMPTY" },
            new { name = "resolution", type = "string", example = "resolution = EMPTY" },
            new { name = "fixVersion", type = "string", example = "fixVersion = 'v1.1.0'" },
            new { name = "storyPoints", type = "number", example = "storyPoints >= 5" }
        };

        var operators = new[] { "=", "!=", "in", "not in", "~", "is", "is not", ">", "<", ">=", "<=" };
        var keywords = new[] { "AND", "OR", "ORDER BY", "ASC", "DESC", "EMPTY", "NULL", "currentUser()" };

        return Ok(new { fields, operators, keywords });
    }
}
