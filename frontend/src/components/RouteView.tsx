'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Project } from '@/types/jira';
import { PROJECT_VIEWS } from '@/lib/routes';
import { recordRecentSpace } from '@/lib/recent';
import { useJira } from '@/context/JiraContext';
import { useAuth, useCurrentUser } from './AuthProvider';
import { useAppNavigation } from './AppNavigation';
import { ProjectHeader } from './ProjectHeader';
import { BoardView } from './BoardView';
import { BacklogView } from './BacklogView';
import { ListView } from './ListView';
import { RoadmapTimelineView } from './RoadmapTimelineView';
import { ReportsView } from './ReportsView';
import { ReleasesView } from './ReleasesView';
import { ConfigurationView } from './ConfigurationView';
import { JiraImportExportView } from './JiraImportExportView';
import JqlSearchView from './JqlSearchView';
import UserRoleManagementView from './UserRoleManagementView';
import WorkspaceSettingsView from './WorkspaceSettingsView';
import AdminConsoleView from './AdminConsoleView';
import { ForYouView } from './ForYouView';
import { SpacesView } from './SpacesView';
import { Icons } from './Icons';
import type { ViewType } from './Navbar';

const Loading: React.FC = () => (
  <div className="flex-1 flex items-center justify-center gap-2 text-sm text-[#5E6C84]">
    <Icons.Refresh className="w-4 h-4 animate-spin text-[#0052CC]" />
    Loading…
  </div>
);

const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
}> = ({ icon, title, description, action }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
    <div className="w-12 h-12 rounded-full bg-[#F4F5F7] text-[#5E6C84] flex items-center justify-center">{icon}</div>
    <div>
      <h2 className="text-base font-semibold text-[#172B4D]">{title}</h2>
      <p className="text-sm text-[#5E6C84] mt-1 max-w-md">{description}</p>
    </div>
    {action && (
      <Link
        href={action.href}
        className="h-8 px-3 inline-flex items-center rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] text-white text-sm font-semibold"
      >
        {action.label}
      </Link>
    )}
  </div>
);

