'use client';

import React, { useState, useEffect } from 'react';
import { Project, Sprint, BurndownData, VelocityItem, WorkloadItem, ProjectSummaryReport } from '@/types/jira';
import { Icons } from './Icons';
import { SpaceAvatar } from './SpaceAvatar';
import { fetchProjectSummary, fetchBurndown, fetchVelocity, fetchWorkload, fetchTimeTracking } from '@/lib/api';

interface ReportsViewProps {
  project: Project;
  sprints: Sprint[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ project, sprints }) => {
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(
    sprints.find((s) => s.state === 'active')?.id || (sprints.length > 0 ? sprints[0].id : null)
  );

  const [summary, setSummary] = useState<ProjectSummaryReport | null>(null);
  const [burndown, setBurndown] = useState<BurndownData | null>(null);
  const [velocity, setVelocity] = useState<VelocityItem[]>([]);
  const [workload, setWorkload] = useState<WorkloadItem[]>([]);
  const [timeTracking, setTimeTracking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active report tab: 'all' | 'burndown' | 'velocity' | 'workload' | 'timetracking'
  const [reportTab, setReportTab] = useState<'all' | 'burndown' | 'velocity' | 'workload' | 'timetracking'>('all');

  const loadReports = async () => {
    try {
      setLoading(true);
      const [sumData, velData, workData, timeData] = await Promise.all([
        fetchProjectSummary(project.id),
        fetchVelocity(project.id),
        fetchWorkload(project.id),
        fetchTimeTracking(project.id)
      ]);
      setSummary(sumData);
      setVelocity(velData);
      setWorkload(workData);
      setTimeTracking(timeData);

      if (selectedSprintId) {
        const burnData = await fetchBurndown(selectedSprintId);
        setBurndown(burnData);
      }
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [project.id, selectedSprintId]);

  return (
    <div className="flex-1 min-w-0 w-full overflow-y-auto bg-slate-50 h-[calc(100vh-3.5rem)] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <span>Spaces</span>
              <span>/</span>
              <div className="flex items-center gap-1 font-medium text-slate-700">
                <SpaceAvatar project={project} size="xs" />
                <span>{project.name}</span>
              </div>
              <span>/</span>
              <span className="font-semibold text-slate-900">Reports</span>
            </div>
            <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight flex items-center gap-2">
              <span>Reports</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase">
                Realtime
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadReports}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs transition"
              title="Refresh Reports"
            >
              <Icons.Refresh className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setReportTab('all')}
            className={`px-3 py-1.5 rounded-md transition ${
              reportTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Reports
          </button>
          <button
            onClick={() => setReportTab('burndown')}
            className={`px-3 py-1.5 rounded-md transition ${
              reportTab === 'burndown' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Sprint Burndown
          </button>
          <button
            onClick={() => setReportTab('velocity')}
            className={`px-3 py-1.5 rounded-md transition ${
              reportTab === 'velocity' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Velocity Chart
          </button>
          <button
            onClick={() => setReportTab('workload')}
            className={`px-3 py-1.5 rounded-md transition ${
              reportTab === 'workload' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Team Workload
          </button>
          <button
            onClick={() => setReportTab('timetracking')}
            className={`px-3 py-1.5 rounded-md transition ${
              reportTab === 'timetracking' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Time Tracking
          </button>
        </div>

        {/* KPI Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Issues</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{summary.totalIssues}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                {summary.doneIssues} resolved ({summary.completionPercentage.toFixed(0)}%)
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Story Points</span>
              <div className="text-2xl font-black text-blue-600 mt-1">{summary.totalStoryPoints} pts</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {summary.completedStoryPoints} completed
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours Logged</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{summary.totalLoggedHours} hrs</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Estimated: {summary.totalEstimatedHours} hrs
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sprints</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {sprints.filter((s) => s.state === 'active').length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {sprints.filter((s) => s.state === 'future').length} planned
              </div>
            </div>
          </div>
        )}

        {/* 1. SPRINT BURNDOWN CHART */}
        {(reportTab === 'all' || reportTab === 'burndown') && burndown && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Sprint Burndown Chart</span>
                  <span className="text-xs text-slate-500 font-normal">({burndown.name})</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Tracks remaining story points against the ideal burn rate guideline.
                </p>
              </div>

              {sprints.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Sprint:</span>
                  <select
                    value={selectedSprintId || ''}
                    onChange={(e) => setSelectedSprintId(parseInt(e.target.value))}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-md font-semibold text-slate-700 bg-white"
                  >
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.state})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* SVG Burndown Chart Render */}
            <div className="relative pt-4 pb-2">
              <div className="h-64 w-full flex items-end relative border-b border-l border-slate-300 pl-2">
                {/* SVG Curve Canvas */}
                <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                  {/* Ideal Guideline (Dashed Gray) */}
                  <line
                    x1="0%"
                    y1="5%"
                    x2="100%"
                    y2="95%"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />

                  {/* Actual Burndown Polyline */}
                  {burndown.days.filter((d) => d.actualPoints !== null && d.actualPoints !== undefined).length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3.5"
                      points={burndown.days
                        .filter((d) => d.actualPoints !== null && d.actualPoints !== undefined)
                        .map((d, idx, arr) => {
                          const x = (idx / (burndown.days.length - 1)) * 100;
                          const maxPts = burndown.totalPoints || 1;
                          const y = 95 - ((d.actualPoints || 0) / maxPts) * 90;
                          return `${x}%,${y}%`;
                        })
                        .join(' ')}
                    />
                  )}
                </svg>

                {/* Day data points and labels */}
                <div className="w-full flex justify-between absolute bottom-0 -mb-6 text-[10px] text-slate-500 font-medium">
                  {burndown.days.map((d, i) => (
                    <span key={i} className="truncate">
                      {d.dayLabel}
                    </span>
                  ))}
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-6 mt-10 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" />
                  <span className="text-slate-600">Guideline (Ideal Burn)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-blue-600 rounded" />
                  <span className="text-blue-700">Actual Remaining Points</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. VELOCITY CHART */}
        {(reportTab === 'all' || reportTab === 'velocity') && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Sprint Velocity Chart</h2>
              <p className="text-xs text-slate-500">
                Compares story points committed at sprint start vs. story points completed at sprint close.
              </p>
            </div>

            {velocity.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No sprint velocity history recorded yet.</div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex items-end gap-6 h-48 border-b border-l border-slate-200 pl-4 pb-2">
                  {velocity.map((v) => {
                    const max = Math.max(...velocity.map((item) => Math.max(item.committedPoints, item.completedPoints)), 10);
                    const commHeight = ((v.committedPoints || 0) / max) * 100;
                    const compHeight = ((v.completedPoints || 0) / max) * 100;

                    return (
                      <div key={v.sprintId} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div className="flex items-end gap-2 w-full max-w-[80px] h-full justify-center">
                          {/* Committed Bar */}
                          <div
                            className="w-1/2 bg-slate-300 rounded-t-sm transition-all hover:bg-slate-400 relative group flex items-start justify-center pt-1 text-[10px] font-bold text-slate-700"
                            style={{ height: `${Math.max(10, commHeight)}%` }}
                            title={`Committed: ${v.committedPoints} pts`}
                          >
                            {v.committedPoints}
                          </div>
                          {/* Completed Bar */}
                          <div
                            className="w-1/2 bg-emerald-500 rounded-t-sm transition-all hover:bg-emerald-600 relative group flex items-start justify-center pt-1 text-[10px] font-bold text-white"
                            style={{ height: `${Math.max(10, compHeight)}%` }}
                            title={`Completed: ${v.completedPoints} pts`}
                          >
                            {v.completedPoints}
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[90px]">{v.sprintName}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-6 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-slate-300 rounded-xs" />
                    <span className="text-slate-600">Committed Story Points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 bg-emerald-500 rounded-xs" />
                    <span className="text-emerald-700">Completed Story Points</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. TEAM WORKLOAD DISTRIBUTION */}
        {(reportTab === 'all' || reportTab === 'workload') && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Team Workload & Capacity</h2>
              <p className="text-xs text-slate-500">
                Distribution of assigned story points and progress across team members.
              </p>
            </div>

            <div className="space-y-3">
              {workload.map((w, idx) => {
                const totalPoints = w.totalStoryPoints || 1;
                const donePct = (w.completedStoryPoints / totalPoints) * 100;

                return (
                  <div key={idx} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                          {w.assignee.charAt(0)}
                        </div>
                        <span>{w.assignee}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <span>{w.totalIssues} issues</span>
                        <span className="font-bold text-blue-600">{w.totalStoryPoints} pts</span>
                        <span>{w.loggedHours} hrs logged</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${donePct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. TIME TRACKING REPORT */}
        {(reportTab === 'all' || reportTab === 'timetracking') && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Time Tracking & Hours Logged</h2>
              <p className="text-xs text-slate-500">
                Detailed audit of estimated vs. spent hours across issues.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Issue Key</th>
                    <th className="py-2.5 px-3">Summary</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Estimated</th>
                    <th className="py-2.5 px-3">Logged</th>
                    <th className="py-2.5 px-3">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timeTracking.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-blue-600">{t.key}</td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium truncate max-w-xs">{t.summary}</td>
                      <td className="py-2.5 px-3 text-slate-600">{t.assignee}</td>
                      <td className="py-2.5 px-3 text-slate-600">{t.estimatedHours}h</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{t.loggedHours}h</td>
                      <td className="py-2.5 px-3 text-slate-500">{t.remainingHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
