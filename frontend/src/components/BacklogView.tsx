'use client';

import React, { useState, useEffect } from 'react';
import { Project, Issue, Sprint, ProjectVersion } from '@/types/jira';
import { IssueTypeIcon, PriorityIcon, Icons } from './Icons';
import { SpaceAvatar } from './SpaceAvatar';
import { createIssue, fetchVersions, updateIssue, updateSprint, deleteSprint, completeSprint, updateProject } from '@/lib/api';

interface BacklogViewProps {
  project: Project;
  sprints: Sprint[];
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  onMoveIssueToSprint: (issueId: number, sprintId: number | null) => Promise<void>;
  onStartSprint: (sprintId: number) => Promise<void>;
  onCompleteSprint: (sprintId: number) => Promise<void>;
  onCreateSprint: (name: string, goal: string) => Promise<void>;
  onOpenCreateIssue: (sprintId?: number | null) => void;
  onRefresh: () => void;
  onProjectUpdated?: (p: Project) => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  project,
  sprints,
  issues,
  onSelectIssue,
  onMoveIssueToSprint,
  onStartSprint,
  onCompleteSprint,
  onCreateSprint,
  onOpenCreateIssue,
  onRefresh,
  onProjectUpdated
}) => {
  // On-the-fly space name editing
  const [isEditingSpaceName, setIsEditingSpaceName] = useState(false);
  const [tempSpaceName, setTempSpaceName] = useState(project.name);
  const [savingSpaceName, setSavingSpaceName] = useState(false);

  useEffect(() => {
    setTempSpaceName(project.name);
  }, [project.name]);

  const handleSaveSpaceName = async () => {
    if (!tempSpaceName.trim() || tempSpaceName.trim() === project.name) {
      setIsEditingSpaceName(false);
      setTempSpaceName(project.name);
      return;
    }
    try {
      setSavingSpaceName(true);
      const updated = await updateProject(project.id, { name: tempSpaceName.trim() });
      if (onProjectUpdated) onProjectUpdated(updated);
      setIsEditingSpaceName(false);
    } catch (err) {
      console.error('Failed to update space name', err);
      alert('Failed to save space name');
      setTempSpaceName(project.name);
      setIsEditingSpaceName(false);
    } finally {
      setSavingSpaceName(false);
    }
  };

  const handleCancelSpaceName = () => {
    setTempSpaceName(project.name);
    setIsEditingSpaceName(false);
  };
  // Modal states
  const [showNewSprintModal, setShowNewSprintModal] = useState(false);
  const [newSprintName, setNewSprintName] = useState(`Sprint ${sprints.length + 1}`);
  const [newSprintGoal, setNewSprintGoal] = useState('');

  // Start Sprint Modal state
  const [startingSprint, setStartingSprint] = useState<Sprint | null>(null);
  const [startSprintDuration, setStartSprintDuration] = useState('2 weeks');
  const [startSprintStartDate, setStartSprintStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [startSprintEndDate, setStartSprintEndDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [startSprintGoal, setStartSprintGoal] = useState('');

  // Edit Sprint Modal state
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editSprintName, setEditSprintName] = useState('');
  const [editSprintStartDate, setEditSprintStartDate] = useState('');
  const [editSprintEndDate, setEditSprintEndDate] = useState('');
  const [editSprintGoal, setEditSprintGoal] = useState('');

  // Complete Sprint Modal state
  const [completingSprint, setCompletingSprint] = useState<Sprint | null>(null);
  const [completeMoveTarget, setCompleteMoveTarget] = useState<string>('backlog'); // 'backlog' or sprintId string

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [recentlyUpdated, setRecentlyUpdated] = useState(false);
  const [selectedEpicFilter, setSelectedEpicFilter] = useState<string | null>(null);
  const [selectedVersionFilter, setSelectedVersionFilter] = useState<string | null>(null);

  // Left Drawer: 'none' | 'versions' | 'epics'
  const [activeSidePanel, setActiveSidePanel] = useState<'none' | 'versions' | 'epics'>('none');
  const [versions, setVersions] = useState<ProjectVersion[]>([]);

  // Right Drawer: Selected issue for split-pane view
  const [selectedBacklogIssue, setSelectedBacklogIssue] = useState<Issue | null>(null);

  // Inline issue creator state: sprintId (number | null) -> active
  const [inlineCreateSprintId, setInlineCreateSprintId] = useState<number | null | 'closed'>('closed');
  const [inlineSummary, setInlineSummary] = useState('');
  const [inlineType, setInlineType] = useState('Story');
  const [isSubmittingInline, setIsSubmittingInline] = useState(false);

  // Inline Story Points Editing: issueId -> value
  const [editingStoryPointsIssueId, setEditingStoryPointsIssueId] = useState<number | null>(null);
  const [editingPointsValue, setEditingPointsValue] = useState<string>('');

  useEffect(() => {
    fetchVersions(project.id).then(setVersions).catch(() => {});
  }, [project.id]);

  // Epics extracted from issues
  const epics = issues.filter(
    (i) => i.issueType?.toLowerCase() === 'epic' || i.key.startsWith('EPIC')
  );

  const handleCreateSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName.trim()) return;
    await onCreateSprint(newSprintName.trim(), newSprintGoal.trim());
    setShowNewSprintModal(false);
    setNewSprintGoal('');
  };

  const handleInlineCreateSubmit = async (e: React.FormEvent, sprintId: number | null) => {
    e.preventDefault();
    if (!inlineSummary.trim() || isSubmittingInline) return;
    setIsSubmittingInline(true);
    try {
      await createIssue({
        projectId: project.id,
        summary: inlineSummary.trim(),
        issueType: inlineType,
        sprintId: sprintId,
        status: 'To Do',
        priority: 'Medium'
      });
      setInlineSummary('');
      setInlineCreateSprintId('closed');
      onRefresh();
    } catch (err) {
      alert('Failed to create issue inline');
    } finally {
      setIsSubmittingInline(false);
    }
  };

  // Start Sprint Handlers
  function openStartSprintModal(sprint: Sprint) {
    setStartingSprint(sprint);
    setStartSprintDuration('2 weeks');
    const start = new Date();
    const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    setStartSprintStartDate(start.toISOString().slice(0, 10));
    setStartSprintEndDate(end.toISOString().slice(0, 10));
    setStartSprintGoal(sprint.goal || '');
  }

  function handleDurationChange(duration: string) {
    setStartSprintDuration(duration);
    const start = new Date(startSprintStartDate || Date.now());
    let days = 14;
    if (duration === '1 week') days = 7;
    else if (duration === '2 weeks') days = 14;
    else if (duration === '3 weeks') days = 21;
    else if (duration === '4 weeks') days = 28;
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setStartSprintEndDate(end.toISOString().slice(0, 10));
  }

  async function handleConfirmStartSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!startingSprint) return;
    try {
      await updateSprint(startingSprint.id, {
        startDate: startSprintStartDate ? new Date(startSprintStartDate).toISOString() : undefined,
        endDate: startSprintEndDate ? new Date(startSprintEndDate).toISOString() : undefined,
        goal: startSprintGoal
      });
      await onStartSprint(startingSprint.id);
      setStartingSprint(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to start sprint');
    }
  }

  // Edit Sprint Handlers
  function openEditSprintModal(sprint: Sprint) {
    setEditingSprint(sprint);
    setEditSprintName(sprint.name);
    setEditSprintStartDate(sprint.startDate ? sprint.startDate.slice(0, 10) : '');
    setEditSprintEndDate(sprint.endDate ? sprint.endDate.slice(0, 10) : '');
    setEditSprintGoal(sprint.goal || '');
  }

  async function handleSaveEditSprint(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSprint || !editSprintName.trim()) return;
    try {
      await updateSprint(editingSprint.id, {
        name: editSprintName.trim(),
        startDate: editSprintStartDate ? new Date(editSprintStartDate).toISOString() : undefined,
        endDate: editSprintEndDate ? new Date(editSprintEndDate).toISOString() : undefined,
        goal: editSprintGoal.trim() || undefined
      });
      setEditingSprint(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update sprint');
    }
  }

  // Delete Sprint Handler
  async function handleDeleteSprint(sprintId: number) {
    if (confirm('Delete this sprint? Any issues in this sprint will be returned to the backlog.')) {
      try {
        await deleteSprint(sprintId);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'Failed to delete sprint');
      }
    }
  }

  // Complete Sprint Handlers
  function openCompleteSprintModal(sprint: Sprint) {
    setCompletingSprint(sprint);
    setCompleteMoveTarget('backlog');
  }

  async function handleConfirmCompleteSprint() {
    if (!completingSprint) return;
    try {
      const targetSprintId = completeMoveTarget === 'backlog' ? null : Number(completeMoveTarget);
      await completeSprint(completingSprint.id, targetSprintId);
      setCompletingSprint(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to complete sprint');
    }
  }

  // Inline Story Points Editing
  async function handleSaveStoryPoints(issueId: number) {
    const pts = editingPointsValue.trim() === '' ? null : Number(editingPointsValue);
    setEditingStoryPointsIssueId(null);
    try {
      await updateIssue(issueId, { storyPoints: pts });
      onRefresh();
    } catch (err) {
      console.error('Failed to update story points', err);
    }
  }

  const getPointsBreakdown = (sprintIssues: Issue[]) => {
    let todo = 0;
    let inProg = 0;
    let done = 0;
    sprintIssues.forEach((i) => {
      const pts = i.storyPoints || 0;
      if (i.status === 'Done') done += pts;
      else if (i.status === 'In Progress' || i.status === 'In Review') inProg += pts;
      else todo += pts;
    });
    return { todo, inProg, done };
  };

  // Filter issues based on toolbar
  const filterIssue = (i: Issue) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = i.summary.toLowerCase().includes(q) || i.key.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (onlyMyIssues && i.assigneeName !== 'Sajidur Rahman') {
      return false;
    }
    if (selectedEpicFilter) {
      if (selectedEpicFilter === 'none') {
        if (i.epicKey) return false;
      } else if (i.epicKey !== selectedEpicFilter && i.key !== selectedEpicFilter) {
        return false;
      }
    }
    if (selectedVersionFilter) {
      if (i.fixVersion !== selectedVersionFilter) return false;
    }
    return true;
  };

  const backlogIssues = issues.filter((i) => !i.sprintId).filter(filterIssue);

  return (
    <div className="flex-1 min-w-0 w-full flex overflow-hidden bg-white select-none">
      {/* ------------------------------------------------------------- */}
      {/* LEFT DRAWER: VERSIONS OR EPICS PANEL */}
      {/* ------------------------------------------------------------- */}
      {activeSidePanel !== 'none' && (
        <aside className="w-64 border-r border-[#EBECF0] bg-[#FAFBFC] flex flex-col shrink-0 animate-in slide-in-from-left-2 duration-150">
          <div className="p-3 border-b border-[#EBECF0] flex items-center justify-between">
            <span className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">
              {activeSidePanel === 'epics' ? 'Epics' : 'Versions'}
            </span>
            <button
              onClick={() => setActiveSidePanel('none')}
              className="text-[#5E6C84] hover:text-[#172B4D] p-1 rounded hover:bg-[#EBECF0]"
            >
              <Icons.X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            {activeSidePanel === 'epics' ? (
              <>
                <button
                  onClick={() => setSelectedEpicFilter(null)}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                    selectedEpicFilter === null
                      ? 'bg-[#DEEBFF] text-[#0052CC] font-bold'
                      : 'text-[#172B4D] hover:bg-[#EBECF0]'
                  }`}
                >
                  All issues
                </button>
                <button
                  onClick={() => setSelectedEpicFilter('none')}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                    selectedEpicFilter === 'none'
                      ? 'bg-[#DEEBFF] text-[#0052CC] font-bold'
                      : 'text-[#172B4D] hover:bg-[#EBECF0]'
                  }`}
                >
                  Issues without epics
                </button>
                <div className="pt-2 border-t border-[#EBECF0] my-1 text-[11px] font-semibold text-[#5E6C84] uppercase px-2">
                  Project Epics ({epics.length})
                </div>
                {epics.map((epic) => {
                  const epicIssues = issues.filter((i) => i.epicKey === epic.key);
                  const isSelected = selectedEpicFilter === epic.key;
                  return (
                    <div
                      key={epic.id}
                      onClick={() => setSelectedEpicFilter(isSelected ? null : epic.key)}
                      className={`p-2.5 rounded border transition cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50 border-purple-300 text-purple-900 font-semibold'
                          : 'bg-white border-[#DFE1E6] hover:border-purple-200 text-[#172B4D]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-purple-700">{epic.key}</span>
                        <span className="text-[10px] text-[#5E6C84]">{epicIssues.length} issues</span>
                      </div>
                      <div className="truncate text-xs font-medium mt-0.5">{epic.summary}</div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectedVersionFilter(null)}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                    selectedVersionFilter === null
                      ? 'bg-[#DEEBFF] text-[#0052CC] font-bold'
                      : 'text-[#172B4D] hover:bg-[#EBECF0]'
                  }`}
                >
                  All versions
                </button>
                <div className="pt-2 border-t border-[#EBECF0] my-1 text-[11px] font-semibold text-[#5E6C84] uppercase px-2">
                  Fix Versions ({versions.length})
                </div>
                {versions.map((ver) => {
                  const verIssues = issues.filter((i) => i.fixVersion === ver.name);
                  const isSelected = selectedVersionFilter === ver.name;
                  return (
                    <div
                      key={ver.id}
                      onClick={() => setSelectedVersionFilter(isSelected ? null : ver.name)}
                      className={`p-2.5 rounded border transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                          : 'bg-white border-[#DFE1E6] hover:border-blue-200 text-[#172B4D]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{ver.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          ver.isReleased ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {ver.isReleased ? 'Released' : 'Unreleased'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#5E6C84] mt-1">
                        {verIssues.length} issues linked
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </aside>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN BACKLOG CONTENT AREA */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-white p-6">
        {/* Top Header */}
        <div className="pb-4 border-b border-[#EBECF0] shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-[#5E6C84] mb-1">
            <span>Spaces</span>
            <span>/</span>
            {isEditingSpaceName ? (
              <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  autoFocus
                  disabled={savingSpaceName}
                  value={tempSpaceName}
                  onChange={(e) => setTempSpaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveSpaceName();
                    if (e.key === 'Escape') handleCancelSpaceName();
                  }}
                  className="text-xs font-semibold text-[#172B4D] px-1.5 py-0.5 border border-[#0052cc] rounded-sm bg-white focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSaveSpaceName}
                  disabled={savingSpaceName}
                  className="p-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition"
                  title="Save (Enter)"
                >
                  <Icons.Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelSpaceName}
                  disabled={savingSpaceName}
                  className="p-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer transition"
                  title="Cancel (Esc)"
                >
                  <Icons.X className="w-3 h-3" />
                </button>
              </span>
            ) : (
              <span
                onClick={() => setIsEditingSpaceName(true)}
                className="group inline-flex items-center gap-1.5 hover:text-[#172B4D] hover:bg-slate-100 px-1 py-0.5 rounded cursor-pointer transition"
                title="Click to edit space name"
              >
                <SpaceAvatar project={project} size="xs" />
                <span className="hover:underline font-medium">{project.name}</span>
                <Icons.Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            )}
            <span>/</span>
            <span className="text-[#172B4D] font-semibold">Backlog</span>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight">
              Backlog
            </h1>

            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                className="p-1.5 text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded transition cursor-pointer"
                title="Refresh"
              >
                <Icons.Refresh className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowNewSprintModal(true)}
                className="bg-[#091E420F] hover:bg-[#091E4214] text-[#172B4D] px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Icons.Plus className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Create sprint</span>
              </button>

              <button
                onClick={() => onOpenCreateIssue(null)}
                className="bg-[#0052CC] hover:bg-[#0065FF] text-white px-3 py-1.5 rounded text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>Create issue</span>
              </button>
            </div>
          </div>

          {/* Quick Filters Toolbar */}
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Icons.Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B778C]" />
                <input
                  type="text"
                  placeholder="Search backlog..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 border border-[#DFE1E6] rounded text-xs text-[#172B4D] placeholder-[#6B778C] focus:border-[#4C9AFF] focus:ring-1 focus:ring-[#4C9AFF] focus:outline-hidden w-48 transition"
                />
              </div>

              <button
                onClick={() => setOnlyMyIssues(!onlyMyIssues)}
                className={`px-3 py-1 rounded text-xs font-semibold border transition cursor-pointer ${
                  onlyMyIssues
                    ? 'bg-[#DEEBFF] text-[#0052CC] border-[#4C9AFF]'
                    : 'bg-[#091E4208] text-[#42526E] border-transparent hover:bg-[#091E4214]'
                }`}
              >
                Only my issues
              </button>

              <button
                onClick={() => setRecentlyUpdated(!recentlyUpdated)}
                className={`px-3 py-1 rounded text-xs font-semibold border transition cursor-pointer ${
                  recentlyUpdated
                    ? 'bg-[#DEEBFF] text-[#0052CC] border-[#4C9AFF]'
                    : 'bg-[#091E4208] text-[#42526E] border-transparent hover:bg-[#091E4214]'
                }`}
              >
                Recently updated
              </button>

              {(selectedEpicFilter || selectedVersionFilter) && (
                <button
                  onClick={() => {
                    setSelectedEpicFilter(null);
                    setSelectedVersionFilter(null);
                  }}
                  className="text-xs text-[#DE350B] hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Left Panel Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveSidePanel(activeSidePanel === 'epics' ? 'none' : 'epics')}
                className={`px-2.5 py-1 text-xs font-semibold rounded border transition cursor-pointer flex items-center gap-1.5 ${
                  activeSidePanel === 'epics'
                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                    : 'bg-[#FAFBFC] text-[#42526E] border-[#DFE1E6] hover:bg-[#EBECF0]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <span>Epics</span>
              </button>

              <button
                onClick={() => setActiveSidePanel(activeSidePanel === 'versions' ? 'none' : 'versions')}
                className={`px-2.5 py-1 text-xs font-semibold rounded border transition cursor-pointer flex items-center gap-1.5 ${
                  activeSidePanel === 'versions'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-[#FAFBFC] text-[#42526E] border-[#DFE1E6] hover:bg-[#EBECF0]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#0052CC]" />
                <span>Versions</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sprints Containers */}
        <div className="space-y-5 mt-5">
          {sprints.map((sprint) => {
            const sprintIssues = issues
              .filter((i) => i.sprintId === sprint.id)
              .filter(filterIssue);
            const pts = getPointsBreakdown(sprintIssues);
            const isActive = sprint.state === 'active';
            const isClosed = sprint.state === 'closed';
            const isInlineOpen = inlineCreateSprintId === sprint.id;

            return (
              <div
                key={sprint.id}
                className="rounded border border-[#DFE1E6] bg-white overflow-hidden shadow-2xs"
              >
                {/* Sprint Header */}
                <div className="px-4 py-2.5 bg-[#F4F5F7] border-b border-[#EBECF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-[#172B4D] text-sm">{sprint.name}</span>

                    {sprint.startDate && sprint.endDate && (
                      <span className="text-xs text-[#5E6C84]">
                        {new Date(sprint.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} –{' '}
                        {new Date(sprint.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}

                    <span className="text-xs text-[#5E6C84]">
                      ({sprintIssues.length} issues)
                    </span>

                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DEEBFF] text-[#0052CC] uppercase tracking-wider">
                        Active
                      </span>
                    )}
                    {isClosed && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DFE1E6] text-[#5E6C84] uppercase">
                        Closed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Story points pills */}
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      <span
                        title="To Do points"
                        className="w-5 h-5 rounded-full bg-[#DFE1E6] text-[#172B4D] flex items-center justify-center"
                      >
                        {pts.todo}
                      </span>
                      <span
                        title="In Progress points"
                        className="w-5 h-5 rounded-full bg-[#DEEBFF] text-[#0052CC] flex items-center justify-center"
                      >
                        {pts.inProg}
                      </span>
                      <span
                        title="Done points"
                        className="w-5 h-5 rounded-full bg-[#E3FCEF] text-[#006644] flex items-center justify-center"
                      >
                        {pts.done}
                      </span>
                    </div>

                    {/* Actions */}
                    {isActive && (
                      <button
                        onClick={() => openCompleteSprintModal(sprint)}
                        className="px-3 py-1 rounded bg-[#091E420F] hover:bg-[#091E4214] text-[#172B4D] text-xs font-semibold transition cursor-pointer"
                      >
                        Complete sprint
                      </button>
                    )}
                    {sprint.state === 'future' && (
                      <button
                        onClick={() => openStartSprintModal(sprint)}
                        className="px-3 py-1 rounded bg-[#0052CC] hover:bg-[#0065FF] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span>Start sprint</span>
                      </button>
                    )}

                    {/* Sprint Configuration Action Menu */}
                    <div className="relative group">
                      <button
                        className="p-1 rounded text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0] transition"
                        title="Sprint settings"
                      >
                        <Icons.Sliders className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded shadow-lg border border-[#DFE1E6] py-1 hidden group-hover:block z-20 text-xs">
                        <button
                          onClick={() => openEditSprintModal(sprint)}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#F4F5F7] text-[#172B4D]"
                        >
                          Edit sprint
                        </button>
                        <button
                          onClick={() => handleDeleteSprint(sprint.id)}
                          className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600"
                        >
                          Delete sprint
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {sprint.goal && (
                  <div className="px-4 py-1.5 bg-[#FAFBFC] border-b border-[#EBECF0] text-xs text-[#5E6C84] italic">
                    Goal: {sprint.goal}
                  </div>
                )}

                {/* Sprint Issues List */}
                <div className="divide-y divide-[#EBECF0]">
                  {sprintIssues.map((issue) => {
                    const isSelected = selectedBacklogIssue?.id === issue.id;
                    const isEditingPoints = editingStoryPointsIssueId === issue.id;

                    return (
                      <div
                        key={issue.id}
                        onClick={() => {
                          setSelectedBacklogIssue(issue);
                          onSelectIssue(issue);
                        }}
                        className={`px-4 py-2 hover:bg-[#F4F5F7] transition flex items-center justify-between gap-3 cursor-pointer group select-none text-xs ${
                          isSelected ? 'bg-[#DEEBFF]/40 border-l-3 border-l-[#0052CC]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <IssueTypeIcon type={issue.issueType} className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-semibold text-[#5E6C84] group-hover:text-[#0052CC] group-hover:underline shrink-0 text-[11px]">
                            {issue.key}
                          </span>
                          <span className="text-[#172B4D] font-normal truncate">
                            {issue.summary}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {issue.epicKey && (
                            <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-[#EAE6FF] text-[#403294] tracking-wide uppercase">
                              {issue.epicKey}
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider ${
                              issue.status === 'Done'
                                ? 'bg-[#E3FCEF] text-[#006644]'
                                : issue.status === 'In Progress'
                                ? 'bg-[#DEEBFF] text-[#0052CC]'
                                : issue.status === 'In Review'
                                ? 'bg-[#FFF0B3] text-[#172B4D]'
                                : 'bg-[#DFE1E6] text-[#42526E]'
                            }`}
                          >
                            {issue.status}
                          </span>

                          <PriorityIcon priority={issue.priority} className="w-3.5 h-3.5" />

                          {/* Quick inline story points editor */}
                          {isEditingPoints ? (
                            <input
                              type="number"
                              autoFocus
                              value={editingPointsValue}
                              onChange={(e) => setEditingPointsValue(e.target.value)}
                              onBlur={() => handleSaveStoryPoints(issue.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveStoryPoints(issue.id);
                                if (e.key === 'Escape') setEditingStoryPointsIssueId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-10 px-1 py-0.5 text-center text-[10px] font-bold border border-[#0052CC] rounded bg-white focus:outline-none"
                            />
                          ) : (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStoryPointsIssueId(issue.id);
                                setEditingPointsValue(issue.storyPoints != null ? String(issue.storyPoints) : '');
                              }}
                              title="Click to edit story points"
                              className="px-2 py-0.5 rounded-full bg-[#DFE1E6] hover:bg-[#C1C7D0] text-[#172B4D] text-[10px] font-bold cursor-pointer transition"
                            >
                              {issue.storyPoints != null ? issue.storyPoints : '-'}
                            </span>
                          )}

                          {issue.assigneeName ? (
                            <div
                              className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[10px] font-bold flex items-center justify-center"
                              title={issue.assigneeName}
                            >
                              {issue.assigneeName.slice(0, 2).toUpperCase()}
                            </div>
                          ) : (
                            <div
                              className="w-5 h-5 rounded-full border border-dashed border-[#DFE1E6] text-[#6B778C] flex items-center justify-center text-[10px]"
                              title="Unassigned"
                            >
                              <Icons.User className="w-3 h-3" />
                            </div>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveIssueToSprint(issue.id, null);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-[#5E6C84] hover:text-[#DE350B] px-1.5 py-0.5 rounded hover:bg-[#EBECF0] transition"
                            title="Move to Backlog"
                          >
                            To Backlog
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {sprintIssues.length === 0 && !isInlineOpen && (
                    <div className="py-5 text-center text-xs text-[#6B778C]">
                      Plan a sprint by dragging or creating issues here.
                    </div>
                  )}
                </div>

                {/* Inline Create Issue Form */}
                {isInlineOpen ? (
                  <form
                    onSubmit={(e) => handleInlineCreateSubmit(e, sprint.id)}
                    className="p-3 bg-[#FAFBFC] border-t border-[#EBECF0] flex items-center gap-2"
                  >
                    <select
                      value={inlineType}
                      onChange={(e) => setInlineType(e.target.value)}
                      className="text-xs bg-white border border-[#DFE1E6] rounded px-2 py-1.5 font-semibold text-[#172B4D]"
                    >
                      <option value="Story">Story</option>
                      <option value="Task">Task</option>
                      <option value="Bug">Bug</option>
                    </select>

                    <input
                      type="text"
                      autoFocus
                      placeholder="What needs to be done?"
                      value={inlineSummary}
                      onChange={(e) => setInlineSummary(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 bg-white border border-[#4C9AFF] rounded focus:outline-none"
                    />

                    <button
                      type="submit"
                      disabled={isSubmittingInline || !inlineSummary.trim()}
                      className="px-3 py-1.5 bg-[#0052CC] hover:bg-[#0065FF] text-white text-xs font-bold rounded disabled:opacity-50 transition"
                    >
                      {isSubmittingInline ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInlineCreateSprintId('closed')}
                      className="text-[#5E6C84] hover:text-[#172B4D] p-1.5 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="px-4 py-2 bg-[#FAFBFC] border-t border-[#EBECF0]">
                    <button
                      onClick={() => {
                        setInlineCreateSprintId(sprint.id);
                        setInlineSummary('');
                      }}
                      className="text-xs font-semibold text-[#5E6C84] hover:text-[#0052CC] flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Icons.Plus className="w-3.5 h-3.5 text-[#0052CC]" />
                      <span>Create issue</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Backlog Container */}
          <div className="rounded border border-[#DFE1E6] bg-white overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-[#F4F5F7] border-b border-[#EBECF0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#172B4D] text-sm">Backlog</span>
                <span className="text-xs text-[#5E6C84]">({backlogIssues.length} issues)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewSprintModal(true)}
                  className="bg-[#091E420F] hover:bg-[#091E4214] text-[#172B4D] px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer"
                >
                  Create sprint
                </button>
              </div>
            </div>

            {/* Backlog Issues List */}
            <div className="divide-y divide-[#EBECF0]">
              {backlogIssues.map((issue) => {
                const isSelected = selectedBacklogIssue?.id === issue.id;
                const isEditingPoints = editingStoryPointsIssueId === issue.id;

                return (
                  <div
                    key={issue.id}
                    onClick={() => {
                      setSelectedBacklogIssue(issue);
                      onSelectIssue(issue);
                    }}
                    className={`px-4 py-2 hover:bg-[#F4F5F7] transition flex items-center justify-between gap-3 cursor-pointer group select-none text-xs ${
                      isSelected ? 'bg-[#DEEBFF]/40 border-l-3 border-l-[#0052CC]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <IssueTypeIcon type={issue.issueType} className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold text-[#5E6C84] group-hover:text-[#0052CC] group-hover:underline shrink-0 text-[11px]">
                        {issue.key}
                      </span>
                      <span className="text-[#172B4D] font-normal truncate">
                        {issue.summary}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {issue.epicKey && (
                        <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-[#EAE6FF] text-[#403294] tracking-wide uppercase">
                          {issue.epicKey}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider ${
                          issue.status === 'Done'
                            ? 'bg-[#E3FCEF] text-[#006644]'
                            : issue.status === 'In Progress'
                            ? 'bg-[#DEEBFF] text-[#0052CC]'
                            : issue.status === 'In Review'
                            ? 'bg-[#FFF0B3] text-[#172B4D]'
                            : 'bg-[#DFE1E6] text-[#42526E]'
                        }`}
                      >
                        {issue.status}
                      </span>

                      <PriorityIcon priority={issue.priority} className="w-3.5 h-3.5" />

                      {isEditingPoints ? (
                        <input
                          type="number"
                          autoFocus
                          value={editingPointsValue}
                          onChange={(e) => setEditingPointsValue(e.target.value)}
                          onBlur={() => handleSaveStoryPoints(issue.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveStoryPoints(issue.id);
                            if (e.key === 'Escape') setEditingStoryPointsIssueId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-10 px-1 py-0.5 text-center text-[10px] font-bold border border-[#0052CC] rounded bg-white focus:outline-none"
                        />
                      ) : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStoryPointsIssueId(issue.id);
                            setEditingPointsValue(issue.storyPoints != null ? String(issue.storyPoints) : '');
                          }}
                          title="Click to edit story points"
                          className="px-2 py-0.5 rounded-full bg-[#DFE1E6] hover:bg-[#C1C7D0] text-[#172B4D] text-[10px] font-bold cursor-pointer transition"
                        >
                          {issue.storyPoints != null ? issue.storyPoints : '-'}
                        </span>
                      )}

                      {issue.assigneeName ? (
                        <div
                          className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[10px] font-bold flex items-center justify-center"
                          title={issue.assigneeName}
                        >
                          {issue.assigneeName.slice(0, 2).toUpperCase()}
                        </div>
                      ) : (
                        <div
                          className="w-5 h-5 rounded-full border border-dashed border-[#DFE1E6] text-[#6B778C] flex items-center justify-center text-[10px]"
                          title="Unassigned"
                        >
                          <Icons.User className="w-3 h-3" />
                        </div>
                      )}

                      {/* Move to active sprint */}
                      {sprints.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetSprint = sprints.find((s) => s.state === 'active') || sprints[0];
                            onMoveIssueToSprint(issue.id, targetSprint.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-[#0052CC] hover:underline px-1.5 py-0.5 rounded hover:bg-[#DEEBFF] transition"
                          title="Move to Active Sprint"
                        >
                          Move to Sprint
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {backlogIssues.length === 0 && inlineCreateSprintId !== null && (
                <div className="py-6 text-center text-xs text-[#6B778C]">
                  Your backlog is empty.
                </div>
              )}
            </div>

            {/* Inline Create Issue in Backlog */}
            {inlineCreateSprintId === null ? (
              <form
                onSubmit={(e) => handleInlineCreateSubmit(e, null)}
                className="p-3 bg-[#FAFBFC] border-t border-[#EBECF0] flex items-center gap-2"
              >
                <select
                  value={inlineType}
                  onChange={(e) => setInlineType(e.target.value)}
                  className="text-xs bg-white border border-[#DFE1E6] rounded px-2 py-1.5 font-semibold text-[#172B4D]"
                >
                  <option value="Story">Story</option>
                  <option value="Task">Task</option>
                  <option value="Bug">Bug</option>
                </select>

                <input
                  type="text"
                  autoFocus
                  placeholder="What needs to be done?"
                  value={inlineSummary}
                  onChange={(e) => setInlineSummary(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 bg-white border border-[#4C9AFF] rounded focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={isSubmittingInline || !inlineSummary.trim()}
                  className="px-3 py-1.5 bg-[#0052CC] hover:bg-[#0065FF] text-white text-xs font-bold rounded disabled:opacity-50 transition"
                >
                  {isSubmittingInline ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setInlineCreateSprintId('closed')}
                  className="text-[#5E6C84] hover:text-[#172B4D] p-1.5 text-xs font-semibold"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="px-4 py-2 bg-[#FAFBFC] border-t border-[#EBECF0]">
                <button
                  onClick={() => {
                    setInlineCreateSprintId(null);
                    setInlineSummary('');
                  }}
                  className="text-xs font-semibold text-[#5E6C84] hover:text-[#0052CC] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Icons.Plus className="w-3.5 h-3.5 text-[#0052CC]" />
                  <span>Create issue</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* NEW SPRINT MODAL */}
      {showNewSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-lg shadow-2xl border border-[#DFE1E6] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBECF0]">
              <h3 className="text-base font-bold text-[#172B4D]">Create Sprint</h3>
              <button onClick={() => setShowNewSprintModal(false)} className="text-[#5E6C84] hover:text-[#172B4D]">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSprintSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Sprint Name *</label>
                <input
                  type="text"
                  required
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D] focus:border-[#4C9AFF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Sprint Goal</label>
                <textarea
                  rows={3}
                  value={newSprintGoal}
                  onChange={(e) => setNewSprintGoal(e.target.value)}
                  placeholder="What do we want to accomplish this sprint?"
                  className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D] focus:border-[#4C9AFF]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSprintModal(false)}
                  className="px-3 py-1.5 font-semibold text-[#42526E] hover:bg-[#EBECF0] rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded shadow-xs transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* START SPRINT MODAL (REAL ATLASSIAN JIRA WORKFLOW) */}
      {startingSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-[#DFE1E6] w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBECF0]">
              <h3 className="text-base font-bold text-[#172B4D]">Start Sprint: {startingSprint.name}</h3>
              <button onClick={() => setStartingSprint(null)} className="text-[#5E6C84] hover:text-[#172B4D]">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-md border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
              <span>{issues.filter(i => i.sprintId === startingSprint.id).length} issues will be included in this sprint.</span>
              <span className="font-bold">
                {issues.filter(i => i.sprintId === startingSprint.id).reduce((acc, i) => acc + (i.storyPoints || 0), 0)} pts total
              </span>
            </div>

            <form onSubmit={handleConfirmStartSprint} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Duration</label>
                <select
                  value={startSprintDuration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D] bg-white font-medium"
                >
                  <option value="1 week">1 week</option>
                  <option value="2 weeks">2 weeks</option>
                  <option value="3 weeks">3 weeks</option>
                  <option value="4 weeks">4 weeks</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startSprintStartDate}
                    onChange={(e) => setStartSprintStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">End Date</label>
                  <input
                    type="date"
                    value={startSprintEndDate}
                    onChange={(e) => setStartSprintEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Sprint Goal</label>
                <textarea
                  rows={3}
                  value={startSprintGoal}
                  onChange={(e) => setStartSprintGoal(e.target.value)}
                  placeholder="What is the team aiming to ship during this sprint?"
                  className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStartingSprint(null)}
                  className="px-3 py-1.5 font-semibold text-[#42526E] hover:bg-[#EBECF0] rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded shadow-xs transition"
                >
                  Start Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SPRINT MODAL */}
      {editingSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-[#DFE1E6] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBECF0]">
              <h3 className="text-base font-bold text-[#172B4D]">Edit Sprint Configuration</h3>
              <button onClick={() => setEditingSprint(null)} className="text-[#5E6C84] hover:text-[#172B4D]">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSprint} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Sprint Name *</label>
                <input
                  type="text"
                  required
                  value={editSprintName}
                  onChange={(e) => setEditSprintName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editSprintStartDate}
                    onChange={(e) => setEditSprintStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">End Date</label>
                  <input
                    type="date"
                    value={editSprintEndDate}
                    onChange={(e) => setEditSprintEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Sprint Goal</label>
                <textarea
                  rows={3}
                  value={editSprintGoal}
                  onChange={(e) => setEditSprintGoal(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSprint(null)}
                  className="px-3 py-1.5 font-semibold text-[#42526E] hover:bg-[#EBECF0] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE SPRINT MODAL (REAL JIRA RETROSPECTIVE CLOSURE) */}
      {completingSprint && (() => {
        const sprintIssues = issues.filter(i => i.sprintId === completingSprint.id);
        const completedCount = sprintIssues.filter(i => i.status === 'Done').length;
        const openCount = sprintIssues.length - completedCount;
        const otherFutureSprints = sprints.filter(s => s.id !== completingSprint.id && s.state !== 'closed');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
            <div className="bg-white rounded-lg shadow-2xl border border-[#DFE1E6] w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EBECF0]">
                <h3 className="text-base font-bold text-[#172B4D]">Complete {completingSprint.name}</h3>
                <button onClick={() => setCompletingSprint(null)} className="text-[#5E6C84] hover:text-[#172B4D]">
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <p>This sprint contains:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li className="text-emerald-700 font-semibold">{completedCount} completed issues</li>
                  <li className="text-amber-700 font-semibold">{openCount} open issues</li>
                </ul>
              </div>

              {openCount > 0 && (
                <div className="text-xs space-y-1.5">
                  <label className="block font-semibold text-[#172B4D]">Select where to move open issues:</label>
                  <select
                    value={completeMoveTarget}
                    onChange={(e) => setCompleteMoveTarget(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#DFE1E6] rounded text-[#172B4D] bg-white font-medium"
                  >
                    <option value="backlog">Backlog</option>
                    {otherFutureSprints.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.state})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EBECF0]">
                <button
                  type="button"
                  onClick={() => setCompletingSprint(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#42526E] hover:bg-[#EBECF0] rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCompleteSprint}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded shadow-xs"
                >
                  Complete Sprint
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
