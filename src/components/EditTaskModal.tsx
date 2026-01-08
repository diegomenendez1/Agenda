import { useState, useEffect } from 'react';
import { X, Folder, Flag, Clock, Trash2, User, Lock, Sparkles, ArrowRight, Layout, AlertTriangle, Search, Loader2, Check } from 'lucide-react';
import { useStore } from '../core/store';
import { ActivityFeed } from './ActivityFeed'; // Import ActivityFeed
import type { Task, Priority, TaskStatus } from '../core/types';
import clsx from 'clsx';
import { format } from 'date-fns';

interface EditTaskModalProps {
    task: Task;
    onClose: () => void;
    isProcessing?: boolean;
}

export function EditTaskModal({ task, onClose, isProcessing = false }: EditTaskModalProps) {
    const { updateTask, projects, deleteTask, team, user } = useStore();
    const [showActivity, setShowActivity] = useState(true); // Default to true specifically for collaboration audit goals


    const [title, setTitle] = useState(task.title);
    const [originalTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [projectId, setProjectId] = useState<string>(task.projectId || '');
    const [priority, setPriority] = useState<Priority>(task.priority);
    const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds || []);

    const initialDate = task.dueDate ? new Date(task.dueDate) : null;
    const [dueDateStr, setDueDateStr] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : '');

    const [aiLoading, setAiLoading] = useState(false);
    const [showAIPreview, setShowAIPreview] = useState(false);
    const [loadingText, setLoadingText] = useState("Analyzing...");
    const [assigneeSearch, setAssigneeSearch] = useState(''); // Filter for delegation

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
        setAiLoading(true);
        try {
            const webhookUrl = '/api/auto-process?id=' + task.id;
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: task.id,
                    text: task.title,
                    source: task.source || 'manual',
                    available_projects: Object.values(projects).map(p => ({ id: p.id, name: p.name })),
                    available_team: Object.values(team).map(m => ({ id: m.id, name: m.name }))
                })
            });

            if (!response.ok) throw new Error('CORS or Network Error');

            const responseText = await response.text();
            const rawData = JSON.parse(responseText);
            let aiData = rawData.output;
            if (typeof aiData === 'string' && aiData.trim().startsWith('{')) {
                aiData = JSON.parse(aiData);
            }
            const data = aiData || rawData;

            const priorityMap: Record<string, Priority> = {
                'P1': 'critical', 'P2': 'high', 'P3': 'medium', 'P4': 'low'
            };

            if (data.ai_title) setTitle(data.ai_title);
            if (data.ai_context) setDescription(data.ai_context);

            const mappedPriority = priorityMap[data.ai_priority as string] || data.ai_priority;
            if (['critical', 'high', 'medium', 'low'].includes(mappedPriority)) {
                setPriority(mappedPriority as Priority);
            }

            if (data.ai_date) setDueDateStr(data.ai_date.split('T')[0]);
            if (data.ai_project_id) setProjectId(data.ai_project_id);
            if (data.ai_assignee_ids && Array.isArray(data.ai_assignee_ids)) {
                setAssigneeIds(data.ai_assignee_ids);
            }

            setShowAIPreview(true);
        } catch (error) {
            console.error(error);
            setErrorMsg('AI Analysis failed. Please check your connection.');
            // Auto hide error after 3s
            setTimeout(() => setErrorMsg(null), 4000);
        } finally {
            setAiLoading(false);
        }
    };
    // Permission Logic
    const isOwner = user?.id === task.ownerId;

    // UI States
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSuccess(true);
        // Micro-interaction delay
        await new Promise(resolve => setTimeout(resolve, 600));

        let dueDate: number | undefined;
        if (dueDateStr) {
            const [year, month, day] = dueDateStr.split('-').map(Number);
            const properDate = new Date(year, month - 1, day);
            properDate.setHours(9, 0, 0, 0);
            dueDate = properDate.getTime();
        }

        // Check for new shared assignment (Reset to Backlog logic)
        // If we are adding new assignees (other than self), we should reset status to 'backlog' so they can accept it.
        let status: TaskStatus | undefined = isProcessing ? 'todo' : undefined;
        let acceptedAt = undefined;

        const oldIds = (task.assigneeIds || []).sort();
        const newIds = assigneeIds.sort();
        const idsChanged = JSON.stringify(oldIds) !== JSON.stringify(newIds);

        if (idsChanged && newIds.length > 0) {
            // Check if we are only assigning to self
            const isSelf = newIds.length === 1 && newIds[0] === user?.id;

            // If sharing with others, force backlog for acceptance flow
            if (!isSelf && task.status !== 'done') {
                status = 'backlog';
                acceptedAt = null; // Explicitly clear acceptance
            }
        }

        updateTask(task.id, {
            title,
            description,
            projectId: projectId || undefined,
            priority,
            dueDate,
            assigneeIds,
            status,
            acceptedAt: acceptedAt as any
        });

        onClose();
    };

    const handleDelete = () => {
        deleteTask(task.id);
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={clsx(
                "w-full bg-bg-card border border-border-subtle rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col",
                showActivity ? "max-w-5xl h-[85vh]" : "max-w-lg max-h-[90vh]"
            )}>

                <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-bg-app/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="font-display font-semibold text-lg text-text-primary">
                            {isProcessing ? 'Accept & Process Item' : 'Edit Task'}
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

                        {isOwner && (
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
                        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary hover:bg-bg-input p-2 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Column: Form */}
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
                        {isProcessing && !showAIPreview && (
                            <div className="flex justify-center py-4">
                                <button
                                    type="button"
                                    onClick={handleAutoProcess}
                                    disabled={aiLoading}
                                    className={clsx(
                                        "group relative inline-flex items-center justify-center gap-3 px-8 py-4 w-full",
                                        "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl",
                                        "shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300",
                                        "disabled:opacity-70 disabled:cursor-not-allowed"
                                    )}
                                >
                                    {aiLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin text-white/80" />
                                            <span className="tracking-wide font-display">{loadingText}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            <span className="tracking-wide font-display">Auto-Process with AI</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Form Content */}
                        {(!isProcessing || showAIPreview) && (
                            <form onSubmit={handleSave} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                                {!isOwner && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                                        <Lock size={16} />
                                        <span>view only mode • Only the task owner can edit details.</span>
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider">Title</label>
                                        {isOwner && title !== originalTitle && (
                                            <button
                                                type="button"
                                                onClick={() => setTitle(originalTitle)}
                                                className="text-[10px] text-accent-primary hover:underline flex items-center gap-1 font-bold"
                                            >
                                                <X size={10} /> Use Original
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        autoFocus={isOwner}
                                        disabled={!isOwner}
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className={clsx(
                                            "input w-full text-lg font-medium transition-all bg-transparent border-transparent px-0 hover:bg-bg-input hover:px-3 focus:bg-bg-input focus:px-3 focus:border-accent-primary",
                                            showAIPreview && title !== originalTitle && "ring-2 ring-violet-500/20 border-violet-500/30",
                                            !isOwner && "opacity-70 cursor-not-allowed"
                                        )}
                                        placeholder="Task Title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2">Description / Context</label>
                                    <textarea
                                        disabled={!isOwner}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className={clsx(
                                            "input w-full min-h-[120px] text-sm resize-y leading-relaxed",
                                            !isOwner && "opacity-70 cursor-not-allowed bg-transparent border-transparent px-0 resize-none"
                                        )}
                                        placeholder={isOwner ? "Add details, context or instructions..." : "No description provided."}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-5 animate-in slide-in-from-top-2">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                            <Folder size={12} className="text-accent-secondary" /> Project
                                        </label>
                                        <div className="relative">
                                            <select
                                                disabled={!isOwner}
                                                value={projectId}
                                                onChange={e => setProjectId(e.target.value)}
                                                className={clsx("input w-full appearance-none bg-bg-input", !isOwner && "opacity-70 cursor-not-allowed")}
                                            >
                                                <option value="">No Project</option>
                                                {Object.values(projects).map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                                <Folder size={14} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                            <Clock size={12} className="text-accent-secondary" /> Due Date
                                        </label>
                                        <input
                                            disabled={!isOwner}
                                            type="date"
                                            value={dueDateStr}
                                            onChange={e => setDueDateStr(e.target.value)}
                                            className={clsx("input w-full", !isOwner && "opacity-70 cursor-not-allowed")}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs uppercase text-text-muted font-bold tracking-wider flex items-center gap-2">
                                                <User size={12} className="text-accent-secondary" /> Share / Delegate
                                            </label>
                                            {/* Delegation Search - UX Fix */}
                                            <div className="relative group/search">
                                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
                                                <input
                                                    type="text"
                                                    placeholder="Find member..."
                                                    value={assigneeSearch}
                                                    onChange={e => setAssigneeSearch(e.target.value)}
                                                    className="pl-7 pr-2 py-1 bg-bg-surface border border-transparent hover:border-border-subtle rounded-full text-xs w-[120px] focus:w-[150px] transition-all focus:border-accent-primary focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {Object.values(team)
                                                .filter(member => member.id !== user?.id)
                                                .filter(member => member.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                                                .map(member => {
                                                    const isSelected = assigneeIds.includes(member.id);
                                                    const isLocked = !isOwner;
                                                    return (
                                                        <button
                                                            key={member.id}
                                                            type="button"
                                                            disabled={isLocked}
                                                            onClick={() => {
                                                                if (isLocked) return;
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
                                                                isLocked && "opacity-80 cursor-default"
                                                            )}
                                                        >
                                                            {member.avatar ? (
                                                                <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border border-border-subtle" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-accent-secondary/20 flex items-center justify-center text-xs font-bold uppercase text-accent-primary">
                                                                    {member.name.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <div className={clsx("text-sm font-medium truncate", isSelected ? "text-accent-primary" : "text-text-primary")}>
                                                                    {member.name}
                                                                </div>
                                                                <div className="text-[10px] opacity-70 truncate text-text-muted">{member.role}</div>
                                                            </div>
                                                            {isLocked && <Lock size={12} className="text-text-muted ml-1" />}
                                                            {isSelected && !isLocked && <div className="w-2 h-2 rounded-full bg-accent-primary shadow-sm shadow-accent-primary/50" />}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                            <Flag size={12} className="text-accent-secondary" /> Priority
                                        </label>
                                        <div className="flex gap-2">
                                            {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    disabled={!isOwner}
                                                    onClick={() => setPriority(p)}
                                                    className={clsx(
                                                        "flex-1 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all shadow-sm",
                                                        priority === p
                                                            ? p === 'critical' ? "bg-red-600 text-white border-red-700 shadow-red-600/20" :
                                                                p === 'high' ? "bg-orange-500 text-white border-orange-600 shadow-orange-500/20" :
                                                                    p === 'medium' ? "bg-yellow-500 text-white border-yellow-600 shadow-yellow-500/20" :
                                                                        "bg-blue-500 text-white border-blue-600 shadow-blue-500/20"
                                                            : "bg-bg-input border-transparent text-text-muted hover:bg-bg-card-hover hover:text-text-primary",
                                                        !isOwner && priority !== p && "opacity-30",
                                                        !isOwner && "cursor-default group-hover:bg-transparent"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {isOwner && (
                                    <div className="flex justify-end pt-5 border-t border-border-subtle mt-2">
                                        <button
                                            type="submit"
                                            disabled={isSuccess}
                                            className={clsx(
                                                "text-white px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2",
                                                isSuccess
                                                    ? "bg-green-500 shadow-green-500/30 scale-105"
                                                    : "bg-violet-600 hover:bg-violet-700 shadow-violet-500/20"
                                            )}
                                        >
                                            {isSuccess ? (
                                                <>
                                                    <Check size={18} className="animate-bounce" />
                                                    <span>Saved!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{isProcessing ? 'Confirm & To Do' : 'Save Changes'}</span>
                                                    <ArrowRight size={16} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>

                    {/* Right Column: Activity Feed */}
                    {showActivity && (
                        <div className="w-[350px] border-l border-border-subtle bg-bg-app/20 p-4 shrink-0 overflow-hidden">
                            <ActivityFeed taskId={task.id} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
