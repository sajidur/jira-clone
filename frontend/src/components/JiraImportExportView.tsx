'use client';

import React, { useState } from 'react';
import { Project, JiraImportResult } from '@/types/jira';
import { Icons } from './Icons';
import {
  getJiraExportJsonUrl,
  getJiraExportCsvUrl,
  getSampleJiraJsonUrl,
  getSampleJiraCsvUrl,
  importJiraJson,
  importJiraCsv
} from '@/lib/api';

interface JiraImportExportViewProps {
  projects: Project[];
  currentProject: Project;
  onDataImported: () => void;
}

export const JiraImportExportView: React.FC<JiraImportExportViewProps> = ({
  projects,
  currentProject,
  onDataImported
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<number>(currentProject.id);
  const [importMode, setImportMode] = useState<'json' | 'csv'>('json');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<JiraImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setImportResult(null);
      setErrorMessage('');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please choose a file to import.');
      return;
    }

    try {
      setImporting(true);
      setErrorMessage('');
      setImportResult(null);

      let result: JiraImportResult;
      if (importMode === 'json') {
        result = await importJiraJson(selectedFile, selectedProjectId);
      } else {
        result = await importJiraCsv(selectedFile, selectedProjectId);
      }

      setImportResult(result);
      if (result.success) {
        onDataImported();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while importing file.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 w-full overflow-y-auto bg-slate-50 min-h-0 p-4 sm:p-6">
      {/* View Header */}
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Jira Interoperability</span>
            <span>/</span>
            <span className="font-semibold text-slate-700">Import & Export</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Jira Export & Import Hub
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Fully compatible with official Atlassian Jira Cloud & Jira Server data standards.
            Export issues to Jira standard JSON and CSV format, or import existing Jira backup exports directly into PostgreSQL.
          </p>
        </div>

        {/* Global Project Filter for Exports */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Project Scope:
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>PostgreSQL Schema Synced</span>
          </div>
        </div>

        {/* 1. EXPORT SECTION */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Icons.Download className="w-5 h-5 text-blue-600" />
            <span>Export to Jira Formats</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Jira Standard JSON Export */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-blue-400 transition">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                    Jira Standard JSON
                  </span>
                  <span className="text-xs text-slate-400">REST API v2 / Cloud</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Jira JSON Document Export
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Exports issues in the official Jira Cloud & Server JSON schema, including issue keys, summary, description, custom fields (Story Points, Sprints, Epics), assignee objects, and nested comments.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <a
                  href={getJiraExportJsonUrl(selectedProjectId)}
                  download
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Icons.Download className="w-4 h-4" />
                  <span>Download Jira JSON</span>
                </a>
                <a
                  href={getJiraExportJsonUrl()}
                  download
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                  title="Export all projects in one JSON"
                >
                  Export All
                </a>
              </div>
            </div>

            {/* Jira Standard CSV Export */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-emerald-400 transition">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Jira Standard CSV
                  </span>
                  <span className="text-xs text-slate-400">Excel / Jira Importer</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Jira CSV Spreadsheet Export
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Exports a standard CSV compatible with the Jira CSV Importer. Contains columns: Issue Type, Issue key, Summary, Status, Priority, Resolution, Assignee, Reporter, Story Points, Sprint, and Comments.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <a
                  href={getJiraExportCsvUrl(selectedProjectId)}
                  download
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Icons.Download className="w-4 h-4" />
                  <span>Download Jira CSV</span>
                </a>
                <a
                  href={getJiraExportCsvUrl()}
                  download
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                  title="Export all projects in one CSV"
                >
                  Export All
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 2. IMPORT SECTION */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Icons.Upload className="w-5 h-5 text-blue-600" />
            <span>Import Jira Files into this System</span>
          </h2>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
            {/* Format Selector Tabs */}
            <div className="flex items-center gap-4 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => {
                  setImportMode('json');
                  setSelectedFile(null);
                  setImportResult(null);
                }}
                className={`text-sm font-bold flex items-center gap-2 pb-1 border-b-2 transition cursor-pointer ${
                  importMode === 'json'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icons.FileText className="w-4 h-4" />
                <span>Import Jira JSON File</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportMode('csv');
                  setSelectedFile(null);
                  setImportResult(null);
                }}
                className={`text-sm font-bold flex items-center gap-2 pb-1 border-b-2 transition cursor-pointer ${
                  importMode === 'csv'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icons.FileText className="w-4 h-4" />
                <span>Import Jira CSV File</span>
              </button>
            </div>

            {/* Upload Area */}
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-8 text-center bg-slate-50/50 transition">
                <Icons.Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  Choose a Jira {importMode.toUpperCase()} file to upload
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  {importMode === 'json'
                    ? 'Accepts standard Jira Cloud / Server JSON export files with issue arrays and nested fields.'
                    : 'Accepts Jira CSV spreadsheets with standard header columns.'}
                </p>

                <input
                  type="file"
                  id="jira-file-input"
                  accept={importMode === 'json' ? '.json' : '.csv'}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="jira-file-input"
                  className="inline-block px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition"
                >
                  Browse File
                </label>

                {selectedFile && (
                  <div className="mt-3 text-xs font-semibold text-blue-600 bg-blue-50 py-1.5 px-3 rounded-md inline-block">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Ingestion Result Display */}
              {importResult && (
                <div
                  className={`p-4 rounded-xl border ${
                    importResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    <Icons.Check className="w-4 h-4" />
                    <span>{importResult.message}</span>
                  </div>
                  <div className="text-xs space-y-1 mt-2">
                    <div>Total Records Read: <strong>{importResult.totalRead}</strong></div>
                    <div>Issues Ingested to PostgreSQL: <strong>{importResult.issuesImported}</strong></div>
                    {importResult.sprintsCreated > 0 && (
                      <div>Sprints Created: <strong>{importResult.sprintsCreated}</strong></div>
                    )}
                    {importResult.importedKeys.length > 0 && (
                      <div className="text-[11px] text-slate-600 mt-1">
                        Keys: {importResult.importedKeys.slice(0, 10).join(', ')}
                        {importResult.importedKeys.length > 10 && ` and ${importResult.importedKeys.length - 10} more`}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-500">
                  Target Project: <strong>{projects.find((p) => p.id === selectedProjectId)?.name}</strong>
                </div>

                <button
                  type="submit"
                  disabled={!selectedFile || importing}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                >
                  {importing ? (
                    <>
                      <Icons.Refresh className="w-4 h-4 animate-spin" />
                      <span>Ingesting into Database...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Upload className="w-4 h-4" />
                      <span>Start Jira Ingestion</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 3. SAMPLE JIRA DATA TEMPLATES */}
        <div className="bg-slate-100/70 p-6 rounded-xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 mb-2">
            Sample Jira Export Templates for Testing
          </h3>
          <p className="text-xs text-slate-600 mb-4">
            Download pre-formatted sample Jira files to test the importer immediately or verify field mapping.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={getSampleJiraJsonUrl()}
              download
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <Icons.Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download Sample Jira JSON</span>
            </a>
            <a
              href={getSampleJiraCsvUrl()}
              download
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <Icons.Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Sample Jira CSV</span>
            </a>
          </div>
        </div>

        {/* 4. JIRA REST API COMPATIBILITY DIRECTORY */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Jira REST API Compatibility Endpoints
            </h3>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Live on port 5000
            </span>
          </div>
          <p className="text-xs text-slate-600">
            External Jira CLI utilities, Jira automation scripts, and custom plugins can directly query this server via standard Jira REST API paths:
          </p>
          <div className="bg-slate-900 rounded-lg p-3 text-emerald-400 font-mono text-[11px] space-y-1.5 overflow-x-auto">
            <div>GET http://localhost:5000/rest/api/2/serverInfo</div>
            <div>GET http://localhost:5000/rest/api/2/myself</div>
            <div>GET http://localhost:5000/rest/api/2/project</div>
            <div>GET http://localhost:5000/rest/api/2/issue/{'{key}'}</div>
            <div>GET http://localhost:5000/rest/api/2/search?jql=project = 'ERP'</div>
            <div>POST http://localhost:5000/rest/api/2/issue</div>
          </div>
        </div>
      </div>
    </div>
  );
};
