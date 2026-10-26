'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Workspace, UserNotification } from '@/types/jira';
import { Icons } from './Icons';
import { NotificationsPopover } from './NotificationsPopover';
import { useAuth, useCurrentUser, getInitials } from './AuthProvider';
import { useAppNavigation } from './AppNavigation';
import { useJira } from '@/context/JiraContext';
import { ASSIGNED_TO_ME_JQL, issueSearchHref } from '@/lib/filters';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications
} from '@/lib/api';

export type ViewType =
  | 'for-you'
  | 'spaces'
  | 'board'
  | 'backlog'
  | 'list'
  | 'roadmap'
  | 'reports'
  | 'releases'
  | 'config'
  | 'import-export'
  | 'search'
  | 'users'
  | 'workspace-settings'
  | 'admin';

const HELP_ARTICLES_URL = 'https://support.atlassian.com/jira-software-cloud/';

interface NavbarProps {
  workspaces?: Workspace[];
  selectedWorkspace?: Workspace | null;
  onSelectWorkspace?: (ws: Workspace) => void;
  onOpenCreateWorkspace?: () => void;
  onOpenCreateIssue: () => void;
  onOpenCommandPalette: () => void;
  /** Collapses or expands the sidebar on wide screens. */
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  onOpenAccountSettings?: () => void;
  onOpenShortcuts: () => void;
  onSelectIssue?: (issueIdOrKey: number | string) => void;
}

// Shared look for dropdown menus in the top bar
const menuPanel = 'absolute top-full mt-1.5 max-w-[calc(100vw-1rem)] bg-white rounded-[3px] shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)] py-2 z-50 text-sm';
const menuHeading = 'px-4 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-[#5E6C84]';
const menuItem = 'w-full flex items-center gap-3 px-4 py-1.5 text-left text-[#172B4D] hover:bg-[#F4F5F7] active:bg-[#DEEBFF] cursor-pointer';
const menuDivider = 'my-1.5 border-t border-[#EBECF0]';

