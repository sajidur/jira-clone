'use client';

import React, { useState, useEffect } from 'react';
import { Project, Issue } from '@/types/jira';
import { IssueTypeIcon, PriorityIcon, Icons } from './Icons';
import { fetchIssues, formatMinutesToJiraTime } from '@/lib/api';
import { ViewType } from './Navbar';
import { SpaceAvatar } from './SpaceAvatar';

interface ForYouViewProps {
  currentProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
  onSelectIssue: (issue: Issue) => void;
  onOpenCreateIssue: () => void;
  setActiveView: (view: ViewType) => void;
  currentUserName?: string;
}

export const ForYouView: React.FC<ForYouViewProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onSelectIssue,
  onOpenCreateIssue,
  setActiveView,
  currentUserName = 'Sajidur Rahman'
}) => {
  const [activeTab, setActiveTab] = useState<'assigned' | 'worked' | 'starred'>('assigned');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const all = await fetchIssues();
      setIssues(all);
    } catch (e) {
      console.error('Failed to fetch issues for For You view', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter issues based on active tab
  const assignedToMe = issues.filter(
    (i) =>
      i.assigneeName?.toLowerCase().includes(currentUserName.toLowerCase()) ||
      i.assigneeName?.toLowerCase().includes('sajidur') ||
      !i.assigneeName // Also show unassigned in assigned tab if small dataset
  );

  const workedOn = issues.filter(
    (i) => (i.timeSpentMinutes && i.timeSpentMinutes > 0) || (i.comments && i.comments.length > 0)
  );

  const starredIssues = issues.filter(
    (i) => i.priority === 'Highest' || i.priority === 'High'
  );

  let currentList = activeTab === 'assigned' ? assignedToMe : activeTab === 'worked' ? workedOn : starredIssues;

  if (searchFilter.trim()) {
    const q = searchFilter.toLowerCase();
    currentList = currentList.filter(
      (i) =>
        i.key.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.projectName?.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q)
    );
  }

  // Quick stats
  const totalAssignedCount = issues.filter((i) =>
    i.assigneeName?.toLowerCase().includes(currentUserName.toLowerCase())
  ).length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;
  const totalMinutesLogged = issues.reduce((acc, i) => acc + (i.timeSpentMinutes || 0), 0);
  const completedCount = issues.filter((i) => i.status === 'Done').length;

  return (
    <div className="flex-1 min-w-0 w-full overflow-y-auto bg-[#FAFBFC] p-4 sm:p-6 md:p-8 font-sans space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBECF0] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0052cc] to-[#2684ff] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {currentUserName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#172B4D]">For you</h1>
            <p className="text-xs text-slate-500">
              Welcome back, <span className="font-semibold text-slate-700">{currentUserName}</span>. Here is a summary of your active work across spaces.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Refresh your work"
          >
            <Icons.Refresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenCreateIssue}
            className="px-3.5 py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>Create issue</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-[#EBECF0] shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Assigned to me
          </div>
          <div className="text-2xl font-extrabold text-[#172B4D]">{totalAssignedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Open items across projects</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#EBECF0] shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
            In Progress
          </div>
          <div className="text-2xl font-extrabold text-[#0052cc]">{inProgressCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Currently active</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#EBECF0] shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Time Logged
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">
            {formatMinutesToJiraTime(totalMinutesLogged)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{totalMinutesLogged} total minutes tracked</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#EBECF0] shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Completed
          </div>
          <div className="text-2xl font-extrabold text-slate-700">{completedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Issues in Done status</div>
        </div>
      </div>

      {/* Recent Spaces (Projects) Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#172B4D] uppercase tracking-wider">
            Recent Spaces ({projects.length})
          </h2>
          <button
            onClick={() => setActiveView('board')}
            className="text-xs font-semibold text-[#0052cc] hover:underline"
          >
            View all boards &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {projects.map((p) => {
            const isCurrent = currentProject?.id === p.id;
            const projectIssues = issues.filter((i) => i.projectId === p.id);
            const openIssues = projectIssues.filter((i) => i.status !== 'Done').length;
            const doneIssues = projectIssues.filter((i) => i.status === 'Done').length;

            return (
              <div
                key={p.id}
                className={`p-4 bg-white rounded-xl border transition hover:shadow-md cursor-pointer ${
                  isCurrent ? 'border-[#0052cc] ring-1 ring-[#0052cc]/20' : 'border-[#EBECF0]'
                }`}
                onClick={() => {
                  onSelectProject(p);
                  setActiveView('board');
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <SpaceAvatar project={p} size="sm" />
                    <div>
                      <div className="font-bold text-xs text-[#172B4D] hover:text-[#0052cc]">{p.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{p.key}</div>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Active
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">{openIssues} open • {doneIssues} done</span>
                  <span className="text-[11px] font-semibold text-[#0052cc] hover:underline">
                    Go to board &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Tabs + Search Filter */}
      <div className="bg-white rounded-xl border border-[#EBECF0] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#EBECF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'assigned'
                  ? 'bg-white text-[#0052cc] shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Assigned to me ({assignedToMe.length})
            </button>

            <button
              onClick={() => setActiveTab('worked')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'worked'
                  ? 'bg-white text-[#0052cc] shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Worked on ({workedOn.length})
            </button>

            <button
              onClick={() => setActiveTab('starred')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'starred'
                  ? 'bg-white text-[#0052cc] shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Starred & High Priority ({starredIssues.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Filter your work..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
            />
            <Icons.Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Issue Table List */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Icons.Refresh className="w-4 h-4 animate-spin text-[#0052cc]" />
              <span>Loading your work...</span>
            </div>
          ) : currentList.length > 0 ? (
            currentList.map((issue) => (
              <div
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className="px-4 py-3 hover:bg-[#F4F5F7] transition cursor-pointer flex items-center justify-between group text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 mr-4">
                  <IssueTypeIcon type={issue.issueType} className="w-4 h-4 shrink-0" />
                  <span className="font-mono font-bold text-[#0052cc] shrink-0 group-hover:underline">
                    {issue.key}
                  </span>
                  <span className="font-medium text-slate-800 truncate">{issue.summary}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {issue.projectName && (
                    <span className="hidden md:inline-block text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {issue.projectName}
                    </span>
                  )}

                  {issue.timeSpentMinutes && issue.timeSpentMinutes > 0 ? (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      <Icons.Clock className="w-3 h-3" />
                      <span>{formatMinutesToJiraTime(issue.timeSpentMinutes)}</span>
                    </span>
                  ) : null}

                  <PriorityIcon priority={issue.priority} className="w-4 h-4" />

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border tracking-wider ${
                      issue.status === 'Done'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : issue.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : issue.status === 'In Review'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {issue.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              <Icons.Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-medium text-slate-600">No issues found for this view</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {searchFilter ? 'Try clearing your filter text.' : 'You have no open tasks assigned in this section.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
