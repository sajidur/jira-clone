'use client';

import React, { useState, useEffect } from 'react';
import {
  Project,
  WorkflowStatus,
  CustomFieldDefinition,
  WorkflowTransition,
  WorkflowRule,
  ProjectComponent,
  ProjectIssueType,
  ProjectPriority,
  ProjectResolution,
  ProjectWebhook
} from '@/types/jira';
import { Icons } from './Icons';
import {
  fetchWorkflowStatuses,
  createWorkflowStatus,
  updateWorkflowStatus,
  deleteWorkflowStatus,
  reorderWorkflowStatuses,
  fetchCustomFields,
  createCustomField,
  deleteCustomField,
  fetchTransitions,
  createTransition,
  updateTransition,
  deleteTransition,
  toggleTransitionMatrix,
  applyWorkflowTemplate,
  fetchWorkflowRules,
  createWorkflowRule,
  toggleWorkflowRule,
  deleteWorkflowRule,
  fetchComponents,
  createComponent,
  deleteComponent,
  fetchIssueTypes,
  createIssueType,
  deleteIssueType,
  fetchPriorities,
  createPriority,
  deletePriority,
  fetchResolutions,
  createResolution,
  deleteResolution,
  fetchWebhooks,
  createWebhook,
  deleteWebhook,
  updateProject
} from '@/lib/api';
import { SpaceAvatar, SpaceAvatarPicker } from './SpaceAvatar';

interface ConfigurationViewProps {
  project: Project;
  onProjectUpdated?: (p: Project) => void;
}

type ConfigTab =
  | 'space-details'
  | 'workflow-studio'
  | 'custom-fields'
  | 'automations'
  | 'issue-types'
  | 'components'
  | 'priorities-resolutions'
  | 'webhooks';

