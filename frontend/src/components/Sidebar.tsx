'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types/jira';
import { PROJECT_VIEWS } from '@/lib/routes';
import { useQuickAccess } from '@/lib/recent';
import { useJira } from '@/context/JiraContext';
import { useAppNavigation } from './AppNavigation';
import { Icons, IssueTypeIcon } from './Icons';
import { useCurrentUser, getInitials } from './AuthProvider';
import { SpaceAvatar } from './SpaceAvatar';
import type { ViewType } from './Navbar';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenCreateProject?: () => void;
  onOpenAccountSettings?: () => void;
  onEditSpace?: (p: Project) => void;
}

type Flyout = { kind: 'recent' | 'starred'; top: number; left: number };

const MAX_SIDEBAR_SPACES = 5;

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onCloseMobile,
  onOpenCreateProject,
  onOpenAccountSettings,
  onEditSpace
}) => {
  const currentUser = useCurrentUser();
  const { projects, selectedProject } = useJira();
  const nav = useAppNavigation();
  const { recentSpaceKeys, recentIssues, starredSpaceIds } = useQuickAccess();
  const [collapsed, setCollapsed] = useState(false);
  const [flyout, setFlyout] = useState<Flyout | null>(null);

  const activeView = nav.activeView;
  const inSpace = !!activeView && PROJECT_VIEWS.includes(activeView);
  const routeProjectKey =
    nav.route.kind === 'view' || nav.route.kind === 'browse' ? nav.route.projectKey : undefined;

  const byKey = (key?: string) => projects.find((p) => p.key.toUpperCase() === key?.toUpperCase());
  const recentSpaces = [selectedProject?.key, ...recentSpaceKeys]
    .filter((key, i, all): key is string => !!key && all.indexOf(key) === i)
    .map(byKey)
    .filter((p): p is Project => !!p);
  const starredSpaces = projects.filter((p) => starredSpaceIds.includes(p.id));

  const closeAll = () => {
    setFlyout(null);
    onCloseMobile?.();
  };

  const toggleFlyout = (kind: Flyout['kind'], e: React.MouseEvent<HTMLButtonElement>) => {
    if (flyout?.kind === kind) {
      setFlyout(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const opensBeside = window.innerWidth >= 640;
    setFlyout({
      kind,
      top: opensBeside ? rect.top : rect.bottom + 4,
      left: opensBeside ? rect.right + 8 : rect.left
    });
  };

  const itemClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
      active ? 'bg-[#E9F2FF] text-[#0052cc] font-bold' : 'text-slate-700 hover:bg-[#EBECF0]'
    } ${collapsed ? 'justify-center px-1' : ''}`;

  // Render helpers (plain functions, not components, so React keeps their DOM between renders)
  const navItem = (view: ViewType, label: string, icon: React.ReactNode, badge?: React.ReactNode) => {
    const active = activeView === view;
    return (
      <Link
        key={view}
        href={nav.hrefFor(view)}
        onClick={closeAll}
        className={itemClass(active)}
        title={label}
        aria-current={active ? 'page' : undefined}
      >
        <span className={`shrink-0 ${active ? 'text-[#0052cc]' : 'text-slate-500'}`}>{icon}</span>
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!collapsed && badge}
      </Link>
    );
  };

  const flyoutButton = (kind: Flyout['kind'], label: string, icon: React.ReactNode) => (
    <button
      key={kind}
      type="button"
      onClick={(e) => toggleFlyout(kind, e)}
      className={itemClass(flyout?.kind === kind)}
      title={label}
      aria-expanded={flyout?.kind === kind}
      aria-haspopup="menu"
    >
      <span className="shrink-0 text-slate-500">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </>
      )}
    </button>
  );

  const spaceRow = (project: Project) => (
    <Link
      key={project.id}
      href={nav.hrefFor('board', project)}
      onClick={closeAll}
      className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-[#172B4D] hover:bg-[#F4F5F7]"
    >
      <SpaceAvatar project={project} size="xs" />
      <span className="flex-1 truncate">{project.name}</span>
      <span className="text-[11px] text-[#7A869A] font-mono">{project.key}</span>
    </Link>
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-40 md:hidden animate-in fade-in duration-150"
        />
      )}

      <aside
        className={`bg-[#FAFBFC] border-r border-[#EBECF0] h-[calc(100vh-3.5rem)] flex flex-col justify-between select-none overflow-y-auto transition-all duration-200 ease-in-out shrink-0 font-sans z-50 ${
          isMobileOpen
            ? 'fixed inset-y-14 left-0 w-64 p-3 shadow-2xl flex md:relative md:inset-auto md:shadow-none'
            : 'hidden md:flex'
        } ${collapsed && !isMobileOpen ? 'md:w-14 p-2' : 'md:w-60 p-2.5'}`}
        aria-label="Jira navigation"
      >
        <div className="space-y-1">
          {/* Global navigation */}
          <div className="space-y-0.5">
            {navItem('for-you', 'For you', <Icons.User className="w-4 h-4" />)}
            {flyoutButton('recent', 'Recent', <Icons.Clock className="w-4 h-4" />)}
            {flyoutButton('starred', 'Starred', <Icons.Star className="w-4 h-4" />)}
            {navItem('import-export', 'Apps', <Icons.AppSwitcher className="w-4 h-4" />)}
            {navItem('roadmap', 'Plans', <Icons.Kanban className="w-4 h-4" />)}
          </div>

          {/* Spaces */}
          <div className="pt-2">
            {!collapsed ? (
              <div className="flex items-center justify-between px-2.5 py-1 text-slate-600 text-xs font-semibold">
                <Link
                  href={nav.hrefFor('spaces')}
                  onClick={closeAll}
                  className={`flex items-center gap-2.5 hover:text-[#0052cc] transition ${
                    activeView === 'spaces' ? 'text-[#0052cc] font-bold' : ''
                  }`}
                  title="View all spaces"
                >
                  <Icons.Compass className={`w-4 h-4 ${activeView === 'spaces' ? 'text-[#0052cc]' : 'text-slate-500'}`} />
                  <span>Spaces</span>
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenCreateProject}
                    className="p-1 hover:bg-[#EBECF0] rounded text-slate-500 hover:text-slate-900 cursor-pointer"
                    title="Create space"
                  >
                    <Icons.Plus className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={nav.hrefFor('spaces')}
                    onClick={closeAll}
                    className="p-1 hover:bg-[#EBECF0] rounded text-slate-500 hover:text-slate-900"
                    title="All spaces"
                  >
                    <Icons.MoreHorizontal className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <Link
                href={nav.hrefFor('spaces')}
                onClick={closeAll}
                className={`w-full flex justify-center py-1.5 rounded transition ${
                  activeView === 'spaces' ? 'bg-[#E9F2FF] text-[#0052cc]' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="All spaces"
              >
                <Icons.Compass className="w-4 h-4" />
              </Link>
            )}

            {!collapsed && (
              <div className="pl-3 pr-1 pt-1 space-y-0.5">
                {recentSpaces.length > 0 && (
                  <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent</div>
                )}

                {recentSpaces.slice(0, MAX_SIDEBAR_SPACES).map((p) => {
                  const active = inSpace && routeProjectKey === p.key.toUpperCase();
                  return (
                    <div key={p.id} className="relative group">
                      <Link
                        href={nav.hrefFor('board', p)}
                        onClick={closeAll}
                        aria-current={active ? 'page' : undefined}
                        className={`w-full flex items-center gap-2 pl-2 pr-7 py-1.5 rounded-r-md text-xs font-semibold transition ${
                          active
                            ? 'border-l-[3px] border-[#0052cc] bg-[#E9F2FF] text-[#0052cc]'
                            : 'border-l-[3px] border-transparent text-slate-800 hover:bg-[#EBECF0]'
                        }`}
                      >
                        <SpaceAvatar project={p} size="xs" />
                        <span className="truncate">{p.name}</span>
                      </Link>
                      {onEditSpace && (
                        <button
                          type="button"
                          onClick={() => onEditSpace(p)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 p-0.5 rounded transition cursor-pointer"
                          title={`Edit ${p.name}`}
                        >
                          <Icons.Edit className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                <Link
                  href={nav.hrefFor('spaces')}
                  onClick={closeAll}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs text-slate-600 hover:bg-[#EBECF0] transition"
                >
                  <span className="flex items-center gap-2">
                    <Icons.Folder className="w-3.5 h-3.5 text-slate-400" />
                    <span>More spaces</span>
                  </span>
                  <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            )}
          </div>

          <div className="border-t border-[#EBECF0] my-2" />

          <div className="space-y-0.5">
            {navItem('search', 'Filters', <Icons.Filter className="w-4 h-4" />)}
            {navItem('reports', 'Dashboards', <Icons.BarChart className="w-4 h-4" />)}
            {navItem('config', 'Operations', <Icons.Settings className="w-4 h-4" />)}
            {navItem('users', 'Customers', <Icons.Users className="w-4 h-4" />)}
            {navItem(
              'workspace-settings',
              'Customer experiences',
              <Icons.Shield className="w-4 h-4 text-purple-600" />,
              <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-bold text-[9px] uppercase">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Footer: account settings + collapse */}
        <div className="pt-2 border-t border-[#EBECF0] space-y-1">
          <button
            type="button"
            onClick={() => {
              onOpenAccountSettings?.();
              onCloseMobile?.();
            }}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#EBECF0] transition cursor-pointer ${
              collapsed ? 'justify-center px-1' : ''
            }`}
            title="Account settings & profile"
          >
            <div className="w-5 h-5 rounded-full bg-[#0052cc] text-white font-bold text-[9px] flex items-center justify-center shrink-0">
              {getInitials(currentUser.displayName)}
            </div>
            {!collapsed && (
              <div className="flex items-center justify-between flex-1 truncate">
                <span className="truncate font-semibold text-slate-800">Account settings</span>
                <Icons.Settings className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full hidden md:flex items-center p-2 rounded-lg hover:bg-[#EBECF0] text-slate-500 hover:text-slate-900 transition cursor-pointer ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {!collapsed && <span className="text-xs font-semibold">Collapse sidebar</span>}
            <Icons.ChevronRight className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </aside>

      {/* Recent / Starred flyouts (fixed so the scrolling sidebar doesn't clip them) */}
      {flyout && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setFlyout(null)} />
          <div
            role="menu"
            className="fixed z-[61] w-80 max-w-[calc(100vw-1rem)] max-h-[70vh] overflow-y-auto bg-white rounded-[3px] shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)] py-2"
            style={{
              top: Math.max(8, Math.min(flyout.top, window.innerHeight - 440)),
              left: Math.max(8, Math.min(flyout.left, window.innerWidth - 328))
            }}
          >
            {flyout.kind === 'recent' ? (
              <>
                <div className="px-3 pt-1 pb-1.5 text-[11px] font-bold uppercase text-[#5E6C84]">Spaces</div>
                {recentSpaces.length === 0 ? (
                  <p className="px-3 pb-2 text-sm text-[#5E6C84]">Spaces you visit will show up here.</p>
                ) : (
                  recentSpaces.slice(0, 5).map(spaceRow)
                )}

                <div className="mt-1 px-3 pt-2 pb-1.5 text-[11px] font-bold uppercase text-[#5E6C84] border-t border-[#EBECF0]">
                  Work items
                </div>
                {recentIssues.length === 0 ? (
                  <p className="px-3 pb-2 text-sm text-[#5E6C84]">Work items you open will show up here.</p>
                ) : (
                  recentIssues.map((issue) => (
                    <Link
                      key={issue.key}
                      href={nav.issueHref(issue.key)}
                      onClick={closeAll}
                      className="flex items-start gap-2.5 px-3 py-1.5 hover:bg-[#F4F5F7]"
                    >
                      <IssueTypeIcon type={issue.issueType} className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm text-[#172B4D] truncate">{issue.summary}</span>
                        <span className="block text-[11px] text-[#5E6C84]">{issue.key}</span>
                      </span>
                    </Link>
                  ))
                )}
              </>
            ) : (
              <>
                <div className="px-3 pt-1 pb-1.5 text-[11px] font-bold uppercase text-[#5E6C84]">Starred spaces</div>
                {starredSpaces.length === 0 ? (
                  <p className="px-3 pb-2 text-sm text-[#5E6C84] leading-relaxed">
                    Star a space with the <Icons.Star className="inline w-3.5 h-3.5 -mt-0.5" /> next to its name to find it
                    here.
                  </p>
                ) : (
                  starredSpaces.map(spaceRow)
                )}
              </>
            )}
            <div className="mt-1 pt-1 border-t border-[#EBECF0]">
              <Link
                href={nav.hrefFor('spaces')}
                onClick={closeAll}
                className="block px-3 py-1.5 text-sm text-[#0052CC] hover:bg-[#F4F5F7]"
              >
                View all spaces
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Sidebar;
