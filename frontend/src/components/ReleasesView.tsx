'use client';

import React, { useState, useEffect } from 'react';
import { Project, ProjectVersion } from '@/types/jira';
import { Icons } from './Icons';
import { fetchVersions, createVersion, releaseVersion } from '@/lib/api';

interface ReleasesViewProps {
  project: Project;
}

export const ReleasesView: React.FC<ReleasesViewProps> = ({ project }) => {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionDesc, setVersionDesc] = useState('');

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await fetchVersions(project.id);
      setVersions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [project.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) return;
    await createVersion({
      projectId: project.id,
      name: versionName.trim(),
      description: versionDesc.trim() || undefined
    });
    setVersionName('');
    setVersionDesc('');
    setShowCreateModal(false);
    await loadVersions();
  };

  const handleRelease = async (id: number) => {
    await releaseVersion(id);
    await loadVersions();
  };

  return (
    <div className="flex-1 min-w-0 w-full overflow-y-auto bg-slate-50 h-[calc(100vh-3.5rem)] p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>{project.name}</span>
              <span>/</span>
              <span className="font-semibold text-slate-700">Releases</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Versions & Releases
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadVersions}
              className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-md shadow-2xs transition"
            >
              <Icons.Refresh className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Icons.Plus className="w-4 h-4" />
              <span>Create Version</span>
            </button>
          </div>
        </div>

        {/* Versions List */}
        <div className="space-y-4">
          {versions.map((ver) => {
            const total = ver.totalIssues || 0;
            const completed = ver.completedIssues || 0;
            const pct = total > 0 ? (completed / total) * 100 : 0;

            return (
              <div
                key={ver.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-slate-900">{ver.name}</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        ver.isReleased
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {ver.isReleased ? 'RELEASED' : 'IN PROGRESS'}
                    </span>
                    {ver.description && (
                      <span className="text-xs text-slate-500 italic">&bull; {ver.description}</span>
                    )}
                  </div>

                  {!ver.isReleased && (
                    <button
                      onClick={() => handleRelease(ver.id)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded transition"
                    >
                      Release version
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {completed} of {total} issues completed
                    </span>
                    <span className="font-semibold text-slate-700">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {versions.length === 0 && !loading && (
            <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
              No releases defined for this project yet. Click &quot;Create Version&quot; to plan your first release.
            </div>
          )}
        </div>
      </div>

      {/* Create Version Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create Version</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Version Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. v1.0.0"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Release highlights and scope..."
                  value={versionDesc}
                  onChange={(e) => setVersionDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
