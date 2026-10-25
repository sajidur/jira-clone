using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Data;
using JiraClone.Api.Models;

namespace JiraClone.Api.Controllers;

public class CreateStatusDto
{
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "In Progress";
    public string Color { get; set; } = "#4c9aff";
    public int? WipLimit { get; set; }
}

public class ReorderStatusDto
{
    public int ProjectId { get; set; }
    public List<int> StatusIdsInOrder { get; set; } = new();
}

public class CreateCustomFieldDto
{
    public int ProjectId { get; set; }
    public string FieldKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string FieldType { get; set; } = "text"; // "text", "number", "select", "date", "checkbox", "url"
    public List<string>? Options { get; set; }
    public bool IsRequired { get; set; } = false;
    public bool ShowInListView { get; set; } = true;
}

public class CreateTransitionDto
{
    public int ProjectId { get; set; }
    public string FromStatus { get; set; } = string.Empty;
    public string ToStatus { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? RequiredRole { get; set; }
    public string? AutoResolution { get; set; }
    public string? AutoAssignee { get; set; }
}

public class ToggleMatrixDto
{
    public int ProjectId { get; set; }
    public string FromStatus { get; set; } = string.Empty;
    public string ToStatus { get; set; } = string.Empty;
    public bool Allowed { get; set; }
}

public class CreateWorkflowRuleDto
{
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string TriggerEvent { get; set; } = "OnStatusChange";
    public string? ConditionStatus { get; set; }
    public string ActionType { get; set; } = "SetResolution";
    public string ActionValue { get; set; } = "Done";
}

[ApiController]
[Route("api/[controller]")]
public class ConfigurationController : ControllerBase
{
    private readonly AppDbContext _db;

    public ConfigurationController(AppDbContext db)
    {
        _db = db;
    }

    // -------------------------------------------------------------
    // WORKFLOW STATUSES & BOARD COLUMNS
    // -------------------------------------------------------------

    [HttpGet("statuses/{projectId:int}")]
    public async Task<IActionResult> GetWorkflowStatuses(int projectId)
    {
        var statuses = await _db.ProjectWorkflowStatuses
            .Where(s => s.ProjectId == projectId)
            .OrderBy(s => s.Order)
            .ToListAsync();

        if (statuses.Count == 0)
        {
            var defaults = new List<ProjectWorkflowStatus>
            {
                new() { ProjectId = projectId, Name = "To Do", Category = "To Do", Color = "#64748b", Order = 1 },
                new() { ProjectId = projectId, Name = "In Progress", Category = "In Progress", Color = "#2563eb", Order = 2, WipLimit = 5 },
                new() { ProjectId = projectId, Name = "In Review", Category = "In Progress", Color = "#d97706", Order = 3, WipLimit = 3 },
                new() { ProjectId = projectId, Name = "Done", Category = "Done", Color = "#16a34a", Order = 4 }
            };
            await _db.ProjectWorkflowStatuses.AddRangeAsync(defaults);
            await _db.SaveChangesAsync();
            return Ok(defaults);
        }

        return Ok(statuses);
    }

    [HttpPost("statuses")]
    public async Task<IActionResult> CreateWorkflowStatus([FromBody] CreateStatusDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Status name is required." });
        }

        var maxOrder = await _db.ProjectWorkflowStatuses
            .Where(s => s.ProjectId == dto.ProjectId)
            .MaxAsync(s => (int?)s.Order) ?? 0;

        var status = new ProjectWorkflowStatus
        {
            ProjectId = dto.ProjectId,
            Name = dto.Name.Trim(),
            Category = dto.Category,
            Color = dto.Color,
            Order = maxOrder + 1,
            WipLimit = dto.WipLimit
        };

        _db.ProjectWorkflowStatuses.Add(status);
        await _db.SaveChangesAsync();

        return Ok(status);
    }

