import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Flag, ArrowRight, Sparkles, Loader2, Clock, User, Check, Eye, EyeOff, ListTodo, Search, AlignLeft } from 'lucide-react';
import { useStore } from '../../core/store';
import type { InboxItem, Priority } from '../../core/types';
import clsx from 'clsx';
import { format } from 'date-fns';
import { getDescendants } from '../../core/hierarchyUtils';
import { processTaskInputWithAI } from '../../core/aiTaskProcessing';

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

import { useTranslation } from '../../core/i18n';

export function ProcessItemModal({ item, onClose }: ProcessItemModalProps) {
    const { convertInboxToTask, addTask, deleteInboxItem, team, user } = useStore();
    const { t } = useTranslation();

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
    const [modalError, setModalError] = useState<string | null>(null);
    const [loadingText, setLoadingText] = useState(t.modal.ai_processing);
    const [assigneeSearch, setAssigneeSearch] = useState('');

    // Refs for auto-expanding textareas
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const contextRef = useRef<HTMLTextAreaElement>(null);

    // Auto-expand effect on load or content change
    useEffect(() => {
        [titleRef, contextRef].forEach(ref => {
            if (ref.current) {
                ref.current.style.height = 'auto';
                ref.current.style.height = ref.current.scrollHeight + 'px';
            }
        });
    }, [title, context, showAIPreview]);

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

    const handleReviewOnly = async () => {
        // Intelligent Heuristic for "Review Later"
        const text = item.text;
        let subject = '';
        let isOptimistic = false;

        // 1. Try to find explicit Subject/Asunto patterns common in forwarded emails
        const subjectRegex = /(?:Subject|Asunto|RE|FW):\s*(.+)/i;
        const match = text.match(subjectRegex);

        if (match && match[1]) {
            // OPTIMISTIC FLOW
            isOptimistic = true;
            subject = match[1].trim().replace(/[*_]/g, '').trim();

            // Set UI immediately
            setTitle(`Revisar: ${subject}`);
            setContext(CLEANING_PLACEHOLDER); // Show placeholder instead of raw text
            setPriority('medium');
            setDueDate('');
            setCandidates([]);
            setIsEditingDetails(true);
            setShowAIPreview(false);

            // Trigger background AI Cleanup
            // We only set isProcessing if we want to block interaction. 
            // Here we want to ALLOW interaction but show loading in the description area.
            // We'll use a local loading state or just reusing isProcessing but handling the UI carefully?
            // Actually, if we set isEditingDetails(true), the form is visible.
            // If isProcessing is true, the form might be disabled? Let's check.
            // In the "Form View" (lines 424+), inputs are NOT disabled by isProcessing generally.
            // But the Save buttons might be.
            // Let's use a specific loading text to indicate background work.
            setLoadingText("Mejorando contexto...");
            setIsProcessing(true); // This might block "Save" which is safer to avoid saving mid-stream.
        } else {
            // Standard Blocking Flow
            setIsProcessing(true);
            setLoadingText("Generando título inteligente...");
        }

        try {
            if (!user?.id) throw new Error("User context missing");

            const results = await processTaskInputWithAI(user.id, item.text, {
                organizationId: user.organizationId,
                appLanguage: user.preferences?.appLanguage,
                mode: 'smart_triage'
            });

            if (results && results.length > 0) {
                // Always update context with cleaned version if available
                if (results[0].smart_analysis?.summary) {
                    setContext(results[0].smart_analysis.summary);
                }

                // If NOT optimistic (was text free), set the title from AI
                if (!isOptimistic && results[0].title) {
                    setTitle(results[0].title);
                    setContext(results[0].smart_analysis?.summary || item.text);
                    setPriority('medium');
                    setDueDate('');
                    setCandidates([]);
                    setIsEditingDetails(true);
                    setShowAIPreview(false);
                }
            } else {
                if (!isOptimistic) throw new Error("Empty AI summary");
            }
        } catch (err) {
            console.warn("Smart Triage failed:", err);
            // Fallback for non-optimistic flow
            if (!isOptimistic) {
                const firstLine = text.split('\n').find(l => l.trim().length > 0) || '';
                const words = firstLine.split(/\s+/);
                if (words.length > 8) {
                    subject = words.slice(0, 8).join(' ') + '...';
                } else {
                    subject = firstLine.substring(0, 60) + (firstLine.length > 60 ? '...' : '');
                }
                setTitle(`Revisar: ${subject}`);
                setContext(item.text);
                setPriority('medium');
                setDueDate('');
                setCandidates([]);
                setIsEditingDetails(true);
                setShowAIPreview(false);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAutoProcess = async () => {
        setIsProcessing(true);
        setModalError(null);
        setCandidates([]);
        try {
            if (!user?.id) throw new Error("User not found");

            // Use Client Service instead of N8N
            const results = await processTaskInputWithAI(user.id, item.text, {
                organizationId: user.organizationId,
                userRoleContext: user.preferences?.aiContext,
                appLanguage: user.preferences?.appLanguage
            });

            if (results.length === 0) throw new Error("AI returned no tasks/actions.");

            if (results.length === 1) {
                // Mapping: Service returns Supabase Task objects directly.
                // We need to map them to the UI's AIResponse shape to reuse existing UI logic.
                // Or better, just apply directly.
                const newTask = results[0];

                setTitle(newTask.title);
                if (newTask.priority) setPriority(newTask.priority);
                if (newTask.description || newTask.smart_analysis?.summary) setContext(newTask.description || newTask.smart_analysis?.summary);
                if (newTask.due_date) setDueDate(new Date(newTask.due_date).toISOString().split('T')[0]);
                if (newTask.assignee_ids) setAssigneeIds(newTask.assignee_ids);

                setIsProcessing(false);
            } else {
                // Multi-task handling
                // Map DB tasks back to candidates format for the UI list
                const uiCandidates: AIResponse[] = results.map((r: any) => ({
                    ai_title: r.title,
                    ai_priority: r.priority,
                    ai_date: r.due_date,
                    ai_context: r.smart_analysis?.summary || r.description,
                    ai_assignee_ids: r.assignee_ids
                }));

                setCandidates(uiCandidates);
                // Pre-select all
                setSelectedCandidates(uiCandidates.map((_, i) => i));
            }

            setShowAIPreview(true);
            setIsEditingDetails(true);

        } catch (err: any) {
            console.error('AI Processing Error:', err);
            setModalError(`DEBUG: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };


    const [isSuccess, setIsSuccess] = useState(false);

    // CLEANING_PLACEHOLDER
    const CLEANING_PLACEHOLDER = "✨ Mejorando formato y limpieza del correo... (Puedes guardar ahora para mantener el original)";

    const handleSave = async () => {
        setModalError(null);
        try {
            setIsSuccess(true);
            // Micro-interaction delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 600));

            // Derived Visibility: only 'team' if someone else is assigned
            const finalVisibility = assigneeIds.filter(id => id !== user?.id).length > 0 ? 'team' : 'private';

            // Check if context is the placeholder. If so, fallback to original text.
            const descriptionToSave = context === CLEANING_PLACEHOLDER || context === '' ? item.text : context;

            await convertInboxToTask(item.id, {
                title,
                priority,
                projectId: undefined,
                dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
                description: descriptionToSave,
                assigneeIds,
                visibility: finalVisibility,
                status: 'backlog'
            });
            onClose();
        } catch (e) {
            console.error("Failed to process item:", e);
            setIsSuccess(false);
            setModalError("Failed to save task. Please check your connection.");
        }
    };

    const handleSaveMultiple = async () => {
        if (selectedCandidates.length === 0) return;
        setModalError(null);
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
            setModalError("Failed to create tasks. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div id="process-item-modal" className="w-full bg-bg-card border border-border-subtle rounded-xl shadow-2xl overflow-hidden flex flex-col max-w-4xl h-[85vh] max-h-[85vh] min-h-0">
                {/* Header */}
                <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-surface/50 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-violet-500" />
                            {candidates.length > 1 ? t.modal.select_tasks : t.modal.process_title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-text-primary p-1.5 hover:bg-bg-surface-hover rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar min-h-0">
                    {/* Original Item context */}
                    <div className="bg-bg-surface p-3 rounded-lg border border-border-subtle/40">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 block">
                            {t.modal.original_input}
                        </label>
                        <div className="text-text-primary text-xs max-h-20 overflow-y-auto custom-scrollbar pr-2 whitespace-pre-wrap break-words">{item.text}</div>
                    </div>

                    {candidates.length <= 1 && !showAIPreview && (
                        <div className="grid grid-cols-2 gap-3 py-2">
                            <button
                                type="button"
                                onClick={handleReviewOnly}
                                disabled={isProcessing}
                                className="flex items-center gap-3 px-4 py-3 bg-bg-surface border border-border-subtle hover:border-accent-primary/50 hover:bg-accent-primary/5 rounded-xl transition-all group"
                            >
                                <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Clock size={16} />
                                </div>
                                <div className="text-left">
                                    <span className="block text-sm font-bold text-text-primary">Revisar más Tarde</span>
                                    <span className="block text-[10px] text-text-muted leading-tight">Guardar para triaje posterior</span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={handleAutoProcess}
                                disabled={isProcessing}
                                className="flex items-center gap-3 px-4 py-3 bg-bg-surface border border-border-subtle hover:border-violet-500/50 hover:bg-violet-500/5 rounded-xl transition-all group"
                            >
                                {isProcessing ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                                        <span className="text-xs text-violet-500 font-medium">{loadingText}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Sparkles size={16} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-sm font-bold text-text-primary">{t.modal.extract_actions}</span>
                                            <span className="block text-[10px] text-text-muted leading-tight">{t.modal.extract_sub}</span>
                                        </div>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {modalError && (
                        <div className="text-[10px] text-red-500 font-medium text-center mt-2 animate-in fade-in">
                            {modalError}
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
                            "flex flex-col gap-4 duration-500",
                            isEditingDetails ? "animate-in slide-in-from-right-4" : "animate-in fade-in slide-in-from-bottom-4"
                        )}>
                            {/* Input Title - Refined for better space and clarity */}
                            <div className="relative group/title">
                                <div className="flex items-center justify-between mb-1.5 ml-1">
                                    <div className="flex items-center gap-3">
                                        <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider opacity-60 italic">Título de la Tarea</label>
                                        {showAIPreview && (
                                            <div className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm rounded-full flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                                <Sparkles size={8} className="text-violet-500 fill-violet-500/20" />
                                                <span className="text-[8px] font-black uppercase tracking-wider">Sugerido por IA</span>
                                            </div>
                                        )}
                                    </div>
                                    {(title !== originalTitle || context !== '') && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTitle(originalTitle);
                                                setContext('');
                                                setShowAIPreview(false);
                                            }}
                                            className="text-[10px] text-accent-primary hover:text-accent-primary/80 font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <X size={10} /> Usar Original
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    ref={titleRef}
                                    autoFocus
                                    spellCheck={false}
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className={clsx(
                                        "w-full text-lg font-display font-bold leading-tight transition-all rounded-xl resize-none py-4 px-4",
                                        "bg-bg-input/30 border border-border-subtle hover:border-border-highlight",
                                        "focus:bg-bg-card focus:border-accent-primary focus:ring-4 focus:ring-accent-primary/5 focus:outline-none",
                                        showAIPreview && "border-indigo-200 border-l-4 border-l-accent-primary bg-indigo-50/30 shadow-sm",
                                        "custom-scrollbar overflow-y-auto max-h-[160px]"
                                    )}
                                    placeholder={t.modal.labels.title}
                                    rows={1}
                                />
                            </div>

                            {/* Extra Context - Also auto-expanding */}
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <AlignLeft size={12} className="text-text-muted" />
                                        <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Notas y Contexto</label>
                                    </div>
                                    {context !== '' && context !== item.text && (
                                        <button
                                            type="button"
                                            onClick={() => setContext(item.text)}
                                            className="text-[10px] text-accent-primary hover:text-accent-primary/80 font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <X size={10} /> Usar Original
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    ref={contextRef}
                                    spellCheck={false}
                                    value={context}
                                    onChange={e => setContext(e.target.value)}
                                    className="input w-full min-h-[140px] text-sm leading-relaxed custom-scrollbar overflow-hidden resize-none bg-bg-input/20 border-border-subtle/50 focus:bg-bg-card transition-all placeholder:italic"
                                    placeholder="Escribe aquí cualquier detalle adicional..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                {/* Due Date */}
                                <div className="col-span-1">
                                    <label className="block text-[10px] uppercase text-text-muted font-bold tracking-wider mb-1.5 flex items-center gap-2">
                                        <Clock size={12} className="text-accent-secondary" /> {t.modal.labels.due_date.split('&')[0]}
                                    </label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="input w-full py-1.5 text-sm"
                                    />
                                </div>

                                {/* Priority */}
                                <div className="col-span-1">
                                    <label className="block text-[10px] uppercase text-text-muted font-bold tracking-wider mb-1.5 flex items-center gap-2">
                                        <Flag size={12} className="text-accent-secondary" /> {t.modal.labels.priority}
                                    </label>
                                    <div className="flex gap-1">
                                        {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPriority(p)}
                                                className={clsx(
                                                    "flex-1 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all",
                                                    priority === p
                                                        ? p === 'critical' ? "bg-red-100 text-red-700 border-red-200 ring-1 ring-red-500/20" :
                                                            p === 'high' ? "bg-orange-100 text-orange-700 border-orange-200 ring-1 ring-orange-500/20" :
                                                                p === 'medium' ? "bg-yellow-100 text-yellow-700 border-yellow-200 ring-1 ring-yellow-500/20" :
                                                                    "bg-blue-100 text-blue-700 border-blue-200 ring-1 ring-blue-500/20"
                                                        : "bg-bg-input border-transparent text-text-muted hover:bg-bg-card-hover"
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Share with / Assignee Selector - ALWAYS VISIBLE */}
                                <div className="col-span-2 mt-1 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-[10px] uppercase text-text-muted font-bold tracking-wider flex items-center gap-2">
                                            <User size={12} className="text-accent-secondary" /> {t.modal.labels.share}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <div className="text-[10px] text-text-muted italic">
                                                {assigneeIds.length > 0
                                                    ? <span className="text-accent-primary font-bold flex items-center gap-1"><Eye size={10} /> {t.modal.shared_with_team}</span>
                                                    : <span className="flex items-center gap-1"><EyeOff size={10} /> {t.modal.private_task}</span>}
                                            </div>
                                            <div className="relative group/search">
                                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
                                                <input
                                                    type="text"
                                                    placeholder={t.modal.find_member}
                                                    value={assigneeSearch}
                                                    onChange={e => setAssigneeSearch(e.target.value)}
                                                    className="pl-7 pr-2 py-0.5 bg-bg-surface border border-transparent hover:border-border-subtle rounded-full text-[10px] w-[110px] focus:w-[140px] transition-all focus:border-accent-primary focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Object.values(team)
                                            .filter(member => member.id !== user?.id)
                                            .filter(member => {
                                                // Filter out invalid members or ghosts
                                                if (!member.email && (!member.name || member.name === 'Unknown' || member.name === 'Unknown User')) return false;

                                                if (!visibleMemberIds) return true;
                                                return visibleMemberIds.has(member.id);
                                            })
                                            .filter(member => {
                                                const search = assigneeSearch.toLowerCase();
                                                return (member.name || '').toLowerCase().includes(search) || (member.email || '').toLowerCase().includes(search);
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
                                                            "flex items-center gap-2 p-1.5 rounded-lg border transition-all text-left",
                                                            isSelected
                                                                ? "bg-accent-primary/5 border-accent-primary/30 shadow-inner"
                                                                : "bg-bg-input border-transparent text-text-muted hover:bg-bg-card-hover hover:border-border-subtle"
                                                        )}
                                                    >
                                                        {member.avatar ? (
                                                            <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full border border-border-subtle" />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full bg-accent-secondary/20 flex items-center justify-center text-[10px] font-bold uppercase text-accent-primary">
                                                                {(member.name || member.email || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className={clsx("text-xs font-medium truncate", isSelected ? "text-accent-primary" : "text-text-primary")}>
                                                                {member.name || member.email || 'Unknown User'}
                                                            </div>
                                                        </div>
                                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-accent-primary shadow-sm shadow-accent-primary/50" />}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {((isEditingDetails && candidates.length <= 1) || candidates.length > 1) && (
                    <div className="px-5 py-4 border-t border-border-subtle bg-bg-app/50 flex items-center justify-between mt-auto shrink-0">
                        <div>
                            {candidates.length > 1 && (
                                <button
                                    onClick={() => setCandidates([])}
                                    className="text-text-muted hover:text-text-primary text-xs font-bold uppercase tracking-wider px-2 py-1 rounded hover:bg-bg-subtle transition-colors"
                                >
                                    {t.modal.manual_switch}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover rounded-xl transition-colors font-bold text-sm"
                            >
                                {t.actions.cancel}
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
                                        <span>{t.modal.confirmed}</span>
                                    </>
                                ) : candidates.length > 1 ? (
                                    <>
                                        <ListTodo size={18} />
                                        <span>{t.modal.create_n_tasks.replace('{n}', selectedCandidates.length.toString()) + ' ' + selectedCandidates.length}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{t.modal.confirm_create}</span>
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
