'use client';

import { useSyncExternalStore } from 'react';

/**
 * "Recent" and "Starred" for the sidebar, kept in this browser like Jira's quick-access lists.
 * Starred spaces share the 'jira_starred_spaces' key with the Spaces directory.
 */

export interface RecentIssue {
  key: string;
  summary: string;
  issueType: string;
}

interface QuickAccess {
  recentSpaceKeys: string[];
  recentIssues: RecentIssue[];
  starredSpaceIds: number[];
}

const RECENT_SPACES_KEY = 'jira_recent_spaces';
const RECENT_ISSUES_KEY = 'jira_recent_issues';
const STARRED_SPACES_KEY = 'jira_starred_spaces';
const CHANGE_EVENT = 'jira:quick-access-changed';
const MAX_SPACES = 8;
const MAX_ISSUES = 10;

const EMPTY: QuickAccess = { recentSpaceKeys: [], recentIssues: [], starredSpaceIds: [] };
let snapshot: QuickAccess | null = null;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  snapshot = null;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function getSnapshot(): QuickAccess {
  if (!snapshot) {
    snapshot = {
      recentSpaceKeys: read<string[]>(RECENT_SPACES_KEY, []),
      recentIssues: read<RecentIssue[]>(RECENT_ISSUES_KEY, []),
      starredSpaceIds: read<number[]>(STARRED_SPACES_KEY, [])
    };
  }
  return snapshot;
}

function subscribe(onChange: () => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === null || [RECENT_SPACES_KEY, RECENT_ISSUES_KEY, STARRED_SPACES_KEY].includes(e.key)) {
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

export function useQuickAccess(): QuickAccess {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function recordRecentSpace(projectKey: string) {
  const current = getSnapshot().recentSpaceKeys;
  if (current[0] === projectKey) return;
  write(RECENT_SPACES_KEY, [projectKey, ...current.filter((k) => k !== projectKey)].slice(0, MAX_SPACES));
}

export function recordRecentIssue(issue: RecentIssue) {
  const current = getSnapshot().recentIssues;
  if (current[0]?.key === issue.key && current[0]?.summary === issue.summary) return;
  write(RECENT_ISSUES_KEY, [issue, ...current.filter((i) => i.key !== issue.key)].slice(0, MAX_ISSUES));
}

export function setStarredSpaceIds(ids: number[]) {
  write(STARRED_SPACES_KEY, ids);
}

export function toggleStarredSpace(projectId: number) {
  const current = getSnapshot().starredSpaceIds;
  setStarredSpaceIds(current.includes(projectId) ? current.filter((id) => id !== projectId) : [...current, projectId]);
}
