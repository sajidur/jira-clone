'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminOverview, AdminSession, AdminUser, SmtpSettings } from '@/types/jira';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  fetchAdminSessions,
  adminCreateUser,
  adminUpdateUser,
  adminSetPassword,
  adminSignOutUser,
  adminRevokeSession,
  adminSendPasswordEmail,
  fetchSmtpSettings,
  fetchRoles
} from '@/lib/api';
import { useAuth, useCurrentUser, getInitials } from './AuthProvider';
import { Icons } from './Icons';
import { Dialog, Lozenge, fieldClass } from './AdminUi';
import AdminEmailSettings from './AdminEmailSettings';
import type { ViewType } from './Navbar';

type AdminSection = 'overview' | 'users' | 'sessions' | 'email';
type StatusFilter = 'all' | 'active' | 'deactivated' | 'no-password';

const ADMIN_ROLE = 'Administrator';
const FALLBACK_ROLES = ['Administrator', 'Project Lead', 'Developer', 'QA Engineer', 'Product Owner', 'Viewer'];
const MIN_PASSWORD_LENGTH = 8;

interface AdminConsoleViewProps {
  onNavigateView: (view: ViewType) => void;
}

// Timestamps without a zone designator come from UTC columns
function parseUtc(value: string): Date {
  return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
}

