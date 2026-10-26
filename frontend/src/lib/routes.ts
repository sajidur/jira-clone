import type { Project } from '@/types/jira';
import type { ViewType } from '@/components/Navbar';

/**
 * URL scheme, modelled on Jira Cloud:
 *
 *   /jira/for-you                                     For you
 *   /jira/projects                                    Spaces directory
 *   /jira/software/projects/ERP/boards/1              Board (1 = project id)
 *   /jira/software/projects/ERP/boards/1/backlog      Backlog
 *   /jira/software/projects/ERP/boards/1/timeline     Timeline
 *   /jira/software/projects/ERP/boards/1/reports      Reports
 *   /jira/software/projects/ERP/list                  List
 *   /jira/software/projects/ERP/versions              Releases
 *   /jira/software/projects/ERP/settings              Space settings
 *   /issues                                           Search (JQL)
 *   /jira/people                                      People, roles & permissions
 *   /jira/settings/workspace                          Workspace settings
 *   /jira/settings/system/import-export               Import & export
 *   /admin[/users|/sessions|/email]                   Administration
 *   /browse/ERP-12                                    Issue
 *
 * Any page can also carry ?selectedIssue=ERP-12 to show that issue on top.
 */

export type AdminSection = 'overview' | 'users' | 'sessions' | 'email';

export const ADMIN_SECTIONS: AdminSection[] = ['overview', 'users', 'sessions', 'email'];

/** Views that show one space and need its project loaded. */
export const PROJECT_VIEWS: ViewType[] = ['board', 'backlog', 'list', 'roadmap', 'reports', 'releases', 'config'];

export type ParsedRoute =
  | { kind: 'redirect'; to: string }
  | { kind: 'view'; view: ViewType; projectKey?: string; adminSection?: AdminSection }
  | { kind: 'browse'; issueKey: string; projectKey: string }
  | { kind: 'not-found' };

const NOT_FOUND: ParsedRoute = { kind: 'not-found' };
const HOME = '/jira/for-you';

const view = (v: ViewType, extra: { projectKey?: string; adminSection?: AdminSection } = {}): ParsedRoute => ({
  kind: 'view',
  view: v,
  ...extra
});

/** Issue keys are PROJECT-123; the project key is everything before the last hyphen. */
export function projectKeyOfIssue(issueKey: string): string {
  const dash = issueKey.lastIndexOf('-');
  return (dash > 0 ? issueKey.slice(0, dash) : issueKey).toUpperCase();
}

export function parseRoute(pathname: string): ParsedRoute {
  const parts = pathname
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p));

  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'jira')) return { kind: 'redirect', to: HOME };

  const [first, second, third, fourth, fifth, sixth, seventh] = parts;

  if (first === 'browse') {
    return parts.length === 2 && /^[A-Za-z][A-Za-z0-9_]*-\d+$/.test(second)
      ? { kind: 'browse', issueKey: second.toUpperCase(), projectKey: projectKeyOfIssue(second) }
      : NOT_FOUND;
  }

  if (first === 'issues') return parts.length === 1 ? view('search') : NOT_FOUND;

  if (first === 'admin') {
    const section = (second ?? 'overview') as AdminSection;
    return parts.length <= 2 && ADMIN_SECTIONS.includes(section) ? view('admin', { adminSection: section }) : NOT_FOUND;
  }

  if (first !== 'jira') return NOT_FOUND;

  switch (second) {
    case 'for-you':
    case 'your-work':
      return parts.length === 2 ? view('for-you') : NOT_FOUND;
    case 'projects':
      return parts.length === 2 ? view('spaces') : NOT_FOUND;
    case 'people':
      return parts.length === 2 ? view('users') : NOT_FOUND;
    case 'settings':
      if (third === 'workspace' && parts.length === 3) return view('workspace-settings');
      if (third === 'system' && fourth === 'import-export' && parts.length === 4) return view('import-export');
      return NOT_FOUND;
    case 'software': {
      if (third !== 'projects' || !fourth) return NOT_FOUND;
      const projectKey = fourth.toUpperCase();

      if (parts.length === 4) return view('board', { projectKey });
      if (fifth === 'boards' && sixth) {
        if (parts.length === 6) return view('board', { projectKey });
        const boardPage: Record<string, ViewType> = { backlog: 'backlog', timeline: 'roadmap', reports: 'reports' };
        if (parts.length === 7 && seventh in boardPage) return view(boardPage[seventh], { projectKey });
        return NOT_FOUND;
      }
      const spacePage: Record<string, ViewType> = { list: 'list', versions: 'releases', settings: 'config' };
      if (parts.length === 5 && fifth in spacePage) return view(spacePage[fifth], { projectKey });
      return NOT_FOUND;
    }
    default:
      return NOT_FOUND;
  }
}

/** The URL of a view. Space views need a project; without one they fall back to the Spaces directory. */
export function routeFor(target: ViewType, project?: Project | null, adminSection?: AdminSection): string {
  const space = project ? `/jira/software/projects/${encodeURIComponent(project.key)}` : null;
  const board = project ? `${space}/boards/${project.id}` : null;

  switch (target) {
    case 'for-you':
      return HOME;
    case 'spaces':
      return '/jira/projects';
    case 'board':
      return board ?? '/jira/projects';
    case 'backlog':
      return board ? `${board}/backlog` : '/jira/projects';
    case 'roadmap':
      return board ? `${board}/timeline` : '/jira/projects';
    case 'reports':
      return board ? `${board}/reports` : '/jira/projects';
    case 'list':
      return space ? `${space}/list` : '/jira/projects';
    case 'releases':
      return space ? `${space}/versions` : '/jira/projects';
    case 'config':
      return space ? `${space}/settings` : '/jira/projects';
    case 'search':
      return '/issues';
    case 'users':
      return '/jira/people';
    case 'workspace-settings':
      return '/jira/settings/workspace';
    case 'import-export':
      return '/jira/settings/system/import-export';
    case 'admin':
      return adminSection && adminSection !== 'overview' ? `/admin/${adminSection}` : '/admin';
    default:
      return HOME;
  }
}

const VIEW_TITLES: Record<ViewType, string> = {
  'for-you': 'For you',
  spaces: 'Spaces',
  board: 'Board',
  backlog: 'Backlog',
  list: 'List',
  roadmap: 'Timeline',
  reports: 'Reports',
  releases: 'Releases',
  config: 'Space settings',
  'import-export': 'Import & export',
  search: 'Search',
  users: 'People',
  'workspace-settings': 'Workspace settings',
  admin: 'Administration'
};

export function viewTitle(v: ViewType): string {
  return VIEW_TITLES[v] ?? 'Jira';
}
