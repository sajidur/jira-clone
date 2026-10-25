'use client';

import React, { useState, useEffect } from 'react';
import {
  Issue,
  Sprint,
  AppUser,
  CustomFieldDefinition,
  WorkflowStatus,
  WorkflowTransition,
  ChildIssueItem,
  IssueLinkItem
} from '@/types/jira';
import { IssueTypeIcon, PriorityIcon, Icons } from './Icons';
import { SpaceAvatar } from './SpaceAvatar';
import {
  updateIssue,
  deleteIssue,
  addComment,
  logWork,
  fetchIssue,
  fetchWorkflowStatuses,
  fetchCustomFields,
  fetchTransitions,
  fetchChildIssues,
  createChildIssue,
  setParentIssue,
  fetchIssueLinks,
  createIssueLink,
  deleteIssueLink,
  fetchIssues,
  formatMinutesToJiraTime,
  parseJiraTimeToMinutes
} from '@/lib/api';

interface IssueDetailModalProps {
  issueId: number;
  sprints: Sprint[];
  users: AppUser[];
  onClose: () => void;
  onIssueUpdated: () => void;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  issueId,
  sprints,
  users,
  onClose,
  onIssueUpdated
}) => {
  const [currentId, setCurrentId] = useState<number>(issueId);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // Workflow & Custom fields
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);

  // Child Issues & Subtasks
  const [childIssues, setChildIssues] = useState<ChildIssueItem[]>([]);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildSummary, setNewChildSummary] = useState('');
  const [newChildType, setNewChildType] = useState('Subtask');
  const [creatingChild, setCreatingChild] = useState(false);

  // Issue Links
  const [issueLinks, setIssueLinks] = useState<IssueLinkItem[]>([]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkRelationship, setLinkRelationship] = useState('relates to');
  const [linkTargetKey, setLinkTargetKey] = useState('');
  const [projectIssues, setProjectIssues] = useState<Issue[]>([]);
  const [linkingIssue, setLinkingIssue] = useState(false);

  // Parent issue edit in sidebar
  const [isEditingParent, setIsEditingParent] = useState(false);
  const [selectedParentKey, setSelectedParentKey] = useState('');

  // Tabs: 'comments' | 'worklog' | 'history'
  const [activeTab, setActiveTab] = useState<'comments' | 'worklog' | 'history'>('comments');
  const [newComment, setNewComment] = useState('');
  const [timeSpentMins, setTimeSpentMins] = useState(60);
  const [worklogComment, setWorklogComment] = useState('');
  const [savingField, setSavingField] = useState<string | null>(null);

  // Jira Time Tracking & Log Work modal states
  const [isLogWorkModalOpen, setIsLogWorkModalOpen] = useState(false);
  const [logTimeSpentStr, setLogTimeSpentStr] = useState('1h');
  const [logStartedAt, setLogStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [logRemainingOption, setLogRemainingOption] = useState<'auto' | 'leave' | 'set'>('auto');
  const [logRemainingStr, setLogRemainingStr] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [isSubmittingWorklog, setIsSubmittingWorklog] = useState(false);

  // Inline estimates editing states
  const [isEditingOriginalEstimate, setIsEditingOriginalEstimate] = useState(false);
  const [originalEstimateInput, setOriginalEstimateInput] = useState('');
  const [isEditingRemainingEstimate, setIsEditingRemainingEstimate] = useState(false);
  const [remainingEstimateInput, setRemainingEstimateInput] = useState('');

  // Jira Cloud styling and interaction states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watchersCount, setWatchersCount] = useState(1);
  const [isVoted, setIsVoted] = useState(false);
  const [votesCount, setVotesCount] = useState(0);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isTimeTrackingOpen, setIsTimeTrackingOpen] = useState(true);
  const [copiedShareToast, setCopiedShareToast] = useState(false);

  const loadIssueAndMeta = async (idToLoad: number) => {
    try {
      setLoading(true);
      const data = await fetchIssue(idToLoad);
      setIssue(data);
      setSummary(data.summary);
      setDescription(data.description || '');
      setSelectedParentKey(data.parentIssueKey || data.epicKey || '');

      const [stData, cfData, trData, chData, lkData, allProjIssues] = await Promise.all([
        fetchWorkflowStatuses(data.projectId),
        fetchCustomFields(data.projectId),
        fetchTransitions(data.projectId),
        fetchChildIssues(data.key),
        fetchIssueLinks(data.key),
        fetchIssues({ projectId: data.projectId })
      ]);

      setStatuses(stData);
      setCustomFields(cfData);
      setTransitions(trData);
      setChildIssues(chData);
      setIssueLinks(lkData);
      setProjectIssues(allProjIssues.filter((i) => i.id !== data.id));
    } catch (e) {
      console.error('Failed to load issue details', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssueAndMeta(currentId);
  }, [currentId]);

  if (loading || !issue) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 flex items-center gap-3 shadow-2xl">
          <Icons.Refresh className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Loading issue details...</span>
        </div>
      </div>
    );
  }

  const parseCustomFields = (json?: string): { [key: string]: any } => {
    if (!json) return {};
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  };

  const handleUpdate = async (field: string, patch: Partial<Issue>) => {
    try {
      setSavingField(field);
      await updateIssue(issue.id, patch);
      const refreshed = await fetchIssue(currentId);
      setIssue(refreshed);
      setSummary(refreshed.summary);
      setDescription(refreshed.description || '');
      onIssueUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingField(null);
    }
  };

  const handleCustomFieldChange = async (fieldKey: string, val: any) => {
    const current = parseCustomFields(issue.customFieldsJson);
    current[fieldKey] = val;
    const json = JSON.stringify(current);
    await handleUpdate(`custom_${fieldKey}`, { customFieldsJson: json });
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${issue.key}?`)) {
      await deleteIssue(issue.id);
      onIssueUpdated();
      onClose();
    }
  };

  // -------------------------------------------------------------
  // CHILD ISSUES & SUBTASKS HANDLERS
  // -------------------------------------------------------------
  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildSummary.trim()) return;

    try {
      setCreatingChild(true);
      await createChildIssue(issue.key, {
        summary: newChildSummary.trim(),
        issueType: newChildType,
        priority: 'Medium',
        sprintId: issue.sprintId ?? undefined,
        assigneeName: issue.assigneeName ?? undefined,
        assigneeEmail: issue.assigneeEmail ?? undefined
      });

      setNewChildSummary('');
      setIsAddingChild(false);
      const ch = await fetchChildIssues(issue.key);
      setChildIssues(ch);
      onIssueUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to create child issue');
    } finally {
      setCreatingChild(false);
    }
  };

  const handleChildStatusChange = async (childId: number, newStatus: string) => {
    try {
      await updateIssue(childId, { status: newStatus });
      const ch = await fetchChildIssues(issue.key);
      setChildIssues(ch);
      onIssueUpdated();
    } catch (err: any) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // ISSUE LINKS HANDLERS
  // -------------------------------------------------------------
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTargetKey) return;

    try {
      setLinkingIssue(true);
      await createIssueLink(issue.key, {
        targetIssueKey: linkTargetKey,
        relationship: linkRelationship
      });

      setIsLinkModalOpen(false);
      setLinkTargetKey('');
      const lk = await fetchIssueLinks(issue.key);
      setIssueLinks(lk);
      onIssueUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to link issue');
    } finally {
      setLinkingIssue(false);
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    try {
      await deleteIssueLink(linkId);
      const lk = await fetchIssueLinks(issue.key);
      setIssueLinks(lk);
      onIssueUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to remove link');
    }
  };

  // -------------------------------------------------------------
  // PARENT ISSUE HANDLERS
  // -------------------------------------------------------------
  const handleSaveParent = async () => {
    try {
      await setParentIssue(issue.id, selectedParentKey.trim() || null);
      setIsEditingParent(false);
      const refreshed = await fetchIssue(currentId);
      setIssue(refreshed);
      onIssueUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update parent issue');
    }
  };

  const handleRemoveParent = async () => {
    try {
      await setParentIssue(issue.id, null);
      setSelectedParentKey('');
      setIsEditingParent(false);
      const refreshed = await fetchIssue(currentId);
      setIssue(refreshed);
      onIssueUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to remove parent');
    }
  };

  // Comments & Worklogs
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(issue.id, {
      authorName: 'Sajidur Rahman',
      authorEmail: 'sajidur@akij.net',
      body: newComment.trim()
    });
    setNewComment('');
    const refreshed = await fetchIssue(currentId);
    setIssue(refreshed);
    onIssueUpdated();
  };

  const handleLogWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeSpentMins <= 0) return;
    await logWork(issue.id, {
      authorName: 'Sajidur Rahman',
      timeSpentMinutes: timeSpentMins,
      comment: worklogComment.trim() || undefined
    });
    setWorklogComment('');
    const refreshed = await fetchIssue(currentId);
    setIssue(refreshed);
    onIssueUpdated();
  };

  const handleLogWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSpent = parseJiraTimeToMinutes(logTimeSpentStr);
    if (parsedSpent <= 0) {
      alert('Please enter a valid time spent (e.g., 2h 30m, 1d, 45m).');
      return;
    }

    try {
      setIsSubmittingWorklog(true);
      let remMinutes: number | undefined = undefined;
      if (logRemainingOption === 'set') {
        remMinutes = parseJiraTimeToMinutes(logRemainingStr);
      } else if (logRemainingOption === 'leave') {
        remMinutes = issue.remainingEstimateMinutes ?? 0;
      }

      await logWork(issue.id, {
        authorName: 'Sajidur Rahman',
        authorEmail: 'sajidur@akij.net',
        timeSpentMinutes: parsedSpent,
        remainingEstimateMinutes: remMinutes,
        comment: logDescription.trim() || undefined,
        startedAt: logStartedAt ? new Date(logStartedAt).toISOString() : new Date().toISOString()
      });

      setIsLogWorkModalOpen(false);
      setLogDescription('');
      setLogTimeSpentStr('1h');
      const refreshed = await fetchIssue(currentId);
      setIssue(refreshed);
      onIssueUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to log work');
    } finally {
      setIsSubmittingWorklog(false);
    }
  };

  const handleSaveOriginalEstimate = async () => {
    const parsed = parseJiraTimeToMinutes(originalEstimateInput);
    await handleUpdate('originalEstimateMinutes', {
      originalEstimateMinutes: parsed > 0 ? parsed : null,
      remainingEstimateMinutes: (issue.remainingEstimateMinutes === undefined || issue.remainingEstimateMinutes === null)
        ? (parsed > 0 ? parsed : null)
        : issue.remainingEstimateMinutes
    });
    setIsEditingOriginalEstimate(false);
  };

  const handleSaveRemainingEstimate = async () => {
    const parsed = parseJiraTimeToMinutes(remainingEstimateInput);
    await handleUpdate('remainingEstimateMinutes', {
      remainingEstimateMinutes: parsed >= 0 ? parsed : null
    });
    setIsEditingRemainingEstimate(false);
  };

  const allowedTransitions = transitions.filter(
    (t) => t.fromStatus.toLowerCase() === issue.status.toLowerCase()
  );

  const customFieldVals = parseCustomFields(issue.customFieldsJson);

  // Child completion progress
  const completedChildren = childIssues.filter((c) => c.status === 'Done').length;
  const childProgressPercent = childIssues.length > 0
    ? Math.round((completedChildren / childIssues.length) * 100)
    : 0;

  // Group issue links by relationship
  const groupedLinks: { [rel: string]: IssueLinkItem[] } = {};
  issueLinks.forEach((l) => {
    const rel = l.Relationship;
    if (!groupedLinks[rel]) groupedLinks[rel] = [];
    groupedLinks[rel].push(l);
  });

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-2 sm:p-4'}`}>
      <div className={`bg-white shadow-2xl border border-[#DFE1E6] w-full flex flex-col overflow-hidden transition-all duration-150 ${
        isFullscreen ? 'h-full max-h-screen rounded-none' : 'max-w-6xl max-h-[95vh] rounded-xl'
      }`}>
        {/* ------------------------------------------------------------- */}
        {/* TOP HEADER BAR (Jira Cloud standard breadcrumb & toolbar) */}
        {/* ------------------------------------------------------------- */}
        <div className="px-5 py-2.5 border-b border-[#EBECF0] flex items-center justify-between bg-white select-none shrink-0">
          {/* Left Breadcrumb: Project Icon + Parent / Issue Key */}
          <div className="flex items-center gap-2 text-xs">
            <IssueTypeIcon type={issue.issueType} className="w-4 h-4 shrink-0" />
            
            {(issue.parentIssueKey || issue.epicKey) ? (
              <div className="flex items-center gap-1.5 font-medium text-[#5E6C84]">
                <button
                  type="button"
                  onClick={() => {
                    const pKey = issue.parentIssueKey || issue.epicKey;
                    const parentFound = projectIssues.find((pi) => pi.key.toUpperCase() === pKey?.toUpperCase());
                    if (parentFound) setCurrentId(parentFound.id);
                  }}
                  className="hover:underline text-[#0052CC] font-bold"
                  title="Parent Issue"
                >
                  {issue.parentIssueKey || issue.epicKey}
                </button>
                <span>/</span>
                <span className="font-bold text-[#172B4D]">{issue.key}</span>
              </div>
            ) : (
              <span className="font-bold text-[#172B4D] hover:underline cursor-pointer">{issue.key}</span>
            )}
          </div>

          {/* Right Action Icons in Jira Order */}
          <div className="flex items-center gap-1 text-slate-500">
            {/* Watchers button with count */}
            <button
              type="button"
              onClick={() => {
                setIsWatching(!isWatching);
                setWatchersCount((prev) => (isWatching ? Math.max(0, prev - 1) : prev + 1));
              }}
              className={`p-1.5 rounded hover:bg-[#EBECF0] transition cursor-pointer flex items-center gap-1 text-xs ${
                isWatching ? 'text-[#0052cc] font-bold bg-blue-50' : 'text-slate-600'
              }`}
              title={isWatching ? 'Watching (Click to stop watching)' : 'Watch issue'}
            >
              <Icons.Eye className="w-4 h-4" />
              <span className="text-[11px]">{watchersCount}</span>
            </button>

            {/* Vote button */}
            <button
              type="button"
              onClick={() => {
                setIsVoted(!isVoted);
                setVotesCount((prev) => (isVoted ? Math.max(0, prev - 1) : prev + 1));
              }}
              className={`p-1.5 rounded hover:bg-[#EBECF0] transition cursor-pointer flex items-center gap-1 text-xs ${
                isVoted ? 'text-[#0052cc] font-bold bg-blue-50' : 'text-slate-600'
              }`}
              title="Vote for this issue"
            >
              <Icons.ThumbsUp className="w-4 h-4" />
              {votesCount > 0 && <span className="text-[11px]">{votesCount}</span>}
            </button>

            {/* Share button */}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                setCopiedShareToast(true);
                setTimeout(() => setCopiedShareToast(false), 2000);
              }}
              className="p-1.5 rounded hover:bg-[#EBECF0] text-slate-600 transition cursor-pointer relative"
              title="Share issue link"
            >
              <Icons.Share className="w-4 h-4" />
              {copiedShareToast && (
                <span className="absolute -bottom-7 right-0 px-2 py-0.5 bg-[#172B4D] text-white rounded text-[10px] whitespace-nowrap shadow-md">
                  Link copied!
                </span>
              )}
            </button>

            {/* More Menu (•••) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-1.5 rounded hover:bg-[#EBECF0] text-slate-600 transition cursor-pointer"
                title="More actions"
              >
                <Icons.MoreHorizontal className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 text-xs text-slate-700"
                  onClick={() => setIsMoreMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setIsLogWorkModalOpen(true)}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Icons.Clock className="w-3.5 h-3.5 text-[#0052cc]" />
                    <span>Log work</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingChild(true)}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Icons.Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Add child issue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLinkModalOpen(true)}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Icons.Link className="w-3.5 h-3.5 text-slate-500" />
                    <span>Link issue</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Icons.Trash className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Fullscreen / Maximize Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded hover:bg-[#EBECF0] text-slate-600 transition cursor-pointer"
              title={isFullscreen ? 'Restore' : 'Full screen'}
            >
              {isFullscreen ? <Icons.Minimize className="w-4 h-4" /> : <Icons.Maximize className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#EBECF0] text-slate-600 transition cursor-pointer"
              title="Close (Esc)"
            >
              <Icons.X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODAL BODY: LEFT MAIN CONTENT + RIGHT DETAILS PANEL */}
        {/* ------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#EBECF0]">
          {/* Main Content Area (~65% width) */}
          <div className="lg:col-span-8 p-6 space-y-6">
            {/* Summary Title (Jira-style inline edit) */}
            <div className="group/summary">
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                onBlur={() => {
                  if (summary !== issue.summary && summary.trim()) {
                    handleUpdate('summary', { summary: summary.trim() });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="w-full text-2xl font-semibold text-[#172B4D] tracking-tight bg-transparent border border-transparent hover:border-[#DFE1E6] hover:bg-[#EBECF0]/30 focus:border-[#0052cc] focus:bg-white focus:ring-2 focus:ring-[#0052cc]/20 rounded px-2 py-1 -mx-2 transition"
                placeholder="What needs to be done?"
              />
            </div>

            {/* Quick Actions Toolbar */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.click();
                }}
                className="px-2.5 py-1 rounded bg-[#091E420F] hover:bg-[#091E4214] text-[#172B4D] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Attach file"
              >
                <Icons.Paperclip className="w-3.5 h-3.5 text-[#5E6C84]" />
                <span>Attach</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddingChild(true)}
                className="px-2.5 py-1 rounded bg-[#091E420F] hover:bg-[#091E4214] text-[#172B4D] font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Icons.Plus className="w-3.5 h-3.5 text-[#5E6C84]" />
                <span>Add child issue</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                className="px-2.5 py-1 rounded bg-[#091E420F] hover:bg-[#091E4214] text-[#172B4D] font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Icons.Link className="w-3.5 h-3.5 text-[#5E6C84]" />
                <span>Link issue</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLogWorkModalOpen(true)}
                className="px-2.5 py-1 rounded bg-[#091E420F] hover:bg-[#091E4214] text-[#172B4D] font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Icons.Clock className="w-3.5 h-3.5 text-[#5E6C84]" />
                <span>Log work</span>
              </button>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-[#172B4D]">
                  Description
                </span>
                {!isEditingDescription && (
                  <button
                    onClick={() => setIsEditingDescription(true)}
                    className="text-xs text-[#0052cc] hover:underline font-semibold cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditingDescription ? (
                <div className="space-y-2 border border-[#0052cc] rounded-lg p-2.5 bg-white shadow-xs">
                  {/* Jira Formatting Bar */}
                  <div className="flex items-center gap-1 pb-2 border-b border-slate-100 text-slate-600 text-xs">
                    <button
                      type="button"
                      onClick={() => setDescription((prev) => prev + ' **bold** ')}
                      className="p-1 hover:bg-slate-100 rounded font-bold"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescription((prev) => prev + ' *italic* ')}
                      className="p-1 hover:bg-slate-100 rounded italic font-serif"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescription((prev) => prev + '\n- Item ')}
                      className="p-1 hover:bg-slate-100 rounded"
                      title="Bulleted List"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescription((prev) => prev + '\n1. Item ')}
                      className="p-1 hover:bg-slate-100 rounded font-mono text-[11px]"
                      title="Numbered List"
                    >
                      1. List
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescription((prev) => prev + '\n```\ncode\n```\n')}
                      className="p-1 hover:bg-slate-100 rounded font-mono text-[11px]"
                      title="Code snippet"
                    >
                      &lt;/&gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescription((prev) => prev + '\n> Quote ')}
                      className="p-1 hover:bg-slate-100 rounded"
                      title="Quote"
                    >
                      &ldquo;
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    autoFocus
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border-none focus:outline-hidden text-xs text-[#172B4D] font-sans"
                    placeholder="Add a detailed description..."
                  />

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleUpdate('description', { description });
                        setIsEditingDescription(false);
                      }}
                      className="px-3.5 py-1.5 bg-[#0052cc] text-white rounded text-xs font-semibold hover:bg-[#0047b3] transition shadow-xs"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDescription(true)}
                  className="p-3 rounded-lg border border-transparent hover:border-[#DFE1E6] hover:bg-[#EBECF0]/30 text-xs text-[#172B4D] whitespace-pre-wrap cursor-pointer transition min-h-[60px]"
                >
                  {issue.description || <span className="text-[#7A869A] italic">Add a description...</span>}
                </div>
              )}
            </div>

            {/* Child Issues & Subtasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-[#172B4D]">
                    Child issues
                  </h3>
                  {childIssues.length > 0 && (
                    <span className="text-xs text-[#5E6C84]">
                      {completedChildren} of {childIssues.length} done
                    </span>
                  )}
                </div>

                {!isAddingChild && (
                  <button
                    type="button"
                    onClick={() => setIsAddingChild(true)}
                    className="text-xs text-[#0052cc] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Icons.Plus className="w-3.5 h-3.5" />
                    <span>Create subtask</span>
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {childIssues.length > 0 && (
                <div className="w-full bg-[#EBECF0] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#36B37E] h-1.5 transition-all duration-300 rounded-full"
                    style={{ width: `${childProgressPercent}%` }}
                  />
                </div>
              )}

              {/* Child Issues List */}
              <div className="space-y-1">
                {childIssues.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-[#EBECF0]/50 border border-[#EBECF0] transition group text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 mr-3">
                      <IssueTypeIcon type={child.issueType} className="w-4 h-4 shrink-0" />
                      <button
                        type="button"
                        onClick={() => setCurrentId(child.id)}
                        className="font-mono font-bold text-[#0052cc] hover:underline shrink-0"
                      >
                        {child.key}
                      </button>
                      <span className="truncate text-[#172B4D] font-medium">{child.summary}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <select
                        value={child.status}
                        onChange={(e) => handleChildStatusChange(child.id, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border cursor-pointer ${
                          child.status === 'Done'
                            ? 'bg-[#E3FCEF] text-[#006644] border-[#ABF5D1]'
                            : child.status === 'In Progress'
                            ? 'bg-[#DEEBFF] text-[#0052CC] border-[#B3D4FF]'
                            : 'bg-[#DFE1E6] text-[#42526E] border-[#C1C7D0]'
                        }`}
                      >
                        <option value="To Do">TO DO</option>
                        <option value="In Progress">IN PROGRESS</option>
                        <option value="In Review">IN REVIEW</option>
                        <option value="Done">DONE</option>
                      </select>

                      <PriorityIcon priority={child.priority} className="w-3.5 h-3.5" />

                      {child.assigneeName ? (
                        <div
                          className="w-5 h-5 rounded-full bg-[#0052cc] text-white font-bold text-[9px] flex items-center justify-center shadow-2xs"
                          title={child.assigneeName}
                        >
                          {child.assigneeName.charAt(0)}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                      )}
                    </div>
                  </div>
                ))}

                {childIssues.length === 0 && !isAddingChild && (
                  <p className="text-xs text-[#7A869A] italic py-1">
                    No child issues. Break down large work into manageable subtasks.
                  </p>
                )}
              </div>

              {/* Inline Create Child / Subtask Input */}
              {isAddingChild && (
                <form onSubmit={handleCreateChild} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <select
                      value={newChildType}
                      onChange={(e) => setNewChildType(e.target.value)}
                      className="px-2 py-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                    >
                      <option value="Subtask">Subtask</option>
                      <option value="Task">Task</option>
                      <option value="Story">Story</option>
                      <option value="Bug">Bug</option>
                    </select>
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="What needs to be done in this subtask?"
                      value={newChildSummary}
                      onChange={(e) => setNewChildSummary(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingChild(false)}
                      className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingChild || !newChildSummary.trim()}
                      className="px-3.5 py-1 bg-[#0052cc] hover:bg-[#0047b3] text-white rounded text-xs font-semibold disabled:opacity-50 shadow-xs"
                    >
                      {creatingChild ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Linked Issues */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[#172B4D]">
                  Linked issues
                </h3>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="text-xs text-[#0052cc] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  <span>Link issue</span>
                </button>
              </div>

              {Object.keys(groupedLinks).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(groupedLinks).map(([rel, list]) => (
                    <div key={rel} className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-[#5E6C84] uppercase tracking-wider pl-1">
                        {rel}
                      </div>
                      <div className="space-y-1">
                        {list.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center justify-between p-2 rounded hover:bg-[#EBECF0]/50 border border-[#EBECF0] text-xs transition"
                          >
                            <div className="flex items-center gap-2.5 truncate mr-3">
                              <IssueTypeIcon type={link.linkedIssue?.issueType || 'Story'} className="w-4 h-4 shrink-0" />
                              <button
                                type="button"
                                onClick={() => {
                                  if (link.linkedIssue?.id) setCurrentId(link.linkedIssue.id);
                                }}
                                className="font-mono font-bold text-[#0052cc] hover:underline shrink-0"
                              >
                                {link.targetKey}
                              </button>
                              <span className="truncate text-[#172B4D] font-medium">
                                {link.linkedIssue?.summary || 'Untitled issue'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              {link.linkedIssue && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                                  link.linkedIssue.status === 'Done'
                                    ? 'bg-[#E3FCEF] text-[#006644] border-[#ABF5D1]'
                                    : 'bg-[#DEEBFF] text-[#0052CC] border-[#B3D4FF]'
                                }`}>
                                  {link.linkedIssue.status}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(link.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Remove link"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#7A869A] italic py-1">
                  No linked issues. Click "+ Link issue" to create dependencies.
                </p>
              )}
            </div>

            {/* Activity Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3 border-b border-[#EBECF0] pb-2">
                <h3 className="font-semibold text-sm text-[#172B4D]">Activity</h3>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-[#5E6C84] mr-1 text-[11px]">Show:</span>
                  {(['comments', 'history', 'worklog'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                        activeTab === tab
                          ? 'bg-[#E9F2FF] text-[#0052cc] font-bold'
                          : 'text-[#5E6C84] hover:bg-[#EBECF0] hover:text-[#172B4D]'
                      }`}
                    >
                      {tab === 'comments'
                        ? `Comments (${issue.comments?.length || 0})`
                        : tab === 'worklog'
                        ? `Work log (${issue.worklogs?.length || 0})`
                        : `History (${issue.activities?.length || 0})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {/* Jira Comment Box */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      S
                    </div>
                    <div className="flex-1">
                      {!commentFocused && !newComment ? (
                        <div
                          onClick={() => setCommentFocused(true)}
                          className="w-full px-3 py-2 border border-[#DFE1E6] rounded-md text-xs text-[#6B778C] bg-white hover:bg-slate-50 cursor-text transition"
                        >
                          Add a comment...
                        </div>
                      ) : (
                        <form onSubmit={handleAddComment} className="border border-[#0052cc] rounded-md bg-white shadow-xs overflow-hidden">
                          <textarea
                            rows={3}
                            autoFocus
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment... (use @mention to notify)"
                            className="w-full p-3 text-xs text-[#172B4D] focus:outline-hidden resize-y"
                          />
                          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-[11px] text-[#6B778C]">
                              Pro tip: press <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Ctrl+Enter</kbd> to save
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewComment('');
                                  setCommentFocused(false);
                                }}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded font-medium transition cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={!newComment.trim()}
                                className="px-3.5 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] disabled:opacity-50 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3 pt-2">
                    {issue.comments?.map((c) => (
                      <div key={c.id} className="flex items-start gap-3 text-xs group">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {c.authorName ? c.authorName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-[#172B4D]">{c.authorName}</span>
                            <span className="text-[#5E6C84] text-[11px]">{new Date(c.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="p-3 bg-white border border-[#EBECF0] rounded-lg text-[#172B4D] whitespace-pre-wrap shadow-2xs">
                            {c.body}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Worklog Tab */}
              {activeTab === 'worklog' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
                    <div>
                      <span className="text-xs font-bold text-slate-700">Total logged time: </span>
                      <span className="text-xs font-extrabold text-[#0052cc]">
                        {formatMinutesToJiraTime(issue.timeSpentMinutes || 0)}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-2">
                        ({issue.timeSpentMinutes || 0} minutes)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLogWorkModalOpen(true)}
                      className="px-3 py-1 bg-[#0052cc] hover:bg-[#0047b3] text-white rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Icons.Clock className="w-3.5 h-3.5" />
                      <span>Log work</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {issue.worklogs && issue.worklogs.length > 0 ? (
                      issue.worklogs.map((w) => (
                        <div key={w.id} className="p-3 bg-white border border-[#EBECF0] rounded-lg text-xs flex items-start justify-between shadow-2xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#172B4D]">{w.authorName}</span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0052cc] font-bold text-[11px] border border-blue-200">
                                {formatMinutesToJiraTime(w.timeSpentMinutes)}
                              </span>
                            </div>
                            {w.comment ? (
                              <p className="text-slate-700 whitespace-pre-wrap">{w.comment}</p>
                            ) : (
                              <p className="text-slate-400 italic text-[11px]">No work note provided</p>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0 ml-3">
                            {new Date(w.startedAt || w.createdAt).toLocaleDateString()} {new Date(w.startedAt || w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Icons.Clock className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-slate-600">No work logged yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-2">
                  {issue.activities?.map((act) => (
                    <div key={act.id} className="text-xs p-2.5 rounded bg-slate-50/70 border border-slate-100 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0052cc] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <span className="font-semibold text-slate-800">{act.authorName}</span>{' '}
                        <span className="text-slate-600">{act.details}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* RIGHT SIDEBAR PROPERTIES (JIRA CLOUD STYLE) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-4 p-5 space-y-4 bg-white text-xs border-l border-[#EBECF0]">
            {/* 1. STATUS LOZENGE DROPDOWN */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className={`w-full px-3 py-1.5 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-between transition cursor-pointer shadow-xs ${
                  issue.status === 'Done'
                    ? 'bg-[#E3FCEF] text-[#006644] hover:bg-[#D3F9E5] border border-[#ABF5D1]'
                    : issue.status === 'In Progress'
                    ? 'bg-[#0052CC] text-white hover:bg-[#0047B3]'
                    : issue.status === 'In Review'
                    ? 'bg-[#FFF0B3] text-[#172B4D] hover:bg-[#FFE380] border border-[#FFE380]'
                    : 'bg-[#DFE1E6] text-[#42526E] hover:bg-[#C1C7D0]'
                }`}
              >
                <span>{issue.status}</span>
                <Icons.ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {isStatusDropdownOpen && (
                <div
                  className="absolute left-0 top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setIsStatusDropdownOpen(false)}
                >
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Change status
                  </div>
                  {statuses.map((st) => {
                    const isSelected = st.name.toLowerCase() === issue.status.toLowerCase();
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleUpdate('status', { status: st.name })}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                          isSelected ? 'font-bold bg-blue-50/60 text-[#0052cc]' : 'text-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              st.category === 'done'
                                ? 'bg-emerald-500'
                                : st.category === 'indeterminate'
                                ? 'bg-blue-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="uppercase text-[11px] font-semibold">{st.name}</span>
                        </span>
                        {isSelected && <Icons.Check className="w-3.5 h-3.5 text-[#0052cc]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. DETAILS ACCORDION */}
            <div className="border border-[#EBECF0] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                className="w-full px-3 py-2 bg-slate-50/80 hover:bg-slate-100/70 border-b border-[#EBECF0] flex items-center justify-between text-xs font-bold text-[#172B4D] cursor-pointer"
              >
                <span>Details</span>
                {isDetailsOpen ? <Icons.ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <Icons.ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
              </button>

              {isDetailsOpen && (
                <div className="p-3 space-y-3 bg-white">
                  {/* Assignee */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6B778C] font-medium w-24 shrink-0">Assignee</span>
                    <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                      <select
                        value={issue.assigneeName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const u = users.find((usr) => usr.displayName === val);
                          handleUpdate('assignee', {
                            assigneeName: val || undefined,
                            assigneeEmail: u?.emailAddress
                          });
                        }}
                        className="px-2 py-1 text-xs border border-transparent hover:border-[#DFE1E6] rounded text-[#172B4D] font-medium bg-transparent cursor-pointer max-w-[160px] truncate"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.displayName}>
                            {u.displayName}
                          </option>
                        ))}
                      </select>
                      {!issue.assigneeName && (
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdate('assignee', {
                              assigneeName: 'Sajidur Rahman',
                              assigneeEmail: 'sajidur@akij.net'
                            });
                          }}
                          className="text-[11px] text-[#0052cc] hover:underline font-semibold shrink-0 cursor-pointer"
                        >
                          Assign to me
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reporter */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6B778C] font-medium w-24 shrink-0">Reporter</span>
                    <span className="font-medium text-[#172B4D] truncate">{issue.reporterName || 'Admin'}</span>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6B778C] font-medium w-24 shrink-0">Priority</span>
                    <div className="flex items-center gap-1.5">
                      <PriorityIcon priority={issue.priority} className="w-4 h-4 shrink-0" />
                      <select
                        value={issue.priority}
                        onChange={(e) => handleUpdate('priority', { priority: e.target.value })}
                        className="px-2 py-0.5 border border-transparent hover:border-[#DFE1E6] rounded text-[#172B4D] font-medium bg-transparent cursor-pointer"
                      >
                        <option value="Highest">Highest</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                        <option value="Lowest">Lowest</option>
                      </select>
                    </div>
                  </div>

                  {/* Sprint */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6B778C] font-medium w-24 shrink-0">Sprint</span>
                    <select
                      value={issue.sprintId ?? 0}
                      onChange={(e) => {
                        const sId = parseInt(e.target.value);
                        handleUpdate('sprint', { sprintId: sId === 0 ? null : sId });
                      }}
                      className="px-2 py-0.5 border border-transparent hover:border-[#DFE1E6] rounded text-[#0052cc] font-semibold bg-transparent cursor-pointer max-w-[160px] truncate"
                    >
                      <option value="0">Backlog (No Sprint)</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Story Points */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6B778C] font-medium w-24 shrink-0">Story Points</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={issue.storyPoints ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                        handleUpdate('storyPoints', { storyPoints: val });
                      }}
                      placeholder="None"
                      className="w-16 px-2 py-0.5 text-right font-bold text-slate-800 border border-transparent hover:border-[#DFE1E6] rounded bg-transparent"
                    />
                  </div>

                  {/* Parent Issue */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6B778C] font-medium w-24 shrink-0">Parent</span>
                    <div className="flex items-center gap-1.5">
                      {issue.parentIssueKey ? (
                        <button
                          type="button"
                          onClick={() => {
                            const parentFound = projectIssues.find((pi) => pi.key.toUpperCase() === issue.parentIssueKey?.toUpperCase());
                            if (parentFound) setCurrentId(parentFound.id);
                          }}
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-mono font-bold text-[11px]"
                        >
                          {issue.parentIssueKey}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">None</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. TIME TRACKING ACCORDION */}
            <div className="border border-[#EBECF0] rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-50/80 border-b border-[#EBECF0] flex items-center justify-between text-xs font-bold text-[#172B4D]">
                <div className="flex items-center gap-1.5">
                  <Icons.Clock className="w-3.5 h-3.5 text-[#5E6C84]" />
                  <span>Time tracking</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLogWorkModalOpen(true)}
                  className="text-[11px] text-[#0052cc] hover:underline font-semibold cursor-pointer"
                >
                  + Log work
                </button>
              </div>

              <div className="p-3 space-y-2.5 bg-white">
                {/* Jira Progress Bar */}
                {(() => {
                  const logged = issue.timeSpentMinutes || 0;
                  const remaining = issue.remainingEstimateMinutes ?? Math.max(0, (issue.originalEstimateMinutes || 0) - logged);
                  const total = logged + remaining;
                  const loggedPercent = total > 0 ? Math.min(100, Math.round((logged / total) * 100)) : 0;

                  return (
                    <div className="space-y-1.5">
                      <div
                        className="w-full bg-[#EBECF0] rounded-full h-2 overflow-hidden flex"
                        title={`${formatMinutesToJiraTime(logged)} logged of ${formatMinutesToJiraTime(total)} total estimate`}
                      >
                        {loggedPercent > 0 && (
                          <div
                            className="bg-[#0052CC] h-2 transition-all duration-300"
                            style={{ width: `${loggedPercent}%` }}
                          />
                        )}
                        {total > 0 && loggedPercent < 100 && (
                          <div
                            className="bg-[#FFE380] h-2 transition-all duration-300"
                            style={{ width: `${100 - loggedPercent}%` }}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#5E6C84]">
                        <span className="font-semibold text-[#172B4D]">{formatMinutesToJiraTime(logged)} logged</span>
                        <span>{formatMinutesToJiraTime(remaining)} remaining</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Estimate numbers */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Original estimate:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOriginalEstimateInput(issue.originalEstimateMinutes ? formatMinutesToJiraTime(issue.originalEstimateMinutes) : '');
                        setIsEditingOriginalEstimate(true);
                      }}
                      className="font-semibold text-slate-800 hover:underline cursor-pointer"
                    >
                      {issue.originalEstimateMinutes ? formatMinutesToJiraTime(issue.originalEstimateMinutes) : <span className="text-slate-400 italic">None</span>}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Remaining estimate:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRemainingEstimateInput(
                          issue.remainingEstimateMinutes !== undefined && issue.remainingEstimateMinutes !== null
                            ? formatMinutesToJiraTime(issue.remainingEstimateMinutes)
                            : ''
                        );
                        setIsEditingRemainingEstimate(true);
                      }}
                      className="font-semibold text-slate-800 hover:underline cursor-pointer"
                    >
                      {issue.remainingEstimateMinutes !== undefined && issue.remainingEstimateMinutes !== null ? formatMinutesToJiraTime(issue.remainingEstimateMinutes) : <span className="text-slate-400 italic">None</span>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. DATES FOOTER */}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Created:</span>
                <span>{new Date(issue.createdAt).toLocaleDateString()} {new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Updated:</span>
                <span>{new Date(issue.updatedAt).toLocaleDateString()} {new Date(issue.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LINK ISSUE MODAL (Atlassian ADS Style) */}
      {/* ------------------------------------------------------------- */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Icons.Link className="w-4 h-4 text-[#0052cc]" />
                <h3 className="font-bold text-sm text-slate-900">Link Issue to {issue.key}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLink} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Relationship <span className="text-rose-500">*</span>
                </label>
                <select
                  value={linkRelationship}
                  onChange={(e) => setLinkRelationship(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
                >
                  <option value="blocks">This issue blocks</option>
                  <option value="is blocked by">This issue is blocked by</option>
                  <option value="relates to">This issue relates to</option>
                  <option value="duplicates">This issue duplicates</option>
                  <option value="causes">This issue causes</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Issue <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={linkTargetKey}
                  onChange={(e) => setLinkTargetKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
                >
                  <option value="">— Select an issue to link —</option>
                  {projectIssues.map((pi) => (
                    <option key={pi.key} value={pi.key}>
                      {pi.key} ({pi.issueType}): {pi.summary}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Choose from active issues in the current project.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linkingIssue || !linkTargetKey}
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white rounded-md text-xs font-bold disabled:opacity-50 transition"
                >
                  {linkingIssue ? 'Linking...' : 'Link Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* JIRA LOG WORK MODAL (Atlassian ADS Style) */}
      {/* ------------------------------------------------------------- */}
      {isLogWorkModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-[#0052cc] rounded-lg">
                  <Icons.Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#172B4D]">Log work</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {issue.key} • {issue.summary}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogWorkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-200/60 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogWorkSubmit} className="p-6 space-y-4 text-xs">
              {/* Time Spent */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-[#172B4D] text-xs">
                    Time spent <span className="text-rose-500">*</span>
                  </label>
                  {parseJiraTimeToMinutes(logTimeSpentStr) > 0 && (
                    <span className="text-[11px] font-semibold text-[#0052cc] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      = {formatMinutesToJiraTime(parseJiraTimeToMinutes(logTimeSpentStr))} ({parseJiraTimeToMinutes(logTimeSpentStr)} mins)
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={logTimeSpentStr}
                  onChange={(e) => setLogTimeSpentStr(e.target.value)}
                  placeholder="e.g. 3w 4d 12h, 2h 30m, 45m"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Use shorthand: <span className="font-mono text-slate-600">1d</span> = 8h, <span className="font-mono text-slate-600">1w</span> = 5d (40h), <span className="font-mono text-slate-600">2h 30m</span>, <span className="font-mono text-slate-600">45m</span>.
                </p>
              </div>

              {/* Date Started */}
              <div>
                <label className="block font-bold text-[#172B4D] text-xs mb-1.5">
                  Date started
                </label>
                <input
                  type="datetime-local"
                  value={logStartedAt}
                  onChange={(e) => setLogStartedAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Remaining Estimate Options */}
              <div>
                <label className="block font-bold text-[#172B4D] text-xs mb-1.5">
                  Remaining estimate
                </label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="remainingOption"
                      value="auto"
                      checked={logRemainingOption === 'auto'}
                      onChange={() => setLogRemainingOption('auto')}
                      className="text-[#0052cc] focus:ring-blue-500"
                    />
                    <span>Adjust automatically (reduce remaining estimate by time spent)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="remainingOption"
                      value="leave"
                      checked={logRemainingOption === 'leave'}
                      onChange={() => setLogRemainingOption('leave')}
                      className="text-[#0052cc] focus:ring-blue-500"
                    />
                    <span>
                      Leave existing estimate unchanged ({formatMinutesToJiraTime(issue.remainingEstimateMinutes ?? 0)})
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="remainingOption"
                      value="set"
                      checked={logRemainingOption === 'set'}
                      onChange={() => setLogRemainingOption('set')}
                      className="text-[#0052cc] focus:ring-blue-500"
                    />
                    <span>Set to:</span>
                    {logRemainingOption === 'set' && (
                      <input
                        type="text"
                        value={logRemainingStr}
                        onChange={(e) => setLogRemainingStr(e.target.value)}
                        placeholder="e.g. 1d 2h"
                        className="w-28 px-2 py-1 border border-slate-300 rounded text-xs bg-white ml-2"
                      />
                    )}
                  </label>
                </div>
              </div>

              {/* Work Description */}
              <div>
                <label className="block font-bold text-[#172B4D] text-xs mb-1.5">
                  Work description
                </label>
                <textarea
                  rows={3}
                  value={logDescription}
                  onChange={(e) => setLogDescription(e.target.value)}
                  placeholder="Describe what work was done..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogWorkModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWorklog || parseJiraTimeToMinutes(logTimeSpentStr) <= 0}
                  className="px-5 py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white rounded-md text-xs font-bold disabled:opacity-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingWorklog ? (
                    <>
                      <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                      <span>Logging...</span>
                    </>
                  ) : (
                    <span>Log work</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
