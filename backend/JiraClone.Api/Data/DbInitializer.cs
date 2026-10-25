using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Models;

namespace JiraClone.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AppDbContext context)
    {
        // Ensure database tables exist
        await context.Database.EnsureCreatedAsync();

        // Add any missing columns and tables safely
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE issues ADD COLUMN IF NOT EXISTS ""DueDate"" timestamp with time zone;
                ALTER TABLE issues ADD COLUMN IF NOT EXISTS ""StartDate"" timestamp with time zone;
                ALTER TABLE issues ADD COLUMN IF NOT EXISTS ""FixVersion"" text;
                ALTER TABLE issues ADD COLUMN IF NOT EXISTS ""BlockedBy"" text;
                ALTER TABLE issues ADD COLUMN IF NOT EXISTS ""CustomFieldsJson"" text;

                CREATE TABLE IF NOT EXISTS project_statuses (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""Name"" character varying(100) NOT NULL,
                    ""Category"" character varying(50) NOT NULL DEFAULT 'To Do',
                    ""Color"" character varying(30) NOT NULL DEFAULT '#4c9aff',
                    ""Order"" integer NOT NULL DEFAULT 1,
                    ""WipLimit"" integer NULL
                );

                CREATE TABLE IF NOT EXISTS project_versions (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""Name"" character varying(100) NOT NULL,
                    ""Description"" text NULL,
                    ""StartDate"" timestamp with time zone NULL,
                    ""ReleaseDate"" timestamp with time zone NULL,
                    ""IsReleased"" boolean NOT NULL DEFAULT false,
                    ""IsArchived"" boolean NOT NULL DEFAULT false,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                CREATE TABLE IF NOT EXISTS custom_fields (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""FieldKey"" character varying(100) NOT NULL,
                    ""Name"" character varying(150) NOT NULL,
                    ""FieldType"" character varying(50) NOT NULL DEFAULT 'text',
                    ""OptionsJson"" text NULL,
                    ""IsRequired"" boolean NOT NULL DEFAULT false,
                    ""ShowInListView"" boolean NOT NULL DEFAULT true,
                    ""Order"" integer NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS workflow_transitions (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""FromStatus"" character varying(100) NOT NULL,
                    ""ToStatus"" character varying(100) NOT NULL,
                    ""Name"" character varying(150) NOT NULL,
                    ""Description"" text NULL,
                    ""RequiredRole"" character varying(50) NULL,
                    ""AutoResolution"" character varying(50) NULL,
                    ""AutoAssignee"" character varying(100) NULL
                );

                CREATE TABLE IF NOT EXISTS workflow_rules (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""Name"" character varying(200) NOT NULL,
                    ""TriggerEvent"" character varying(100) NOT NULL DEFAULT 'OnStatusChange',
                    ""ConditionStatus"" character varying(100) NULL,
                    ""ActionType"" character varying(100) NOT NULL DEFAULT 'SetResolution',
                    ""ActionValue"" character varying(200) NOT NULL DEFAULT 'Done',
                    ""IsEnabled"" boolean NOT NULL DEFAULT true,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                CREATE TABLE IF NOT EXISTS saved_filters (
                    ""Id"" serial PRIMARY KEY,
                    ""Name"" character varying(200) NOT NULL,
                    ""Jql"" text NOT NULL,
                    ""Description"" text NULL,
                    ""OwnerName"" character varying(100) NOT NULL DEFAULT 'Sajidur Rahman',
                    ""IsFavorite"" boolean NOT NULL DEFAULT true,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                CREATE TABLE IF NOT EXISTS components (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""Name"" character varying(150) NOT NULL,
                    ""Description"" text NULL,
                    ""LeadName"" character varying(100) NULL,
                    ""DefaultAssignee"" character varying(100) NULL
                );

                CREATE TABLE IF NOT EXISTS issue_types (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""Name"" character varying(100) NOT NULL,
                    ""Description"" text NULL,
                    ""Icon"" character varying(50) NOT NULL DEFAULT 'Story',
                    ""IsSubtask"" boolean NOT NULL DEFAULT false,
                    ""Order"" integer NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS priorities (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""Name"" character varying(50) NOT NULL,
                    ""Color"" character varying(50) NOT NULL DEFAULT '#ff5630',
                    ""Description"" text NULL,
                    ""Order"" integer NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS resolutions (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""Name"" character varying(100) NOT NULL,
                    ""Description"" text NULL,
                    ""Order"" integer NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS webhooks (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""Name"" character varying(150) NOT NULL,
                    ""Url"" text NOT NULL,
                    ""EventsJson"" text NOT NULL DEFAULT '[""issue_created"", ""issue_updated""]',
                    ""IsEnabled"" boolean NOT NULL DEFAULT true,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ""Role"" character varying(50) NOT NULL DEFAULT 'Developer';
                ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ""Department"" character varying(100) NULL DEFAULT 'Engineering';
                ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ""JobTitle"" character varying(100) NULL DEFAULT 'Software Engineer';

                CREATE TABLE IF NOT EXISTS project_members (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""UserId"" integer NOT NULL REFERENCES app_users(""Id"") ON DELETE CASCADE,
                    ""Role"" character varying(50) NOT NULL DEFAULT 'Developer',
                    ""JoinedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                CREATE TABLE IF NOT EXISTS project_permissions (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""PermissionKey"" character varying(100) NOT NULL,
                    ""Role"" character varying(50) NOT NULL,
                    ""IsAllowed"" boolean NOT NULL DEFAULT true
                );

                ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ""UserType"" character varying(50) NOT NULL DEFAULT 'Internal';
                ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ""GroupsJson"" text NOT NULL DEFAULT '[""jira-software-users""]';
                ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ""AppAccessJson"" text NOT NULL DEFAULT '[""jira-software""]';

                CREATE TABLE IF NOT EXISTS user_groups (
                    ""Id"" serial PRIMARY KEY,
                    ""Name"" character varying(100) NOT NULL,
                    ""Description"" text NOT NULL DEFAULT '',
                    ""IsDefault"" boolean NOT NULL DEFAULT false,
                    ""UserCount"" integer NOT NULL DEFAULT 0,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                CREATE TABLE IF NOT EXISTS project_teams (
                    ""Id"" serial PRIMARY KEY,
                    ""ProjectId"" integer NOT NULL REFERENCES projects(""Id"") ON DELETE CASCADE,
                    ""Name"" character varying(150) NOT NULL,
                    ""Description"" text NULL,
                    ""LeadName"" character varying(100) NULL,
                    ""LeadEmail"" character varying(150) NULL,
                    ""MembersJson"" text NOT NULL DEFAULT '[]',
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                CREATE TABLE IF NOT EXISTS app_access_settings (
                    ""Id"" serial PRIMARY KEY,
                    ""AppKey"" character varying(100) NOT NULL,
                    ""AppName"" character varying(150) NOT NULL,
                    ""Description"" text NOT NULL DEFAULT '',
                    ""IsEnabled"" boolean NOT NULL DEFAULT true,
                    ""DefaultGroup"" character varying(100) NOT NULL DEFAULT 'jira-software-users',
                    ""LicensedSeats"" integer NOT NULL DEFAULT 25,
                    ""AssignedSeats"" integer NOT NULL DEFAULT 4
                );

                CREATE TABLE IF NOT EXISTS workspaces (
                    ""Id"" serial PRIMARY KEY,
                    ""Name"" character varying(150) NOT NULL,
                    ""Slug"" character varying(100) NOT NULL UNIQUE,
                    ""Description"" text NULL,
                    ""LogoUrl"" text NULL,
                    ""Domain"" character varying(100) NOT NULL DEFAULT 'akij.net',
                    ""PlanTier"" character varying(50) NOT NULL DEFAULT 'Enterprise',
                    ""Timezone"" character varying(100) NOT NULL DEFAULT 'UTC+06:00 (Asia/Dhaka)',
                    ""DateFormat"" character varying(50) NOT NULL DEFAULT 'YYYY-MM-DD',
                    ""DefaultLanguage"" character varying(50) NOT NULL DEFAULT 'English (US)',
                    ""RequireTwoFactor"" boolean NOT NULL DEFAULT true,
                    ""EnforceSso"" boolean NOT NULL DEFAULT false,
                    ""AllowedDomainRestrictions"" text NULL DEFAULT 'akij.net, vendor.com',
                    ""SessionTimeoutMinutes"" integer NOT NULL DEFAULT 1440,
                    ""IpAllowlist"" text NULL,
                    ""EnableSprints"" boolean NOT NULL DEFAULT true,
                    ""EnableRoadmaps"" boolean NOT NULL DEFAULT true,
                    ""EnableTimeTracking"" boolean NOT NULL DEFAULT true,
                    ""EnableJqlAdvancedSearch"" boolean NOT NULL DEFAULT true,
                    ""EnableAutomations"" boolean NOT NULL DEFAULT true,
                    ""EnableExternalSharing"" boolean NOT NULL DEFAULT true,
                    ""EnableAiAssistance"" boolean NOT NULL DEFAULT true,
                    ""StorageUsedMb"" double precision NOT NULL DEFAULT 124.5,
                    ""StorageLimitMb"" double precision NOT NULL DEFAULT 102400.0,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc'),
                    ""UpdatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                ALTER TABLE projects ADD COLUMN IF NOT EXISTS ""WorkspaceId"" integer NULL;

                CREATE TABLE IF NOT EXISTS workspace_members (
                    ""Id"" serial PRIMARY KEY,
                    ""WorkspaceId"" integer NOT NULL REFERENCES workspaces(""Id"") ON DELETE CASCADE,
                    ""UserId"" integer NOT NULL REFERENCES app_users(""Id"") ON DELETE CASCADE,
                    ""Role"" character varying(50) NOT NULL DEFAULT 'Member',
                    ""JoinedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                CREATE TABLE IF NOT EXISTS workspace_audit_logs (
                    ""Id"" serial PRIMARY KEY,
                    ""WorkspaceId"" integer NOT NULL REFERENCES workspaces(""Id"") ON DELETE CASCADE,
                    ""ActorName"" character varying(150) NOT NULL,
                    ""ActorEmail"" character varying(150) NOT NULL,
                    ""Action"" character varying(100) NOT NULL,
                    ""Details"" text NOT NULL,
                    ""Timestamp"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                CREATE TABLE IF NOT EXISTS issue_links (
                    ""Id"" serial PRIMARY KEY,
                    ""SourceIssueId"" integer NOT NULL,
                    ""SourceIssueKey"" character varying(50) NOT NULL,
                    ""TargetIssueId"" integer NOT NULL,
                    ""TargetIssueKey"" character varying(50) NOT NULL,
                    ""Relationship"" character varying(50) NOT NULL DEFAULT 'relates to',
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );

                CREATE TABLE IF NOT EXISTS user_notifications (
                    ""Id"" serial PRIMARY KEY,
                    ""RecipientName"" character varying(150) NOT NULL,
                    ""RecipientEmail"" text NULL,
                    ""ActorName"" character varying(150) NOT NULL DEFAULT 'System',
                    ""ActorAvatarUrl"" text NULL,
                    ""Action"" character varying(50) NOT NULL DEFAULT 'assigned',
                    ""Category"" character varying(50) NOT NULL DEFAULT 'direct',
                    ""Title"" character varying(250) NOT NULL,
                    ""Message"" text NOT NULL,
                    ""IssueId"" integer NULL,
                    ""IssueKey"" text NULL,
                    ""IssueSummary"" text NULL,
                    ""ProjectId"" integer NULL,
                    ""ProjectKey"" text NULL,
                    ""IsRead"" boolean NOT NULL DEFAULT false,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT (now() at time zone 'utc')
                );
                CREATE INDEX IF NOT EXISTS idx_user_notif_recip_read ON user_notifications (""RecipientName"", ""IsRead"", ""CreatedAt"");
            ");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DB Column/Table Migration Note] {ex.Message}");
        }

        // Seed workflow statuses if missing
        try
        {
            var projectList = await context.Projects.ToListAsync();
            foreach (var p in projectList)
            {
                if (!await context.ProjectWorkflowStatuses.AnyAsync(s => s.ProjectId == p.Id))
                {
                    context.ProjectWorkflowStatuses.AddRange(
                        new ProjectWorkflowStatus { ProjectId = p.Id, Name = "To Do", Category = "To Do", Color = "#6b778c", Order = 1, WipLimit = null },
                        new ProjectWorkflowStatus { ProjectId = p.Id, Name = "In Progress", Category = "In Progress", Color = "#0052cc", Order = 2, WipLimit = 5 },
                        new ProjectWorkflowStatus { ProjectId = p.Id, Name = "In Review", Category = "In Progress", Color = "#ffab00", Order = 3, WipLimit = 3 },
                        new ProjectWorkflowStatus { ProjectId = p.Id, Name = "Done", Category = "Done", Color = "#36b37e", Order = 4, WipLimit = null }
                    );
                }

                if (!await context.ProjectVersions.AnyAsync(v => v.ProjectId == p.Id))
                {
                    context.ProjectVersions.AddRange(
                        new ProjectVersion { ProjectId = p.Id, Name = "v1.0.0-rc1", Description = "Initial foundation release with auth and core schemas", IsReleased = true, ReleaseDate = DateTime.UtcNow.AddDays(-10) },
                        new ProjectVersion { ProjectId = p.Id, Name = "v1.1.0", Description = "Jira compatibility, agile reports, and gantt timeline", IsReleased = false, ReleaseDate = DateTime.UtcNow.AddDays(14) }
                    );
                }

                if (!await context.CustomFieldDefinitions.AnyAsync(cf => cf.ProjectId == p.Id))
                {
                    context.CustomFieldDefinitions.AddRange(
                        new CustomFieldDefinition { ProjectId = p.Id, FieldKey = "target_env", Name = "Target Environment", FieldType = "select", OptionsJson = "[\"Development\", \"Staging\", \"Production\"]", ShowInListView = true, Order = 1 },
                        new CustomFieldDefinition { ProjectId = p.Id, FieldKey = "customer_impact", Name = "Customer Impact", FieldType = "select", OptionsJson = "[\"Critical\", \"High\", \"Moderate\", \"Low\"]", ShowInListView = true, Order = 2 },
                        new CustomFieldDefinition { ProjectId = p.Id, FieldKey = "pr_link", Name = "Pull Request / Git URL", FieldType = "url", ShowInListView = true, Order = 3 },
                        new CustomFieldDefinition { ProjectId = p.Id, FieldKey = "risk_score", Name = "Risk Score (1-10)", FieldType = "number", ShowInListView = true, Order = 4 }
                    );
                }

                if (!await context.WorkflowTransitions.AnyAsync(wt => wt.ProjectId == p.Id))
                {
                    context.WorkflowTransitions.AddRange(
                        new WorkflowTransition { ProjectId = p.Id, FromStatus = "To Do", ToStatus = "In Progress", Name = "Start Progress", Description = "Begin implementation" },
                        new WorkflowTransition { ProjectId = p.Id, FromStatus = "In Progress", ToStatus = "In Review", Name = "Submit for Review", Description = "Code ready for review", AutoAssignee = "Sarah Connor" },
                        new WorkflowTransition { ProjectId = p.Id, FromStatus = "In Progress", ToStatus = "To Do", Name = "Stop Progress", Description = "Move back to backlog" },
                        new WorkflowTransition { ProjectId = p.Id, FromStatus = "In Review", ToStatus = "Done", Name = "Approve & Complete", Description = "Pass QA and merge", AutoResolution = "Done" },
                        new WorkflowTransition { ProjectId = p.Id, FromStatus = "In Review", ToStatus = "In Progress", Name = "Request Changes", Description = "Rework required" },
                        new WorkflowTransition { ProjectId = p.Id, FromStatus = "Done", ToStatus = "In Progress", Name = "Reopen", Description = "Reopen defect", AutoResolution = "Unresolved" }
                    );
                }

                if (!await context.WorkflowRules.AnyAsync(wr => wr.ProjectId == p.Id))
                {
                    context.WorkflowRules.AddRange(
                        new WorkflowRule { ProjectId = p.Id, Name = "Auto-set Resolution to Done", TriggerEvent = "OnStatusChange", ConditionStatus = "Done", ActionType = "SetResolution", ActionValue = "Done", IsEnabled = true },
                        new WorkflowRule { ProjectId = p.Id, Name = "Auto-assign to QA Lead on Review", TriggerEvent = "OnStatusChange", ConditionStatus = "In Review", ActionType = "AutoAssign", ActionValue = "Sarah Connor", IsEnabled = true },
                        new WorkflowRule { ProjectId = p.Id, Name = "Clear Resolution when Reopened", TriggerEvent = "OnStatusChange", ConditionStatus = "In Progress", ActionType = "SetResolution", ActionValue = "Unresolved", IsEnabled = true }
                    );
                }

                if (!await context.ProjectComponents.AnyAsync(c => c.ProjectId == p.Id))
                {
                    context.ProjectComponents.AddRange(
                        new ProjectComponent { ProjectId = p.Id, Name = "Frontend (Next.js)", Description = "Web user interface and responsive views", LeadName = "Sajidur Rahman", DefaultAssignee = "Sajidur Rahman" },
                        new ProjectComponent { ProjectId = p.Id, Name = "Backend (.NET API)", Description = "REST endpoints, business logic, and JQL engine", LeadName = "Sajidur Rahman", DefaultAssignee = "Sajidur Rahman" },
                        new ProjectComponent { ProjectId = p.Id, Name = "Database (PostgreSQL)", Description = "Schema migrations, tables, and indices", LeadName = "Alex Murphy", DefaultAssignee = "Alex Murphy" },
                        new ProjectComponent { ProjectId = p.Id, Name = "DevOps & CI/CD", Description = "Docker pipelines, cloud deployments", LeadName = "Sarah Connor", DefaultAssignee = "Sarah Connor" }
                    );
                }

                if (!await context.ProjectIssueTypes.AnyAsync(it => it.ProjectId == p.Id))
                {
                    context.ProjectIssueTypes.AddRange(
                        new ProjectIssueType { ProjectId = p.Id, Name = "Epic", Description = "A big chunk of work that encompasses many stories", Icon = "Epic", Order = 1 },
                        new ProjectIssueType { ProjectId = p.Id, Name = "Story", Description = "User stories delivering business value", Icon = "Story", Order = 2 },
                        new ProjectIssueType { ProjectId = p.Id, Name = "Task", Description = "Small unit of generic work", Icon = "Task", Order = 3 },
                        new ProjectIssueType { ProjectId = p.Id, Name = "Bug", Description = "A problem that impairs or prevents functions", Icon = "Bug", Order = 4 },
                        new ProjectIssueType { ProjectId = p.Id, Name = "Subtask", Description = "Smaller piece of work belonging to a parent issue", Icon = "Subtask", IsSubtask = true, Order = 5 }
                    );
                }

                if (!await context.ProjectPriorities.AnyAsync(pr => pr.ProjectId == p.Id))
                {
                    context.ProjectPriorities.AddRange(
                        new ProjectPriority { ProjectId = p.Id, Name = "Highest", Color = "#ff5630", Description = "Blocks progress and requires urgent intervention", Order = 1 },
                        new ProjectPriority { ProjectId = p.Id, Name = "High", Color = "#ff7452", Description = "Serious issue that should be resolved quickly", Order = 2 },
                        new ProjectPriority { ProjectId = p.Id, Name = "Medium", Color = "#ffab00", Description = "Normal priority task or minor defect", Order = 3 },
                        new ProjectPriority { ProjectId = p.Id, Name = "Low", Color = "#36b37e", Description = "Low impact or cosmetic improvements", Order = 4 },
                        new ProjectPriority { ProjectId = p.Id, Name = "Lowest", Color = "#4c9aff", Description = "Trivial tasks or low priority suggestions", Order = 5 }
                    );
                }

                if (!await context.ProjectResolutions.AnyAsync(res => res.ProjectId == p.Id))
                {
                    context.ProjectResolutions.AddRange(
                        new ProjectResolution { ProjectId = p.Id, Name = "Done", Description = "Work is fully completed and verified", Order = 1 },
                        new ProjectResolution { ProjectId = p.Id, Name = "Fixed", Description = "Bug or defect has been corrected", Order = 2 },
                        new ProjectResolution { ProjectId = p.Id, Name = "Won't Fix", Description = "Decided not to fix or implement", Order = 3 },
                        new ProjectResolution { ProjectId = p.Id, Name = "Duplicate", Description = "A duplicate of another existing issue", Order = 4 },
                        new ProjectResolution { ProjectId = p.Id, Name = "Cannot Reproduce", Description = "Attempted but cannot reproduce symptom", Order = 5 }
                    );
                }
            }
            await context.SaveChangesAsync();

            // Seed default Saved Filters
            if (!await context.SavedFilters.AnyAsync())
            {
                context.SavedFilters.AddRange(
                    new SavedFilter { Name = "My Open Issues", Jql = "assignee = currentUser() AND resolution is EMPTY ORDER BY priority DESC", Description = "Issues assigned to me that are not yet resolved", OwnerName = "Sajidur Rahman", IsFavorite = true },
                    new SavedFilter { Name = "Reported by Me", Jql = "reporter = currentUser() ORDER BY created DESC", Description = "Issues created or submitted by me", OwnerName = "Sajidur Rahman", IsFavorite = true },
                    new SavedFilter { Name = "Critical & High Bugs", Jql = "issuetype = 'Bug' AND priority in ('Highest', 'High') AND resolution is EMPTY", Description = "Severe defects requiring attention", OwnerName = "Sajidur Rahman", IsFavorite = true },
                    new SavedFilter { Name = "Sprint In-Progress", Jql = "status in ('In Progress', 'In Review') ORDER BY updated DESC", Description = "All work currently being developed or reviewed", OwnerName = "Sajidur Rahman", IsFavorite = true },
                    new SavedFilter { Name = "Recently Resolved", Jql = "resolution is not EMPTY ORDER BY updated DESC", Description = "Issues resolved in current milestone", OwnerName = "Sajidur Rahman", IsFavorite = false }
                );
                await context.SaveChangesAsync();
            }

            // Seed Project Permissions and Members
            var allProjects = await context.Projects.ToListAsync();
            var allUsers = await context.AppUsers.ToListAsync();

            foreach (var p in allProjects)
            {
                if (!await context.ProjectPermissions.AnyAsync(pp => pp.ProjectId == p.Id))
                {
                    var perms = new List<string> { "ADMINISTER_PROJECTS", "MANAGE_SPRINTS", "CREATE_ISSUES", "EDIT_ISSUES", "DELETE_ISSUES", "TRANSITION_ISSUES", "ASSIGN_ISSUES" };
                    var roles = new List<string> { "Administrator", "Project Lead", "Developer", "QA Engineer", "Product Owner", "Viewer" };

                    foreach (var role in roles)
                    {
                        foreach (var perm in perms)
                        {
                            bool allowed = role switch
                            {
                                "Administrator" => true,
                                "Project Lead" => true,
                                "Developer" => perm != "ADMINISTER_PROJECTS" && perm != "DELETE_ISSUES",
                                "QA Engineer" => perm == "CREATE_ISSUES" || perm == "EDIT_ISSUES" || perm == "TRANSITION_ISSUES",
                                "Product Owner" => perm != "ADMINISTER_PROJECTS",
                                "Viewer" => false,
                                _ => false
                            };

                            context.ProjectPermissions.Add(new ProjectPermission
                            {
                                ProjectId = p.Id,
                                PermissionKey = perm,
                                Role = role,
                                IsAllowed = allowed
                            });
                        }
                    }
                }

                if (!await context.ProjectMembers.AnyAsync(pm => pm.ProjectId == p.Id) && allUsers.Count > 0)
                {
                    context.ProjectMembers.AddRange(
                        new ProjectMember { ProjectId = p.Id, UserId = allUsers[0].Id, Role = "Administrator" },
                        new ProjectMember { ProjectId = p.Id, UserId = allUsers[1 % allUsers.Count].Id, Role = "QA Engineer" },
                        new ProjectMember { ProjectId = p.Id, UserId = allUsers[2 % allUsers.Count].Id, Role = "Developer" },
                        new ProjectMember { ProjectId = p.Id, UserId = allUsers[3 % allUsers.Count].Id, Role = "Developer" }
                    );
                }

                if (!await context.ProjectTeams.AnyAsync(pt => pt.ProjectId == p.Id))
                {
                    context.ProjectTeams.AddRange(
                        new ProjectTeam { ProjectId = p.Id, Name = "Core Platform Squad", Description = "Backend architecture, REST APIs, and database migrations", LeadName = "Sajidur Rahman", LeadEmail = "sajidur@akij.net", MembersJson = "[\"Sajidur Rahman\", \"Alex Murphy\"]" },
                        new ProjectTeam { ProjectId = p.Id, Name = "Frontend Experience Squad", Description = "Next.js boards, backlog, ADS components, and interactive UI", LeadName = "Sajidur Rahman", LeadEmail = "sajidur@akij.net", MembersJson = "[\"Sajidur Rahman\", \"Elena Rostova\"]" },
                        new ProjectTeam { ProjectId = p.Id, Name = "Quality & Automation Guild", Description = "End-to-end testing, bug verification, and CI/CD pipelines", LeadName = "Sarah Connor", LeadEmail = "sarah@akij.net", MembersJson = "[\"Sarah Connor\"]" }
                    );
                }
            }

            if (!await context.UserGroups.AnyAsync())
            {
                context.UserGroups.AddRange(
                    new UserGroup { Name = "jira-administrators", Description = "Enterprise system administrators with full global privileges", IsDefault = false, UserCount = 1 },
                    new UserGroup { Name = "jira-software-users", Description = "Standard licensed software project contributors", IsDefault = true, UserCount = 4 },
                    new UserGroup { Name = "jira-servicemanagement-users", Description = "Service desk agents and customer service reps", IsDefault = false, UserCount = 2 },
                    new UserGroup { Name = "site-admins", Description = "Organization level administrators and billing managers", IsDefault = false, UserCount = 1 },
                    new UserGroup { Name = "external-collaborators", Description = "External vendor contractors, clients, and partner developers", IsDefault = false, UserCount = 1 }
                );
            }

            if (!await context.AppAccessSettings.AnyAsync())
            {
                context.AppAccessSettings.AddRange(
                    new AppAccessSetting { AppKey = "jira-software", AppName = "Jira Software", Description = "Agile Scrum & Kanban boards, Backlog, JQL search, and releases", IsEnabled = true, DefaultGroup = "jira-software-users", LicensedSeats = 25, AssignedSeats = 4 },
                    new AppAccessSetting { AppKey = "jira-service-management", AppName = "Jira Service Management", Description = "Customer service desk, ITSM incidents, and request queues", IsEnabled = true, DefaultGroup = "jira-servicemanagement-users", LicensedSeats = 10, AssignedSeats = 2 },
                    new AppAccessSetting { AppKey = "confluence", AppName = "Confluence Workspace", Description = "Connected team documentation, meeting notes, and knowledge base", IsEnabled = true, DefaultGroup = "jira-software-users", LicensedSeats = 25, AssignedSeats = 4 },
                    new AppAccessSetting { AppKey = "jira-work-management", AppName = "Jira Work Management", Description = "Business team spreadsheets, calendars, and timelines", IsEnabled = true, DefaultGroup = "jira-software-users", LicensedSeats = 15, AssignedSeats = 3 }
                );
            }

            if (!await context.Workspaces.AnyAsync())
            {
                var ws1 = new Workspace
                {
                    Name = "RexSystem Enterprise",
                    Slug = "rexsystem",
                    Description = "Primary agile software delivery organization for RexSystem Cloud.",
                    Domain = "rexsystem.net",
                    PlanTier = "Enterprise",
                    Timezone = "UTC+06:00 (Asia/Dhaka)",
                    DateFormat = "YYYY-MM-DD",
                    RequireTwoFactor = true,
                    EnforceSso = false,
                    AllowedDomainRestrictions = "rexsystem.net, akij.net",
                    EnableSprints = true,
                    EnableRoadmaps = true,
                    EnableTimeTracking = true,
                    EnableJqlAdvancedSearch = true,
                    EnableAutomations = true,
                    StorageUsedMb = 340.5,
                    StorageLimitMb = 102400.0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var ws2 = new Workspace
                {
                    Name = "AKIJ Tech Solutions",
                    Slug = "akij-erp",
                    Description = "Enterprise resource planning, supply chain, and manufacturing systems.",
                    Domain = "akij.net",
                    PlanTier = "Enterprise",
                    Timezone = "UTC+06:00 (Asia/Dhaka)",
                    DateFormat = "YYYY-MM-DD",
                    RequireTwoFactor = true,
                    EnforceSso = true,
                    AllowedDomainRestrictions = "akij.net",
                    EnableSprints = true,
                    EnableRoadmaps = true,
                    EnableTimeTracking = true,
                    EnableJqlAdvancedSearch = true,
                    EnableAutomations = true,
                    StorageUsedMb = 680.2,
                    StorageLimitMb = 204800.0,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                context.Workspaces.AddRange(ws1, ws2);
                await context.SaveChangesAsync();

                // Seed initial audit log
                context.WorkspaceAuditLogs.AddRange(
                    new WorkspaceAuditLog
                    {
                        WorkspaceId = ws1.Id,
                        ActorName = "Sajidur Rahman",
                        ActorEmail = "sajidur@akij.net",
                        Action = "WORKSPACE_INITIALIZED",
                        Details = "RexSystem Enterprise workspace provisioned with Enterprise Tier configuration.",
                        Timestamp = DateTime.UtcNow
                    },
                    new WorkspaceAuditLog
                    {
                        WorkspaceId = ws1.Id,
                        ActorName = "Sajidur Rahman",
                        ActorEmail = "sajidur@akij.net",
                        Action = "SECURITY_POLICY_CONFIGURED",
                        Details = "Enforced 2FA and restricted registration to allowed domains (rexsystem.net, akij.net).",
                        Timestamp = DateTime.UtcNow
                    }
                );
            }

            // Link ERP to Workspace 2 (AKIJ Tech Solutions) and KAN to Workspace 1 (RexSystem Enterprise)
            var erpProj = await context.Projects.FirstOrDefaultAsync(p => p.Key == "ERP");
            if (erpProj != null && erpProj.WorkspaceId != 2)
            {
                erpProj.WorkspaceId = 2;
            }

            var kanProj = await context.Projects.FirstOrDefaultAsync(p => p.Key == "KAN");
            if (kanProj != null && kanProj.WorkspaceId != 1)
            {
                kanProj.WorkspaceId = 1;
            }

            // Seed default notifications if empty
            try
            {
                if (!await context.UserNotifications.AnyAsync())
                {
                    var seedNotifs = new List<UserNotification>
                    {
                        new()
                        {
                            RecipientName = "Sajidur Rahman",
                            RecipientEmail = "sajidur@akij.net",
                            ActorName = "Elena Rostova",
                            ActorAvatarUrl = "https://ui-avatars.com/api/?name=Elena+Rostova&background=0D8ABC&color=fff",
                            Action = "assigned",
                            Category = "direct",
                            Title = "Assigned to you: SCRUM-1",
                            Message = "Elena Rostova assigned SCRUM-1 (Dual-Engine Authentication & Session Management) to you.",
                            IssueKey = "SCRUM-1",
                            IssueSummary = "Dual-Engine Authentication & Session Management",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow.AddMinutes(-25)
                        },
                        new()
                        {
                            RecipientName = "Sajidur Rahman",
                            RecipientEmail = "sajidur@akij.net",
                            ActorName = "Dev Lead",
                            ActorAvatarUrl = "https://ui-avatars.com/api/?name=Dev+Lead&background=6554C0&color=fff",
                            Action = "commented",
                            Category = "direct",
                            Title = "Mentioned you on SCRUM-2",
                            Message = "@Sajidur Rahman please review the database connection pooling configuration for PostgreSQL 16.",
                            IssueKey = "SCRUM-2",
                            IssueSummary = "Real-Time Sprint Board with Drag-and-Drop Column Transitions",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow.AddHours(-1)
                        },
                        new()
                        {
                            RecipientName = "Sajidur Rahman",
                            RecipientEmail = "sajidur@akij.net",
                            ActorName = "Marcus Vance",
                            ActorAvatarUrl = "https://ui-avatars.com/api/?name=Marcus+Vance&background=36B37E&color=fff",
                            Action = "status_changed",
                            Category = "watching",
                            Title = "SCRUM-3 moved to In Progress",
                            Message = "SCRUM-3 (Hierarchical Epic-to-Subtask Data Model) was moved to In Progress.",
                            IssueKey = "SCRUM-3",
                            IssueSummary = "Hierarchical Epic-to-Subtask Data Model",
                            IsRead = false,
                            CreatedAt = DateTime.UtcNow.AddHours(-3)
                        },
                        new()
                        {
                            RecipientName = "Sajidur Rahman",
                            RecipientEmail = "sajidur@akij.net",
                            ActorName = "Sprint Manager",
                            Action = "sprint_started",
                            Category = "system",
                            Title = "Sprint 1 was started",
                            Message = "Sprint 1 - Core Framework is now active.",
                            IsRead = true,
                            CreatedAt = DateTime.UtcNow.AddDays(-1)
                        }
                    };
                    await context.UserNotifications.AddRangeAsync(seedNotifs);
                    await context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Notifications Seed Note] {ex.Message}");
            }

            // Ensure SCRUM project exists for RexSystem Enterprise (Workspace 1)
            if (!await context.Projects.AnyAsync(p => p.Key == "SCRUM"))
            {
                var scrumProject = new Project
                {
                    Key = "SCRUM",
                    Name = "RexSystem Cloud Agile Platform",
                    Description = "Core agile software development board, sprints, and release engineering for rexsystem.atlassian.net.",
                    ProjectTypeKey = "software",
                    LeadName = "Sajidur Rahman",
                    LeadEmail = "sajidur@akij.net",
                    WorkspaceId = 1, // RexSystem Enterprise
                    CreatedAt = DateTime.UtcNow.AddDays(-20),
                    UpdatedAt = DateTime.UtcNow
                };
                context.Projects.Add(scrumProject);
                await context.SaveChangesAsync();

                var scrumSprint1 = new Sprint
                {
                    ProjectId = scrumProject.Id,
                    Name = "SCRUM Sprint 1 - Core Delivery",
                    Goal = "Establish workspace multi-tenancy, custom workflows, and backlog management.",
                    State = "active",
                    StartDate = DateTime.UtcNow.AddDays(-5),
                    EndDate = DateTime.UtcNow.AddDays(9),
                    CreatedAt = DateTime.UtcNow.AddDays(-5)
                };

                var scrumSprint2 = new Sprint
                {
                    ProjectId = scrumProject.Id,
                    Name = "SCRUM Sprint 2 - Cloud Integrations",
                    Goal = "SAML SSO, advanced JQL, and external integrations.",
                    State = "future",
                    StartDate = DateTime.UtcNow.AddDays(10),
                    EndDate = DateTime.UtcNow.AddDays(24),
                    CreatedAt = DateTime.UtcNow.AddDays(-1)
                };

                context.Sprints.AddRange(scrumSprint1, scrumSprint2);
                await context.SaveChangesAsync();

                // Add issues for SCRUM
                context.Issues.AddRange(
                    new Issue
                    {
                        ProjectId = scrumProject.Id,
                        Key = "SCRUM-1",
                        IssueNumber = 1,
                        IssueType = "Story",
                        Summary = "Workspace multi-tenancy & Atlassian organization switching",
                        Description = "Enable multi-tenant site switching between rexsystem.atlassian.net and akij-erp.atlassian.net with isolated project scopes.",
                        Status = "In Progress",
                        Priority = "Highest",
                        AssigneeName = "Sajidur Rahman",
                        AssigneeEmail = "sajidur@akij.net",
                        ReporterName = "Sajidur Rahman",
                        StoryPoints = 5,
                        SprintId = scrumSprint1.Id,
                        Labels = "workspace,multitenant,architecture",
                        Components = "Frontend (Next.js)",
                        Order = 1.0,
                        CreatedAt = DateTime.UtcNow.AddDays(-4),
                        UpdatedAt = DateTime.UtcNow
                    },
                    new Issue
                    {
                        ProjectId = scrumProject.Id,
                        Key = "SCRUM-2",
                        IssueNumber = 2,
                        IssueType = "Task",
                        Summary = "Setup SAML 2.0 Single Sign-On and 2FA authentication policies",
                        Description = "Configure identity provider integration with Okta and Microsoft Entra ID with mandatory two-factor authentication.",
                        Status = "To Do",
                        Priority = "High",
                        AssigneeName = "Alex Murphy",
                        AssigneeEmail = "alex@akij.net",
                        ReporterName = "Sajidur Rahman",
                        StoryPoints = 3,
                        SprintId = scrumSprint1.Id,
                        Labels = "security,sso,auth",
                        Components = "Backend (.NET API)",
                        Order = 2.0,
                        CreatedAt = DateTime.UtcNow.AddDays(-3),
                        UpdatedAt = DateTime.UtcNow
                    },
                    new Issue
                    {
                        ProjectId = scrumProject.Id,
                        Key = "SCRUM-3",
                        IssueNumber = 3,
                        IssueType = "Epic",
                        Summary = "Advanced JQL Engine with Auto-complete & Syntax Highlighting",
                        Description = "Implement full JQL query parsing: project = SCRUM AND status = 'In Progress' ORDER BY created DESC.",
                        Status = "Done",
                        Priority = "High",
                        Resolution = "Done",
                        ResolvedAt = DateTime.UtcNow.AddDays(-1),
                        AssigneeName = "Elena Rostova",
                        AssigneeEmail = "elena@akij.net",
                        ReporterName = "Sajidur Rahman",
                        StoryPoints = 8,
                        SprintId = scrumSprint1.Id,
                        Labels = "jql,search,query",
                        Components = "Backend (.NET API)",
                        Order = 3.0,
                        CreatedAt = DateTime.UtcNow.AddDays(-5),
                        UpdatedAt = DateTime.UtcNow.AddDays(-1)
                    },
                    new Issue
                    {
                        ProjectId = scrumProject.Id,
                        Key = "SCRUM-4",
                        IssueNumber = 4,
                        IssueType = "Bug",
                        Summary = "Backlog issue rank reordering glitch on drag and drop",
                        Description = "When moving items between active sprint and backlog, reorder indices need precise decimal positioning.",
                        Status = "Done",
                        Priority = "Medium",
                        Resolution = "Done",
                        ResolvedAt = DateTime.UtcNow.AddDays(-1),
                        AssigneeName = "Sajidur Rahman",
                        AssigneeEmail = "sajidur@akij.net",
                        ReporterName = "Sarah Connor",
                        StoryPoints = 2,
                        SprintId = scrumSprint1.Id,
                        Labels = "backlog,dnd,bug",
                        Components = "Frontend (Next.js)",
                        Order = 4.0,
                        CreatedAt = DateTime.UtcNow.AddDays(-4),
                        UpdatedAt = DateTime.UtcNow.AddDays(-1)
                    },
                    new Issue
                    {
                        ProjectId = scrumProject.Id,
                        Key = "SCRUM-5",
                        IssueNumber = 5,
                        IssueType = "Story",
                        Summary = "Custom Workflow Studio: Dynamic statuses, transitions and triggers",
                        Description = "Build visual Jira Workflow Studio allowing creation of statuses, transitions with auto-assignees, WIP limits, and post-functions.",
                        Status = "In Progress",
                        Priority = "Highest",
                        AssigneeName = "Sajidur Rahman",
                        AssigneeEmail = "sajidur@akij.net",
                        ReporterName = "Sarah Connor",
                        StoryPoints = 8,
                        SprintId = scrumSprint1.Id,
                        Labels = "workflow,config,engine",
                        Components = "Frontend (Next.js)",
                        Order = 5.0,
                        CreatedAt = DateTime.UtcNow.AddDays(-3),
                        UpdatedAt = DateTime.UtcNow
                    },
                    new Issue
                    {
                        ProjectId = scrumProject.Id,
                        Key = "SCRUM-6",
                        IssueNumber = 6,
                        IssueType = "Story",
                        Summary = "Sprint velocity and burndown charts report module",
                        Description = "Calculate story points completed per sprint, velocity tracking over 5 iterations, and cumulative flow diagram.",
                        Status = "To Do",
                        Priority = "Medium",
                        AssigneeName = "Sarah Connor",
                        AssigneeEmail = "sarah@akij.net",
                        ReporterName = "Sajidur Rahman",
                        StoryPoints = 5,
                        SprintId = null, // Backlog
                        Labels = "reports,metrics,charts",
                        Components = "Frontend (Next.js)",
                        Order = 6.0,
                        CreatedAt = DateTime.UtcNow.AddDays(-2),
                        UpdatedAt = DateTime.UtcNow
                    },
                    new Issue
                    {
                        ProjectId = scrumProject.Id,
                        Key = "SCRUM-7",
                        IssueNumber = 7,
                        IssueType = "Task",
                        Summary = "Audit trail logging for all project administrative actions",
                        Description = "Record actor, timestamp, action type, and JSON payload for all project configuration mutations.",
                        Status = "To Do",
                        Priority = "Low",
                        AssigneeName = "Alex Murphy",
                        AssigneeEmail = "alex@akij.net",
                        ReporterName = "Sajidur Rahman",
                        StoryPoints = 3,
                        SprintId = null, // Backlog
                        Labels = "audit,security,compliance",
                        Components = "Backend (.NET API)",
                        Order = 7.0,
                        CreatedAt = DateTime.UtcNow.AddDays(-1),
                        UpdatedAt = DateTime.UtcNow
                    }
                );
                await context.SaveChangesAsync();
            }

            // Ensure SCM project exists for AKIJ Tech Solutions (Workspace 2)
            if (!await context.Projects.AnyAsync(p => p.Key == "SCM"))
            {
                var scmProject = new Project
                {
                    Key = "SCM",
                    Name = "AKIJ Supply Chain & Logistics",
                    Description = "Procurement, warehouse distribution, and vendor management system.",
                    ProjectTypeKey = "software",
                    LeadName = "Alex Murphy",
                    LeadEmail = "alex@akij.net",
                    WorkspaceId = 2, // AKIJ Tech Solutions
                    CreatedAt = DateTime.UtcNow.AddDays(-15),
                    UpdatedAt = DateTime.UtcNow
                };
                context.Projects.Add(scmProject);
                await context.SaveChangesAsync();

                var scmSprint = new Sprint
                {
                    ProjectId = scmProject.Id,
                    Name = "SCM Sprint 1 - Fleet & Orders",
                    Goal = "Order tracking and delivery fleet routing algorithms.",
                    State = "active",
                    StartDate = DateTime.UtcNow.AddDays(-3),
                    EndDate = DateTime.UtcNow.AddDays(11),
                    CreatedAt = DateTime.UtcNow.AddDays(-3)
                };
                context.Sprints.Add(scmSprint);
                await context.SaveChangesAsync();

                context.Issues.AddRange(
                    new Issue
                    {
                        ProjectId = scmProject.Id,
                        Key = "SCM-1",
                        IssueNumber = 1,
                        IssueType = "Story",
                        Summary = "Automated Purchase Order approval hierarchy",
                        Description = "Multi-level purchase order sign-off workflow with ERP finance integration.",
                        Status = "In Progress",
                        Priority = "High",
                        AssigneeName = "Alex Murphy",
                        AssigneeEmail = "alex@akij.net",
                        ReporterName = "Sajidur Rahman",
                        StoryPoints = 5,
                        SprintId = scmSprint.Id,
                        Labels = "scm,po,procurement",
                        Components = "Backend (.NET API)",
                        Order = 1.0,
                        CreatedAt = DateTime.UtcNow.AddDays(-2),
                        UpdatedAt = DateTime.UtcNow
                    },
                    new Issue
                    {
                        ProjectId = scmProject.Id,
                        Key = "SCM-2",
                        IssueNumber = 2,
                        IssueType = "Task",
                        Summary = "Warehouse barcode scanner mobile API",
                        Description = "Real-time stock inventory intake via handheld barcode scanner terminals.",
                        Status = "To Do",
                        Priority = "Medium",
                        AssigneeName = "Elena Rostova",
                        AssigneeEmail = "elena@akij.net",
                        ReporterName = "Alex Murphy",
                        StoryPoints = 3,
                        SprintId = scmSprint.Id,
                        Labels = "warehouse,mobile,rfid",
                        Components = "Frontend (Next.js)",
                        Order = 2.0,
                        CreatedAt = DateTime.UtcNow.AddDays(-1),
                        UpdatedAt = DateTime.UtcNow
                    }
                );
                await context.SaveChangesAsync();
            }

            // Update any remaining unassigned projects to link to Workspace 1 if null
            var unassignedProjects = await context.Projects.Where(p => p.WorkspaceId == null).ToListAsync();
            foreach (var p in unassignedProjects)
            {
                p.WorkspaceId = 1;
            }

            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DB Status/Version Seed Note] {ex.Message}");
        }

        if (await context.Projects.AnyAsync())
        {
            return; // DB already seeded
        }

        // Seed Users
        var users = new List<AppUser>
        {
            new() { AccountId = "usr-1", Name = "sajidur", DisplayName = "Sajidur Rahman", EmailAddress = "sajidur@akij.net", AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face" },
            new() { AccountId = "usr-2", Name = "sarah.connor", DisplayName = "Sarah Connor", EmailAddress = "sarah@akij.net", AvatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" },
            new() { AccountId = "usr-3", Name = "alex.murphy", DisplayName = "Alex Murphy", EmailAddress = "alex@akij.net", AvatarUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" },
            new() { AccountId = "usr-4", Name = "elena.rostova", DisplayName = "Elena Rostova", EmailAddress = "elena@akij.net", AvatarUrl = "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" },
        };
        await context.AppUsers.AddRangeAsync(users);
        await context.SaveChangesAsync();

        // Seed Primary Project
        var erpProject = new Project
        {
            Key = "ERP",
            Name = "AKIJ ERP Core Platform",
            Description = "Enterprise Resource Planning modernization with .NET 10 & Next.js microservices.",
            ProjectTypeKey = "software",
            LeadName = "Sajidur Rahman",
            LeadEmail = "sajidur@akij.net",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow
        };

        var kanbanProject = new Project
        {
            Key = "KAN",
            Name = "DevOps & Infrastructure",
            Description = "Continuous deployment, PostgreSQL cluster management, and monitoring pipelines.",
            ProjectTypeKey = "software",
            LeadName = "Sarah Connor",
            LeadEmail = "sarah@akij.net",
            CreatedAt = DateTime.UtcNow.AddDays(-15),
            UpdatedAt = DateTime.UtcNow
        };

        await context.Projects.AddRangeAsync(erpProject, kanbanProject);
        await context.SaveChangesAsync();

        // Seed Sprints for ERP Project
        var sprint1 = new Sprint
        {
            ProjectId = erpProject.Id,
            Name = "Sprint 1 - Core Architecture",
            Goal = "Complete PostgreSQL setup, Jira schema compatibility, and basic board UI.",
            State = "active",
            StartDate = DateTime.UtcNow.AddDays(-7),
            EndDate = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow.AddDays(-7)
        };

        var sprint2 = new Sprint
        {
            ProjectId = erpProject.Id,
            Name = "Sprint 2 - Production Hardening",
            Goal = "Full Jira XML/CSV/JSON bulk data migration and performance tuning.",
            State = "future",
            StartDate = DateTime.UtcNow.AddDays(8),
            EndDate = DateTime.UtcNow.AddDays(22),
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };

        await context.Sprints.AddRangeAsync(sprint1, sprint2);
        await context.SaveChangesAsync();

        // Seed Issues
        var issues = new List<Issue>
        {
            new()
            {
                ProjectId = erpProject.Id,
                Key = "ERP-1",
                IssueNumber = 1,
                IssueType = "Epic",
                Summary = "PostgreSQL Database Engine & Architecture Migration",
                Description = "### Objectives\n- Connect to external PostgreSQL cluster at pg8001.site4now.net:6432\n- Configure EF Core 10 mappings and migration tables\n- Verify resilient connection pooling and SSL encryption",
                Status = "Done",
                Priority = "Highest",
                Resolution = "Done",
                ResolvedAt = DateTime.UtcNow.AddDays(-2),
                AssigneeName = "Sajidur Rahman",
                AssigneeEmail = "sajidur@akij.net",
                ReporterName = "Sarah Connor",
                StoryPoints = 8,
                OriginalEstimateMinutes = 480,
                TimeSpentMinutes = 450,
                SprintId = sprint1.Id,
                Labels = "backend,db,architecture",
                Components = "Core DB",
                FixVersion = "v1.0.0",
                StartDate = DateTime.UtcNow.AddDays(-7),
                DueDate = DateTime.UtcNow.AddDays(-2),
                Order = 1.0,
                CreatedAt = DateTime.UtcNow.AddDays(-6),
                UpdatedAt = DateTime.UtcNow.AddDays(-2),
                Comments = new List<IssueComment>
                {
                    new()
                    {
                        AuthorName = "Sajidur Rahman",
                        AuthorEmail = "sajidur@akij.net",
                        Body = "PostgreSQL connection tested and TCP handshake verified successfully on port 6432.",
                        CreatedAt = DateTime.UtcNow.AddDays(-5)
                    }
                }
            },
            new()
            {
                ProjectId = erpProject.Id,
                Key = "ERP-2",
                IssueNumber = 2,
                IssueType = "Story",
                Summary = "Implement Jira Standard JSON & CSV Export / Import Engine",
                Description = "Must match official Atlassian Jira Cloud & Jira Server schemas. Users should be able to upload Jira export files or download full project states.",
                Status = "In Progress",
                Priority = "High",
                AssigneeName = "Sajidur Rahman",
                AssigneeEmail = "sajidur@akij.net",
                ReporterName = "Elena Rostova",
                StoryPoints = 5,
                OriginalEstimateMinutes = 360,
                TimeSpentMinutes = 200,
                SprintId = sprint1.Id,
                Labels = "jira,export,import,compatibility",
                Components = "Interoperability",
                FixVersion = "v1.0.0",
                StartDate = DateTime.UtcNow.AddDays(-4),
                DueDate = DateTime.UtcNow.AddDays(2),
                Order = 2.0,
                CreatedAt = DateTime.UtcNow.AddDays(-4),
                UpdatedAt = DateTime.UtcNow.AddHours(-1)
            },
            new()
            {
                ProjectId = erpProject.Id,
                Key = "ERP-3",
                IssueNumber = 3,
                IssueType = "Story",
                Summary = "Interactive Next.js Kanban & Scrum Boards with Drag & Drop",
                Description = "Provide seamless status transitions across **To Do**, **In Progress**, **In Review**, and **Done** with visual avatars, priority badges, and quick filters.",
                Status = "In Progress",
                Priority = "High",
                AssigneeName = "Alex Murphy",
                AssigneeEmail = "alex@akij.net",
                ReporterName = "Sajidur Rahman",
                StoryPoints = 5,
                OriginalEstimateMinutes = 300,
                TimeSpentMinutes = 150,
                SprintId = sprint1.Id,
                Labels = "frontend,board,ui,react",
                Components = "Frontend Web",
                FixVersion = "v1.0.0",
                StartDate = DateTime.UtcNow.AddDays(-3),
                DueDate = DateTime.UtcNow.AddDays(3),
                Order = 3.0,
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                UpdatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new()
            {
                ProjectId = erpProject.Id,
                Key = "ERP-4",
                IssueNumber = 4,
                IssueType = "Task",
                Summary = "Jira REST API v2 Compatibility Layer (/rest/api/2/issue, /search)",
                Description = "Expose standard Jira REST endpoints so external Jira CLI tools, scripts, and webhook integrations work transparently without code changes.",
                Status = "In Review",
                Priority = "Medium",
                AssigneeName = "Sajidur Rahman",
                AssigneeEmail = "sajidur@akij.net",
                ReporterName = "Alex Murphy",
                StoryPoints = 3,
                OriginalEstimateMinutes = 240,
                TimeSpentMinutes = 220,
                SprintId = sprint1.Id,
                Labels = "api,rest,jira-v2",
                Components = "API",
                FixVersion = "v1.0.0",
                StartDate = DateTime.UtcNow.AddDays(-2),
                DueDate = DateTime.UtcNow.AddDays(1),
                Order = 4.0,
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-30)
            },
            new()
            {
                ProjectId = erpProject.Id,
                Key = "ERP-5",
                IssueNumber = 5,
                IssueType = "Bug",
                Summary = "Fix timezone calculation in worklog duration reporting",
                Description = "When logging work from non-UTC timezones, elapsed minutes should stay strictly in UTC and normalize properly on card summaries.",
                Status = "To Do",
                Priority = "Low",
                AssigneeName = "Sarah Connor",
                AssigneeEmail = "sarah@akij.net",
                ReporterName = "Elena Rostova",
                StoryPoints = 2,
                OriginalEstimateMinutes = 120,
                SprintId = sprint1.Id,
                Labels = "bug,worklog",
                Components = "Time Tracking",
                FixVersion = "v1.0.0",
                DueDate = DateTime.UtcNow.AddDays(4),
                Order = 5.0,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                ProjectId = erpProject.Id,
                Key = "ERP-6",
                IssueNumber = 6,
                IssueType = "Story",
                Summary = "Backlog Planning View with Sprint Creation & Issue Ranking",
                Description = "Enable Product Owners to organize the backlog, drag tickets into active or upcoming sprints, and calculate sprint velocity points.",
                Status = "To Do",
                Priority = "Medium",
                AssigneeName = null,
                ReporterName = "Elena Rostova",
                StoryPoints = 5,
                SprintId = null,
                Labels = "backlog,scrum,planning",
                Components = "Frontend Web",
                FixVersion = "v1.1.0",
                DueDate = DateTime.UtcNow.AddDays(10),
                Order = 6.0,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                ProjectId = erpProject.Id,
                Key = "ERP-7",
                IssueNumber = 7,
                IssueType = "Task",
                Summary = "Automated PostgreSQL backup snapshot and replication sync",
                Description = "Schedule nightly automated pg_dump exports and store encrypted artifacts in object storage.",
                Status = "To Do",
                Priority = "Medium",
                AssigneeName = null,
                ReporterName = "Sajidur Rahman",
                StoryPoints = 3,
                SprintId = null,
                Labels = "devops,backup,db",
                Components = "Core DB",
                FixVersion = "v1.1.0",
                DueDate = DateTime.UtcNow.AddDays(12),
                Order = 7.0,
                CreatedAt = DateTime.UtcNow.AddHours(-10),
                UpdatedAt = DateTime.UtcNow.AddHours(-10)
            }
        };

        await context.Issues.AddRangeAsync(issues);
        await context.SaveChangesAsync();
    }
}
