'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  userName = 'Sajidur Rahman',
  userEmail = 'sajidur@akij.net'
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security' | 'notifications'>('profile');
  const [fullName, setFullName] = useState(userName);
  const [publicName, setPublicName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [department, setDepartment] = useState('AKIJ ERP Engineering & Delivery');
  const [jobTitle, setJobTitle] = useState('Enterprise Solutions Lead / Admin');
  const [timezone, setTimezone] = useState('Asia/Dhaka (GMT+06:00)');
  const [language, setLanguage] = useState('English (US)');
  const [timeFormat, setTimeFormat] = useState('jira-shorthand'); // 2d 4h 30m
  const [notifyOnAssign, setNotifyOnAssign] = useState(true);
  const [notifyOnComment, setNotifyOnComment] = useState(true);
  const [notifyOnSprint, setNotifyOnSprint] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('jira_account_profile');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.fullName) setFullName(data.fullName);
        if (data.publicName) setPublicName(data.publicName);
        if (data.email) setEmail(data.email);
        if (data.department) setDepartment(data.department);
        if (data.jobTitle) setJobTitle(data.jobTitle);
        if (data.timezone) setTimezone(data.timezone);
        if (data.language) setLanguage(data.language);
      }
    } catch {}
  }, []);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        'jira_account_profile',
        JSON.stringify({
          fullName,
          publicName,
          email,
          department,
          jobTitle,
          timezone,
          language
        })
      );
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 font-sans">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0052cc] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {fullName.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">Atlassian Account Settings</h2>
              <p className="text-xs text-slate-500 font-mono">{email} • Enterprise On-Premises</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 px-6 pt-2 bg-white text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-[#0052cc] text-[#0052cc] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.User className="w-3.5 h-3.5" />
            <span>Profile & Visibility</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`pb-2.5 px-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'preferences'
                ? 'border-[#0052cc] text-[#0052cc] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Settings className="w-3.5 h-3.5" />
            <span>Preferences & Locale</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`pb-2.5 px-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'border-[#0052cc] text-[#0052cc] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-[#0052cc] text-[#0052cc] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Shield className="w-3.5 h-3.5" />
            <span>Security & API</span>
          </button>
        </div>

        {/* Modal Body / Tab Contents */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {savedSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Icons.Check className="w-4 h-4 text-emerald-600" />
              <span>Your account settings have been saved successfully.</span>
            </div>
          )}

          {/* TAB 1: Profile & Visibility */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Public Display Name</label>
                <input
                  type="text"
                  required
                  value={publicName}
                  onChange={(e) => setPublicName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
                />
                <p className="text-[11px] text-slate-400 mt-1">This name will be shown on assigned issues, comments, and work logs.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#172B4D] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#172B4D] mb-1">Job Title / Role</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Department / Organization</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Preferences & Locale */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#0052cc]"
                >
                  <option value="Asia/Dhaka (GMT+06:00)">Asia/Dhaka (GMT+06:00)</option>
                  <option value="UTC (GMT+00:00)">UTC (GMT+00:00)</option>
                  <option value="Asia/Singapore (GMT+08:00)">Asia/Singapore (GMT+08:00)</option>
                  <option value="Europe/London (GMT+01:00)">Europe/London (GMT+01:00)</option>
                  <option value="America/New_York (GMT-04:00)">America/New_York (GMT-04:00)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#0052cc]"
                >
                  <option value="English (US)">English (US)</option>
                  <option value="English (UK)">English (UK)</option>
                  <option value="Bengali">Bengali</option>
                  <option value="German">German</option>
                  <option value="French">French</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Time Tracking Format</label>
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#0052cc]"
                >
                  <option value="jira-shorthand">Jira Shorthand (e.g., 2d 4h 30m, 1d = 8h)</option>
                  <option value="hours">Hours Only (e.g., 20.5 hours)</option>
                  <option value="minutes">Total Minutes (e.g., 1230 minutes)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <p className="text-slate-500 mb-2">Choose which activity events send email and in-app alerts to you.</p>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnAssign}
                  onChange={(e) => setNotifyOnAssign(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300"
                />
                <div>
                  <div className="font-bold text-slate-800">Issue Assigned to Me</div>
                  <div className="text-[11px] text-slate-500">Send alert when an issue or subtask is assigned to your account.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnComment}
                  onChange={(e) => setNotifyOnComment(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300"
                />
                <div>
                  <div className="font-bold text-slate-800">Mentions & Comments</div>
                  <div className="text-[11px] text-slate-500">Notify when someone mentions you with @name or comments on your issue.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnSprint}
                  onChange={(e) => setNotifyOnSprint(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300"
                />
                <div>
                  <div className="font-bold text-slate-800">Sprint Lifecycle Updates</div>
                  <div className="text-[11px] text-slate-500">Notify when active sprints are started, completed, or revised.</div>
                </div>
              </label>
            </div>
          )}

          {/* TAB 4: Security & API */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-slate-700 space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Icons.Shield className="w-4 h-4 text-blue-700" />
                  <span>On-Premises Server Authentication</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  Your credentials are authenticated directly by your on-premises ASP.NET Core Web API with secure password hashing.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#172B4D] mb-1">Personal API Token</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value="jira_pat_akij_98fa72348df89b21cd77"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => alert('API token copied to clipboard')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Use this personal access token for Git integrations, CI/CD, and CLI tools.</p>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">All changes persist to your personal session profile.</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#0052cc] hover:bg-[#0047b3] shadow-xs transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
