'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Project, SavedFilter } from '@/types/jira';
import { fetchSavedFilters } from '@/lib/api';
import { PROJECT_VIEWS } from '@/lib/routes';
import { toggleStarredSpace, useQuickAccess } from '@/lib/recent';
import { defaultFilters, issueSearchHref, savedFilterHref } from '@/lib/filters';
import {
  SIDEBAR_ITEMS,
  SidebarItemId,
  resetSidebarPrefs,
  saveSidebarPrefs,
  useSidebarPrefs
} from '@/lib/sidebarPrefs';
import { useJira } from '@/context/JiraContext';
import { useAppNavigation } from './AppNavigation';
import { useAuth, useCurrentUser, getInitials } from './AuthProvider';
import { Icons, IssueTypeIcon } from './Icons';
import { SpaceAvatar } from './SpaceAvatar';
import { SPACE_TABS } from './ProjectHeader';
import { MenuButton, MenuEmpty, MenuLink, MenuSection, Popover } from './Menu';
import type { ViewType } from './Navbar';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenCreateProject?: () => void;
  onOpenAccountSettings?: () => void;
  onEditSpace?: (p: Project) => void;
}

type MenuKind = 'recent' | 'starred' | 'apps' | 'plans' | 'filters' | 'dashboards' | 'more' | 'spaces' | 'space';
type OpenMenu = { kind: MenuKind; anchor: DOMRect; spaceKey?: string };

const MENU_LABELS: Record<MenuKind, string> = {
  recent: 'Recent',
  starred: 'Starred',
  apps: 'Apps',
  plans: 'Plans',
  filters: 'Filters',
  dashboards: 'Dashboards',
  more: 'More',
  spaces: 'Spaces',
  space: 'Space actions'
};

