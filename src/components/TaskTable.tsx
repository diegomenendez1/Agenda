import { useState } from 'react';
import { useStore } from '../core/store';
import { format } from 'date-fns';
import {
    CheckCircle2, Circle, AlertCircle, Calendar,
    ArrowUp, MoreHorizontal, Clock, Lock, Users
} from 'lucide-react';
import clsx from 'clsx';
import type { Task, EntityId } from '../core/types';
import { EditTaskModal } from './EditTaskModal';

interface TaskTableProps {
    tasks: Task[];
    onToggleStatus?: (taskId: EntityId) => void;
}

export function TaskTable({ tasks, onToggleStatus }: TaskTableProps) {
    const { toggleTaskStatus: storeToggleTaskStatus, team, user } = useStore();
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const handleToggle = onToggleStatus || storeToggleTaskStatus;

    // Simple column headers definition
    const columns = [
        { key: 'status', label: '', width: 'w-10' },
        { key: 'title', label: 'Task Name', width: 'w-1/3' },
        { key: 'assignees', label: 'Assignees', width: 'w-32' },
        { key: 'priority', label: 'Priority', width: 'w-24' },
        { key: 'dueDate', label: 'Due Date', width: 'w-32' },
        { key: 'actions', label: '', width: 'w-10' },
    ];

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-text-muted border-2 border-dashed border-border-subtle rounded-xl bg-bg-card/30">
                <CheckCircle2 size={48} className="mb-4 opacity-20" />
                <p>No tasks match your filters.</p>
            </div>
        );
    }

    return (
        <>
            <div className="w-full overflow-hidden border border-border-subtle rounded-xl bg-bg-card shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-bg-input/50 text-xs font-bold text-text-muted uppercase tracking-wider border-b border-border-subtle">
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={clsx("p-3 select-none", col.width)}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {tasks.map((task) => {
                                const isDone = task.status === 'done';
                                const assigneeIds = task.assigneeIds || [];
                                const members = assigneeIds.map(id => team[id]).filter(Boolean);
                                const isShared = task.visibility === 'team';

                                return (
                                    <tr
                                        key={task.id}
                                        onClick={() => setEditingTask(task)}
                                        className={clsx(
                                            "group hover:bg-bg-input/50 transition-colors cursor-pointer text-sm",
                                            isDone && "bg-bg-app/50 opacity-60"
                                        )}
                                    >
                                        {/* Status Checkbox */}
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggle(task.id);
                                                }}
                                                className={clsx(
                                                    "transition-colors rounded-full p-1",
                                                    isDone
                                                        ? "text-success hover:bg-success/10"
                                                        : "text-border-highlight hover:text-accent-primary hover:bg-accent-primary/10"
                                                )}
                                            >
                                                {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                            </button>
                                        </td>

                                        {/* Title */}
                                        <td className="p-3">
                                            <div className="flex flex-col gap-0.5 max-w-md">
                                                <span className={clsx(
                                                    "font-medium truncate",
                                                    isDone ? "line-through text-text-muted" : "text-text-primary"
                                                )}>
                                                    {task.title}
                                                </span>
                                                {(task.status === 'backlog' && !isDone) && (
                                                    <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                                                        <Clock size={10} /> Backlog
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Assignees */}
                                        <td className="p-3">
                                            <div className="flex -space-x-2">
                                                {members.length > 0 ? (
                                                    members.slice(0, 3).map((member) => (
                                                        <div key={member.id} className="w-6 h-6 rounded-full border border-bg-card relative z-10" title={member.name}>
                                                            <img
                                                                src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`}
                                                                alt={member.name}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-text-muted opacity-50 pl-1">
                                                        {task.visibility === 'private' ? <Lock size={14} /> : <Users size={14} />}
                                                    </div>
                                                )}
                                                {members.length > 3 && (
                                                    <div className="w-6 h-6 rounded-full bg-bg-input border border-bg-card flex items-center justify-center text-[9px] font-bold z-0">
                                                        +{members.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Priority */}
                                        <td className="p-3">
                                            <div className="flex items-center">
                                                {task.priority === 'critical' ? (
                                                    <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 text-[10px] font-bold uppercase border border-red-500/20 flex items-center gap-1">
                                                        <AlertCircle size={10} /> Critical
                                                    </span>
                                                ) : task.priority === 'high' ? (
                                                    <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 text-[10px] font-bold uppercase border border-orange-500/20">
                                                        High
                                                    </span>
                                                ) : task.priority === 'medium' ? (
                                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase border border-blue-500/20">
                                                        Medium
                                                    </span>
                                                ) : (
                                                    <span className="text-text-muted text-xs opacity-60">Low</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Due Date */}
                                        <td className="p-3">
                                            {task.dueDate ? (
                                                <div className={clsx(
                                                    "flex items-center gap-1.5 text-xs font-medium",
                                                    task.dueDate < Date.now() && !isDone
                                                        ? "text-red-600"
                                                        : "text-text-muted"
                                                )}>
                                                    <Calendar size={12} />
                                                    {format(task.dueDate, 'MMM d')}
                                                </div>
                                            ) : (
                                                <span className="text-text-muted/30 text-xs">-</span>
                                            )}
                                        </td>

                                        {/* Edit Action */}
                                        <td className="p-3 text-right">
                                            <button
                                                className="p-1 text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Edit Details"
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingTask && (
                <EditTaskModal
                    task={editingTask}
                    onClose={() => setEditingTask(null)}
                />
            )}
        </>
    );
}
