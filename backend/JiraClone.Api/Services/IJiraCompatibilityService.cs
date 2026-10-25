using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using JiraClone.Api.DTOs;
using JiraClone.Api.Models;

namespace JiraClone.Api.Services;

public interface IJiraCompatibilityService
{
    Task<JiraExportRootDto> ExportJiraJsonAsync(int? projectId = null, string? baseUrl = "http://localhost:5000");
    Task<byte[]> ExportJiraCsvAsync(int? projectId = null);
    Task<JiraImportResultDto> ImportJiraJsonAsync(Stream jsonStream, int? targetProjectId = null);
    Task<JiraImportResultDto> ImportJiraCsvAsync(Stream csvStream, int targetProjectId);
    Task<string> GenerateSampleJiraJsonAsync();
    string GenerateSampleJiraCsv();
}
