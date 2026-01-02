import { useState } from 'react';
import { useStore } from '../core/store';
import { CheckCircle2, Circle, AlertCircle, Calendar, Folder } from 'lucide-react';
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
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 mr-2">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1 px-2 rounded-md bg-bg-app border border-border-subtle hover:border-violet-500 text-xs text-text-muted hover:text-violet-400 transition-all"
                        >
                            Edit
                        </button>
                    </div>

                    {task.priority === 'critical' && <AlertCircle className="w-4 h-4 text-red-500" />}

                    {task.priority !== 'medium' && task.priority !== 'low' && (
                        <span className={clsx(
                            "text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold",
                            task.priority === 'critical' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                task.priority === 'high' ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                                    "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        )}>
                            {task.priority === 'auto' ? 'AI' : task.priority}
                        </span>
                    )}
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
