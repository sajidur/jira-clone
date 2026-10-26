import {
  Project,
  Issue,
  Sprint,
  AppUser,
  JiraImportResult,
  ProjectVersion,
  WorkflowStatus,
  CustomFieldDefinition,
  WorkflowTransition,
  WorkflowRule,
  SavedFilter,
  ProjectComponent,
  ProjectIssueType,
  ProjectPriority,
  ProjectResolution,
  ProjectWebhook,
  ProjectMember,
  ProjectPermission,
  PermissionDefinition,
  UserGroup,
  ProjectTeam,
  AppAccessSetting,
  Workspace,
  WorkspaceMember,
  WorkspaceAuditLog,
  JqlSearchResult,
  BurndownData,
  VelocityItem,
  WorkloadItem,
  ProjectSummaryReport,
  IssueLinkItem,
  ChildIssueItem,
  UserNotification,
  NotificationsResponse,
  AdminUser,
  AdminSession,
  AdminOverview,
  SmtpSettings,
  SmtpSettingsInput
} from '@/types/jira';
import { API_BASE, authFetch, withAccessToken } from './auth';


export async function fetchProjects(workspaceId?: number): Promise<Project[]> {
  const url = workspaceId
    ? `${API_BASE}/api/projects?workspaceId=${workspaceId}`
    : `${API_BASE}/api/projects`;
  const res = await authFetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function fetchProject(id: number): Promise<Project> {
  const res = await authFetch(`${API_BASE}/api/projects/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  const res = await authFetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  const res = await authFetch(`${API_BASE}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

export async function deleteProject(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/projects/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete project');
}

export interface FetchIssuesOptions {
  projectId?: number;
  sprintId?: number | null;
  sprint?: string;
  status?: string;
  type?: string;
  priority?: string;
  assignee?: string;
  search?: string;
}

export async function fetchIssues(
  optionsOrProjectId?: number | FetchIssuesOptions,
  sprintId?: number | null
): Promise<Issue[]> {
  const params = new URLSearchParams();

  if (typeof optionsOrProjectId === 'object' && optionsOrProjectId !== null) {
    if (optionsOrProjectId.projectId) params.set('projectId', optionsOrProjectId.projectId.toString());
    if (optionsOrProjectId.sprintId !== undefined && optionsOrProjectId.sprintId !== null) {
      params.set('sprintId', optionsOrProjectId.sprintId.toString());
    }
    if (optionsOrProjectId.sprint) params.set('sprint', optionsOrProjectId.sprint);
    if (optionsOrProjectId.status) params.set('status', optionsOrProjectId.status);
    if (optionsOrProjectId.type) params.set('type', optionsOrProjectId.type);
    if (optionsOrProjectId.priority) params.set('priority', optionsOrProjectId.priority);
    if (optionsOrProjectId.assignee) params.set('assignee', optionsOrProjectId.assignee);
    if (optionsOrProjectId.search) params.set('search', optionsOrProjectId.search);
  } else if (typeof optionsOrProjectId === 'number') {
    params.set('projectId', optionsOrProjectId.toString());
    if (sprintId !== undefined && sprintId !== null) {
      params.set('sprintId', sprintId.toString());
    }
  }

  const query = params.toString();
  const res = await authFetch(`${API_BASE}/api/issues${query ? `?${query}` : ''}`, { cache: 'no-store' });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('Failed to fetch issues:', res.status, errText);
    throw new Error(`Failed to fetch issues (${res.status}): ${errText || res.statusText}`);
  }
  return res.json();
}

export async function fetchIssue(idOrKey: string | number): Promise<Issue> {
  const res = await authFetch(`${API_BASE}/api/issues/${idOrKey}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch issue');
  return res.json();
}

export async function createIssue(issue: Partial<Issue>): Promise<Issue> {
  const res = await authFetch(`${API_BASE}/api/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(issue)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create issue');
  }
  return res.json();
}

export async function updateIssue(id: number, issue: Partial<Issue>): Promise<Issue> {
  const res = await authFetch(`${API_BASE}/api/issues/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(issue)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update issue');
  }
  return res.json();
}

export async function moveIssue(
  id: number,
  move: { status?: string; sprintId?: number | null; order?: number }
): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/issues/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    // The API uses sprintId 0 for "move to backlog"
    body: JSON.stringify({ ...move, sprintId: move.sprintId === null ? 0 : move.sprintId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to move issue');
  }
}

export async function deleteIssue(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/issues/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete issue');
}

export async function fetchSprints(projectId: number): Promise<Sprint[]> {
  const res = await authFetch(`${API_BASE}/api/sprints/project/${projectId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch sprints');
  return res.json();
}

export async function createSprint(sprint: Partial<Sprint>): Promise<Sprint> {
  const res = await authFetch(`${API_BASE}/api/sprints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sprint)
  });
  if (!res.ok) throw new Error('Failed to create sprint');
  return res.json();
}

export async function startSprint(id: number, startDate?: string, endDate?: string): Promise<Sprint> {
  const res = await authFetch(`${API_BASE}/api/sprints/${id}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate })
  });
  if (!res.ok) throw new Error('Failed to start sprint');
  return res.json();
}

export async function completeSprint(id: number, moveToSprintId?: number | null): Promise<Sprint> {
  const url = `${API_BASE}/api/sprints/${id}/complete${moveToSprintId ? `?moveToSprintId=${moveToSprintId}` : ''}`;
  const res = await authFetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to complete sprint');
  return res.json();
}

export async function updateSprint(id: number, data: Partial<Sprint>): Promise<Sprint> {
  const res = await authFetch(`${API_BASE}/api/sprints/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update sprint');
  return res.json();
}

export async function deleteSprint(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/sprints/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete sprint');
}

export async function fetchUsers(): Promise<AppUser[]> {
  const res = await authFetch(`${API_BASE}/api/users`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createUser(data: Partial<AppUser>): Promise<AppUser> {
  const res = await authFetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create user');
  return res.json();
}

export async function updateUser(id: number, data: Partial<AppUser>): Promise<AppUser> {
  const res = await authFetch(`${API_BASE}/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update user');
  return res.json();
}

export async function deleteUser(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to deactivate user');
}

export async function fetchRoles(): Promise<{ name: string; description: string }[]> {
  const res = await authFetch(`${API_BASE}/api/users/roles`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProjectMembers(projectId: number): Promise<ProjectMember[]> {
  const res = await authFetch(`${API_BASE}/api/users/project-members/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function addProjectMember(data: { projectId: number; userId: number; role: string }): Promise<ProjectMember> {
  const res = await authFetch(`${API_BASE}/api/users/project-members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to add project member');
  return res.json();
}

export async function removeProjectMember(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/users/project-members/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove project member');
}

export async function fetchProjectPermissions(projectId: number): Promise<{ definitions: PermissionDefinition[]; matrix: ProjectPermission[] }> {
  const res = await authFetch(`${API_BASE}/api/users/permissions/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return { definitions: [], matrix: [] };
  return res.json();
}

export async function toggleProjectPermission(data: { projectId: number; permissionKey: string; role: string; isAllowed: boolean }): Promise<ProjectPermission> {
  const res = await authFetch(`${API_BASE}/api/users/permissions/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to toggle permission');
  return res.json();
}

// User Groups
export async function fetchGroups(): Promise<UserGroup[]> {
  const res = await authFetch(`${API_BASE}/api/users/groups`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createGroup(data: { name: string; description: string; isDefault: boolean }): Promise<UserGroup> {
  const res = await authFetch(`${API_BASE}/api/users/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create group');
  }
  return res.json();
}

export async function deleteGroup(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/users/groups/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete group');
}

// Project Teams
export async function fetchTeams(projectId: number): Promise<ProjectTeam[]> {
  const res = await authFetch(`${API_BASE}/api/users/teams/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createTeam(data: {
  projectId: number;
  name: string;
  description?: string;
  leadName?: string;
  leadEmail?: string;
  members?: string[];
}): Promise<ProjectTeam> {
  const res = await authFetch(`${API_BASE}/api/users/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create team');
  }
  return res.json();
}

export async function deleteTeam(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/users/teams/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete team');
}

// App Access & Licensing
export async function fetchAppAccess(): Promise<AppAccessSetting[]> {
  const res = await authFetch(`${API_BASE}/api/users/app-access`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function toggleAppAccess(id: number): Promise<AppAccessSetting> {
  const res = await authFetch(`${API_BASE}/api/users/app-access/toggle/${id}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle app access');
  return res.json();
}

export async function updateAppAccess(id: number, data: { licensedSeats?: number; defaultGroup?: string }): Promise<AppAccessSetting> {
  const res = await authFetch(`${API_BASE}/api/users/app-access/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update app access');
  return res.json();
}

export async function fetchComments(issueId: number) {
  const res = await authFetch(`${API_BASE}/api/issues/${issueId}/comments`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function addComment(issueId: number, body: string, authorName = 'Sajidur Rahman', authorEmail = 'sajidur@akij.net') {
  const res = await authFetch(`${API_BASE}/api/issues/${issueId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, authorName, authorEmail })
  });
  if (!res.ok) throw new Error('Failed to add comment');
  return res.json();
}

export async function fetchWorklogs(issueId: number) {
  const res = await authFetch(`${API_BASE}/api/issues/${issueId}/worklogs`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export interface LogWorkOptions {
  timeSpentMinutes: number;
  comment?: string;
  authorName?: string;
  startedAt?: string;
  remainingEstimateMinutes?: number;
}

export async function addWorklog(
  issueId: number,
  timeSpentOrOptions: number | LogWorkOptions,
  comment?: string,
  authorName = 'Sajidur Rahman'
): Promise<Worklog> {
  let body: any;
  if (typeof timeSpentOrOptions === 'object') {
    body = {
      timeSpentMinutes: timeSpentOrOptions.timeSpentMinutes,
      comment: timeSpentOrOptions.comment,
      authorName: timeSpentOrOptions.authorName || 'Sajidur Rahman',
      startedAt: timeSpentOrOptions.startedAt,
      remainingEstimateMinutes: timeSpentOrOptions.remainingEstimateMinutes
    };
  } else {
    body = {
      timeSpentMinutes: timeSpentOrOptions,
      comment,
      authorName
    };
  }

  const res = await authFetch(`${API_BASE}/api/issues/${issueId}/worklogs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Failed to log work');
  return res.json();
}

export const logWork = addWorklog;

// Formats minutes (e.g. 150) into Jira style "2h 30m", "1d 2h" (where 1d = 8h working day)
export function formatMinutesToJiraTime(mins: number): string {
  if (!mins || mins <= 0) return '0m';
  const days = Math.floor(mins / 480);
  const hours = Math.floor((mins % 480) / 60);
  const remainingMins = mins % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (remainingMins > 0) parts.push(`${remainingMins}m`);

  return parts.length > 0 ? parts.join(' ') : '0m';
}

// Parses string like "2d 4h 30m", "3h", "45m", "120" into total minutes
export function parseJiraTimeToMinutes(input: string): number {
  if (!input) return 0;
  const clean = input.trim().toLowerCase();
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);

  let totalMins = 0;
  const dayMatch = clean.match(/(\d+(?:\.\d+)?)\s*d/);
  const hourMatch = clean.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = clean.match(/(\d+(?:\.\d+)?)\s*m/);

  if (dayMatch) totalMins += Math.round(parseFloat(dayMatch[1]) * 480);
  if (hourMatch) totalMins += Math.round(parseFloat(hourMatch[1]) * 60);
  if (minMatch) totalMins += Math.round(parseFloat(minMatch[1]));

  return totalMins > 0 ? totalMins : 0;
}

export async function fetchActivityLogs(issueId: number) {
  const res = await authFetch(`${API_BASE}/api/issues/${issueId}/activities`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchBurndown(sprintId: number): Promise<BurndownData> {
  const res = await authFetch(`${API_BASE}/api/reports/burndown/${sprintId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch burndown data');
  return res.json();
}

export async function fetchVelocity(projectId: number): Promise<VelocityItem[]> {
  const res = await authFetch(`${API_BASE}/api/reports/velocity/${projectId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch velocity data');
  return res.json();
}

export async function fetchWorkload(projectId: number): Promise<WorkloadItem[]> {
  const res = await authFetch(`${API_BASE}/api/reports/workload/${projectId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch workload data');
  return res.json();
}

export async function fetchProjectSummary(projectId: number): Promise<ProjectSummaryReport> {
  const res = await authFetch(`${API_BASE}/api/reports/summary/${projectId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch summary data');
  return res.json();
}

export async function fetchTimeTracking(projectId: number): Promise<any[]> {
  const res = await authFetch(`${API_BASE}/api/reports/timetracking/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchVersions(projectId: number): Promise<ProjectVersion[]> {
  const res = await authFetch(`${API_BASE}/api/releases/project/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createVersion(data: { projectId: number; name: string; description?: string }): Promise<ProjectVersion> {
  const res = await authFetch(`${API_BASE}/api/releases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create version');
  return res.json();
}

export async function releaseVersion(id: number): Promise<ProjectVersion> {
  const res = await authFetch(`${API_BASE}/api/releases/${id}/release`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to release version');
  return res.json();
}

// Workflow Statuses
export async function fetchWorkflowStatuses(projectId: number): Promise<WorkflowStatus[]> {
  const res = await authFetch(`${API_BASE}/api/configuration/statuses/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createWorkflowStatus(data: { projectId: number; name: string; category: string; color: string; wipLimit?: number }): Promise<WorkflowStatus> {
  const res = await authFetch(`${API_BASE}/api/configuration/statuses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create workflow status');
  return res.json();
}

export async function updateWorkflowStatus(id: number, data: { projectId: number; name: string; category: string; color: string; wipLimit?: number }): Promise<WorkflowStatus> {
  const res = await authFetch(`${API_BASE}/api/configuration/statuses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}

export async function deleteWorkflowStatus(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/configuration/statuses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete status');
}

export async function reorderWorkflowStatuses(projectId: number, statusIdsInOrder: number[]): Promise<WorkflowStatus[]> {
  const res = await authFetch(`${API_BASE}/api/configuration/statuses/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, statusIdsInOrder })
  });
  if (!res.ok) throw new Error('Failed to reorder statuses');
  return res.json();
}

// Custom Fields
export async function fetchCustomFields(projectId: number): Promise<CustomFieldDefinition[]> {
  const res = await authFetch(`${API_BASE}/api/configuration/custom-fields/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createCustomField(data: {
  projectId: number;
  fieldKey: string;
  name: string;
  fieldType: string;
  options?: string[];
  isRequired: boolean;
  showInListView: boolean;
}): Promise<CustomFieldDefinition> {
  const res = await authFetch(`${API_BASE}/api/configuration/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create custom field');
  return res.json();
}

export async function deleteCustomField(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/configuration/custom-fields/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete custom field');
}

// Transitions
export async function fetchWorkflowTransitions(projectId: number): Promise<WorkflowTransition[]> {
  const res = await authFetch(`${API_BASE}/api/configuration/transitions/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createWorkflowTransition(data: {
  projectId: number;
  fromStatus: string;
  toStatus: string;
  name: string;
  description?: string;
  requiredRole?: string;
  autoResolution?: string;
  autoAssignee?: string;
}): Promise<WorkflowTransition> {
  const res = await authFetch(`${API_BASE}/api/configuration/transitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create transition');
  return res.json();
}

export async function updateWorkflowTransition(id: number, data: {
  projectId: number;
  fromStatus: string;
  toStatus: string;
  name: string;
  description?: string;
  requiredRole?: string;
  autoResolution?: string;
  autoAssignee?: string;
}): Promise<WorkflowTransition> {
  const res = await authFetch(`${API_BASE}/api/configuration/transitions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update transition');
  return res.json();
}

export async function applyWorkflowTemplate(projectId: number, template: 'scrum' | 'kanban' | 'enterprise_qa'): Promise<{ statuses: WorkflowStatus[]; transitions: WorkflowTransition[] }> {
  const res = await authFetch(`${API_BASE}/api/configuration/workflow-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, template })
  });
  if (!res.ok) throw new Error('Failed to apply workflow template');
  return res.json();
}

export async function deleteWorkflowTransition(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/configuration/transitions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete transition');
}

export async function toggleWorkflowTransition(data: {
  projectId: number;
  fromStatus: string;
  toStatus: string;
  allowed: boolean;
}): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/configuration/transitions/toggle-matrix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to toggle transition');
}

export const fetchTransitions = fetchWorkflowTransitions;
export const createTransition = createWorkflowTransition;
export const updateTransition = updateWorkflowTransition;
export const deleteTransition = deleteWorkflowTransition;
export const toggleTransitionMatrix = toggleWorkflowTransition;

// Workflow Rules (Automations)
export async function fetchWorkflowRules(projectId: number): Promise<WorkflowRule[]> {
  const res = await authFetch(`${API_BASE}/api/configuration/rules/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createWorkflowRule(data: {
  projectId: number;
  name: string;
  triggerEvent: string;
  conditionStatus?: string;
  actionType: string;
  actionValue: string;
}): Promise<WorkflowRule> {
  const res = await authFetch(`${API_BASE}/api/configuration/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create workflow rule');
  return res.json();
}

export async function toggleWorkflowRule(id: number): Promise<WorkflowRule> {
  const res = await authFetch(`${API_BASE}/api/configuration/rules/${id}/toggle`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to toggle workflow rule');
  return res.json();
}

export async function deleteWorkflowRule(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/configuration/rules/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete workflow rule');
}

// Jira Import & Export
export function getJiraExportJsonUrl(projectId?: number): string {
  return withAccessToken(`${API_BASE}/api/jiraexportimport/export/json${projectId ? `?projectId=${projectId}` : ''}`);
}

export function getJiraExportCsvUrl(projectId?: number): string {
  return withAccessToken(`${API_BASE}/api/jiraexportimport/export/csv${projectId ? `?projectId=${projectId}` : ''}`);
}

export function getSampleJiraJsonUrl(): string {
  return withAccessToken(`${API_BASE}/api/jiraexportimport/sample/json`);
}

export function getSampleJiraCsvUrl(): string {
  return withAccessToken(`${API_BASE}/api/jiraexportimport/sample/csv`);
}

export async function importJiraJson(file: File, targetProjectId?: number): Promise<JiraImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${API_BASE}/api/jiraexportimport/import/json${targetProjectId ? `?targetProjectId=${targetProjectId}` : ''}`;
  const res = await authFetch(url, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function importJiraCsv(file: File, targetProjectId: number): Promise<JiraImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${API_BASE}/api/jiraexportimport/import/csv?targetProjectId=${targetProjectId}`;
  const res = await authFetch(url, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// JQL & SAVED FILTERS APIS
// ---------------------------------------------------------------------------

export async function searchJql(
  jql?: string,
  projectId?: number,
  startAt: number = 0,
  maxResults: number = 50
): Promise<JqlSearchResult> {
  const res = await authFetch(`${API_BASE}/api/jql/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jql, projectId, startAt, maxResults })
  });
  if (!res.ok) throw new Error('Failed to execute JQL search');
  return res.json();
}

export async function fetchSavedFilters(): Promise<SavedFilter[]> {
  const res = await authFetch(`${API_BASE}/api/jql/saved-filters`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createSavedFilter(data: {
  name: string;
  jql: string;
  description?: string;
  ownerName?: string;
  isFavorite?: boolean;
}): Promise<SavedFilter> {
  const res = await authFetch(`${API_BASE}/api/jql/saved-filters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create saved filter');
  return res.json();
}

export async function deleteSavedFilter(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/jql/saved-filters/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete saved filter');
}

export async function fetchJqlAutocomplete(): Promise<{
  fields: { name: string; type: string; example: string }[];
  operators: string[];
  keywords: string[];
}> {
  const res = await authFetch(`${API_BASE}/api/jql/autocomplete`, { cache: 'no-store' });
  if (!res.ok) return { fields: [], operators: [], keywords: [] };
  return res.json();
}

// ---------------------------------------------------------------------------
// CONFIGURATION EXTENSIONS (Components, Issue Types, Priorities, Webhooks)
// ---------------------------------------------------------------------------

export async function fetchComponents(projectId: number): Promise<ProjectComponent[]> {
  const res = await authFetch(`${API_BASE}/api/configuration/components/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createComponent(data: Partial<ProjectComponent>): Promise<ProjectComponent> {
  const res = await authFetch(`${API_BASE}/api/configuration/components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create component');
  return res.json();
}

export async function deleteComponent(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/configuration/components/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete component');
}

export async function fetchIssueTypes(projectId: number): Promise<ProjectIssueType[]> {
  const res = await authFetch(`${API_BASE}/api/configuration/issue-types/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createIssueType(data: Partial<ProjectIssueType>): Promise<ProjectIssueType> {
  const res = await authFetch(`${API_BASE}/api/configuration/issue-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create issue type');
  return res.json();
}

export async function deleteIssueType(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/configuration/issue-types/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete issue type');
}

export async function fetchPriorities(projectId: number): Promise<ProjectPriority[]> {
  const res = await authFetch(`${API_BASE}/api/configuration/priorities/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createPriority(data: Partial<ProjectPriority>): Promise<ProjectPriority> {
  const res = await authFetch(`${API_BASE}/api/configuration/priorities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create priority');
  return res.json();
}

export async function deletePriority(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/configuration/priorities/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete priority');
}

export async function fetchResolutions(projectId: number): Promise<ProjectResolution[]> {
  const res = await authFetch(`${API_BASE}/api/configuration/resolutions/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createResolution(data: Partial<ProjectResolution>): Promise<ProjectResolution> {
  const res = await authFetch(`${API_BASE}/api/configuration/resolutions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create resolution');
  return res.json();
}

export async function deleteResolution(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/configuration/resolutions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete resolution');
}

export async function fetchWebhooks(projectId: number): Promise<ProjectWebhook[]> {
  const res = await authFetch(`${API_BASE}/api/configuration/webhooks/${projectId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createWebhook(data: Partial<ProjectWebhook>): Promise<ProjectWebhook> {
  const res = await authFetch(`${API_BASE}/api/configuration/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create webhook');
  return res.json();
}

export async function deleteWebhook(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/configuration/webhooks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete webhook');
}

// ---------------------------------------------------------------------------
// WORKSPACES & WORKSPACE CONFIGURATIONS
// ---------------------------------------------------------------------------

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const res = await authFetch(`${API_BASE}/api/workspaces`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchWorkspace(id: number): Promise<Workspace> {
  const res = await authFetch(`${API_BASE}/api/workspaces/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch workspace');
  return res.json();
}

export async function createWorkspace(data: {
  name: string;
  slug?: string;
  description?: string;
  domain?: string;
  planTier?: string;
}): Promise<Workspace> {
  const res = await authFetch(`${API_BASE}/api/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create workspace');
  }
  return res.json();
}

export async function updateWorkspaceGeneral(id: number, data: Partial<Workspace>): Promise<Workspace> {
  const res = await authFetch(`${API_BASE}/api/workspaces/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update workspace');
  return res.json();
}

export async function updateWorkspaceSecurity(id: number, data: {
  requireTwoFactor: boolean;
  enforceSso: boolean;
  allowedDomainRestrictions?: string;
  sessionTimeoutMinutes: number;
  ipAllowlist?: string;
}): Promise<Workspace> {
  const res = await authFetch(`${API_BASE}/api/workspaces/${id}/security`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update workspace security');
  return res.json();
}

export async function updateWorkspaceFeatures(id: number, data: {
  enableSprints: boolean;
  enableRoadmaps: boolean;
  enableTimeTracking: boolean;
  enableJqlAdvancedSearch: boolean;
  enableAutomations: boolean;
  enableExternalSharing: boolean;
  enableAiAssistance: boolean;
}): Promise<Workspace> {
  const res = await authFetch(`${API_BASE}/api/workspaces/${id}/features`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update workspace features');
  return res.json();
}

export async function fetchWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]> {
  const res = await authFetch(`${API_BASE}/api/workspaces/${workspaceId}/members`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function addWorkspaceMember(workspaceId: number, data: { userId: number; role?: string }): Promise<WorkspaceMember> {
  const res = await authFetch(`${API_BASE}/api/workspaces/${workspaceId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to add workspace member');
  }
  return res.json();
}

export async function removeWorkspaceMember(workspaceId: number, memberId: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove workspace member');
}

export async function fetchWorkspaceAuditLogs(workspaceId: number): Promise<WorkspaceAuditLog[]> {
  const res = await authFetch(`${API_BASE}/api/workspaces/${workspaceId}/audit-logs`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

// -------------------------------------------------------------
// CHILD ISSUES, SUBTASKS & ISSUE LINKS
// -------------------------------------------------------------
export async function fetchChildIssues(idOrKey: string | number): Promise<ChildIssueItem[]> {
  const res = await authFetch(`${API_BASE}/api/issues/${idOrKey}/children`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createChildIssue(
  parentKey: string,
  data: {
    summary: string;
    issueType?: string;
    priority?: string;
    assigneeName?: string;
    assigneeEmail?: string;
    storyPoints?: number;
    sprintId?: number;
  }
): Promise<Issue> {
  const res = await authFetch(`${API_BASE}/api/issues/${parentKey}/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create child issue');
  }
  return res.json();
}

export async function setParentIssue(idOrKey: string | number, parentKey: string | null): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/issues/${idOrKey}/parent`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentIssueKey: parentKey })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update parent issue');
  }
}

export async function fetchIssueLinks(idOrKey: string | number): Promise<IssueLinkItem[]> {
  const res = await authFetch(`${API_BASE}/api/issues/${idOrKey}/links`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function createIssueLink(
  sourceKey: string,
  data: { targetIssueKey: string; relationship: string }
): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/issues/${sourceKey}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to link issues');
  }
}

export async function deleteIssueLink(linkId: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/issues/links/${linkId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete issue link');
}

export async function fetchNotifications(
  userName: string = 'Sajidur Rahman',
  category?: string,
  unreadOnly?: boolean
): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (userName) params.append('userName', userName);
  if (category && category !== 'all') params.append('category', category);
  if (unreadOnly) params.append('unreadOnly', 'true');

  const res = await authFetch(`${API_BASE}/api/notifications?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    return { notifications: [], totalCount: 0, unreadCount: 0, directCount: 0, watchingCount: 0 };
  }
  return res.json();
}

export async function markNotificationAsRead(id: number): Promise<UserNotification> {
  const res = await authFetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  return res.json();
}

export async function markAllNotificationsAsRead(userName: string = 'Sajidur Rahman'): Promise<{ success: boolean; updatedCount: number }> {
  const res = await authFetch(`${API_BASE}/api/notifications/read-all?userName=${encodeURIComponent(userName)}`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
  return res.json();
}

export async function deleteNotification(id: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/notifications/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete notification');
}

export async function clearAllNotifications(userName: string = 'Sajidur Rahman'): Promise<{ success: boolean; removedCount: number }> {
  const res = await authFetch(`${API_BASE}/api/notifications/clear-all?userName=${encodeURIComponent(userName)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear notifications');
  return res.json();
}

// Administration (requires the Administrator role)
async function adminRequest<T>(path: string, init: RequestInit = {}, fallbackError = 'Request failed'): Promise<T> {
  const res = await authFetch(`${API_BASE}/api/admin${path}`, {
    cache: 'no-store',
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || (res.status === 403 ? 'You need administrator access to do this.' : fallbackError));
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export function fetchAdminOverview(): Promise<AdminOverview> {
  return adminRequest('/overview', {}, 'Failed to load admin overview');
}

export function fetchAdminUsers(): Promise<AdminUser[]> {
  return adminRequest('/users', {}, 'Failed to load users');
}

export function adminCreateUser(data: {
  name?: string;
  displayName: string;
  emailAddress: string;
  role: string;
  department?: string;
  jobTitle?: string;
  password: string;
}): Promise<AdminUser> {
  return adminRequest('/users', { method: 'POST', body: JSON.stringify(data) }, 'Failed to create user');
}

export function adminUpdateUser(
  id: number,
  data: Partial<Pick<AdminUser, 'name' | 'displayName' | 'emailAddress' | 'role' | 'department' | 'jobTitle' | 'active'>>
): Promise<AdminUser> {
  return adminRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }, 'Failed to update user');
}

export function adminSetPassword(id: number, password: string): Promise<AdminUser> {
  return adminRequest(`/users/${id}/password`, { method: 'POST', body: JSON.stringify({ password }) }, 'Failed to set password');
}

export function adminSignOutUser(id: number): Promise<void> {
  return adminRequest(`/users/${id}/sign-out`, { method: 'POST' }, 'Failed to sign out user');
}

export function fetchAdminSessions(): Promise<AdminSession[]> {
  return adminRequest('/sessions', {}, 'Failed to load sessions');
}

export function adminRevokeSession(id: number): Promise<void> {
  return adminRequest(`/sessions/${id}`, { method: 'DELETE' }, 'Failed to revoke session');
}

export function adminSendPasswordEmail(id: number, purpose: 'reset' | 'invite'): Promise<{ message: string }> {
  return adminRequest(
    `/users/${id}/password-email`,
    { method: 'POST', body: JSON.stringify({ purpose }) },
    'Failed to send email'
  );
}

export function fetchSmtpSettings(): Promise<SmtpSettings> {
  return adminRequest('/smtp', {}, 'Failed to load email settings');
}

export function saveSmtpSettings(data: SmtpSettingsInput): Promise<SmtpSettings> {
  return adminRequest('/smtp', { method: 'PUT', body: JSON.stringify(data) }, 'Failed to save email settings');
}

/** Sends a test email using the given (possibly unsaved) settings. */
export function sendSmtpTestEmail(data: SmtpSettingsInput & { to: string }): Promise<{ message: string }> {
  return adminRequest('/smtp/test', { method: 'POST', body: JSON.stringify(data) }, 'Failed to send test email');
}
