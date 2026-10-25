'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Project,
  Sprint,
  AppUser,
  CustomFieldDefinition,
  WorkflowStatus,
  ProjectComponent,
  ProjectVersion
} from '@/types/jira';
import { IssueTypeIcon, PriorityIcon, Icons } from './Icons';
import {
  createIssue,
  fetchCustomFields,
  fetchWorkflowStatuses,
  fetchComponents,
  fetchVersions,
  fetchSprints,
  fetchIssues
} from '@/lib/api';

interface CreateIssueModalProps {
  projects: Project[];
  currentProject: Project;
  sprints: Sprint[];
  users: AppUser[];
  defaultStatus?: string;
  defaultSprintId?: number | null;
  onClose: () => void;
  onIssueCreated: () => void;
}

export const CreateIssueModal: React.FC<CreateIssueModalProps> = ({
  projects,
  currentProject,
  sprints: initialSprints,
  users,
  defaultStatus = 'To Do',
  defaultSprintId,
  onClose,
  onIssueCreated
}) => {
  const [projectId, setProjectId] = useState<number>(currentProject.id);
  const [issueType, setIssueType] = useState<string>('Story');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [descTab, setDescTab] = useState<'write' | 'preview'>('write');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState(defaultStatus);
  const [assigneeName, setAssigneeName] = useState('');
  const [reporterName, setReporterName] = useState(users[0]?.displayName || 'Sajidur Rahman');
  const [storyPoints, setStoryPoints] = useState<number | undefined>(undefined);
  const [sprintId, setSprintId] = useState<number | undefined>(
    defaultSprintId !== undefined ? (defaultSprintId ?? undefined) : undefined
  );
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [fixVersion, setFixVersion] = useState<string>('');
  const [labels, setLabels] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [parentIssueKey, setParentIssueKey] = useState<string>('');
  const [availableParents, setAvailableParents] = useState<Issue[]>([]);
  
  // Custom fields: Loaded strictly from Project & Workspace Admin configuration
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<{ [key: string]: any }>({});
  
  // Metadata for project
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [projectSprints, setProjectSprints] = useState<Sprint[]>(initialSprints);
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  
  // Dialog options
  const [createAnother, setCreateAnother] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const summaryInputRef = useRef<HTMLInputElement>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Selected project object
  const activeProj = projects.find((p) => p.id === projectId) || currentProject;
  const currentUser = users.find((u) => u.displayName === 'Sajidur Rahman') || users[0];

  // Load project-specific metadata (Workflow, Sprints, Components, Releases, Admin Custom Fields)
  useEffect(() => {
    const loadProjectConfigs = async () => {
      try {
        const [cfData, stData, spData, cmpData, verData, allIssues] = await Promise.all([
          fetchCustomFields(projectId),
          fetchWorkflowStatuses(projectId),
          fetchSprints(projectId),
          fetchComponents(projectId),
          fetchVersions(projectId),
          fetchIssues({ projectId })
        ]);
        setCustomFields(cfData);
        setStatuses(stData);
        setProjectSprints(spData);
        setComponents(cmpData);
        setVersions(verData);
        setAvailableParents(allIssues.filter((i) => i.issueType !== 'Subtask'));

        // Adjust sprint selection if the current sprintId is not in the new project
        if (sprintId && !spData.some((s) => s.id === sprintId)) {
          const active = spData.find((s) => s.state === 'active');
          setSprintId(active ? active.id : undefined);
        }
      } catch (err) {
        console.error('Failed to load project configuration for issue creation', err);
      }
    };
    loadProjectConfigs();
  }, [projectId]);

  // Focus summary input on open
  useEffect(() => {
    summaryInputRef.current?.focus();
  }, []);

  // Keyboard shortcut listener: Ctrl+Enter (or Cmd+Enter) to submit; Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [summary, description, projectId, issueType, priority, status, assigneeName, reporterName, storyPoints, sprintId, selectedComponent, fixVersion, labels, dueDate, customFieldValues, createAnother]);

  // Markdown toolbar insertion helper
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = descTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end);
    const newText =
      description.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      description.substring(end);
    setDescription(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        end + prefix.length
      );
    }, 0);
  };

  const handleAssignToMe = () => {
    if (currentUser) {
      setAssigneeName(currentUser.displayName);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!summary.trim()) {
      setError('Please provide a summary for the issue.');
      summaryInputRef.current?.focus();
      return;
    }

    if (issueType === 'Subtask' && !parentIssueKey) {
      setError('Please select a parent issue for this subtask.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const selectedAssignee = users.find((u) => u.displayName === assigneeName);
      const selectedReporter = users.find((u) => u.displayName === reporterName) || currentUser;

      const customJson = Object.keys(customFieldValues).length > 0
        ? JSON.stringify(customFieldValues)
        : undefined;

      const created = await createIssue({
        projectId,
        issueType,
        summary: summary.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        assigneeName: assigneeName || undefined,
        assigneeEmail: selectedAssignee?.emailAddress,
        reporterName: selectedReporter?.displayName,
        reporterEmail: selectedReporter?.emailAddress,
        storyPoints: storyPoints,
        sprintId: sprintId,
        parentIssueKey: issueType === 'Subtask' ? parentIssueKey : undefined,
        components: selectedComponent ? [selectedComponent] : undefined,
        fixVersion: fixVersion || undefined,
        labels: labels ? labels.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        customFieldsJson: customJson
      });

      onIssueCreated();

      if (createAnother) {
        setSuccessToast(`Issue ${created.key} created successfully! You can create another.`);
        setSummary('');
        setDescription('');
        setCustomFieldValues({});
        summaryInputRef.current?.focus();
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create issue');
    } finally {
      setSubmitting(false);
    }
  };

  const activeSprint = projectSprints.find((s) => s.state === 'active');
  const futureSprints = projectSprints.filter((s) => s.state === 'future');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0052cc] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <IssueTypeIcon type={issueType} className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Create issue</h2>
              <p className="text-[11px] text-slate-500">
                Workspace project: <span className="font-semibold text-slate-700">{activeProj.name}</span> ({activeProj.key})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Required fields marked with <span className="text-rose-500 font-bold">*</span>
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-md transition cursor-pointer"
              title="Close (Esc)"
            >
              <Icons.X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success Toast when "Create Another" is enabled */}
        {successToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 font-sans text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <Icons.AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Project & Issue Type Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Project <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(parseInt(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
                <div className="absolute left-2.5 top-2.5 w-4 h-4 rounded bg-[#0052cc] text-white text-[9px] font-bold flex items-center justify-center pointer-events-none">
                  {activeProj.key.slice(0, 2)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Issue Type <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="Story">Story (Standard work unit)</option>
                  <option value="Task">Task (Technical or general task)</option>
                  <option value="Bug">Bug (Defect or malfunction)</option>
                  <option value="Epic">Epic (Large body of work)</option>
                  <option value="Subtask">Subtask (Granular sub-item)</option>
                </select>
                <div className="absolute left-2.5 top-2.5 pointer-events-none">
                  <IssueTypeIcon type={issueType} className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Subtask Parent Selector */}
          {issueType === 'Subtask' && (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5 animate-in fade-in">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Parent Issue <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={parentIssueKey}
                onChange={(e) => setParentIssueKey(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-xs bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="">— Select parent Story, Task, or Epic —</option>
                {availableParents.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.key} ({p.issueType}): {p.summary}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-blue-700">Subtasks in Jira must belong to an existing parent story, task, or bug.</p>
            </div>
          )}

          {/* Workflow Status Banner */}
          <div className="px-3.5 py-2 rounded-lg bg-blue-50/50 border border-blue-200/60 flex items-center justify-between text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Initial Workflow Status:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-800 text-[10px]">
                {status || 'To Do'}
              </span>
            </div>
            <span className="text-slate-400 hidden sm:inline">Defined in {activeProj.key} workflow scheme</span>
          </div>

          {/* Summary Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Summary <span className="text-rose-500">*</span>
            </label>
            <input
              ref={summaryInputRef}
              type="text"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What needs to be done? (e.g. Implement OAuth2 login flow)"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-hidden transition"
            />
          </div>

          {/* Description with Markdown Toolbar and Write/Preview Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description
              </label>
              <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-slate-100 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDescTab('write')}
                  className={`px-2.5 py-0.5 rounded font-semibold transition ${
                    descTab === 'write' ? 'bg-white shadow-2xs text-[#0052cc]' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setDescTab('preview')}
                  className={`px-2.5 py-0.5 rounded font-semibold transition ${
                    descTab === 'preview' ? 'bg-white shadow-2xs text-[#0052cc]' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {descTab === 'write' ? (
              <div className="border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600">
                {/* Markdown Formatting Toolbar */}
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 text-slate-600 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    className="p-1 hover:bg-slate-200 rounded font-bold text-xs"
                    title="Bold (**text**)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    className="p-1 hover:bg-slate-200 rounded italic font-serif text-xs"
                    title="Italic (*text*)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('~~', '~~')}
                    className="p-1 hover:bg-slate-200 rounded line-through text-xs"
                    title="Strikethrough"
                  >
                    S
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => insertFormatting('`', '`')}
                    className="p-1 hover:bg-slate-200 rounded font-mono text-[11px]"
                    title="Inline code (`code`)"
                  >
                    &lt;/&gt;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('\n```\n', '\n```\n')}
                    className="p-1 hover:bg-slate-200 rounded text-[11px] font-mono"
                    title="Code block"
                  >
                    Code
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => insertFormatting('- ')}
                    className="p-1 hover:bg-slate-200 rounded text-xs"
                    title="Bulleted list"
                  >
                    • List
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('1. ')}
                    className="p-1 hover:bg-slate-200 rounded text-xs"
                    title="Numbered list"
                  >
                    1. List
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('> ')}
                    className="p-1 hover:bg-slate-200 rounded text-xs"
                    title="Blockquote"
                  >
                    Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('[Link Text](', ')')}
                    className="p-1 hover:bg-slate-200 rounded text-xs"
                    title="Hyperlink"
                  >
                    Link
                  </button>
                </div>

                <textarea
                  ref={descTextareaRef}
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context, acceptance criteria, or technical details using Markdown..."
                  className="w-full px-3 py-2 text-xs focus:outline-hidden font-sans resize-y"
                />
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg p-3 min-h-[110px] bg-slate-50/50 prose prose-xs max-w-none text-slate-800">
                {description.trim() ? (
                  <div className="whitespace-pre-wrap">{description}</div>
                ) : (
                  <span className="text-slate-400 italic">No description entered yet.</span>
                )}
              </div>
            )}
          </div>

          {/* People: Assignee & Reporter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Assignee
                </label>
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  className="text-[11px] text-[#0052cc] hover:underline font-semibold"
                >
                  Assign to me
                </button>
              </div>
              <div className="relative">
                <select
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.displayName}>
                      {u.displayName} ({u.role || 'Member'})
                    </option>
                  ))}
                </select>
                <div className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none">
                  <Icons.User className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reporter
              </label>
              <div className="relative">
                <select
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.displayName}>
                      {u.displayName} ({u.emailAddress})
                    </option>
                  ))}
                </select>
                <div className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none">
                  <Icons.User className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Subtask Parent Selector */}
          {issueType === 'Subtask' && (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5 animate-in fade-in">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Parent Issue <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={parentIssueKey}
                onChange={(e) => setParentIssueKey(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-xs bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="">— Select parent Story, Task, or Epic —</option>
                {availableParents.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.key} ({p.issueType}): {p.summary}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-blue-700">Subtasks in Jira must belong to an existing parent story, task, or bug.</p>
            </div>
          )}

          {/* Priority, Story Points, Sprint */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="Highest">Highest (Blocker)</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Lowest">Lowest</option>
                </select>
                <div className="absolute left-2.5 top-2.5 pointer-events-none">
                  <PriorityIcon priority={priority} className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Story Points
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 5, 8].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setStoryPoints(pts)}
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold border transition ${
                        storyPoints === pts
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min="0"
                step="0.5"
                value={storyPoints ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                  setStoryPoints(val);
                }}
                placeholder="Story points (e.g. 5)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sprint
              </label>
              <select
                value={sprintId ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : undefined;
                  setSprintId(val);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="">Backlog (No Sprint)</option>
                {activeSprint && (
                  <option value={activeSprint.id}>
                    ⚡ {activeSprint.name} (Active)
                  </option>
                )}
                {futureSprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    📅 {s.name} (Future)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Component, Fix Version, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Component
              </label>
              <select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="">None</option>
                {components.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Fix Version
              </label>
              <select
                value={fixVersion}
                onChange={(e) => setFixVersion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="">None (Unscheduled)</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name} {v.isReleased ? '(Released)' : '(Unreleased)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Labels
            </label>
            <input
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="e.g. frontend, backend, security (comma separated)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* CUSTOM FIELDS: STRICTLY CONFIGURED BY PROJECT / WORKSPACE ADMIN */}
          {/* Regular developers / users cannot create field definitions here */}
          {/* ------------------------------------------------------------- */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.Sliders className="w-4 h-4 text-[#0052cc]" />
                <span className="font-bold text-slate-800 text-xs">
                  Project Custom Fields ({customFields.length})
                </span>
              </div>
              <span className="text-[10px] text-slate-400 italic">
                Configured by Project Admin
              </span>
            </div>

            {/* Informational banner: No regular developer can create custom fields */}
            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
              <Icons.Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Field schemas and screen layouts are governed by Project & Workspace Administrators in <span className="font-semibold text-slate-700">Project Settings &rarr; Workflow Studio & Fields</span>.
              </span>
            </div>

            {customFields.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {customFields.map((cf) => {
                  let opts: string[] = [];
                  if (cf.fieldType === 'select' && cf.optionsJson) {
                    try {
                      opts = JSON.parse(cf.optionsJson);
                    } catch {}
                  }

                  return (
                    <div key={cf.id} className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        {cf.name} {cf.isRequired && <span className="text-rose-500">*</span>}
                      </label>
                      {cf.fieldType === 'select' ? (
                        <select
                          value={customFieldValues[cf.fieldKey] || ''}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({
                              ...prev,
                              [cf.fieldKey]: e.target.value
                            }))
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        >
                          <option value="">— Select {cf.name} —</option>
                          {opts.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : cf.fieldType === 'checkbox' ? (
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={!!customFieldValues[cf.fieldKey]}
                            onChange={(e) =>
                              setCustomFieldValues((prev) => ({
                                ...prev,
                                [cf.fieldKey]: e.target.checked
                              }))
                            }
                            className="rounded border-slate-300 text-[#0052cc] w-4 h-4 cursor-pointer"
                          />
                          <span className="text-slate-700 text-xs">Enabled</span>
                        </label>
                      ) : (
                        <input
                          type={cf.fieldType === 'number' ? 'number' : cf.fieldType === 'url' ? 'url' : 'text'}
                          value={customFieldValues[cf.fieldKey] || ''}
                          onChange={(e) =>
                            setCustomFieldValues((prev) => ({
                              ...prev,
                              [cf.fieldKey]: e.target.value
                            }))
                          }
                          placeholder={
                            cf.fieldType === 'url'
                              ? 'https://github.com/org/repo/pull/123'
                              : `Enter ${cf.name.toLowerCase()}...`
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-[11px] italic py-1">
                No custom fields defined for this project yet.
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createAnother}
                onChange={(e) => setCreateAnother(e.target.checked)}
                className="rounded border-slate-300 text-[#0052cc] w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700">Create another</span>
            </label>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#0052cc] hover:bg-[#0047b3] disabled:opacity-50 text-white rounded-md text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Create</span>
                    <span className="text-[10px] text-blue-200 font-mono hidden sm:inline">Ctrl+↵</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
