using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Data;
using JiraClone.Api.DTOs;
using JiraClone.Api.Models;

namespace JiraClone.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProjectsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetProjects([FromQuery] int? workspaceId)
    {
        var query = _db.Projects.AsQueryable();
        if (workspaceId.HasValue && workspaceId.Value > 0)
        {
            query = query.Where(p => p.WorkspaceId == workspaceId.Value);
        }

        var projects = await query
            .Select(p => new
            {
                p.Id,
                p.Key,
                p.Name,
                p.Description,
                p.ProjectTypeKey,
                p.AvatarUrl,
                p.LeadName,
                p.LeadEmail,
                p.WorkspaceId,
                IssueCount = p.Issues.Count,
                ActiveSprintCount = p.Sprints.Count(s => s.State == "active"),
                p.CreatedAt,
                p.UpdatedAt
            })
            .OrderBy(p => p.Name)
            .ToListAsync();

        return Ok(projects);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetProjectById(int id)
    {
        var project = await _db.Projects
            .Include(p => p.Sprints)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null) return NotFound(new { message = $"Project with ID {id} not found." });
        return Ok(project);
    }

    [HttpGet("by-key/{key}")]
    public async Task<IActionResult> GetProjectByKey(string key)
    {
        var project = await _db.Projects
            .Include(p => p.Sprints)
            .FirstOrDefaultAsync(p => p.Key.ToUpper() == key.ToUpper());

        if (project == null) return NotFound(new { message = $"Project with Key {key} not found." });
        return Ok(project);
    }

    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Key) || string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Project Key and Name are required." });
        }

        var keyUpper = dto.Key.Trim().ToUpper();
        if (await _db.Projects.AnyAsync(p => p.Key == keyUpper))
        {
            return Conflict(new { message = $"A project with key '{keyUpper}' already exists." });
        }

        var project = new Project
        {
            Key = keyUpper,
            Name = dto.Name.Trim(),
            Description = dto.Description,
            ProjectTypeKey = dto.ProjectTypeKey ?? "software",
            AvatarUrl = dto.AvatarUrl,
            LeadName = dto.LeadName ?? "Admin",
            LeadEmail = dto.LeadEmail ?? "admin@example.com",
            WorkspaceId = dto.WorkspaceId ?? 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        // Also create a default active sprint for Scrum projects
        var defaultSprint = new Sprint
        {
            ProjectId = project.Id,
            Name = "Sprint 1",
            Goal = $"Initial sprint for {project.Name}",
            State = "active",
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(14)
        };
        _db.Sprints.Add(defaultSprint);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProjectById), new { id = project.Id }, project);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectDto dto)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Name)) project.Name = dto.Name;
        if (dto.Description != null) project.Description = dto.Description;
        if (dto.AvatarUrl != null) project.AvatarUrl = dto.AvatarUrl;
        if (!string.IsNullOrWhiteSpace(dto.LeadName)) project.LeadName = dto.LeadName;
        if (!string.IsNullOrWhiteSpace(dto.LeadEmail)) project.LeadEmail = dto.LeadEmail;
        if (!string.IsNullOrWhiteSpace(dto.ProjectTypeKey)) project.ProjectTypeKey = dto.ProjectTypeKey;
        if (dto.WorkspaceId.HasValue && dto.WorkspaceId.Value > 0) project.WorkspaceId = dto.WorkspaceId.Value;
        project.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(project);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null) return NotFound();

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
