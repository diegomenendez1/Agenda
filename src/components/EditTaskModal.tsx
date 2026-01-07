import { useState, useEffect } from 'react';
import { X, Folder, Flag, Clock, Trash2, User } from 'lucide-react';
import { useStore } from '../core/store';
import type { Task, Priority } from '../core/types';
import clsx from 'clsx';
import { format } from 'date-fns';

interface EditTaskModalProps {
    task: Task;
    onClose: () => void;
}

export function EditTaskModal({ task, onClose }: EditTaskModalProps) {
    const { updateTask, projects, deleteTask, team, user } = useStore();

    const [title, setTitle] = useState(task.title);
    const [projectId, setProjectId] = useState<string>(task.projectId || '');
    const [priority, setPriority] = useState<Priority>(task.priority);
    const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds || []);

    // Initial date/time state setup
    const initialDate = task.dueDate ? new Date(task.dueDate) : null;
    const [dueDateStr, setDueDateStr] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : '');

    // Handle escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        let dueDate: number | undefined;
        if (dueDateStr) {
            const [year, month, day] = dueDateStr.split('-').map(Number);
            const properDate = new Date(year, month - 1, day);
            properDate.setHours(9, 0, 0, 0);
            dueDate = properDate.getTime();
        }

        updateTask(task.id, {
            title,
            projectId: projectId || undefined,
            priority,
            dueDate,
            assigneeIds
        });

        onClose();
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(task.id);
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-bg-card border border-border-subtle rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

                <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-bg-app/50">
                    <h2 className="font-display font-semibold text-lg text-text-primary">Edit Task</h2>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors p-2 rounded-lg"
                            title="Delete Task"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button onClick={onClose} className="text-text-muted hover:text-text-primary hover:bg-bg-input p-2 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSave} className="p-6 flex flex-col gap-6">

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

                            {assigneeIds.length === 0 && (
                                <p className="text-[11px] text-text-muted mt-2 flex items-center gap-1.5 opacity-80 bg-bg-input/50 p-2 rounded-md">
                                    <User size={12} />
                                    Private task. Select team members to share visibility.
                                </p>
                            )}
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

                    <div className="flex justify-end pt-5 border-t border-border-subtle mt-2">
                        <button type="submit" className="btn btn-primary px-8 py-2.5 text-sm shadow-lg shadow-accent-primary/20">
                            Save Changes
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
