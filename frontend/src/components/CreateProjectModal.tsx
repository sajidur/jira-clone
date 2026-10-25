'use client';

import React, { useState } from 'react';
import { Icons } from './Icons';
import { createProject } from '@/lib/api';
import { Workspace } from '@/types/jira';
import { SpaceAvatarPicker } from './SpaceAvatar';

interface CreateProjectModalProps {
  onClose: () => void;
  onProjectCreated: (createdProjectId?: number) => void;
  currentWorkspace?: Workspace | null;
  workspaces?: Workspace[];
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  onClose,
  onProjectCreated,
  currentWorkspace,
  workspaces = []
}) => {
  const [selectedWsId, setSelectedWsId] = useState<number>(currentWorkspace?.id || (workspaces[0]?.id ?? 1));
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [description, setDescription] = useState('');
  const [projectTypeKey, setProjectTypeKey] = useState<'software' | 'business'>('software');
  const [template, setTemplate] = useState<'scrum' | 'kanban'>('scrum');
  const [managementType, setManagementType] = useState<'company-managed' | 'team-managed'>('company-managed');
  const [leadName, setLeadName] = useState('Sajidur Rahman');
  const [leadEmail, setLeadEmail] = useState('sajidur@akij.net');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeWs = workspaces.find((w) => w.id === selectedWsId) || currentWorkspace;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!key || key.length <= 4) {
      const autoKey = val
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 5);
      if (autoKey) setKey(autoKey);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) {
      setError('Project name and key are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const proj = await createProject({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        avatarUrl: avatarUrl || undefined,
        description: description.trim() || undefined,
        leadName: leadName.trim(),
        leadEmail: leadEmail.trim(),
        projectTypeKey,
        workspaceId: selectedWsId
      });

      onProjectCreated(proj.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              P
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Create Project</h2>
              <p className="text-[11px] text-slate-500">
                Workspace: <span className="font-semibold text-blue-600">{activeWs?.name || 'RexSystem'}</span> ({activeWs?.domain || `${activeWs?.slug || 'rexsystem'}.internal`})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-md transition"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Target Workspace Selector if multiple */}
          {workspaces.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Workspace / Atlassian Site
              </label>
              <select
                value={selectedWsId}
                onChange={(e) => setSelectedWsId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.domain || `${w.slug}.internal`}) - {w.planTier}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Project Template & Management Type Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setTemplate('scrum')}
              className={`p-3 rounded-lg border cursor-pointer transition ${
                template === 'scrum'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Scrum</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">Agile</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Sprints, backlog prioritization, story points, and burndown velocity.
              </p>
            </div>

            <div
              onClick={() => setTemplate('kanban')}
              className={`p-3 rounded-lg border cursor-pointer transition ${
                template === 'kanban'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Kanban</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">Continuous</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Visualize continuous workflow with column WIP limits and throughput.
              </p>
            </div>
          </div>

          {/* Name & Key */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Supply Chain Modernization"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="e.g. SCM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Prefix (e.g. {key || 'PROJ'}-1)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project delivering?"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Space Avatar & Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Space Logo & Color Theme
            </label>
            <SpaceAvatarPicker
              value={avatarUrl}
              projectKey={key || 'SP'}
              projectName={name || 'New Space'}
              onChange={setAvatarUrl}
            />
          </div>

          {/* Project Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Management Style
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${managementType === 'company-managed' ? 'border-blue-600 bg-blue-50/20 text-blue-900 font-semibold' : 'border-slate-200 text-slate-600'}`}>
                <input
                  type="radio"
                  name="mgmt"
                  checked={managementType === 'company-managed'}
                  onChange={() => setManagementType('company-managed')}
                  className="text-blue-600"
                />
                <div>
                  <p className="text-xs">Company-managed</p>
                  <p className="text-[10px] text-slate-400 font-normal">Standardized cross-organization configuration</p>
                </div>
              </label>
              <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${managementType === 'team-managed' ? 'border-blue-600 bg-blue-50/20 text-blue-900 font-semibold' : 'border-slate-200 text-slate-600'}`}>
                <input
                  type="radio"
                  name="mgmt"
                  checked={managementType === 'team-managed'}
                  onChange={() => setManagementType('team-managed')}
                  className="text-blue-600"
                />
                <div>
                  <p className="text-xs">Team-managed</p>
                  <p className="text-[10px] text-slate-400 font-normal">Independent autonomous setup for your team</p>
                </div>
              </label>
            </div>
          </div>

          {/* Project Lead */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Lead
              </label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lead Email
              </label>
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-xs shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
