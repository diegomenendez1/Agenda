import { useState } from 'react';
import { useStore } from '../../core/store';
import { CheckCircle2, Circle, Clock, MoreHorizontal, User } from 'lucide-react';
import clsx from 'clsx';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import type { Task } from '../../core/types';
import { EditTaskModal } from '../tasks/EditTaskModal';
import { SoftBadge } from '../../components/SoftBadge';

interface FocusCardProps {
    task: Task;
    onToggleStatus?: (taskId: string) => void;
}

export function FocusCard({ task, onToggleStatus }: FocusCardProps) {
    const { toggleTaskStatus: storeToggleTaskStatus, user, team } = useStore();
    const handleToggle = onToggleStatus || storeToggleTaskStatus;
    const [isEditing, setIsEditing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Date Logic
    const formatDueDate = (date: number) => {
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        return format(date, 'MMM d');
    };

    const isOverdue = task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && task.status !== 'done';

    // Assignee Logic
    const assigneeIds = task.assigneeIds || [];
    const members = assigneeIds.map(id => team[id]).filter(Boolean);

    return (
        <>
            <li
                className={clsx(
                    "group flex items-start gap-4 p-4 rounded-xl transition-all duration-300 border",
                    task.status === 'done'
                        ? "bg-bg-input/30 border-transparent opacity-60"
                        : "bg-bg-card border-border-subtle hover:border-border-highlight hover:shadow-sm"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Completion Toggle */}
                <button
                    onClick={() => handleToggle(task.id)}
                    className={clsx(
                        "mt-0.5 shrink-0 transition-all duration-200 rounded-full",
                        task.status === 'done'
                            ? "text-success"
                            : "text-border-highlight hover:text-accent-primary"
                    )}
                >
                    {task.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <Circle className="w-5 h-5" />
                    )}
                </button>

                {/* Content */}
                <div
                    className="flex-1 flex flex-col gap-1.5 min-w-0 cursor-pointer"
                    onClick={() => setIsEditing(true)}
                >
                    <div className="flex items-start justify-between gap-4">
                        <span className={clsx(
                            "text-[15px] font-medium leading-normal transition-colors",
                            task.status === 'done' ? "text-text-muted line-through" : "text-text-primary group-hover:text-accent-primary"
                        )}>
                            {task.title}
                        </span>

                        {/* Hover Actions (Edit/More) */}
                        <div className={clsx("transition-opacity duration-200", isHovered ? "opacity-100" : "opacity-0 lg:opacity-0")}>
                            <MoreHorizontal size={16} className="text-text-muted hover:text-text-primary" />
                        </div>
                    </div>

                    {/* Meta Row: Badges & Info - Only show what exists */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Priority Badge (only if important) */}
                        {['critical', 'high'].includes(task.priority) && task.status !== 'done' && (
                            <SoftBadge priority={task.priority} />
                        )}

                        {/* Due Date */}
                        {task.dueDate && (
                            <span className={clsx(
                                "flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md transition-colors",
                                isOverdue
                                    ? "text-red-600 bg-red-50"
                                    : "text-text-secondary bg-bg-input"
                            )}>
                                <Clock size={11} />
                                {formatDueDate(task.dueDate)}
                            </span>
                        )}

                        {/* Assignees */}
                        {members.length > 0 && (
                            <div className="flex items-center gap-1 ml-1" title={`Assigned to ${members.map(m => m.name).join(', ')}`}>
                                {members.slice(0, 2).map(m => (
                                    <img
                                        key={m.id}
                                        src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`}
                                        alt={m.name}
                                        className="w-4 h-4 rounded-full ring-1 ring-bg-card"
                                    />
                                ))}
                                {members.length > 2 && (
                                    <span className="text-[10px] text-text-muted">+{members.length - 2}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </li>

            {isEditing && (
                <EditTaskModal
                    task={task}
                    onClose={() => setIsEditing(false)}
                />
            )}
        </>
    );
}