function timeAgo(value?: string | null): string {
  if (!value) return 'Never';
  const seconds = Math.round((Date.now() - parseUtc(value).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return parseUtc(value).toLocaleDateString();
}

function formatDateTime(value: string): string {
  return parseUtc(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function describeDevice(userAgent?: string): string {
  if (!userAgent) return 'Unknown device';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : /^curl\//.test(userAgent)
              ? 'curl'
              : 'API client';
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/.test(userAgent)
        ? 'iOS'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : '';
  return os ? `${browser} on ${os}` : browser;
}

function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const values = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(values, (v) => alphabet[v % alphabet.length]).join('');
}

const UserAvatar: React.FC<{ name: string; url?: string; className?: string }> = ({
  name,
  url,
  className = 'w-8 h-8'
}) =>
  url ? (
    <img src={url} alt="" className={`${className} rounded-full object-cover shrink-0 bg-slate-100`} />
  ) : (
    <div
      className={`${className} rounded-full bg-[#0052CC] text-white text-[11px] font-bold flex items-center justify-center shrink-0`}
    >
      {getInitials(name)}
    </div>
  );

export default function AdminConsoleView({ onNavigateView }: AdminConsoleViewProps) {
  const me = useCurrentUser();
  const { refreshUser } = useAuth();

  const [section, setSection] = useState<AdminSection>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [smtp, setSmtp] = useState<SmtpSettings | null>(null);
  const [roles, setRoles] = useState<string[]>(FALLBACK_ROLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Users section filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Dialogs & menus
  const [userForm, setUserForm] = useState<{ mode: 'create' } | { mode: 'edit'; user: AdminUser } | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [menu, setMenu] = useState<{ user: AdminUser; top: number; right: number } | null>(null);

  const reload = useCallback(async () => {
    try {
      setError('');
      const [overviewData, userData, sessionData, smtpData] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminUsers(),
        fetchAdminSessions(),
        fetchSmtpSettings()
      ]);
      setOverview(overviewData);
      setUsers(userData);
      setSessions(sessionData);
      setSmtp(smtpData);
    } catch (err: any) {
      setError(err.message || 'Failed to load administration data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    fetchRoles().then((r) => {
      if (r.length > 0) setRoles(r.map((role) => role.name));
    });
  }, [reload]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      setError('');
      await action();
      setNotice(successMessage);
      await reload();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (
        q &&
        !u.displayName.toLowerCase().includes(q) &&
        !u.emailAddress.toLowerCase().includes(q) &&
        !u.name.toLowerCase().includes(q)
      )
        return false;
      if (statusFilter === 'active' && !u.active) return false;
      if (statusFilter === 'deactivated' && u.active) return false;
      if (statusFilter === 'no-password' && (u.hasPassword || !u.active)) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      return true;
    });
  }, [users, search, statusFilter, roleFilter]);

  const openMenu = (user: AdminUser, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ user, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const toggleAdmin = (user: AdminUser) => {
    const isAdmin = user.role === ADMIN_ROLE;
    const prompt = isAdmin
      ? `Remove administrator access from ${user.displayName}? Their role will change to Developer.`
      : `Give ${user.displayName} administrator access? They'll be able to manage users and all settings.`;
    if (!confirm(prompt)) return;
    runAction(
      () => adminUpdateUser(user.id, { role: isAdmin ? 'Developer' : ADMIN_ROLE }),
      isAdmin ? `${user.displayName} is no longer an administrator.` : `${user.displayName} is now an administrator.`
    );
  };

  const toggleActive = (user: AdminUser) => {
    if (user.active && !confirm(`Deactivate ${user.displayName}? They'll be signed out and won't be able to log in.`))
      return;
    runAction(
      () => adminUpdateUser(user.id, { active: !user.active }),
      user.active ? `${user.displayName} has been deactivated.` : `${user.displayName} has been reactivated.`
    );
  };

  const signOutEverywhere = (user: AdminUser) => {
    if (!confirm(`Sign ${user.displayName} out of all devices?`)) return;
    runAction(() => adminSignOutUser(user.id), `${user.displayName} has been signed out of all devices.`);
  };

  const sendPasswordEmail = (user: AdminUser) => {
    const purpose = user.hasPassword ? 'reset' : 'invite';
    runAction(
      () => adminSendPasswordEmail(user.id, purpose),
      purpose === 'invite'
        ? `Invite sent to ${user.emailAddress}. The link works for 3 days.`
        : `Password reset link sent to ${user.emailAddress}. The link works for 1 hour.`
    );
  };

  const revokeSession = (session: AdminSession) => {
    if (!confirm(`Sign out ${session.displayName} on ${describeDevice(session.userAgent)}?`)) return;
    runAction(() => adminRevokeSession(session.id), 'Session revoked.');
  };

  const navItems: { id: AdminSection; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <Icons.BarChart className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Icons.Users className="w-4 h-4" />, count: overview?.totalUsers },
    { id: 'sessions', label: 'Active sessions', icon: <Icons.Key className="w-4 h-4" />, count: overview?.activeSessions }
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Admin navigation */}
      <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-[#EBECF0] bg-[#FAFBFC] md:overflow-y-auto">
        <div className="px-4 pt-4 pb-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[3px] bg-[#403294] text-white flex items-center justify-center shrink-0">
            <Icons.Shield className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#172B4D] leading-tight">Administration</div>
            <div className="text-[11px] text-[#5E6C84] truncate">Jira site settings</div>
          </div>
        </div>

        <nav className="flex md:flex-col gap-1 px-2 pb-2 md:pb-4 overflow-x-auto">
          <div className="hidden md:block px-2 pt-2 pb-1 text-[11px] font-bold uppercase text-[#5E6C84]">Directory</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-sm whitespace-nowrap transition cursor-pointer ${
                section === item.id
                  ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
                  : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.count !== undefined && (
                <span className="text-[11px] font-semibold text-[#5E6C84] bg-[#DFE1E6] rounded-full px-1.5">
                  {item.count}
                </span>
              )}
            </button>
          ))}

          <div className="hidden md:block px-2 pt-4 pb-1 text-[11px] font-bold uppercase text-[#5E6C84]">Settings</div>
          <button
            type="button"
            onClick={() => setSection('email')}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-sm whitespace-nowrap transition cursor-pointer ${
              section === 'email'
                ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
                : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            <Icons.Mail className="w-4 h-4" />
            <span className="flex-1 text-left">Email (SMTP)</span>
            {smtp && !smtp.isReady && (
              <span className="w-2 h-2 rounded-full bg-[#FF991F]" title="Not set up" aria-label="Not set up" />
            )}
          </button>

          <div className="hidden md:block px-2 pt-4 pb-1 text-[11px] font-bold uppercase text-[#5E6C84]">
            Access & products
          </div>
          <button
            type="button"
            onClick={() => onNavigateView('users')}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-sm whitespace-nowrap text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D] cursor-pointer"
          >
            <Icons.Lock className="w-4 h-4" />
            <span className="flex-1 text-left">Groups & permissions</span>
            <Icons.ArrowRight className="w-3.5 h-3.5 text-[#97A0AF]" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('workspace-settings')}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-sm whitespace-nowrap text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D] cursor-pointer"
          >
            <Icons.Settings className="w-4 h-4" />
            <span className="flex-1 text-left">Workspace settings</span>
            <Icons.ArrowRight className="w-3.5 h-3.5 text-[#97A0AF]" />
          </button>
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-[3px] bg-[#FFEBE6] px-3 py-2.5 text-sm text-[#BF2600]">
              <Icons.X className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError('')} className="text-xs font-semibold hover:underline">
                Dismiss
              </button>
            </div>
          )}
          {notice && (
            <div className="flex items-center gap-2 rounded-[3px] bg-[#E3FCEF] px-3 py-2.5 text-sm text-[#006644]">
              <Icons.CheckCircle className="w-4 h-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#5E6C84] py-16 justify-center">
              <Icons.Refresh className="w-4 h-4 animate-spin text-[#0052CC]" />
              Loading administration…
            </div>
          ) : section === 'email' ? (
            smtp && <AdminEmailSettings settings={smtp} onSaved={setSmtp} />
          ) : section === 'overview' ? (
            <OverviewSection
              overview={overview}
              emailReady={!!smtp?.isReady}
              onSetUpEmail={() => setSection('email')}
              onCreateUser={() => setUserForm({ mode: 'create' })}
              onShowUsers={(filter) => {
                setStatusFilter(filter);
                setSection('users');
              }}
              onShowSessions={() => setSection('sessions')}
              onNavigateView={onNavigateView}
            />
          ) : section === 'users' ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-[#172B4D]">Users</h1>
                  <p className="text-sm text-[#5E6C84] mt-1">
                    Manage who can log in to Jira, their role, and their password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUserForm({ mode: 'create' })}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] text-white text-sm font-semibold cursor-pointer"
                >
                  <Icons.Plus className="w-4 h-4" />
                  Create user
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 sm:max-w-xs">
                  <Icons.Search className="w-4 h-4 text-[#7A869A] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email or username"
                    className="w-full h-8 pl-8 pr-2 text-sm border-2 border-[#DFE1E6] rounded-[3px] bg-[#FAFBFC] focus:bg-white focus:border-[#4C9AFF] focus:outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="h-8 px-2 text-sm border-2 border-[#DFE1E6] rounded-[3px] bg-[#FAFBFC] text-[#172B4D] focus:border-[#4C9AFF] focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="deactivated">Deactivated</option>
                  <option value="no-password">Needs a password</option>
                </select>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-8 px-2 text-sm border-2 border-[#DFE1E6] rounded-[3px] bg-[#FAFBFC] text-[#172B4D] focus:border-[#4C9AFF] focus:outline-none"
                >
                  <option value="all">All roles</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border border-[#EBECF0] rounded-[3px] overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#DFE1E6] text-left text-xs font-semibold text-[#5E6C84]">
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Last login</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 w-12">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-[#EBECF0] last:border-b-0 hover:bg-[#FAFBFC]">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar name={u.displayName} url={u.avatarUrl} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-semibold truncate ${u.active ? 'text-[#172B4D]' : 'text-[#7A869A]'}`}>
                                  {u.displayName}
                                </span>
                                {u.id === me.id && <Lozenge tone="info">You</Lozenge>}
                              </div>
                              <div className="text-xs text-[#5E6C84] truncate">
                                {u.emailAddress} · @{u.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {u.role === ADMIN_ROLE ? (
                            <Lozenge tone="discovery">Administrator</Lozenge>
                          ) : (
                            <span className="text-[#172B4D]">{u.role}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[#5E6C84] whitespace-nowrap">
                          {timeAgo(u.lastLoginAt)}
                          {u.activeSessions > 0 && (
                            <span className="ml-1.5 text-xs text-[#006644]">
                              · {u.activeSessions} session{u.activeSessions === 1 ? '' : 's'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {u.active ? <Lozenge tone="success">Active</Lozenge> : <Lozenge tone="neutral">Deactivated</Lozenge>}
                            {u.active && !u.hasPassword && <Lozenge tone="warning">No password</Lozenge>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => openMenu(u, e)}
                            className="p-1.5 rounded-[3px] text-[#42526E] hover:bg-[#EBECF0] cursor-pointer"
                            title="Actions"
                            aria-label={`Actions for ${u.displayName}`}
                          >
                            <Icons.MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-sm text-[#5E6C84]">
                          No users match these filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-semibold text-[#172B4D]">Active sessions</h1>
                <p className="text-sm text-[#5E6C84] mt-1">
                  Everyone currently signed in. Revoking a session signs that device out immediately.
                </p>
              </div>
              <div className="border border-[#EBECF0] rounded-[3px] overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#DFE1E6] text-left text-xs font-semibold text-[#5E6C84]">
                      <th className="px-3 py-2">User</th>
                      <th className="px-3 py-2">Device</th>
                      <th className="px-3 py-2">IP address</th>
                      <th className="px-3 py-2">Signed in</th>
                      <th className="px-3 py-2">Last active</th>
                      <th className="px-3 py-2">Expires</th>
                      <th className="px-3 py-2 w-24">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className="border-b border-[#EBECF0] last:border-b-0 hover:bg-[#FAFBFC]">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar name={s.displayName} url={s.avatarUrl} className="w-7 h-7" />
                            <div className="min-w-0">
                              <div className="font-semibold text-[#172B4D] truncate">{s.displayName}</div>
                              <div className="text-xs text-[#5E6C84] truncate">{s.emailAddress}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[#172B4D] whitespace-nowrap">
                          {describeDevice(s.userAgent)}
                          {s.isCurrent && (
                            <span className="ml-1.5">
                              <Lozenge tone="info">This device</Lozenge>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-[#5E6C84]">{s.ipAddress || '—'}</td>
                        <td className="px-3 py-2.5 text-[#5E6C84] whitespace-nowrap">{formatDateTime(s.createdAt)}</td>
                        <td className="px-3 py-2.5 text-[#5E6C84] whitespace-nowrap">{timeAgo(s.lastSeenAt)}</td>
                        <td className="px-3 py-2.5 text-[#5E6C84] whitespace-nowrap">{formatDateTime(s.expiresAt)}</td>
                        <td className="px-3 py-2.5 text-right">
                          {!s.isCurrent && (
                            <button
                              type="button"
                              onClick={() => revokeSession(s)}
                              className="h-7 px-2.5 rounded-[3px] bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#42526E] text-xs font-semibold cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-sm text-[#5E6C84]">
                          No active sessions.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row actions menu (fixed so it isn't clipped by the scrolling table) */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-60 bg-white rounded-[3px] shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)] py-1.5 text-sm"
            style={{ top: menu.top, right: menu.right }}
          >
            {(() => {
              const u = menu.user;
              const isSelf = u.id === me.id;
              const item = (label: string, onClick: () => void, danger = false) => (
                <button
                  type="button"
                  onClick={() => {
                    setMenu(null);
                    onClick();
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-[#F4F5F7] cursor-pointer ${
                    danger ? 'text-[#BF2600]' : 'text-[#172B4D]'
                  }`}
                >
                  {label}
                </button>
              );
              return (
                <>
                  {item('Edit details', () => setUserForm({ mode: 'edit', user: u }))}
                  {item(u.hasPassword ? 'Reset password' : 'Set password', () => setPasswordTarget(u))}
                  {smtp?.isReady &&
                    u.active &&
                    item(u.hasPassword ? 'Email a password reset link' : 'Email an invite to set a password', () =>
                      sendPasswordEmail(u)
                    )}
                  {u.activeSessions > 0 && item('Sign out of all devices', () => signOutEverywhere(u))}
                  {!isSelf && u.active && (
                    <>
                      <div className="my-1.5 border-t border-[#EBECF0]" />
                      {item(u.role === ADMIN_ROLE ? 'Remove administrator access' : 'Make administrator', () =>
                        toggleAdmin(u)
                      )}
                    </>
                  )}
                  {!isSelf && item(u.active ? 'Deactivate user' : 'Reactivate user', () => toggleActive(u), u.active)}
                </>
              );
            })()}
          </div>
        </>
      )}

      {userForm && (
        <UserFormDialog
          mode={userForm.mode}
          user={userForm.mode === 'edit' ? userForm.user : undefined}
          roles={roles}
          canChangeRole={userForm.mode === 'create' || userForm.user.id !== me.id}
          canEmailInvite={!!smtp?.isReady}
          onClose={() => setUserForm(null)}
          onSaved={async (message, savedUserId, warning) => {
            setUserForm(null);
            setNotice(message);
            if (warning) setError(warning);
            await reload();
            if (savedUserId === me.id) await refreshUser();
          }}
        />
      )}

      {passwordTarget && (
        <SetPasswordDialog
          user={passwordTarget}
          isSelf={passwordTarget.id === me.id}
          onClose={() => setPasswordTarget(null)}
          onSaved={async (message) => {
            setPasswordTarget(null);
            setNotice(message);
            await reload();
          }}
        />
      )}
    </div>
  );
}