const MAX_SIDEBAR_SPACES = 5;

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed: collapsedPref,
  onToggleCollapsed,
  isMobileOpen = false,
  onCloseMobile,
  onOpenCreateProject,
  onOpenAccountSettings,
  onEditSpace
}) => {
  const currentUser = useCurrentUser();
  const { isAdmin } = useAuth();
  const { projects, selectedProject } = useJira();
  const nav = useAppNavigation();
  const { recentSpaceKeys, recentIssues, starredSpaceIds } = useQuickAccess();
  const prefs = useSidebarPrefs();

  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [savedFilters, setSavedFilters] = useState<SavedFilter[] | null>(null);
  const [customizing, setCustomizing] = useState(false);

  // The mobile drawer always shows labels
  const collapsed = collapsedPref && !isMobileOpen;
  const activeView = nav.activeView;
  const inSpace = !!activeView && PROJECT_VIEWS.includes(activeView);
  const routeProjectKey = nav.route.kind === 'view' || nav.route.kind === 'browse' ? nav.route.projectKey : undefined;

  // The open space starts expanded, like Jira
  useEffect(() => {
    if (routeProjectKey) setExpanded((prev) => (prev[routeProjectKey] ? prev : { ...prev, [routeProjectKey]: true }));
  }, [routeProjectKey]);

  // Saved filters feed the Filters and Starred menus
  useEffect(() => {
    if ((menu?.kind === 'filters' || menu?.kind === 'starred') && savedFilters === null) {
      fetchSavedFilters()
        .then(setSavedFilters)
        .catch(() => setSavedFilters([]));
    }
  }, [menu, savedFilters]);

  const byKey = (key?: string) => projects.find((p) => p.key.toUpperCase() === key?.toUpperCase());
  const starredSpaces = projects.filter((p) => starredSpaceIds.includes(p.id));
  const recentSpaces = [selectedProject?.key, ...recentSpaceKeys]
    .filter((key, i, all): key is string => !!key && all.indexOf(key) === i)
    .map(byKey)
    .filter((p): p is Project => !!p);
  const recentNotStarred = recentSpaces.filter((p) => !starredSpaceIds.includes(p.id)).slice(0, MAX_SIDEBAR_SPACES);
  const featuredSpaces = [...starredSpaces, ...recentSpaces.filter((p) => !starredSpaceIds.includes(p.id))].slice(0, 6);

  const closeMenu = () => setMenu(null);
  const closeAll = () => {
    setMenu(null);
    onCloseMobile?.();
  };

  const openMenu = (kind: MenuKind, e: React.MouseEvent<HTMLElement>, spaceKey?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (menu?.kind === kind && menu.spaceKey === spaceKey) {
      setMenu(null);
      return;
    }
    setMenu({ kind, anchor: e.currentTarget.getBoundingClientRect(), spaceKey });
  };

  const rowClass = (active: boolean) =>
    `w-full flex items-center gap-3 px-2.5 py-1.5 rounded-[3px] text-[13px] transition-colors ${
      active ? 'bg-[#E9F2FF] text-[#0052cc] font-semibold' : 'text-[#44546F] hover:bg-[#091E420F] hover:text-[#172B4D]'
    } ${collapsed ? 'justify-center px-1' : ''}`;

  // ---------- Row renderers (plain functions so React keeps their DOM between renders) ----------

  const linkRow = (key: string, href: string, label: string, icon: React.ReactNode, active: boolean) => (
    <Link key={key} href={href} onClick={closeAll} className={rowClass(active)} title={label} aria-current={active ? 'page' : undefined}>
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </Link>
  );

  const menuRow = (kind: MenuKind, label: string, icon: React.ReactNode) => (
    <button
      key={kind}
      type="button"
      onClick={(e) => openMenu(kind, e)}
      className={rowClass(menu?.kind === kind)}
      title={label}
      aria-haspopup="menu"
      aria-expanded={menu?.kind === kind}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          <Icons.ChevronRight className="w-3.5 h-3.5 text-[#626F86]" />
        </>
      )}
    </button>
  );

  // Link to a directory page with a "›" that opens the quick menu (Jira's Filters and Dashboards)
  const splitRow = (kind: MenuKind, href: string, label: string, icon: React.ReactNode, active: boolean) =>
    collapsed ? (
      menuRow(kind, label, icon)
    ) : (
      <div key={kind} className={`group relative ${rowClass(active)} !p-0`}>
        <Link href={href} onClick={closeAll} className="flex-1 min-w-0 flex items-center gap-3 px-2.5 py-1.5" aria-current={active ? 'page' : undefined}>
          <span className="shrink-0">{icon}</span>
          <span className="flex-1 truncate">{label}</span>
        </Link>
        <button
          type="button"
          onClick={(e) => openMenu(kind, e)}
          className={`mr-1 p-1 rounded-[3px] hover:bg-[#091E4224] text-[#626F86] ${
            menu?.kind === kind ? 'opacity-100 bg-[#091E4224]' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
          }`}
          title={`${label} menu`}
          aria-haspopup="menu"
          aria-expanded={menu?.kind === kind}
        >
          <Icons.ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );

  const spaceRow = (p: Project) => {
    const isOpen = !!expanded[p.key];
    const isCurrent = inSpace && routeProjectKey === p.key.toUpperCase();
    return (
      <div key={p.id}>
        <div
          className={`group flex items-center rounded-[3px] ${
            isCurrent && !isOpen ? 'bg-[#E9F2FF]' : 'hover:bg-[#091E420F]'
          }`}
        >
          <button
            type="button"
            onClick={() => setExpanded((prev) => ({ ...prev, [p.key]: !isOpen }))}
            className="p-1 ml-0.5 rounded-[3px] text-[#626F86] hover:bg-[#091E4224] cursor-pointer"
            aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${p.name}`}
            aria-expanded={isOpen}
          >
            <Icons.ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
          <Link
            href={nav.hrefFor('board', p)}
            onClick={closeAll}
            className={`flex-1 min-w-0 flex items-center gap-2 py-1.5 pl-1 text-[13px] ${
              isCurrent ? 'text-[#0052cc] font-semibold' : 'text-[#172B4D]'
            }`}
            title={p.name}
          >
            <SpaceAvatar project={p} size="xs" />
            <span className="truncate">{p.name}</span>
          </Link>
          <button
            type="button"
            onClick={(e) => openMenu('space', e, p.key)}
            className={`mr-1 p-1 rounded-[3px] text-[#626F86] hover:bg-[#091E4224] cursor-pointer ${
              menu?.kind === 'space' && menu.spaceKey === p.key ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
            }`}
            title={`More actions for ${p.name}`}
            aria-haspopup="menu"
          >
            <Icons.MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {isOpen && (
          <div className="ml-[22px] pl-2 border-l border-[#DFE1E6] my-0.5 space-y-px">
            {SPACE_TABS.map(({ view, label, icon: Icon }) => {
              const active = isCurrent && activeView === view;
              return (
                <Link
                  key={view}
                  href={nav.hrefFor(view, p)}
                  onClick={closeAll}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 px-2 py-1 rounded-[3px] text-[13px] ${
                    active ? 'bg-[#E9F2FF] text-[#0052cc] font-semibold' : 'text-[#44546F] hover:bg-[#091E420F] hover:text-[#172B4D]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const spacesSection = () =>
    collapsed ? (
      <div key="spaces">
        {linkRow('spaces', nav.hrefFor('spaces'), 'Spaces', <Icons.Compass className="w-4 h-4" />, activeView === 'spaces')}
      </div>
    ) : (
      <div key="spaces" className="pt-1">
        <div className={`group flex items-center rounded-[3px] ${activeView === 'spaces' ? 'bg-[#E9F2FF]' : 'hover:bg-[#091E420F]'}`}>
          <Link
            href={nav.hrefFor('spaces')}
            onClick={closeAll}
            className={`flex-1 flex items-center gap-3 px-2.5 py-1.5 text-[13px] ${
              activeView === 'spaces' ? 'text-[#0052cc] font-semibold' : 'text-[#44546F]'
            }`}
          >
            <Icons.Compass className="w-4 h-4" />
            Spaces
          </Link>
          <button
            type="button"
            onClick={() => {
              closeAll();
              onOpenCreateProject?.();
            }}
            className="p-1 rounded-[3px] text-[#626F86] hover:bg-[#091E4224] cursor-pointer"
            title="Create space"
          >
            <Icons.Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => openMenu('spaces', e)}
            className="mr-1 p-1 rounded-[3px] text-[#626F86] hover:bg-[#091E4224] cursor-pointer"
            title="More space actions"
            aria-haspopup="menu"
          >
            <Icons.MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="pl-2 pt-0.5 space-y-px">
          {starredSpaces.length > 0 && (
            <>
              <div className="px-2 pt-1.5 pb-0.5 text-[11px] font-semibold text-[#626F86]">Starred</div>
              {starredSpaces.map(spaceRow)}
            </>
          )}
          {recentNotStarred.length > 0 && (
            <>
              <div className="px-2 pt-1.5 pb-0.5 text-[11px] font-semibold text-[#626F86]">Recent</div>
              {recentNotStarred.map(spaceRow)}
            </>
          )}
          <Link
            href={nav.hrefFor('spaces')}
            onClick={closeAll}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[3px] text-[13px] text-[#44546F] hover:bg-[#091E420F]"
          >
            <Icons.Folder className="w-3.5 h-3.5" />
            View all spaces
          </Link>
        </div>
      </div>
    );

  const renderItem = (id: SidebarItemId) => {
    switch (id) {
      case 'for-you':
        return linkRow(id, nav.hrefFor('for-you'), 'For you', <Icons.User className="w-4 h-4" />, activeView === 'for-you');
      case 'recent':
        return menuRow('recent', 'Recent', <Icons.Clock className="w-4 h-4" />);
      case 'starred':
        return menuRow('starred', 'Starred', <Icons.Star className="w-4 h-4" />);
      case 'apps':
        return menuRow('apps', 'Apps', <Icons.AppSwitcher className="w-4 h-4" />);
      case 'plans':
        return menuRow('plans', 'Plans', <Icons.Kanban className="w-4 h-4" />);
      case 'spaces':
        return spacesSection();
      case 'filters':
        return splitRow('filters', '/issues', 'Filters', <Icons.Filter className="w-4 h-4" />, activeView === 'search');
      case 'dashboards':
        return splitRow('dashboards', nav.hrefFor('reports'), 'Dashboards', <Icons.BarChart className="w-4 h-4" />, activeView === 'reports');
      case 'teams':
        return linkRow(id, nav.hrefFor('users'), 'Teams', <Icons.Users className="w-4 h-4" />, activeView === 'users');
      case 'workspace':
        return linkRow(id, nav.hrefFor('workspace-settings'), 'Workspace settings', <Icons.Shield className="w-4 h-4" />, activeView === 'workspace-settings');
    }
  };

  const visibleItems = prefs.order.filter((id) => !prefs.hidden.includes(id));
  const hiddenItems = prefs.order.filter((id) => prefs.hidden.includes(id));

  // ---------- Menus ----------

  const spaceLink = (p: Project, view: ViewType = 'board', label = p.name) => (
    <MenuLink key={`${view}-${p.id}`} href={nav.hrefFor(view, p)} onNavigate={closeAll} icon={<SpaceAvatar project={p} size="xs" />}>
      {label}
    </MenuLink>
  );

  const renderMenu = (open: OpenMenu) => {
    switch (open.kind) {
      case 'recent':
        return (
          <>
            <MenuSection title="Spaces">
              {recentSpaces.length ? recentSpaces.slice(0, 5).map((p) => spaceLink(p)) : <MenuEmpty>Spaces you visit will show up here.</MenuEmpty>}
            </MenuSection>
            <MenuSection title="Work items" divider>
              {recentIssues.length ? (
                recentIssues.map((issue) => (
                  <MenuLink
                    key={issue.key}
                    href={nav.issueHref(issue.key)}
                    onNavigate={closeAll}
                    icon={<IssueTypeIcon type={issue.issueType} className="w-4 h-4" />}
                    description={issue.key}
                  >
                    {issue.summary}
                  </MenuLink>
                ))
              ) : (
                <MenuEmpty>Work items you open will show up here.</MenuEmpty>
              )}
            </MenuSection>
            <MenuSection divider>
              <MenuLink href={nav.hrefFor('for-you')} onNavigate={closeAll}>
                View all recent work
              </MenuLink>
            </MenuSection>
          </>
        );

      case 'starred': {
        const starredFilters = (savedFilters ?? []).filter((f) => f.isFavorite);
        return (
          <>
            <MenuSection title="Spaces">
              {starredSpaces.length ? (
                starredSpaces.map((p) => spaceLink(p))
              ) : (
                <MenuEmpty>
                  Star a space with the <Icons.Star className="inline w-3.5 h-3.5 -mt-0.5" /> next to its name to find it here.
                </MenuEmpty>
              )}
            </MenuSection>
            <MenuSection title="Filters" divider>
              {savedFilters === null ? (
                <MenuEmpty>Loading…</MenuEmpty>
              ) : starredFilters.length ? (
                starredFilters.map((f) => (
                  <MenuLink key={f.id} href={savedFilterHref(f.id)} onNavigate={closeAll} icon={<Icons.Filter className="w-4 h-4" />}>
                    {f.name}
                  </MenuLink>
                ))
              ) : (
                <MenuEmpty>Star a filter on the search page to find it here.</MenuEmpty>
              )}
            </MenuSection>
          </>
        );
      }

      case 'apps':
        return (
          <MenuSection title="Your apps">
            <MenuLink
              href={nav.hrefFor('import-export')}
              onNavigate={closeAll}
              icon={<Icons.Download className="w-4 h-4" />}
              description="Back up or migrate with Jira JSON and CSV"
            >
              Jira Import & Export
            </MenuLink>
            {selectedProject && (
              <MenuLink
                href={nav.hrefFor('config', selectedProject)}
                onNavigate={closeAll}
                icon={<Icons.Sliders className="w-4 h-4" />}
                description={`Statuses, workflows and automation for ${selectedProject.name}`}
              >
                Workflow Studio
              </MenuLink>
            )}
            {isAdmin && (
              <MenuLink href={nav.hrefFor('users')} onNavigate={closeAll} icon={<Icons.Shield className="w-4 h-4" />} description="Product access and seats">
                Manage app access
              </MenuLink>
            )}
          </MenuSection>
        );

      case 'plans':
        return (
          <>
            <MenuSection title="Plans">
              {featuredSpaces.length ? (
                featuredSpaces.map((p) => spaceLink(p, 'roadmap', `${p.name} timeline`))
              ) : (
                <MenuEmpty>Open a space to plan its work on a timeline.</MenuEmpty>
              )}
            </MenuSection>
            <MenuSection divider>
              <MenuLink href={nav.hrefFor('spaces')} onNavigate={closeAll}>
                View all spaces
              </MenuLink>
            </MenuSection>
          </>
        );

      case 'filters': {
        const recentKeys = recentIssues.map((i) => i.key);
        const starredFilters = (savedFilters ?? []).filter((f) => f.isFavorite);
        const otherFilters = (savedFilters ?? []).filter((f) => !f.isFavorite).slice(0, 5);
        return (
          <>
            <MenuSection title="Default filters">
              {defaultFilters(recentKeys).map((f) => (
                <MenuLink key={f.id} href={issueSearchHref(f.jql)} onNavigate={closeAll} icon={<Icons.Filter className="w-4 h-4" />}>
                  {f.name}
                </MenuLink>
              ))}
            </MenuSection>
            {starredFilters.length > 0 && (
              <MenuSection title="Starred" divider>
                {starredFilters.map((f) => (
                  <MenuLink key={f.id} href={savedFilterHref(f.id)} onNavigate={closeAll} icon={<Icons.Star className="w-4 h-4 text-[#FFAB00] fill-[#FFAB00]" />}>
                    {f.name}
                  </MenuLink>
                ))}
              </MenuSection>
            )}
            {otherFilters.length > 0 && (
              <MenuSection title="Saved filters" divider>
                {otherFilters.map((f) => (
                  <MenuLink key={f.id} href={savedFilterHref(f.id)} onNavigate={closeAll} icon={<Icons.Filter className="w-4 h-4" />}>
                    {f.name}
                  </MenuLink>
                ))}
              </MenuSection>
            )}
            <MenuSection divider>
              <MenuLink href="/issues" onNavigate={closeAll}>
                View all filters
              </MenuLink>
            </MenuSection>
          </>
        );
      }

      case 'dashboards':
        return (
          <>
            <MenuSection title="Dashboards">
              {featuredSpaces.length ? (
                featuredSpaces.map((p) => spaceLink(p, 'reports', `${p.name} reports`))
              ) : (
                <MenuEmpty>Each space has a reports dashboard. Open a space to see it here.</MenuEmpty>
              )}
            </MenuSection>
            <MenuSection divider>
              <MenuLink href={nav.hrefFor('reports')} onNavigate={closeAll}>
                View current dashboard
              </MenuLink>
            </MenuSection>
          </>
        );

      case 'more':
        return (
          <>
            {hiddenItems.length > 0 && (
              <MenuSection title="Hidden from sidebar">
                {hiddenItems.map((id) => {
                  const label = SIDEBAR_ITEMS.find((i) => i.id === id)!.label;
                  const flyout: Partial<Record<SidebarItemId, MenuKind>> = {
                    recent: 'recent',
                    starred: 'starred',
                    apps: 'apps',
                    plans: 'plans',
                    filters: 'filters',
                    dashboards: 'dashboards'
                  };
                  const kind = flyout[id];
                  if (kind) {
                    return (
                      <MenuButton key={id} onClick={() => setMenu({ kind, anchor: open.anchor })}>
                        {label}
                      </MenuButton>
                    );
                  }
                  const view: Record<string, ViewType> = { 'for-you': 'for-you', spaces: 'spaces', teams: 'users', workspace: 'workspace-settings' };
                  return (
                    <MenuLink key={id} href={nav.hrefFor(view[id])} onNavigate={closeAll}>
                      {label}
                    </MenuLink>
                  );
                })}
              </MenuSection>
            )}
            <MenuSection divider={hiddenItems.length > 0}>
              <MenuButton
                icon={<Icons.Sliders className="w-4 h-4" />}
                onClick={() => {
                  closeMenu();
                  setCustomizing(true);
                }}
              >
                Customize sidebar
              </MenuButton>
            </MenuSection>
          </>
        );

      case 'spaces':
        return (
          <MenuSection>
            <MenuLink href={nav.hrefFor('spaces')} onNavigate={closeAll} icon={<Icons.Folder className="w-4 h-4" />}>
              View all spaces
            </MenuLink>
            <MenuButton
              icon={<Icons.Plus className="w-4 h-4" />}
              onClick={() => {
                closeAll();
                onOpenCreateProject?.();
              }}
            >
              Create space
            </MenuButton>
          </MenuSection>
        );

      case 'space': {
        const p = byKey(open.spaceKey);
        if (!p) return null;
        const isStarred = starredSpaceIds.includes(p.id);
        return (
          <MenuSection>
            <MenuLink href={nav.hrefFor('config', p)} onNavigate={closeAll} icon={<Icons.Settings className="w-4 h-4" />}>
              Space settings
            </MenuLink>
            {onEditSpace && (
              <MenuButton
                icon={<Icons.Edit className="w-4 h-4" />}
                onClick={() => {
                  closeAll();
                  onEditSpace(p);
                }}
              >
                Edit name, key & icon
              </MenuButton>
            )}
            <MenuButton
              icon={<Icons.Star className={`w-4 h-4 ${isStarred ? 'text-[#FFAB00] fill-[#FFAB00]' : ''}`} />}
              onClick={() => {
                toggleStarredSpace(p.id);
                closeMenu();
              }}
            >
              {isStarred ? 'Remove from Starred' : 'Add to Starred'}
            </MenuButton>
          </MenuSection>
        );
      }
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-40 md:hidden animate-in fade-in duration-150"
        />
      )}

      <aside
        className={`bg-[#FAFBFC] border-r border-[#EBECF0] h-[calc(100vh-3.5rem)] flex flex-col justify-between select-none overflow-y-auto overflow-x-hidden transition-[width] duration-200 ease-in-out shrink-0 font-sans z-50 ${
          isMobileOpen
            ? 'fixed inset-y-14 left-0 w-64 p-3 shadow-2xl flex md:relative md:inset-auto md:shadow-none'
            : 'hidden md:flex'
        } ${collapsed ? 'md:w-14 p-2' : 'md:w-60 p-2.5'}`}
        aria-label="Jira navigation"
      >
        <nav className="space-y-0.5">
          {visibleItems.map(renderItem)}
          {menuRow('more', 'More', <Icons.MoreHorizontal className="w-4 h-4" />)}
        </nav>

        <div className="pt-2 mt-2 border-t border-[#EBECF0] space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onOpenAccountSettings?.();
              onCloseMobile?.();
            }}
            className={rowClass(false)}
            title="Account settings"
          >
            <span className="w-5 h-5 rounded-full bg-[#0052cc] text-white font-bold text-[9px] flex items-center justify-center shrink-0">
              {getInitials(currentUser.displayName)}
            </span>
            {!collapsed && <span className="flex-1 text-left truncate">Account settings</span>}
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`${rowClass(false)} hidden md:flex`}
            title={collapsed ? 'Expand sidebar (Ctrl+[)' : 'Collapse sidebar (Ctrl+[)'}
          >
            <Icons.PanelLeft className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Collapse sidebar</span>}
          </button>
        </div>
      </aside>

      {menu && (
        <Popover
          anchor={menu.anchor}
          placement={typeof window !== 'undefined' && window.innerWidth < 640 ? 'below' : 'right'}
          width={menu.kind === 'space' || menu.kind === 'spaces' ? 240 : 320}
          label={MENU_LABELS[menu.kind]}
          onClose={closeMenu}
        >
          {renderMenu(menu)}
        </Popover>
      )}

      {customizing && <CustomizeSidebarDialog onClose={() => setCustomizing(false)} />}
    </>
  );
};

/** Jira's "Customize sidebar": choose which items show and in what order. */
const CustomizeSidebarDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const prefs = useSidebarPrefs();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (id: SidebarItemId) =>
    saveSidebarPrefs({
      ...prefs,
      hidden: prefs.hidden.includes(id) ? prefs.hidden.filter((h) => h !== id) : [...prefs.hidden, id]
    });

  const move = (index: number, delta: number) => {
    const order = [...prefs.order];
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    saveSidebarPrefs({ ...prefs, order });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#091E42]/50 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-sidebar-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-white rounded-[3px] shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
      >
        <div className="px-6 pt-5 pb-2">
          <h2 id="customize-sidebar-title" className="text-xl font-semibold text-[#172B4D]">
            Customize sidebar
          </h2>
          <p className="text-sm text-[#5E6C84] mt-1">
            Choose what shows in your sidebar. Hidden items stay under More. Only you see these changes.
          </p>
        </div>
        <ul className="px-4 py-2">
          {prefs.order.map((id, index) => {
            const item = SIDEBAR_ITEMS.find((i) => i.id === id)!;
            const visible = !prefs.hidden.includes(id);
            return (
              <li key={id} className="flex items-center gap-2 px-2 py-1.5 rounded-[3px] hover:bg-[#F4F5F7]">
                <input
                  id={`sidebar-item-${id}`}
                  type="checkbox"
                  checked={visible}
                  onChange={() => toggle(id)}
                  className="w-4 h-4 accent-[#0052CC] cursor-pointer"
                />
                <label htmlFor={`sidebar-item-${id}`} className="flex-1 text-sm text-[#172B4D] cursor-pointer">
                  {item.label}
                </label>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="p-1 rounded-[3px] text-[#42526E] hover:bg-[#EBECF0] disabled:opacity-30 cursor-pointer"
                  aria-label={`Move ${item.label} up`}
                >
                  <Icons.ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === prefs.order.length - 1}
                  className="p-1 rounded-[3px] text-[#42526E] hover:bg-[#EBECF0] disabled:opacity-30 cursor-pointer"
                  aria-label={`Move ${item.label} down`}
                >
                  <Icons.ChevronDown className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between px-6 pb-5 pt-2">
          <button type="button" onClick={resetSidebarPrefs} className="text-sm text-[#0052CC] hover:underline cursor-pointer">
            Reset to default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] text-white text-sm font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