    [HttpPut("statuses/{id:int}")]
    public async Task<IActionResult> UpdateWorkflowStatus(int id, [FromBody] CreateStatusDto dto)
    {
        var status = await _db.ProjectWorkflowStatuses.FindAsync(id);
        if (status == null) return NotFound();

        var oldName = status.Name;
        status.Name = dto.Name;
        status.Category = dto.Category;
        status.Color = dto.Color;
        status.WipLimit = dto.WipLimit;

        // If status name changed, update all existing issues using that status
        if (!string.Equals(oldName, dto.Name, StringComparison.OrdinalIgnoreCase))
        {
            var issuesWithStatus = await _db.Issues
                .Where(i => i.ProjectId == status.ProjectId && i.Status == oldName)
                .ToListAsync();

            foreach (var issue in issuesWithStatus)
            {
                issue.Status = dto.Name;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(status);
    }

    [HttpDelete("statuses/{id:int}")]
    public async Task<IActionResult> DeleteWorkflowStatus(int id)
    {
        var status = await _db.ProjectWorkflowStatuses.FindAsync(id);
        if (status == null) return NotFound();

        var count = await _db.ProjectWorkflowStatuses.CountAsync(s => s.ProjectId == status.ProjectId);
        if (count <= 1)
        {
            return BadRequest(new { message = "Projects must have at least one workflow status." });
        }

        // Check if issues use this status
        var fallbackStatus = await _db.ProjectWorkflowStatuses
            .Where(s => s.ProjectId == status.ProjectId && s.Id != id)
            .OrderBy(s => s.Order)
            .FirstOrDefaultAsync();

        if (fallbackStatus != null)
        {
            var issues = await _db.Issues
                .Where(i => i.ProjectId == status.ProjectId && i.Status == status.Name)
                .ToListAsync();
            foreach (var iss in issues)
            {
                iss.Status = fallbackStatus.Name;
            }
        }

        _db.ProjectWorkflowStatuses.Remove(status);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("statuses/reorder")]
    public async Task<IActionResult> ReorderWorkflowStatuses([FromBody] ReorderStatusDto dto)
    {
        var statuses = await _db.ProjectWorkflowStatuses
            .Where(s => s.ProjectId == dto.ProjectId)
            .ToListAsync();

        for (int i = 0; i < dto.StatusIdsInOrder.Count; i++)
        {
            var s = statuses.FirstOrDefault(item => item.Id == dto.StatusIdsInOrder[i]);
            if (s != null)
            {
                s.Order = i + 1;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(statuses.OrderBy(s => s.Order));
    }

    // -------------------------------------------------------------
    // CUSTOM FIELDS & COLUMNS
    // -------------------------------------------------------------

    [HttpGet("custom-fields/{projectId:int}")]
    public async Task<IActionResult> GetCustomFields(int projectId)
    {
        var fields = await _db.CustomFieldDefinitions
            .Where(cf => cf.ProjectId == projectId)
            .OrderBy(cf => cf.Order)
            .ToListAsync();

        return Ok(fields);
    }

    [HttpPost("custom-fields")]
    public async Task<IActionResult> CreateCustomField([FromBody] CreateCustomFieldDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Field name is required." });

        var key = string.IsNullOrWhiteSpace(dto.FieldKey)
            ? dto.Name.Trim().ToLower().Replace(" ", "_")
            : dto.FieldKey.Trim().ToLower().Replace(" ", "_");

        var maxOrder = await _db.CustomFieldDefinitions
            .Where(cf => cf.ProjectId == dto.ProjectId)
            .MaxAsync(cf => (int?)cf.Order) ?? 0;

        var field = new CustomFieldDefinition
        {
            ProjectId = dto.ProjectId,
            FieldKey = key,
            Name = dto.Name.Trim(),
            FieldType = dto.FieldType.ToLower(),
            OptionsJson = dto.Options != null && dto.Options.Count > 0 ? JsonSerializer.Serialize(dto.Options) : null,
            IsRequired = dto.IsRequired,
            ShowInListView = dto.ShowInListView,
            Order = maxOrder + 1
        };

        _db.CustomFieldDefinitions.Add(field);
        await _db.SaveChangesAsync();
        return Ok(field);
    }

    [HttpPut("custom-fields/{id:int}")]
    public async Task<IActionResult> UpdateCustomField(int id, [FromBody] CreateCustomFieldDto dto)
    {
        var field = await _db.CustomFieldDefinitions.FindAsync(id);
        if (field == null) return NotFound();

        field.Name = dto.Name;
        field.FieldType = dto.FieldType;
        field.OptionsJson = dto.Options != null ? JsonSerializer.Serialize(dto.Options) : null;
        field.IsRequired = dto.IsRequired;
        field.ShowInListView = dto.ShowInListView;

        await _db.SaveChangesAsync();
        return Ok(field);
    }

    [HttpDelete("custom-fields/{id:int}")]
    public async Task<IActionResult> DeleteCustomField(int id)
    {
        var field = await _db.CustomFieldDefinitions.FindAsync(id);
        if (field == null) return NotFound();

        _db.CustomFieldDefinitions.Remove(field);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // -------------------------------------------------------------
    // WORKFLOW TRANSITIONS & MATRIX
    // -------------------------------------------------------------

    [HttpGet("transitions/{projectId:int}")]
    public async Task<IActionResult> GetTransitions(int projectId)
    {
        var transitions = await _db.WorkflowTransitions
            .Where(t => t.ProjectId == projectId)
            .ToListAsync();

        return Ok(transitions);
    }

    [HttpPost("transitions")]
    public async Task<IActionResult> CreateTransition([FromBody] CreateTransitionDto dto)
    {
        var trans = new WorkflowTransition
        {
            ProjectId = dto.ProjectId,
            FromStatus = dto.FromStatus,
            ToStatus = dto.ToStatus,
            Name = string.IsNullOrWhiteSpace(dto.Name) ? $"{dto.FromStatus} ➔ {dto.ToStatus}" : dto.Name,
            Description = dto.Description,
            RequiredRole = dto.RequiredRole,
            AutoResolution = dto.AutoResolution,
            AutoAssignee = dto.AutoAssignee
        };

        _db.WorkflowTransitions.Add(trans);
        await _db.SaveChangesAsync();
        return Ok(trans);
    }

    [HttpPut("transitions/{id:int}")]
    public async Task<IActionResult> UpdateTransition(int id, [FromBody] CreateTransitionDto dto)
    {
        var trans = await _db.WorkflowTransitions.FindAsync(id);
        if (trans == null) return NotFound();

        trans.Name = string.IsNullOrWhiteSpace(dto.Name) ? $"{dto.FromStatus} ➔ {dto.ToStatus}" : dto.Name;
        trans.FromStatus = dto.FromStatus;
        trans.ToStatus = dto.ToStatus;
        trans.Description = dto.Description;
        trans.RequiredRole = dto.RequiredRole;
        trans.AutoResolution = dto.AutoResolution;
        trans.AutoAssignee = dto.AutoAssignee;

        await _db.SaveChangesAsync();
        return Ok(trans);
    }

    [HttpDelete("transitions/{id:int}")]
    public async Task<IActionResult> DeleteTransition(int id)
    {
        var trans = await _db.WorkflowTransitions.FindAsync(id);
        if (trans == null) return NotFound();

        _db.WorkflowTransitions.Remove(trans);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("transitions/matrix")]
    public async Task<IActionResult> ToggleTransitionMatrix([FromBody] ToggleMatrixDto dto)
    {
        var existing = await _db.WorkflowTransitions
            .FirstOrDefaultAsync(t => t.ProjectId == dto.ProjectId && t.FromStatus == dto.FromStatus && t.ToStatus == dto.ToStatus);

        if (dto.Allowed && existing == null)
        {
            _db.WorkflowTransitions.Add(new WorkflowTransition
            {
                ProjectId = dto.ProjectId,
                FromStatus = dto.FromStatus,
                ToStatus = dto.ToStatus,
                Name = $"{dto.FromStatus} ➔ {dto.ToStatus}"
            });
        }
        else if (!dto.Allowed && existing != null)
        {
            _db.WorkflowTransitions.Remove(existing);
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("workflow-template")]
    public async Task<IActionResult> ApplyWorkflowTemplate([FromBody] JsonElement body)
    {
        if (!body.TryGetProperty("projectId", out var pProp) || !body.TryGetProperty("template", out var tProp))
            return BadRequest(new { message = "projectId and template are required." });

        var projectId = pProp.GetInt32();
        var template = tProp.GetString()?.ToLower() ?? "scrum";

        // Remove existing transitions and statuses
        var existingTrans = await _db.WorkflowTransitions.Where(t => t.ProjectId == projectId).ToListAsync();
        _db.WorkflowTransitions.RemoveRange(existingTrans);

        var existingStatuses = await _db.ProjectWorkflowStatuses.Where(s => s.ProjectId == projectId).ToListAsync();
        _db.ProjectWorkflowStatuses.RemoveRange(existingStatuses);
        await _db.SaveChangesAsync();

        var newStatuses = new List<ProjectWorkflowStatus>();
        var newTrans = new List<WorkflowTransition>();

        if (template == "kanban")
        {
            newStatuses = new List<ProjectWorkflowStatus>
            {
                new() { ProjectId = projectId, Name = "Backlog", Category = "To Do", Color = "#64748b", Order = 1 },
                new() { ProjectId = projectId, Name = "Selected for Development", Category = "To Do", Color = "#475569", Order = 2 },
                new() { ProjectId = projectId, Name = "In Progress", Category = "In Progress", Color = "#0284c7", Order = 3, WipLimit = 4 },
                new() { ProjectId = projectId, Name = "Done", Category = "Done", Color = "#16a34a", Order = 4 }
            };
            newTrans = new List<WorkflowTransition>
            {
                new() { ProjectId = projectId, FromStatus = "Backlog", ToStatus = "Selected for Development", Name = "Select for Dev" },
                new() { ProjectId = projectId, FromStatus = "Selected for Development", ToStatus = "In Progress", Name = "Start Work" },
                new() { ProjectId = projectId, FromStatus = "In Progress", ToStatus = "Done", Name = "Complete", AutoResolution = "Done" },
                new() { ProjectId = projectId, FromStatus = "*", ToStatus = "Backlog", Name = "Return to Backlog" }
            };
        }
        else if (template == "enterprise_qa")
        {
            newStatuses = new List<ProjectWorkflowStatus>
            {
                new() { ProjectId = projectId, Name = "To Do", Category = "To Do", Color = "#64748b", Order = 1 },
                new() { ProjectId = projectId, Name = "Development", Category = "In Progress", Color = "#2563eb", Order = 2, WipLimit = 5 },
                new() { ProjectId = projectId, Name = "Code Review", Category = "In Progress", Color = "#7c3aed", Order = 3, WipLimit = 3 },
                new() { ProjectId = projectId, Name = "QA Testing", Category = "In Progress", Color = "#d97706", Order = 4, WipLimit = 4 },
                new() { ProjectId = projectId, Name = "Ready for Release", Category = "Done", Color = "#059669", Order = 5 },
                new() { ProjectId = projectId, Name = "Done", Category = "Done", Color = "#16a34a", Order = 6 }
            };
            newTrans = new List<WorkflowTransition>
            {
                new() { ProjectId = projectId, FromStatus = "To Do", ToStatus = "Development", Name = "Start Development" },
                new() { ProjectId = projectId, FromStatus = "Development", ToStatus = "Code Review", Name = "Submit PR", RequiredRole = "Developer" },
                new() { ProjectId = projectId, FromStatus = "Code Review", ToStatus = "QA Testing", Name = "Pass Code Review" },
                new() { ProjectId = projectId, FromStatus = "Code Review", ToStatus = "Development", Name = "Request Changes" },
                new() { ProjectId = projectId, FromStatus = "QA Testing", ToStatus = "Ready for Release", Name = "QA Approved", RequiredRole = "QA Engineer" },
                new() { ProjectId = projectId, FromStatus = "QA Testing", ToStatus = "Development", Name = "Fail QA / Reopen" },
                new() { ProjectId = projectId, FromStatus = "Ready for Release", ToStatus = "Done", Name = "Deploy to Production", AutoResolution = "Done" }
            };
        }
        else
        {
            // Standard Jira Scrum
            newStatuses = new List<ProjectWorkflowStatus>
            {
                new() { ProjectId = projectId, Name = "To Do", Category = "To Do", Color = "#64748b", Order = 1 },
                new() { ProjectId = projectId, Name = "In Progress", Category = "In Progress", Color = "#2563eb", Order = 2, WipLimit = 5 },
                new() { ProjectId = projectId, Name = "In Review", Category = "In Progress", Color = "#d97706", Order = 3, WipLimit = 3 },
                new() { ProjectId = projectId, Name = "Done", Category = "Done", Color = "#16a34a", Order = 4 }
            };
            newTrans = new List<WorkflowTransition>
            {
                new() { ProjectId = projectId, FromStatus = "To Do", ToStatus = "In Progress", Name = "Start Working" },
                new() { ProjectId = projectId, FromStatus = "In Progress", ToStatus = "In Review", Name = "Submit for Review" },
                new() { ProjectId = projectId, FromStatus = "In Review", ToStatus = "In Progress", Name = "Request Changes" },
                new() { ProjectId = projectId, FromStatus = "In Review", ToStatus = "Done", Name = "Approve & Complete", AutoResolution = "Done" },
                new() { ProjectId = projectId, FromStatus = "*", ToStatus = "To Do", Name = "Reopen Issue" }
            };
        }

        await _db.ProjectWorkflowStatuses.AddRangeAsync(newStatuses);
        await _db.WorkflowTransitions.AddRangeAsync(newTrans);
        await _db.SaveChangesAsync();

        return Ok(new { statuses = newStatuses, transitions = newTrans });
    }

    // -------------------------------------------------------------
    // WORKFLOW AUTOMATION RULES
    // -------------------------------------------------------------

    [HttpGet("rules/{projectId:int}")]
    public async Task<IActionResult> GetWorkflowRules(int projectId)
    {
        var rules = await _db.WorkflowRules
            .Where(r => r.ProjectId == projectId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return Ok(rules);
    }

    [HttpPost("rules")]
    public async Task<IActionResult> CreateWorkflowRule([FromBody] CreateWorkflowRuleDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Rule name is required." });

        var rule = new WorkflowRule
        {
            ProjectId = dto.ProjectId,
            Name = dto.Name.Trim(),
            TriggerEvent = dto.TriggerEvent,
            ConditionStatus = dto.ConditionStatus,
            ActionType = dto.ActionType,
            ActionValue = dto.ActionValue,
            IsEnabled = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.WorkflowRules.Add(rule);
        await _db.SaveChangesAsync();
        return Ok(rule);
    }

    [HttpPut("rules/{id:int}/toggle")]
    public async Task<IActionResult> ToggleWorkflowRule(int id)
    {
        var rule = await _db.WorkflowRules.FindAsync(id);
        if (rule == null) return NotFound();

        rule.IsEnabled = !rule.IsEnabled;
        await _db.SaveChangesAsync();
        return Ok(rule);
    }

    [HttpDelete("rules/{id:int}")]
    public async Task<IActionResult> DeleteWorkflowRule(int id)
    {
        var rule = await _db.WorkflowRules.FindAsync(id);
        if (rule == null) return NotFound();

        _db.WorkflowRules.Remove(rule);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // -------------------------------------------------------------
    // PROJECT COMPONENTS
    // -------------------------------------------------------------

    [HttpGet("components/{projectId:int}")]
    public async Task<IActionResult> GetComponents(int projectId)
    {
        var components = await _db.ProjectComponents
            .Where(c => c.ProjectId == projectId)
            .OrderBy(c => c.Name)
            .ToListAsync();
        return Ok(components);
    }

    [HttpPost("components")]
    public async Task<IActionResult> CreateComponent([FromBody] ProjectComponent component)
    {
        if (string.IsNullOrWhiteSpace(component.Name))
            return BadRequest(new { message = "Component name is required." });

        _db.ProjectComponents.Add(component);
        await _db.SaveChangesAsync();
        return Ok(component);
    }

    [HttpDelete("components/{id:int}")]
    public async Task<IActionResult> DeleteComponent(int id)
    {
        var c = await _db.ProjectComponents.FindAsync(id);
        if (c == null) return NotFound();
        _db.ProjectComponents.Remove(c);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // -------------------------------------------------------------
    // ISSUE TYPES
    // -------------------------------------------------------------

    [HttpGet("issue-types/{projectId:int}")]
    public async Task<IActionResult> GetIssueTypes(int projectId)
    {
        var types = await _db.ProjectIssueTypes
            .Where(t => t.ProjectId == projectId)
            .OrderBy(t => t.Order)
            .ToListAsync();
        return Ok(types);
    }

    [HttpPost("issue-types")]
    public async Task<IActionResult> CreateIssueType([FromBody] ProjectIssueType issueType)
    {
        if (string.IsNullOrWhiteSpace(issueType.Name))
            return BadRequest(new { message = "Issue type name is required." });

        _db.ProjectIssueTypes.Add(issueType);
        await _db.SaveChangesAsync();
        return Ok(issueType);
    }

    [HttpDelete("issue-types/{id:int}")]
    public async Task<IActionResult> DeleteIssueType(int id)
    {
        var it = await _db.ProjectIssueTypes.FindAsync(id);
        if (it == null) return NotFound();
        _db.ProjectIssueTypes.Remove(it);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // -------------------------------------------------------------
    // PRIORITIES
    // -------------------------------------------------------------

    [HttpGet("priorities/{projectId:int}")]
    public async Task<IActionResult> GetPriorities(int projectId)
    {
        var priorities = await _db.ProjectPriorities
            .Where(p => p.ProjectId == projectId)
            .OrderBy(p => p.Order)
            .ToListAsync();
        return Ok(priorities);
    }

    [HttpPost("priorities")]
    public async Task<IActionResult> CreatePriority([FromBody] ProjectPriority priority)
    {
        if (string.IsNullOrWhiteSpace(priority.Name))
            return BadRequest(new { message = "Priority name is required." });

        _db.ProjectPriorities.Add(priority);
        await _db.SaveChangesAsync();
        return Ok(priority);
    }

    [HttpDelete("priorities/{id:int}")]
    public async Task<IActionResult> DeletePriority(int id)
    {
        var p = await _db.ProjectPriorities.FindAsync(id);
        if (p == null) return NotFound();
        _db.ProjectPriorities.Remove(p);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // -------------------------------------------------------------
    // RESOLUTIONS
    // -------------------------------------------------------------

    [HttpGet("resolutions/{projectId:int}")]
    public async Task<IActionResult> GetResolutions(int projectId)
    {
        var resolutions = await _db.ProjectResolutions
            .Where(r => r.ProjectId == projectId)
            .OrderBy(r => r.Order)
            .ToListAsync();
        return Ok(resolutions);
    }

    [HttpPost("resolutions")]
    public async Task<IActionResult> CreateResolution([FromBody] ProjectResolution resolution)
    {
        if (string.IsNullOrWhiteSpace(resolution.Name))
            return BadRequest(new { message = "Resolution name is required." });

        _db.ProjectResolutions.Add(resolution);
        await _db.SaveChangesAsync();
        return Ok(resolution);
    }

    [HttpDelete("resolutions/{id:int}")]
    public async Task<IActionResult> DeleteResolution(int id)
    {
        var r = await _db.ProjectResolutions.FindAsync(id);
        if (r == null) return NotFound();
        _db.ProjectResolutions.Remove(r);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // -------------------------------------------------------------
    // WEBHOOKS
    // -------------------------------------------------------------

    [HttpGet("webhooks/{projectId:int}")]
    public async Task<IActionResult> GetWebhooks(int projectId)
    {
        var webhooks = await _db.ProjectWebhooks
            .Where(w => w.ProjectId == projectId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
        return Ok(webhooks);
    }

    [HttpPost("webhooks")]
    public async Task<IActionResult> CreateWebhook([FromBody] ProjectWebhook webhook)
    {
        if (string.IsNullOrWhiteSpace(webhook.Name) || string.IsNullOrWhiteSpace(webhook.Url))
            return BadRequest(new { message = "Webhook name and URL are required." });

        webhook.CreatedAt = DateTime.UtcNow;
        _db.ProjectWebhooks.Add(webhook);
        await _db.SaveChangesAsync();
        return Ok(webhook);
    }

    [HttpDelete("webhooks/{id:int}")]
    public async Task<IActionResult> DeleteWebhook(int id)
    {
        var w = await _db.ProjectWebhooks.FindAsync(id);
        if (w == null) return NotFound();
        _db.ProjectWebhooks.Remove(w);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
