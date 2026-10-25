using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary/{projectId:int}")]
    public async Task<IActionResult> GetProjectSummary(int projectId)
    {
        var issues = await _db.Issues
            .Where(i => i.ProjectId == projectId)
            .AsNoTracking()
            .ToListAsync();

        var totalIssues = issues.Count;
        var doneIssues = issues.Count(i => i.Status == "Done");
        var inProgressIssues = issues.Count(i => i.Status == "In Progress");
        var inReviewIssues = issues.Count(i => i.Status == "In Review");
        var todoIssues = issues.Count(i => i.Status == "To Do");

        var totalStoryPoints = issues.Sum(i => i.StoryPoints ?? 0);
        var completedStoryPoints = issues.Where(i => i.Status == "Done").Sum(i => i.StoryPoints ?? 0);

        var totalEstimatedMinutes = issues.Sum(i => i.OriginalEstimateMinutes ?? 0);
        var totalLoggedMinutes = issues.Sum(i => i.TimeSpentMinutes ?? 0);

        // Priority breakdown
        var priorityCounts = issues
            .GroupBy(i => i.Priority)
            .Select(g => new { Priority = g.Key, Count = g.Count() })
            .ToList();

        // Issue Type breakdown
        var typeCounts = issues
            .GroupBy(i => i.IssueType)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToList();

        return Ok(new
        {
            totalIssues,
            doneIssues,
            inProgressIssues,
            inReviewIssues,
            todoIssues,
            completionPercentage = totalIssues > 0 ? (double)doneIssues / totalIssues * 100 : 0,
            totalStoryPoints,
            completedStoryPoints,
            totalEstimatedHours = Math.Round((double)totalEstimatedMinutes / 60, 1),
            totalLoggedHours = Math.Round((double)totalLoggedMinutes / 60, 1),
            priorityCounts,
            typeCounts
        });
    }

    [HttpGet("burndown/{sprintId:int}")]
    public async Task<IActionResult> GetBurndownReport(int sprintId)
    {
        var sprint = await _db.Sprints
            .Include(s => s.Issues)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sprintId);

        if (sprint == null) return NotFound(new { message = "Sprint not found." });

        var startDate = sprint.StartDate ?? sprint.CreatedAt;
        var endDate = sprint.EndDate ?? startDate.AddDays(14);
        var totalDays = Math.Max(1, (int)(endDate.Date - startDate.Date).TotalDays);

        var sprintIssues = sprint.Issues.ToList();
        var totalPoints = sprintIssues.Sum(i => i.StoryPoints ?? 0);

        var days = new List<object>();

        for (int day = 0; day <= totalDays; day++)
        {
            var curDate = startDate.Date.AddDays(day);
            var idealPoints = Math.Max(0, totalPoints - (totalPoints / totalDays) * day);

            // Actual remaining: total points minus points resolved on or before curDate
            double actualRemaining = totalPoints;
            if (curDate <= DateTime.UtcNow.Date)
            {
                var resolvedSoFar = sprintIssues
                    .Where(i => i.Status == "Done" && (i.ResolvedAt ?? i.UpdatedAt).Date <= curDate)
                    .Sum(i => i.StoryPoints ?? 0);
                actualRemaining = Math.Max(0, totalPoints - resolvedSoFar);
            }

            days.Add(new
            {
                DayNumber = day + 1,
                Date = curDate.ToString("yyyy-MM-dd"),
                DayLabel = curDate.ToString("MMM dd"),
                IdealPoints = Math.Round(idealPoints, 1),
                ActualPoints = curDate <= DateTime.UtcNow.Date ? Math.Round(actualRemaining, 1) : (double?)null
            });
        }

        return Ok(new
        {
            sprint.Id,
            sprint.Name,
            sprint.State,
            TotalPoints = totalPoints,
            StartDate = startDate,
            EndDate = endDate,
            Days = days
        });
    }

    [HttpGet("velocity/{projectId:int}")]
    public async Task<IActionResult> GetVelocityReport(int projectId)
    {
        var sprints = await _db.Sprints
            .Where(s => s.ProjectId == projectId)
            .Include(s => s.Issues)
            .OrderBy(s => s.StartDate ?? s.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        var result = sprints.Select(s => new
        {
            SprintId = s.Id,
            SprintName = s.Name,
            State = s.State,
            CommittedPoints = s.Issues.Sum(i => i.StoryPoints ?? 0),
            CompletedPoints = s.Issues.Where(i => i.Status == "Done").Sum(i => i.StoryPoints ?? 0),
            TotalIssues = s.Issues.Count,
            CompletedIssues = s.Issues.Count(i => i.Status == "Done")
        }).ToList();

        return Ok(result);
    }

    [HttpGet("workload/{projectId:int}")]
    public async Task<IActionResult> GetWorkloadReport(int projectId)
    {
        var issues = await _db.Issues
            .Where(i => i.ProjectId == projectId)
            .AsNoTracking()
            .ToListAsync();

        var workload = issues
            .GroupBy(i => i.AssigneeName ?? "Unassigned")
            .Select(g => new
            {
                Assignee = g.Key,
                TotalIssues = g.Count(),
                InProgressCount = g.Count(i => i.Status == "In Progress"),
                InReviewCount = g.Count(i => i.Status == "In Review"),
                DoneCount = g.Count(i => i.Status == "Done"),
                TodoCount = g.Count(i => i.Status == "To Do"),
                TotalStoryPoints = g.Sum(i => i.StoryPoints ?? 0),
                CompletedStoryPoints = g.Where(i => i.Status == "Done").Sum(i => i.StoryPoints ?? 0),
                LoggedHours = Math.Round((double)g.Sum(i => i.TimeSpentMinutes ?? 0) / 60, 1)
            })
            .OrderByDescending(w => w.TotalStoryPoints)
            .ToList();

        return Ok(workload);
    }

    [HttpGet("time-tracking/{projectId:int}")]
    public async Task<IActionResult> GetTimeTrackingReport(int projectId)
    {
        var issues = await _db.Issues
            .Where(i => i.ProjectId == projectId && (i.OriginalEstimateMinutes > 0 || i.TimeSpentMinutes > 0))
            .Include(i => i.Worklogs)
            .OrderByDescending(i => i.TimeSpentMinutes)
            .AsNoTracking()
            .ToListAsync();

        var result = issues.Select(i => new
        {
            i.Id,
            i.Key,
            i.Summary,
            i.IssueType,
            i.Status,
            Assignee = i.AssigneeName ?? "Unassigned",
            EstimatedHours = Math.Round((double)(i.OriginalEstimateMinutes ?? 0) / 60, 1),
            LoggedHours = Math.Round((double)(i.TimeSpentMinutes ?? 0) / 60, 1),
            RemainingHours = Math.Round((double)(i.RemainingEstimateMinutes ?? 0) / 60, 1),
            WorklogsCount = i.Worklogs.Count
        }).ToList();

        return Ok(result);
    }
}
