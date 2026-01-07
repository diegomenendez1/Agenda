import { useState, useEffect } from 'react';
import { X, CheckSquare, StickyNote, Folder, Flag, Clock, User } from 'lucide-react';
import { useStore } from '../core/store';
import type { InboxItem, Priority } from '../core/types';
import clsx from 'clsx';

interface ProcessItemModalProps {
    item: InboxItem;
    onClose: () => void;
}

export function ProcessItemModal({ item, onClose }: ProcessItemModalProps) {
    const { convertInboxToTask, convertInboxToNote, projects, team, user } = useStore();

    const [title, setTitle] = useState(item.text);
    const [type, setType] = useState<'task' | 'note'>('task');
    const [projectId, setProjectId] = useState<string>('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [dueDateStr, setDueDateStr] = useState('');
    const [noteBody, setNoteBody] = useState('');

    // Handle escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleProcess = (e: React.FormEvent) => {
        e.preventDefault();

        if (type === 'task') {
            let dueDate: number | undefined;
            if (dueDateStr) {
                const [year, month, day] = dueDateStr.split('-').map(Number);
                const properDate = new Date(year, month - 1, day); // Month is 0-indexed

                properDate.setHours(9, 0, 0, 0); // Default to 9 AM
                dueDate = properDate.getTime();
            }

            convertInboxToTask(item.id, {
                title,
                projectId: projectId || undefined,
                priority,
                dueDate,
                assigneeIds
            });
        } else {
            convertInboxToNote(item.id, title, noteBody);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-bg-card border border-border-subtle rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

                <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-bg-app/50">
                    <h2 className="font-display font-semibold text-lg text-text-primary">Process Inbox Item</h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary hover:bg-bg-input p-2 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleProcess} className="p-6 flex flex-col gap-6">

                    {/* Input Title */}
                    <div>
                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2">Title</label>
                        <input
                            autoFocus
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="input w-full text-lg font-medium"
                        />
                    </div>

                    {/* Type Switcher */}
                    <div className="flex gap-4 p-1 bg-bg-input rounded-xl border border-border-subtle">
                        <button
                            type="button"
                            onClick={() => setType('task')}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg transition-all font-medium text-sm",
                                type === 'task'
                                    ? "bg-bg-card text-accent-primary shadow-sm ring-1 ring-border-subtle"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-card/50"
                            )}
                        >
                            <CheckSquare size={16} /> Task
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('note')}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg transition-all font-medium text-sm",
                                type === 'note'
                                    ? "bg-bg-card text-accent-primary shadow-sm ring-1 ring-border-subtle"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-card/50"
                            )}
                        >
                            <StickyNote size={16} /> Note
                        </button>
                    </div>

                    {type === 'note' && (
                        <div className="animate-in slide-in-from-top-2">
                            <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2">Note Body</label>
                            <textarea
                                value={noteBody}
                                onChange={e => setNoteBody(e.target.value)}
                                className="input w-full min-h-[150px] resize-none leading-relaxed"
                                placeholder="Add note content..."
                            />
                        </div>
                    )}

                    {type === 'task' && (
                        <div className="grid grid-cols-2 gap-5 animate-in slide-in-from-top-2">
                            {/* Project Selector */}
                            <div className="col-span-2">
                                <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                    <Folder size={12} className="text-accent-secondary" /> Project
                                </label>
                                <div className="relative">
                                    <select
                                        value={projectId}
                                        onChange={e => setProjectId(e.target.value)}
                                        className="input w-full appearance-none bg-bg-input"
                                    >
                                        <option value="">No Project (Inbox/General)</option>
                                        {Object.values(projects).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                        <Folder size={14} />
                                    </div>
                                </div>
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
                                                        "flex items-center gap-3 p-2 rounded-lg border transition-all text-left",
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

                                {assigneeIds.length === 0 && (
                                    <p className="text-[11px] text-text-muted mt-2 flex items-center gap-1.5 opacity-80 bg-bg-input/50 p-2 rounded-md">
                                        <User size={12} />
                                        Private task. Select team members to share visibility.
                                    </p>
                                )}
                            </div>

                            {/* Due Date */}
                            <div className="col-span-2">
                                <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                    <Clock size={12} className="text-accent-secondary" /> Due Date
                                </label>
                                <input
                                    type="date"
                                    value={dueDateStr}
                                    onChange={e => setDueDateStr(e.target.value)}
                                    className="input w-full"
                                />
                            </div>

                            {/* Priority */}
                            <div className="col-span-2">
                                <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                    <Flag size={12} className="text-accent-secondary" /> Priority
                                </label>
                                <div className="flex gap-2">
                                    {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPriority(p)}
                                            className={clsx(
                                                "flex-1 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all shadow-sm",
                                                priority === p
                                                    ? p === 'high' ? "bg-red-500 text-white border-red-600 shadow-red-500/20" :
                                                        p === 'medium' ? "bg-orange-500 text-white border-orange-600 shadow-orange-500/20" :
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
                    )}

                    <div className="flex justify-end pt-5 border-t border-border-subtle mt-2">
                        <button type="submit" className="btn btn-primary px-8 py-2.5 text-sm shadow-lg shadow-accent-primary/20">
                            Process & Save
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
