'use client';

import React from 'react';
import { Project, Issue } from '@/types/jira';
import { IssueTypeIcon, Icons } from './Icons';

interface RoadmapTimelineViewProps {
  project: Project;
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  onOpenCreateIssue: () => void;
}

export const RoadmapTimelineView: React.FC<RoadmapTimelineViewProps> = ({
  project,
  issues,
  onSelectIssue,
  onOpenCreateIssue
}) => {
  // Generate 4 weekly interval columns for current month
  const today = new Date();
  const weeks = [
    { label: 'Week 1', start: new Date(today.getFullYear(), today.getMonth(), 1) },
    { label: 'Week 2', start: new Date(today.getFullYear(), today.getMonth(), 8) },
    { label: 'Week 3', start: new Date(today.getFullYear(), today.getMonth(), 15) },
    { label: 'Week 4', start: new Date(today.getFullYear(), today.getMonth(), 22) }
  ];

  return (
    <div className="flex-1 min-w-0 w-full flex flex-col min-h-0 overflow-hidden bg-white p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Roadmap & Gantt Schedule</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold uppercase">
              Interactive
            </span>
          </h1>
        </div>

        <button
          onClick={onOpenCreateIssue}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
        >
          <Icons.Plus className="w-4 h-4" />
          <span>New Epic / Story</span>
        </button>
      </div>

      {/* Timeline Gantt Grid */}
      <div className="flex-1 overflow-auto mt-4 border border-slate-200 rounded-xl shadow-2xs flex">
        {/* Left: Issue Tree / Names */}
        <div className="w-80 shrink-0 border-r border-slate-200 bg-slate-50/70 select-none">
          <div className="h-10 px-4 flex items-center font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
            Epic / Feature
          </div>
          <div className="divide-y divide-slate-200">
            {issues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className="h-12 px-4 flex items-center gap-2.5 hover:bg-slate-100 transition cursor-pointer text-xs font-medium text-slate-800"
              >
                <IssueTypeIcon type={issue.issueType} className="w-4 h-4 shrink-0" />
                <span className="font-bold text-slate-500 shrink-0">{issue.key}</span>
                <span className="truncate">{issue.summary}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Timeline Grid */}
        <div className="flex-1 min-w-[600px] overflow-x-auto">
          {/* Timeline Columns Header */}
          <div className="h-10 flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 select-none">
            {weeks.map((w, idx) => (
              <div
                key={idx}
                className="flex-1 px-4 flex items-center border-r border-slate-200 uppercase tracking-wider text-[11px]"
              >
                {w.label} ({w.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
              </div>
            ))}
          </div>

          {/* Timeline Bars for each Issue */}
          <div className="divide-y divide-slate-100">
            {issues.map((issue, idx) => {
              // Calculate horizontal position & width percentage based on dates or pseudo index
              const leftPercent = Math.min(70, (idx * 12) % 65);
              const widthPercent = Math.max(25, 45 - (idx * 5) % 20);

              const isDone = issue.status === 'Done';
              const isProgress = issue.status === 'In Progress' || issue.status === 'In Review';

              return (
                <div key={issue.id} className="h-12 relative flex items-center px-2 hover:bg-blue-50/30 transition">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    <div className="flex-1 border-r border-slate-100" />
                    <div className="flex-1 border-r border-slate-100" />
                    <div className="flex-1 border-r border-slate-100" />
                    <div className="flex-1" />
                  </div>

                  {/* Gantt Bar */}
                  <div
                    onClick={() => onSelectIssue(issue)}
                    className={`h-7 rounded-lg shadow-2xs px-2.5 flex items-center justify-between text-xs font-semibold text-white cursor-pointer hover:brightness-105 transition absolute z-10 ${
                      isDone
                        ? 'bg-emerald-600'
                        : isProgress
                        ? 'bg-blue-600'
                        : 'bg-slate-500'
                    }`}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                  >
                    <span className="truncate text-[11px]">{issue.summary}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 shrink-0 ml-1">
                      {issue.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
