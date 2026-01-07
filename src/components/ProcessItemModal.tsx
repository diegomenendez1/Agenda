import { useState } from 'react';
import { X, Calendar, Flag, Briefcase, ArrowRight, Sparkles, Loader2, Folder, Clock, User } from 'lucide-react';
import { useStore } from '../core/store';
import type { InboxItem, Priority } from '../core/types';
import clsx from 'clsx';
import { format } from 'date-fns';

interface ProcessItemModalProps {
    item: InboxItem;
    onClose: () => void;
}

interface AIResponse {
    ai_title: string;
    ai_priority: Priority;
    ai_date: string | null;
    ai_context: string;
    ai_project_id?: string;
    ai_assignee_ids?: string[];
}

export function ProcessItemModal({ item, onClose }: ProcessItemModalProps) {
    const { convertInboxToTask, projects, team, user } = useStore();

    // Form State
    const [title, setTitle] = useState(item.text);
    const [originalTitle] = useState(item.text);
    const [priority, setPriority] = useState<Priority>('medium');
    const [dueDate, setDueDate] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [context, setContext] = useState('');

    // UI State
    const [isProcessing, setIsProcessing] = useState(false);
    const [showAIPreview, setShowAIPreview] = useState(false);

    const handleAutoProcess = async () => {
        setIsProcessing(true);
        try {
            const webhookUrl = `/api/auto-process?id=${item.id}`;

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: item.id,
                    text: item.text,
                    source: item.source,
                    created_at: new Date(item.createdAt).toISOString(),
                    available_projects: Object.values(projects).map(p => ({ id: p.id, name: p.name })),
                    available_team: Object.values(team).map(m => ({ id: m.id, name: m.name }))
                })
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No error details');
                throw new Error(`Server returned ${response.status} ${response.statusText}`);
            }

            const responseText = await response.text();

            let data: AIResponse;
            try {
                const rawData = JSON.parse(responseText);
                let parsedOutput = rawData.output;
                if (typeof parsedOutput === 'string' && parsedOutput.trim().startsWith('{')) {
                    parsedOutput = JSON.parse(parsedOutput);
                }
                data = parsedOutput || rawData;
            } catch (e) {
                throw new Error(`Invalid JSON response`);
            }

            const priorityMap: Record<string, Priority> = {
                'P1': 'critical', 'P2': 'high', 'P3': 'medium', 'P4': 'low'
            };

            if (data.ai_title) setTitle(data.ai_title);

            const mappedPriority = priorityMap[data.ai_priority as string] || data.ai_priority;
            if (['critical', 'high', 'medium', 'low'].includes(mappedPriority)) {
                setPriority(mappedPriority as Priority);
            }

            if (data.ai_date) setDueDate(data.ai_date.split('T')[0]);
            if (data.ai_context) setContext(data.ai_context);
            if (data.ai_project_id) setSelectedProjectId(data.ai_project_id);
            if (data.ai_assignee_ids && Array.isArray(data.ai_assignee_ids)) {
                setAssigneeIds(data.ai_assignee_ids);
            }

            setShowAIPreview(true);
        } catch (error: any) {
            console.error('AI Processing Error:', error);
            alert(`Failed to process item: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        await convertInboxToTask(item.id, {
            title,
            priority,
            projectId: selectedProjectId || undefined,
            dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
            description: context, // Using description for extra context
            assigneeIds // Pass assigneeIds so visibility is updated to 'team'
        });
        onClose();
    };

    const projectList = Object.values(projects);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-border-subtle flex justify-between items-start bg-bg-surface/50">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-violet-500" />
                            Process Item
                        </h2>
                        <p className="text-text-muted text-sm mt-1">Turn this thought into an actionable task</p>
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

                    {/* AI Process Button */}
                    {/* AI Process Button - Large centered version */}
                    {!showAIPreview && (
                        <div className="flex justify-center py-4">
                            <button
                                type="button"
                                onClick={handleAutoProcess}
                                disabled={isProcessing}
                                className={clsx(
                                    "group relative inline-flex items-center justify-center gap-3 px-8 py-4",
                                    "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl",
                                    "hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 hover:-translate-y-1 active:translate-y-0",
                                    "disabled:opacity-70 disabled:cursor-not-allowed"
                                )}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="tracking-wide">Analyzing with AI...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        <span className="tracking-wide uppercase">Auto-Process with AI</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* AI Suggestion/Edit Form */}
                    {(!isProcessing || showAIPreview) && (
                        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                {/* Project Selector */}
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                        <Folder size={12} className="text-accent-secondary" /> Project
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedProjectId}
                                            onChange={e => setSelectedProjectId(e.target.value)}
                                            className="input w-full appearance-none bg-bg-input"
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

                                {/* Share with / Assignee Selector */}
                                <div className="col-span-2">
                                    <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                        <User size={12} className="text-accent-secondary" /> Share with
                                    </label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.values(team)
                                            .filter(member => member.id !== user?.id)
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
                                                                {member.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className={clsx("text-sm font-medium truncate", isSelected ? "text-accent-primary" : "text-text-primary")}>
                                                                {member.name}
                                                            </div>
                                                            <div className="text-[10px] opacity-70 truncate text-text-muted">{member.role}</div>
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
                <div className="p-6 border-t border-border-subtle bg-bg-app/50 flex justify-end gap-3 mt-auto">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover rounded-xl transition-colors font-bold text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all flex items-center gap-2 text-sm"
                    >
                        <span>Confirm & Create</span>
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
