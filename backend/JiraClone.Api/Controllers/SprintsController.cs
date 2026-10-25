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
public class SprintsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SprintsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("project/{projectId:int}")]
    public async Task<IActionResult> GetSprintsForProject(int projectId)
    {
        var sprints = await _db.Sprints
            .Where(s => s.ProjectId == projectId)
            .OrderBy(s => s.State == "active" ? 1 : s.State == "future" ? 2 : 3)
            .ThenByDescending(s => s.StartDate)
            .Select(s => new
            {
                s.Id,
                s.ProjectId,
                s.Name,
                s.Goal,
                s.State,
                s.StartDate,
                s.EndDate,
                s.CompleteDate,
                s.CreatedAt,
                TotalIssues = s.Issues.Count,
                CompletedIssues = s.Issues.Count(i => i.Status == "Done"),
                TotalStoryPoints = s.Issues.Sum(i => i.StoryPoints ?? 0),
                CompletedStoryPoints = s.Issues.Where(i => i.Status == "Done").Sum(i => i.StoryPoints ?? 0)
            })
            .ToListAsync();

        return Ok(sprints);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSprint([FromBody] CreateSprintDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Sprint name is required." });
        }

        var project = await _db.Projects.FindAsync(dto.ProjectId);
        if (project == null) return NotFound(new { message = "Project not found." });

        var sprint = new Sprint
        {
            ProjectId = dto.ProjectId,
            Name = dto.Name.Trim(),
            Goal = dto.Goal,
            State = "future",
            StartDate = dto.StartDate.HasValue ? DateTime.SpecifyKind(dto.StartDate.Value, DateTimeKind.Utc) : DateTime.UtcNow,
            EndDate = dto.EndDate.HasValue ? DateTime.SpecifyKind(dto.EndDate.Value, DateTimeKind.Utc) : DateTime.UtcNow.AddDays(14)
        };

        _db.Sprints.Add(sprint);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSprintsForProject), new { projectId = sprint.ProjectId }, sprint);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateSprint(int id, [FromBody] UpdateSprintDto dto)
    {
        var sprint = await _db.Sprints.FindAsync(id);
        if (sprint == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Name)) sprint.Name = dto.Name;
        if (dto.Goal != null) sprint.Goal = dto.Goal;
        if (!string.IsNullOrWhiteSpace(dto.State)) sprint.State = dto.State.ToLower();
        if (dto.StartDate.HasValue) sprint.StartDate = DateTime.SpecifyKind(dto.StartDate.Value, DateTimeKind.Utc);
        if (dto.EndDate.HasValue) sprint.EndDate = DateTime.SpecifyKind(dto.EndDate.Value, DateTimeKind.Utc);

        await _db.SaveChangesAsync();
        return Ok(sprint);
    }

    [HttpPost("{id:int}/start")]
    public async Task<IActionResult> StartSprint(int id, [FromBody] UpdateSprintDto? dto = null)
    {
        var sprint = await _db.Sprints.FindAsync(id);
        if (sprint == null) return NotFound();

        sprint.State = "active";
        if (dto != null)
        {
            if (!string.IsNullOrWhiteSpace(dto.Name)) sprint.Name = dto.Name;
            if (dto.Goal != null) sprint.Goal = dto.Goal;
            if (dto.StartDate.HasValue) sprint.StartDate = DateTime.SpecifyKind(dto.StartDate.Value, DateTimeKind.Utc);
            if (dto.EndDate.HasValue) sprint.EndDate = DateTime.SpecifyKind(dto.EndDate.Value, DateTimeKind.Utc);
        }

        if (!sprint.StartDate.HasValue) sprint.StartDate = DateTime.UtcNow;
        if (!sprint.EndDate.HasValue || sprint.EndDate < sprint.StartDate)
        {
            sprint.EndDate = sprint.StartDate.Value.AddDays(14);
        }

        _db.UserNotifications.Add(new UserNotification
        {
            RecipientName = "All",
            ActorName = "Sprint Manager",
            Action = "sprint_started",
            Category = "system",
            Title = $"Sprint started: {sprint.Name}",
            Message = $"Sprint '{sprint.Name}' has been started.",
            ProjectId = sprint.ProjectId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(sprint);
    }

    [HttpPost("{id:int}/complete")]
    public async Task<IActionResult> CompleteSprint(int id, [FromQuery] int? moveToSprintId = null)
    {
        var sprint = await _db.Sprints.Include(s => s.Issues).FirstOrDefaultAsync(s => s.Id == id);
        if (sprint == null) return NotFound();

        sprint.State = "closed";
        sprint.CompleteDate = DateTime.UtcNow;

        // Incomplete issues move to target sprint or to backlog (null)
        var incompleteIssues = sprint.Issues.Where(i => i.Status != "Done").ToList();
        foreach (var issue in incompleteIssues)
        {
            issue.SprintId = moveToSprintId;
            issue.UpdatedAt = DateTime.UtcNow;
        }

        _db.UserNotifications.Add(new UserNotification
        {
            RecipientName = "All",
            ActorName = "Sprint Manager",
            Action = "sprint_completed",
            Category = "system",
            Title = $"Sprint completed: {sprint.Name}",
            Message = $"Sprint '{sprint.Name}' was closed. {incompleteIssues.Count} incomplete issues moved.",
            ProjectId = sprint.ProjectId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Sprint closed. {incompleteIssues.Count} incomplete issues moved.", sprint });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteSprint(int id)
    {
        var sprint = await _db.Sprints.Include(s => s.Issues).FirstOrDefaultAsync(s => s.Id == id);
        if (sprint == null) return NotFound();

        // Put any issues back into the backlog
        foreach (var issue in sprint.Issues)
        {
            issue.SprintId = null;
        }

        _db.Sprints.Remove(sprint);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
