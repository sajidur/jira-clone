'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Project, Issue, Sprint, AppUser, Workspace } from '@/types/jira';
import {
  fetchProjects,
  fetchSprints,
  fetchIssues,
  fetchUsers,
  fetchWorkspaces,
  moveIssue,
  createSprint,
  startSprint,
  completeSprint,
  fetchIssue
} from '@/lib/api';
import { parseRoute } from '@/lib/routes';

// The space named in the current URL, if any (e.g. /jira/software/projects/ERP/... or /browse/ERP-12)
function projectKeyFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const route = parseRoute(window.location.pathname);
  return route.kind === 'view' || route.kind === 'browse' ? route.projectKey : undefined;
}

interface JiraContextValue {
  // Data
  projects: Project[];
  selectedProject: Project | null;
  setSelectedProject: (p: Project | null) => void;
  selectProjectByKey: (key: string) => Project | null;
  sprints: Sprint[];
  issues: Issue[];
  /** True once sprints and issues have been loaded for the selected project. */
  projectDataReady: boolean;
  users: AppUser[];
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  setSelectedWorkspace: (ws: Workspace | null) => void;
  loading: boolean;
  error: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Computed
  activeSprint: Sprint | null;
  boardIssues: Issue[];

  // Modals state
  selectedIssueId: number | null;
  setSelectedIssueId: (id: number | null) => void;
  openIssueByKeyOrId: (keyOrId: string | number) => Promise<void>;
  closeIssueModal: () => void;

  isCreateIssueOpen: boolean;
  defaultStatusForCreate: string;
  defaultSprintIdForCreate: number | null | undefined;
  openCreateIssueModal: (defaultStatus?: string, defaultSprintId?: number | null) => void;
  closeCreateIssueModal: () => void;

  isCreateProjectOpen: boolean;
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;

  isCreateWorkspaceOpen: boolean;
  openCreateWorkspaceModal: () => void;
  closeCreateWorkspaceModal: () => void;

  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  isAccountSettingsOpen: boolean;
  openAccountSettingsModal: () => void;
  closeAccountSettingsModal: () => void;

  spaceToEdit: Project | null;
  openEditSpaceModal: (p: Project) => void;
  closeEditSpaceModal: () => void;

