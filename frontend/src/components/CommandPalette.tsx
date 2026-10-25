'use client';

import React, { useState, useEffect } from 'react';
import { Issue } from '@/types/jira';
import { Icons, IssueTypeIcon } from './Icons';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  onSelectView: (view: 'board' | 'backlog' | 'list' | 'roadmap' | 'reports' | 'releases' | 'config' | 'import-export' | 'search' | 'users') => void;
  onOpenCreateIssue: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  issues,
  onSelectIssue,
  onSelectView,
  onOpenCreateIssue
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredIssues = issues.filter(
    (i) =>
      i.key.toLowerCase().includes(query.toLowerCase()) ||
      i.summary.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 divide-y divide-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 gap-3">
          <Icons.Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search issues... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm text-slate-900 focus:outline-none placeholder-slate-400"
          />
        </div>

        {/* Commands & Issues List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {/* Quick Actions */}
          <div className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
            Navigation & Actions
          </div>

          <button
            onClick={() => {
              onOpenCreateIssue();
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-700 font-semibold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Icons.Plus className="w-4 h-4 text-blue-600" />
              <span>Create New Issue</span>
            </div>
            <span className="text-[10px] text-blue-400">Action</span>
          </button>

          <button
            onClick={() => {
              onSelectView('board');
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 font-medium">
              <Icons.Kanban className="w-4 h-4 text-blue-600" />
              <span>Switch to Active Kanban Board</span>
            </div>
            <span className="text-[10px] text-slate-400">View</span>
          </button>

          <button
            onClick={() => {
              onSelectView('search');
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-slate-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 font-medium">
              <Icons.Search className="w-4 h-4 text-[#0052cc]" />
              <span className="text-[#0052cc] font-semibold">Jira Query Language (JQL) Search</span>
            </div>
            <span className="text-[10px] bg-blue-100 text-[#0052cc] px-1.5 py-0.5 rounded font-mono font-bold">JQL</span>
          </button>

          <button
            onClick={() => {
              onSelectView('users');
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 font-medium">
              <Icons.User className="w-4 h-4 text-purple-600" />
              <span>Switch to People, Roles & Permissions</span>
            </div>
            <span className="text-[10px] text-slate-400">Settings</span>
          </button>

          <button
            onClick={() => {
              onSelectView('list');
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 font-medium">
              <Icons.FileText className="w-4 h-4 text-blue-600" />
              <span>Switch to Spreadsheet List View</span>
            </div>
            <span className="text-[10px] text-slate-400">View</span>
          </button>

          <button
            onClick={() => {
              onSelectView('roadmap');
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 font-medium">
              <Icons.Clock className="w-4 h-4 text-purple-600" />
              <span>Switch to Roadmap / Gantt Timeline</span>
            </div>
            <span className="text-[10px] text-slate-400">View</span>
          </button>

          <button
            onClick={() => {
              onSelectView('reports');
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 font-medium">
              <Icons.Database className="w-4 h-4 text-emerald-600" />
              <span>Open Reports & Burndown Charts</span>
            </div>
            <span className="text-[10px] text-slate-400">Analytics</span>
          </button>

          {/* Issues */}
          {filteredIssues.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                Matching Issues ({filteredIssues.length})
              </div>
              {filteredIssues.slice(0, 8).map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => {
                    onSelectIssue(issue);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <IssueTypeIcon type={issue.issueType} className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-bold text-blue-600 shrink-0">{issue.key}</span>
                    <span className="truncate">{issue.summary}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 shrink-0">
                    {issue.status}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
