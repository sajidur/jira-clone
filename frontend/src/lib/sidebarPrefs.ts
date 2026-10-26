'use client';

import { useSyncExternalStore } from 'react';

/** Sidebar items, like Jira's "More > Customize sidebar": personal, kept in this browser. */
export type SidebarItemId =
  | 'for-you'
  | 'recent'
  | 'starred'
  | 'apps'
  | 'plans'
  | 'spaces'
  | 'filters'
  | 'dashboards'
  | 'teams'
  | 'workspace';

export const SIDEBAR_ITEMS: { id: SidebarItemId; label: string; defaultHidden?: boolean }[] = [
  { id: 'for-you', label: 'For you' },
  { id: 'recent', label: 'Recent' },
  { id: 'starred', label: 'Starred' },
  { id: 'apps', label: 'Apps' },
  { id: 'plans', label: 'Plans' },
  { id: 'spaces', label: 'Spaces' },
  { id: 'filters', label: 'Filters' },
  { id: 'dashboards', label: 'Dashboards' },
  { id: 'teams', label: 'Teams' },
  { id: 'workspace', label: 'Workspace settings', defaultHidden: true }
];

export interface SidebarPrefs {
  order: SidebarItemId[];
  hidden: SidebarItemId[];
}

const STORAGE_KEY = 'jira_sidebar_prefs';
const CHANGE_EVENT = 'jira:sidebar-prefs-changed';

const DEFAULTS: SidebarPrefs = {
  order: SIDEBAR_ITEMS.map((i) => i.id),
  hidden: SIDEBAR_ITEMS.filter((i) => i.defaultHidden).map((i) => i.id)
};

let snapshot: SidebarPrefs | null = null;

// Keeps saved prefs valid when items are added or removed in a later version
function normalize(prefs: Partial<SidebarPrefs>): SidebarPrefs {
  const known = new Set(DEFAULTS.order);
  const order = (prefs.order ?? []).filter((id) => known.has(id));
  for (const id of DEFAULTS.order) if (!order.includes(id)) order.push(id);
  const hidden = (prefs.hidden ?? DEFAULTS.hidden).filter((id) => known.has(id));
  return { order, hidden };
}

function getSnapshot(): SidebarPrefs {
  if (!snapshot) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      snapshot = raw ? normalize(JSON.parse(raw)) : DEFAULTS;
    } catch {
      snapshot = DEFAULTS;
    }
  }
  return snapshot;
}

function subscribe(onChange: () => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) {
      snapshot = null;
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', handleStorage);
  };
}

export function useSidebarPrefs(): SidebarPrefs {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);
}

export function saveSidebarPrefs(prefs: SidebarPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
  snapshot = normalize(prefs);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function resetSidebarPrefs() {
  saveSidebarPrefs(DEFAULTS);
}
