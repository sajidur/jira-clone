using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using JiraClone.Api.DTOs;
using JiraClone.Api.Services;

namespace JiraClone.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JiraExportImportController : ControllerBase
{
    private readonly IJiraCompatibilityService _jiraService;

    public JiraExportImportController(IJiraCompatibilityService jiraService)
    {
        _jiraService = jiraService;
    }

    [HttpGet("export/json")]
    public async Task<IActionResult> ExportJson([FromQuery] int? projectId = null)
    {
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var data = await _jiraService.ExportJiraJsonAsync(projectId, baseUrl);
        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(data, new JsonSerializerOptions { WriteIndented = true });
        
        var fileName = projectId.HasValue 
            ? $"jira_export_proj_{projectId}_{DateTime.UtcNow:yyyyMMddHHmmss}.json" 
            : $"jira_export_all_{DateTime.UtcNow:yyyyMMddHHmmss}.json";

        return File(jsonBytes, "application/json", fileName);
    }

    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv([FromQuery] int? projectId = null)
    {
        var csvBytes = await _jiraService.ExportJiraCsvAsync(projectId);
        var fileName = projectId.HasValue 
            ? $"jira_export_proj_{projectId}_{DateTime.UtcNow:yyyyMMddHHmmss}.csv" 
            : $"jira_export_all_{DateTime.UtcNow:yyyyMMddHHmmss}.csv";

        return File(csvBytes, "text/csv", fileName);
    }

    [HttpPost("import/json")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ImportJsonFile([FromForm] IFormFile file, [FromQuery] int? targetProjectId = null)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No JSON file uploaded." });
        }

        using var stream = file.OpenReadStream();
        try
        {
            var result = await _jiraService.ImportJiraJsonAsync(stream, targetProjectId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new JiraImportResultDto
            {
                Success = false,
                Message = $"Failed to parse Jira JSON: {ex.Message}"
            });
        }
    }

    [HttpPost("import/json-raw")]
    [Consumes("application/json")]
    public async Task<IActionResult> ImportJsonRaw([FromBody] JsonElement rawJson, [FromQuery] int? targetProjectId = null)
    {
        var jsonString = rawJson.GetRawText();
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(jsonString));
        try
        {
            var result = await _jiraService.ImportJiraJsonAsync(stream, targetProjectId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new JiraImportResultDto
            {
                Success = false,
                Message = $"Failed to parse Jira JSON: {ex.Message}"
            });
        }
    }

    [HttpPost("import/csv")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ImportCsvFile([FromForm] IFormFile file, [FromQuery] int targetProjectId)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No CSV file uploaded." });
        }

        if (targetProjectId <= 0)
        {
            return BadRequest(new { message = "A valid targetProjectId is required to import CSV rows." });
        }

        using var stream = file.OpenReadStream();
        try
        {
            var result = await _jiraService.ImportJiraCsvAsync(stream, targetProjectId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new JiraImportResultDto
            {
                Success = false,
                Message = $"Failed to parse Jira CSV: {ex.Message}"
            });
        }
    }

    [HttpGet("sample/json")]
    public async Task<IActionResult> GetSampleJson()
    {
        var json = await _jiraService.GenerateSampleJiraJsonAsync();
        return File(Encoding.UTF8.GetBytes(json), "application/json", "sample_jira_export.json");
    }

    [HttpGet("sample/csv")]
    public IActionResult GetSampleCsv()
    {
        var csv = _jiraService.GenerateSampleJiraCsv();
        return File(Encoding.UTF8.GetBytes(csv), "text/csv", "sample_jira_export.csv");
    }
}