const OverviewSection: React.FC<{
  overview: AdminOverview | null;
  emailReady: boolean;
  onSetUpEmail: () => void;
  onCreateUser: () => void;
  onShowUsers: (filter: StatusFilter) => void;
  onShowSessions: () => void;
  onNavigateView: (view: ViewType) => void;
}> = ({ overview, emailReady, onSetUpEmail, onCreateUser, onShowUsers, onShowSessions, onNavigateView }) => {
  if (!overview) return null;

  const stats = [
    {
      label: 'Active users',
      value: overview.activeUsers,
      detail: `${overview.deactivatedUsers} deactivated`,
      onClick: () => onShowUsers('active')
    },
    {
      label: 'Administrators',
      value: overview.administrators,
      detail: 'Full site access',
      onClick: () => onShowUsers('all')
    },
    {
      label: 'Active sessions',
      value: overview.activeSessions,
      detail: 'Signed-in devices',
      onClick: onShowSessions
    },
    {
      label: 'Need a password',
      value: overview.usersWithoutPassword,
      detail: overview.usersWithoutPassword > 0 ? "Can't log in yet" : 'Everyone can log in',
      warn: overview.usersWithoutPassword > 0,
      onClick: () => onShowUsers('no-password')
    }
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-[#172B4D]">Overview</h1>
        <p className="text-sm text-[#5E6C84] mt-1">Who can access this Jira site and how they sign in.</p>
      </div>

      {!emailReady && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-[3px] border border-[#FFE380] bg-[#FFFAE6] px-4 py-3">
          <Icons.Mail className="w-5 h-5 shrink-0 text-[#974F0C]" />
          <div className="flex-1 text-sm text-[#172B4D]">
            <span className="font-semibold">Outgoing email isn&apos;t set up.</span> Users can&apos;t reset forgotten
            passwords themselves, and you can&apos;t email invites.
          </div>
          <button
            type="button"
            onClick={onSetUpEmail}
            className="self-start sm:self-auto h-8 px-3 rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
          >
            Set up email
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={s.onClick}
            className={`text-left p-4 rounded-[3px] border transition hover:shadow-[0_1px_1px_rgba(9,30,66,0.25)] cursor-pointer ${
              s.warn ? 'border-[#FFE380] bg-[#FFFAE6]' : 'border-[#EBECF0] bg-white hover:border-[#DFE1E6]'
            }`}
          >
            <div className="text-xs font-semibold text-[#5E6C84]">{s.label}</div>
            <div className="text-[28px] leading-tight font-semibold text-[#172B4D] mt-1">{s.value}</div>
            <div className={`text-xs mt-0.5 ${s.warn ? 'text-[#974F0C] font-semibold' : 'text-[#7A869A]'}`}>
              {s.detail}
            </div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 border border-[#EBECF0] rounded-[3px]">
          <div className="px-4 py-3 border-b border-[#EBECF0] text-sm font-semibold text-[#172B4D]">Recent logins</div>
          {overview.recentLogins.length === 0 ? (
            <div className="px-4 py-8 text-sm text-center text-[#5E6C84]">No one has logged in yet.</div>
          ) : (
            <ul>
              {overview.recentLogins.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#EBECF0] last:border-b-0">
                  <UserAvatar name={u.displayName} url={u.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#172B4D] truncate">{u.displayName}</div>
                    <div className="text-xs text-[#5E6C84] truncate">{u.emailAddress}</div>
                  </div>
                  {u.role === ADMIN_ROLE && <Lozenge tone="discovery">Admin</Lozenge>}
                  <div className="text-xs text-[#5E6C84] whitespace-nowrap">{timeAgo(u.lastLoginAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-[#EBECF0] rounded-[3px]">
          <div className="px-4 py-3 border-b border-[#EBECF0] text-sm font-semibold text-[#172B4D]">Quick actions</div>
          <div className="p-2">
            {[
              { label: 'Create a user', icon: <Icons.Plus className="w-4 h-4" />, onClick: onCreateUser },
              {
                label: 'Set passwords for new users',
                icon: <Icons.Key className="w-4 h-4" />,
                onClick: () => onShowUsers('no-password')
              },
              { label: 'Review active sessions', icon: <Icons.Shield className="w-4 h-4" />, onClick: onShowSessions },
              {
                label: emailReady ? 'Email (SMTP) settings' : 'Set up outgoing email',
                icon: <Icons.Mail className="w-4 h-4" />,
                onClick: onSetUpEmail
              },
              {
                label: 'Groups & permission schemes',
                icon: <Icons.Lock className="w-4 h-4" />,
                onClick: () => onNavigateView('users')
              }
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[3px] text-sm text-[#172B4D] hover:bg-[#F4F5F7] cursor-pointer"
              >
                <span className="text-[#0052CC]">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

const PasswordField: React.FC<{
  id: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ id, value, onChange }) => {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${fieldClass} pr-9 font-mono`}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#42526E] hover:text-[#172B4D] cursor-pointer"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(generatePassword());
            setVisible(true);
          }}
          className="h-9 px-3 rounded-[3px] bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#42526E] text-sm font-semibold cursor-pointer whitespace-nowrap"
        >
          Generate
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!value}
          className="h-9 px-3 rounded-[3px] bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#42526E] text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-xs text-[#5E6C84] mt-1">At least {MIN_PASSWORD_LENGTH} characters. Share it with the user securely.</p>
    </div>
  );
};

const UserFormDialog: React.FC<{
  mode: 'create' | 'edit';
  user?: AdminUser;
  roles: string[];
  canChangeRole: boolean;
  canEmailInvite: boolean;
  onClose: () => void;
  onSaved: (message: string, userId: number, warning?: string) => void;
}> = ({ mode, user, roles, canChangeRole, canEmailInvite, onClose, onSaved }) => {
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.emailAddress ?? '');
  const [username, setUsername] = useState(user?.name ?? '');
  const [role, setRole] = useState(user?.role ?? 'Developer');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [password, setPassword] = useState(mode === 'create' ? generatePassword() : '');
  const [emailInvite, setEmailInvite] = useState(canEmailInvite);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) {
      setError('Full name and email address are required.');
      return;
    }
    if (mode === 'create' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const details = {
        name: username.trim() || undefined,
        displayName: displayName.trim(),
        emailAddress: email.trim(),
        role,
        jobTitle: jobTitle.trim(),
        department: department.trim()
      };
      if (mode === 'create') {
        const created = await adminCreateUser({ ...details, password });
        if (emailInvite) {
          try {
            await adminSendPasswordEmail(created.id, 'invite');
            onSaved(`${created.displayName} was created and invited by email at ${created.emailAddress}.`, created.id);
          } catch (err: any) {
            onSaved(
              `${created.displayName} was created.`,
              created.id,
              `The invite email couldn't be sent: ${err.message}. Set a password for them from the user menu instead.`
            );
          }
        } else {
          onSaved(`${created.displayName} can now log in as @${created.name}.`, created.id);
        }
      } else {
        const updated = await adminUpdateUser(user!.id, canChangeRole ? details : { ...details, role: undefined });
        onSaved(`${updated.displayName}'s details were saved.`, updated.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
      setSaving(false);
    }
  };

  return (
    <Dialog title={mode === 'create' ? 'Create user' : 'Edit user'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 pb-5 space-y-4" noValidate>
        {error && <div className="rounded-[3px] bg-[#FFEBE6] px-3 py-2 text-sm text-[#BF2600]">{error}</div>}

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="admin-user-name" className="block text-xs font-semibold text-[#5E6C84] mb-1">
              Full name <span className="text-[#DE350B]">*</span>
            </label>
            <input
              id="admin-user-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={fieldClass}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="admin-user-email" className="block text-xs font-semibold text-[#5E6C84] mb-1">
              Email address <span className="text-[#DE350B]">*</span>
            </label>
            <input
              id="admin-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="admin-user-username" className="block text-xs font-semibold text-[#5E6C84] mb-1">
              Username
            </label>
            <input
              id="admin-user-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
              placeholder={mode === 'create' ? 'From email if left blank' : ''}
              className={`${fieldClass} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="admin-user-role" className="block text-xs font-semibold text-[#5E6C84] mb-1">
              Role
            </label>
            <select
              id="admin-user-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={!canChangeRole}
              className={fieldClass}
              title={canChangeRole ? undefined : "You can't change your own role"}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="admin-user-title" className="block text-xs font-semibold text-[#5E6C84] mb-1">
              Job title
            </label>
            <input
              id="admin-user-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="admin-user-dept" className="block text-xs font-semibold text-[#5E6C84] mb-1">
              Department
            </label>
            <input
              id="admin-user-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className={fieldClass}
            />
          </div>
          {mode === 'create' && canEmailInvite && (
            <label className="sm:col-span-2 flex items-start gap-2 text-sm text-[#172B4D] cursor-pointer">
              <input
                type="checkbox"
                checked={emailInvite}
                onChange={(e) => setEmailInvite(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#0052CC] cursor-pointer"
              />
              <span>
                Email them an invite to choose their own password
                <span className="block text-xs text-[#5E6C84]">The link works for 3 days.</span>
              </span>
            </label>
          )}
          {mode === 'create' && !emailInvite && (
            <div className="sm:col-span-2">
              <label htmlFor="admin-user-password" className="block text-xs font-semibold text-[#5E6C84] mb-1">
                Password <span className="text-[#DE350B]">*</span>
              </label>
              <PasswordField id="admin-user-password" value={password} onChange={setPassword} />
            </div>
          )}
        </div>

        {role === ADMIN_ROLE && canChangeRole && (
          <div className="rounded-[3px] bg-[#EAE6FF] px-3 py-2 text-xs text-[#403294]">
            Administrators can manage every user, password, and setting on this site.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-[3px] text-sm font-semibold text-[#42526E] hover:bg-[#EBECF0] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-8 px-3 rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};

const SetPasswordDialog: React.FC<{
  user: AdminUser;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}> = ({ user, isSelf, onClose, onSaved }) => {
  const [password, setPassword] = useState(generatePassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminSetPassword(user.id, password);
      onSaved(`New password set for ${user.displayName}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to set password');
      setSaving(false);
    }
  };

  return (
    <Dialog title={user.hasPassword ? 'Reset password' : 'Set password'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 pb-5 space-y-4" noValidate>
        <div className="flex items-center gap-2.5 rounded-[3px] bg-[#F4F5F7] px-3 py-2">
          <UserAvatar name={user.displayName} url={user.avatarUrl} className="w-7 h-7" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#172B4D] truncate">{user.displayName}</div>
            <div className="text-xs text-[#5E6C84] truncate">
              Logs in with {user.emailAddress} or @{user.name}
            </div>
          </div>
        </div>

        {error && <div className="rounded-[3px] bg-[#FFEBE6] px-3 py-2 text-sm text-[#BF2600]">{error}</div>}

        <div>
          <label htmlFor="admin-set-password" className="block text-xs font-semibold text-[#5E6C84] mb-1">
            New password
          </label>
          <PasswordField id="admin-set-password" value={password} onChange={setPassword} />
        </div>

        <p className="text-xs text-[#5E6C84]">
          {isSelf
            ? 'Your other devices will be signed out. This browser stays signed in.'
            : `${user.displayName} will be signed out of all devices.`}
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-[3px] text-sm font-semibold text-[#42526E] hover:bg-[#EBECF0] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-8 px-3 rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Set password'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
