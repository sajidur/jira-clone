'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Project } from '@/types/jira';
import { fetchIssue } from '@/lib/api';
import { AdminSection, ParsedRoute, PROJECT_VIEWS, parseRoute, routeFor } from '@/lib/routes';
import { useJira } from '@/context/JiraContext';
import type { ViewType } from './Navbar';

interface AppNavigationValue {
  route: ParsedRoute;
  /** The view the URL points at; null for not-found and redirects. */
  activeView: ViewType | null;
  /** Issue shown on top of the page (?selectedIssue=KEY or /browse/KEY). */
  selectedIssueKey: string | null;
  hrefFor: (view: ViewType, project?: Project | null) => string;
  issueHref: (issueKey: string) => string;
  navigate: (view: ViewType, project?: Project | null) => void;
  /** Opens a space, keeping the current space view (Board, Backlog…) when there is one. */
  selectProject: (project: Project) => void;
  showAdminSection: (section: AdminSection) => void;
  openIssue: (keyOrId: string | number) => void;
  closeIssue: () => void;
}

const AppNavigationContext = createContext<AppNavigationValue | null>(null);

export const AppNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedProject, projects, issues } = useJira();

  const route = useMemo(() => parseRoute(pathname), [pathname]);
  const activeView: ViewType | null = route.kind === 'view' ? route.view : route.kind === 'browse' ? 'board' : null;
  const selectedIssueKey =
    searchParams.get('selectedIssue')?.toUpperCase() ?? (route.kind === 'browse' ? route.issueKey : null);

  // Callers often select a project and a view in the same click, e.g. onSelectProject(p); setActiveView('board').
  // Both land in `pending` and become one navigation once the click handler has finished.
  const latest = useRef({ selectedProject, activeView });
  latest.current = { selectedProject, activeView };
  const pending = useRef<{ project?: Project; view?: ViewType } | null>(null);

  const schedule = useCallback(
    (update: { project?: Project; view?: ViewType }) => {
      const isFirst = pending.current === null;
      pending.current = { ...pending.current, ...update };
      if (!isFirst) return;

      queueMicrotask(() => {
        const { project, view } = pending.current!;
        pending.current = null;
        const current = latest.current.activeView;
        const target = view ?? (current && PROJECT_VIEWS.includes(current) ? current : 'board');
        router.push(routeFor(target, project ?? latest.current.selectedProject), { scroll: false });
      });
    },
    [router]
  );

  // Project of the page behind the issue: on /browse/KEY that's the issue's own space
  const backgroundProject = useCallback(() => {
    if (route.kind === 'browse') {
      return projects.find((p) => p.key.toUpperCase() === route.projectKey) ?? latest.current.selectedProject;
    }
    return latest.current.selectedProject;
  }, [route, projects]);

  const issueHref = useCallback(
    (issueKey: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('selectedIssue', issueKey.toUpperCase());
      const base = route.kind === 'browse' || route.kind === 'not-found' ? routeFor('board', backgroundProject()) : pathname;
      return `${base}?${params.toString()}`;
    },
    [searchParams, route, pathname, backgroundProject]
  );

  const openIssue = useCallback(
    (keyOrId: string | number) => {
      if (typeof keyOrId === 'string') {
        router.push(issueHref(keyOrId), { scroll: false });
        return;
      }
      const loaded = issues.find((i) => i.id === keyOrId);
      if (loaded) {
        router.push(issueHref(loaded.key), { scroll: false });
        return;
      }
      fetchIssue(keyOrId)
        .then((issue) => router.push(issueHref(issue.key), { scroll: false }))
        .catch((err) => console.error('Failed to open issue', keyOrId, err));
    },
    [issues, issueHref, router]
  );

  const closeIssue = useCallback(() => {
    if (route.kind === 'browse') {
      router.push(routeFor('board', backgroundProject()), { scroll: false });
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('selectedIssue');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [route, searchParams, pathname, router, backgroundProject]);

  const value: AppNavigationValue = {
    route,
    activeView,
    selectedIssueKey,
    hrefFor: (view, project) => routeFor(view, project === undefined ? selectedProject : project),
    issueHref,
    navigate: (view, project) => schedule(project ? { view, project } : { view }),
    selectProject: (project) => schedule({ project }),
    showAdminSection: (section) => router.push(routeFor('admin', null, section), { scroll: false }),
    openIssue,
    closeIssue
  };

  return <AppNavigationContext.Provider value={value}>{children}</AppNavigationContext.Provider>;
};

export function useAppNavigation(): AppNavigationValue {
  const ctx = useContext(AppNavigationContext);
  if (!ctx) throw new Error('useAppNavigation must be used inside <AppNavigationProvider>');
  return ctx;
}
