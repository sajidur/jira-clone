'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, Workspace, UserNotification } from '@/types/jira';
import { Icons } from './Icons';
import { SpaceAvatar } from './SpaceAvatar';
import { NotificationsPopover } from './NotificationsPopover';
import { useAuth, useCurrentUser, getInitials } from './AuthProvider';
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

interface NavbarProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (p: Project) => void;
  workspaces?: Workspace[];
  selectedWorkspace?: Workspace | null;
  onSelectWorkspace?: (ws: Workspace) => void;
  onOpenCreateWorkspace?: () => void;
  onOpenCreateIssue: () => void;
  onOpenCreateProject: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  onOpenCommandPalette: () => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  onOpenAccountSettings?: () => void;
  onSelectIssue?: (issueIdOrKey: number | string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  workspaces = [],
  selectedWorkspace = null,
  onSelectWorkspace,
  onOpenCreateWorkspace,
  onOpenCreateIssue,
  onOpenCreateProject,
  searchQuery,
  onSearchChange,
  activeView,
  setActiveView,
  onOpenCommandPalette,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
  onOpenAccountSettings,
  onSelectIssue
}) => {
  const currentUser = useCurrentUser();
  const { isAdmin, signOut } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [projectFilterText, setProjectFilterText] = useState('');
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const workspaceProjects = selectedWorkspace
    ? projects.filter(p => !p.workspaceId || p.workspaceId === selectedWorkspace.id)
    : projects;

  const filteredProjects = workspaceProjects.filter(p =>
    p.name.toLowerCase().includes(projectFilterText.toLowerCase()) ||
    p.key.toLowerCase().includes(projectFilterText.toLowerCase())
  );

  return (
    <header
      ref={navRef}
      className="h-14 bg-white border-b border-[#EBECF0] px-3.5 flex items-center justify-between sticky top-0 z-40 select-none shadow-2xs font-sans"
    >
      {/* ------------------------------------------------------------- */}
      {/* LEFT SECTION: App Switcher + Jira Logo + Menus + Create */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1 overflow-hidden mr-2">
        {/* Atlassian App Switcher (9 dots) */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('app-switcher')}
            className={`p-2 text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-md transition cursor-pointer ${
              openDropdown === 'app-switcher' ? 'bg-[#EBECF0] text-[#172B4D]' : ''
            }`}
            title="Switch Atlassian Products"
          >
            <Icons.AppSwitcher className="w-4 h-4" />
          </button>

          {/* App Switcher Dropdown */}
          {openDropdown === 'app-switcher' && (
            <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-3 px-3 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">
                Atlassian Cloud Suite
              </div>
              <div className="space-y-1">
                {[
                  { name: 'Jira Software', desc: 'Issue & project tracking', active: true, color: 'bg-[#0052cc] text-white', icon: 'JS' },
                  { name: 'Jira Service Management', desc: 'ITSM customer portal', active: false, color: 'bg-sky-600 text-white', icon: 'SM' },
                  { name: 'Jira Work Management', desc: 'Spreadsheets & calendars', active: false, color: 'bg-emerald-600 text-white', icon: 'WM' },
                  { name: 'Bitbucket', desc: 'Git code repository', active: false, color: 'bg-indigo-600 text-white', icon: 'BB' }
                ].map((app) => (
                  <div
                    key={app.name}
                    onClick={() => setOpenDropdown(null)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition"
                  >
                    <div className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center shrink-0 ${app.color}`}>
                      {app.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                        <span>{app.name}</span>
                        {app.active && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-[#0052cc] font-bold">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{app.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                <button
                  onClick={() => { setActiveView('users'); setOpenDropdown(null); }}
                  className="w-full text-left text-xs font-semibold text-[#0052cc] hover:underline py-1 flex items-center gap-1.5"
                >
                  <Icons.Shield className="w-3.5 h-3.5" />
                  <span>Manage Application Licenses & Seats</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className={`md:hidden p-2 text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-md transition cursor-pointer ${
            isMobileSidebarOpen ? 'bg-[#EBECF0] text-[#172B4D]' : ''
          }`}
          title="Toggle Navigation Menu"
        >
          <Icons.Menu className="w-4 h-4" />
        </button>

        {/* Jira Brand Mark */}
        <div
          onClick={() => setActiveView('board')}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#EBECF0] rounded-md cursor-pointer transition mr-1"
          title="Go to Kanban Board"
        >
          <Icons.JiraLogo className="w-5 h-5 shrink-0" />
          <span className="font-bold text-[#172B4D] text-[15px] tracking-tight hidden sm:inline">
            Jira
          </span>
        </div>

        {/* Modern Workspace Switcher */}
        {selectedWorkspace && (
          <div className="relative">
            <button
              onClick={() => toggleDropdown('workspace-switcher')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-[#EBECF0] hover:text-[#172B4D] transition cursor-pointer text-xs ${
                openDropdown === 'workspace-switcher' || activeView === 'workspace-settings'
                  ? 'bg-[#DEEBFF] text-[#0052CC] border-[#0052CC]/40 font-bold'
                  : 'bg-slate-50'
              }`}
              title="Switch Workspace / Organization"
            >
              <div className="w-5 h-5 rounded bg-[#0052cc] text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
                {selectedWorkspace.slug.slice(0, 2).toUpperCase()}
              </div>
              <span className="font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[140px] md:max-w-[180px] inline">
                {selectedWorkspace.name}
              </span>
              <Icons.ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
            </button>

            {openDropdown === 'workspace-switcher' && (
              <div className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2.5 z-50 text-xs animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-3 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Workspace</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#0052cc] text-[10px] font-bold uppercase border border-blue-200">
                      On-Premises
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-1">{selectedWorkspace.name}</div>
                  <div className="text-[11px] font-mono text-[#0052cc]">
                    {selectedWorkspace.domain || `${selectedWorkspace.slug}.internal`}
                  </div>
                </div>

                <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Workspaces ({workspaces.length})
                </div>

                <div className="max-h-48 overflow-y-auto">
                  {workspaces.map((ws) => {
                    const isSelected = selectedWorkspace.id === ws.id;
                    return (
                      <button
                        key={ws.id}
                        onClick={() => {
                          onSelectWorkspace?.(ws);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                          isSelected ? 'bg-blue-50/70 text-[#0052cc] font-bold' : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-6 h-6 rounded bg-[#0052cc] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                            {ws.slug.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-xs truncate">{ws.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {ws.domain || `${ws.slug}.internal`}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Icons.Check className="w-4 h-4 text-[#0052cc] shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 mt-2 pt-1 px-1.5 space-y-0.5">
                  <button
                    onClick={() => {
                      setActiveView('workspace-settings');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-800 hover:bg-slate-100 rounded-md font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Icons.Settings className="w-3.5 h-3.5 text-[#0052cc]" />
                    <span className="text-[#0052cc] font-bold">Workspace Settings & Configurations</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenCreateWorkspace?.();
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-3 py-2 text-[#0052cc] hover:bg-blue-50 rounded-md font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Icons.Plus className="w-3.5 h-3.5" />
                    <span>Create New Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Menus */}
        <nav className="hidden xl:flex items-center gap-0.5 text-xs font-medium text-[#42526E] shrink-0">
          {/* Your Work */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('your-work')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-[#EBECF0] hover:text-[#172B4D] transition cursor-pointer ${
                openDropdown === 'your-work' ? 'bg-[#EBECF0] text-[#172B4D] font-bold' : ''
              }`}
            >
              <span>Your work</span>
              <Icons.ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'your-work' && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px]">Recent Activity</div>
                <div
                  onClick={() => { setActiveView('search'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2.5"
                >
                  <Icons.Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Worked on recently</span>
                </div>
                <div
                  onClick={() => { setActiveView('search'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2.5"
                >
                  <Icons.User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assigned to me</span>
                </div>
                <div
                  onClick={() => { setActiveView('search'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2.5"
                >
                  <Icons.Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Starred issues & filters</span>
                </div>
              </div>
            )}
          </div>

          {/* Projects Menu */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('projects')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-[#EBECF0] hover:text-[#172B4D] transition cursor-pointer ${
                openDropdown === 'projects' ? 'bg-[#EBECF0] text-[#172B4D] font-bold' : ''
              }`}
            >
              {selectedProject && <SpaceAvatar project={selectedProject} size="xs" />}
              <span className="font-semibold text-slate-900 truncate max-w-[130px]">
                {selectedProject ? selectedProject.name : 'Projects'}
              </span>
              <Icons.ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'projects' && (
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-xs">
                <div className="px-3 pt-1 pb-2">
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectFilterText}
                    onChange={(e) => setProjectFilterText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0052cc]"
                    autoFocus
                  />
                </div>

                <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px]">
                  Recent Projects ({filteredProjects.length})
                </div>

                <div className="max-h-56 overflow-y-auto">
                  {filteredProjects.map((p) => {
                    const isSelected = selectedProject?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectProject(p);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                          isSelected ? 'bg-blue-50/80 text-[#0052cc] font-bold' : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <SpaceAvatar project={p} size="sm" />
                          <div className="truncate">
                            <div className="truncate text-xs font-semibold">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{p.key} • Software project</div>
                          </div>
                        </div>
                        {isSelected && <Icons.Check className="w-4 h-4 text-[#0052cc] shrink-0" />}
                      </button>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <div className="px-3 py-3 text-center text-slate-400 italic">No projects found.</div>
                  )}
                </div>

                <div className="border-t border-slate-100 mt-2 pt-1 px-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setActiveView('spaces');
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-800 hover:bg-slate-100 rounded-md font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Icons.Compass className="w-3.5 h-3.5 text-[#0052cc]" />
                      <span>View all spaces & projects</span>
                    </span>
                    <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  <button
                    onClick={() => {
                      onOpenCreateProject();
                      setOpenDropdown(null);
                    }}
                    className="w-full text-left px-3 py-2 text-[#0052cc] hover:bg-blue-50/60 rounded-md font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Icons.Plus className="w-3.5 h-3.5" />
                    <span>Create new project</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filters & JQL */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('filters')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-[#EBECF0] hover:text-[#172B4D] transition cursor-pointer ${
                activeView === 'search' || openDropdown === 'filters' ? 'bg-[#EBECF0] text-[#0052cc] font-bold' : ''
              }`}
            >
              <span>Filters</span>
              <Icons.ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'filters' && (
              <div className="absolute left-0 top-full mt-1.5 w-68 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                <div
                  onClick={() => { setActiveView('search'); setOpenDropdown(null); }}
                  className="px-3 py-2.5 hover:bg-slate-50 cursor-pointer text-[#0052cc] font-bold flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Icons.Search className="w-3.5 h-3.5 text-[#0052cc]" />
                    <span>View all issues & JQL search</span>
                  </span>
                  <span className="text-[10px] bg-blue-100 text-[#0052cc] px-1.5 py-0.2 rounded font-mono font-bold">
                    JQL
                  </span>
                </div>

                <div className="border-t border-slate-100 my-1" />
                <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px]">Saved Filters</div>

                <div
                  onClick={() => { setActiveView('search'); setOpenDropdown(null); }}
                  className="px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>My open issues</span>
                </div>
                <div
                  onClick={() => { setActiveView('search'); setOpenDropdown(null); }}
                  className="px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>Reported by me</span>
                </div>
                <div
                  onClick={() => { setActiveView('search'); setOpenDropdown(null); }}
                  className="px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>High priority & Blocker bugs</span>
                </div>
              </div>
            )}
          </div>

          {/* Dashboards */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('dashboards')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-[#EBECF0] hover:text-[#172B4D] transition cursor-pointer ${
                activeView === 'reports' || openDropdown === 'dashboards' ? 'bg-[#EBECF0] text-[#0052cc] font-bold' : ''
              }`}
            >
              <span>Dashboards</span>
              <Icons.ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'dashboards' && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px]">Dashboards</div>
                <div
                  onClick={() => { setActiveView('reports'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.BarChart className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sprint Velocity & Burndown</span>
                </div>
                <div
                  onClick={() => { setActiveView('reports'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Database className="w-3.5 h-3.5 text-slate-500" />
                  <span>Team Workload & Distribution</span>
                </div>
              </div>
            )}
          </div>

          {/* Teams */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('teams')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-[#EBECF0] hover:text-[#172B4D] transition cursor-pointer ${
                activeView === 'users' || openDropdown === 'teams' ? 'bg-[#EBECF0] text-[#0052cc] font-bold' : ''
              }`}
            >
              <span>Teams</span>
              <Icons.ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'teams' && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px]">Organization & Squads</div>
                <div
                  onClick={() => { setActiveView('users'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Users className="w-3.5 h-3.5 text-[#0052cc]" />
                  <span>People Directory & External Staff</span>
                </div>
                <div
                  onClick={() => { setActiveView('users'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Kanban className="w-3.5 h-3.5 text-blue-600" />
                  <span>Agile Squads & Cross-Functional Teams</span>
                </div>
                <div
                  onClick={() => { setActiveView('users'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Shield className="w-3.5 h-3.5 text-purple-600" />
                  <span>Permission Schemes Matrix</span>
                </div>
              </div>
            )}
          </div>

          {/* Apps / Studio */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('apps')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-[#EBECF0] hover:text-[#172B4D] transition cursor-pointer ${
                activeView === 'config' || activeView === 'import-export' || openDropdown === 'apps' ? 'bg-[#EBECF0] text-[#0052cc] font-bold' : ''
              }`}
            >
              <span>Apps</span>
              <Icons.ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openDropdown === 'apps' && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px]">Project Customization</div>
                <div
                  onClick={() => { setActiveView('config'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Compass className="w-3.5 h-3.5 text-[#0052cc]" />
                  <span>Workflow Studio (Canvas)</span>
                </div>
                <div
                  onClick={() => { setActiveView('config'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Automation Rules Engine</span>
                </div>
                <div
                  onClick={() => { setActiveView('import-export'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Jira Migration & Import/Export</span>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Primary "+ Create" Button */}
        <button
          onClick={onOpenCreateIssue}
          className="ml-2 bg-[#0052CC] hover:bg-[#0065FF] text-white px-3.5 py-1.5 rounded-md text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-98 cursor-pointer"
        >
          <Icons.Plus className="w-3.5 h-3.5" />
          <span>Create</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT SECTION: Quick Search + Database Pill + Tools + Profile */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
        {/* Mobile/Tablet Search Button */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="xl:hidden p-2 text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-full transition cursor-pointer"
          title="Search Jira (Ctrl+K)"
        >
          <Icons.Search className="w-4 h-4" />
        </button>

        {/* Atlassian Jira Desktop Search Box with Command Palette */}
        <div
          onClick={onOpenCommandPalette}
          className="hidden xl:flex items-center gap-2 bg-[#F4F5F7] hover:bg-[#EBECF0] border border-[#DFE1E6] rounded-lg px-2.5 py-1.5 text-xs text-[#5E6C84] cursor-pointer w-44 transition"
        >
          <Icons.Search className="w-3.5 h-3.5 shrink-0 text-[#6B778C]" />
          <span className="flex-1 truncate">Search</span>
          <kbd className="px-1.5 py-0.2 bg-white rounded border border-[#DFE1E6] text-[10px] text-[#6B778C] font-mono shadow-2xs">
            Ctrl K
          </kbd>
        </div>

        {/* Remote PostgreSQL status pill */}
        <div
          title="Connected to remote PostgreSQL db_a66689_jira on pg8001.site4now.net:6432"
          className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E3FCEF] text-[#006644] text-[10px] font-bold border border-[#ABF5D1]"
        >
          <span className="w-2 h-2 rounded-full bg-[#36B37E] animate-pulse" />
          <span>PostgreSQL Active</span>
        </div>

        {/* Notifications Bell (Directly beside Settings & Profile as per Jira) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('notifications')}
            className={`p-2 rounded-full transition cursor-pointer relative ${
              openDropdown === 'notifications'
                ? 'bg-[#DEEBFF] text-[#0052CC]'
                : 'text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0]'
            }`}
            title={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
          >
            <Icons.Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#DE350B] text-white font-black text-[9px] leading-tight flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationsPopover
            isOpen={openDropdown === 'notifications'}
            onClose={() => setOpenDropdown(null)}
            notifications={notifications}
            unreadCount={unreadCount}
            directCount={directCount}
            watchingCount={watchingCount}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDeleteNotification={handleDeleteNotification}
            onClearAll={handleClearAll}
            onSelectIssue={(issueIdOrKey) => {
              if (onSelectIssue) onSelectIssue(issueIdOrKey);
              setOpenDropdown(null);
            }}
          />
        </div>

        {/* Help Support */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => toggleDropdown('help')}
            className={`p-2 text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-full transition cursor-pointer ${
              openDropdown === 'help' ? 'bg-[#EBECF0] text-[#172B4D]' : ''
            }`}
            title="Help & Shortcuts"
          >
            <Icons.Help className="w-4 h-4" />
          </button>

          {openDropdown === 'help' && (
            <div className="absolute right-0 top-full mt-1.5 w-60 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
              <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px]">Help & Resources</div>
              <div
                onClick={() => { onOpenCommandPalette(); setOpenDropdown(null); }}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center justify-between"
              >
                <span>Keyboard shortcuts</span>
                <kbd className="px-1 py-0.2 bg-slate-100 rounded text-[10px] font-mono">?</kbd>
              </div>
              <div
                onClick={() => { setOpenDropdown(null); }}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center justify-between"
              >
                <span>Jira Cloud Documentation</span>
                <Icons.ExternalLink className="w-3 h-3 text-slate-400" />
              </div>
              <div className="border-t border-slate-100 my-1" />
              <div className="px-3 py-1 text-[11px] text-slate-400">
                Jira Clone Enterprise v2.0 (.NET 10 + PostgreSQL)
              </div>
            </div>
          )}
        </div>

        {/* Settings (Gear) */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('settings')}
            className={`p-2 text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-full transition cursor-pointer ${
              activeView === 'workspace-settings' || activeView === 'config' || activeView === 'admin' || openDropdown === 'settings'
                ? 'bg-[#DEEBFF] text-[#0052CC]'
                : ''
            }`}
            title="Jira Settings"
          >
            <Icons.Settings className="w-4 h-4" />
          </button>

          {openDropdown === 'settings' && (
            <div className="absolute right-0 top-full mt-1.5 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
              <div className="px-3 py-1 font-bold text-slate-400 uppercase text-[10px]">Atlassian & Jira Administration</div>
              {isAdmin && (
                <div
                  onClick={() => { setActiveView('admin'); setOpenDropdown(null); }}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
                >
                  <Icons.Shield className="w-3.5 h-3.5 text-[#403294]" />
                  <span className="font-semibold text-[#403294]">Administration: users, passwords & sessions</span>
                </div>
              )}
              <div
                onClick={() => {
                  if (onOpenAccountSettings) onOpenAccountSettings();
                  setOpenDropdown(null);
                }}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2 font-semibold text-[#0052cc]"
              >
                <Icons.User className="w-3.5 h-3.5 text-[#0052cc]" />
                <span>My Account Settings</span>
              </div>
              <div
                onClick={() => { setActiveView('workspace-settings'); setOpenDropdown(null); }}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
              >
                <Icons.Folder className="w-3.5 h-3.5 text-[#0052cc]" />
                <span className="font-semibold text-[#0052cc]">Workspace Settings & Security</span>
              </div>
              <div
                onClick={() => { setActiveView('config'); setOpenDropdown(null); }}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
              >
                <Icons.Compass className="w-3.5 h-3.5 text-[#0052cc]" />
                <span>Workflow Studio & Custom Columns</span>
              </div>
              <div
                onClick={() => { setActiveView('users'); setOpenDropdown(null); }}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
              >
                <Icons.Shield className="w-3.5 h-3.5 text-purple-600" />
                <span>Users, Roles & Permission Schemes</span>
              </div>
              <div
                onClick={() => { setActiveView('users'); setOpenDropdown(null); }}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
              >
                <Icons.Cpu className="w-3.5 h-3.5 text-blue-600" />
                <span>Application Access & Licensing Seats</span>
              </div>
              <div
                onClick={() => { setActiveView('import-export'); setOpenDropdown(null); }}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-slate-800 flex items-center gap-2"
              >
                <Icons.Download className="w-3.5 h-3.5 text-amber-600" />
                <span>Jira Migration & Backup</span>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar (Account Settings) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleDropdown('profile')}
            title={`${currentUser.displayName} (${currentUser.emailAddress}) - Account Settings`}
            className="w-8 h-8 rounded-full bg-[#0052CC] text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs cursor-pointer ml-1 relative transition hover:opacity-90 shrink-0"
          >
            <span>{getInitials(currentUser.displayName)}</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#36B37E] border-2 border-white rounded-full" />
          </button>

          {openDropdown === 'profile' && (
            <div className="absolute right-0 top-full mt-1.5 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-slate-200 py-3 z-50 text-xs">
              <div className="px-4 pb-2.5 border-b border-slate-100">
                <div className="font-bold text-slate-900 text-sm truncate">{currentUser.displayName}</div>
                <div className="text-[11px] text-slate-400 font-mono truncate">{currentUser.emailAddress}</div>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    isAdmin
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {currentUser.role || 'Member'}
                </span>
              </div>

              <div className="pt-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAccountSettings) onOpenAccountSettings();
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50/60 cursor-pointer text-[#0052cc] font-semibold flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Icons.User className="w-3.5 h-3.5 text-[#0052cc]" />
                    <span>Account settings</span>
                  </span>
                  <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveView('for-you'); setOpenDropdown(null); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-700 flex items-center gap-2"
                >
                  <Icons.Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>My work & activity</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveView('search'); setOpenDropdown(null); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-700 flex items-center gap-2"
                >
                  <Icons.Check className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assigned to me</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => { setActiveView('admin'); setOpenDropdown(null); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-700 flex items-center gap-2"
                  >
                    <Icons.Shield className="w-3.5 h-3.5 text-[#403294]" />
                    <span>Administration</span>
                  </button>
                )}
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => { setOpenDropdown(null); signOut(); }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 cursor-pointer text-slate-700 flex items-center gap-2"
                >
                  <Icons.LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
