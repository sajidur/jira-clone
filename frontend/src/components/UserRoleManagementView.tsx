'use client';

import React, { useState, useEffect } from 'react';
import {
  Project,
  AppUser,
  ProjectMember,
  ProjectPermission,
  PermissionDefinition,
  UserGroup,
  ProjectTeam,
  AppAccessSetting
} from '@/types/jira';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchRoles,
  fetchProjectMembers,
  addProjectMember,
  removeProjectMember,
  fetchProjectPermissions,
  toggleProjectPermission,
  fetchGroups,
  createGroup,
  deleteGroup,
  fetchTeams,
  createTeam,
  deleteTeam,
  fetchAppAccess,
  toggleAppAccess,
  updateAppAccess
} from '@/lib/api';
import { Icons } from './Icons';

interface UserRoleManagementViewProps {
  currentProject: Project;
}

type TabKey = 'directory' | 'members' | 'permissions' | 'groups' | 'teams' | 'app-access';
type UserTypeFilter = 'all' | 'Internal' | 'External' | 'Contractor';

export default function UserRoleManagementView({ currentProject }: UserRoleManagementViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('directory');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<{ name: string; description: string }[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [permissions, setPermissions] = useState<ProjectPermission[]>([]);
  const [permissionDefs, setPermissionDefs] = useState<PermissionDefinition[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [teams, setTeams] = useState<ProjectTeam[]>([]);
  const [appAccess, setAppAccess] = useState<AppAccessSetting[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<UserTypeFilter>('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  // User Form states
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Developer');
  const [formUserType, setFormUserType] = useState('Internal');
  const [formDept, setFormDept] = useState('Engineering');
  const [formJobTitle, setFormJobTitle] = useState('Software Engineer');
  const [formActive, setFormActive] = useState(true);
  const [formSelectedGroups, setFormSelectedGroups] = useState<string[]>(['jira-software-users']);
  const [formSelectedApps, setFormSelectedApps] = useState<string[]>(['jira-software']);

  // Add Member Form
  const [selectedUserIdForMember, setSelectedUserIdForMember] = useState<number | ''>('');
  const [selectedRoleForMember, setSelectedRoleForMember] = useState('Developer');

  // Create Group Form
  const [formGroupName, setFormGroupName] = useState('');
  const [formGroupDesc, setFormGroupDesc] = useState('');
  const [formGroupDefault, setFormGroupDefault] = useState(false);

  // Create Team Form
  const [formTeamName, setFormTeamName] = useState('');
  const [formTeamDesc, setFormTeamDesc] = useState('');
  const [formTeamLeadName, setFormTeamLeadName] = useState('');
  const [formTeamLeadEmail, setFormTeamLeadEmail] = useState('');
  const [formTeamMembers, setFormTeamMembers] = useState<string[]>([]);

  // Seat editor modal
  const [editingSeatApp, setEditingSeatApp] = useState<AppAccessSetting | null>(null);
  const [editSeatCount, setEditSeatCount] = useState<number>(25);

  useEffect(() => {
    loadData();
  }, [currentProject.id]);

  async function loadData() {
    try {
      setLoading(true);
      const [uData, rData, mData, pData, gData, tData, aData] = await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchProjectMembers(currentProject.id),
        fetchProjectPermissions(currentProject.id),
        fetchGroups(),
        fetchTeams(currentProject.id),
        fetchAppAccess()
      ]);
      setUsers(uData);
      setRoles(rData);
      setMembers(mData);
      setPermissions(pData.matrix);
      setPermissionDefs(pData.definitions);
      setGroups(gData);
      setTeams(tData);
      setAppAccess(aData);
    } catch (err) {
      console.error('Failed to load user and role data', err);
    } finally {
      setLoading(false);
    }
  }

  // User Handlers
  async function handleCreateUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formDisplayName.trim() || !formEmail.trim()) return;

    try {
      await createUser({
        displayName: formDisplayName.trim(),
        emailAddress: formEmail.trim(),
        role: formRole,
        userType: formUserType,
        department: formDept.trim(),
        jobTitle: formJobTitle.trim(),
        groups: formSelectedGroups,
        appAccess: formSelectedApps
      } as any);
      setShowAddUserModal(false);
      resetUserForm();
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  }

  async function handleUpdateUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateUser(editingUser.id, {
        displayName: formDisplayName.trim(),
        emailAddress: formEmail.trim(),
        role: formRole,
        userType: formUserType,
        department: formDept.trim(),
        jobTitle: formJobTitle.trim(),
        active: formActive,
        groups: formSelectedGroups,
        appAccess: formSelectedApps
      } as any);
      setEditingUser(null);
      resetUserForm();
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  }

  async function handleDeactivateUser(id: number) {
    if (!confirm('Are you sure you want to deactivate this user? They will lose access to Jira and assigned issues.')) return;
    try {
      await deleteUser(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate user');
    }
  }

  function openEditUser(user: AppUser) {
    setEditingUser(user);
    setFormDisplayName(user.displayName);
    setFormEmail(user.emailAddress);
    setFormRole(user.role || 'Developer');
    setFormUserType(user.userType || 'Internal');
    setFormDept(user.department || 'Engineering');
    setFormJobTitle(user.jobTitle || 'Software Engineer');
    setFormActive(user.active);

    let parsedGroups: string[] = ['jira-software-users'];
    if (user.groupsJson) {
      try { parsedGroups = JSON.parse(user.groupsJson); } catch {}
    }
    setFormSelectedGroups(parsedGroups);

    let parsedApps: string[] = ['jira-software'];
    if (user.appAccessJson) {
      try { parsedApps = JSON.parse(user.appAccessJson); } catch {}
    }
    setFormSelectedApps(parsedApps);
  }

  function resetUserForm() {
    setFormDisplayName('');
    setFormEmail('');
    setFormRole('Developer');
    setFormUserType('Internal');
    setFormDept('Engineering');
    setFormJobTitle('Software Engineer');
    setFormActive(true);
    setFormSelectedGroups(['jira-software-users']);
    setFormSelectedApps(['jira-software']);
  }

  // Member Handlers
  async function handleAddMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserIdForMember) return;
    try {
      await addProjectMember({
        projectId: currentProject.id,
        userId: Number(selectedUserIdForMember),
        role: selectedRoleForMember
      });
      setShowAddMemberModal(false);
      setSelectedUserIdForMember('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add project member');
    }
  }

  async function handleRemoveMember(id: number) {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await removeProjectMember(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  }

  // Permission Matrix Toggle
  async function handleTogglePermission(permKey: string, roleName: string, currentAllowed: boolean) {
    const updated = !currentAllowed;
    // Optimistic UI update
    setPermissions(prev =>
      prev.map(p =>
        p.permissionKey === permKey && p.role === roleName ? { ...p, isAllowed: updated } : p
      )
    );

    try {
      await toggleProjectPermission({
        projectId: currentProject.id,
        permissionKey: permKey,
        role: roleName,
        isAllowed: updated
      });
    } catch (err) {
      // Revert on error
      setPermissions(prev =>
        prev.map(p =>
          p.permissionKey === permKey && p.role === roleName ? { ...p, isAllowed: currentAllowed } : p
        )
      );
      alert('Failed to update permission');
    }
  }

  // Group Handlers
  async function handleCreateGroupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formGroupName.trim()) return;
    try {
      await createGroup({
        name: formGroupName.trim(),
        description: formGroupDesc.trim(),
        isDefault: formGroupDefault
      });
      setShowCreateGroupModal(false);
      setFormGroupName('');
      setFormGroupDesc('');
      setFormGroupDefault(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    }
  }

  async function handleDeleteGroup(id: number, name: string) {
    if (!confirm(`Delete group "${name}"? Members assigned to this group will lose group rights.`)) return;
    try {
      await deleteGroup(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete group');
    }
  }

  // Team Handlers
  async function handleCreateTeamSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTeamName.trim()) return;
    try {
      await createTeam({
        projectId: currentProject.id,
        name: formTeamName.trim(),
        description: formTeamDesc.trim(),
        leadName: formTeamLeadName.trim() || undefined,
        leadEmail: formTeamLeadEmail.trim() || undefined,
        members: formTeamMembers
      });
      setShowCreateTeamModal(false);
      setFormTeamName('');
      setFormTeamDesc('');
      setFormTeamLeadName('');
      setFormTeamLeadEmail('');
      setFormTeamMembers([]);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create team');
    }
  }

  async function handleDeleteTeam(id: number, name: string) {
    if (!confirm(`Delete team "${name}"? This will not delete individual user accounts.`)) return;
    try {
      await deleteTeam(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete team');
    }
  }

  // App Access Handlers
  async function handleToggleApp(id: number) {
    try {
      await toggleAppAccess(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle application access');
    }
  }

  async function handleUpdateSeatsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSeatApp) return;
    try {
      await updateAppAccess(editingSeatApp.id, { licensedSeats: editSeatCount });
      setEditingSeatApp(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update licensed seats');
    }
  }

  const roleColors: Record<string, string> = {
    Administrator: 'bg-purple-100 text-purple-800 border-purple-200',
    'Project Lead': 'bg-blue-100 text-blue-800 border-blue-200',
    Developer: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'QA Engineer': 'bg-amber-100 text-amber-800 border-amber-200',
    'Product Owner': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    Viewer: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const userTypeBadges: Record<string, { label: string; class: string }> = {
    Internal: { label: 'Internal User', class: 'bg-sky-50 text-sky-700 border-sky-200' },
    External: { label: 'External Partner', class: 'bg-purple-50 text-purple-700 border-purple-200' },
    Contractor: { label: 'Contractor', class: 'bg-amber-50 text-amber-700 border-amber-200' }
  };

  const filteredUsers = users.filter(u => {
    if (userTypeFilter !== 'all' && (u.userType || 'Internal') !== userTypeFilter) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.emailAddress.toLowerCase().includes(q) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.userType && u.userType.toLowerCase().includes(q))
    );
  });

  // Group permission definitions by category
  const permissionCategories = Array.from(new Set(permissionDefs.map(d => d.category)));

  return (
    <div className="flex-1 min-w-0 w-full overflow-y-auto bg-slate-50 min-h-0 p-4 sm:p-6 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <span>{currentProject.name} ({currentProject.key})</span>
              <span>/</span>
              <span className="font-semibold text-slate-700">Enterprise Administration</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Icons.Shield className="w-6 h-6 text-[#0052cc]" />
              User, Role, Team & Access Management
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Jira-compatible enterprise access governance: manage internal/external staff, squads, security groups, 
              granular permission schemes, and Atlassian Cloud application seat licensing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetUserForm();
                setShowAddUserModal(true);
              }}
              className="px-3.5 py-2 bg-[#0052cc] hover:bg-[#0065ff] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Icons.Plus className="w-3.5 h-3.5" />
              <span>+ Invite / Add User</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl overflow-x-auto">
          {[
            { id: 'directory', label: `Users Directory (${users.length})`, icon: Icons.User },
            { id: 'members', label: `Project Members (${members.length})`, icon: Icons.Layers },
            { id: 'permissions', label: 'Permission Schemes Matrix', icon: Icons.Shield },
            { id: 'groups', label: `Groups (${groups.length})`, icon: Icons.Users },
            { id: 'teams', label: `Teams / Squads (${teams.length})`, icon: Icons.Kanban },
            { id: 'app-access', label: 'Application Access & Seats', icon: Icons.Cpu }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-[#0052cc] text-[#0052cc]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: USERS DIRECTORY */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'directory' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-sm">
                  <Icons.Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0052cc]"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  {(['all', 'Internal', 'External', 'Contractor'] as UserTypeFilter[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setUserTypeFilter(type)}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        userTypeFilter === type
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Showing <strong>{filteredUsers.length}</strong> of {users.length} users</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">User Type</th>
                    <th className="py-2.5 px-3">Global Role</th>
                    <th className="py-2.5 px-3">Department & Title</th>
                    <th className="py-2.5 px-3">Groups</th>
                    <th className="py-2.5 px-3">App Access</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(user => {
                    const colorClass = roleColors[user.role || 'Developer'] || roleColors.Developer;
                    const typeConfig = userTypeBadges[user.userType || 'Internal'] || userTypeBadges.Internal;

                    let userGroups: string[] = [];
                    if (user.groupsJson) {
                      try { userGroups = JSON.parse(user.groupsJson); } catch {}
                    }

                    let userApps: string[] = [];
                    if (user.appAccessJson) {
                      try { userApps = JSON.parse(user.appAccessJson); } catch {}
                    }

                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 whitespace-nowrap flex items-center gap-2.5">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#0052cc] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {user.displayName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900">{user.displayName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{user.emailAddress}</div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeConfig.class}`}>
                            {typeConfig.label}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}>
                            {user.role || 'Developer'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="text-slate-800 font-medium">{user.jobTitle || '-'}</div>
                          <div className="text-[10px] text-slate-400">{user.department || '-'}</div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {userGroups.length > 0 ? (
                              userGroups.map(g => (
                                <span key={g} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px] border border-slate-200">
                                  {g}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">None</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {userApps.map(a => (
                              <span key={a} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-semibold border border-blue-100">
                                {a}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {user.active ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEditUser(user)}
                            className="text-xs text-[#0052cc] hover:underline font-semibold mr-3 cursor-pointer"
                          >
                            Edit
                          </button>
                          {user.active && (
                            <button
                              onClick={() => handleDeactivateUser(user.id)}
                              className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: PROJECT TEAM MEMBERS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Project Members & Access Roles</h2>
                <p className="text-xs text-slate-500">
                  Users who have active access to participate in <strong>{currentProject.name}</strong> ({currentProject.key}).
                </p>
              </div>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-3.5 py-1.5 bg-[#0052cc] hover:bg-[#0065ff] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>+ Add Team Member</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map(member => {
                const u = member.user;
                if (!u) return null;
                const colorClass = roleColors[member.role] || roleColors.Developer;
                const typeConfig = userTypeBadges[u.userType || 'Internal'] || userTypeBadges.Internal;

                return (
                  <div key={member.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#0052cc] text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {u.displayName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{u.displayName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px] font-mono">{u.emailAddress}</div>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}>
                            {member.role}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${typeConfig.class}`}>
                            {u.userType || 'Internal'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-slate-400 hover:text-red-600 p-1 transition cursor-pointer"
                      title="Remove from project"
                    >
                      <Icons.Trash className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: PERMISSION SCHEMES MATRIX */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'permissions' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Project Permission Scheme Matrix</h2>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                    Default Scrum Scheme
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Configure which roles are granted specific rights across project administration, agile sprint management, and issue lifecycles.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <Icons.Shield className="w-4 h-4 text-[#0052cc]" />
                <span>Changes save immediately to PostgreSQL</span>
              </div>
            </div>

            {/* Categorized matrix */}
            <div className="space-y-6">
              {permissionCategories.map(cat => {
                const catDefs = permissionDefs.filter(d => d.category === cat);
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{cat}</h3>
                      <div className="h-px bg-slate-200 flex-1" />
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                          <tr>
                            <th className="py-2.5 px-4 min-w-[260px]">Permission</th>
                            {roles.map(r => (
                              <th key={r.name} className="py-2.5 px-3 text-center min-w-[100px]">
                                <div className="font-semibold text-slate-900">{r.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">Role</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {catDefs.map(def => (
                            <tr key={def.key} className="hover:bg-slate-50 transition">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{def.name}</div>
                                <div className="text-[11px] text-slate-500 leading-snug">{def.description}</div>
                                <span className="inline-block mt-1 font-mono text-[9px] text-slate-400">
                                  KEY: {def.key}
                                </span>
                              </td>

                              {roles.map(role => {
                                const perm = permissions.find(
                                  p => p.permissionKey === def.key && p.role === role.name
                                );
                                const isChecked = perm?.isAllowed ?? false;
                                const isOwner = role.name === 'Administrator';

                                return (
                                  <td key={role.name} className="py-3 px-3 text-center align-middle">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={isOwner && def.key === 'ADMINISTER_PROJECTS'}
                                      onChange={() => handleTogglePermission(def.key, role.name, isChecked)}
                                      className="w-4 h-4 text-[#0052cc] rounded border-slate-300 focus:ring-[#0052cc] cursor-pointer disabled:opacity-50"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: GROUPS MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'groups' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Jira User Groups</h2>
                <p className="text-xs text-slate-500">
                  Groups allow you to grant permissions, project access, and application seats to multiple users at once.
                </p>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="px-3.5 py-1.5 bg-[#0052cc] hover:bg-[#0065ff] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>+ Create Group</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Group Name</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Default for New Users</th>
                    <th className="py-2.5 px-4 text-center">Members Count</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map(group => {
                    const isSystem = ['jira-administrators', 'jira-software-users', 'jira-servicemanagement-users', 'site-admins'].includes(group.name);
                    // Count how many users have this group in their groupsJson
                    const assignedCount = users.filter(u => {
                      if (!u.groupsJson) return false;
                      try {
                        const parsed: string[] = JSON.parse(u.groupsJson);
                        return parsed.includes(group.name);
                      } catch { return false; }
                    }).length;

                    return (
                      <tr key={group.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center gap-2">
                          <Icons.Users className="w-4 h-4 text-slate-400" />
                          <span>{group.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-sm">{group.description || '-'}</td>
                        <td className="py-3 px-4">
                          {isSystem ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              System Default
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Custom Group
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {group.isDefault ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <Icons.Check className="w-3.5 h-3.5" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {assignedCount} members
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isSystem && (
                            <button
                              onClick={() => handleDeleteGroup(group.id, group.name)}
                              className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: TEAMS / SQUADS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'teams' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Project Squads & Guilds</h2>
                <p className="text-xs text-slate-500">
                  Cross-functional agile teams collaborating within <strong>{currentProject.name}</strong>.
                </p>
              </div>
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="px-3.5 py-1.5 bg-[#0052cc] hover:bg-[#0065ff] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>+ Create Squad / Team</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map(team => {
                let parsedMembers: string[] = [];
                if (team.membersJson) {
                  try { parsedMembers = JSON.parse(team.membersJson); } catch {}
                }

                return (
                  <div key={team.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Icons.Kanban className="w-4 h-4 text-[#0052cc]" />
                          <span>{team.name}</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{team.description || 'No description provided.'}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Delete squad"
                      >
                        <Icons.Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs border-t border-slate-200 pt-2 space-y-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-semibold">Team Lead:</span>
                        <span className="font-medium text-slate-900">{team.leadName || 'Unassigned'}</span>
                      </div>
                      {team.leadEmail && (
                        <div className="text-[11px] text-slate-400 font-mono text-right">{team.leadEmail}</div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 pt-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                        <span>Squad Members:</span>
                        <span className="text-[11px] text-slate-500 font-normal">{parsedMembers.length} members</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {parsedMembers.map(m => (
                          <span key={m} className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 text-[10px] font-medium shadow-2xs">
                            {m}
                          </span>
                        ))}
                        {parsedMembers.length === 0 && (
                          <span className="text-slate-400 text-xs italic">No members assigned yet.</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: APPLICATION ACCESS & LICENSING */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'app-access' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900">Application Access & License Seats</h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage Atlassian product licenses, user seat caps, and default group access per application.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appAccess.map(app => {
                // Calculate assigned seats based on users who have this app in appAccessJson
                const assignedUsers = users.filter(u => {
                  if (!u.appAccessJson) return false;
                  try {
                    const parsed: string[] = JSON.parse(u.appAccessJson);
                    return parsed.includes(app.appKey);
                  } catch { return false; }
                }).length;

                const percentUsed = Math.min(100, Math.round((assignedUsers / (app.licensedSeats || 1)) * 100));

                return (
                  <div key={app.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#0052cc] flex items-center justify-center font-bold">
                          <Icons.Cpu className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span>{app.appName}</span>
                            {app.isEnabled ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600">
                                Disabled
                              </span>
                            )}
                          </h3>
                          <div className="text-[11px] text-slate-400 font-mono">Key: {app.appKey}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleApp(app.id)}
                        className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                          app.isEnabled
                            ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            : 'bg-[#0052cc] text-white hover:bg-[#0065ff]'
                        }`}
                      >
                        {app.isEnabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-600">{app.description}</p>

                    {/* Seat Usage Progress */}
                    <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700">Seat Allocation:</span>
                        <span className="text-slate-900 font-bold font-mono">
                          {assignedUsers} / {app.licensedSeats} seats used ({percentUsed}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            percentUsed > 90 ? 'bg-rose-500' : percentUsed > 75 ? 'bg-amber-500' : 'bg-[#0052cc]'
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Default Group: <code className="font-mono text-slate-700">{app.defaultGroup}</code></span>
                        <button
                          onClick={() => {
                            setEditingSeatApp(app);
                            setEditSeatCount(app.licensedSeats);
                          }}
                          className="text-[#0052cc] hover:underline font-semibold cursor-pointer"
                        >
                          Change Seat Limit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE USER */}
      {/* ------------------------------------------------------------- */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icons.User className="w-5 h-5 text-[#0052cc]" />
                <span>Invite & Add User</span>
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tariqul Islam"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#0052cc]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="tariqul@akij.net"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#0052cc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User Classification *</label>
                  <select
                    value={formUserType}
                    onChange={(e) => setFormUserType(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                  >
                    <option value="Internal">Internal Domain User</option>
                    <option value="External">External Partner / Client</option>
                    <option value="Contractor">External Contractor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Global System Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                  >
                    {roles.map(r => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Group Memberships */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Group Memberships</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {groups.map(g => {
                    const isChecked = formSelectedGroups.includes(g.name);
                    return (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSelectedGroups([...formSelectedGroups, g.name]);
                            } else {
                              setFormSelectedGroups(formSelectedGroups.filter(x => x !== g.name));
                            }
                          }}
                          className="rounded text-[#0052cc]"
                        />
                        <span className="font-mono text-[11px]">{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Application Seat Access */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Licensed Application Access</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {appAccess.map(a => {
                    const isChecked = formSelectedApps.includes(a.appKey);
                    return (
                      <label key={a.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSelectedApps([...formSelectedApps, a.appKey]);
                            } else {
                              setFormSelectedApps(formSelectedApps.filter(x => x !== a.appKey));
                            }
                          }}
                          className="rounded text-[#0052cc]"
                        />
                        <span>{a.appName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm"
                >
                  Create & Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT USER */}
      {/* ------------------------------------------------------------- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icons.User className="w-5 h-5 text-[#0052cc]" />
                <span>Edit User Details: {editingUser.displayName}</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User Classification</label>
                  <select
                    value={formUserType}
                    onChange={(e) => setFormUserType(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                  >
                    <option value="Internal">Internal Domain User</option>
                    <option value="External">External Partner / Client</option>
                    <option value="Contractor">External Contractor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Global Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                  >
                    {roles.map(r => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Group Memberships */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Group Memberships</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {groups.map(g => {
                    const isChecked = formSelectedGroups.includes(g.name);
                    return (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSelectedGroups([...formSelectedGroups, g.name]);
                            } else {
                              setFormSelectedGroups(formSelectedGroups.filter(x => x !== g.name));
                            }
                          }}
                          className="rounded text-[#0052cc]"
                        />
                        <span className="font-mono text-[11px]">{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Application Seat Access */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Licensed Application Access</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {appAccess.map(a => {
                    const isChecked = formSelectedApps.includes(a.appKey);
                    return (
                      <label key={a.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSelectedApps([...formSelectedApps, a.appKey]);
                            } else {
                              setFormSelectedApps(formSelectedApps.filter(x => x !== a.appKey));
                            }
                          }}
                          className="rounded text-[#0052cc]"
                        />
                        <span>{a.appName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded text-[#0052cc]"
                  />
                  <span>Active Account (Able to login and participate)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD MEMBER TO PROJECT */}
      {/* ------------------------------------------------------------- */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add Team Member to Project</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select User *</label>
                <select
                  required
                  value={selectedUserIdForMember}
                  onChange={(e) => setSelectedUserIdForMember(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">-- Choose User --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.emailAddress}) [{u.userType || 'Internal'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Role *</label>
                <select
                  value={selectedRoleForMember}
                  onChange={(e) => setSelectedRoleForMember(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  {roles.map(r => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedUserIdForMember}
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm disabled:opacity-50"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE GROUP */}
      {/* ------------------------------------------------------------- */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icons.Users className="w-5 h-5 text-[#0052cc]" />
                <span>Create User Group</span>
              </h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. external-contractors"
                  value={formGroupName}
                  onChange={(e) => setFormGroupName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
                <span className="text-[10px] text-slate-400">Lowercase hyphenated naming recommended.</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Third-party vendor developers and contractors with restricted access."
                  value={formGroupDesc}
                  onChange={(e) => setFormGroupDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formGroupDefault}
                    onChange={(e) => setFormGroupDefault(e.target.checked)}
                    className="rounded text-[#0052cc]"
                  />
                  <span>Automatically assign this group to new users</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE TEAM / SQUAD */}
      {/* ------------------------------------------------------------- */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icons.Kanban className="w-5 h-5 text-[#0052cc]" />
                <span>Create Squad / Team</span>
              </h3>
              <button onClick={() => setShowCreateTeamModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Squad Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payments & Billing Squad"
                  value={formTeamName}
                  onChange={(e) => setFormTeamName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Squad Goal / Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Focuses on checkout funnels, payment gateways and ERP integration."
                  value={formTeamDesc}
                  onChange={(e) => setFormTeamDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sajidur Rahman"
                    value={formTeamLeadName}
                    onChange={(e) => setFormTeamLeadName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Email</label>
                  <input
                    type="email"
                    placeholder="sajidur@akij.net"
                    value={formTeamLeadEmail}
                    onChange={(e) => setFormTeamLeadEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Select Squad Members</label>
                <div className="max-h-36 overflow-y-auto bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  {users.map(u => {
                    const isChecked = formTeamMembers.includes(u.displayName);
                    return (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormTeamMembers([...formTeamMembers, u.displayName]);
                            } else {
                              setFormTeamMembers(formTeamMembers.filter(x => x !== u.displayName));
                            }
                          }}
                          className="rounded text-[#0052cc]"
                        />
                        <span>{u.displayName} <span className="text-[10px] text-slate-400 font-mono">({u.role})</span></span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm"
                >
                  Create Squad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT SEAT LIMIT */}
      {/* ------------------------------------------------------------- */}
      {editingSeatApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Adjust Licensed Seats</h3>
              <button onClick={() => setEditingSeatApp(null)} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSeatsSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Product: {editingSeatApp.appName}
                </label>
                <p className="text-slate-500 mb-2">Specify the licensed seats capacity for this application tier.</p>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={editSeatCount}
                  onChange={(e) => setEditSeatCount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-slate-900 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingSeatApp(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm"
                >
                  Update Capacity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
