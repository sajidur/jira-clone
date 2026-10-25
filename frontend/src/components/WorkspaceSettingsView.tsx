'use client';

import React, { useState, useEffect } from 'react';
import { Workspace, WorkspaceMember, WorkspaceAuditLog, AppUser, Project } from '@/types/jira';
import {
  fetchWorkspace,
  updateWorkspaceGeneral,
  updateWorkspaceSecurity,
  updateWorkspaceFeatures,
  fetchWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
  fetchWorkspaceAuditLogs,
  fetchUsers,
  fetchProjects,
  updateProject
} from '@/lib/api';
import { Icons } from './Icons';
import { EditSpaceModal } from './EditSpaceModal';
import { SpaceAvatar } from './SpaceAvatar';

interface WorkspaceSettingsViewProps {
  currentWorkspace: Workspace;
  onWorkspaceUpdated?: (ws: Workspace) => void;
  onSelectProject?: (p: Project) => void;
  onNavigateView?: (view: any) => void;
  onOpenCreateProject?: () => void;
  onProjectUpdated?: (p: Project) => void;
}

type WorkspaceTab =
  | 'general'
  | 'projects'
  | 'products'
  | 'security'
  | 'features'
  | 'members'
  | 'billing-storage'
  | 'audit-logs';

export const WorkspaceSettingsView: React.FC<WorkspaceSettingsViewProps> = ({
  currentWorkspace,
  onWorkspaceUpdated,
  onSelectProject,
  onNavigateView,
  onOpenCreateProject,
  onProjectUpdated
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('general');
  const [workspace, setWorkspace] = useState<Workspace>(currentWorkspace);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<WorkspaceAuditLog[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // General Form
  const [formName, setFormName] = useState(workspace.name);
  const [formSlug, setFormSlug] = useState(workspace.slug);
  const [formDesc, setFormDesc] = useState(workspace.description || '');
  const [formDomain, setFormDomain] = useState(workspace.domain);
  const [formTimezone, setFormTimezone] = useState(workspace.timezone);
  const [formDateFormat, setFormDateFormat] = useState(workspace.dateFormat);
  const [formLang, setFormLang] = useState(workspace.defaultLanguage);

  // Security Form
  const [sec2Fa, setSec2Fa] = useState(workspace.requireTwoFactor);
  const [secSso, setSecSso] = useState(workspace.enforceSso);
  const [secDomains, setSecDomains] = useState(workspace.allowedDomainRestrictions || '');
  const [secTimeout, setSecTimeout] = useState(workspace.sessionTimeoutMinutes);
  const [secIpList, setSecIpList] = useState(workspace.ipAllowlist || '');

  // Features Form
  const [featSprints, setFeatSprints] = useState(workspace.enableSprints);
  const [featRoadmaps, setFeatRoadmaps] = useState(workspace.enableRoadmaps);
  const [featTime, setFeatTime] = useState(workspace.enableTimeTracking);
  const [featJql, setFeatJql] = useState(workspace.enableJqlAdvancedSearch);
  const [featAuto, setFeatAuto] = useState(workspace.enableAutomations);
  const [featExternal, setFeatExternal] = useState(workspace.enableExternalSharing);
  const [featAi, setFeatAi] = useState(workspace.enableAiAssistance);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserId, setInviteUserId] = useState<number | ''>('');
  const [inviteRole, setInviteRole] = useState('Member');

  useEffect(() => {
    loadWorkspaceDetails();
  }, [currentWorkspace.id]);

  const loadWorkspaceDetails = async () => {
    try {
      setLoading(true);
      const [ws, mems, logs, uList, pList] = await Promise.all([
        fetchWorkspace(currentWorkspace.id),
        fetchWorkspaceMembers(currentWorkspace.id),
        fetchWorkspaceAuditLogs(currentWorkspace.id),
        fetchUsers(),
        fetchProjects(currentWorkspace.id)
      ]);
      setWorkspace(ws);
      setMembers(mems);
      setAuditLogs(logs);
      setAllUsers(uList);
      setProjectsList(pList);

      setFormName(ws.name);
      setFormSlug(ws.slug);
      setFormDesc(ws.description || '');
      setFormDomain(ws.domain);
      setFormTimezone(ws.timezone);
      setFormDateFormat(ws.dateFormat);
      setFormLang(ws.defaultLanguage);

      setSec2Fa(ws.requireTwoFactor);
      setSecSso(ws.enforceSso);
      setSecDomains(ws.allowedDomainRestrictions || '');
      setSecTimeout(ws.sessionTimeoutMinutes);
      setSecIpList(ws.ipAllowlist || '');

      setFeatSprints(ws.enableSprints);
      setFeatRoadmaps(ws.enableRoadmaps);
      setFeatTime(ws.enableTimeTracking);
      setFeatJql(ws.enableJqlAdvancedSearch);
      setFeatAuto(ws.enableAutomations);
      setFeatExternal(ws.enableExternalSharing);
      setFeatAi(ws.enableAiAssistance);
    } catch (err) {
      console.error('Failed to load workspace configuration', err);
    } finally {
      setLoading(false);
    }
  };

  const flashSuccess = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // General Update
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateWorkspaceGeneral(workspace.id, {
        name: formName.trim(),
        slug: formSlug.trim(),
        description: formDesc.trim(),
        domain: formDomain.trim(),
        timezone: formTimezone,
        dateFormat: formDateFormat,
        defaultLanguage: formLang
      });
      setWorkspace(updated);
      onWorkspaceUpdated?.(updated);
      flashSuccess('Workspace general profile updated successfully.');
      loadWorkspaceDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update general settings');
    }
  };

  // Security Update
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateWorkspaceSecurity(workspace.id, {
        requireTwoFactor: sec2Fa,
        enforceSso: secSso,
        allowedDomainRestrictions: secDomains.trim(),
        sessionTimeoutMinutes: Number(secTimeout) || 1440,
        ipAllowlist: secIpList.trim() || undefined
      });
      setWorkspace(updated);
      onWorkspaceUpdated?.(updated);
      flashSuccess('Security policies and compliance settings updated.');
      loadWorkspaceDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update security settings');
    }
  };

  // Features Update
  const handleSaveFeatures = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await updateWorkspaceFeatures(workspace.id, {
        enableSprints: featSprints,
        enableRoadmaps: featRoadmaps,
        enableTimeTracking: featTime,
        enableJqlAdvancedSearch: featJql,
        enableAutomations: featAuto,
        enableExternalSharing: featExternal,
        enableAiAssistance: featAi
      });
      setWorkspace(updated);
      onWorkspaceUpdated?.(updated);
      flashSuccess('Workspace feature flags updated.');
      loadWorkspaceDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to update feature flags');
    }
  };

  // Members
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUserId) return;
    try {
      await addWorkspaceMember(workspace.id, {
        userId: Number(inviteUserId),
        role: inviteRole
      });
      setShowInviteModal(false);
      setInviteUserId('');
      flashSuccess('Member successfully added to workspace.');
      loadWorkspaceDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Remove member from this workspace? They will lose access to all projects in this organization.')) return;
    try {
      await removeWorkspaceMember(workspace.id, memberId);
      flashSuccess('Member removed from workspace.');
      loadWorkspaceDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const percentStorage = Math.min(100, Math.round((workspace.storageUsedMb / (workspace.storageLimitMb || 1)) * 100));

  return (
    <div className="flex-1 min-w-0 w-full overflow-y-auto bg-slate-50 h-[calc(100vh-3.5rem)] p-4 sm:p-6 select-none font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0052cc] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {workspace.slug.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{workspace.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase border border-purple-200">
                  {workspace.planTier} Tier
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                <span>{workspace.domain || `${workspace.slug}.internal`}</span>
                <span>•</span>
                <span className="px-2 py-0.5 bg-blue-50 text-[#0052cc] rounded font-sans text-[10px] font-bold">
                  On-Premises Server
                </span>
              </div>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Icons.Check className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl overflow-x-auto">
          {[
            { id: 'general', label: '1. General & Site URL', icon: Icons.Folder },
            { id: 'projects', label: `2. Projects Directory (${projectsList.length})`, icon: Icons.Compass },
            { id: 'products', label: '3. Products & Apps', icon: Icons.AppSwitcher },
            { id: 'security', label: '4. Security & Compliance', icon: Icons.Shield },
            { id: 'features', label: '5. Feature Flags & Modules', icon: Icons.Sliders },
            { id: 'members', label: `6. Members & Directory (${members.length})`, icon: Icons.Users },
            { id: 'billing-storage', label: '7. Quota & Storage', icon: Icons.Database },
            { id: 'audit-logs', label: `8. Audit Trail (${auditLogs.length})`, icon: Icons.FileText }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorkspaceTab)}
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
        {/* TAB 1: GENERAL & ORGANIZATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Workspace Profile & Brand Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Top-level identity parameters for your organization across Jira and connected Atlassian Cloud applications.
              </p>
            </div>

            <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Organization / Workspace Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#0052cc] text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Workspace Key / Identifier *</label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                    placeholder="e.g. rexsystem, akij-erp"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Organization Purpose</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describes your company, enterprise division, or business unit."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Company Domain</label>
                  <input
                    type="text"
                    value={formDomain}
                    onChange={(e) => setFormDomain(e.target.value)}
                    placeholder="akij.net"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Timezone</label>
                  <select
                    value={formTimezone}
                    onChange={(e) => setFormTimezone(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="UTC+06:00 (Asia/Dhaka)">UTC+06:00 (Asia/Dhaka)</option>
                    <option value="UTC+00:00 (London, GMT)">UTC+00:00 (London, GMT)</option>
                    <option value="UTC-05:00 (New York, EST)">UTC-05:00 (New York, EST)</option>
                    <option value="UTC-08:00 (San Francisco, PST)">UTC-08:00 (San Francisco, PST)</option>
                    <option value="UTC+01:00 (Berlin, CET)">UTC+01:00 (Berlin, CET)</option>
                    <option value="UTC+08:00 (Singapore, SGT)">UTC+08:00 (Singapore, SGT)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Format</label>
                  <select
                    value={formDateFormat}
                    onChange={(e) => setFormDateFormat(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Standard)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: PROJECTS DIRECTORY */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'projects' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Projects in this Workspace ({projectsList.length})</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  All Jira software and business projects hosted on <span className="font-mono text-[#0052cc] font-semibold">{workspace.domain || `${workspace.slug}.internal`}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenCreateProject}
                className="px-3.5 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>Create Project</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Key</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Project Lead</th>
                    <th className="px-4 py-3 text-center">Issues</th>
                    <th className="px-4 py-3 text-center">Active Sprints</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectsList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <SpaceAvatar project={p} size="sm" />
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            {p.description && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#0052cc]">{p.key}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {p.projectTypeKey === 'business' ? 'Business' : 'Company-managed Software'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium">{p.leadName || 'Unassigned'}</div>
                        <div className="text-[10px] text-slate-400">{p.leadEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">
                        {p.issueCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(p.activeSprintCount ?? 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {p.activeSprintCount} Active
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingProject(p)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition inline-flex items-center gap-1 cursor-pointer"
                          title="Edit space name & details"
                        >
                          <Icons.Edit className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject?.(p);
                            onNavigateView?.('board');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-[#0052cc] hover:bg-blue-50 rounded-md transition"
                        >
                          Open Board
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject?.(p);
                            onNavigateView?.('config');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition"
                        >
                          Settings
                        </button>
                      </td>
                    </tr>
                  ))}
                  {projectsList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                        No projects exist in this workspace yet. Click "Create Project" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: PRODUCTS & APPS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Atlassian Cloud Products & Access</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage product subscriptions, licensed seats, and default user access groups for this site.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {[
                {
                  key: 'jira-software',
                  name: 'Jira Software',
                  tier: 'Enterprise Cloud',
                  desc: 'Agile planning, Kanban & Scrum boards, Backlog, JQL engine, and release versions.',
                  seats: '25 Licensed',
                  assigned: `${members.length} Users`,
                  status: 'Active',
                  defaultGroup: 'jira-software-users',
                  color: 'bg-[#0052cc]'
                },
                {
                  key: 'jira-service-management',
                  name: 'Jira Service Management',
                  tier: 'Enterprise Cloud',
                  desc: 'Customer service desk, ITSM incident management, SLA tracking, and service requests.',
                  seats: '10 Licensed',
                  assigned: '2 Agents',
                  status: 'Active',
                  defaultGroup: 'jira-servicemanagement-users',
                  color: 'bg-sky-600'
                },
                {
                  key: 'jira-work-management',
                  name: 'Jira Work Management',
                  tier: 'Standard Cloud',
                  desc: 'Business team collaboration with spreadsheet views, project calendars, and form submissions.',
                  seats: '15 Licensed',
                  assigned: '3 Users',
                  status: 'Active',
                  defaultGroup: 'jira-software-users',
                  color: 'bg-emerald-600'
                }
              ].map((prod) => (
                <div key={prod.key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${prod.color} text-white font-bold text-xs flex items-center justify-center shadow-xs`}>
                        {prod.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{prod.name}</div>
                        <div className="text-[10px] text-slate-500">{prod.tier}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {prod.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{prod.desc}</p>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-700">Access Group: </span>
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{prod.defaultGroup}</span>
                    </div>
                    <div className="font-semibold text-slate-700">{prod.assigned} / {prod.seats}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: SECURITY & COMPLIANCE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Security Policies & Enterprise Compliance</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enforce multi-factor authentication, single sign-on (SSO), and restricted corporate email domain signup.
              </p>
            </div>

            <form onSubmit={handleSaveSecurity} className="space-y-5 text-xs max-w-2xl">
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sec2Fa}
                    onChange={(e) => setSec2Fa(e.target.checked)}
                    className="mt-0.5 rounded text-[#0052cc] w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Enforce Two-Factor Authentication (2FA)</span>
                    <span className="text-slate-500 leading-snug">
                      Requires all internal and external team members to verify via TOTP authenticator app upon sign in.
                    </span>
                  </div>
                </label>

                <div className="border-t border-slate-200 pt-3" />

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={secSso}
                    onChange={(e) => setSecSso(e.target.checked)}
                    className="mt-0.5 rounded text-[#0052cc] w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Enforce SAML 2.0 / Okta / Azure AD Single Sign-On</span>
                    <span className="text-slate-500 leading-snug">
                      Redirect all domain login requests to your corporate enterprise identity provider.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Allowed Email Domain Whitelist
                </label>
                <input
                  type="text"
                  placeholder="e.g. akij.net, vendor.com, partner.org"
                  value={secDomains}
                  onChange={(e) => setSecDomains(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Comma-separated list of corporate email domains authorized to register or access projects.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Session Inactivity Timeout (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    max={10080}
                    value={secTimeout}
                    onChange={(e) => setSecTimeout(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Default: 1440 minutes (24 hours)</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IP Allowlist (Optional CIDR Blocks)</label>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.0/24, 10.0.0.0/16"
                    value={secIpList}
                    onChange={(e) => setSecIpList(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Leave blank to permit access from any IP address</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Save Security Policies
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: FEATURE FLAGS & MODULES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'features' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Workspace Feature Modules & Capabilities</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or disable global features across all projects in <strong>{workspace.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleSaveFeatures} className="space-y-3.5 text-xs max-w-2xl">
              {[
                { title: 'Agile Scrum Sprints & Backlog Planning', desc: 'Allows teams to run iterative sprints, set sprint duration/goals, and execute sprint retrospectives.', val: featSprints, setVal: setFeatSprints },
                { title: 'Interactive Roadmap & Gantt Timeline', desc: 'Visual timeline with epic tracking, start and target dates, and release horizons.', val: featRoadmaps, setVal: setFeatRoadmaps },
                { title: 'Granular Time Tracking & Worklogs', desc: 'Permits team members to record work hours and estimate remaining completion time.', val: featTime, setVal: setFeatTime },
                { title: 'Jira Query Language (JQL) Search & Saved Filters', desc: 'Enables advanced querying (e.g. `project = ERP AND status = "In Progress"`).', val: featJql, setVal: setFeatJql },
                { title: 'No-Code Automation Engine', desc: 'Automates transitions, auto-assignments, and auto-resolutions with WHEN-IF-THEN triggers.', val: featAuto, setVal: setFeatAuto },
                { title: 'External Sharing & Contractor Collaboration', desc: 'Allows inviting external vendor contractors with restricted permission scoping.', val: featExternal, setVal: setFeatExternal },
                { title: 'AI-Powered Issue Summaries & Acceptance Criteria', desc: 'Machine intelligence assistant for generating user stories and smart triage.', val: featAi, setVal: setFeatAi }
              ].map(f => (
                <div key={f.title} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{f.title}</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{f.desc}</div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={f.val}
                      onChange={(e) => f.setVal(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0052cc]"></div>
                  </label>
                </div>
              ))}

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Save Feature Configurations
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: WORKSPACE MEMBERS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Workspace Members & Access Roles</h2>
                <p className="text-xs text-slate-500">
                  Users who have active membership across the <strong>{workspace.name}</strong> organization.
                </p>
              </div>

              <button
                onClick={() => setShowInviteModal(true)}
                className="px-3.5 py-1.5 bg-[#0052cc] hover:bg-[#0065ff] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>+ Invite Member</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Workspace Role</th>
                    <th className="py-2.5 px-3">User Classification</th>
                    <th className="py-2.5 px-3">Joined Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map(m => {
                    const u = m.user;
                    if (!u) return null;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 whitespace-nowrap flex items-center gap-2.5">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#0052cc] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {u.displayName.charAt(0)}
                            </div>
                          )}
                          <div className="font-semibold text-slate-900">{u.displayName}</div>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{u.emailAddress}</td>

                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.role === 'Owner'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : m.role === 'Admin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : m.role === 'Guest'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {m.role}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-slate-600">
                          {u.userType || 'Internal'}
                        </td>

                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          {m.role !== 'Owner' && (
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                            >
                              Remove
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
        {/* TAB 5: QUOTA & SUBSCRIPTIONS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'billing-storage' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900">Workspace Quota & Cloud Capacity</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Resource utilization, storage quota meters, and Atlassian Cloud Enterprise subscription metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Storage Gauge */}
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs">Attachment & DB Storage</span>
                  <Icons.Database className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {workspace.storageUsedMb} MB
                  <span className="text-xs font-normal text-slate-500 ml-1.5">/ {Math.round(workspace.storageLimitMb / 1024)} GB</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0052cc]" style={{ width: `${Math.max(2, percentStorage)}%` }} />
                </div>
                <div className="text-[11px] text-slate-500">{percentStorage}% quota consumed</div>
              </div>

              {/* Members Gauge */}
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs">Active User Seats</span>
                  <Icons.Users className="w-4 h-4 text-[#0052cc]" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {members.length} Seats
                  <span className="text-xs font-normal text-slate-500 ml-1.5">/ 50 Licensed</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.round((members.length / 50) * 100)}%` }} />
                </div>
                <div className="text-[11px] text-slate-500">{50 - members.length} seats available</div>
              </div>

              {/* Projects Gauge */}
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs">Projects In Workspace</span>
                  <Icons.Folder className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {workspace.projectCount ?? 1}
                  <span className="text-xs font-normal text-slate-500 ml-1.5">/ Unlimited</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: '10%' }} />
                </div>
                <div className="text-[11px] text-slate-500">Enterprise unlimited projects enabled</div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: AUDIT TRAIL */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'audit-logs' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Workspace Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Immutable security and administrative log tracking configuration updates, security adjustments, and user invitations.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{log.actorName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.actorEmail}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 max-w-md">{log.details}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: INVITE MEMBER */}
      {/* ------------------------------------------------------------- */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Invite User to Workspace</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select User *</label>
                <select
                  required
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="">-- Choose User --</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.emailAddress}) [{u.userType || 'Internal'}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Workspace Level Role *</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="Admin">Admin (Can configure workspace settings)</option>
                  <option value="Member">Member (Standard project collaborator)</option>
                  <option value="Guest">Guest (Restricted view permissions)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inviteUserId}
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm disabled:opacity-50"
                >
                  Add to Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Space Modal */}
      <EditSpaceModal
        isOpen={!!editingProject}
        space={editingProject}
        onClose={() => setEditingProject(null)}
        onUpdated={(updated) => {
          setProjectsList(prev => prev.map(pr => pr.id === updated.id ? updated : pr));
          onProjectUpdated?.(updated);
          setEditingProject(null);
        }}
      />
    </div>
  );
};

export default WorkspaceSettingsView;
