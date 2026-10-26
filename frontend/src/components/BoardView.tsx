'use client';

import React, { useState, useEffect } from 'react';
import { Project, Issue, Sprint, WorkflowStatus, AppUser } from '@/types/jira';
import { IssueTypeIcon, PriorityIcon, Icons } from './Icons';
import {
  fetchWorkflowStatuses,
  createWorkflowStatus,
  updateWorkflowStatus,
  deleteWorkflowStatus,
  fetchUsers
} from '@/lib/api';
import { SpaceAvatar } from './SpaceAvatar';
import { useCurrentUser } from './AuthProvider';

interface BoardViewProps {
  project: Project;
  issues: Issue[];
  activeSprint?: Sprint | null;
  sprints?: Sprint[];
  onSelectIssue: (issue: Issue) => void;
  onMoveIssue: (issueId: number, newStatus: string) => Promise<void>;
  onOpenCreateIssue: (defaultStatus?: string) => void;
  onRefresh: () => void;
  onCompleteSprint?: (sprintId: number, moveToSprintId?: number | null) => Promise<void>;
  onNavigateView?: (view: any) => void;
  onProjectUpdated?: (p: Project) => void;
}

type GroupByOption = 'none' | 'assignee' | 'priority' | 'epic';

export const BoardView: React.FC<BoardViewProps> = ({
  project,
  issues,
  activeSprint,
  sprints = [],
  onSelectIssue,
  onMoveIssue,
  onOpenCreateIssue,
  onRefresh,
  onCompleteSprint,
  onNavigateView,
  onProjectUpdated
}) => {
  const currentUser = useCurrentUser();
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [draggedIssueId, setDraggedIssueId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Complete sprint modal
  const [completingSprint, setCompletingSprint] = useState<Sprint | null>(null);
  const [completeMoveTarget, setCompleteMoveTarget] = useState<string>('backlog');
  const [isCompleting, setIsCompleting] = useState(false);

  // Column WIP Limit editing
  const [editingWipStatusId, setEditingWipStatusId] = useState<number | null>(null);
  const [tempWipLimit, setTempWipLimit] = useState<string>('');

  // Add column modal
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnCategory, setNewColumnCategory] = useState('In Progress');
  const [newColumnColor, setNewColumnColor] = useState('#0052CC');
  const [newColumnWip, setNewColumnWip] = useState<string>('');

  const loadData = async () => {
    try {
      const [stData, uData] = await Promise.all([
        fetchWorkflowStatuses(project.id),
        fetchUsers()
      ]);
      setStatuses(stData);
      setUsers(uData);
    } catch {
      setStatuses([
        { id: 1, projectId: project.id, name: 'To Do', category: 'To Do', color: '#64748b', order: 1 },
        { id: 2, projectId: project.id, name: 'In Progress', category: 'In Progress', color: '#0052CC', order: 2, wipLimit: 8 },
        { id: 3, projectId: project.id, name: 'In Review', category: 'In Progress', color: '#ffab00', order: 3, wipLimit: 6 },
        { id: 4, projectId: project.id, name: 'In QA', category: 'Done', color: '#36b37e', order: 4 }
      ]);
    }
  };

  useEffect(() => {
    loadData();
  }, [project.id]);

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    try {
      await createWorkflowStatus({
        projectId: project.id,
        name: newColumnName.trim(),
        category: newColumnCategory,
        color: newColumnColor,
        wipLimit: newColumnWip ? parseInt(newColumnWip, 10) : undefined
      });
      setNewColumnName('');
      setNewColumnWip('');
      setIsAddingColumn(false);
      await loadData();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to add column');
    }
  };

  const handleSaveWipLimit = async (status: WorkflowStatus) => {
    try {
      const wip = tempWipLimit ? parseInt(tempWipLimit, 10) : undefined;
      await updateWorkflowStatus(status.id, {
        projectId: status.projectId,
        name: status.name,
        category: status.category,
        color: status.color,
        wipLimit: wip
      });
      setEditingWipStatusId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update WIP limit');
    }
  };

  const handleDeleteColumn = async (statusId: number, statusName: string) => {
    if (!confirm(`Are you sure you want to delete column "${statusName}"?`)) return;
    try {
      await deleteWorkflowStatus(statusId);
      await loadData();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete status column');
    }
  };

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        issue.key.toLowerCase().includes(q) ||
        issue.summary.toLowerCase().includes(q) ||
        (issue.assigneeName && issue.assigneeName.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filterType !== 'all' && issue.issueType.toLowerCase() !== filterType.toLowerCase()) {
      return false;
    }
    if (filterAssignee === 'me') {
      if (issue.assigneeName !== currentUser.displayName) return false;
    } else if (filterAssignee === 'unassigned') {
      if (issue.assigneeName) return false;
    } else if (filterAssignee !== 'all') {
      if (issue.assigneeName !== filterAssignee) return false;
    }
    return true;
  });

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', id.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIssueId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const issueIdStr = e.dataTransfer.getData('text/plain');
    const issueId = parseInt(issueIdStr, 10);
    if (!isNaN(issueId)) {
      await onMoveIssue(issueId, targetStatus);
    }
    setDraggedIssueId(null);
  };

  // Swimlanes
  const getSwimlaneGroups = (): { key: string; label: string; issues: Issue[] }[] => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Issues', issues: filteredIssues }];
    }
    if (groupBy === 'assignee') {
      const groups: { [key: string]: Issue[] } = {};
      filteredIssues.forEach((i) => {
        const k = i.assigneeName || 'Unassigned';
        if (!groups[k]) groups[k] = [];
        groups[k].push(i);
      });
      return Object.entries(groups).map(([label, items]) => ({
        key: label,
        label,
        issues: items
      }));
    }
    if (groupBy === 'priority') {
      const priorities = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
      return priorities
        .map((p) => ({
          key: p,
          label: `${p} Priority`,
          issues: filteredIssues.filter((i) => i.priority.toLowerCase() === p.toLowerCase())
        }))
        .filter((g) => g.issues.length > 0);
    }
    if (groupBy === 'epic') {
      const groups: { [key: string]: Issue[] } = { 'No Epic': [] };
      filteredIssues.forEach((i) => {
        const k = i.epicKey || 'No Epic';
        if (!groups[k]) groups[k] = [];
        groups[k].push(i);
      });
      return Object.entries(groups).map(([label, items]) => ({
        key: label,
        label,
        issues: items
      }));
    }
    return [{ key: 'all', label: 'All Issues', issues: filteredIssues }];
  };

  const swimlanes = getSwimlaneGroups();

  return (
    <div className="flex-1 min-w-0 min-h-0 w-full flex flex-col overflow-hidden bg-white select-none font-sans">
      {/* ------------------------------------------------------------- */}
      {/* 3. JIRA BOARD TOOLBAR (FILTER, SEARCH, GROUP, COMPLETE SPRINT) */}
      {/* ------------------------------------------------------------- */}
      <div className="px-6 py-2.5 border-b border-[#EBECF0] bg-white flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search board input pill */}
          <div className="relative">
            <Icons.Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search board..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0052cc] w-48 transition bg-white"
            />
          </div>

          {/* Quick Assignee Avatars */}
          <div className="flex items-center -space-x-1 pl-1">
            <button
              onClick={() => setFilterAssignee(filterAssignee === 'me' ? 'all' : 'me')}
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white transition cursor-pointer ${
                filterAssignee === 'me'
                  ? 'bg-emerald-600 text-white ring-emerald-500'
                  : 'bg-emerald-700 text-white hover:opacity-90'
              }`}
              title="MR (Logged In User)"
            >
              MR
            </button>
            {users.slice(0, 2).map((u) => {
              const isSelected = filterAssignee === u.displayName;
              return (
                <button
                  key={u.id}
                  onClick={() => setFilterAssignee(isSelected ? 'all' : u.displayName)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white ring-2 ring-white transition cursor-pointer ${
                    isSelected ? 'ring-[#0052cc] bg-[#0052cc]' : 'bg-[#0052cc]/80 hover:opacity-90'
                  }`}
                  title={u.displayName}
                >
                  {u.displayName.slice(0, 2).toUpperCase()}
                </button>
              );
            })}
            <button
              onClick={() => setFilterAssignee('all')}
              className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] ring-2 ring-white flex items-center justify-center hover:bg-slate-300 transition"
              title="All assignees"
            >
              +1
            </button>
          </div>

          {/* Filter button */}
          <button
            onClick={() => setFilterType(filterType === 'all' ? 'Story' : 'all')}
            className={`px-3 py-1.5 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              filterType !== 'all'
                ? 'bg-blue-50 border-[#0052cc] text-[#0052cc]'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Icons.Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>

          {/* Custom filters button */}
          <button
            onClick={() => onNavigateView?.('search')}
            className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
          >
            Custom filters
          </button>

          {/* Group button */}
          <div className="relative">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer bg-white"
            >
              <option value="none">Group: None</option>
              <option value="assignee">Group: Assignee</option>
              <option value="priority">Group: Priority</option>
              <option value="epic">Group: Epic</option>
            </select>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {activeSprint && onCompleteSprint && (
            <button
              onClick={() => {
                setCompletingSprint(activeSprint);
                setCompleteMoveTarget('backlog');
              }}
              className="bg-[#0052CC] hover:bg-[#0065FF] text-white px-3.5 py-1.5 rounded-md text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Complete sprint</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="Refresh"
          >
            <Icons.Refresh className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAddingColumn(true)}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="Board Column Settings"
          >
            <Icons.Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigateView?.('reports')}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="Sprint Insights"
          >
            <Icons.BarChart className="w-4 h-4" />
          </button>

          <button
            onClick={() => onOpenCreateIssue()}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="More Options"
          >
            <span className="font-bold text-xs leading-none">•••</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. COLUMNS AND ISSUE CARDS (MATCHING JIRA WEB BOARD) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-white relative">
        {swimlanes.map((lane) => (
          <div key={lane.key} className="mb-6">
            {groupBy !== 'none' && (
              <div className="flex items-center gap-2 py-2 px-1 mb-2 border-b border-slate-200">
                <span className="font-bold text-slate-800 text-xs">{lane.label}</span>
                <span className="text-[11px] text-slate-400 font-mono">({lane.issues.length})</span>
              </div>
            )}

            <div className="flex gap-4 items-start pb-8">
              {statuses.map((col) => {
                const colIssues = lane.issues.filter(
                  (i) => i.status.toLowerCase() === col.name.toLowerCase()
                );
                const isOverLimit = col.wipLimit && colIssues.length > col.wipLimit;

                return (
                  <div
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.name)}
                    className="w-72 shrink-0 bg-[#F4F5F7] rounded-xl flex flex-col max-h-[calc(100vh-14rem)] border border-slate-200/60"
                  >
                    {/* Column Header */}
                    <div className="p-3 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-xs text-[#172B4D] uppercase tracking-wider truncate">
                          {col.name}
                        </span>
                        <span className="text-slate-500 font-normal text-xs">{colIssues.length}</span>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          onClick={() => {
                            setEditingWipStatusId(col.id);
                            setTempWipLimit(col.wipLimit?.toString() || '');
                          }}
                          className="p-1 hover:text-slate-800 rounded hover:bg-slate-200 text-[10px] font-mono cursor-pointer"
                          title="WIP Limit"
                        >
                          WIP
                        </button>
                        <button
                          onClick={() => onOpenCreateIssue(col.name)}
                          className="p-1 hover:text-slate-800 rounded hover:bg-slate-200 cursor-pointer"
                          title="Add Issue"
                        >
                          <Icons.Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* WIP limit editor */}
                    {editingWipStatusId === col.id && (
                      <div className="p-2 bg-white border-b border-slate-200 flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-semibold text-[11px]">Limit:</span>
                        <input
                          type="number"
                          min="1"
                          placeholder="None"
                          value={tempWipLimit}
                          onChange={(e) => setTempWipLimit(e.target.value)}
                          className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                        />
                        <button
                          onClick={() => handleSaveWipLimit(col)}
                          className="px-2 py-0.5 bg-[#0052CC] text-white rounded text-[11px] font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingWipStatusId(null)}
                          className="text-slate-400 hover:text-slate-800"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Over limit alert */}
                    {isOverLimit && (
                      <div className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 text-center tracking-wide">
                        MAX LIMIT EXCEEDED
                      </div>
                    )}

                    {/* Column Issues Track */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                      {colIssues.map((issue) => {
                        const childSubtasks = issues.filter(
                          (sub) => sub.parentIssueKey === issue.key
                        );
                        const completedSubtasks = childSubtasks.filter(
                          (sub) => sub.status.toLowerCase() === 'done'
                        );
                        const subtaskTotal = childSubtasks.length;

                        return (
                          <div
                            key={issue.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, issue.id)}
                            onDragEnd={() => setDraggedIssueId(null)}
                            onClick={() => onSelectIssue(issue)}
                            className={`bg-white p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition cursor-pointer select-none relative group ${
                              draggedIssueId === issue.id ? 'opacity-30' : ''
                            }`}
                          >
                            {/* Card Title */}
                            <h3 className="text-xs font-semibold text-[#172B4D] leading-snug line-clamp-2 mb-2 group-hover:text-[#0052CC]">
                              {issue.summary}
                            </h3>

                            {/* Key Row: Type Icon + Key + Priority + Assignee */}
                            <div className="flex items-center justify-between text-xs pt-1">
                              <div className="flex items-center gap-1.5">
                                <IssueTypeIcon type={issue.issueType} className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-semibold text-slate-600 group-hover:text-[#0052CC] group-hover:underline text-[11px]">
                                  {issue.key}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <PriorityIcon priority={issue.priority} className="w-3.5 h-3.5" />

                                {issue.assigneeName ? (
                                  <div
                                    title={issue.assigneeName}
                                    className="w-6 h-6 rounded-full bg-[#0052CC] text-white flex items-center justify-center font-bold text-[10px] ring-1 ring-white shadow-2xs overflow-hidden shrink-0"
                                  >
                                    {issue.assigneeAvatarUrl ? (
                                      <img
                                        src={issue.assigneeAvatarUrl}
                                        alt={issue.assigneeName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      issue.assigneeName.slice(0, 2).toUpperCase()
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    title="Unassigned"
                                    className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400"
                                  >
                                    <Icons.User className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Subtasks Row (Matching Jira Web Subtasks 0/8 >) */}
                            {subtaskTotal > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 hover:text-[#0052cc] transition">
                                <div className="flex items-center gap-1.5">
                                  <Icons.Kanban className="w-3 h-3 text-slate-400" />
                                  <span className="font-medium">Subtasks</span>
                                  <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                                    {completedSubtasks.length}/{subtaskTotal}
                                  </span>
                                </div>
                                <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {colIssues.length === 0 && (
                        <div className="h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[11px] text-slate-400 italic">
                          No issues
                        </div>
                      )}

                      {/* Quick inline + create button at bottom of column */}
                      <button
                        onClick={() => onOpenCreateIssue(col.name)}
                        className="w-full py-2 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition text-base font-bold cursor-pointer"
                        title={`Add issue to ${col.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* End of Board Track: Add Column Button */}
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-72 shrink-0 h-28 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0052CC] hover:bg-blue-50/30 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-[#0052CC] transition cursor-pointer"
              >
                <Icons.Plus className="w-5 h-5" />
                <span className="text-xs font-bold">+ Add Column</span>
              </button>
            </div>
          </div>
        ))}

        {/* ------------------------------------------------------------- */}
        {/* 5. JIRA MINI-MAP VIEWPORT PREVIEW (MATCHING BOTTOM-RIGHT WIDGET) */}
        {/* ------------------------------------------------------------- */}
        <div className="fixed bottom-4 right-4 z-20 p-1.5 bg-white/90 backdrop-blur-xs rounded-xl shadow-lg border border-slate-200 hidden md:flex items-center gap-1 select-none pointer-events-none">
          {statuses.map((s, idx) => (
            <div
              key={s.id}
              className={`w-4 h-9 rounded-sm ${
                idx === 0
                  ? 'bg-blue-50 border-2 border-[#0052cc]'
                  : 'bg-slate-100 border border-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. JIRA COMPLETE SPRINT MODAL */}
      {/* ------------------------------------------------------------- */}
      {completingSprint && (() => {
        const sprintIssues = issues.filter((i) => i.sprintId === completingSprint.id);
        const completedCount = sprintIssues.filter((i) => i.status.toLowerCase() === 'done').length;
        const openCount = sprintIssues.length - completedCount;
        const futureSprints = sprints.filter((s) => s.id !== completingSprint.id && s.state !== 'closed');

        const handleConfirm = async () => {
          if (!onCompleteSprint) return;
          setIsCompleting(true);
          try {
            const targetId = completeMoveTarget === 'backlog' ? null : Number(completeMoveTarget);
            await onCompleteSprint(completingSprint.id, targetId);
            setCompletingSprint(null);
            onRefresh();
          } catch (err: any) {
            alert(err.message || 'Failed to complete sprint');
          } finally {
            setIsCompleting(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in-50 duration-150">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-[#172B4D]">Complete {completingSprint.name}</h3>
                <button
                  onClick={() => setCompletingSprint(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-medium text-slate-800">This active sprint contains:</p>
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{completedCount} completed issues (will be marked Done)</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-700 font-semibold">
                    <Icons.Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{openCount} open issues</span>
                  </div>
                </div>
              </div>

              {openCount > 0 && (
                <div className="text-xs space-y-1.5 pt-1">
                  <label className="block font-semibold text-[#172B4D]">
                    Select where to move open issues:
                  </label>
                  <select
                    value={completeMoveTarget}
                    onChange={(e) => setCompleteMoveTarget(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-[#172B4D] bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#0052cc]"
                  >
                    <option value="backlog">Backlog</option>
                    {futureSprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.state})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompletingSprint(null)}
                  disabled={isCompleting}
                  className="px-4 py-2 text-xs font-semibold text-[#42526E] hover:bg-slate-100 rounded-md transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isCompleting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0052CC] hover:bg-[#0065FF] rounded-md shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCompleting && <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />}
                  <span>Complete Sprint</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
