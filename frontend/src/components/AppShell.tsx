'use client';

import React, { useEffect, useState } from 'react';
import { Workspace } from '@/types/jira';
import { createWorkspace, fetchIssue, fetchProjects } from '@/lib/api';
import { PROJECT_VIEWS, viewTitle } from '@/lib/routes';
import { recordRecentIssue } from '@/lib/recent';
import { useJira } from '@/context/JiraContext';
import { useCurrentUser } from './AuthProvider';
import { useAppNavigation } from './AppNavigation';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { RouteView } from './RouteView';
import { CommandPalette } from './CommandPalette';
import { IssueDetailModal } from './IssueDetailModal';
import { CreateIssueModal } from './CreateIssueModal';
import { CreateProjectModal } from './CreateProjectModal';
import { AccountSettingsModal } from './AccountSettingsModal';
import { EditSpaceModal } from './EditSpaceModal';
import { Icons } from './Icons';

/** Top bar, sidebar, the page for the current URL, and app-wide dialogs. */
export const AppShell: React.FC = () => {
  const jira = useJira();
  const nav = useAppNavigation();
  const currentUser = useCurrentUser();

  // ---- Issue shown on top of the page (from ?selectedIssue= or /browse/KEY) ----
  const [openIssue, setOpenIssue] = useState<{ key: string; id: number; summary: string } | null>(null);
  const [missingIssueKey, setMissingIssueKey] = useState<string | null>(null);
  const issueKey = nav.selectedIssueKey;

  useEffect(() => {
    if (!issueKey) {
      setOpenIssue(null);
      return;
    }
    const remember = (issue: { key: string; id: number; summary: string; issueType: string }) => {
      setOpenIssue({ key: issue.key, id: issue.id, summary: issue.summary });
      setMissingIssueKey(null);
      recordRecentIssue({ key: issue.key, summary: issue.summary, issueType: issue.issueType });
    };

    const loaded = jira.issues.find((i) => i.key.toUpperCase() === issueKey);
    if (loaded) {
      remember(loaded);
      return;
    }
    let cancelled = false;
    fetchIssue(issueKey)
      .then((issue) => !cancelled && remember(issue))
      .catch(() => {
        if (cancelled) return;
        setMissingIssueKey(issueKey);
        nav.closeIssue();
      });
    return () => {
      cancelled = true;
    };
    // Re-resolve when the key changes or the loaded issues change (e.g. after an edit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueKey, jira.issues]);

  // ---- Browser tab title, like Jira's "Board - ERP Core Platform - Jira" ----
  useEffect(() => {
    if (openIssue && issueKey) {
      document.title = `[${openIssue.key}] ${openIssue.summary} - Jira`;
      return;
    }
    const view = nav.activeView;
    if (!view) {
      document.title = 'Page not found - Jira';
      return;
    }
    const spaceName = PROJECT_VIEWS.includes(view) ? jira.selectedProject?.name : undefined;
    document.title = [viewTitle(view), spaceName, 'Jira'].filter(Boolean).join(' - ');
  }, [openIssue, issueKey, nav.activeView, jira.selectedProject?.name]);

  const handleWorkspaceSelect = (ws: Workspace) => {
    jira.handleWorkspaceSelect(ws);
    // On a space page, follow the switch to a space in the new workspace
    if (nav.activeView && PROJECT_VIEWS.includes(nav.activeView)) {
      const inWorkspace = jira.projects.filter((p) => !p.workspaceId || p.workspaceId === ws.id);
      const target = inWorkspace.find((p) => p.id === jira.selectedProject?.id) ?? inWorkspace[0];
      if (target) nav.selectProject(target);
      else nav.navigate('spaces');
    }
  };

  if (jira.loading && jira.projects.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAFBFC] gap-4">
        <Icons.JiraLogo className="w-10 h-10" />
        <div className="flex items-center gap-2 text-[#5E6C84] text-sm">
          <Icons.Refresh className="w-4 h-4 text-[#0052CC] animate-spin" />
          <span>Loading your Jira site…</span>
        </div>
      </div>
    );
  }

  if (jira.error && jira.projects.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAFBFC] p-6 text-center">
        <div className="p-6 bg-white rounded-[3px] shadow-[0_0_10px_rgba(9,30,66,0.12)] max-w-md space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FFEBE6] text-[#BF2600] flex items-center justify-center mx-auto">
            <Icons.X className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-[#172B4D]">Can&apos;t reach the Jira server</h2>
          <p className="text-sm text-[#5E6C84]">{jira.error}</p>
          <button
            onClick={jira.refreshAll}
            className="h-8 px-3 bg-[#0052CC] hover:bg-[#0065FF] text-white rounded-[3px] text-sm font-semibold cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen max-w-full overflow-hidden flex flex-col bg-white">
      <Navbar
        workspaces={jira.workspaces}
        selectedWorkspace={jira.selectedWorkspace}
        onSelectWorkspace={handleWorkspaceSelect}
        onOpenCreateWorkspace={jira.openCreateWorkspaceModal}
        onOpenCreateIssue={() => jira.openCreateIssueModal()}
        activeView={nav.activeView}
        setActiveView={(v) => nav.navigate(v)}
        onOpenCommandPalette={jira.openCommandPalette}
        onToggleMobileSidebar={() => jira.setMobileSidebarOpen(!jira.isMobileSidebarOpen)}
        isMobileSidebarOpen={jira.isMobileSidebarOpen}
        onOpenAccountSettings={jira.openAccountSettingsModal}
        onSelectIssue={nav.openIssue}
      />

      <div className="flex flex-1 overflow-hidden min-w-0 w-full relative">
        <Sidebar
          isMobileOpen={jira.isMobileSidebarOpen}
          onCloseMobile={() => jira.setMobileSidebarOpen(false)}
          onOpenCreateProject={jira.openCreateProjectModal}
          onOpenAccountSettings={jira.openAccountSettingsModal}
          onEditSpace={jira.openEditSpaceModal}
        />

        <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col relative">
          {missingIssueKey && (
            <div
              role="alert"
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-[3px] bg-[#172B4D] text-white text-sm px-4 py-2.5 shadow-lg"
            >
              <span>
                Work item <span className="font-semibold">{missingIssueKey}</span> doesn&apos;t exist or you don&apos;t have
                access to it.
              </span>
              <button
                type="button"
                onClick={() => setMissingIssueKey(null)}
                className="p-0.5 rounded hover:bg-white/20 cursor-pointer"
                aria-label="Dismiss"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>
          )}
          <RouteView />
        </main>
      </div>

      <CommandPalette
        isOpen={jira.isCommandPaletteOpen}
        onClose={jira.closeCommandPalette}
        issues={jira.issues}
        onSelectIssue={(issue) => nav.openIssue(issue.key)}
        onSelectView={(v) => nav.navigate(v)}
        onOpenCreateIssue={() => jira.openCreateIssueModal()}
      />

      {openIssue && issueKey && (
        <IssueDetailModal
          key={openIssue.id}
          issueId={openIssue.id}
          sprints={jira.sprints}
          users={jira.users}
          onClose={nav.closeIssue}
          onIssueUpdated={jira.refreshProjectData}
        />
      )}

      {jira.isCreateIssueOpen && jira.selectedProject && (
        <CreateIssueModal
          projects={jira.projects}
          currentProject={jira.selectedProject}
          sprints={jira.sprints}
          users={jira.users}
          defaultStatus={jira.defaultStatusForCreate}
          defaultSprintId={jira.defaultSprintIdForCreate}
          onClose={jira.closeCreateIssueModal}
          onIssueCreated={jira.refreshProjectData}
        />
      )}

      {jira.isCreateProjectOpen && (
        <CreateProjectModal
          currentWorkspace={jira.selectedWorkspace}
          workspaces={jira.workspaces}
          onClose={jira.closeCreateProjectModal}
          onProjectCreated={async (newId) => {
            await jira.refreshAll();
            const created = (await fetchProjects()).find((p) => p.id === newId);
            if (created) nav.navigate('board', created);
          }}
        />
      )}

      {jira.isCreateWorkspaceOpen && (
        <CreateWorkspaceDialog
          onClose={jira.closeCreateWorkspaceModal}
          onCreated={async (ws) => {
            jira.closeCreateWorkspaceModal();
            await jira.refreshAll();
            handleWorkspaceSelect(ws);
          }}
        />
      )}

      <AccountSettingsModal
        isOpen={jira.isAccountSettingsOpen}
        onClose={jira.closeAccountSettingsModal}
        userName={currentUser.displayName}
        userEmail={currentUser.emailAddress}
      />

      <EditSpaceModal
        isOpen={!!jira.spaceToEdit}
        space={jira.spaceToEdit}
        onClose={jira.closeEditSpaceModal}
        onUpdated={(updated) => {
          jira.handleProjectUpdated(updated);
          jira.closeEditSpaceModal();
          // A new key changes the space's URL
          if (nav.activeView && PROJECT_VIEWS.includes(nav.activeView) && jira.selectedProject?.id === updated.id) {
            nav.navigate(nav.activeView, updated);
          }
        }}
      />
    </div>
  );
};

const CreateWorkspaceDialog: React.FC<{ onClose: () => void; onCreated: (ws: Workspace) => void }> = ({
  onClose,
  onCreated
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('akij.net');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const created = await createWorkspace({
        name: name.trim(),
        slug: slug.trim() || undefined,
        domain: domain.trim() || undefined
      });
      onCreated(created);
    } catch (err: any) {
      alert(err.message || 'Failed to create workspace');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              W
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Create an Atlassian Workspace</h3>
              <p className="text-[11px] text-slate-500">Multi-tenant site for your projects and teams</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Workspace Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. RexSystem Innovations"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                }
              }}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Workspace Key / Identifier</label>
            <input
              type="text"
              placeholder="e.g. akij-tech, rexsystem"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">On-Premises Server Address / Host Domain</label>
            <input
              type="text"
              placeholder="e.g. erp.akij.net or localhost:5050"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">Host domain or IP address for on-premises server hosting.</p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md transition-colors shadow-xs"
            >
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppShell;
