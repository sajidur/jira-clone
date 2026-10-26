'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types/jira';
import { updateProject } from '@/lib/api';
import { toggleStarredSpace, useQuickAccess } from '@/lib/recent';
import { useJira } from '@/context/JiraContext';
import { useAppNavigation } from './AppNavigation';
import { SpaceAvatar } from './SpaceAvatar';
import { Icons } from './Icons';
import type { ViewType } from './Navbar';

/** A space's views, in Jira's order. Also listed under an expanded space in the sidebar. */
export const SPACE_TABS: { view: ViewType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { view: 'roadmap', label: 'Timeline', icon: Icons.Clock },
  { view: 'backlog', label: 'Backlog', icon: Icons.Backlog },
  { view: 'board', label: 'Board', icon: Icons.Kanban },
  { view: 'list', label: 'List', icon: Icons.List },
  { view: 'reports', label: 'Reports', icon: Icons.BarChart },
  { view: 'releases', label: 'Releases', icon: Icons.Rocket }
];

interface ProjectHeaderProps {
  project: Project;
  activeView: ViewType;
}

/** Space header shared by every space view: breadcrumb, name, actions and the view tabs. */
export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project, activeView }) => {
  const { hrefFor } = useAppNavigation();
  const { handleProjectUpdated, openEditSpaceModal } = useJira();
  const { starredSpaceIds } = useQuickAccess();
  const isStarred = starredSpaceIds.includes(project.id);

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(project.name);
  const [savingName, setSavingName] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempName(project.name);
  }, [project.name]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const saveName = async () => {
    const name = tempName.trim();
    if (!name || name === project.name) {
      setIsEditingName(false);
      setTempName(project.name);
      return;
    }
    try {
      setSavingName(true);
      handleProjectUpdated(await updateProject(project.id, { name }));
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to rename space', err);
      alert('Failed to save space name');
      setTempName(project.name);
      setIsEditingName(false);
    } finally {
      setSavingName(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="px-4 sm:px-6 pt-3 border-b border-[#EBECF0] bg-white shrink-0">
      <nav aria-label="Breadcrumb" className="text-[12px] text-[#5E6C84] mb-1">
        <Link href={hrefFor('spaces')} className="hover:underline hover:text-[#172B4D]">
          Spaces
        </Link>
      </nav>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href={hrefFor('board', project)} className="shrink-0" title={project.name}>
            <SpaceAvatar project={project} size="sm" />
          </Link>

          {isEditingName ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <input
                type="text"
                autoFocus
                disabled={savingName}
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') {
                    setTempName(project.name);
                    setIsEditingName(false);
                  }
                }}
                aria-label="Space name"
                className="min-w-0 text-xl font-semibold text-[#172B4D] px-1.5 py-0.5 border-2 border-[#4C9AFF] rounded-[3px] bg-white focus:outline-hidden"
              />
              <button
                type="button"
                onClick={saveName}
                disabled={savingName}
                className="p-1 rounded-[3px] bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#42526E] cursor-pointer"
                title="Save (Enter)"
              >
                <Icons.Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempName(project.name);
                  setIsEditingName(false);
                }}
                disabled={savingName}
                className="p-1 rounded-[3px] bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#42526E] cursor-pointer"
                title="Cancel (Esc)"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <h1
              onClick={() => setIsEditingName(true)}
              className="text-xl font-semibold text-[#172B4D] tracking-tight truncate cursor-text rounded-[3px] px-1 -mx-1 hover:bg-[#F4F5F7]"
              title="Click to rename"
            >
              {project.name}
            </h1>
          )}

          <div className="flex items-center gap-0.5 text-[#42526E] shrink-0">
            <button
              type="button"
              onClick={() => toggleStarredSpace(project.id)}
              className="p-1.5 rounded-[3px] hover:bg-[#EBECF0] cursor-pointer"
              title={isStarred ? 'Remove from Starred' : 'Add to Starred'}
              aria-pressed={isStarred}
            >
              <Icons.Star className={`w-4 h-4 ${isStarred ? 'text-[#FFAB00] fill-[#FFAB00]' : ''}`} />
            </button>
            <Link href={hrefFor('users', project)} className="p-1.5 rounded-[3px] hover:bg-[#EBECF0]" title="People">
              <Icons.Users className="w-4 h-4" />
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className={`p-1.5 rounded-[3px] cursor-pointer ${menuOpen ? 'bg-[#DEEBFF] text-[#0052CC]' : 'hover:bg-[#EBECF0]'}`}
                title="More actions"
                aria-expanded={menuOpen}
              >
                <Icons.MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-[3px] shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] py-1.5 z-50 text-sm">
                  <Link
                    href={hrefFor('config', project)}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-[#172B4D] hover:bg-[#F4F5F7]"
                  >
                    <Icons.Settings className="w-4 h-4 text-[#42526E]" />
                    Space settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      openEditSpaceModal(project);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[#172B4D] hover:bg-[#F4F5F7] cursor-pointer"
                  >
                    <Icons.Edit className="w-4 h-4 text-[#42526E]" />
                    Edit name, key & icon
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      toggleStarredSpace(project.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[#172B4D] hover:bg-[#F4F5F7] cursor-pointer"
                  >
                    <Icons.Star className="w-4 h-4 text-[#42526E]" />
                    {isStarred ? 'Remove from Starred' : 'Add to Starred'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#42526E] shrink-0">
          <button
            type="button"
            onClick={copyLink}
            className={`h-8 px-2.5 rounded-[3px] text-sm font-medium flex items-center gap-1.5 cursor-pointer ${
              linkCopied ? 'bg-[#E3FCEF] text-[#006644]' : 'hover:bg-[#EBECF0]'
            }`}
            title="Copy link to this page"
          >
            {linkCopied ? <Icons.Check className="w-4 h-4" /> : <Icons.Link className="w-4 h-4" />}
            <span className="hidden sm:inline">{linkCopied ? 'Copied' : 'Share'}</span>
          </button>
          <Link
            href={hrefFor('config', project)}
            className={`p-2 rounded-[3px] ${activeView === 'config' ? 'bg-[#DEEBFF] text-[#0052CC]' : 'hover:bg-[#EBECF0]'}`}
            title="Space settings"
          >
            <Icons.Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <nav aria-label="Space views" className="flex items-center gap-1 mt-2 -mb-px overflow-x-auto text-sm">
        {SPACE_TABS.map(({ view, label, icon: Icon }) => {
          const active = activeView === view;
          return (
            <Link
              key={view}
              href={hrefFor(view, project)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-2 pt-1.5 pb-2 border-b-2 whitespace-nowrap transition-colors ${
                active
                  ? 'border-[#0052CC] text-[#0052CC] font-semibold'
                  : 'border-transparent text-[#42526E] hover:text-[#172B4D] hover:border-[#C1C7D0]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default ProjectHeader;
