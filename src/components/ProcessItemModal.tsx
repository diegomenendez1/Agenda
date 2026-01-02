import { useState, useEffect } from 'react';
import { X, CheckSquare, StickyNote, Folder, Flag, Clock } from 'lucide-react';
import { useStore } from '../core/store';
import type { InboxItem, Priority } from '../core/types';
import clsx from 'clsx';

interface ProcessItemModalProps {
    item: InboxItem;
    onClose: () => void;
}

export function ProcessItemModal({ item, onClose }: ProcessItemModalProps) {
    const { convertInboxToTask, convertInboxToNote, projects } = useStore();

    const [title, setTitle] = useState(item.text);
    const [type, setType] = useState<'task' | 'note'>('task');
    const [projectId, setProjectId] = useState<string>('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [dueDateStr, setDueDateStr] = useState('');
    const [dueTimeStr, setDueTimeStr] = useState('');
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

                if (dueTimeStr) {
                    const [hours, minutes] = dueTimeStr.split(':').map(Number);
                    properDate.setHours(hours, minutes, 0, 0); // Set seconds and milliseconds to 0
                } else {
                    properDate.setHours(9, 0, 0, 0); // Default to 9 AM
                }
                dueDate = properDate.getTime();
            }

            convertInboxToTask(item.id, {
                title,
                projectId: projectId || undefined,
                priority,
                dueDate
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

                            {/* Due Date & Time */}
                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                <div>
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
                                <div>
                                    <label className="block text-xs uppercase text-muted font-bold mb-2 flex items-center gap-2">
                                        <Clock size={12} /> Time
                                    </label>
                                    <input
                                        type="time"
                                        value={dueTimeStr}
                                        onChange={e => setDueTimeStr(e.target.value)}
                                        className="input w-full"
                                        disabled={!dueDateStr}
                                    />
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="col-span-2">
                                <label className="block text-xs uppercase text-muted font-bold mb-2 flex items-center gap-2">
                                    <Flag size={12} /> Priority
                                </label>
                                <div className="flex gap-2">
                                    {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPriority(p)}
                                            className={clsx(
                                                "flex-1 py-1.5 rounded-md border text-xs font-semibold uppercase tracking-wider transition-all",
                                                priority === p
                                                    ? (p === 'critical' || p === 'high') ? "bg-red-500/10 text-red-500 border-red-500/50" :
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