/** Renders the page the URL points at. */
export const RouteView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jira = useJira();
  const nav = useAppNavigation();
  const { isAdmin } = useAuth();
  const currentUser = useCurrentUser();
  const { route } = nav;

  const routeProjectKey = route.kind === 'view' || route.kind === 'browse' ? route.projectKey : undefined;
  const routeProject = routeProjectKey
    ? jira.projects.find((p) => p.key.toUpperCase() === routeProjectKey)
    : undefined;

  useEffect(() => {
    if (route.kind === 'redirect') router.replace(route.to);
  }, [route, router]);

  // The URL decides which space is open
  useEffect(() => {
    if (!routeProject) return;
    if (jira.selectedProject?.id !== routeProject.id) jira.selectProjectByKey(routeProject.key);
    recordRecentSpace(routeProject.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeProject?.id]);

  const renderSpaceView = (spaceView: ViewType, project: Project) => {
    switch (spaceView) {
      case 'board':
        return (
          <BoardView
            project={project}
            issues={jira.boardIssues}
            activeSprint={jira.activeSprint}
            sprints={jira.sprints}
            onSelectIssue={(issue) => nav.openIssue(issue.key)}
            onMoveIssue={jira.handleMoveIssueStatus}
            onOpenCreateIssue={(status) => jira.openCreateIssueModal(status || 'To Do')}
            onRefresh={jira.refreshProjectData}
            onCompleteSprint={jira.handleCompleteSprint}
            onNavigateView={(v) => nav.navigate(v)}
            onProjectUpdated={jira.handleProjectUpdated}
          />
        );
      case 'backlog':
        return (
          <BacklogView
            project={project}
            sprints={jira.sprints}
            issues={jira.issues}
            onSelectIssue={(issue) => nav.openIssue(issue.key)}
            onMoveIssueToSprint={jira.handleMoveIssueToSprint}
            onStartSprint={jira.handleStartSprint}
            onCompleteSprint={jira.handleCompleteSprint}
            onCreateSprint={jira.handleCreateSprint}
            onOpenCreateIssue={(sprintId) => jira.openCreateIssueModal('To Do', sprintId)}
            onRefresh={jira.refreshProjectData}
            onProjectUpdated={jira.handleProjectUpdated}
          />
        );
      case 'list':
        return (
          <ListView
            project={project}
            issues={jira.issues}
            users={jira.users}
            onSelectIssue={(issue) => nav.openIssue(issue.key)}
            onRefresh={jira.refreshProjectData}
            onOpenCreateIssue={() => jira.openCreateIssueModal()}
          />
        );
      case 'roadmap':
        return (
          <RoadmapTimelineView
            project={project}
            issues={jira.issues}
            onSelectIssue={(issue) => nav.openIssue(issue.key)}
            onOpenCreateIssue={() => jira.openCreateIssueModal()}
          />
        );
      case 'reports':
        return <ReportsView project={project} sprints={jira.sprints} />;
      case 'releases':
        return <ReleasesView project={project} />;
      case 'config':
        return <ConfigurationView project={project} onProjectUpdated={jira.handleProjectUpdated} />;
      default:
        return null;
    }
  };

  if (route.kind === 'redirect') return <Loading />;

  if (route.kind === 'not-found') {
    return (
      <EmptyState
        icon={<Icons.Compass className="w-6 h-6" />}
        title="We couldn't find that page"
        description="The link may be broken, or the page may have moved. Check the address or start again from For you."
        action={{ label: 'Go to For you', href: nav.hrefFor('for-you') }}
      />
    );
  }

  const view: ViewType = route.kind === 'browse' ? 'board' : route.view;

  // ---- Space views: shared header + view ----
  if (PROJECT_VIEWS.includes(view)) {
    if (!routeProject) {
      return (
        <EmptyState
          icon={<Icons.Folder className="w-6 h-6" />}
          title={`Space ${routeProjectKey} doesn't exist`}
          description="It may have been deleted or its key changed, or you may not have access to it."
          action={{ label: 'View all spaces', href: nav.hrefFor('spaces') }}
        />
      );
    }
    const ready = jira.selectedProject?.id === routeProject.id && jira.projectDataReady;
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <ProjectHeader project={routeProject} activeView={view} />
        <div className="flex-1 min-h-0 flex flex-col">{ready ? renderSpaceView(view, jira.selectedProject!) : <Loading />}</div>
      </div>
    );
  }

  // ---- Pages outside a space ----
  switch (view) {
    case 'for-you':
      return (
        <ForYouView
          currentProject={jira.selectedProject}
          projects={jira.projects}
          onSelectProject={nav.selectProject}
          onSelectIssue={(issue) => nav.openIssue(issue.key)}
          onOpenCreateIssue={() => jira.openCreateIssueModal()}
          setActiveView={(v) => nav.navigate(v)}
          currentUserName={currentUser.displayName}
        />
      );
    case 'spaces':
      return (
        <SpacesView
          projects={jira.projects}
          currentProject={jira.selectedProject}
          onSelectProject={nav.selectProject}
          onOpenCreateProject={jira.openCreateProjectModal}
          setActiveView={(v) => nav.navigate(v)}
          currentWorkspace={jira.selectedWorkspace}
          onProjectUpdated={jira.handleProjectUpdated}
        />
      );
    case 'workspace-settings':
      return jira.selectedWorkspace ? (
        <WorkspaceSettingsView
          currentWorkspace={jira.selectedWorkspace}
          onWorkspaceUpdated={(ws) => {
            jira.setSelectedWorkspace(ws);
            jira.refreshAll();
          }}
          onSelectProject={nav.selectProject}
          onNavigateView={(v) => nav.navigate(v)}
          onOpenCreateProject={jira.openCreateProjectModal}
          onProjectUpdated={jira.handleProjectUpdated}
        />
      ) : (
        <EmptyState
          icon={<Icons.Settings className="w-6 h-6" />}
          title="No workspace yet"
          description="Create a workspace from the workspace switcher in the top bar."
        />
      );
    case 'admin':
      return isAdmin ? (
        <AdminConsoleView
          section={route.kind === 'view' ? route.adminSection : undefined}
          onSectionChange={nav.showAdminSection}
          onNavigateView={(v) => nav.navigate(v)}
        />
      ) : (
        <EmptyState
          icon={<Icons.Lock className="w-6 h-6" />}
          title="You don't have access to Administration"
          description="Ask a Jira administrator if you need to manage users, passwords or email settings."
          action={{ label: 'Go to For you', href: nav.hrefFor('for-you') }}
        />
      );
  }

  // Search, People and Import & export work on the most recently opened space
  if (!jira.selectedProject) {
    return (
      <EmptyState
        icon={<Icons.Folder className="w-6 h-6" />}
        title="Open a space first"
        description="This page works on a space. Create one or open an existing space to continue."
        action={{ label: 'View all spaces', href: nav.hrefFor('spaces') }}
      />
    );
  }

  switch (view) {
    case 'search':
      return (
        <JqlSearchView
          currentProject={jira.selectedProject}
          onSelectIssue={(issue) => nav.openIssue(issue.key)}
          onOpenCreateModal={() => jira.openCreateIssueModal()}
          initialJql={searchParams.get('jql')}
          initialFilterId={Number(searchParams.get('filter')) || null}
          onQueryRun={(jql) => {
            // Keep the query in the address bar like Jira's issue navigator (no new history entry per search)
            if (searchParams.get('jql') === jql && !searchParams.get('filter')) return;
            const params = new URLSearchParams(searchParams.toString());
            params.delete('filter');
            params.set('jql', jql);
            router.replace(`/issues?${params.toString()}`, { scroll: false });
          }}
        />
      );
    case 'users':
      return <UserRoleManagementView currentProject={jira.selectedProject} />;
    case 'import-export':
      return (
        <JiraImportExportView
          projects={jira.projects}
          currentProject={jira.selectedProject}
          onDataImported={jira.refreshProjectData}
        />
      );
    default:
      return <Loading />;
  }

};

export default RouteView;
