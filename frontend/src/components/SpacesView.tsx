'use client';

import React, { useState, useEffect } from 'react';
import { Project, Workspace, Issue, Sprint } from '@/types/jira';
import { Icons } from './Icons';
import { fetchIssues, fetchSprints, updateProject } from '@/lib/api';
import { ViewType } from './Navbar';
import { EditSpaceModal } from './EditSpaceModal';
import { SpaceAvatar } from './SpaceAvatar';

interface SpacesViewProps {
  projects: Project[];
  currentProject: Project | null;
  onSelectProject: (p: Project) => void;
  onOpenCreateProject: () => void;
  setActiveView: (view: ViewType) => void;
  currentWorkspace?: Workspace | null;
  onProjectUpdated?: (p: Project) => void;
}

interface SpaceStat {
  total: number;
  open: number;
  inProgress: number;
  done: number;
  activeSprintName?: string;
}

export const SpacesView: React.FC<SpacesViewProps> = ({
  projects,
  currentProject,
  onSelectProject,
  onOpenCreateProject,
  setActiveView,
  currentWorkspace,
  onProjectUpdated
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [starredIds, setStarredIds] = useState<number[]>([]);
  const [stats, setStats] = useState<{ [projectId: number]: SpaceStat }>({});
  const [loading, setLoading] = useState(true);
  const [editingSpace, setEditingSpace] = useState<Project | null>(null);

  // On-the-fly inline space rename
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineName, setInlineName] = useState('');
  const [savingInlineId, setSavingInlineId] = useState<number | null>(null);

  const startInlineEdit = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setInlineEditingId(p.id);
    setInlineName(p.name);
  };

  const saveInlineEdit = async (p: Project) => {
    if (!inlineName.trim() || inlineName.trim() === p.name) {
      setInlineEditingId(null);
      return;
    }
    try {
      setSavingInlineId(p.id);
      const updated = await updateProject(p.id, { name: inlineName.trim() });
      if (onProjectUpdated) onProjectUpdated(updated);
      setInlineEditingId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to rename space');
    } finally {
      setSavingInlineId(null);
    }
  };

  const cancelInlineEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInlineEditingId(null);
  };

  const handleSpaceSaved = (updated: Project) => {
    if (onProjectUpdated) onProjectUpdated(updated);
  };

  // Load Starred from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('jira_starred_spaces');
      if (stored) setStarredIds(JSON.parse(stored));
    } catch {}
  }, []);

  const toggleStar = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = starredIds.includes(id)
      ? starredIds.filter((x) => x !== id)
      : [...starredIds, id];
    setStarredIds(updated);
    try {
      localStorage.setItem('jira_starred_spaces', JSON.stringify(updated));
    } catch {}
  };

  // Load stats and sprints for all projects
  useEffect(() => {
    let isMounted = true;
    const loadAllStats = async () => {
      try {
        setLoading(true);
        const allIssues = await fetchIssues();
        const statsMap: { [projectId: number]: SpaceStat } = {};

        // Calculate issue stats per project
        projects.forEach((p) => {
          const pIssues = allIssues.filter((i) => i.projectId === p.id);
          const done = pIssues.filter((i) => i.status.toLowerCase() === 'done').length;
          const inProgress = pIssues.filter((i) => i.status.toLowerCase() === 'in progress' || i.status.toLowerCase() === 'in review').length;
          const open = pIssues.length - done - inProgress;

          statsMap[p.id] = {
            total: pIssues.length,
            open: Math.max(0, open),
            inProgress,
            done
          };
        });

        // Load sprints for active project
        if (currentProject) {
          try {
            const sprints = await fetchSprints(currentProject.id);
            const active = sprints.find((s: Sprint) => s.state === 'active');
            if (active && statsMap[currentProject.id]) {
              statsMap[currentProject.id].activeSprintName = active.name;
            }
          } catch {}
        }

        if (isMounted) setStats(statsMap);
      } catch (err) {
        console.error('Failed to load space metrics', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAllStats();
    return () => {
      isMounted = false;
    };
  }, [projects, currentProject]);

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || (p.leadName && p.leadName.toLowerCase().includes(q));
    const matchesType =
      selectedType === 'all' ||
      (selectedType === 'starred' && starredIds.includes(p.id)) ||
      (selectedType === 'software' && (!p.projectTypeKey || p.projectTypeKey === 'software')) ||
      (selectedType === 'business' && p.projectTypeKey === 'business');
    return matchesSearch && matchesType;
  });

  const handleOpenSpace = (p: Project, targetView: ViewType = 'board') => {
    onSelectProject(p);
    setActiveView(targetView);
  };

  return (
    <div className="flex-1 min-w-0 w-full overflow-y-auto bg-[#FAFBFC] p-4 sm:p-6 md:p-8 font-sans space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & BREADCRUMB */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBECF0] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Spaces</span>
            <span>/</span>
            <span className="font-semibold text-slate-800">All spaces</span>
            {currentWorkspace && (
              <>
                <span>•</span>
                <span className="font-mono text-[#0052cc] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                  {currentWorkspace.name}
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight">Spaces</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse, manage, and switch between your agile project spaces and teams.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenCreateProject}
            className="px-3.5 py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>Create space</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CONTROLS BAR: SEARCH, TABS & VIEW TOGGLE */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60 overflow-x-auto text-xs">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
              selectedType === 'all'
                ? 'bg-white text-[#0052cc] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All spaces ({projects.length})
          </button>

          <button
            onClick={() => setSelectedType('software')}
            className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
              selectedType === 'software'
                ? 'bg-white text-[#0052cc] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Software
          </button>

          <button
            onClick={() => setSelectedType('starred')}
            className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer flex items-center gap-1 ${
              selectedType === 'starred'
                ? 'bg-white text-[#0052cc] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Starred ({starredIds.length})</span>
          </button>
        </div>

        {/* Search input + View switcher */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search spaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
            />
            <Icons.Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-slate-100 text-[#0052cc]' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid Cards View"
            >
              <Icons.Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition cursor-pointer ${
                viewMode === 'table' ? 'bg-slate-100 text-[#0052cc]' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table List View"
            >
              <Icons.List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. MAIN SPACES PRESENTATION */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const isCurrent = currentProject?.id === p.id;
            const isStarred = starredIds.includes(p.id);
            const pStat = stats[p.id] || { total: 0, open: 0, inProgress: 0, done: 0 };
            const percentDone = pStat.total > 0 ? Math.round((pStat.done / pStat.total) * 100) : 0;

            return (
              <div
                key={p.id}
                onClick={() => handleOpenSpace(p, 'board')}
                className={`bg-white rounded-xl border p-5 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group ${
                  isCurrent ? 'border-[#0052cc] ring-2 ring-[#0052cc]/20' : 'border-[#EBECF0]'
                }`}
              >
                <div>
                  {/* Space Card Top Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpaceToEdit(p);
                        }}
                        className="cursor-pointer hover:scale-105 transition-transform"
                        title="Click to change space logo and color"
                      >
                        <SpaceAvatar project={p} size="md" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {inlineEditingId === p.id ? (
                          <div className="flex items-center gap-1 my-0.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              autoFocus
                              disabled={savingInlineId === p.id}
                              value={inlineName}
                              onChange={(e) => setInlineName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEdit(p);
                                if (e.key === 'Escape') cancelInlineEdit();
                              }}
                              className="text-xs font-bold text-slate-900 px-2 py-1 border-2 border-[#0052cc] rounded bg-white shadow-inner w-full focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(p)}
                              disabled={savingInlineId === p.id}
                              className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shrink-0 shadow-2xs"
                              title="Save (Enter)"
                            >
                              <Icons.Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelInlineEdit}
                              className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer shrink-0"
                              title="Cancel (Esc)"
                            >
                              <Icons.X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group/title">
                            <h3
                              onClick={(e) => startInlineEdit(p, e)}
                              className="font-bold text-sm text-[#172B4D] hover:text-[#0052cc] transition line-clamp-1 cursor-pointer hover:underline"
                              title="Click to edit name on the fly"
                            >
                              {p.name}
                            </h3>
                            <button
                              type="button"
                              onClick={(e) => startInlineEdit(p, e)}
                              className="opacity-0 group-hover/title:opacity-100 p-0.5 rounded hover:bg-blue-50 text-slate-400 hover:text-[#0052cc] transition cursor-pointer shrink-0"
                              title="Edit space name on the fly"
                            >
                              <Icons.Edit className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span>{p.key}</span>
                          <span>•</span>
                          <span className="font-sans font-medium text-slate-600">Scrum Software</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => toggleStar(p.id, e)}
                      className="p-1 rounded hover:bg-slate-100 transition text-slate-400 hover:text-amber-500 cursor-pointer"
                      title={isStarred ? 'Remove from starred' : 'Star this space'}
                    >
                      <Icons.Star
                        className={`w-4 h-4 ${
                          isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Description / Lead */}
                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 min-h-[32px]">
                    {p.description || 'Enterprise agile workspace for sprint execution, continuous integration, and release tracking.'}
                  </p>

                  {/* Progress Bar & Issue Counters */}
                  <div className="space-y-1.5 mb-4 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700">Sprint Progress</span>
                      <span className="font-extrabold text-[#0052cc]">{percentDone}% done</span>
                    </div>

                    <div className="w-full bg-[#EBECF0] rounded-full h-1.5 overflow-hidden flex">
                      <div
                        className="bg-[#36B37E] h-1.5 transition-all duration-300"
                        style={{ width: `${percentDone}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>{pStat.open} To Do</span>
                      <span>{pStat.inProgress} In Progress</span>
                      <span className="text-emerald-700 font-semibold">{pStat.done} Done</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Quick Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center">
                      {(p.leadName || 'Sajidur Rahman').charAt(0)}
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium truncate max-w-[100px]">
                      {p.leadName || 'Sajidur Rahman'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSpace(p);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded text-slate-600 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                      title="Edit space name & details"
                    >
                      <Icons.Edit className="w-3 h-3 text-slate-500" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSpace(p, 'board');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-[#0052cc] hover:bg-blue-100 transition"
                    >
                      Board
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSpace(p, 'backlog');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded text-slate-600 hover:bg-slate-100 transition"
                    >
                      Backlog
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSpace(p, 'config');
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                      title="Space Settings"
                    >
                      <Icons.Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-[#EBECF0] shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EBECF0] bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-10 text-center">★</th>
                <th className="py-3 px-4">Space Name</th>
                <th className="py-3 px-4">Key</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Lead</th>
                <th className="py-3 px-4">Issues</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((p) => {
                const isCurrent = currentProject?.id === p.id;
                const isStarred = starredIds.includes(p.id);
                const pStat = stats[p.id] || { total: 0, open: 0, inProgress: 0, done: 0 };
                const percentDone = pStat.total > 0 ? Math.round((pStat.done / pStat.total) * 100) : 0;

                return (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenSpace(p, 'board')}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                  >
                    <td className="py-3 px-4 text-center" onClick={(e) => toggleStar(p.id, e)}>
                      <Icons.Star
                        className={`w-4 h-4 mx-auto ${
                          isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-slate-500'
                        }`}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSpaceToEdit(p);
                          }}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          title="Click to change space logo and color"
                        >
                          <SpaceAvatar project={p} size="sm" />
                        </div>
                        <div>
                          {inlineEditingId === p.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                autoFocus
                                disabled={savingInlineId === p.id}
                                value={inlineName}
                                onChange={(e) => setInlineName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveInlineEdit(p);
                                  if (e.key === 'Escape') cancelInlineEdit();
                                }}
                                className="text-xs font-bold text-slate-900 px-2 py-0.5 border-2 border-[#0052cc] rounded bg-white shadow-inner focus:outline-hidden min-w-[200px]"
                              />
                              <button
                                type="button"
                                onClick={() => saveInlineEdit(p)}
                                disabled={savingInlineId === p.id}
                                className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer shrink-0 shadow-2xs"
                                title="Save (Enter)"
                              >
                                <Icons.Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelInlineEdit}
                                className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer shrink-0"
                                title="Cancel (Esc)"
                              >
                                <Icons.X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/tbl">
                              <span
                                onClick={(e) => startInlineEdit(p, e)}
                                className="font-bold text-slate-900 group-hover:text-[#0052cc] hover:underline cursor-pointer transition"
                                title="Click to edit name on the fly"
                              >
                                {p.name}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => startInlineEdit(p, e)}
                                className="opacity-0 group-hover/tbl:opacity-100 p-0.5 rounded hover:bg-blue-50 text-slate-400 hover:text-[#0052cc] transition cursor-pointer shrink-0"
                                title="Edit space name on the fly"
                              >
                                <Icons.Edit className="w-3.5 h-3.5" />
                              </button>
                              {isCurrent && (
                                <span className="ml-2 text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  Active
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-600">{p.key}</td>
                    <td className="py-3 px-4 text-slate-600">Scrum Software</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center">
                          {(p.leadName || 'Sajidur Rahman').charAt(0)}
                        </div>
                        <span className="text-slate-700">{p.leadName || 'Sajidur Rahman'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-36 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{pStat.total} total</span>
                          <span>{percentDone}% done</span>
                        </div>
                        <div className="w-full bg-[#EBECF0] rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-[#36B37E] h-1"
                            style={{ width: `${percentDone}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setEditingSpace(p)}
                          className="px-2.5 py-1 text-xs font-semibold rounded text-slate-600 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                          title="Edit space name & details"
                        >
                          <Icons.Edit className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleOpenSpace(p, 'board')}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-[#0052cc] hover:bg-blue-100 transition"
                        >
                          Board
                        </button>
                        <button
                          onClick={() => handleOpenSpace(p, 'backlog')}
                          className="px-2.5 py-1 text-xs font-semibold rounded text-slate-600 hover:bg-slate-100 transition"
                        >
                          Backlog
                        </button>
                        <button
                          onClick={() => handleOpenSpace(p, 'config')}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                          title="Settings"
                        >
                          <Icons.Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12 px-4 bg-white rounded-xl border border-dashed border-slate-300">
          <Icons.Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">No spaces found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No spaces match "${searchQuery}". Try clearing your search.`
              : 'You have not created any spaces in this organization yet.'}
          </p>
          <button
            type="button"
            onClick={onOpenCreateProject}
            className="mt-4 px-4 py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>Create new space</span>
          </button>
        </div>
      )}

      {/* Edit Space Modal */}
      <EditSpaceModal
        isOpen={!!editingSpace}
        space={editingSpace}
        onClose={() => setEditingSpace(null)}
        onUpdated={(updated) => {
          handleSpaceSaved(updated);
          setEditingSpace(null);
        }}
      />
    </div>
  );
};
