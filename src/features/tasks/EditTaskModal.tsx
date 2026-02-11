import { useState, useEffect, useMemo } from 'react';
import { X, Flag, Clock, Trash2, User, Lock, Sparkles, ArrowRight, Layout, AlertTriangle, Search, Loader2, Check, ListTodo } from 'lucide-react';
import { useStore } from '../../core/store';
import { ActivityFeed } from '../../components/ActivityFeed';
import type { Task, Priority, TaskStatus, RecurrenceConfig } from '../../core/types';
import clsx from 'clsx';
import { format, isValid } from 'date-fns';
import { getDescendants } from '../../core/hierarchyUtils';
import { processTaskInputWithAI } from '../../core/aiTaskProcessing';

interface EditTaskModalProps {
    task: Partial<Task> | Task; // Allow partial for creation
    onClose: () => void;
    isProcessing?: boolean;
    mode?: 'edit' | 'create'; // NEW
}

import { useTranslation } from '../../core/i18n';

export function EditTaskModal({ task, onClose, isProcessing = false, mode = 'edit' }: EditTaskModalProps) {
    const { updateTask, addTask, updateStatus, deleteTask, unassignTask, team, user } = useStore();
    const { t } = useTranslation();
    const [showActivity, setShowActivity] = useState(true); // Default visible

    // VISIBILITY LOGIC (Refactored)
    const visibleMemberIds = useMemo(() => {
        if (!user) return new Set<string>();

        // Owners see everyone
        if (user.role === 'owner') return null;

        // strict visibility: Down + 1 Up
        const ids = getDescendants(user.id, Object.values(team));

        // Debug


        return ids;
    }, [user, team]);

    // For creation mode, we might only have partial data
    const [title, setTitle] = useState(task.title || '');
    const [originalTitle] = useState(task.title || '');
    const [description, setDescription] = useState(task.description || '');

    const [priority, setPriority] = useState<Priority>(task.priority || 'medium');
    const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds || []);

    const [status, setStatus] = useState<TaskStatus>(task.status || 'todo');
    const [recurrence, setRecurrence] = useState<RecurrenceConfig | undefined>(task.recurrence);
    // Visibility
    const [visibility, setVisibility] = useState<'private' | 'team'>(task.visibility || 'private');

    const initialDate = task.dueDate ? new Date(task.dueDate) : null;
    const [dueDateStr, setDueDateStr] = useState((initialDate && isValid(initialDate)) ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : '');

    const [aiLoading, setAiLoading] = useState(false);
    const [loadingText, setLoadingText] = useState(t.modal.ai_processing);
    const [assigneeSearch, setAssigneeSearch] = useState('');

    // Fix: Stale Data - Sync state with task prop when it updates
    useEffect(() => {
        setTitle(task.title || '');
        setDescription(task.description || '');

        setPriority(task.priority || 'medium');
        setAssigneeIds(task.assigneeIds || []);
        setStatus(task.status || 'todo');
        setRecurrence(task.recurrence);
        setVisibility(task.visibility || 'private');
        const d = task.dueDate ? new Date(task.dueDate) : null;
        setDueDateStr((d && isValid(d)) ? format(d, "yyyy-MM-dd'T'HH:mm") : '');
    }, [task]);

    // Narrative Loading Effect
    useEffect(() => {
        if (!aiLoading) return;
        const messages = ["Reading task...", "finding context...", "checking team...", "updating details..."];
        let i = 0;
        setLoadingText(messages[0]);
        const interval = setInterval(() => {
            i = (i + 1) % messages.length;
            setLoadingText(messages[i]);
        }, 800);
        return () => clearInterval(interval);
    }, [aiLoading]);

    const handleAutoProcess = async () => {
        if (!task.id) return; // Cannot process without ID
        setAiLoading(true);
        try {
            if (!user?.id) throw new Error("User not found");

            // Use Client Service instead of N8N
            const results = await processTaskInputWithAI(user.id, task.title || '', {
                organizationId: user.organizationId,
                userRoleContext: user.preferences?.aiContext,
                appLanguage: user.preferences?.appLanguage
            });

            if (results.length > 0) {
                // If AI created a completely new task structure, we should ideally close this modal or reload.
                // But since this modal edits a single task, we will map the FIRST result to the current UI state.
                const aiResult = results[0];

                setTitle(aiResult.title);
                if (aiResult.smart_analysis?.summary) setDescription(aiResult.smart_analysis.summary);

                if (aiResult.priority) setPriority(aiResult.priority);

                if (aiResult.due_date) setDueDateStr(format(new Date(aiResult.due_date), "yyyy-MM-dd'T'HH:mm"));

                if (aiResult.assignee_ids && aiResult.assignee_ids.length > 0) {
                    setAssigneeIds(aiResult.assignee_ids);
                }

                // If multiple tasks were generated (rare for atomic input), 
                // the others were already inserted into DB by the service.
            }

        } catch (error: any) {
            console.error("Auto-Fill Error Details:", error);
            const msg = error.message || 'Unknown Error';
            setErrorMsg(`DEBUG-UI: ${msg}`);
            setTimeout(() => setErrorMsg(null), 10000);
        } finally {
            setAiLoading(false);
        }
    };
    // Permission Logic
    const isOwner = user?.id === task.ownerId || mode === 'create'; // Creator is owner
    const isAdmin = user?.role === 'head' || user?.role === 'owner'; // Global admin privileges
    const canEdit = isOwner || isAdmin;



    // UI States
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Handle escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const [isSuccess, setIsSuccess] = useState(false);

    const handleSave = async (e?: React.FormEvent | React.FocusEvent) => {
        // Prevent default form submission
        if (e && e.preventDefault) e.preventDefault();

        // Detect if this is an explicit user action (Click or Enter)
        // Note: We are removing onBlur, so e will be Submit(Enter) or Undefined(Click)
        const isExplicitAction = !e || e.type === 'submit' || e.type === 'click';

        // Check if anything changed
        const hasChanges = !(
            mode === 'edit' &&
            title === task.title &&
            description === (task.description || '') &&
            status === task.status &&

            priority === task.priority &&
            dueDateStr === (task.dueDate && isValid(new Date(task.dueDate)) ? format(new Date(task.dueDate), "yyyy-MM-dd'T'HH:mm") : '') &&
            JSON.stringify(assigneeIds) === JSON.stringify(task.assigneeIds) &&
            JSON.stringify(recurrence) === JSON.stringify(task.recurrence)
        );

        // If no changes and explicit action, just close
        if (!hasChanges && isExplicitAction) {
            onClose();
            return;
        }

        // If no changes and NOT explicit (e.g. if we kept onBlur), return
        if (!hasChanges) return;

        if (!title.trim()) {
            setErrorMsg("Task title is required");
            return;
        }

        setIsSuccess(true);

        // Wait for animation
        await new Promise(resolve => setTimeout(resolve, 500));

        let dueDate: number | undefined;
        if (dueDateStr) {
            const date = new Date(dueDateStr);
            if (!isNaN(date.getTime())) {
                dueDate = date.getTime();
            }
        }

        // Derived visibility logic
        const hasEvaluatedAssignees = assigneeIds.filter(uid => uid !== user?.id).length > 0;
        let finalVisibility = visibility;

        if (hasEvaluatedAssignees) {
            finalVisibility = 'team'; // Enforce team if shared
        }

        const commonData = {
            title,
            description,
            projectId: undefined,
            priority,
            dueDate,
            assigneeIds,
            status,
            visibility: finalVisibility,
            recurrence: recurrence
        };

        try {
            if (mode === 'create') {
                await addTask(commonData);
            } else {
                if (!task.id) return;
                await updateTask(task.id, commonData);
            }

            // Always close after success
            onClose();

        } catch (err) {
            console.error(err);
            setErrorMsg("Failed to save task.");
            setIsSuccess(false);
        }
    };

    const handleDelete = () => {
        if (task.id) {
            deleteTask(task.id);
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={clsx(
                "w-full bg-bg-card border border-border-subtle rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col",
                showActivity ? "max-w-6xl h-[85vh]" : "max-w-2xl max-h-[90vh]"
            )}>

                <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-bg-app/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="font-display font-semibold text-lg text-text-primary">
                            {isProcessing ? t.modal.accept_process : mode === 'create' ? t.modal.create_task : t.modal.edit_task}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {errorMsg && (
                            <span className="text-xs font-bold text-red-500 animate-pulse mr-2 flex items-center gap-1">
                                <AlertTriangle size={12} /> {errorMsg}
                            </span>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowActivity(!showActivity)}
                            className={clsx(
                                "flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all mr-2",
                                showActivity
                                    ? "bg-accent-primary text-white border-accent-primary"
                                    : "bg-bg-input text-text-muted border-border-subtle hover:text-text-primary"
                            )}
                            title="Toggle Activity Feed"
                        >
                            <Layout size={14} />
                            {showActivity ? "Hide Activity" : "Show Activity"}
                        </button>

                        {isOwner && mode === 'edit' && (
                            <div className="relative">
                                {showDeleteConfirm ? (
                                    <div className="absolute top-full right-0 mt-2 bg-bg-card border border-border-subtle shadow-xl rounded-xl p-3 z-[60] min-w-[200px] animate-in slide-in-from-top-2">
                                        <p className="text-xs font-bold text-text-primary mb-2">Delete this task?</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="flex-1 px-2 py-1.5 bg-bg-input rounded-lg text-xs font-medium hover:bg-bg-card-hover"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                className="flex-1 px-2 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 shadow-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors p-2 rounded-lg"
                                        title="Delete Task"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Leave Task Button (For Assignees who are NOT Owner) */}
                        {!isOwner && user && assigneeIds.includes(user.id) && (
                            <div className="relative">
                                {showLeaveConfirm ? (
                                    <div className="absolute top-full right-0 mt-2 bg-bg-card border border-border-subtle shadow-xl rounded-xl p-3 z-[60] min-w-[200px] animate-in slide-in-from-top-2">
                                        <p className="text-xs font-bold text-text-primary mb-2">Leave this task?</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowLeaveConfirm(false)}
                                                className="flex-1 px-2 py-1.5 bg-bg-input rounded-lg text-xs font-medium hover:bg-bg-card-hover"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    unassignTask(task.id!, user.id);
                                                    onClose();
                                                }}
                                                className="flex-1 px-2 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 shadow-sm"
                                            >
                                                Leave
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        data-testid="leave-task-btn"
                                        onClick={() => setShowLeaveConfirm(true)}
                                        className="text-text-muted hover:text-orange-500 hover:bg-orange-500/10 transition-colors p-2 rounded-lg"
                                        title="Leave Task (Unassign me)"
                                    >
                                        <User size={18} className="rotate-45" />
                                    </button>
                                )}
                            </div>
                        )}
                        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary hover:bg-bg-input p-2 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Column: Form */}
                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Original Item context */}
                            {isProcessing && (
                                <div className="bg-bg-app/50 p-4 rounded-xl border border-border-subtle/50">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">
                                        Original Input
                                    </label>
                                    <p className="text-text-primary text-sm leading-relaxed">{task.title}</p>
                                    <div className="mt-2 text-[10px] text-text-muted flex gap-3 font-medium">
                                        <span>Source: {task.source || 'Manual'}</span>
                                        {task.createdAt && <span>Added {format(task.createdAt, 'MMM d, HH:mm')}</span>}
                                    </div>
                                </div>
                            )}

                            {/* AI Process Button */}
                            {!task.title && (
                                <div className="flex justify-center py-4">
                                    <button
                                        type="button"
                                        onClick={handleAutoProcess}
                                        disabled={aiLoading}
                                        className={clsx(
                                            "flex items-center justify-center gap-2 px-6 py-3 w-full",
                                            "bg-violet-500/10 text-violet-600 font-bold rounded-xl border border-violet-500/20",
                                            "hover:bg-violet-500/20 transition-all",
                                            "disabled:opacity-50 disabled:cursor-not-allowed"
                                        )}
                                    >
                                        {aiLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-sm">{loadingText}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                <span className="text-sm">Auto-Fill Details</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Form Content */}
                            <form onSubmit={handleSave} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                                {!canEdit && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                                        <Lock size={16} />
                                        <span>view only mode • Only the task owner or heads can edit details.</span>
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider">{t.modal.labels.title}</label>
                                        {canEdit && title !== originalTitle && (
                                            <button
                                                type="button"
                                                onClick={() => setTitle(originalTitle)}
                                                className="text-[10px] text-accent-primary hover:underline flex items-center gap-1 font-bold"
                                            >
                                                <X size={10} /> {t.modal.use_original}
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        autoFocus={canEdit}
                                        disabled={!canEdit}
                                        value={title}
                                        onChange={e => {
                                            setTitle(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                // Optional: trigger save or focus description
                                            }
                                        }}
                                        className={clsx(
                                            "input w-full text-lg font-medium transition-all bg-transparent border-transparent px-0 hover:bg-bg-input hover:px-3 focus:bg-bg-input focus:px-3 focus:border-accent-primary resize-none overflow-hidden h-auto",
                                            title !== originalTitle && "ring-2 ring-violet-500/20 border-violet-500/30",
                                            !canEdit && "opacity-70 cursor-not-allowed"
                                        )}
                                        placeholder="Task Title"
                                        rows={1}
                                        style={{ minHeight: '44px' }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2">{t.modal.labels.desc}</label>
                                    <textarea
                                        disabled={!canEdit}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className={clsx(
                                            "input w-full min-h-[120px] text-sm resize-y leading-relaxed",
                                            !canEdit && "opacity-70 cursor-not-allowed bg-transparent border-transparent px-0 resize-none"
                                        )}
                                        placeholder={canEdit ? t.modal.desc_placeholder : t.modal.no_desc}
                                    />
                                </div>

                                {/* Status & Project (No explicit Visibility selector) */}
                                <div className="grid grid-cols-2 gap-5 animate-in slide-in-from-top-2">
                                    <div className="col-span-2">
                                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                            <ListTodo size={12} className="text-accent-secondary" /> {t.modal.labels.status}
                                        </label>
                                        <select
                                            disabled={!canEdit}
                                            value={status}
                                            onChange={e => setStatus(e.target.value as TaskStatus)}
                                            className={clsx("input w-full appearance-none bg-bg-input", !canEdit && "opacity-70 cursor-not-allowed")}
                                        >
                                            <option value="backlog">Backlog / Incoming</option>
                                            <option value="todo">To Do</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="review">Review</option>
                                            <option value="done">Done</option>
                                        </select>
                                    </div>
                                </div>


                                <div className="grid grid-cols-2 gap-5 animate-in slide-in-from-top-2">

                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                            <Clock size={12} className="text-accent-secondary" /> {t.modal.labels.due_date}
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                disabled={!canEdit}
                                                type="datetime-local"
                                                value={dueDateStr}
                                                onChange={e => setDueDateStr(e.target.value)}
                                                className={clsx("input w-full flex-1", !canEdit && "opacity-70 cursor-not-allowed")}
                                            />
                                            <select
                                                disabled={!canEdit}
                                                value={recurrence?.frequency || 'none'}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === 'none') {
                                                        setRecurrence(undefined);
                                                    } else {
                                                        setRecurrence({
                                                            frequency: val as any,
                                                            interval: 1,
                                                            type: 'on_schedule' // Default
                                                        });
                                                    }
                                                }}
                                                className={clsx("input w-[100px] text-xs font-semibold", !canEdit && "opacity-70 cursor-not-allowed")}
                                            >
                                                <option value="none">No Repeat</option>
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                                <option value="yearly">Yearly</option>
                                            </select>
                                        </div>
                                        {recurrence && (
                                            <div className="mt-2 text-xs flex items-center gap-2 animate-in fade-in">
                                                <select
                                                    value={recurrence.type}
                                                    onChange={e => setRecurrence({ ...recurrence, type: e.target.value as any })}
                                                    className="bg-bg-input border-none rounded px-2 py-1 text-[10px] font-bold uppercase text-accent-primary"
                                                >
                                                    <option value="on_schedule">On Schedule</option>
                                                    <option value="on_completion">After Completion</option>
                                                </select>
                                                <span className="text-text-muted">Every {recurrence.interval} {recurrence.frequency}(s)</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-2 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs uppercase text-text-muted font-bold tracking-wider flex items-center gap-2">
                                                <User size={12} className="text-accent-secondary" /> {t.modal.labels.share}
                                            </label>
                                            <div className="flex items-center gap-2">

                                                <div className="text-[10px] text-text-muted italic flex items-center gap-2">
                                                    <select
                                                        disabled={!canEdit || assigneeIds.filter(uid => uid !== user?.id).length > 0} // Disable if shared (forced team)
                                                        value={assigneeIds.filter(uid => uid !== user?.id).length > 0 ? 'team' : visibility}
                                                        onChange={e => setVisibility(e.target.value as 'private' | 'team')}
                                                        className={clsx(
                                                            "bg-transparent border-none text-[10px] font-bold uppercase focus:ring-0 cursor-pointer pl-0 pr-6",
                                                            visibility === 'team' || assigneeIds.filter(uid => uid !== user?.id).length > 0 ? "text-accent-primary" : "text-text-muted"
                                                        )}
                                                    >
                                                        <option value="private">{t.modal.private_task}</option>
                                                        <option value="team">{t.modal.shared_with_team}</option>
                                                    </select>
                                                </div>
                                                <div className="relative group/search">
                                                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
                                                    <input
                                                        type="text"
                                                        placeholder={t.modal.find_member}
                                                        value={assigneeSearch}
                                                        onChange={e => setAssigneeSearch(e.target.value)}
                                                        className="pl-7 pr-2 py-1 bg-bg-surface border border-transparent hover:border-border-subtle rounded-full text-xs w-[120px] focus:w-[150px] transition-all focus:border-accent-primary focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {Object.values(team)
                                                .filter(member => member.id !== user?.id)
                                                // Filter out invalid/ghost users
                                                .filter(member => member.email && member.name !== 'Unknown')
                                                .filter(member => {
                                                    if (!visibleMemberIds) return true;
                                                    return visibleMemberIds.has(member.id);
                                                })
                                                .filter(member => (member.name || '').toLowerCase().includes(assigneeSearch.toLowerCase()))
                                                .map(member => {
                                                    const isSelected = assigneeIds.includes(member.id);
                                                    // Cascade Logic:
                                                    // - Anyone can add/remove members (open collaboration)
                                                    // - BUT you cannot remove the Owner (integrity protection)
                                                    const isOwnerOfTask = member.id === task.ownerId;
                                                    const isLocked = isOwnerOfTask;

                                                    return (
                                                        <button
                                                            key={member.id}
                                                            type="button"
                                                            disabled={isLocked && isSelected} // Can't untoggle owner
                                                            onClick={() => {
                                                                if (isLocked && isSelected) return; // Prevention
                                                                setAssigneeIds(prev =>
                                                                    isSelected
                                                                        ? prev.filter(id => id !== member.id)
                                                                        : [...prev, member.id]
                                                                );
                                                            }}
                                                            className={clsx(
                                                                "flex items-center gap-3 p-2 rounded-lg border transition-all text-left group",
                                                                isSelected
                                                                    ? "bg-accent-primary/5 border-accent-primary/30 shadow-inner"
                                                                    : "bg-bg-input border-transparent text-text-muted hover:bg-bg-card-hover hover:border-border-subtle",
                                                                (isLocked && isSelected) ? "opacity-100 cursor-not-allowed" : "cursor-pointer"
                                                            )}
                                                        >
                                                            {member.avatar ? (
                                                                <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border border-border-subtle" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-accent-secondary/20 flex items-center justify-center text-xs font-bold uppercase text-accent-primary">
                                                                    {(member.name || member.email || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className={clsx("text-sm font-medium truncate", isSelected ? "text-accent-primary" : "text-text-primary")}>
                                                                    {member.name || member.email || 'Unknown User'}
                                                                </div>
                                                                <div className="text-[10px] opacity-70 truncate text-text-muted">{member.email || 'No email'}</div>
                                                            </div>
                                                            {isSelected && !isOwnerOfTask && <div className="w-2 h-2 rounded-full bg-accent-primary shadow-sm shadow-accent-primary/50" />}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                            <Flag size={12} className="text-accent-secondary" /> {t.modal.labels.priority}
                                        </label>
                                        <div className="flex gap-2">
                                            {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    disabled={!canEdit}
                                                    onClick={() => setPriority(p)}
                                                    className={clsx(
                                                        "flex-1 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all shadow-sm",
                                                        priority === p
                                                            ? p === 'critical' ? "bg-red-100 text-red-700 border-red-200 ring-1 ring-red-500/20" :
                                                                p === 'high' ? "bg-orange-100 text-orange-700 border-orange-200 ring-1 ring-orange-500/20" :
                                                                    p === 'medium' ? "bg-yellow-100 text-yellow-700 border-yellow-200 ring-1 ring-yellow-500/20" :
                                                                        "bg-blue-100 text-blue-700 border-blue-200 ring-1 ring-blue-500/20"
                                                            : "bg-bg-input border-transparent text-text-muted hover:bg-bg-card-hover hover:text-text-primary",
                                                        !canEdit && priority !== p && "opacity-30",
                                                        !canEdit && "cursor-default group-hover:bg-transparent"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>


                            </form>
                        </div>
                        <div className="p-4 border-t border-border-subtle bg-bg-card z-10 shrink-0">
                            <div className="flex justify-end gap-3">
                                {status === 'review' && (isOwner || isAdmin) && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                // REJECTION FLOW
                                                await updateStatus(task.id!, 'in_progress');
                                                setIsSuccess(true);
                                                setTimeout(onClose, 800);
                                            }}
                                            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
                                        >
                                            <X size={18} />
                                            <span>Return for Revision</span>
                                        </button>
                                    </>
                                )}
                                {status === 'review' && (isOwner || isAdmin) && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setStatus('done');
                                            const date = dueDateStr ? new Date(dueDateStr) : null;
                                            updateTask(task.id!, {
                                                status: 'done',
                                                completedAt: Date.now(),
                                                title,
                                                description,
                                                projectId: undefined,
                                                priority,
                                                dueDate: date && !isNaN(date.getTime()) ? date.getTime() : undefined,
                                                assigneeIds,
                                                visibility: assigneeIds.filter(uid => uid !== user?.id).length > 0 ? 'team' : 'private'
                                            });
                                            setIsSuccess(true);
                                            setTimeout(onClose, 800);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
                                    >
                                        <Check size={18} />
                                        <span>Approve & Complete</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => handleSave()}
                                    disabled={isSuccess}
                                    className={clsx(
                                        "text-white px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2",
                                        isSuccess
                                            ? "bg-green-500 shadow-green-500/30 scale-105"
                                            : status === 'done' && !isOwner && !isAdmin
                                                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                                                : "bg-violet-600 hover:bg-violet-700 shadow-violet-500/20"
                                    )}
                                >
                                    {isSuccess ? (
                                        <>
                                            <Check size={18} className="animate-bounce" />
                                            <span>{t.modal.saved}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>
                                                {isProcessing ? t.modal.confirm_todo :
                                                    mode === 'create' ? t.modal.create_task :
                                                        (status === 'done' && !isOwner && !isAdmin) ? t.modal.submit_review : t.actions.save}
                                            </span>
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Activity Feed */}
                    {showActivity && (
                        <div className="w-[350px] border-l border-border-subtle bg-bg-app/20 p-4 shrink-0 overflow-hidden">
                            <ActivityFeed taskId={task.id || ''} />
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}
