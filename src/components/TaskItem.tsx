import { useState } from 'react';
import { useStore } from '../core/store';
import { CheckCircle2, Circle, AlertCircle, Calendar, Folder, Edit2 } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import type { Task } from '../core/types';
import { EditTaskModal } from './EditTaskModal';

interface TaskItemProps {
    task: Task;
    showProject?: boolean;
    compact?: boolean;
}

export function TaskItem({ task, showProject = true, compact = false }: TaskItemProps) {
    const { projects, toggleTaskStatus } = useStore();
    const [isEditing, setIsEditing] = useState(false);

    const project = task.projectId ? projects[task.projectId] : null;

    return (
        <>
            <li className={clsx(
                "group flex items-center gap-3 rounded-md bg-bg-card border border-transparent hover:border-border-subtle transition-all",
                compact ? "p-2 text-sm" : "p-3",
                task.status === 'done' && "opacity-50"
            )}>
                <button
                    onClick={() => toggleTaskStatus(task.id)}
                    className="text-muted hover:text-accent-primary transition-colors shrink-0"
                >
                    {task.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                        <Circle className="w-5 h-5" />
                    )}
                </button>

                <div className="flex-1 flex flex-col gap-0.5 cursor-pointer" onClick={() => setIsEditing(true)}>
                    <span className={clsx(
                        "text-sm font-medium",
                        task.status === 'done' && "line-through text-muted"
                    )}>
                        {task.title}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-muted">
                        {showProject && project && (
                            <span className="flex items-center gap-1 text-accent-primary">
                                <Folder size={10} /> {project.name}
                            </span>
                        )}
                        {task.dueDate && (
                            <span className={clsx("flex items-center gap-1", task.dueDate < Date.now() && task.status !== 'done' && "text-danger")}>
                                <Calendar size={10} /> {format(task.dueDate, 'MMM d')}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Hover actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mr-2">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1 text-muted hover:text-primary transition-colors"
                            title="Edit"
                        >
                            <Edit2 size={14} />
                        </button>
                    </div>

                    {task.priority === 1 && <AlertCircle className="w-4 h-4 text-danger" />}
                    <span className={clsx(
                        "text-xs border px-1.5 py-0.5 rounded font-mono",
                        task.priority === 1 ? "border-danger text-danger bg-danger/10" : "border-border-subtle text-muted"
                    )}>
                        P{task.priority}
                    </span>
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
