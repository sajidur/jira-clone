'use client';

import React, { useEffect, useRef } from 'react';
import { Icons } from './Icons';
import type { ViewType } from './Navbar';

type Shortcut = { keys: string[]; label: string; sequence?: boolean };

export const SHORTCUT_GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'Global',
    items: [
      { keys: ['/'], label: 'Search' },
      { keys: ['Ctrl', 'K'], label: 'Search' },
      { keys: ['c'], label: 'Create a work item' },
      { keys: ['Ctrl', '['], label: 'Collapse or expand the sidebar' },
      { keys: ['?'], label: 'Open keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close the open work item' }
    ]
  },
  {
    title: 'Go to',
    items: [
      { keys: ['g', 'f'], label: 'For you', sequence: true },
      { keys: ['g', 'p'], label: 'Spaces', sequence: true },
      { keys: ['g', 'a'], label: 'Board of the current space', sequence: true },
      { keys: ['g', 'b'], label: 'Backlog of the current space', sequence: true },
      { keys: ['g', 'i'], label: 'Search work items', sequence: true },
      { keys: ['g', 'd'], label: 'Dashboards (reports)', sequence: true }
    ]
  },
  {
    title: 'In a space',
    items: [
      { keys: ['1'], label: 'Backlog' },
      { keys: ['2'], label: 'Board' },
      { keys: ['3'], label: 'Reports' }
    ]
  }
];

const GO_TO: Record<string, ViewType> = { f: 'for-you', p: 'spaces', a: 'board', b: 'backlog', i: 'search', d: 'reports' };
const IN_SPACE: Record<string, ViewType> = { '1': 'backlog', '2': 'board', '3': 'reports' };

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/** True while any modal dialog (fixed full-screen overlay) other than the issue panel is open. */
function dialogOpen(): boolean {
  return !!document.querySelector('[role="dialog"], [role="menu"]');
}

export function useGlobalShortcuts(actions: {
  search: () => void;
  create: () => void;
  showShortcuts: () => void;
  toggleSidebar: () => void;
  navigate: (view: ViewType) => void;
  closeIssue?: () => void;
  inSpace: boolean;
  /** While an issue is open, page-switching shortcuts are off so it isn't closed by accident. */
  issueOpen: boolean;
}) {
  const latest = useRef(actions);
  latest.current = actions;
  const pendingG = useRef(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const a = latest.current;

      if (e.ctrlKey && e.key === '[') {
        e.preventDefault();
        a.toggleSidebar();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;

      if (e.key === 'Escape') {
        if (a.closeIssue && !dialogOpen()) a.closeIssue();
        return;
      }
      if (dialogOpen()) return;

      if (pendingG.current && Date.now() - pendingG.current < 1500) {
        pendingG.current = 0;
        const view = GO_TO[e.key.toLowerCase()];
        if (view) {
          e.preventDefault();
          a.navigate(view);
        }
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          a.search();
          return;
        case 'c':
          e.preventDefault();
          a.create();
          return;
        case '?':
          e.preventDefault();
          a.showShortcuts();
          return;
        case 'g':
          if (!a.issueOpen) pendingG.current = Date.now();
          return;
      }
      if (a.inSpace && !a.issueOpen && IN_SPACE[e.key]) {
        e.preventDefault();
        a.navigate(IN_SPACE[e.key]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-[3px] bg-[#F4F5F7] border border-[#DFE1E6] text-[11px] font-semibold text-[#42526E] font-sans">
    {children}
  </kbd>
);

export const ShortcutsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#091E42]/50 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-white rounded-[3px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 id="shortcuts-title" className="text-xl font-semibold text-[#172B4D] flex items-center gap-2">
            <Icons.Keyboard className="w-5 h-5 text-[#42526E]" />
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[3px] text-[#42526E] hover:bg-[#EBECF0] cursor-pointer"
            aria-label="Close"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 pb-6 grid sm:grid-cols-2 gap-x-8 gap-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#5E6C84] mb-2">{group.title}</h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.label + item.keys.join()} className="flex items-center justify-between gap-3 text-sm text-[#172B4D]">
                    <span>{item.label}</span>
                    <span className="flex items-center gap-1 shrink-0 text-xs text-[#5E6C84]">
                      {item.keys.map((k, i) => (
                        <React.Fragment key={k + i}>
                          {i > 0 && <span>{item.sequence ? 'then' : '+'}</span>}
                          <Key>{k}</Key>
                        </React.Fragment>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
