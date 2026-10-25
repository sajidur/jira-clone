using Microsoft.EntityFrameworkCore;
using JiraClone.Api.Models;

namespace JiraClone.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Sprint> Sprints => Set<Sprint>();
    public DbSet<Issue> Issues => Set<Issue>();
    public DbSet<IssueComment> IssueComments => Set<IssueComment>();
    public DbSet<Worklog> Worklogs => Set<Worklog>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<ProjectVersion> ProjectVersions => Set<ProjectVersion>();
    public DbSet<ProjectWorkflowStatus> ProjectWorkflowStatuses => Set<ProjectWorkflowStatus>();
    public DbSet<CustomFieldDefinition> CustomFieldDefinitions => Set<CustomFieldDefinition>();
    public DbSet<WorkflowTransition> WorkflowTransitions => Set<WorkflowTransition>();
    public DbSet<WorkflowRule> WorkflowRules => Set<WorkflowRule>();
    public DbSet<SavedFilter> SavedFilters => Set<SavedFilter>();
    public DbSet<ProjectComponent> ProjectComponents => Set<ProjectComponent>();
    public DbSet<ProjectIssueType> ProjectIssueTypes => Set<ProjectIssueType>();
    public DbSet<ProjectPriority> ProjectPriorities => Set<ProjectPriority>();
    public DbSet<ProjectResolution> ProjectResolutions => Set<ProjectResolution>();
    public DbSet<ProjectWebhook> ProjectWebhooks => Set<ProjectWebhook>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<ProjectPermission> ProjectPermissions => Set<ProjectPermission>();
    public DbSet<UserGroup> UserGroups => Set<UserGroup>();
    public DbSet<ProjectTeam> ProjectTeams => Set<ProjectTeam>();
    public DbSet<AppAccessSetting> AppAccessSettings => Set<AppAccessSetting>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<WorkspaceAuditLog> WorkspaceAuditLogs => Set<WorkspaceAuditLog>();
    public DbSet<IssueLink> IssueLinks => Set<IssueLink>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Project>(entity =>
        {
            entity.ToTable("projects");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Key).IsUnique();
            entity.Property(e => e.Key).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
        });

        modelBuilder.Entity<Sprint>(entity =>
        {
            entity.ToTable("sprints");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany(p => p.Sprints)
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectVersion>(entity =>
        {
            entity.ToTable("project_versions");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectWorkflowStatus>(entity =>
        {
            entity.ToTable("project_statuses");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CustomFieldDefinition>(entity =>
        {
            entity.ToTable("custom_fields");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkflowTransition>(entity =>
        {
            entity.ToTable("workflow_transitions");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkflowRule>(entity =>
        {
            entity.ToTable("workflow_rules");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SavedFilter>(entity =>
        {
            entity.ToTable("saved_filters");
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<ProjectComponent>(entity =>
        {
            entity.ToTable("components");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectIssueType>(entity =>
        {
            entity.ToTable("issue_types");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectPriority>(entity =>
        {
            entity.ToTable("priorities");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectResolution>(entity =>
        {
            entity.ToTable("resolutions");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectWebhook>(entity =>
        {
            entity.ToTable("webhooks");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectMember>(entity =>
        {
            entity.ToTable("project_members");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectPermission>(entity =>
        {
            entity.ToTable("project_permissions");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserGroup>(entity =>
        {
            entity.ToTable("user_groups");
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<ProjectTeam>(entity =>
        {
            entity.ToTable("project_teams");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Project)
                  .WithMany()
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AppAccessSetting>(entity =>
        {
            entity.ToTable("app_access_settings");
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<Issue>(entity =>
        {
            entity.ToTable("issues");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Key).IsUnique();
            entity.HasIndex(e => new { e.ProjectId, e.IssueNumber });
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.SprintId);

            entity.HasOne(e => e.Project)
                  .WithMany(p => p.Issues)
                  .HasForeignKey(e => e.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Sprint)
                  .WithMany(s => s.Issues)
                  .HasForeignKey(e => e.SprintId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<IssueComment>(entity =>
        {
            entity.ToTable("issue_comments");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Issue)
                  .WithMany(i => i.Comments)
                  .HasForeignKey(e => e.IssueId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Worklog>(entity =>
        {
            entity.ToTable("worklogs");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Issue)
                  .WithMany(i => i.Worklogs)
                  .HasForeignKey(e => e.IssueId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.ToTable("activity_logs");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Issue)
                  .WithMany(i => i.Activities)
                  .HasForeignKey(e => e.IssueId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("app_users");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.AccountId).IsUnique();
        });

        modelBuilder.Entity<Workspace>(entity =>
        {
            entity.ToTable("workspaces");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Slug).IsUnique();
        });

        modelBuilder.Entity<WorkspaceMember>(entity =>
        {
            entity.ToTable("workspace_members");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Workspace).WithMany(w => w.Members).HasForeignKey(e => e.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkspaceAuditLog>(entity =>
        {
            entity.ToTable("workspace_audit_logs");
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<IssueLink>(entity =>
        {
            entity.ToTable("issue_links");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SourceIssueKey).HasMaxLength(50).IsRequired();
            entity.Property(e => e.TargetIssueKey).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Relationship).HasMaxLength(50).IsRequired();
        });

        modelBuilder.Entity<UserNotification>(entity =>
        {
            entity.ToTable("user_notifications");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.RecipientName, e.IsRead, e.CreatedAt });
            entity.Property(e => e.RecipientName).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(250).IsRequired();
            entity.Property(e => e.Action).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
        });
    }
}
