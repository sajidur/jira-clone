export interface Project {
  id: number;
  key: string;
  name: string;
  description?: string;
  projectTypeKey?: string;
  avatarUrl?: string;
  leadName?: string;
  leadEmail?: string;
  workspaceId?: number;
  issueCount?: number;
  activeSprintCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: number;
  projectId: number;
  name: string;
  goal?: string;
  state: 'future' | 'active' | 'closed' | string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  createdAt: string;
  totalIssues?: number;
  completedIssues?: number;
  totalStoryPoints?: number;
  completedStoryPoints?: number;
}

export interface IssueComment {
  id: number;
  issueId: number;
  authorId?: string;
  authorName: string;
  authorEmail?: string;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Worklog {
  id: number;
  issueId: number;
  authorName: string;
  timeSpentMinutes: number;
  startedAt: string;
  comment?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  issueId: number;
  authorName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface Issue {
  id: number;
  key: string;
  issueNumber: number;
  projectId: number;
  projectKey?: string;
  projectName?: string;
  issueType: 'Epic' | 'Story' | 'Task' | 'Bug' | 'Subtask' | string;
  summary: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done' | string;
  priority: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' | string;
  resolution?: string;
  resolvedAt?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  assigneeAvatarUrl?: string;
  reporterId?: string;
  reporterName?: string;
  reporterEmail?: string;
  storyPoints?: number;
  originalEstimateMinutes?: number;
  remainingEstimateMinutes?: number;
  timeSpentMinutes?: number;
  sprintId?: number | null;
  sprintName?: string;
  sprintState?: string;
  epicKey?: string;
  parentIssueKey?: string;
  labels: string[];
  components: string[];
  fixVersion?: string;
  blockedBy?: string;
  startDate?: string;
  dueDate?: string;
  customFieldsJson?: string;
  commentCount?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  comments?: IssueComment[];
  worklogs?: Worklog[];
  activities?: ActivityLog[];
}

export interface AppUser {
  id: number;
  accountId: string;
  name: string;
  displayName: string;
  emailAddress: string;
  avatarUrl?: string;
  active: boolean;
  role?: string;
  userType?: 'Internal' | 'External' | 'Contractor' | string;
  department?: string;
  jobTitle?: string;
  groupsJson?: string;
  appAccessJson?: string;
  createdAt?: string;
  lastLoginAt?: string | null;
  hasPassword?: boolean;
}

export interface AdminUser extends AppUser {
  hasPassword: boolean;
  activeSessions: number;
}

export interface AdminSession {
  id: number;
  userId: number;
  displayName: string;
  emailAddress: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  isCurrent: boolean;
}

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  deactivatedUsers: number;
  administrators: number;
  usersWithoutPassword: number;
  activeSessions: number;
  recentLogins: Pick<AppUser, 'id' | 'displayName' | 'emailAddress' | 'avatarUrl' | 'role' | 'lastLoginAt'>[];
}

export interface UserGroup {
  id: number;
  name: string;
  description: string;
  isDefault: boolean;
  userCount: number;
  createdAt: string;
}

export interface ProjectTeam {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  leadName?: string;
  leadEmail?: string;
  membersJson?: string;
  createdAt: string;
}

export interface AppAccessSetting {
  id: number;
  appKey: string;
  appName: string;
  description: string;
  isEnabled: boolean;
  defaultGroup: string;
  licensedSeats: number;
  assignedSeats: number;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  joinedAt: string;
  user?: AppUser;
}

export interface ProjectPermission {
  id: number;
  projectId: number;
  permissionKey: string;
  role: string;
  isAllowed: boolean;
}

export interface PermissionDefinition {
  key: string;
  name: string;
  category: string;
  description: string;
}

export interface JiraImportResult {
  success: boolean;
  totalRead: number;
  issuesImported: number;
  sprintsCreated: number;
  importedKeys: string[];
  warnings: string[];
  message: string;
}

export interface ProjectVersion {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  isReleased: boolean;
  isArchived: boolean;
  createdAt: string;
  totalIssues?: number;
  completedIssues?: number;
}

export interface WorkflowStatus {
  id: number;
  projectId: number;
  name: string;
  category: string;
  color: string;
  order: number;
  wipLimit?: number | null;
}

export interface BurndownDay {
  dayNumber: number;
  date: string;
  dayLabel: string;
  idealPoints: number;
  actualPoints?: number | null;
}

export interface BurndownData {
  id: number;
  name: string;
  state: string;
  totalPoints: number;
  startDate: string;
  endDate: string;
  days: BurndownDay[];
}

export interface VelocityItem {
  sprintId: number;
  sprintName: string;
  state: string;
  committedPoints: number;
  completedPoints: number;
  totalIssues: number;
  completedIssues: number;
}

export interface WorkloadItem {
  assignee: string;
  totalIssues: number;
  inProgressCount: number;
  inReviewCount: number;
  doneCount: number;
  todoCount: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  loggedHours: number;
}

export interface ProjectSummaryReport {
  totalIssues: number;
  doneIssues: number;
  inProgressIssues: number;
  inReviewIssues: number;
  todoIssues: number;
  completionPercentage: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  totalEstimatedHours: number;
  totalLoggedHours: number;
  priorityCounts: { priority: string; count: number }[];
  typeCounts: { type: string; count: number }[];
}

export interface CustomFieldDefinition {
  id: number;
  projectId: number;
  fieldKey: string;
  name: string;
  fieldType: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url' | string;
  optionsJson?: string | null;
  isRequired: boolean;
  showInListView: boolean;
  order: number;
}

export interface WorkflowTransition {
  id: number;
  projectId: number;
  fromStatus: string;
  toStatus: string;
  name: string;
  description?: string;
  requiredRole?: string;
  autoResolution?: string;
  autoAssignee?: string;
}

export interface WorkflowRule {
  id: number;
  projectId: number;
  name: string;
  triggerEvent: string;
  conditionStatus?: string;
  actionType: 'SetResolution' | 'AutoAssign' | 'AddComment' | string;
  actionValue: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface SavedFilter {
  id: number;
  name: string;
  jql: string;
  description?: string;
  ownerName: string;
  isFavorite: boolean;
  createdAt: string;
}

export interface ProjectComponent {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  leadName?: string;
  defaultAssignee?: string;
}

export interface ProjectIssueType {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  icon: string;
  isSubtask: boolean;
  order: number;
}

export interface ProjectPriority {
  id: number;
  projectId: number;
  name: string;
  color: string;
  description?: string;
  order: number;
}

export interface ProjectResolution {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  order: number;
}

export interface ProjectWebhook {
  id: number;
  projectId: number;
  name: string;
  url: string;
  eventsJson: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface JqlSearchResult {
  jql: string;
  total: number;
  parsedClauses: string[];
  errorMessage?: string;
  issues: Issue[];
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  domain: string;
  planTier: 'Free' | 'Standard' | 'Premium' | 'Enterprise' | string;
  timezone: string;
  dateFormat: string;
  defaultLanguage: string;
  requireTwoFactor: boolean;
  enforceSso: boolean;
  allowedDomainRestrictions?: string;
  sessionTimeoutMinutes: number;
  ipAllowlist?: string;
  enableSprints: boolean;
  enableRoadmaps: boolean;
  enableTimeTracking: boolean;
  enableJqlAdvancedSearch: boolean;
  enableAutomations: boolean;
  enableExternalSharing: boolean;
  enableAiAssistance: boolean;
  storageUsedMb: number;
  storageLimitMb: number;
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
  memberCount?: number;
}

export interface WorkspaceMember {
  id: number;
  workspaceId: number;
  userId: number;
  role: 'Owner' | 'Admin' | 'Member' | 'Guest' | string;
  joinedAt: string;
  user?: AppUser;
}

export interface WorkspaceAuditLog {
  id: number;
  workspaceId: number;
  actorName: string;
  actorEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface IssueLinkItem {
  id: number;
  relationship: string;
  isOutward: boolean;
  targetKey: string;
  linkedIssue?: {
    id: number;
    key: string;
    summary: string;
    status: string;
    issueType: string;
    priority: string;
    assigneeName?: string;
    assigneeAvatarUrl?: string;
  };
  createdAt: string;
}

export interface ChildIssueItem {
  id: number;
  key: string;
  issueNumber: number;
  projectId: number;
  issueType: string;
  summary: string;
  status: string;
  priority: string;
  assigneeName?: string;
  assigneeAvatarUrl?: string;
  storyPoints?: number;
  sprintId?: number;
  parentIssueKey?: string;
  epicKey?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotification {
  id: number;
  recipientName: string;
  recipientEmail?: string;
  actorName: string;
  actorAvatarUrl?: string;
  action: 'assigned' | 'status_changed' | 'commented' | 'created' | 'sprint_started' | 'sprint_completed' | 'worklog' | string;
  category: 'direct' | 'watching' | 'system' | string;
  title: string;
  message: string;
  issueId?: number;
  issueKey?: string;
  issueSummary?: string;
  projectId?: number;
  projectKey?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: UserNotification[];
  totalCount: number;
  unreadCount: number;
  directCount: number;
  watchingCount: number;
}
