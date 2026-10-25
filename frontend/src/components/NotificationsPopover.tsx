'use client';

import React, { useState } from 'react';
import { UserNotification } from '@/types/jira';
import { Icons } from './Icons';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: UserNotification[];
  unreadCount: number;
  directCount: number;
  watchingCount: number;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: number) => void;
  onClearAll: () => void;
  onSelectIssue?: (issueIdOrKey: number | string) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  directCount,
  watchingCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll,
  onSelectIssue
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'watching'>('direct');
  const [unreadOnly, setUnreadOnly] = useState(false);

  if (!isOpen) return null;

  // Filter notifications by tab and unread flag
  const filtered = notifications.filter(n => {
    if (unreadOnly && n.isRead) return false;
    if (activeTab === 'direct') return n.category === 'direct';
    if (activeTab === 'watching') return n.category === 'watching';
    return true; // 'all' includes all, including system
  });

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'assigned':
        return {
          icon: <Icons.User className="w-3 h-3 text-blue-600" />,
          bg: 'bg-blue-100 border-blue-200',
          label: 'Assigned'
        };
      case 'status_changed':
        return {
          icon: <Icons.ArrowRight className="w-3 h-3 text-emerald-600" />,
          bg: 'bg-emerald-100 border-emerald-200',
          label: 'Status'
        };
      case 'commented':
        return {
          icon: <Icons.MessageSquare className="w-3 h-3 text-purple-600" />,
          bg: 'bg-purple-100 border-purple-200',
          label: 'Comment'
        };
      case 'sprint_started':
      case 'sprint_completed':
        return {
          icon: <Icons.Zap className="w-3 h-3 text-amber-600" />,
          bg: 'bg-amber-100 border-amber-200',
          label: 'Sprint'
        };
      default:
        return {
          icon: <Icons.Bell className="w-3 h-3 text-slate-600" />,
          bg: 'bg-slate-100 border-slate-200',
          label: 'Activity'
        };
    }
  };

  return (
    <>
      {/* Invisible backdrop click-to-dismiss */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover Card */}
      <div className="absolute right-0 top-full mt-2 w-[390px] sm:w-[440px] max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
        
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#0052cc] text-white text-[10px] font-bold">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-[11px] font-semibold text-[#0052cc] hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer transition"
                title="Mark all notifications as read"
              >
                <Icons.Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              title="Close notifications"
            >
              <Icons.X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sub-header Tabs & Filters */}
        <div className="px-4 pt-2 pb-1 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('direct')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'direct'
                  ? 'bg-blue-50 text-[#0052cc] border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <span>Direct</span>
              {directCount > 0 && (
                <span className={`px-1 py-0.2 rounded-full text-[9px] font-bold ${activeTab === 'direct' ? 'bg-[#0052cc] text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {directCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('watching')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'watching'
                  ? 'bg-blue-50 text-[#0052cc] border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <span>Watching</span>
              {watchingCount > 0 && (
                <span className={`px-1 py-0.2 rounded-full text-[9px] font-bold ${activeTab === 'watching' ? 'bg-[#0052cc] text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {watchingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-50 text-[#0052cc] border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              All
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer"
            />
            <span>Unread only</span>
          </label>
        </div>

        {/* Notifications Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[180px] max-h-[460px]">
          {filtered.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0052cc] flex items-center justify-center mx-auto mb-3">
                <Icons.Check className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">You're all caught up!</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
                {unreadOnly
                  ? 'No unread notifications right now.'
                  : 'When someone assigns an issue, mentions you, or changes a ticket you watch, you’ll see it here.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const badge = getActionBadge(item.action);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.isRead) onMarkAsRead(item.id);
                    if (onSelectIssue && (item.issueId || item.issueKey)) {
                      onSelectIssue(item.issueId || item.issueKey!);
                      onClose();
                    }
                  }}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition relative group ${
                    !item.isRead ? 'bg-[#F4F7FB]/90' : 'bg-white'
                  }`}
                >
                  {/* Left Unread Indicator Dot */}
                  {!item.isRead && (
                    <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-[#0052cc]" />
                  )}

                  {/* Actor Avatar / Icon */}
                  <div className="relative shrink-0 mt-0.5">
                    {item.actorAvatarUrl ? (
                      <img
                        src={item.actorAvatarUrl}
                        alt={item.actorName}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-1 ring-slate-200">
                        {item.actorName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-white flex items-center justify-center shadow-2xs ${badge.bg}`}
                      title={badge.label}
                    >
                      {badge.icon}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {item.actorName}
                      </span>
                      {item.issueKey && (
                        <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-blue-100 text-[#0052cc] border border-blue-200 shrink-0">
                          {item.issueKey}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium mt-0.5 line-clamp-2">
                      {item.message}
                    </p>

                    {item.issueSummary && (
                      <div className="text-[11px] text-slate-400 truncate mt-1 flex items-center gap-1">
                        <Icons.Compass className="w-3 h-3 text-slate-300 shrink-0" />
                        <span className="truncate">{item.issueSummary}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Action buttons (on hover) */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 self-center">
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(item.id);
                        }}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-blue-600 transition"
                        title="Mark as read"
                      >
                        <Icons.Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNotification(item.id);
                      }}
                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-rose-600 transition"
                      title="Dismiss notification"
                    >
                      <Icons.X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <span>{notifications.length} total notifications</span>
            <button
              type="button"
              onClick={onClearAll}
              className="text-slate-400 hover:text-rose-600 transition cursor-pointer font-medium"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationsPopover;