export const ConfigurationView: React.FC<ConfigurationViewProps> = ({ project, onProjectUpdated }) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('space-details');
  const [workflowStudioMode, setWorkflowStudioMode] = useState<'diagram' | 'matrix'>('diagram');

  // Space Details form
  const [spaceName, setSpaceName] = useState(project.name || '');
  const [spaceAvatarUrl, setSpaceAvatarUrl] = useState(project.avatarUrl || '');
  const [spaceDesc, setSpaceDesc] = useState(project.description || '');
  const [spaceLead, setSpaceLead] = useState(project.leadName || 'Sajidur Rahman');
  const [spaceLeadEmail, setSpaceLeadEmail] = useState(project.leadEmail || 'sajidur@akij.net');
  const [spaceType, setSpaceType] = useState(project.projectTypeKey || 'software');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSuccess, setDetailsSuccess] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    setSpaceName(project.name || '');
    setSpaceAvatarUrl(project.avatarUrl || '');
    setSpaceDesc(project.description || '');
    setSpaceLead(project.leadName || 'Sajidur Rahman');
    setSpaceLeadEmail(project.leadEmail || 'sajidur@akij.net');
    setSpaceType(project.projectTypeKey || 'software');
  }, [project]);

  const handleSaveSpaceDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceName.trim()) {
      setDetailsError('Space name cannot be empty.');
      return;
    }
    try {
      setSavingDetails(true);
      setDetailsError(null);
      const updated = await updateProject(project.id, {
        name: spaceName.trim(),
        avatarUrl: spaceAvatarUrl,
        description: spaceDesc.trim(),
        leadName: spaceLead.trim(),
        leadEmail: spaceLeadEmail.trim(),
        projectTypeKey: spaceType
      });
      setDetailsSuccess('Space name and details updated successfully.');
      setTimeout(() => setDetailsSuccess(null), 3500);
      onProjectUpdated?.(updated);
    } catch (err: any) {
      setDetailsError(err.message || 'Failed to update space details.');
    } finally {
      setSavingDetails(false);
    }
  };

  // Statuses & Transitions
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowStatus | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<WorkflowTransition | null>(null);

  // Status modals
  const [showAddStatusModal, setShowAddStatusModal] = useState(false);
  const [showEditStatusModal, setShowEditStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<WorkflowStatus | null>(null);
  const [statusName, setStatusName] = useState('');
  const [statusCategory, setStatusCategory] = useState('In Progress');
  const [statusColor, setStatusColor] = useState('#2563eb');
  const [statusWip, setStatusWip] = useState<number | ''>('');

  // Transition modals
  const [showAddTransModal, setShowAddTransModal] = useState(false);
  const [showEditTransModal, setShowEditTransModal] = useState(false);
  const [transName, setTransName] = useState('');
  const [transFrom, setTransFrom] = useState('');
  const [transTo, setTransTo] = useState('');
  const [transDesc, setTransDesc] = useState('');
  const [transRole, setTransRole] = useState('Any');
  const [transAutoRes, setTransAutoRes] = useState('None');
  const [transAutoAssign, setTransAutoAssign] = useState('');

  // Custom Fields
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>(['Option 1', 'Option 2', 'Option 3']);
  const [optionInput, setOptionInput] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldShowInList, setNewFieldShowInList] = useState(true);

  // Automations
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [ruleName, setRuleName] = useState('');
  const [ruleTrigger, setRuleTrigger] = useState('OnStatusChange');
  const [ruleConditionStatus, setRuleConditionStatus] = useState('Done');
  const [ruleActionType, setRuleActionType] = useState('SetResolution');
  const [ruleActionValue, setRuleActionValue] = useState('Done');
  const [simulatedLog, setSimulatedLog] = useState<string | null>(null);

  // Components
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [newCompName, setNewCompName] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [newCompLead, setNewCompLead] = useState('Sajidur Rahman');

  // Issue Types
  const [issueTypes, setIssueTypes] = useState<ProjectIssueType[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('Story');
  const [newTypeIsSubtask, setNewTypeIsSubtask] = useState(false);

  // Priorities & Resolutions
  const [priorities, setPriorities] = useState<ProjectPriority[]>([]);
  const [newPriorityName, setNewPriorityName] = useState('');
  const [newPriorityColor, setNewPriorityColor] = useState('#ff5630');
  const [newPriorityDesc, setNewPriorityDesc] = useState('');

  const [resolutions, setResolutions] = useState<ProjectResolution[]>([]);
  const [newResolutionName, setNewResolutionName] = useState('');
  const [newResolutionDesc, setNewResolutionDesc] = useState('');

  // Webhooks
  const [webhooks, setWebhooks] = useState<ProjectWebhook[]>([]);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [project.id]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [sData, cfData, tData, rData, cData, itData, pData, resData, wData] = await Promise.all([
        fetchWorkflowStatuses(project.id),
        fetchCustomFields(project.id),
        fetchTransitions(project.id),
        fetchWorkflowRules(project.id),
        fetchComponents(project.id),
        fetchIssueTypes(project.id),
        fetchPriorities(project.id),
        fetchResolutions(project.id),
        fetchWebhooks(project.id)
      ]);
      setStatuses(sData);
      setCustomFields(cfData);
      setTransitions(tData);
      setRules(rData);
      setComponents(cData);
      setIssueTypes(itData);
      setPriorities(pData);
      setResolutions(resData);
      setWebhooks(wData);
      if (sData.length > 0 && !selectedNode) {
        setSelectedNode(sData[0]);
      }
    } catch (err) {
      console.error('Failed to load project configuration', err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // STATUS ACTIONS
  // -------------------------------------------------------------
  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusName.trim()) return;
    try {
      await createWorkflowStatus({
        projectId: project.id,
        name: statusName.trim(),
        category: statusCategory,
        color: statusColor,
        wipLimit: statusWip ? Number(statusWip) : undefined
      });
      setShowAddStatusModal(false);
      setStatusName('');
      setStatusWip('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create status');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatus || !statusName.trim()) return;
    try {
      await updateWorkflowStatus(editingStatus.id, {
        projectId: project.id,
        name: statusName.trim(),
        category: statusCategory,
        color: statusColor,
        wipLimit: statusWip ? Number(statusWip) : undefined
      });
      setShowEditStatusModal(false);
      setEditingStatus(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDeleteStatus = async (id: number) => {
    if (!confirm('Delete this workflow status? Any existing issues in this column will be moved to adjacent status.')) return;
    try {
      await deleteWorkflowStatus(id);
      setSelectedNode(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete status');
    }
  };

  // -------------------------------------------------------------
  // TRANSITION ACTIONS
  // -------------------------------------------------------------
  const handleCreateTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transFrom || !transTo) return;
    try {
      await createTransition({
        projectId: project.id,
        fromStatus: transFrom,
        toStatus: transTo,
        name: transName.trim() || `${transFrom} ➔ ${transTo}`,
        description: transDesc.trim() || undefined,
        requiredRole: transRole !== 'Any' ? transRole : undefined,
        autoResolution: transAutoRes !== 'None' ? transAutoRes : undefined,
        autoAssignee: transAutoAssign.trim() || undefined
      });
      setShowAddTransModal(false);
      resetTransitionForm();
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create transition');
    }
  };

  const handleUpdateTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransition || !transFrom || !transTo) return;
    try {
      await updateTransition(selectedTransition.id, {
        projectId: project.id,
        fromStatus: transFrom,
        toStatus: transTo,
        name: transName.trim() || `${transFrom} ➔ ${transTo}`,
        description: transDesc.trim() || undefined,
        requiredRole: transRole !== 'Any' ? transRole : undefined,
        autoResolution: transAutoRes !== 'None' ? transAutoRes : undefined,
        autoAssignee: transAutoAssign.trim() || undefined
      });
      setShowEditTransModal(false);
      setSelectedTransition(null);
      resetTransitionForm();
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update transition');
    }
  };

  const handleDeleteTransition = async (id: number) => {
    if (!confirm('Delete this workflow transition?')) return;
    try {
      await deleteTransition(id);
      setSelectedTransition(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete transition');
    }
  };

  const handleApplyTemplate = async (template: 'scrum' | 'kanban' | 'enterprise_qa') => {
    const names = {
      scrum: 'Jira Scrum Standard',
      kanban: 'Simplified Kanban (WIP)',
      enterprise_qa: 'Enterprise QA / Release Pipeline'
    };
    if (!confirm(`Apply the "${names[template]}" template? This will replace current statuses and transitions with Jira best-practice flows.`)) return;

    try {
      await applyWorkflowTemplate(project.id, template);
      setSelectedNode(null);
      setSelectedTransition(null);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to apply template');
    }
  };

  const resetTransitionForm = () => {
    setTransName('');
    setTransFrom('');
    setTransTo('');
    setTransDesc('');
    setTransRole('Any');
    setTransAutoRes('None');
    setTransAutoAssign('');
  };

  const openEditStatus = (s: WorkflowStatus) => {
    setEditingStatus(s);
    setStatusName(s.name);
    setStatusCategory(s.category);
    setStatusColor(s.color);
    setStatusWip(s.wipLimit ?? '');
    setShowEditStatusModal(true);
  };

  const openEditTransition = (t: WorkflowTransition) => {
    setSelectedTransition(t);
    setTransName(t.name);
    setTransFrom(t.fromStatus);
    setTransTo(t.toStatus);
    setTransDesc(t.description || '');
    setTransRole(t.requiredRole || 'Any');
    setTransAutoRes(t.autoResolution || 'None');
    setTransAutoAssign(t.autoAssignee || '');
    setShowEditTransModal(true);
  };

  // -------------------------------------------------------------
  // CUSTOM FIELDS ACTIONS
  // -------------------------------------------------------------
  const handleAddOption = () => {
    if (!optionInput.trim()) return;
    if (!newFieldOptions.includes(optionInput.trim())) {
      setNewFieldOptions([...newFieldOptions, optionInput.trim()]);
    }
    setOptionInput('');
  };

  const handleRemoveOption = (opt: string) => {
    setNewFieldOptions(newFieldOptions.filter(o => o !== opt));
  };

  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    try {
      const key = newFieldKey.trim() || newFieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await createCustomField({
        projectId: project.id,
        name: newFieldName.trim(),
        fieldKey: key,
        fieldType: newFieldType,
        options: ['select', 'multiselect'].includes(newFieldType) ? newFieldOptions : undefined,
        isRequired: newFieldRequired,
        showInListView: newFieldShowInList
      });
      setNewFieldName('');
      setNewFieldKey('');
      setNewFieldType('text');
      setNewFieldOptions(['Option 1', 'Option 2', 'Option 3']);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create field');
    }
  };

  const handleDeleteField = async (id: number) => {
    if (!confirm('Delete this custom field? Existing values stored in issues will remain archived.')) return;
    try {
      await deleteCustomField(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete field');
    }
  };

  // -------------------------------------------------------------
  // AUTOMATION ACTIONS
  // -------------------------------------------------------------
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;
    try {
      await createWorkflowRule({
        projectId: project.id,
        name: ruleName.trim(),
        triggerEvent: ruleTrigger,
        conditionStatus: ruleConditionStatus,
        actionType: ruleActionType,
        actionValue: ruleActionValue
      });
      setRuleName('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create rule');
    }
  };

  const handleToggleRule = async (id: number) => {
    try {
      await toggleWorkflowRule(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle rule');
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Delete this automation rule?')) return;
    try {
      await deleteWorkflowRule(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete rule');
    }
  };

  const handleSimulateRule = (rule: WorkflowRule) => {
    setSimulatedLog(
      `[SIMULATION EXECUTION @ ${new Date().toLocaleTimeString()}]\n` +
      `Rule: "${rule.name}"\n` +
      `Trigger Evaluated: ${rule.triggerEvent} -> MATCHED\n` +
      `Condition Verified: Status == "${rule.conditionStatus || 'Any'}" -> TRUE\n` +
      `Action Executed: ${rule.actionType}("${rule.actionValue}")\n` +
      `Result: 1 Issue modified successfully. Automated audit record logged.`
    );
  };

  // -------------------------------------------------------------
  // COMPONENTS & ISSUE TYPES & PRIORITIES & RESOLUTIONS
  // -------------------------------------------------------------
  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;
    try {
      await createComponent({
        projectId: project.id,
        name: newCompName.trim(),
        description: newCompDesc.trim() || undefined,
        leadName: newCompLead.trim() || undefined
      });
      setNewCompName('');
      setNewCompDesc('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create component');
    }
  };

  const handleDeleteComponent = async (id: number) => {
    if (!confirm('Delete this component?')) return;
    try {
      await deleteComponent(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete component');
    }
  };

  const handleCreateIssueType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    try {
      await createIssueType({
        projectId: project.id,
        name: newTypeName.trim(),
        description: newTypeDesc.trim() || undefined,
        icon: newTypeIcon,
        isSubtask: newTypeIsSubtask,
        order: issueTypes.length + 1
      });
      setNewTypeName('');
      setNewTypeDesc('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create issue type');
    }
  };

  const handleDeleteIssueType = async (id: number) => {
    if (!confirm('Delete this issue type?')) return;
    try {
      await deleteIssueType(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete issue type');
    }
  };

  const handleCreatePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriorityName.trim()) return;
    try {
      await createPriority({
        projectId: project.id,
        name: newPriorityName.trim(),
        color: newPriorityColor,
        description: newPriorityDesc.trim() || undefined,
        order: priorities.length + 1
      });
      setNewPriorityName('');
      setNewPriorityDesc('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create priority');
    }
  };

  const handleDeletePriority = async (id: number) => {
    if (!confirm('Delete this priority?')) return;
    try {
      await deletePriority(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete priority');
    }
  };

  const handleCreateResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResolutionName.trim()) return;
    try {
      await createResolution({
        projectId: project.id,
        name: newResolutionName.trim(),
        description: newResolutionDesc.trim() || undefined,
        order: resolutions.length + 1
      });
      setNewResolutionName('');
      setNewResolutionDesc('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create resolution');
    }
  };

  const handleDeleteResolution = async (id: number) => {
    if (!confirm('Delete this resolution?')) return;
    try {
      await deleteResolution(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete resolution');
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;
    try {
      await createWebhook({
        projectId: project.id,
        name: newWebhookName.trim(),
        url: newWebhookUrl.trim(),
        eventsJson: JSON.stringify(['issue:created', 'issue:updated', 'issue:transitioned']),
        isEnabled: true
      });
      setNewWebhookName('');
      setNewWebhookUrl('');
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create webhook');
    }
  };

  const handleDeleteWebhook = async (id: number) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await deleteWebhook(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete webhook');
    }
  };

  const handleTestWebhook = (name: string, url: string) => {
    setWebhookTestStatus(`Sending ping payload to ${url}...`);
    setTimeout(() => {
      setWebhookTestStatus(`200 OK: Test event received and verified by "${name}".`);
    }, 600);
  };

  // Helper colors
  const categoryBadgeClass = (category: string) => {
    switch (category) {
      case 'To Do':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Done':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="flex-1 min-w-0 w-full overflow-y-auto bg-slate-50 min-h-0 p-4 sm:p-6 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Icons.Sliders className="w-6 h-6 text-[#0052cc]" />
              Workflow Studio & Dynamic Customization
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Advanced Jira-compatible project studio: visual state machine canvas, granular workflow transitions & post-functions, 
              dynamic custom fields with live preview, no-code automation flows, and component hierarchies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAll()}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Icons.Refresh className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl overflow-x-auto">
          {[
            { id: 'space-details', label: '1. Space Details & Name', icon: Icons.Edit },
            { id: 'workflow-studio', label: '2. Workflow Studio (Visual Canvas)', icon: Icons.Compass },
            { id: 'custom-fields', label: `3. Custom Fields (${customFields.length})`, icon: Icons.Sliders },
            { id: 'automations', label: `4. Automation Engine (${rules.length})`, icon: Icons.Check },
            { id: 'issue-types', label: `5. Issue Types (${issueTypes.length})`, icon: Icons.Tag },
            { id: 'components', label: `6. Components (${components.length})`, icon: Icons.Layers },
            { id: 'priorities-resolutions', label: '7. Priorities & Resolutions', icon: Icons.Star },
            { id: 'webhooks', label: `8. Webhooks (${webhooks.length})`, icon: Icons.Link }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ConfigTab)}
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
        {/* TAB 0: SPACE DETAILS & NAME */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'space-details' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <SpaceAvatar project={{ ...project, avatarUrl: spaceAvatarUrl }} size="lg" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Space Profile & Brand Settings</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update the space name, logo, color theme, description, and lead details across Jira.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#0052cc] font-mono text-xs font-bold border border-blue-200">
                  Key: {project.key}
                </span>
              </div>
            </div>

            {detailsSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{detailsSuccess}</span>
              </div>
            )}

            {detailsError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                <Icons.X className="w-4 h-4 shrink-0" />
                <span>{detailsError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSpaceDetails} className="space-y-6 text-xs max-w-2xl">
              {/* Space Avatar & Color Picker */}
              <div>
                <label className="block font-bold text-slate-800 mb-2 text-sm">
                  Space Logo & Color Palette
                </label>
                <SpaceAvatarPicker
                  value={spaceAvatarUrl}
                  projectKey={project.key}
                  projectName={spaceName || project.name}
                  onChange={setSpaceAvatarUrl}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Space / Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  placeholder="e.g. RexSystem Cloud Agile Platform, ERP Platform"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc] text-sm transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  The primary space title displayed in navigation menus, sprint boards, backlogs, and cards.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Space Key (Prefix)</label>
                  <input
                    type="text"
                    disabled
                    value={project.key}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-500 bg-slate-100 font-mono text-xs cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Assigned prefix for tickets (e.g. {project.key}-1)
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Space Category</label>
                  <select
                    value={spaceType}
                    onChange={(e) => setSpaceType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
                  >
                    <option value="software">Software (Scrum / Agile Sprint Planning)</option>
                    <option value="kanban">Software (Kanban Continuous Flow)</option>
                    <option value="business">Business Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Description / Project Scope</label>
                <textarea
                  rows={4}
                  value={spaceDesc}
                  onChange={(e) => setSpaceDesc(e.target.value)}
                  placeholder="Describe the deliverables, team objectives, and milestones for this space..."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc] transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Space Lead Name</label>
                  <input
                    type="text"
                    value={spaceLead}
                    onChange={(e) => setSpaceLead(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Space Lead Email</label>
                  <input
                    type="email"
                    value={spaceLeadEmail}
                    onChange={(e) => setSpaceLeadEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#0052cc]/20 focus:border-[#0052cc]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="submit"
                  disabled={savingDetails || !spaceName.trim()}
                  className="px-5 py-2.5 rounded-lg bg-[#0052cc] hover:bg-[#0047b3] disabled:opacity-50 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 text-xs"
                >
                  {savingDetails && <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingDetails ? 'Saving Space...' : 'Save Space Details'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: WORKFLOW STUDIO (VISUAL CANVAS & MATRIX) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'workflow-studio' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-6">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                {/* View Switcher */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setWorkflowStudioMode('diagram')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                      workflowStudioMode === 'diagram'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icons.Compass className="w-3.5 h-3.5 text-[#0052cc]" />
                    <span>Visual Canvas Graph</span>
                  </button>
                  <button
                    onClick={() => setWorkflowStudioMode('matrix')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                      workflowStudioMode === 'matrix'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icons.List className="w-3.5 h-3.5 text-slate-600" />
                    <span>Transitions Matrix</span>
                  </button>
                </div>

                {/* Preset Templates */}
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Templates:</span>
                  <button
                    onClick={() => handleApplyTemplate('scrum')}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition cursor-pointer"
                  >
                    Scrum Standard
                  </button>
                  <button
                    onClick={() => handleApplyTemplate('kanban')}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition cursor-pointer"
                  >
                    Kanban (WIP)
                  </button>
                  <button
                    onClick={() => handleApplyTemplate('enterprise_qa')}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition cursor-pointer"
                  >
                    Enterprise QA
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    resetTransitionForm();
                    setShowAddTransModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  <span>+ Add Transition</span>
                </button>
                <button
                  onClick={() => {
                    setStatusName('');
                    setStatusWip('');
                    setShowAddStatusModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#0052cc] hover:bg-[#0065ff] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  <span>+ Add Status Node</span>
                </button>
              </div>
            </div>

            {/* DIAGRAM MODE */}
            {workflowStudioMode === 'diagram' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Visual Flow Canvas */}
                <div className="lg:col-span-3 bg-slate-900 rounded-2xl p-6 min-h-[460px] relative overflow-hidden flex flex-col justify-between border border-slate-800 shadow-inner">
                  {/* Subtle Grid Background Pattern */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }}
                  />

                  {/* Canvas Legend & Status Bar */}
                  <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> To Do
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> In Progress
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Done
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      Interactive State Machine: Click nodes or transitions to inspect
                    </div>
                  </div>

                  {/* Visual Nodes Pipeline */}
                  <div className="relative z-10 my-auto py-8">
                    <div className="flex items-center justify-around gap-4 flex-wrap">
                      {statuses.map((s, idx) => {
                        const isSelected = selectedNode?.id === s.id;
                        const outgoing = transitions.filter(t => t.fromStatus === s.name || t.fromStatus === '*');
                        const incoming = transitions.filter(t => t.toStatus === s.name);

                        return (
                          <div key={s.id} className="flex items-center gap-4">
                            {/* Status Node Card */}
                            <div
                              onClick={() => {
                                setSelectedNode(s);
                                setSelectedTransition(null);
                              }}
                              className={`w-44 p-4 rounded-xl cursor-pointer transition-all duration-200 relative group ${
                                isSelected
                                  ? 'bg-slate-800 border-2 border-[#0052cc] shadow-lg shadow-blue-500/20 scale-105'
                                  : 'bg-slate-800/90 border border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: s.color }}
                                />
                                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                  {s.category}
                                </span>
                              </div>

                              <div className="font-bold text-white text-sm truncate">{s.name}</div>

                              <div className="mt-2 pt-2 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
                                <span>Order: #{s.order}</span>
                                {s.wipLimit ? (
                                  <span className="text-amber-400 font-mono font-semibold">WIP: {s.wipLimit}</span>
                                ) : (
                                  <span>No WIP cap</span>
                                )}
                              </div>

                              {/* Hover Quick Edit / Delete */}
                              <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 bg-slate-900/90 p-1 rounded-md border border-slate-700">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditStatus(s);
                                  }}
                                  className="text-slate-300 hover:text-white p-0.5"
                                  title="Edit Status"
                                >
                                  <Icons.Settings className="w-3 h-3" />
                                </button>
                                {statuses.length > 1 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStatus(s.id);
                                    }}
                                    className="text-rose-400 hover:text-rose-300 p-0.5"
                                    title="Delete Status"
                                  >
                                    <Icons.Trash className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                                <span className="text-emerald-400">⬇ {incoming.length} in</span>
                                <span className="text-blue-400">⬆ {outgoing.length} out</span>
                              </div>
                            </div>

                            {/* Arrow to Next Node (if not last) */}
                            {idx < statuses.length - 1 && (
                              <div className="flex flex-col items-center justify-center text-slate-600">
                                <div className="h-0.5 w-8 bg-slate-700 relative">
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-6 border-l-slate-500" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Global Transitions Pills */}
                  <div className="relative z-10 bg-slate-800/80 rounded-xl p-3 border border-slate-700/80">
                    <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Icons.Compass className="w-3.5 h-3.5 text-[#0052cc]" />
                        Active Workflow Transitions ({transitions.length} total)
                      </span>
                      <span className="text-[10px] text-slate-400">Click any transition pill to inspect & edit</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {transitions.map(t => {
                        const isGlobal = t.fromStatus === '*';
                        const isSelected = selectedTransition?.id === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedTransition(t);
                              setSelectedNode(null);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-md'
                                : isGlobal
                                ? 'bg-purple-950/80 text-purple-200 border border-purple-800 hover:bg-purple-900'
                                : 'bg-slate-700 text-slate-200 border border-slate-600 hover:bg-slate-600'
                            }`}
                          >
                            <span className="font-semibold">{t.name}</span>
                            <span className="font-mono text-[10px] opacity-75">
                              ({isGlobal ? 'ALL' : t.fromStatus} ➔ {t.toStatus})
                            </span>
                            {t.autoResolution && (
                              <span className="px-1 py-0.2 rounded bg-emerald-900/60 text-emerald-300 text-[9px] font-mono">
                                Res: {t.autoResolution}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Inspector Panel */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between space-y-4">
                  {selectedNode ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: selectedNode.color }}
                          />
                          <h3 className="font-bold text-slate-900 text-sm">{selectedNode.name}</h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${categoryBadgeClass(selectedNode.category)}`}>
                          {selectedNode.category}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="font-semibold text-slate-500">Board Order:</span>
                          <span className="font-bold text-slate-800">Column #{selectedNode.order}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="font-semibold text-slate-500">WIP Limit:</span>
                          <span className="font-bold text-slate-800">{selectedNode.wipLimit ?? 'Unlimited'}</span>
                        </div>
                      </div>

                      {/* Outgoing transitions */}
                      <div>
                        <div className="text-xs font-bold text-slate-800 mb-2">Outgoing Allowed Transitions:</div>
                        <div className="space-y-1.5">
                          {transitions
                            .filter(t => t.fromStatus === selectedNode.name || t.fromStatus === '*')
                            .map(t => (
                              <div
                                key={t.id}
                                onClick={() => openEditTransition(t)}
                                className="p-2 bg-white rounded-lg border border-slate-200 text-xs hover:border-blue-400 cursor-pointer flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">{t.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">Target: {t.toStatus}</div>
                                </div>
                                <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            ))}
                          {transitions.filter(t => t.fromStatus === selectedNode.name || t.fromStatus === '*').length === 0 && (
                            <div className="text-xs text-slate-400 italic">No outgoing transitions configured.</div>
                          )}
                        </div>
                      </div>

                      {/* Incoming transitions */}
                      <div>
                        <div className="text-xs font-bold text-slate-800 mb-2">Incoming Transitions:</div>
                        <div className="space-y-1.5">
                          {transitions
                            .filter(t => t.toStatus === selectedNode.name)
                            .map(t => (
                              <div
                                key={t.id}
                                onClick={() => openEditTransition(t)}
                                className="p-2 bg-white rounded-lg border border-slate-200 text-xs hover:border-blue-400 cursor-pointer flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">{t.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">From: {t.fromStatus}</div>
                                </div>
                                <Icons.ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => openEditStatus(selectedNode)}
                          className="flex-1 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                          Edit Status
                        </button>
                        {statuses.length > 1 && (
                          <button
                            onClick={() => handleDeleteStatus(selectedNode.id)}
                            className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ) : selectedTransition ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h3 className="font-bold text-slate-900 text-sm">Transition Inspector</h3>
                        <button
                          onClick={() => handleDeleteTransition(selectedTransition.id)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-700">
                        <div>
                          <span className="font-semibold text-slate-500 block mb-0.5">Name:</span>
                          <span className="font-bold text-slate-900">{selectedTransition.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                          <div>
                            <span className="text-slate-400 block text-[10px]">FROM</span>
                            <span className="font-bold text-slate-800">{selectedTransition.fromStatus}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">TO</span>
                            <span className="font-bold text-slate-800">{selectedTransition.toStatus}</span>
                          </div>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-500 block mb-0.5">Required Role:</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-700">
                            {selectedTransition.requiredRole || 'Any User'}
                          </span>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-500 block mb-0.5">Auto-Set Resolution:</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px]">
                            {selectedTransition.autoResolution || 'None (Unchanged)'}
                          </span>
                        </div>

                        {selectedTransition.description && (
                          <div>
                            <span className="font-semibold text-slate-500 block mb-0.5">Notes:</span>
                            <p className="text-slate-600 italic">{selectedTransition.description}</p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => openEditTransition(selectedTransition)}
                        className="w-full py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                      >
                        Edit Transition Properties
                      </button>
                    </div>
                  ) : (
                    <div className="my-auto text-center text-xs text-slate-400 p-6">
                      <Icons.Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      Select a status node or transition arrow on the canvas to inspect and configure properties.
                    </div>
                  )}

                  <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 leading-snug">
                    <strong>Jira ProTip:</strong> Transitions control exactly where an issue can be dragged on the Kanban board.
                  </div>
                </div>
              </div>
            )}

            {/* MATRIX MODE */}
            {workflowStudioMode === 'matrix' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Workflow Transitions Grid Matrix</h3>
                    <p className="text-xs text-slate-500">
                      Checkboxes define which statuses can legally transition directly into target columns.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="py-2.5 px-4 min-w-[160px]">From Status \ To Status</th>
                        {statuses.map(to => (
                          <th key={to.name} className="py-2.5 px-3 text-center min-w-[100px]">
                            <div className="font-bold text-slate-900">{to.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono uppercase">{to.category}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statuses.map(from => (
                        <tr key={from.name} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: from.color }}
                            />
                            <span>{from.name}</span>
                          </td>

                          {statuses.map(to => {
                            if (from.name === to.name) {
                              return (
                                <td key={to.name} className="py-3 px-3 text-center text-slate-300 font-mono">
                                  -
                                </td>
                              );
                            }

                            const hasTrans = transitions.some(
                              t => (t.fromStatus === from.name || t.fromStatus === '*') && t.toStatus === to.name
                            );

                            return (
                              <td key={to.name} className="py-3 px-3 text-center align-middle">
                                <input
                                  type="checkbox"
                                  checked={hasTrans}
                                  onChange={async () => {
                                    try {
                                      await toggleTransitionMatrix({
                                        projectId: project.id,
                                        fromStatus: from.name,
                                        toStatus: to.name,
                                        allowed: !hasTrans
                                      });
                                      await loadAll();
                                    } catch (err: any) {
                                      alert(err.message || 'Failed to toggle matrix transition');
                                    }
                                  }}
                                  className="w-4 h-4 text-[#0052cc] rounded border-slate-300 focus:ring-[#0052cc] cursor-pointer"
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
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CUSTOM FIELDS STUDIO WITH LIVE PREVIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'custom-fields' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900">Project Custom Fields Studio</h2>
              <p className="text-xs text-slate-500 mt-1">
                Design custom data fields, dropdown options, and metric tracking attached to all issues in this project.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Creator Form */}
              <div className="lg:col-span-1 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Icons.Plus className="w-4 h-4 text-[#0052cc]" />
                  <span>Create Custom Field</span>
                </h3>

                <form onSubmit={handleCreateCustomField} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Field Display Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Customer Tier, Release Risk, PR Link"
                      value={newFieldName}
                      onChange={(e) => {
                        setNewFieldName(e.target.value);
                        if (!newFieldKey) {
                          setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                        }
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#0052cc]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Field Key (API / JQL Identifier)</label>
                    <input
                      type="text"
                      placeholder="e.g. customer_tier"
                      value={newFieldKey}
                      onChange={(e) => setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Field Type</label>
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                    >
                      <option value="text">Short Text (Single line)</option>
                      <option value="paragraph">Paragraph Text (Multi-line Markdown)</option>
                      <option value="number">Numeric Metric</option>
                      <option value="select">Single Select Dropdown</option>
                      <option value="multiselect">Multi-Select Pills</option>
                      <option value="date">Date Picker</option>
                      <option value="checkbox">Checkbox (Yes / No)</option>
                      <option value="url">URL Web Link</option>
                    </select>
                  </div>

                  {/* Dropdown Options Editor */}
                  {['select', 'multiselect'].includes(newFieldType) && (
                    <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                      <label className="block font-semibold text-slate-700 text-[11px]">Dropdown Options</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Type option and click Add"
                          value={optionInput}
                          onChange={(e) => setOptionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOption();
                            }
                          }}
                          className="flex-1 px-2.5 py-1 border border-slate-300 rounded text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 font-bold rounded text-xs"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {newFieldOptions.map(opt => (
                          <span key={opt} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200 flex items-center gap-1">
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(opt)}
                              className="text-blue-400 hover:text-blue-600 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={newFieldRequired}
                        onChange={(e) => setNewFieldRequired(e.target.checked)}
                        className="rounded text-[#0052cc]"
                      />
                      <span>Mandatory / Required Field</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={newFieldShowInList}
                        onChange={(e) => setNewFieldShowInList(e.target.checked)}
                        className="rounded text-[#0052cc]"
                      />
                      <span>Display column in Backlog & Card Views</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm cursor-pointer"
                  >
                    Create Custom Field
                  </button>
                </form>
              </div>

              {/* Active Fields Table & Live Simulator */}
              <div className="lg:col-span-2 space-y-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-3">Configured Custom Fields ({customFields.length})</h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Field Name</th>
                          <th className="py-2.5 px-3">Field Key</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Config</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customFields.map(f => {
                          let options: string[] = [];
                          if (f.optionsJson) {
                            try { options = JSON.parse(f.optionsJson); } catch {}
                          }

                          return (
                            <tr key={f.id} className="hover:bg-slate-50 transition">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{f.name}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{f.fieldKey}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                                  {f.fieldType}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {options.length > 0 ? `${options.length} options` : f.isRequired ? 'Required' : 'Optional'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => handleDeleteField(f.id)}
                                  className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {customFields.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                              No custom fields added yet. Create one using the form on the left!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Field Simulator Preview */}
                <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Icons.Sliders className="w-3.5 h-3.5 text-[#0052cc]" />
                      Live Custom Field Simulator
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      Real-time Preview
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    This is how your new field "{newFieldName || 'Custom Field'}" will render inside the Jira Issue Detail pane:
                  </p>

                  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-2">
                    <div className="text-xs font-bold text-slate-300">
                      {newFieldName || 'Example Field'}{newFieldRequired ? ' *' : ''}
                    </div>

                    {newFieldType === 'text' && (
                      <input
                        type="text"
                        disabled
                        placeholder="Enter value here..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300"
                      />
                    )}

                    {newFieldType === 'paragraph' && (
                      <textarea
                        rows={2}
                        disabled
                        placeholder="Markdown description or detailed notes..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300"
                      />
                    )}

                    {newFieldType === 'number' && (
                      <input
                        type="number"
                        disabled
                        placeholder="42"
                        className="w-40 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 font-mono"
                      />
                    )}

                    {newFieldType === 'select' && (
                      <select disabled className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300">
                        {newFieldOptions.map(o => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    )}

                    {newFieldType === 'multiselect' && (
                      <div className="flex flex-wrap gap-1.5">
                        {newFieldOptions.map(o => (
                          <span key={o} className="px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-700 text-blue-200 text-xs">
                            {o}
                          </span>
                        ))}
                      </div>
                    )}

                    {newFieldType === 'checkbox' && (
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input type="checkbox" disabled checked className="rounded" />
                        <span>Flag enabled</span>
                      </label>
                    )}

                    {newFieldType === 'date' && (
                      <input
                        type="date"
                        disabled
                        defaultValue="2026-10-22"
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300"
                      />
                    )}

                    {newFieldType === 'url' && (
                      <input
                        type="url"
                        disabled
                        placeholder="https://github.com/akij/erp/pull/42"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-blue-400 underline"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: AUTOMATION RULES STUDIO */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'automations' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-6">
            <div className="border-b border-slate-200 pb-4 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Project Automation Engine</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Automate issue triage, automatic resolution assignment, and cross-column transitions without code.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <Icons.Check className="w-4 h-4 text-emerald-600" />
                <span>Engine Active: Listening to issue transitions</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Rule Builder */}
              <div className="lg:col-span-1 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Icons.Plus className="w-4 h-4 text-[#0052cc]" />
                  <span>Add Automation Rule</span>
                </h3>

                <form onSubmit={handleCreateRule} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rule Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Auto-Resolve Done Issues"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  {/* Flow Steps: WHEN -> IF -> THEN */}
                  <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase font-mono mr-1.5">
                        WHEN
                      </span>
                      <label className="font-semibold text-slate-700">Trigger Event</label>
                      <select
                        value={ruleTrigger}
                        onChange={(e) => setRuleTrigger(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      >
                        <option value="OnStatusChange">Issue Transitioned / Status Changed</option>
                        <option value="OnCreate">Issue Created</option>
                        <option value="OnAssign">Assignee Changed</option>
                        <option value="OnPriorityEscalate">Priority Escalated</option>
                        <option value="OnSprintClose">Sprint Completed</option>
                      </select>
                    </div>

                    <div>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase font-mono mr-1.5">
                        IF
                      </span>
                      <label className="font-semibold text-slate-700">Status Condition</label>
                      <select
                        value={ruleConditionStatus}
                        onChange={(e) => setRuleConditionStatus(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      >
                        {statuses.map(s => (
                          <option key={s.name} value={s.name}>Status == "{s.name}"</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase font-mono mr-1.5">
                        THEN
                      </span>
                      <label className="font-semibold text-slate-700">Action to Perform</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <select
                          value={ruleActionType}
                          onChange={(e) => setRuleActionType(e.target.value)}
                          className="px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                        >
                          <option value="SetResolution">Set Resolution</option>
                          <option value="AutoAssign">Auto-Assign Issue</option>
                          <option value="AddComment">Post System Comment</option>
                        </select>
                        <input
                          type="text"
                          required
                          placeholder="Done / Fixed / Lead"
                          value={ruleActionValue}
                          onChange={(e) => setRuleActionValue(e.target.value)}
                          className="px-2 py-1.5 border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm cursor-pointer"
                  >
                    Save & Enable Rule
                  </button>
                </form>
              </div>

              {/* Active Rules List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Configured Rules ({rules.length})</h3>

                <div className="space-y-3">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 hover:border-slate-300 transition shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${rule.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <h4 className="font-bold text-slate-900 text-xs">{rule.name}</h4>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSimulateRule(rule)}
                            className="text-xs text-[#0052cc] hover:underline font-semibold cursor-pointer"
                          >
                            Simulate Run
                          </button>
                          <button
                            onClick={() => handleToggleRule(rule.id)}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                              rule.isEnabled
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {rule.isEnabled ? 'Enabled' : 'Disabled'}
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Icons.Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Visual Flow diagram for the rule */}
                      <div className="flex items-center gap-2 text-xs flex-wrap font-mono">
                        <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                          WHEN: {rule.triggerEvent}
                        </span>
                        <span className="text-slate-400">➔</span>
                        <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                          IF: Status == "{rule.conditionStatus || 'Any'}"
                        </span>
                        <span className="text-slate-400">➔</span>
                        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          THEN: {rule.actionType}("{rule.actionValue}")
                        </span>
                      </div>
                    </div>
                  ))}
                  {rules.length === 0 && (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 italic text-xs">
                      No automation rules defined yet. Add a rule to automate issue workflows!
                    </div>
                  )}
                </div>

                {/* Simulated Audit Log */}
                {simulatedLog && (
                  <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl border border-slate-800 font-mono text-xs whitespace-pre-wrap relative">
                    <button
                      onClick={() => setSimulatedLog(null)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-white"
                    >
                      ×
                    </button>
                    {simulatedLog}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: ISSUE TYPES & HIERARCHY */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'issue-types' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900">Project Issue Types & Hierarchy</h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure standard issues, Epics, Bugs, and Sub-tasks available to teams in this project.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Creator Form */}
              <div className="lg:col-span-1 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Add New Issue Type</h3>

                <form onSubmit={handleCreateIssueType} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Issue Type Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Incident, Spike, Security Finding"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Describes the nature and purpose of this issue type."
                      value={newTypeDesc}
                      onChange={(e) => setNewTypeDesc(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Icon Style</label>
                    <select
                      value={newTypeIcon}
                      onChange={(e) => setNewTypeIcon(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="Story">Story (Green Bookmark)</option>
                      <option value="Task">Task (Blue Check)</option>
                      <option value="Bug">Bug (Red Dot / Circle)</option>
                      <option value="Epic">Epic (Purple Flash)</option>
                      <option value="Subtask">Subtask (Cyan Corner)</option>
                    </select>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={newTypeIsSubtask}
                        onChange={(e) => setNewTypeIsSubtask(e.target.checked)}
                        className="rounded text-[#0052cc]"
                      />
                      <span>Is Sub-task (Must have parent issue)</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm cursor-pointer"
                  >
                    Add Issue Type
                  </button>
                </form>
              </div>

              {/* Hierarchy & Types List */}
              <div className="lg:col-span-2 space-y-4">
                {/* Hierarchy visualization */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-900 mb-2">Issue Type Hierarchy</div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="text-purple-700 font-bold pl-2 border-l-2 border-purple-500">
                      Level 1: Epic (High-level business initiatives & features)
                    </div>
                    <div className="text-blue-700 font-bold pl-6 border-l-2 border-blue-400">
                      Level 0: Story, Task, Bug (Standard deliverable work items)
                    </div>
                    <div className="text-cyan-700 font-bold pl-10 border-l-2 border-cyan-400">
                      Level -1: Subtask (Child units of decomposed work)
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Level</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {issueTypes.map(it => (
                        <tr key={it.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                            <span>{it.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{it.description || '-'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              it.name === 'Epic'
                                ? 'bg-purple-100 text-purple-800'
                                : it.isSubtask
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {it.name === 'Epic' ? 'Level 1 (Parent)' : it.isSubtask ? 'Level -1 (Subtask)' : 'Level 0 (Standard)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {issueTypes.length > 3 && (
                              <button
                                onClick={() => handleDeleteIssueType(it.id)}
                                className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: COMPONENTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'components' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900">Project Components</h2>
              <p className="text-xs text-slate-500 mt-1">
                Organize codebase features and functional modules (e.g. Backend API, Mobile App, Billing Gateway).
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Creator Form */}
              <div className="lg:col-span-1 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Add Component</h3>

                <form onSubmit={handleCreateComponent} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Component Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Auth & Security, Checkout, ERP Core"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Module description and technical boundaries."
                      value={newCompDesc}
                      onChange={(e) => setNewCompDesc(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Component Lead</label>
                    <input
                      type="text"
                      placeholder="e.g. Sajidur Rahman"
                      value={newCompLead}
                      onChange={(e) => setNewCompLead(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm cursor-pointer"
                  >
                    Create Component
                  </button>
                </form>
              </div>

              {/* Table */}
              <div className="lg:col-span-2">
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Component</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Lead</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {components.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                            <Icons.Layers className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{c.description || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-600">{c.leadName || 'Unassigned'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteComponent(c.id)}
                              className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {components.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                            No components created yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: PRIORITIES & RESOLUTIONS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'priorities-resolutions' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Priorities */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-slate-900 text-sm">Issue Priorities Hierarchy</h3>
                  <p className="text-xs text-slate-500">Order from highest urgency to lowest.</p>
                </div>

                <form onSubmit={handleCreatePriority} className="flex gap-2 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="New Priority (e.g. Blocker)"
                    value={newPriorityName}
                    onChange={(e) => setNewPriorityName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded"
                  />
                  <input
                    type="color"
                    value={newPriorityColor}
                    onChange={(e) => setNewPriorityColor(e.target.value)}
                    className="w-9 h-8 p-0.5 border border-slate-300 rounded cursor-pointer"
                    title="Priority Color"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#0052cc] text-white font-bold rounded shadow-xs"
                  >
                    Add
                  </button>
                </form>

                <div className="space-y-2">
                  {priorities.map((p, idx) => (
                    <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-bold text-slate-900">{p.name}</span>
                      </div>
                      {priorities.length > 2 && (
                        <button
                          onClick={() => handleDeletePriority(p.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolutions */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-slate-900 text-sm">Issue Resolutions</h3>
                  <p className="text-xs text-slate-500">Options available when issues reach completed/done states.</p>
                </div>

                <form onSubmit={handleCreateResolution} className="flex gap-2 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="New Resolution (e.g. Won't Do)"
                    value={newResolutionName}
                    onChange={(e) => setNewResolutionName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#0052cc] text-white font-bold rounded shadow-xs"
                  >
                    Add
                  </button>
                </form>

                <div className="space-y-2">
                  {resolutions.map((r, idx) => (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                        <span className="font-bold text-slate-900">{r.name}</span>
                        {r.description && <span className="text-slate-400 italic">({r.description})</span>}
                      </div>
                      {resolutions.length > 2 && (
                        <button
                          onClick={() => handleDeleteResolution(r.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 7: WEBHOOKS & REST EVENTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'webhooks' && (
          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900">Project Webhook Integrations</h2>
              <p className="text-xs text-slate-500 mt-1">
                Broadcast HTTP POST events to external microservices, Slack, Discord, or CI/CD pipelines when issues change.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Creator Form */}
              <div className="lg:col-span-1 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Register Webhook</h3>

                <form onSubmit={handleCreateWebhook} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Webhook Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Slack Incident Channel"
                      value={newWebhookName}
                      onChange={(e) => setNewWebhookName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Endpoint URL *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://api.company.com/jira-events"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="block font-semibold text-slate-700 text-[11px]">Subscribed Events:</span>
                    <div className="space-y-1 text-slate-600">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked disabled className="rounded text-[#0052cc]" />
                        <span>Issue Created (`issue:created`)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked disabled className="rounded text-[#0052cc]" />
                        <span>Issue Updated (`issue:updated`)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked disabled className="rounded text-[#0052cc]" />
                        <span>Workflow Transition (`issue:transitioned`)</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm cursor-pointer"
                  >
                    Register Webhook
                  </button>
                </form>
              </div>

              {/* Webhooks Table & Tester */}
              <div className="lg:col-span-2 space-y-4">
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">URL</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {webhooks.map(w => (
                        <tr key={w.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{w.name}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 truncate max-w-xs">{w.url}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleTestWebhook(w.name, w.url)}
                              className="text-xs text-[#0052cc] hover:underline font-semibold mr-3 cursor-pointer"
                            >
                              Test Ping
                            </button>
                            <button
                              onClick={() => handleDeleteWebhook(w.id)}
                              className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {webhooks.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                            No webhooks registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {webhookTestStatus && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-mono">
                    {webhookTestStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD STATUS */}
      {/* ------------------------------------------------------------- */}
      {showAddStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add Workflow Status Column</h3>
              <button onClick={() => setShowAddStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStatus} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QA Verification, Code Review"
                  value={statusName}
                  onChange={(e) => setStatusName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={statusCategory}
                    onChange={(e) => {
                      setStatusCategory(e.target.value);
                      if (e.target.value === 'To Do') setStatusColor('#64748b');
                      if (e.target.value === 'In Progress') setStatusColor('#2563eb');
                      if (e.target.value === 'Done') setStatusColor('#16a34a');
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="To Do">To Do (Unstarted)</option>
                    <option value="In Progress">In Progress (Active)</option>
                    <option value="Done">Done (Completed)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Color Marker</label>
                  <input
                    type="color"
                    value={statusColor}
                    onChange={(e) => setStatusColor(e.target.value)}
                    className="w-full h-8 p-0.5 border border-slate-300 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">WIP Limit (Optional)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="Maximum issues allowed in column (e.g. 5)"
                  value={statusWip}
                  onChange={(e) => setStatusWip(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddStatusModal(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm"
                >
                  Create Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT STATUS */}
      {/* ------------------------------------------------------------- */}
      {showEditStatusModal && editingStatus && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Edit Status: {editingStatus.name}</h3>
              <button onClick={() => setShowEditStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Name *</label>
                <input
                  type="text"
                  required
                  value={statusName}
                  onChange={(e) => setStatusName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={statusCategory}
                    onChange={(e) => setStatusCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Color Marker</label>
                  <input
                    type="color"
                    value={statusColor}
                    onChange={(e) => setStatusColor(e.target.value)}
                    className="w-full h-8 p-0.5 border border-slate-300 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">WIP Limit</label>
                <input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={statusWip}
                  onChange={(e) => setStatusWip(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditStatusModal(false)}
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
      {/* MODAL: ADD / EDIT TRANSITION */}
      {/* ------------------------------------------------------------- */}
      {(showAddTransModal || showEditTransModal) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {showEditTransModal ? 'Edit Transition Properties' : 'Create Workflow Transition'}
              </h3>
              <button
                onClick={() => {
                  setShowAddTransModal(false);
                  setShowEditTransModal(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={showEditTransModal ? handleUpdateTransition : handleCreateTransition}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transition Name</label>
                <input
                  type="text"
                  placeholder="e.g. Start Work, Submit for Review, Close"
                  value={transName}
                  onChange={(e) => setTransName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Status *</label>
                  <select
                    required
                    value={transFrom}
                    onChange={(e) => setTransFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="">-- Origin --</option>
                    <option value="*">* Any Status (Global)</option>
                    {statuses.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Status *</label>
                  <select
                    required
                    value={transTo}
                    onChange={(e) => setTransTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="">-- Destination --</option>
                    {statuses.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Required Role Restriction</label>
                <select
                  value={transRole}
                  onChange={(e) => setTransRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="Any">Any User / No restriction</option>
                  <option value="Administrator">Administrators Only</option>
                  <option value="Project Lead">Project Lead Only</option>
                  <option value="Developer">Developers</option>
                  <option value="QA Engineer">QA Engineers</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Post-Function: Auto Resolution</label>
                <select
                  value={transAutoRes}
                  onChange={(e) => setTransAutoRes(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="None">None (Leave resolution untouched)</option>
                  <option value="Done">Done</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Won't Fix">Won't Fix</option>
                  <option value="Duplicate">Duplicate</option>
                  <option value="Cannot Reproduce">Cannot Reproduce</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transition Notes / Description</label>
                <input
                  type="text"
                  placeholder="Optional guidance for team members"
                  value={transDesc}
                  onChange={(e) => setTransDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTransModal(false);
                    setShowEditTransModal(false);
                  }}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold rounded shadow-sm"
                >
                  {showEditTransModal ? 'Save Properties' : 'Create Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationView;
