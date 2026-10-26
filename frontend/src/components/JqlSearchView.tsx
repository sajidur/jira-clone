'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Project, Issue, SavedFilter } from '@/types/jira';
import { searchJql, fetchSavedFilters, createSavedFilter, deleteSavedFilter } from '@/lib/api';
import { Icons } from './Icons';
import { useCurrentUser } from './AuthProvider';

const DEFAULT_JQL = "status in ('In Progress', 'In Review') ORDER BY updated DESC";

interface JqlSearchViewProps {
  currentProject: Project | null;
  onSelectIssue: (issue: Issue) => void;
  onOpenCreateModal: () => void;
  /** Query from the URL (/issues?jql=…). */
  initialJql?: string | null;
  /** Saved filter from the URL (/issues?filter=ID). */
  initialFilterId?: number | null;
  /** Called with every query that runs, so the URL can follow it. */
  onQueryRun?: (jql: string) => void;
}

export default function JqlSearchView({
  currentProject,
  onSelectIssue,
  onOpenCreateModal,
  initialJql,
  initialFilterId,
  onQueryRun
}: JqlSearchViewProps) {
  const currentUser = useCurrentUser();
  const lastRunQuery = useRef<string | null>(null);
  // Mode: 'jql' | 'basic'
  const [mode, setMode] = useState<'jql' | 'basic'>('jql');

  // Advanced JQL State
  const [jqlQuery, setJqlQuery] = useState<string>(initialJql || DEFAULT_JQL);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [parsedClauses, setParsedClauses] = useState<string[]>([]);
  const [results, setResults] = useState<Issue[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Basic Filter State
  const [basicType, setBasicType] = useState<string>('All');
  const [basicStatus, setBasicStatus] = useState<string>('All');
  const [basicAssignee, setBasicAssignee] = useState<string>('All');
  const [basicPriority, setBasicPriority] = useState<string>('All');
  const [basicText, setBasicText] = useState<string>('');

  // Saved Filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [newFilterName, setNewFilterName] = useState<string>('');
  const [newFilterDesc, setNewFilterDesc] = useState<string>('');
  const [savingFilter, setSavingFilter] = useState<boolean>(false);

  // Load saved filters, then run the query or filter from the URL (or the default query)
  useEffect(() => {
    loadFilters().then((filters) => {
      const fromUrl = initialFilterId ? filters.find((f) => f.id === initialFilterId) : undefined;
      if (fromUrl) handleSelectSavedFilter(fromUrl);
      else runSearch(jqlQuery);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A filter picked from the navigation while this page is open
  useEffect(() => {
    if (lastRunQuery.current === null) return; // first search is handled on mount
    if (initialFilterId) {
      const filter = savedFilters.find((f) => f.id === initialFilterId);
      if (filter && filter.jql !== lastRunQuery.current) handleSelectSavedFilter(filter);
    } else if (initialJql && initialJql !== lastRunQuery.current) {
      setActiveFilterId(null);
      setJqlQuery(initialJql);
      setMode('jql');
      runSearch(initialJql);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialJql, initialFilterId]);

  async function loadFilters(): Promise<SavedFilter[]> {
    try {
      const data = await fetchSavedFilters();
      setSavedFilters(data);
      return data;
    } catch (err) {
      console.error('Failed to load saved filters', err);
      return [];
    }
  }

  async function runSearch(queryToRun: string) {
    lastRunQuery.current = queryToRun;
    onQueryRun?.(queryToRun);
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchJql(queryToRun);
      setResults(res.issues);
      setTotalCount(res.total);
      setParsedClauses(res.parsedClauses || []);
      if (res.errorMessage) {
        setSearchError(res.errorMessage);
      }
      if (res.issues.length > 0 && !selectedIssue) {
        setSelectedIssue(res.issues[0]);
      } else if (res.issues.length === 0) {
        setSelectedIssue(null);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Error executing search');
    } finally {
      setSearching(false);
    }
  }

  function handleSelectSavedFilter(filter: SavedFilter) {
    setActiveFilterId(filter.id);
    setJqlQuery(filter.jql);
    setMode('jql');
    runSearch(filter.jql);
  }

  async function handleDeleteSavedFilter(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved filter?')) return;
    try {
      await deleteSavedFilter(id);
      setSavedFilters(prev => prev.filter(f => f.id !== id));
      if (activeFilterId === id) setActiveFilterId(null);
    } catch (err) {
      alert('Failed to delete filter');
    }
  }

  async function handleSaveCurrentFilter(e: React.FormEvent) {
    e.preventDefault();
    if (!newFilterName.trim()) return;
    setSavingFilter(true);
    try {
      const created = await createSavedFilter({
        name: newFilterName.trim(),
        jql: jqlQuery,
        description: newFilterDesc.trim() || undefined,
        ownerName: currentUser.displayName,
        isFavorite: true
      });
      setSavedFilters(prev => [created, ...prev]);
      setActiveFilterId(created.id);
      setShowSaveModal(false);
      setNewFilterName('');
      setNewFilterDesc('');
    } catch (err: any) {
      alert(err.message || 'Failed to save filter');
    } finally {
      setSavingFilter(false);
    }
  }

  // Update Basic filters into JQL query
  function applyBasicFilters(type = basicType, status = basicStatus, assignee = basicAssignee, priority = basicPriority, text = basicText) {
    const clauses: string[] = [];
    if (type !== 'All') clauses.push(`type = '${type}'`);
    if (status !== 'All') clauses.push(`status = '${status}'`);
    if (assignee === 'currentUser()') clauses.push(`assignee = currentUser()`);
    else if (assignee !== 'All') clauses.push(`assignee = '${assignee}'`);
    if (priority !== 'All') clauses.push(`priority = '${priority}'`);
    if (text.trim()) clauses.push(`text ~ '${text.trim()}'`);

    const finalJql = clauses.length > 0 ? clauses.join(' AND ') : '';
    setJqlQuery(finalJql);
    runSearch(finalJql);
  }

  // Autocomplete snippet helpers
  function insertSnippet(snippet: string) {
    if (!jqlQuery.trim()) {
      setJqlQuery(snippet);
    } else {
      setJqlQuery(`${jqlQuery} AND ${snippet}`);
    }
  }

  function exportResultsCsv() {
    if (results.length === 0) return;
    const headers = ['Key', 'Summary', 'Type', 'Status', 'Priority', 'Assignee', 'StoryPoints', 'Resolution', 'Created'];
    const rows = results.map(r => [
      r.key,
      `"${r.summary.replace(/"/g, '""')}"`,
      r.issueType,
      r.status,
      r.priority,
      `"${r.assigneeName || 'Unassigned'}"`,
      r.storyPoints ?? '',
      r.resolution || 'Unresolved',
      r.createdAt
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jira_jql_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex-1 min-w-0 w-full flex overflow-hidden bg-slate-50">
      {/* LEFT SIDEBAR: SAVED FILTERS & STARRED */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
            <Icons.Sliders className="w-4 h-4 text-[#0052cc]" />
            Saved Filters
          </div>
          <button
            onClick={() => setShowSaveModal(true)}
            title="Save Current Query as Filter"
            className="text-xs text-[#0052cc] hover:bg-blue-50 px-2 py-1 rounded font-medium transition"
          >
            + New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase px-2 py-1 tracking-wider">
            Default Filters
          </div>

          {savedFilters.map(filter => {
            const isActive = activeFilterId === filter.id;
            return (
              <div
                key={filter.id}
                onClick={() => handleSelectSavedFilter(filter)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-md text-xs cursor-pointer transition ${
                  isActive
                    ? 'bg-blue-50 text-[#0052cc] font-medium border border-blue-200'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icons.Star className={`w-3.5 h-3.5 ${filter.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                  <span className="truncate">{filter.name}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSavedFilter(e, filter.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded transition"
                  title="Delete Filter"
                >
                  <Icons.Trash className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <div className="pt-4 px-2">
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                <Icons.Help className="w-3.5 h-3.5 text-[#0052cc]" />
                JQL Syntax Tips
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Use standard clauses like <code className="bg-white px-1 py-0.5 rounded text-[#0052cc] font-mono">status in ('To Do', 'Done')</code> or <code className="bg-white px-1 py-0.5 rounded text-[#0052cc] font-mono">assignee = currentUser()</code>.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN SEARCH & RESULTS WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* TOP BAR: JQL INPUT / BASIC CONTROLS */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900">Search Issues</h1>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setMode('basic')}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    mode === 'basic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Basic
                </button>
                <button
                  onClick={() => setMode('jql')}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    mode === 'jql' ? 'bg-[#0052cc] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  JQL (Advanced)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSaveModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition"
              >
                <Icons.Star className="w-3.5 h-3.5 text-amber-500" />
                Save Filter
              </button>
              <button
                onClick={exportResultsCsv}
                disabled={results.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 disabled:opacity-50 transition"
              >
                <Icons.Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* BASIC MODE CONTROLS */}
          {mode === 'basic' ? (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {/* Type Filter */}
              <select
                value={basicType}
                onChange={(e) => {
                  setBasicType(e.target.value);
                  applyBasicFilters(e.target.value, basicStatus, basicAssignee, basicPriority, basicText);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-medium hover:bg-white focus:outline-none focus:ring-1 focus:ring-[#0052cc]"
              >
                <option value="All">Type: All</option>
                <option value="Epic">Epic</option>
                <option value="Story">Story</option>
                <option value="Task">Task</option>
                <option value="Bug">Bug</option>
                <option value="Subtask">Subtask</option>
              </select>

              {/* Status Filter */}
              <select
                value={basicStatus}
                onChange={(e) => {
                  setBasicStatus(e.target.value);
                  applyBasicFilters(basicType, e.target.value, basicAssignee, basicPriority, basicText);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-medium hover:bg-white focus:outline-none focus:ring-1 focus:ring-[#0052cc]"
              >
                <option value="All">Status: All</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Done">Done</option>
              </select>

              {/* Assignee Filter */}
              <select
                value={basicAssignee}
                onChange={(e) => {
                  setBasicAssignee(e.target.value);
                  applyBasicFilters(basicType, basicStatus, e.target.value, basicPriority, basicText);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-medium hover:bg-white focus:outline-none focus:ring-1 focus:ring-[#0052cc]"
              >
                <option value="All">Assignee: All</option>
                <option value="currentUser()">Current User</option>
                <option value="Sajidur Rahman">Sajidur Rahman</option>
                <option value="Sarah Connor">Sarah Connor</option>
                <option value="Alex Murphy">Alex Murphy</option>
                <option value="Elena Rostova">Elena Rostova</option>
              </select>

              {/* Priority Filter */}
              <select
                value={basicPriority}
                onChange={(e) => {
                  setBasicPriority(e.target.value);
                  applyBasicFilters(basicType, basicStatus, basicAssignee, e.target.value, basicText);
                }}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 font-medium hover:bg-white focus:outline-none focus:ring-1 focus:ring-[#0052cc]"
              >
                <option value="All">Priority: All</option>
                <option value="Highest">Highest</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
                <option value="Lowest">Lowest</option>
              </select>

              {/* Text Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Icons.Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Contains text..."
                  value={basicText}
                  onChange={(e) => {
                    setBasicText(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      applyBasicFilters(basicType, basicStatus, basicAssignee, basicPriority, basicText);
                    }
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0052cc] focus:bg-white"
                />
              </div>

              <button
                onClick={() => applyBasicFilters()}
                className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white text-xs font-semibold rounded-md shadow-sm transition"
              >
                Filter
              </button>
            </div>
          ) : (
            /* ADVANCED JQL MODE */
            <div className="space-y-2">
              <div className="relative flex items-center">
                <div className="absolute left-3 top-2.5 font-mono text-[11px] font-bold text-[#0052cc] select-none">
                  JQL
                </div>
                <textarea
                  rows={2}
                  value={jqlQuery}
                  onChange={(e) => setJqlQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                      e.preventDefault();
                      runSearch(jqlQuery);
                    }
                  }}
                  placeholder="e.g. project = 'ERP' AND status in ('In Progress', 'In Review') AND priority = 'High' ORDER BY created DESC"
                  className="w-full pl-12 pr-28 py-2 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052cc] focus:bg-white transition"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1.5">
                  <button
                    onClick={() => runSearch(jqlQuery)}
                    disabled={searching}
                    className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-semibold text-xs rounded-md shadow-sm transition disabled:opacity-50 flex items-center gap-1"
                  >
                    {searching ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icons.Search className="w-3.5 h-3.5" />
                    )}
                    Search
                  </button>
                </div>
              </div>

              {/* Quick Snippet Chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-slate-400 font-medium">Quick chips:</span>
                <button
                  onClick={() => insertSnippet("status = 'In Progress'")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 font-mono transition"
                >
                  status = 'In Progress'
                </button>
                <button
                  onClick={() => insertSnippet("assignee = currentUser()")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 font-mono transition"
                >
                  assignee = currentUser()
                </button>
                <button
                  onClick={() => insertSnippet("priority in ('Highest', 'High')")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 font-mono transition"
                >
                  priority in ('Highest', 'High')
                </button>
                <button
                  onClick={() => insertSnippet("resolution is EMPTY")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 font-mono transition"
                >
                  resolution is EMPTY
                </button>
                <button
                  onClick={() => insertSnippet("ORDER BY storypoints DESC")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 font-mono transition"
                >
                  ORDER BY storypoints DESC
                </button>
              </div>
            </div>
          )}

          {/* PARSED CLAUSES & STATUS */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700">
                {searching ? 'Executing query...' : `${totalCount} issues found`}
              </span>
              {parsedClauses.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500 text-[11px]">Clauses:</span>
                  {parsedClauses.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-[#0052cc] rounded font-mono text-[10px] border border-blue-200">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {searchError && (
              <div className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                Notice: {searchError}
              </div>
            )}
          </div>
        </div>

        {/* 2-PANE RESULTS VIEW: TABLE + DETAIL PREVIEW */}
        <div className="flex-1 flex overflow-hidden">
          {/* RESULTS TABLE */}
          <div className={`overflow-y-auto ${selectedIssue ? 'w-3/5 border-r border-slate-200' : 'w-full'}`}>
            {results.length === 0 && !searching ? (
              <div className="p-12 text-center text-slate-500">
                <Icons.Search className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="font-medium text-slate-700">No issues match the search criteria</p>
                <p className="text-xs text-slate-400 mt-1">Try modifying your JQL clauses or choose another saved filter.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Key</th>
                    <th className="py-2.5 px-3">Summary</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map(issue => {
                    const isSelected = selectedIssue?.id === issue.id;
                    return (
                      <tr
                        key={issue.id}
                        onClick={() => setSelectedIssue(issue)}
                        onDoubleClick={() => onSelectIssue(issue)}
                        className={`hover:bg-blue-50/50 cursor-pointer transition ${
                          isSelected ? 'bg-blue-50 border-l-4 border-l-[#0052cc]' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              issue.issueType === 'Bug'
                                ? 'bg-red-100 text-red-700'
                                : issue.issueType === 'Epic'
                                ? 'bg-purple-100 text-purple-700'
                                : issue.issueType === 'Story'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {issue.issueType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#0052cc] whitespace-nowrap">
                          {issue.key}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[260px] truncate" title={issue.summary}>
                          {issue.summary}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${
                              issue.status === 'Done'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : issue.status === 'In Progress'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : issue.status === 'In Review'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {issue.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                          {issue.priority}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-semibold shrink-0">
                            {issue.assigneeName ? issue.assigneeName.charAt(0) : '?'}
                          </div>
                          <span className="truncate max-w-[100px]">{issue.assigneeName || 'Unassigned'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-600">
                          {issue.storyPoints ?? '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* DETAIL PREVIEW PANE (CLASSIC JIRA 2-COLUMN SEARCH LAYOUT) */}
          {selectedIssue && (
            <div className="w-2/5 overflow-y-auto p-5 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#0052cc]">{selectedIssue.key}</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-xs text-slate-500">{selectedIssue.issueType}</span>
                </div>
                <button
                  onClick={() => onSelectIssue(selectedIssue)}
                  className="px-3 py-1 bg-[#0052cc] hover:bg-[#0047b3] text-white text-xs font-semibold rounded shadow-sm transition flex items-center gap-1"
                >
                  Open Full Detail
                  <Icons.ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedIssue.summary}
                </h2>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Status</span>
                    <span className="font-semibold text-slate-800">{selectedIssue.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Resolution</span>
                    <span className="font-semibold text-slate-800">{selectedIssue.resolution || 'Unresolved'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Assignee</span>
                    <span className="font-semibold text-slate-800">{selectedIssue.assigneeName || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Reporter</span>
                    <span className="font-semibold text-slate-800">{selectedIssue.reporterName || 'Administrator'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Priority</span>
                    <span className="font-semibold text-slate-800">{selectedIssue.priority}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Story Points</span>
                    <span className="font-semibold text-slate-800">{selectedIssue.storyPoints ?? 'None'}</span>
                  </div>
                </div>
              </div>

              {selectedIssue.description && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description</h4>
                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedIssue.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* SAVE FILTER MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Save Filter</h3>
            <p className="text-xs text-slate-500">
              Save your current search query so you can quickly access it or share it across the team.
            </p>

            <form onSubmit={handleSaveCurrentFilter} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Filter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Frontend Bugs"
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0052cc]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional brief description"
                  value={newFilterDesc}
                  onChange={(e) => setNewFilterDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0052cc]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">JQL Query</label>
                <div className="p-2.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px] break-all border border-slate-200">
                  {jqlQuery || 'No active query (matches all)'}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFilter}
                  className="px-4 py-1.5 text-xs bg-[#0052cc] hover:bg-[#0047b3] text-white font-semibold rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {savingFilter ? 'Saving...' : 'Save Filter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
