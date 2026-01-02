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
    const { updateTask, projects, deleteTask, team } = useStore();

    const [title, setTitle] = useState(task.title);
    const [projectId, setProjectId] = useState<string>(task.projectId || '');
    const [priority, setPriority] = useState<Priority>(task.priority);
    const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId || '');

    // Initial date/time state setup
    const initialDate = task.dueDate ? new Date(task.dueDate) : null;
    const [dueDateStr, setDueDateStr] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : '');
    const [dueTimeStr, setDueTimeStr] = useState(initialDate ? format(initialDate, 'HH:mm') : '');

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

            if (dueTimeStr) {
                const [hours, minutes] = dueTimeStr.split(':').map(Number);
                properDate.setHours(hours, minutes, 0, 0);
            } else {
                properDate.setHours(9, 0, 0, 0);
            }
            dueDate = properDate.getTime();
        }

        updateTask(task.id, {
            title,
            projectId: projectId || undefined,
            priority,
            dueDate,
            assigneeId: assigneeId || undefined
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
            <div className="w-full max-w-lg bg-bg-card border border-border-subtle rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                    <h2 className="font-semibold text-lg">Edit Task</h2>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="text-muted hover:text-danger transition-colors p-1"
                            title="Delete Task"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button onClick={onClose} className="text-muted hover:text-primary p-1"><X size={20} /></button>
                    </div>
                </div>

                <form onSubmit={handleSave} className="p-6 flex flex-col gap-6">

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

                        {/* Assignee Selector - New Feature */}
                        <div className="col-span-2">
                            <label className="block text-xs uppercase text-muted font-bold mb-2 flex items-center gap-2">
                                <User size={12} /> Assignee
                            </label>
                            <select
                                value={assigneeId}
                                onChange={e => setAssigneeId(e.target.value)}
                                className="input w-full appearance-none"
                            >
                                <option value="">Unassigned</option>
                                {Object.values(team).map(member => (
                                    <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-text-muted mt-1.5 ml-1">
                                {assigneeId ? "Task will be visible to the team." : "Task remains private unless shared."}
                            </p>
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

                    <div className="flex justify-end pt-4 border-t border-border-subtle">
                        <button type="submit" className="btn btn-primary px-6 py-2.5 text-base">
                            Save Changes
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
