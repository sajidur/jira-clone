'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Project, Issue, Sprint, AppUser, Workspace } from '@/types/jira';
import {
  fetchProjects,
  fetchSprints,
  fetchIssues,
  fetchUsers,
  fetchWorkspaces,
  createWorkspace,
  moveIssue,
  createSprint,
  startSprint,
  completeSprint
} from '@/lib/api';
import { Navbar, ViewType } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { BoardView } from '@/components/BoardView';
import { BacklogView } from '@/components/BacklogView';
import { ListView } from '@/components/ListView';
import { RoadmapTimelineView } from '@/components/RoadmapTimelineView';
import { ReportsView } from '@/components/ReportsView';
import { ReleasesView } from '@/components/ReleasesView';
import { ConfigurationView } from '@/components/ConfigurationView';
import { JiraImportExportView } from '@/components/JiraImportExportView';
import JqlSearchView from '@/components/JqlSearchView';
import UserRoleManagementView from '@/components/UserRoleManagementView';
import WorkspaceSettingsView from '@/components/WorkspaceSettingsView';
import { ForYouView } from '@/components/ForYouView';
import { SpacesView } from '@/components/SpacesView';
import { AccountSettingsModal } from '@/components/AccountSettingsModal';
import { EditSpaceModal } from '@/components/EditSpaceModal';
import { IssueDetailModal } from '@/components/IssueDetailModal';
import { CreateIssueModal } from '@/components/CreateIssueModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { CommandPalette } from '@/components/CommandPalette';
import { Icons } from '@/components/Icons';
import { AuthProvider, useAuth, useCurrentUser } from '@/components/AuthProvider';
import { LoginPage } from '@/components/LoginPage';
import AdminConsoleView from '@/components/AdminConsoleView';

export default function Page() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAFBFC] gap-4">
        <Icons.JiraLogo className="w-10 h-10" />
        <Icons.Refresh className="w-4 h-4 text-[#0052CC] animate-spin" />
      </div>
    );
  }

  if (status === 'signed-out') return <LoginPage />;

  return <JiraApp />;
}

