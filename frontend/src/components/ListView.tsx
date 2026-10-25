'use client';

import React, { useState, useEffect } from 'react';
import { Project, Issue, AppUser, CustomFieldDefinition } from '@/types/jira';
import { IssueTypeIcon, PriorityIcon, Icons } from './Icons';
import { SpaceAvatar } from './SpaceAvatar';
import { updateIssue, fetchCustomFields, createCustomField } from '@/lib/api';

interface ListViewProps {
  project: Project;
  issues: Issue[];
  users: AppUser[];
  onSelectIssue: (issue: Issue) => void;
  onRefresh: () => void;
  onOpenCreateIssue: () => void;
}

export const ListView: React.FC<ListViewProps> = ({
  project,
  issues,
  users,
  onSelectIssue,
  onRefresh,
  onOpenCreateIssue
}) => {
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [sortField, setSortField] = useState<string>('key');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'assignee' | 'priority'>('none');

  // Column visibility settings
  const [showColumnsPopover, setShowColumnsPopover] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<{ [key: string]: boolean }>({
    key: true,
    summary: true,
    status: true,
    priority: true,
    assignee: true,
    storyPoints: true,
    dueDate: true,
    fixVersion: true,
    created: false
  });

  // Modal to add a new custom field column
  const [isAddingField, setIsAddingField] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldOptions, setFieldOptions] = useState('Option 1, Option 2, Option 3');

  const loadFields = async () => {
    try {
      const data = await fetchCustomFields(project.id);
      setCustomFields(data);
      // Ensure all custom fields default to visible in list view
      setVisibleColumns((prev) => {
        const next = { ...prev };
        data.forEach((cf) => {
          if (next[`custom_${cf.fieldKey}`] === undefined) {
            next[`custom_${cf.fieldKey}`] = cf.showInListView;
          }
        });
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFields();
  }, [project.id]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreateNewColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldName.trim()) return;
    try {
      const opts = fieldType === 'select'
        ? fieldOptions.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      await createCustomField({
        projectId: project.id,
        name: fieldName.trim(),
        fieldType,
        options: opts,
        showInListView: true
      });

      setFieldName('');
      setIsAddingField(false);
      await loadFields();
    } catch (err: any) {
      alert(err.message || 'Failed to create column');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const parseCustomFields = (json?: string): { [key: string]: any } => {
    if (!json) return {};
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  };

  const handleCustomFieldChange = async (issue: Issue, fieldKey: string, val: any) => {
    const current = parseCustomFields(issue.customFieldsJson);
    current[fieldKey] = val;
    const updatedJson = JSON.stringify(current);
    await updateIssue(issue.id, {
      customFieldsJson: updatedJson
    });
    onRefresh();
  };

  const filteredIssues = [...issues].filter((i) => {
    if (!filterText) return true;
    const s = filterText.toLowerCase();
    return (
      i.key.toLowerCase().includes(s) ||
      i.summary.toLowerCase().includes(s) ||
      (i.assigneeName && i.assigneeName.toLowerCase().includes(s)) ||
      i.status.toLowerCase().includes(s)
    );
  });

  const sortedIssues = filteredIssues.sort((a, b) => {
    let valA: any = (a as any)[sortField] ?? '';
    let valB: any = (b as any)[sortField] ?? '';
    if (sortField.startsWith('custom_')) {
      const k = sortField.replace('custom_', '');
      valA = parseCustomFields(a.customFieldsJson)[k] ?? '';
      valB = parseCustomFields(b.customFieldsJson)[k] ?? '';
    }
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Grouping
  const getGroupedIssues = (): { groupName: string; items: Issue[] }[] => {
    if (groupBy === 'none') {
      return [{ groupName: 'All Issues', items: sortedIssues }];
    }
    const map: { [k: string]: Issue[] } = {};
    sortedIssues.forEach((i) => {
      let g = 'Other';
      if (groupBy === 'status') g = i.status;
      else if (groupBy === 'priority') g = i.priority;
      else if (groupBy === 'assignee') g = i.assigneeName || 'Unassigned';
      if (!map[g]) map[g] = [];
      map[g].push(i);
    });
    return Object.entries(map).map(([groupName, items]) => ({ groupName, items }));
  };

  const grouped = getGroupedIssues();

  return (
    <div className="flex-1 min-w-0 w-full flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-white p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <span>Spaces</span>
            <span>/</span>
            <div className="flex items-center gap-1 font-medium text-slate-700">
              <SpaceAvatar project={project} size="xs" />
              <span>{project.name}</span>
            </div>
            <span>/</span>
            <span className="font-semibold text-slate-900">List</span>
          </div>
          <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight flex items-center gap-2">
            <span>List</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
              {sortedIssues.length} issues
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter list..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden w-48"
            />
          </div>

          {/* Group By selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700">
            <span className="text-slate-400">Group:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="none">None</option>
              <option value="status">Status</option>
              <option value="assignee">Assignee</option>
              <option value="priority">Priority</option>
            </select>
          </div>

          {/* Columns Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnsPopover(!showColumnsPopover)}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Icons.Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>Columns</span>
            </button>

            {showColumnsPopover && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-30 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Customize Columns</span>
                  <button
                    onClick={() => setShowColumnsPopover(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block pt-1">Standard Fields</span>
                  {[
                    { key: 'key', label: 'Key & Type' },
                    { key: 'summary', label: 'Summary' },
                    { key: 'status', label: 'Status' },
                    { key: 'priority', label: 'Priority' },
                    { key: 'assignee', label: 'Assignee' },
                    { key: 'storyPoints', label: 'Story Points' },
                    { key: 'dueDate', label: 'Due Date' },
                    { key: 'fixVersion', label: 'Fix Version' },
                    { key: 'created', label: 'Created Date' }
                  ].map((col) => (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={!!visibleColumns[col.key]}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">{col.label}</span>
                    </label>
                  ))}

                  {customFields.length > 0 && (
                    <>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block pt-2">Custom Columns</span>
                      {customFields.map((cf) => (
                        <label key={cf.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={!!visibleColumns[`custom_${cf.fieldKey}`]}
                            onChange={() => toggleColumn(`custom_${cf.fieldKey}`)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-slate-700 truncate">{cf.name}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between">
                  <button
                    onClick={() => {
                      setShowColumnsPopover(false);
                      setIsAddingField(true);
                    }}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    + New Custom Column
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Custom Column */}
          <button
            onClick={() => setIsAddingField(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-300"
          >
            <Icons.Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Add Column</span>
          </button>

          <button
            onClick={onOpenCreateIssue}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>New Issue</span>
          </button>
        </div>
      </div>

      {/* Add Custom Column Modal */}
      {isAddingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icons.Plus className="w-4 h-4 text-blue-600" />
                Add Custom Column / Field
              </h3>
              <button
                onClick={() => setIsAddingField(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewColumn} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Column Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Target Environment, PR Link, Risk Rating"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Field Type</label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                >
                  <option value="text">Text (Single-line)</option>
                  <option value="select">Dropdown (Single-select)</option>
                  <option value="number">Number</option>
                  <option value="url">URL Link</option>
                  <option value="checkbox">Checkbox (Yes/No)</option>
                  <option value="date">Date</option>
                </select>
              </div>

              {fieldType === 'select' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dropdown Options (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Development, Staging, Production"
                    value={fieldOptions}
                    onChange={(e) => setFieldOptions(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingField(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold shadow-xs"
                >
                  Create Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spreadsheet Table */}
      <div className="flex-1 overflow-auto mt-4 border border-slate-200 rounded-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 z-10 select-none">
            <tr>
              {visibleColumns.key && (
                <th
                  onClick={() => handleSort('key')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Key</span>
                    {sortField === 'key' && <span>{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
              )}

              {visibleColumns.summary && (
                <th
                  onClick={() => handleSort('summary')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition min-w-[280px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Summary</span>
                    {sortField === 'summary' && <span>{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
              )}

              {visibleColumns.status && (
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    {sortField === 'status' && <span>{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
              )}

              {visibleColumns.priority && (
                <th
                  onClick={() => handleSort('priority')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    {sortField === 'priority' && <span>{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
              )}

              {visibleColumns.assignee && (
                <th
                  onClick={() => handleSort('assigneeName')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Assignee</span>
                    {sortField === 'assigneeName' && <span>{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
              )}

              {visibleColumns.storyPoints && (
                <th
                  onClick={() => handleSort('storyPoints')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition text-right whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Points</span>
                    {sortField === 'storyPoints' && <span>{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
              )}

              {visibleColumns.dueDate && (
                <th className="py-3 px-4 whitespace-nowrap">Due Date</th>
              )}

              {visibleColumns.fixVersion && (
                <th className="py-3 px-4 whitespace-nowrap">Release</th>
              )}

              {/* Dynamic Custom Column Headers */}
              {customFields.map((cf) => {
                const colKey = `custom_${cf.fieldKey}`;
                if (!visibleColumns[colKey]) return null;
                return (
                  <th
                    key={cf.id}
                    onClick={() => handleSort(colKey)}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap bg-blue-50/20 text-blue-900 border-l border-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      <span>{cf.name}</span>
                      <span className="text-[10px] text-blue-500 font-normal">({cf.fieldType})</span>
                    </div>
                  </th>
                );
              })}

              {visibleColumns.created && (
                <th
                  onClick={() => handleSort('createdAt')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Created</span>
                    {sortField === 'createdAt' && <span>{sortAsc ? '▲' : '▼'}</span>}
                  </div>
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {grouped.map((group) => (
              <React.Fragment key={group.groupName}>
                {groupBy !== 'none' && (
                  <tr className="bg-slate-100/70 font-bold text-slate-700 text-xs">
                    <td colSpan={15} className="py-2 px-4">
                      {group.groupName} ({group.items.length})
                    </td>
                  </tr>
                )}

                {group.items.map((issue) => {
                  const customVals = parseCustomFields(issue.customFieldsJson);

                  return (
                    <tr
                      key={issue.id}
                      className="hover:bg-blue-50/40 transition group cursor-pointer"
                    >
                      {/* Key & Type */}
                      {visibleColumns.key && (
                        <td
                          onClick={() => onSelectIssue(issue)}
                          className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2 whitespace-nowrap"
                        >
                          <IssueTypeIcon type={issue.issueType} className="w-4 h-4 shrink-0" />
                          <span className="text-blue-600 hover:underline">{issue.key}</span>
                        </td>
                      )}

                      {/* Summary */}
                      {visibleColumns.summary && (
                        <td
                          onClick={() => onSelectIssue(issue)}
                          className="py-3 px-4 font-medium text-slate-900 max-w-md truncate"
                        >
                          {issue.summary}
                        </td>
                      )}

                      {/* Status (Inline Select) */}
                      {visibleColumns.status && (
                        <td className="py-2 px-4 whitespace-nowrap">
                          <select
                            value={issue.status}
                            onChange={async (e) => {
                              await updateIssue(issue.id, { status: e.target.value });
                              onRefresh();
                            }}
                            className="text-xs px-2 py-1 rounded-md font-semibold border border-slate-200 bg-white hover:border-slate-300 focus:outline-hidden cursor-pointer"
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="In Review">In Review</option>
                            <option value="Done">Done</option>
                          </select>
                        </td>
                      )}

                      {/* Priority (Inline Select) */}
                      {visibleColumns.priority && (
                        <td className="py-2 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <PriorityIcon priority={issue.priority} className="w-3.5 h-3.5" />
                            <select
                              value={issue.priority}
                              onChange={async (e) => {
                                await updateIssue(issue.id, { priority: e.target.value });
                                onRefresh();
                              }}
                              className="text-xs px-1.5 py-1 rounded bg-transparent hover:bg-slate-100 focus:outline-hidden cursor-pointer font-medium"
                            >
                              <option value="Highest">Highest</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                              <option value="Lowest">Lowest</option>
                            </select>
                          </div>
                        </td>
                      )}

                      {/* Assignee (Inline Select) */}
                      {visibleColumns.assignee && (
                        <td className="py-2 px-4 whitespace-nowrap">
                          <select
                            value={issue.assigneeName || ''}
                            onChange={async (e) => {
                              const newAssignee = e.target.value;
                              const user = users.find((u) => u.displayName === newAssignee);
                              await updateIssue(issue.id, {
                                assigneeName: newAssignee || undefined,
                                assigneeEmail: user?.emailAddress
                              });
                              onRefresh();
                            }}
                            className="text-xs px-2 py-1 rounded-md border border-slate-200 bg-white hover:border-slate-300 focus:outline-hidden cursor-pointer max-w-[140px] truncate"
                          >
                            <option value="">Unassigned</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.displayName}>
                                {u.displayName}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Story Points */}
                      {visibleColumns.storyPoints && (
                        <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-600">
                          {issue.storyPoints ?? '—'}
                        </td>
                      )}

                      {/* Due Date */}
                      {visibleColumns.dueDate && (
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '—'}
                        </td>
                      )}

                      {/* Fix Version */}
                      {visibleColumns.fixVersion && (
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {issue.fixVersion ? (
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px]">
                              {issue.fixVersion}
                            </span>
                          ) : '—'}
                        </td>
                      )}

                      {/* Dynamic Custom Column Cells with Inline Editing */}
                      {customFields.map((cf) => {
                        const colKey = `custom_${cf.fieldKey}`;
                        if (!visibleColumns[colKey]) return null;
                        const val = customVals[cf.fieldKey] ?? '';

                        let options: string[] = [];
                        if (cf.fieldType === 'select' && cf.optionsJson) {
                          try {
                            options = JSON.parse(cf.optionsJson);
                          } catch {}
                        }

                        return (
                          <td key={cf.id} className="py-2 px-4 whitespace-nowrap border-l border-slate-100">
                            {cf.fieldType === 'select' ? (
                              <select
                                value={val}
                                onChange={(e) => handleCustomFieldChange(issue, cf.fieldKey, e.target.value)}
                                className="text-xs px-2 py-1 rounded border border-slate-200 bg-white focus:outline-hidden"
                              >
                                <option value="">— None —</option>
                                {options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : cf.fieldType === 'checkbox' ? (
                              <input
                                type="checkbox"
                                checked={!!val}
                                onChange={(e) => handleCustomFieldChange(issue, cf.fieldKey, e.target.checked)}
                                className="rounded border-slate-300 text-blue-600"
                              />
                            ) : cf.fieldType === 'url' ? (
                              val ? (
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                                >
                                  <span>Link</span>
                                  <Icons.ChevronRight className="w-3 h-3" />
                                </a>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Add link..."
                                  onBlur={(e) => handleCustomFieldChange(issue, cf.fieldKey, e.target.value)}
                                  className="px-1.5 py-0.5 border border-transparent hover:border-slate-300 rounded text-xs w-28"
                                />
                              )
                            ) : (
                              <input
                                type={cf.fieldType === 'number' ? 'number' : 'text'}
                                defaultValue={val}
                                onBlur={(e) => handleCustomFieldChange(issue, cf.fieldKey, e.target.value)}
                                placeholder="—"
                                className="px-1.5 py-0.5 border border-transparent hover:border-slate-300 rounded text-xs w-24"
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Created */}
                      {visibleColumns.created && (
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}

            {sortedIssues.length === 0 && (
              <tr>
                <td colSpan={15} className="py-8 text-center text-slate-400">
                  No issues found matching your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
