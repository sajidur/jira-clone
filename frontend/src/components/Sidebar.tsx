'use client';

import React, { useState } from 'react';
import { Project, Workspace } from '@/types/jira';
import { ViewType } from './Navbar';
import { Icons } from './Icons';
import { SpaceAvatar } from './SpaceAvatar';

interface SidebarProps {
  project: Project | null;
  workspace?: Workspace | null;
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  backlogCount?: number;
  totalIssuesCount?: number;
  activeSprintName?: string;
  projects?: Project[];
  onSelectProject?: (p: Project) => void;
  onOpenCreateProject?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenAccountSettings?: () => void;
  onEditSpace?: (p: Project) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  project,
  workspace,
  activeView,
  setActiveView,
  backlogCount,
  totalIssuesCount,
  activeSprintName,
  projects = [],
  onSelectProject,
  onOpenCreateProject,
  isMobileOpen = false,
  onCloseMobile,
  onOpenAccountSettings,
  onEditSpace
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showSpacesList, setShowSpacesList] = useState(true);

  const handleSelectView = (view: ViewType) => {
    setActiveView(view);
    if (onCloseMobile) onCloseMobile();
  };

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
      >
      <div className="space-y-1">
        {/* Top Global Navigation (Matching Jira Web) */}
        <div className="space-y-0.5">
          <button
            onClick={() => handleSelectView('for-you')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer group ${
              activeView === 'for-you'
                ? 'bg-[#E9F2FF] text-[#0052cc] font-bold'
                : 'text-slate-700 hover:bg-[#EBECF0]'
            } ${collapsed ? 'justify-center px-1' : ''}`}
            title="For you"
          >
            <div className="flex items-center gap-3">
              <Icons.User className={`w-4 h-4 ${activeView === 'for-you' ? 'text-[#0052cc]' : 'text-slate-500 group-hover:text-slate-900'}`} />
              {!collapsed && <span>For you</span>}
            </div>
          </button>

          <button
            onClick={() => handleSelectView('for-you')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#EBECF0] transition cursor-pointer group ${
              collapsed ? 'justify-center px-1' : ''
            }`}
            title="Recent"
          >
            <div className="flex items-center gap-3">
              <Icons.Clock className="w-4 h-4 text-slate-500 group-hover:text-slate-900" />
              {!collapsed && <span>Recent</span>}
            </div>
            {!collapsed && <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <button
            onClick={() => handleSelectView('search')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#EBECF0] transition cursor-pointer group ${
              collapsed ? 'justify-center px-1' : ''
            }`}
            title="Starred"
          >
            <div className="flex items-center gap-3">
              <Icons.Star className="w-4 h-4 text-slate-500 group-hover:text-slate-900" />
              {!collapsed && <span>Starred</span>}
            </div>
            {!collapsed && <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <button
            onClick={() => handleSelectView('config')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#EBECF0] transition cursor-pointer group ${
              collapsed ? 'justify-center px-1' : ''
            }`}
            title="Apps"
          >
            <div className="flex items-center gap-3">
              <Icons.AppSwitcher className="w-4 h-4 text-slate-500 group-hover:text-slate-900" />
              {!collapsed && <span>Apps</span>}
            </div>
          </button>

          <button
            onClick={() => handleSelectView('roadmap')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#EBECF0] transition cursor-pointer group ${
              collapsed ? 'justify-center px-1' : ''
            }`}
            title="Plans"
          >
            <div className="flex items-center gap-3">
              <Icons.Kanban className="w-4 h-4 text-slate-500 group-hover:text-slate-900" />
              {!collapsed && <span>Plans</span>}
            </div>
            {!collapsed && <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        {/* Spaces (Projects) Section */}
        <div className="pt-2">
          {!collapsed ? (
            <div className="flex items-center justify-between px-2.5 py-1 text-slate-600 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleSelectView('spaces')}
                className={`flex items-center gap-2.5 hover:text-[#0052cc] transition cursor-pointer text-left ${
                  activeView === 'spaces' ? 'text-[#0052cc] font-bold' : ''
                }`}
                title="View All Spaces"
              >
                <Icons.Compass className={`w-4 h-4 ${activeView === 'spaces' ? 'text-[#0052cc]' : 'text-slate-500'}`} />
                <span>Spaces</span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={onOpenCreateProject}
                  className="p-1 hover:bg-[#EBECF0] rounded text-slate-500 hover:text-slate-900"
                  title="Create Space / Project"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleSelectView('spaces')}
                  className="p-1 hover:bg-[#EBECF0] rounded text-slate-500 hover:text-slate-900 cursor-pointer"
                  title="All Spaces"
                >
                  <span className="font-bold text-[10px] leading-none">•••</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleSelectView('spaces')}
              className={`w-full flex justify-center py-1.5 rounded transition cursor-pointer ${
                activeView === 'spaces' ? 'bg-[#E9F2FF] text-[#0052cc]' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="All Spaces"
            >
              <Icons.Compass className="w-4 h-4" />
            </button>
          )}

          {!collapsed && (
            <div className="pl-3 pr-1 pt-1 space-y-0.5">
              <div className="px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Recent
              </div>

              {/* Active Project Card (Matching Jira Red/Orange Icon with Blue Left Bar) */}
              <button
                onClick={() => handleSelectView('board')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-r-md text-xs font-semibold transition cursor-pointer group ${
                  activeView === 'board' || activeView === 'backlog' || activeView === 'roadmap'
                    ? 'border-l-[3px] border-[#0052cc] bg-[#E9F2FF] text-[#0052cc]'
                    : 'text-slate-800 hover:bg-[#EBECF0]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <SpaceAvatar project={project} size="xs" />
                  <span className="truncate">{project?.name || 'AiPRO'}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (project && onEditSpace) {
                      onEditSpace(project);
                    } else {
                      handleSelectView('config');
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 p-0.5 rounded transition cursor-pointer"
                  title="Space Settings & Rename"
                >
                  <Icons.Edit className="w-3 h-3" />
                </button>
              </button>

              <button
                onClick={() => handleSelectView('spaces')}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition cursor-pointer ${
                  activeView === 'spaces'
                    ? 'bg-[#E9F2FF] text-[#0052cc] font-bold'
                    : 'text-slate-600 hover:bg-[#EBECF0]'
                }`}
                title="View All Spaces"
              >
                <div className="flex items-center gap-2">
                  <Icons.Folder className={`w-3.5 h-3.5 ${activeView === 'spaces' ? 'text-[#0052cc]' : 'text-slate-400'}`} />
                  <span>More spaces</span>
                </div>
                <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[#EBECF0] my-2" />

        {/* Secondary Navigation (Filters, Dashboards, Operations, Customers) */}
        <div className="space-y-0.5">
          <button
            onClick={() => handleSelectView('search')}
            className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeView === 'search'
                ? 'bg-[#E9F2FF] text-[#0052cc] font-bold'
                : 'text-slate-700 hover:bg-[#EBECF0]'
            } ${collapsed ? 'justify-center px-1' : ''}`}
            title="Filters"
          >
            <Icons.Filter className="w-4 h-4 text-slate-500 shrink-0" />
            {!collapsed && <span>Filters</span>}
          </button>

          <button
            onClick={() => handleSelectView('reports')}
            className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeView === 'reports'
                ? 'bg-[#E9F2FF] text-[#0052cc] font-bold'
                : 'text-slate-700 hover:bg-[#EBECF0]'
            } ${collapsed ? 'justify-center px-1' : ''}`}
            title="Dashboards"
          >
            <Icons.BarChart className="w-4 h-4 text-slate-500 shrink-0" />
            {!collapsed && <span>Dashboards</span>}
          </button>

          <button
            onClick={() => handleSelectView('config')}
            className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeView === 'config'
                ? 'bg-[#E9F2FF] text-[#0052cc] font-bold'
                : 'text-slate-700 hover:bg-[#EBECF0]'
            } ${collapsed ? 'justify-center px-1' : ''}`}
            title="Operations & Workflow Studio"
          >
            <Icons.Settings className="w-4 h-4 text-slate-500 shrink-0" />
            {!collapsed && <span>Operations</span>}
          </button>

          <button
            onClick={() => handleSelectView('users')}
            className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeView === 'users'
                ? 'bg-[#E9F2FF] text-[#0052cc] font-bold'
                : 'text-slate-700 hover:bg-[#EBECF0]'
            } ${collapsed ? 'justify-center px-1' : ''}`}
            title="Customers & People Directory"
          >
            <Icons.Users className="w-4 h-4 text-slate-500 shrink-0" />
            {!collapsed && <span>Customers</span>}
          </button>

          <button
            onClick={() => handleSelectView('workspace-settings')}
            className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeView === 'workspace-settings'
                ? 'bg-[#E9F2FF] text-[#0052cc] font-bold'
                : 'text-slate-700 hover:bg-[#EBECF0]'
            } ${collapsed ? 'justify-center px-1' : ''}`}
            title="Workspace Administration"
          >
            <Icons.Shield className="w-4 h-4 text-purple-600 shrink-0" />
            {!collapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>Customer experiences</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-bold text-[9px] uppercase">
                  Admin
                </span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Sidebar Footer: Account Settings + Collapse Button */}
      <div className="pt-2 border-t border-[#EBECF0] space-y-1">
        {/* Account Settings Shortcut */}
        <button
          type="button"
          onClick={() => {
            if (onOpenAccountSettings) onOpenAccountSettings();
            if (onCloseMobile) onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-[#EBECF0] transition cursor-pointer ${
            collapsed ? 'justify-center px-1' : ''
          }`}
          title="Account settings & profile"
        >
          <div className="w-5 h-5 rounded-full bg-[#0052cc] text-white font-bold text-[9px] flex items-center justify-center shrink-0">
            SR
          </div>
          {!collapsed && (
            <div className="flex items-center justify-between flex-1 truncate">
              <span className="truncate font-semibold text-slate-800">Account settings</span>
              <Icons.Settings className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </div>
          )}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center p-2 rounded-lg hover:bg-[#EBECF0] text-slate-500 hover:text-slate-900 transition cursor-pointer ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!collapsed && <span className="text-xs font-semibold">Collapse sidebar</span>}
          <Icons.ChevronRight
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
