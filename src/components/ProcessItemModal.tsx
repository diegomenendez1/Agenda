import { useState, useEffect, useMemo } from 'react';
import { X, Flag, ArrowRight, Sparkles, Loader2, Clock, User, Check, Eye, EyeOff, ListTodo } from 'lucide-react';
import { useStore } from '../core/store';
import type { InboxItem, Priority } from '../core/types';
import { fetchWithRetry } from '../core/api';
import clsx from 'clsx';
import { format } from 'date-fns';
import { getDescendants } from '../core/hierarchyUtils';

interface ProcessItemModalProps {
    item: InboxItem;
    onClose: () => void;
}

interface AIResponse {
    ai_title: string;
    ai_priority: Priority;
    ai_date: string | null;
    ai_context: string;

    ai_assignee_ids?: string[];
}

export function ProcessItemModal({ item, onClose }: ProcessItemModalProps) {
    const { convertInboxToTask, addTask, deleteInboxItem, team, user } = useStore();

    // VISIBILITY LOGIC (Refactored)
    const visibleMemberIds = useMemo(() => {
        if (!user) return new Set<string>();

        // Owners see everyone
        if (user.role === 'owner') return null;

        // strict visibility: Down + 1 Up
        const ids = getDescendants(user.id, Object.values(team));

        // Debug
        console.log('DEBUG: Assignments (ProcessItem) for', user.role, user.id, 'Visible:', Array.from(ids));

        return ids;
    }, [user, team]);

    // Form State
    const [title, setTitle] = useState(item.text);
    const [originalTitle] = useState(item.text);
    const [priority, setPriority] = useState<Priority>('medium');
    const [dueDate, setDueDate] = useState<string>('');

    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [context, setContext] = useState('');
    // Visibility derived from assignees now

    // UI State
    const [candidates, setCandidates] = useState<AIResponse[]>([]);
    const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showAIPreview, setShowAIPreview] = useState(false);
    const [isEditingDetails, setIsEditingDetails] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingText, setLoadingText] = useState("Analyzing...");

    useEffect(() => {
        if (!isProcessing) return;
        const messages = [
            "Reading context...",
            "Matching project...",
            "Estimating priority...",
            "Drafting summary..."
        ];
        let i = 0;
        setLoadingText(messages[0]);
        const interval = setInterval(() => {
            i = (i + 1) % messages.length;
            setLoadingText(messages[i]);
        }, 800);
        return () => clearInterval(interval);
    }, [isProcessing]);

    const handleAutoProcess = async () => {
        setIsProcessing(true);
        setError(null);
        setCandidates([]);
        try {
            // Determine URL based on environment
            const webhookUrl = import.meta.env.DEV
                ? `/api/auto-process?id=${item.id}`
                : `${import.meta.env.VITE_N8N_WEBHOOK_URL}?id=${item.id}`;

            const response = await fetchWithRetry(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: item.id,
                    text: item.text,
                    source: item.source,
                    created_at: new Date(item.createdAt).toISOString(),
                    // Optimization: Send only minimal necessary data to reduce payload size

                    // Security warning: We are sending team names. Filter out current user AND RESPECT VISIBILITY to avoid hallucinating assignments
                    available_team: Object.values(team)
                        .filter(m => m.id !== user?.id)
                        .filter(m => {
                            // Re-calculate simply or assume backend will handle? 
                            // Safer to filter here so AI doesn't suggest hidden people.
                            if (!user || user.role === 'owner') return true;
                            // We don't have access to the hook variable inside this callback easily if defined outside render? 
                            // Wait, visibleMemberIds is in scope of the component, handleAutoProcess is inside the component.
                            // So we can use visibleMemberIds!
                            if (!visibleMemberIds) return true;
                            return visibleMemberIds.has(m.id);
                        })
                        .map(m => ({ id: m.id, name: m.name })),
                    // Context injection for better AI decision making
                    team_context: (() => {
                        // Dynamic Context Injection based on Source
                        const baseContext = user?.preferences?.aiContext || "CRITICAL RULE: If a task mentions 'Urgent', 'Critical', or 'ASAP', assign HIGH or CRITICAL priority even if the due date is in the future.";

                        if (item.source === 'email') {
                            return `${baseContext}\n\n[MODE: EMAIL PROCESSING]\nIdentify the core request. Summarize context but keep technical details specific. Infer priority from sender tone.`;
                        } else if (item.source === 'meeting' || item.source === 'voice') {
                            return `${baseContext}\n\n[MODE: MEETING TRANSCRIPT ANALYSIS]\nExtract actionable tasks from this meeting transcript. Identify who said what if relevant. Ignore small talk. Group related points.`;
                        } else {
                            // Manual / System
                            return `${baseContext}\n\n[MODE: STRICT MANUAL INPUT]\n1. TITLE: Keep it simple. Use the user's keywords. Do not start with "Gestionar" or "Tarea" if not present.\n2. DESCRIPTION/CONTEXT: Return an EMPTY STRING ("") if the input is short. DO NOT explain what the task is (e.g., do not say "Tarea sobre activos").\n3. NO ADDED VALUE: Your job is only to fix typos and format. Do not add metadata, projects, or categories to the text field.\n4. ABSOLUTE RULE: If the user wrote "A, B y C", and you return "Gestionar A, B y C", that is acceptable but "Tarea administrativa sobre los activos de..." is FORBIDDEN.`;
                        }
                    })()
                }),
                timeout: 60000 // Correctly placed inside the options object
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                console.error("Webhook Error Details:", { status: response.status, text: errorText, url: webhookUrl });

                if (response.status === 404) {
                    if (errorText.includes("active")) {
                        throw new Error('404: Workflow is NOT ACTIVE. Turn on the switch in n8n.');
                    }
                    throw new Error(`404: Webhook URL Not Found. Server: "${errorText.substring(0, 50)}"`);
                }
                if (response.status >= 500) {
                    throw new Error(`n8n Error (${response.status}): Check workflow logs/model.`);
                }
                throw new Error(`Connection failed (${response.status}): ${errorText.substring(0, 100)}`);
            }

            const responseText = await response.text();

            if (!responseText || responseText.trim() === '') {
                throw new Error('AI returned empty response. Check n8n workflow.');
            }

            let data: AIResponse | AIResponse[];
            try {
                let rawData = JSON.parse(responseText);

                // Unwrap 'output' property if present (n8n Agent node standard)
                if (rawData && typeof rawData === 'object' && 'output' in rawData) {
                    rawData = rawData.output;
                }

                // Parse stringified JSON if strictly necessary
                if (typeof rawData === 'string') {
                    const trimmed = rawData.trim();
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        try {
                            rawData = JSON.parse(trimmed);
                        } catch (innerError) {
                            console.warn("Attempted to parse stringified JSON but failed, using raw string:", innerError);
                        }
                    }
                }

                data = rawData;
            } catch (e) {
                console.error('Failed to parse n8n response. Status:', response.status, 'Body:', responseText);
                throw new Error(`Invalid JSON response from AI.`);
            }

            // Normalization
            let results: AIResponse[] = [];
            if (Array.isArray(data)) {
                results = data;
            } else {
                results = [data as AIResponse];
            }

            if (results.length === 0) throw new Error("AI returned no tasks.");

            if (results.length === 1) {
                // Single Task Flow (Classic)
                applySingleResult(results[0]);
            } else {
                // Multi-Task Flow (New)
                const priorityOrder: Record<string, number> = {
                    'critical': 0, 'P1': 0,
                    'high': 1, 'P2': 1,
                    'medium': 2, 'P3': 2,
                    'low': 3, 'P4': 3
                };

                const sortedResults = [...results].sort((a, b) => {
                    const pA = priorityOrder[a.ai_priority] ?? 4;
                    const pB = priorityOrder[b.ai_priority] ?? 4;
                    return pA - pB;
                });

                setCandidates(sortedResults);
                setSelectedCandidates([]); // No select by default as requested
            }

            setShowAIPreview(true);
            setIsEditingDetails(true);
        } catch (error: any) {
            console.error('AI Processing Error:', error);
            setError(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const applySingleResult = (data: AIResponse) => {
        const priorityMap: Record<string, Priority> = {
            'P1': 'critical', 'P2': 'high', 'P3': 'medium', 'P4': 'low',
            'critical': 'critical', 'high': 'high', 'medium': 'medium', 'low': 'low'
        };

        if (data.ai_title) setTitle(data.ai_title);

        const mappedPriority = priorityMap[data.ai_priority as string] || 'medium';
        setPriority(mappedPriority as Priority);

        if (data.ai_date) setDueDate(data.ai_date.split('T')[0]);
        if (data.ai_context) setContext(data.ai_context);

        if (data.ai_assignee_ids && Array.isArray(data.ai_assignee_ids)) {
            setAssigneeIds(data.ai_assignee_ids);
        }

        // Ensure UI transitions
        setIsProcessing(false);
    };

    const [isSuccess, setIsSuccess] = useState(false);

    const handleSave = async () => {
        setError(null);
        try {
            setIsSuccess(true);
            // Micro-interaction delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 600));

            // Derived Visibility: only 'team' if someone else is assigned
            const finalVisibility = assigneeIds.filter(id => id !== user?.id).length > 0 ? 'team' : 'private';

            await convertInboxToTask(item.id, {
                title,
                priority,
                projectId: undefined,
                dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
                description: context,
                assigneeIds,
                visibility: finalVisibility,
                status: 'backlog'
            });
            onClose();
        } catch (e) {
            console.error("Failed to process item:", e);
            setIsSuccess(false);
            setError("Failed to save task. Please check your connection.");
        }
    };

    const handleSaveMultiple = async () => {
        if (selectedCandidates.length === 0) return;
        setError(null);
        try {
            setIsSuccess(true);
            await new Promise(resolve => setTimeout(resolve, 600));

            const priorityMap: Record<string, Priority> = { 'P1': 'critical', 'P2': 'high', 'P3': 'medium', 'P4': 'low' };

            // Filter candidates
            const tasksToCreate = candidates.filter((_, idx) => selectedCandidates.includes(idx));

            for (const data of tasksToCreate) {
                const prio = priorityMap[data.ai_priority as string] || data.ai_priority || 'medium';
                const finalVisibility = (data.ai_assignee_ids?.filter(id => id !== user?.id).length || 0) > 0 ? 'team' : 'private';

                await addTask({
                    title: data.ai_title,
                    priority: prio as Priority,
                    projectId: undefined,
                    dueDate: data.ai_date ? new Date(data.ai_date).getTime() : undefined,
                    description: data.ai_context,
                    assigneeIds: data.ai_assignee_ids || [],
                    visibility: finalVisibility,
                    status: 'backlog'
                });
            }

            // THE CRITICAL FIX: Delete the item and close the modal IMMEDIATELY
            await deleteInboxItem(item.id);
            onClose();
        } catch (e) {
            console.error("Failed to create tasks:", e);
            setIsSuccess(false);
            setError("Failed to create tasks. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-border-subtle flex justify-between items-start bg-bg-surface/50">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-violet-500" />
                            {candidates.length > 1 ? 'Select Tasks to Create' : 'Process Item'}
                        </h2>
                        <p className="text-text-muted text-sm mt-1">
                            {candidates.length > 1
                                ? `AI found ${candidates.length} potential tasks in this item`
                                : 'Turn this thought into an actionable task'
                            }
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-text-primary p-2 hover:bg-bg-surface-hover rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Original Item context */}
                    <div className="bg-bg-surface p-4 rounded-xl border border-border-subtle/50">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
                            Original Input
                        </label>
                        <p className="text-text-primary">{item.text}</p>
                        <div className="mt-2 text-xs text-text-muted flex gap-3">
                            <span>Source: {item.source}</span>
                            <span>{format(item.createdAt, 'MMM d, HH:mm')}</span>
                        </div>
                    </div>

                    {/* AI Process Button - Large centered version */}
                    {/* AI Process Button & Manual Option */}
                    {/* AI Process Trigger (Optional) */}
                    {/* AI Process Trigger (Optional) */}
                    {candidates.length <= 1 && (
                        <div className="flex flex-col items-end gap-2">
                            <button
                                type="button"
                                onClick={handleAutoProcess}
                                disabled={isProcessing}
                                className={clsx(
                                    "text-xs font-bold uppercase tracking-wider flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                                    isProcessing
                                        ? "bg-bg-subtle text-text-muted cursor-wait"
                                        : "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 hover:text-violet-700"
                                )}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 size={12} className="animate-spin" />
                                        {loadingText}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={14} />
                                        Auto-Fill with AI
                                    </>
                                )}
                            </button>
                            {error && (
                                <div className="text-[10px] text-red-500 font-medium animate-in fade-in slide-in-from-right-2 max-w-[200px] text-right">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MULTI TASK SELECTION VIEW */}
                    {candidates.length > 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-3">
                            {candidates.map((c, idx) => {
                                const isSelected = selectedCandidates.includes(idx);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setSelectedCandidates(prev => isSelected ? prev.filter(i => i !== idx) : [...prev, idx]);
                                        }}
                                        className={clsx(
                                            "p-4 rounded-xl border-2 transition-all cursor-pointer flex gap-4 items-start select-none",
                                            isSelected
                                                ? "border-violet-500 bg-violet-500/5 shadow-md"
                                                : "border-border-subtle hover:border-border-subtle/80 opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                                            isSelected ? "bg-violet-500 border-violet-500" : "border-text-muted/40"
                                        )}>
                                            {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={clsx("font-bold text-base mb-1", isSelected ? "text-text-primary" : "text-text-secondary")}>
                                                {c.ai_title}
                                            </h3>
                                            <p className="text-sm text-text-muted line-clamp-2">{c.ai_context}</p>

                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border",
                                                    c.ai_priority === 'critical' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                        c.ai_priority === 'high' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                                                            "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                                )}>{c.ai_priority}</span>



                                                {(c.ai_assignee_ids?.length || 0) > 0 && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-accent-primary bg-accent-primary/10 border border-accent-primary/20">
                                                        <User size={10} /> {(c.ai_assignee_ids?.length || 0) > 1 ? `${c.ai_assignee_ids?.length} Assignees` : team[c.ai_assignee_ids![0]]?.name || 'Assigned'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Form View */}
                    {candidates.length <= 1 && (
                        <div className={clsx(
                            "flex flex-col gap-6 duration-500",
                            isEditingDetails ? "animate-in slide-in-from-right-4" : "animate-in fade-in slide-in-from-bottom-4"
                        )}>
                            {/* Input Title */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs uppercase text-text-muted font-bold tracking-wider">Title</label>
                                    {title !== originalTitle && (
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
                                    autoFocus
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className={clsx(
                                        "input w-full text-lg font-medium transition-all",
                                        showAIPreview && title !== originalTitle && "ring-2 ring-violet-500/20 border-violet-500/30"
                                    )}
                                />
                            </div>

                            {/* Extra Context */}
                            <div>
                                <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2">Extra Context / Description</label>
                                <textarea
                                    value={context}
                                    onChange={e => setContext(e.target.value)}
                                    className="input w-full min-h-[80px] text-sm resize-y leading-relaxed"
                                    placeholder="Add details, context or instructions..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5 animate-in slide-in-from-top-2">


                                {/* Due Date */}
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                        <Clock size={12} className="text-accent-secondary" /> Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="input w-full"
                                    />
                                </div>

                                {/* Share with / Assignee Selector - ALWAYS VISIBLE */}
                                <div className="col-span-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider flex items-center gap-2">
                                            <User size={12} className="text-accent-secondary" /> Share / Delegate
                                        </label>
                                        <div className="text-[10px] text-text-muted italic">
                                            {assigneeIds.length > 0
                                                ? <span className="text-accent-primary font-bold flex items-center gap-1"><Eye size={10} /> Shared with Team</span>
                                                : <span className="flex items-center gap-1"><EyeOff size={10} /> Private Task</span>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.values(team)
                                            .filter(member => member.id !== user?.id)
                                            .filter(member => {
                                                if (!visibleMemberIds) return true;
                                                return visibleMemberIds.has(member.id);
                                            })
                                            .map(member => {
                                                const isSelected = assigneeIds.includes(member.id);

                                                return (
                                                    <button
                                                        key={member.id}
                                                        type="button"
                                                        onClick={() => {
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
                                                                : "bg-bg-input border-transparent text-text-muted hover:bg-bg-card-hover hover:border-border-subtle"
                                                        )}
                                                    >
                                                        {member.avatar ? (
                                                            <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border border-border-subtle" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-accent-secondary/20 flex items-center justify-center text-xs font-bold uppercase text-accent-primary">
                                                                {member.name?.charAt(0) || '?'}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className={clsx("text-sm font-medium truncate", isSelected ? "text-accent-primary" : "text-text-primary")}>
                                                                {member.name}
                                                            </div>
                                                            <div className="text-[10px] opacity-70 truncate text-text-muted">{member.email}</div>
                                                        </div>
                                                        {isSelected && <div className="w-2 h-2 rounded-full bg-accent-primary shadow-sm shadow-accent-primary/50" />}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Priority */}
                                <div className="col-span-2">
                                    <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                        <Flag size={12} className="text-accent-secondary" /> Priority
                                    </label>
                                    <div className="flex gap-2">
                                        {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPriority(p)}
                                                className={clsx(
                                                    "flex-1 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all shadow-sm",
                                                    priority === p
                                                        ? p === 'critical' ? "bg-red-600 text-white border-red-700 shadow-red-600/20" :
                                                            p === 'high' ? "bg-orange-500 text-white border-orange-600 shadow-orange-500/20" :
                                                                p === 'medium' ? "bg-yellow-500 text-white border-yellow-600 shadow-yellow-500/20" :
                                                                    "bg-blue-500 text-white border-blue-600 shadow-blue-500/20"
                                                        : "bg-bg-input border-transparent text-text-muted hover:bg-bg-card-hover hover:text-text-primary"
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {((isEditingDetails && candidates.length <= 1) || candidates.length > 1) && (
                    <div className="p-6 border-t border-border-subtle bg-bg-app/50 flex items-center justify-between mt-auto">
                        <div>
                            {candidates.length > 1 && (
                                <button
                                    onClick={() => setCandidates([])}
                                    className="text-text-muted hover:text-text-primary text-xs font-bold uppercase tracking-wider px-2 py-1 rounded hover:bg-bg-subtle transition-colors"
                                >
                                    Switch to Manual
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover rounded-xl transition-colors font-bold text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={candidates.length > 1 ? handleSaveMultiple : handleSave}
                                disabled={isSuccess || (candidates.length > 1 && selectedCandidates.length === 0)}
                                className={clsx(
                                    "text-white px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 text-sm",
                                    isSuccess
                                        ? "bg-green-500 shadow-green-500/30 scale-105"
                                        : "bg-accent-primary hover:bg-accent-primary/90 shadow-accent-primary/20 hover:shadow-accent-primary/30",
                                    (candidates.length > 1 && selectedCandidates.length === 0) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isSuccess ? (
                                    <>
                                        <Check size={18} className="animate-bounce" />
                                        <span>Confirmed!</span>
                                    </>
                                ) : candidates.length > 1 ? (
                                    <>
                                        <ListTodo size={18} />
                                        <span>Create {selectedCandidates.length} Tasks</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Confirm & Create</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