function JiraApp() {
  const currentUser = useCurrentUser();
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active view: 'board' | 'backlog' | 'list' | 'roadmap' | 'reports' | 'releases' | 'config' | 'import-export'
  const [activeView, setActiveView] = useState<ViewType>('board');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [defaultStatusForCreate, setDefaultStatusForCreate] = useState<string>('To Do');
  const [defaultSprintIdForCreate, setDefaultSprintIdForCreate] = useState<number | null | undefined>(undefined);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsSlug, setNewWsSlug] = useState('');
  const [newWsDomain, setNewWsDomain] = useState('akij.net');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<Project | null>(null);

  // Global Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load initial data
  const loadProjectsAndUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const [projData, userData, wsData] = await Promise.all([
        fetchProjects(),
        fetchUsers(),
        fetchWorkspaces()
      ]);
      setProjects(projData);
      setUsers(userData);
      setWorkspaces(wsData);

      let activeWs = wsData[0] || null;
      if (typeof window !== 'undefined') {
        const storedId = localStorage.getItem('jira_selected_workspace_id');
        if (storedId) {
          const match = wsData.find((w) => w.id === Number(storedId));
          if (match) activeWs = match;
        }
      }
      setSelectedWorkspace(activeWs);

      const scopedProj = activeWs
        ? projData.filter((p) => !p.workspaceId || p.workspaceId === activeWs.id)
        : projData;

      if (scopedProj.length > 0) {
        setSelectedProject(scopedProj[0]);
      } else if (projData.length > 0) {
        setSelectedProject(projData[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to .NET 10 API');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSelect = (ws: Workspace) => {
    setSelectedWorkspace(ws);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jira_selected_workspace_id', ws.id.toString());
    }
    const scopedProj = projects.filter((p) => !p.workspaceId || p.workspaceId === ws.id);
    if (scopedProj.length > 0) {
      if (!selectedProject || !scopedProj.some((p) => p.id === selectedProject.id)) {
        setSelectedProject(scopedProj[0]);
      }
    } else {
      setSelectedProject(null);
    }
  };

  const handleCreateWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const created = await createWorkspace({
        name: newWsName.trim(),
        slug: newWsSlug.trim() || undefined,
        domain: newWsDomain.trim() || undefined
      });
      setIsCreateWorkspaceOpen(false);
      setNewWsName('');
      setNewWsSlug('');
      const fresh = await fetchWorkspaces();
      setWorkspaces(fresh);
      handleWorkspaceSelect(created);
    } catch (err: any) {
      alert(err.message || 'Failed to create workspace');
    }
  };

  const loadProjectData = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const [sprintData, issueData] = await Promise.all([
        fetchSprints(selectedProject.id),
        fetchIssues({ projectId: selectedProject.id, search: searchQuery || undefined })
      ]);
      setSprints(sprintData);
      setIssues(issueData);
    } catch (err) {
      console.error('Failed to load project details', err);
    }
  }, [selectedProject, searchQuery]);

  useEffect(() => {
    loadProjectsAndUsers();
  }, []);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const activeSprint = sprints.find((s) => s.state === 'active') || null;

  const boardIssues = sprints.length > 0 && activeSprint
    ? issues.filter((i) => i.sprintId === activeSprint.id)
    : issues.filter((i) => !i.sprintId || i.sprintId === activeSprint?.id);

  const handleMoveIssueStatus = async (issueId: number, newStatus: string) => {
    try {
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
      );
      await moveIssue(issueId, { status: newStatus });
      await loadProjectData();
    } catch (e) {
      console.error(e);
      await loadProjectData();
    }
  };

  const handleMoveIssueToSprint = async (issueId: number, sprintId: number | null) => {
    try {
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, sprintId } : i))
      );
      await moveIssue(issueId, { sprintId });
      await loadProjectData();
    } catch (e) {
      console.error(e);
      await loadProjectData();
    }
  };

  const handleStartSprint = async (sprintId: number) => {
    await startSprint(sprintId);
    await loadProjectData();
  };

  const handleCompleteSprint = async (sprintId: number) => {
    await completeSprint(sprintId);
    await loadProjectData();
  };

  const handleCreateSprint = async (name: string, goal: string) => {
    if (!selectedProject) return;
    await createSprint({ projectId: selectedProject.id, name, goal });
    await loadProjectData();
  };

  const openCreateIssueModal = (defaultStatus = 'To Do', sprintId?: number | null) => {
    setDefaultStatusForCreate(defaultStatus);
    setDefaultSprintIdForCreate(sprintId !== undefined ? sprintId : activeSprint?.id);
    setIsCreateIssueOpen(true);
  };

  const handleSelectIssueFromKeyOrId = (issueIdOrKey: number | string) => {
    if (typeof issueIdOrKey === 'number') {
      setSelectedIssueId(issueIdOrKey);
    } else {
      const match = issues.find(i => i.key.toLowerCase() === issueIdOrKey.toLowerCase());
      if (match) {
        setSelectedIssueId(match.id);
      }
    }
  };

  const handleProjectUpdated = (updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    if (selectedProject?.id === updated.id) {
      setSelectedProject((prev) => (prev ? { ...prev, ...updated } : updated));
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
          J
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
          <Icons.Refresh className="w-4 h-4 text-blue-600 animate-spin" />
          <span>Connecting to .NET 10 API & PostgreSQL (pg8001.site4now.net)...</span>
        </div>
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="p-6 bg-white rounded-xl border border-rose-200 shadow-xl max-w-md space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Icons.X className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Backend Connection Error</h2>
          <p className="text-xs text-slate-600">{error}</p>
          <button
            onClick={loadProjectsAndUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-bold hover:bg-blue-700 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen max-w-full overflow-hidden flex flex-col bg-white">
      {/* Top Navigation */}
      <Navbar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={(p) => setSelectedProject(p)}
        workspaces={workspaces}
        selectedWorkspace={selectedWorkspace}
        onSelectWorkspace={handleWorkspaceSelect}
        onOpenCreateWorkspace={() => setIsCreateWorkspaceOpen(true)}
        onOpenCreateIssue={() => openCreateIssueModal()}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
        onSelectIssue={handleSelectIssueFromKeyOrId}
      />

      {/* Main Layout Body: Sidebar + Main Content Container */}
      <div className="flex flex-1 overflow-hidden min-w-0 w-full relative">
        <Sidebar
          project={selectedProject}
          workspace={selectedWorkspace}
          activeView={activeView}
          setActiveView={setActiveView}
          backlogCount={issues.filter(i => !i.sprintId).length}
          totalIssuesCount={issues.length}
          activeSprintName={activeSprint?.name}
          projects={projects}
          onSelectProject={(p) => setSelectedProject(p)}
          onOpenCreateProject={() => setIsCreateProjectOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
          onEditSpace={(p) => setSpaceToEdit(p)}
        />

        {/* View Port Content Area - strictly contained with min-w-0 */}
        <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col relative">
          {activeView === 'for-you' ? (
            <ForYouView
              currentProject={selectedProject}
              projects={projects}
              onSelectProject={(p) => setSelectedProject(p)}
              onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
              onOpenCreateIssue={() => openCreateIssueModal()}
              setActiveView={(v) => setActiveView(v)}
              currentUserName={currentUser.displayName}
            />
          ) : activeView === 'admin' ? (
            isAdmin ? (
              <AdminConsoleView onNavigateView={(v) => setActiveView(v)} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2">
                <Icons.Lock className="w-8 h-8 text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">You don&apos;t have access to Administration</h3>
                <p className="text-xs text-slate-500">Ask a Jira administrator if you need to manage users.</p>
              </div>
            )
          ) : activeView === 'spaces' ? (
            <SpacesView
              projects={projects}
              currentProject={selectedProject}
              onSelectProject={(p) => setSelectedProject(p)}
              onOpenCreateProject={() => setIsCreateProjectOpen(true)}
              setActiveView={(v) => setActiveView(v)}
              currentWorkspace={selectedWorkspace}
              onProjectUpdated={handleProjectUpdated}
            />
          ) : activeView === 'workspace-settings' && selectedWorkspace ? (
            <WorkspaceSettingsView
              currentWorkspace={selectedWorkspace}
              onWorkspaceUpdated={(ws) => {
                setSelectedWorkspace(ws);
                fetchWorkspaces().then(setWorkspaces);
              }}
              onSelectProject={(p) => {
                setSelectedProject(p);
                setActiveView('board');
              }}
              onNavigateView={(v) => setActiveView(v)}
              onOpenCreateProject={() => setIsCreateProjectOpen(true)}
              onProjectUpdated={handleProjectUpdated}
            />
          ) : selectedProject ? (
            <>
              {activeView === 'board' && (
                <BoardView
                  project={selectedProject}
                  issues={boardIssues}
                  activeSprint={activeSprint}
                  sprints={sprints}
                  onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
                  onMoveIssue={handleMoveIssueStatus}
                  onOpenCreateIssue={(st) => openCreateIssueModal(st || 'To Do')}
                  onRefresh={loadProjectData}
                  onCompleteSprint={handleCompleteSprint}
                  onNavigateView={(v) => setActiveView(v)}
                  onProjectUpdated={handleProjectUpdated}
                />
              )}

              {activeView === 'backlog' && (
                <BacklogView
                  project={selectedProject}
                  sprints={sprints}
                  issues={issues}
                  onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
                  onMoveIssueToSprint={handleMoveIssueToSprint}
                  onStartSprint={handleStartSprint}
                  onCompleteSprint={handleCompleteSprint}
                  onCreateSprint={handleCreateSprint}
                  onOpenCreateIssue={(sId) => openCreateIssueModal('To Do', sId)}
                  onRefresh={loadProjectData}
                  onProjectUpdated={handleProjectUpdated}
                />
              )}

              {activeView === 'list' && (
                <ListView
                  project={selectedProject}
                  issues={issues}
                  users={users}
                  onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
                  onRefresh={loadProjectData}
                  onOpenCreateIssue={() => openCreateIssueModal()}
                />
              )}

              {activeView === 'roadmap' && (
                <RoadmapTimelineView
                  project={selectedProject}
                  issues={issues}
                  onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
                  onOpenCreateIssue={() => openCreateIssueModal()}
                />
              )}

              {activeView === 'reports' && (
                <ReportsView
                  project={selectedProject}
                  sprints={sprints}
                />
              )}

              {activeView === 'releases' && (
                <ReleasesView
                  project={selectedProject}
                />
              )}

              {activeView === 'config' && (
                <ConfigurationView
                  project={selectedProject}
                  onProjectUpdated={handleProjectUpdated}
                />
              )}

              {activeView === 'import-export' && (
                <JiraImportExportView
                  projects={projects}
                  currentProject={selectedProject}
                  onDataImported={loadProjectData}
                />
              )}

              {activeView === 'search' && (
                <JqlSearchView
                  currentProject={selectedProject}
                  onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
                  onOpenCreateModal={() => openCreateIssueModal()}
                />
              )}

              {activeView === 'users' && (
                <UserRoleManagementView
                  currentProject={selectedProject}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icons.Folder className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">No project selected in this workspace</h3>
                <p className="text-xs text-slate-400 mt-0.5">Create your first project or configure workspace settings.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
                >
                  + Create Project
                </button>
                <button
                  onClick={() => setActiveView('workspace-settings')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition"
                >
                  Workspace Settings
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Command Palette (Linear Ctrl+K style) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        issues={issues}
        onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
        onSelectView={(v) => setActiveView(v)}
        onOpenCreateIssue={() => openCreateIssueModal()}
      />

      {/* Issue Detail Slide-Over Modal */}
      {selectedIssueId && (
        <IssueDetailModal
          issueId={selectedIssueId}
          sprints={sprints}
          users={users}
          onClose={() => setSelectedIssueId(null)}
          onIssueUpdated={loadProjectData}
        />
      )}

      {/* Create Issue Modal */}
      {isCreateIssueOpen && selectedProject && (
        <CreateIssueModal
          projects={projects}
          currentProject={selectedProject}
          sprints={sprints}
          users={users}
          defaultStatus={defaultStatusForCreate}
          defaultSprintId={defaultSprintIdForCreate}
          onClose={() => setIsCreateIssueOpen(false)}
          onIssueCreated={loadProjectData}
        />
      )}

      {/* Create Project Modal */}
      {isCreateProjectOpen && (
        <CreateProjectModal
          currentWorkspace={selectedWorkspace}
          workspaces={workspaces}
          onClose={() => setIsCreateProjectOpen(false)}
          onProjectCreated={async (newId) => {
            const list = await fetchProjects();
            setProjects(list);
            const found = list.find((p) => p.id === newId) || list[0];
            setSelectedProject(found);
          }}
        />
      )}

      {/* Create Workspace Modal */}
      {isCreateWorkspaceOpen && (
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
                onClick={() => setIsCreateWorkspaceOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkspaceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Workspace Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RexSystem Innovations"
                  value={newWsName}
                  onChange={(e) => {
                    setNewWsName(e.target.value);
                    if (!newWsSlug) {
                      setNewWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                    }
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Workspace Key / Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. akij-tech, rexsystem"
                  value={newWsSlug}
                  onChange={(e) => setNewWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  On-Premises Server Address / Host Domain
                </label>
                <input
                  type="text"
                  placeholder="e.g. erp.akij.net or localhost:5050"
                  value={newWsDomain}
                  onChange={(e) => setNewWsDomain(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">Host domain or IP address for on-premises server hosting.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateWorkspaceOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newWsName.trim()}
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md transition-colors shadow-xs"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Atlassian Account Settings Modal */}
      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
        userName={currentUser.displayName}
        userEmail={currentUser.emailAddress}
      />

      {/* Global Edit Space Modal */}
      <EditSpaceModal
        isOpen={!!spaceToEdit}
        space={spaceToEdit}
        onClose={() => setSpaceToEdit(null)}
        onUpdated={(updated) => {
          handleProjectUpdated(updated);
          setSpaceToEdit(null);
        }}
      />
    </div>
  );
}
