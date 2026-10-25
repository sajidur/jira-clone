using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Controllers;

public class CreateVersionDto
{
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? ReleaseDate { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class ReleasesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReleasesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("project/{projectId:int}")]
    public async Task<IActionResult> GetVersions(int projectId)
    {
        var versions = await _db.ProjectVersions
            .Where(v => v.ProjectId == projectId)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync();

        var issues = await _db.Issues
            .Where(i => i.ProjectId == projectId && i.FixVersion != null)
            .AsNoTracking()
            .ToListAsync();

        var result = versions.Select(v => new
        {
            v.Id,
            v.ProjectId,
            v.Name,
            v.Description,
            v.StartDate,
            v.ReleaseDate,
            v.IsReleased,
            v.IsArchived,
            v.CreatedAt,
            TotalIssues = issues.Count(i => i.FixVersion == v.Name),
            CompletedIssues = issues.Count(i => i.FixVersion == v.Name && i.Status == "Done")
        });

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateVersion([FromBody] CreateVersionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Version name is required." });
        }

        var version = new ProjectVersion
        {
            ProjectId = dto.ProjectId,
            Name = dto.Name.Trim(),
            Description = dto.Description,
            StartDate = dto.StartDate ?? DateTime.UtcNow,
            ReleaseDate = dto.ReleaseDate ?? DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow
        };

        _db.ProjectVersions.Add(version);
        await _db.SaveChangesAsync();

        return Ok(version);
    }

    [HttpPost("{id:int}/release")]
    public async Task<IActionResult> ReleaseVersion(int id)
    {
        var version = await _db.ProjectVersions.FindAsync(id);
        if (version == null) return NotFound();

        version.IsReleased = true;
        version.ReleaseDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(version);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteVersion(int id)
    {
        var version = await _db.ProjectVersions.FindAsync(id);
        if (version == null) return NotFound();

        _db.ProjectVersions.Remove(version);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