export const Navbar: React.FC<NavbarProps> = ({
  workspaces = [],
  selectedWorkspace = null,
  onSelectWorkspace,
  onOpenCreateWorkspace,
  onOpenCreateIssue,
  onOpenCommandPalette,
  onToggleSidebar,
  sidebarCollapsed,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
  onOpenAccountSettings,
  onOpenShortcuts,
  onSelectIssue
}) => {
  const currentUser = useCurrentUser();
  const { isAdmin, signOut } = useAuth();
  const nav = useAppNavigation();
  const { selectedProject } = useJira();
  const activeView = nav.activeView;
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [directCount, setDirectCount] = useState(0);
  const [watchingCount, setWatchingCount] = useState(0);
  const navRef = useRef<HTMLElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetchNotifications(currentUser.displayName);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
      setDirectCount(res.directCount || 0);
      setWatchingCount(res.watchingCount || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }, [currentUser.displayName]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(currentUser.displayName);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setDirectCount(0);
      setWatchingCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications(currentUser.displayName);
      setNotifications([]);
      setUnreadCount(0);
      setDirectCount(0);
      setWatchingCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown(prev => (prev === name ? null : name));
  };
  const close = () => setOpenDropdown(null);

  // Close dropdowns on an outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) close();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 768px)').matches) onToggleSidebar();
    else onToggleMobileSidebar?.();
  };

  const iconButton = (active: boolean) =>
    `p-2 rounded-full transition cursor-pointer ${
      active ? 'bg-[#DEEBFF] text-[#0052CC]' : 'text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0]'
    }`;

  return (
    <header
      ref={navRef}
      className="h-14 bg-white border-b border-[#EBECF0] px-2 sm:px-3 flex items-center justify-between sticky top-0 z-40 select-none font-sans"
    >
      {/* ---------------- LEFT: sidebar toggle, app switcher, logo, workspace ---------------- */}
      <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 shrink-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className={`p-2 rounded-[3px] transition cursor-pointer ${
            isMobileSidebarOpen ? 'bg-[#EBECF0] text-[#172B4D]' : 'text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0]'
          }`}
          title={sidebarCollapsed ? 'Expand sidebar (Ctrl+[)' : 'Collapse sidebar (Ctrl+[)'}
          aria-label="Toggle sidebar"
        >
          <Icons.PanelLeft className="w-4 h-4" />
        </button>

        {/* App switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('app-switcher')}
            className={`p-2 rounded-[3px] transition cursor-pointer ${
              openDropdown === 'app-switcher' ? 'bg-[#DEEBFF] text-[#0052CC]' : 'text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0]'
            }`}
            title="Switch apps"
            aria-haspopup="menu"
            aria-expanded={openDropdown === 'app-switcher'}
          >
            <Icons.AppSwitcher className="w-4 h-4" />
          </button>

          {openDropdown === 'app-switcher' && (
            <div className={`${menuPanel} left-0 w-72`} role="menu">
              <div className={menuHeading}>Switch to</div>
              <Link href={nav.hrefFor('for-you')} onClick={close} className={menuItem} role="menuitem">
                <Icons.JiraLogo className="w-6 h-6 shrink-0" />
                <span className="flex-1">
                  <span className="block font-medium">Jira</span>
                  <span className="block text-xs text-[#5E6C84]">Plan, track and release work</span>
                </span>
                <span className="text-[10px] font-bold uppercase text-[#0052CC]">Current</span>
              </Link>
              {isAdmin && (
                <Link href={nav.hrefFor('admin')} onClick={close} className={menuItem} role="menuitem">
                  <span className="w-6 h-6 rounded-[3px] bg-[#403294] text-white flex items-center justify-center shrink-0">
                    <Icons.Shield className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">Administration</span>
                    <span className="block text-xs text-[#5E6C84]">Users, passwords, sessions and email</span>
                  </span>
                </Link>
              )}
              <div className={menuDivider} />
              <p className="px-4 py-1 text-xs text-[#5E6C84]">No other Atlassian apps are installed on this site.</p>
            </div>
          )}
        </div>

        <Link
          href={nav.hrefFor('for-you')}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#EBECF0] rounded-[3px] transition"
          title="Go to your Jira home"
        >
          <Icons.JiraLogo className="w-5 h-5 shrink-0" />
          <span className="font-bold text-[#172B4D] text-[15px] tracking-tight hidden sm:inline">Jira</span>
        </Link>

        {/* Workspace switcher */}
        {selectedWorkspace && (
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => toggleDropdown('workspace-switcher')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-[3px] border transition cursor-pointer text-xs ${
                openDropdown === 'workspace-switcher' || activeView === 'workspace-settings'
                  ? 'bg-[#DEEBFF] text-[#0052CC] border-[#0052CC]/40 font-bold'
                  : 'bg-[#FAFBFC] border-[#DFE1E6] hover:bg-[#EBECF0]'
              }`}
              title="Switch workspace"
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'workspace-switcher'}
            >
              <span className="w-5 h-5 rounded bg-[#0052cc] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                {selectedWorkspace.slug.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-bold text-[#172B4D] truncate max-w-[140px] md:max-w-[180px] hidden sm:inline">
                {selectedWorkspace.name}
              </span>
              <Icons.ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
            </button>

            {openDropdown === 'workspace-switcher' && (
              <div className={`${menuPanel} left-0 w-80`} role="menu">
                <div className={menuHeading}>Workspaces</div>
                <div className="max-h-56 overflow-y-auto">
                  {workspaces.map((ws) => {
                    const isSelected = selectedWorkspace.id === ws.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isSelected}
                        onClick={() => {
                          onSelectWorkspace?.(ws);
                          close();
                        }}
                        className={`${menuItem} ${isSelected ? 'bg-[#E9F2FF]' : ''}`}
                      >
                        <span className="w-6 h-6 rounded bg-[#0052cc] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {ws.slug.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-medium">{ws.name}</span>
                          <span className="block text-xs text-[#5E6C84] font-mono truncate">
                            {ws.domain || `${ws.slug}.internal`}
                          </span>
                        </span>
                        {isSelected && <Icons.Check className="w-4 h-4 text-[#0052cc] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className={menuDivider} />
                <Link href={nav.hrefFor('workspace-settings')} onClick={close} className={menuItem} role="menuitem">
                  <Icons.Settings className="w-4 h-4 text-[#42526E]" />
                  Workspace settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onOpenCreateWorkspace?.();
                    close();
                  }}
                  className={menuItem}
                >
                  <Icons.Plus className="w-4 h-4 text-[#42526E]" />
                  Create workspace
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------- CENTER: search + Create ---------------- */}
      <div className="hidden md:flex flex-1 min-w-0 items-center justify-center gap-2 px-3">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex-1 max-w-[680px] min-w-0 h-8 flex items-center gap-2 px-2.5 rounded-[3px] border border-[#DFE1E6] bg-white hover:bg-[#F4F5F7] hover:border-[#C1C7D0] text-sm text-[#5E6C84] cursor-text transition"
          title="Search Jira (/ or Ctrl+K)"
        >
          <Icons.Search className="w-4 h-4 shrink-0 text-[#42526E]" />
          <span className="flex-1 text-left truncate">Search</span>
          <kbd className="px-1.5 py-px bg-[#F4F5F7] rounded border border-[#DFE1E6] text-[10px] text-[#5E6C84] font-mono">
            Ctrl K
          </kbd>
        </button>
        <button
          type="button"
          onClick={onOpenCreateIssue}
          className="h-8 shrink-0 bg-[#0052CC] hover:bg-[#0065FF] active:bg-[#0747A6] text-white px-3 rounded-[3px] text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
          title="Create a work item (c)"
        >
          <Icons.Plus className="w-4 h-4" />
          <span>Create</span>
        </button>
      </div>

      {/* ---------------- RIGHT: notifications, help, settings, profile ---------------- */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-auto">
        <button type="button" onClick={onOpenCommandPalette} className={`md:hidden ${iconButton(false)}`} title="Search">
          <Icons.Search className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onOpenCreateIssue}
          className="md:hidden p-1.5 mx-0.5 bg-[#0052CC] hover:bg-[#0065FF] text-white rounded-[3px] transition cursor-pointer"
          title="Create"
          aria-label="Create"
        >
          <Icons.Plus className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('notifications')}
            className={`${iconButton(openDropdown === 'notifications')} relative`}
            title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Icons.Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#DE350B] text-white font-black text-[9px] leading-tight flex items-center justify-center border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationsPopover
            isOpen={openDropdown === 'notifications'}
            onClose={close}
            notifications={notifications}
            unreadCount={unreadCount}
            directCount={directCount}
            watchingCount={watchingCount}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDeleteNotification={handleDeleteNotification}
            onClearAll={handleClearAll}
            onSelectIssue={(issueIdOrKey) => {
              onSelectIssue?.(issueIdOrKey);
              close();
            }}
          />
        </div>

        {/* Help */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => toggleDropdown('help')}
            className={iconButton(openDropdown === 'help')}
            title="Help"
            aria-haspopup="menu"
            aria-expanded={openDropdown === 'help'}
          >
            <Icons.Help className="w-4 h-4" />
          </button>

          {openDropdown === 'help' && (
            <div className={`${menuPanel} right-0 w-64`} role="menu">
              <div className={menuHeading}>Help</div>
              <a
                href={HELP_ARTICLES_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className={menuItem}
                role="menuitem"
              >
                <Icons.FileText className="w-4 h-4 text-[#42526E]" />
                <span className="flex-1">Browse help articles</span>
                <Icons.ExternalLink className="w-3.5 h-3.5 text-[#7A869A]" />
              </a>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  onOpenShortcuts();
                }}
                className={menuItem}
              >
                <Icons.Keyboard className="w-4 h-4 text-[#42526E]" />
                <span className="flex-1">Keyboard shortcuts</span>
                <kbd className="px-1.5 py-px rounded bg-[#F4F5F7] border border-[#DFE1E6] text-[10px] text-[#5E6C84] font-mono">?</kbd>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  onOpenCommandPalette();
                }}
                className={menuItem}
              >
                <Icons.Search className="w-4 h-4 text-[#42526E]" />
                <span className="flex-1">Search Jira</span>
                <kbd className="px-1.5 py-px rounded bg-[#F4F5F7] border border-[#DFE1E6] text-[10px] text-[#5E6C84] font-mono">/</kbd>
              </button>
              <div className={menuDivider} />
              <p className="px-4 py-1 text-xs text-[#5E6C84]">Jira Clone · .NET 10 + PostgreSQL</p>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('settings')}
            className={iconButton(
              openDropdown === 'settings' || activeView === 'workspace-settings' || activeView === 'admin'
            )}
            title="Settings"
            aria-haspopup="menu"
            aria-expanded={openDropdown === 'settings'}
          >
            <Icons.Settings className="w-4 h-4" />
          </button>

          {openDropdown === 'settings' && (
            <div className={`${menuPanel} right-0 w-72`} role="menu">
              <div className={menuHeading}>Personal settings</div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  onOpenAccountSettings?.();
                }}
                className={menuItem}
              >
                <Icons.User className="w-4 h-4 text-[#42526E]" />
                <span className="flex-1">
                  <span className="block">General settings</span>
                  <span className="block text-xs text-[#5E6C84]">Profile, language, time zone, password</span>
                </span>
              </button>

              <div className={menuDivider} />
              <div className={menuHeading}>Jira settings</div>
              <Link href={nav.hrefFor('spaces')} onClick={close} className={menuItem} role="menuitem">
                <Icons.Compass className="w-4 h-4 text-[#42526E]" />
                <span className="flex-1">
                  <span className="block">Spaces</span>
                  <span className="block text-xs text-[#5E6C84]">Create, rename and manage spaces</span>
                </span>
              </Link>
              {selectedProject && (
                <Link href={nav.hrefFor('config', selectedProject)} onClick={close} className={menuItem} role="menuitem">
                  <Icons.Sliders className="w-4 h-4 text-[#42526E]" />
                  <span className="flex-1 min-w-0">
                    <span className="block">Work items</span>
                    <span className="block text-xs text-[#5E6C84] truncate">
                      Statuses, workflows and fields in {selectedProject.name}
                    </span>
                  </span>
                </Link>
              )}
              <Link href={nav.hrefFor('workspace-settings')} onClick={close} className={menuItem} role="menuitem">
                <Icons.Settings className="w-4 h-4 text-[#42526E]" />
                <span className="flex-1">
                  <span className="block">System</span>
                  <span className="block text-xs text-[#5E6C84]">Workspace settings and features</span>
                </span>
              </Link>
              <Link href={nav.hrefFor('import-export')} onClick={close} className={menuItem} role="menuitem">
                <Icons.Download className="w-4 h-4 text-[#42526E]" />
                <span className="flex-1">
                  <span className="block">Apps</span>
                  <span className="block text-xs text-[#5E6C84]">Jira import & export</span>
                </span>
              </Link>

              {isAdmin && (
                <>
                  <div className={menuDivider} />
                  <div className={menuHeading}>Atlassian administration</div>
                  <Link href={nav.hrefFor('admin')} onClick={close} className={menuItem} role="menuitem">
                    <Icons.Shield className="w-4 h-4 text-[#42526E]" />
                    <span className="flex-1">
                      <span className="block">User management</span>
                      <span className="block text-xs text-[#5E6C84]">Users, passwords, sessions and email</span>
                    </span>
                  </Link>
                  <Link href={nav.hrefFor('users')} onClick={close} className={menuItem} role="menuitem">
                    <Icons.Lock className="w-4 h-4 text-[#42526E]" />
                    <span className="flex-1">
                      <span className="block">Groups & permissions</span>
                      <span className="block text-xs text-[#5E6C84]">Roles, groups, permission schemes, app access</span>
                    </span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('profile')}
            title={`${currentUser.displayName} (${currentUser.emailAddress}) - Account Settings`}
            className="w-8 h-8 rounded-full bg-[#0052CC] text-white flex items-center justify-center font-bold text-xs ring-2 ring-white cursor-pointer ml-1 relative transition hover:opacity-90 shrink-0"
            aria-haspopup="menu"
            aria-expanded={openDropdown === 'profile'}
          >
            <span>{getInitials(currentUser.displayName)}</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#36B37E] border-2 border-white rounded-full" />
          </button>

          {openDropdown === 'profile' && (
            <div className={`${menuPanel} right-0 w-72`} role="menu">
              <div className="px-4 pt-1 pb-3 flex items-center gap-3 border-b border-[#EBECF0]">
                <span className="w-10 h-10 rounded-full bg-[#0052CC] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {getInitials(currentUser.displayName)}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[#172B4D] truncate">{currentUser.displayName}</span>
                  <span className="block text-xs text-[#5E6C84] truncate">{currentUser.emailAddress}</span>
                  <span className="block text-[11px] text-[#5E6C84]">{currentUser.role || 'Member'}</span>
                </span>
              </div>
              <div className="pt-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onOpenAccountSettings?.();
                  }}
                  className={menuItem}
                >
                  <Icons.User className="w-4 h-4 text-[#42526E]" />
                  Profile & account settings
                </button>
                <Link href={nav.hrefFor('for-you')} onClick={close} className={menuItem} role="menuitem">
                  <Icons.Clock className="w-4 h-4 text-[#42526E]" />
                  Your work
                </Link>
                <Link href={issueSearchHref(ASSIGNED_TO_ME_JQL)} onClick={close} className={menuItem} role="menuitem">
                  <Icons.CheckCircle className="w-4 h-4 text-[#42526E]" />
                  Assigned to me
                </Link>
                {isAdmin && (
                  <Link href={nav.hrefFor('admin')} onClick={close} className={menuItem} role="menuitem">
                    <Icons.Shield className="w-4 h-4 text-[#42526E]" />
                    Administration
                  </Link>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onOpenShortcuts();
                  }}
                  className={menuItem}
                >
                  <Icons.Keyboard className="w-4 h-4 text-[#42526E]" />
                  Keyboard shortcuts
                </button>
                <div className={menuDivider} />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    signOut();
                  }}
                  className={menuItem}
                >
                  <Icons.LogOut className="w-4 h-4 text-[#42526E]" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