  // Actions
  handleWorkspaceSelect: (ws: Workspace) => void;
  handleMoveIssueStatus: (issueId: number, newStatus: string) => Promise<void>;
  handleMoveIssueToSprint: (issueId: number, sprintId: number | null) => Promise<void>;
  handleStartSprint: (sprintId: number) => Promise<void>;
  handleCompleteSprint: (sprintId: number) => Promise<void>;
  handleCreateSprint: (name: string, goal: string) => Promise<void>;
  handleProjectUpdated: (updated: Project) => void;
  refreshProjectData: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const JiraContext = createContext<JiraContextValue | null>(null);

export const JiraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadedProjectId, setLoadedProjectId] = useState<number | null>(null);

  // Modals
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [defaultStatusForCreate, setDefaultStatusForCreate] = useState<string>('To Do');
  const [defaultSprintIdForCreate, setDefaultSprintIdForCreate] = useState<number | null | undefined>(undefined);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<Project | null>(null);

  // Ctrl+K listener for Command Palette
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

  const loadProjectsAndUsers = useCallback(async () => {
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

      const urlProject = projData.find((p) => p.key.toUpperCase() === projectKeyFromUrl());

      let activeWs = (urlProject && wsData.find((w) => w.id === urlProject.workspaceId)) || wsData[0] || null;
      if (typeof window !== 'undefined') {
        const storedWsId = localStorage.getItem('jira_selected_workspace_id');
        if (storedWsId && !urlProject) {
          const match = wsData.find((w) => w.id === Number(storedWsId));
          if (match) activeWs = match;
        }
      }
      setSelectedWorkspace(activeWs);

      const scopedProj = activeWs
        ? projData.filter((p) => !p.workspaceId || p.workspaceId === activeWs.id)
        : projData;

      let targetProject = urlProject || scopedProj[0] || projData[0] || null;
      if (typeof window !== 'undefined' && !urlProject) {
        const storedProjKey = localStorage.getItem('jira_selected_project_key');
        if (storedProjKey) {
          const match = projData.find((p) => p.key.toLowerCase() === storedProjKey.toLowerCase());
          if (match) targetProject = match;
        }
      }

      if (targetProject) {
        setSelectedProject((prev) => prev || targetProject);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Jira API');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProjectData = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const [sprintData, issueData] = await Promise.all([
        fetchSprints(selectedProject.id),
        fetchIssues({ projectId: selectedProject.id, search: searchQuery || undefined })
      ]);
      setSprints(sprintData);
      setIssues(issueData);
      setLoadedProjectId(selectedProject.id);
    } catch (err) {
      console.error('Failed to load project details', err);
    }
  }, [selectedProject, searchQuery]);

  useEffect(() => {
    loadProjectsAndUsers();
  }, [loadProjectsAndUsers]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  const selectProjectByKey = useCallback((key: string): Project | null => {
    if (!key) return null;
    const match = projects.find((p) => p.key.toLowerCase() === key.toLowerCase());
    if (match) {
      setSelectedProject(match);
      // Opening a space from another workspace switches to that workspace
      const ws = match.workspaceId ? workspaces.find((w) => w.id === match.workspaceId) : undefined;
      if (ws) setSelectedWorkspace((prev) => (prev?.id === ws.id ? prev : ws));
      if (typeof window !== 'undefined') {
        localStorage.setItem('jira_selected_project_key', match.key);
        if (ws) localStorage.setItem('jira_selected_workspace_id', ws.id.toString());
      }
      return match;
    }
    return null;
  }, [projects, workspaces]);

  const handleWorkspaceSelect = useCallback((ws: Workspace) => {
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
  }, [projects, selectedProject]);

  const activeSprint = useMemo(
    () => sprints.find((s) => s.state === 'active') || null,
    [sprints]
  );

  const boardIssues = useMemo(() => {
    if (sprints.length > 0 && activeSprint) {
      return issues.filter((i) => i.sprintId === activeSprint.id);
    }
    return issues.filter((i) => !i.sprintId || i.sprintId === activeSprint?.id);
  }, [issues, sprints, activeSprint]);

  const handleMoveIssueStatus = useCallback(async (issueId: number, newStatus: string) => {
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
  }, [loadProjectData]);

  const handleMoveIssueToSprint = useCallback(async (issueId: number, sprintId: number | null) => {
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
  }, [loadProjectData]);

  const handleStartSprint = useCallback(async (sprintId: number) => {
    await startSprint(sprintId);
    await loadProjectData();
  }, [loadProjectData]);

  const handleCompleteSprint = useCallback(async (sprintId: number) => {
    await completeSprint(sprintId);
    await loadProjectData();
  }, [loadProjectData]);

  const handleCreateSprint = useCallback(async (name: string, goal: string) => {
    if (!selectedProject) return;
    await createSprint({ projectId: selectedProject.id, name, goal });
    await loadProjectData();
  }, [selectedProject, loadProjectData]);

  const handleProjectUpdated = useCallback((updated: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
    if (selectedProject?.id === updated.id) {
      setSelectedProject((prev) => (prev ? { ...prev, ...updated } : updated));
    }
  }, [selectedProject]);

  const openIssueByKeyOrId = useCallback(async (keyOrId: string | number) => {
    if (typeof keyOrId === 'number') {
      setSelectedIssueId(keyOrId);
      return;
    }
    const normalizedKey = keyOrId.trim();
    // Check in loaded issues first
    const found = issues.find((i) => i.key.toLowerCase() === normalizedKey.toLowerCase());
    if (found) {
      setSelectedIssueId(found.id);
      return;
    }
    // Fetch directly from API by key
    try {
      const fetched = await fetchIssue(normalizedKey);
      if (fetched) {
        setSelectedIssueId(fetched.id);
        // Ensure its project is selected
        if (!selectedProject || selectedProject.id !== fetched.projectId) {
          const matchProj = projects.find((p) => p.id === fetched.projectId);
          if (matchProj) setSelectedProject(matchProj);
        }
      }
    } catch (err) {
      console.error('Failed to open issue', keyOrId, err);
    }
  }, [issues, selectedProject, projects]);

  const closeIssueModal = useCallback(() => {
    setSelectedIssueId(null);
  }, []);

  const openCreateIssueModal = useCallback((defaultStatus = 'To Do', sprintId?: number | null) => {
    setDefaultStatusForCreate(defaultStatus);
    setDefaultSprintIdForCreate(sprintId !== undefined ? sprintId : activeSprint?.id);
    setIsCreateIssueOpen(true);
  }, [activeSprint]);

  const closeCreateIssueModal = useCallback(() => {
    setIsCreateIssueOpen(false);
  }, []);

  const openCreateProjectModal = useCallback(() => setIsCreateProjectOpen(true), []);
  const closeCreateProjectModal = useCallback(() => setIsCreateProjectOpen(false), []);

  const openCreateWorkspaceModal = useCallback(() => setIsCreateWorkspaceOpen(true), []);
  const closeCreateWorkspaceModal = useCallback(() => setIsCreateWorkspaceOpen(false), []);

  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);

  const openAccountSettingsModal = useCallback(() => setIsAccountSettingsOpen(true), []);
  const closeAccountSettingsModal = useCallback(() => setIsAccountSettingsOpen(false), []);

  const openEditSpaceModal = useCallback((p: Project) => setSpaceToEdit(p), []);
  const closeEditSpaceModal = useCallback(() => setSpaceToEdit(null), []);

  const refreshAll = useCallback(async () => {
    await loadProjectsAndUsers();
    await loadProjectData();
  }, [loadProjectsAndUsers, loadProjectData]);

  return (
    <JiraContext.Provider
      value={{
        projects,
        selectedProject,
        setSelectedProject,
        selectProjectByKey,
        sprints,
        issues,
        projectDataReady: !!selectedProject && loadedProjectId === selectedProject.id,
        users,
        workspaces,
        selectedWorkspace,
        setSelectedWorkspace,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        activeSprint,
        boardIssues,
        selectedIssueId,
        setSelectedIssueId,
        openIssueByKeyOrId,
        closeIssueModal,
        isCreateIssueOpen,
        defaultStatusForCreate,
        defaultSprintIdForCreate,
        openCreateIssueModal,
        closeCreateIssueModal,
        isCreateProjectOpen,
        openCreateProjectModal,
        closeCreateProjectModal,
        isCreateWorkspaceOpen,
        openCreateWorkspaceModal,
        closeCreateWorkspaceModal,
        isCommandPaletteOpen,
        openCommandPalette,
        closeCommandPalette,
        isMobileSidebarOpen,
        setMobileSidebarOpen,
        isAccountSettingsOpen,
        openAccountSettingsModal,
        closeAccountSettingsModal,
        spaceToEdit,
        openEditSpaceModal,
        closeEditSpaceModal,
        handleWorkspaceSelect,
        handleMoveIssueStatus,
        handleMoveIssueToSprint,
        handleStartSprint,
        handleCompleteSprint,
        handleCreateSprint,
        handleProjectUpdated,
        refreshProjectData: loadProjectData,
        refreshAll
      }}
    >
      {children}
    </JiraContext.Provider>
  );
};

export function useJira(): JiraContextValue {
  const ctx = useContext(JiraContext);
  if (!ctx) throw new Error('useJira must be used inside <JiraProvider>');
  return ctx;
}
