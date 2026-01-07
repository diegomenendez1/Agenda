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
            <div className="w-full max-w-lg bg-bg-card border border-border-subtle rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                    <h2 className="font-semibold text-lg">Process Inbox Item</h2>
                    <button onClick={onClose} className="text-muted hover:text-primary"><X size={20} /></button>
                </div>

                <form onSubmit={handleProcess} className="p-6 flex flex-col gap-6">

                    {/* Input Title */}
                    <div>
                        <label className="block text-xs uppercase text-muted font-bold mb-2">Title</label>
                        <input
                            autoFocus
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="input w-full text-lg"
                        />
                    </div>

                    {/* Type Switcher */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setType('task')}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all",
                                type === 'task' ? "bg-accent-primary/10 border-accent-primary text-accent-primary" : "bg-bg-input border-transparent text-muted hover:bg-bg-card-hover"
                            )}
                        >
                            <CheckSquare size={18} /> Task
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('note')}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all",
                                type === 'note' ? "bg-accent-primary/10 border-accent-primary text-accent-primary" : "bg-bg-input border-transparent text-muted hover:bg-bg-card-hover"
                            )}
                        >
                            <StickyNote size={18} /> Note
                        </button>
                    </div>

                    {type === 'note' && (
                        <div className="animate-in slide-in-from-top-2">
                            <label className="block text-xs uppercase text-muted font-bold mb-2">Note Body</label>
                            <textarea
                                value={noteBody}
                                onChange={e => setNoteBody(e.target.value)}
                                className="input w-full min-h-[120px] resize-none"
                                placeholder="Add note content..."
                            />
                        </div>
                    )}

                    {type === 'task' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                            {/* Project Selector */}
                            <div className="col-span-2">
                                <label className="block text-xs uppercase text-muted font-bold mb-2 flex items-center gap-2">
                                    <Folder size={12} /> Project
                                </label>
                                <select
                                    value={projectId}
                                    onChange={e => setProjectId(e.target.value)}
                                    className="input w-full appearance-none"
                                >
                                    <option value="">No Project (Inbox/General)</option>
                                    {Object.values(projects).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Share with / Assignee Selector */}
                            <div className="col-span-2">
                                <label className="block text-xs uppercase text-muted font-bold mb-2 flex items-center gap-2">
                                    <User size={12} /> Share with
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
                                                            ? "bg-accent-primary/10 border-accent-primary text-accent-primary"
                                                            : "bg-bg-input border-transparent text-muted hover:bg-bg-card-hover"
                                                    )}
                                                >
                                                    {member.avatar ? (
                                                        <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold uppercase">
                                                            {member.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">{member.name}</div>
                                                        <div className="text-[10px] opacity-70 truncate">{member.role}</div>
                                                    </div>
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-accent-primary" />}
                                                </button>
                                            );
                                        })}
                                </div>

                                {assigneeIds.length === 0 && (
                                    <p className="text-[10px] text-text-muted mt-2 ml-1 italic">
                                        Private task. Select team members to share visibility.
                                    </p>
                                )}
                            </div>

                            {/* Due Date */}
                            <div className="col-span-2">
                                <label className="block text-xs uppercase text-muted font-bold mb-2 flex items-center gap-2">
                                    <Clock size={12} /> Due Date
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
                                <label className="block text-xs uppercase text-muted font-bold mb-2 flex items-center gap-2">
                                    <Flag size={12} /> Priority
                                </label>
                                <div className="flex gap-2">
                                    {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPriority(p)}
                                            className={clsx(
                                                "flex-1 py-1.5 rounded-md border text-xs font-semibold uppercase tracking-wider transition-all",
                                                priority === p
                                                    ? p === 'high' ? "bg-red-500/10 text-red-500 border-red-500/50" :
                                                        p === 'medium' ? "bg-orange-500/10 text-orange-500 border-orange-500/50" :
                                                            "bg-blue-500/10 text-blue-500 border-blue-500/50"
                                                    : "bg-bg-input border-transparent text-muted hover:border-border-subtle"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-border-subtle">
                        <button type="submit" className="btn btn-primary px-6 py-2.5 text-base">
                            Process & Save
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
