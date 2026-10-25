'use client';

import React, { useState, useEffect } from 'react';
import { Project } from '@/types/jira';
import { updateProject } from '@/lib/api';
import { Icons } from './Icons';
import { SpaceAvatar, SpaceAvatarPicker } from './SpaceAvatar';

interface EditSpaceModalProps {
  isOpen: boolean;
  space: Project | null;
  onClose: () => void;
  onUpdated: (updatedSpace: Project) => void;
}

export const EditSpaceModal: React.FC<EditSpaceModalProps> = ({
  isOpen,
  space,
  onClose,
  onUpdated
}) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [description, setDescription] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [projectTypeKey, setProjectTypeKey] = useState('software');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (space) {
      setName(space.name || '');
      setAvatarUrl(space.avatarUrl || '');
      setDescription(space.description || '');
      setLeadName(space.leadName || 'Sajidur Rahman');
      setLeadEmail(space.leadEmail || 'sajidur@akij.net');
      setProjectTypeKey(space.projectTypeKey || 'software');
      setError(null);
    }
  }, [space, isOpen]);

  if (!isOpen || !space) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Space name cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await updateProject(space.id, {
        name: name.trim(),
        avatarUrl,
        description: description.trim(),
        leadName: leadName.trim(),
        leadEmail: leadEmail.trim(),
        projectTypeKey
      });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update space', err);
      setError(err.message || 'Failed to update space name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <SpaceAvatar project={{ ...space, avatarUrl }} size="md" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Space Details</h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <span>Key: {space.key}</span>
                <span>•</span>
                <span>ID: #{space.id}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <Icons.X className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Space Avatar & Color Picker */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5">
              Space Logo & Color Theme
            </label>
            <SpaceAvatarPicker
              value={avatarUrl}
              projectKey={space.key}
              projectName={name || space.name}
              onChange={setAvatarUrl}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Space Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. RexSystem Cloud Agile Platform, ERP Core"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc] text-xs transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The display name of the space shown across boards, backlogs, reports, and spaces directory.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Space Key
              </label>
              <input
                type="text"
                disabled
                value={space.key}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-500 bg-slate-100 font-mono text-xs cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Issue prefix (immutable)
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Project Category / Type
              </label>
              <select
                value={projectTypeKey}
                onChange={(e) => setProjectTypeKey(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
              >
                <option value="software">Software (Scrum / Agile)</option>
                <option value="kanban">Software (Kanban)</option>
                <option value="business">Business / Ops</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Description / Space Mission
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this project space, goals, or team scope..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc] transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Project Lead Name
              </label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="e.g. Sajidur Rahman"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Lead Email Address
              </label>
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="sajidur@akij.net"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 rounded-lg bg-[#0052cc] hover:bg-[#0047b3] disabled:opacity-50 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 text-xs"
            >
              {loading && <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Saving...' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSpaceModal;
