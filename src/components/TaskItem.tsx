import { useState } from 'react';
import { useStore } from '../core/store';
import { CheckCircle2, Circle, AlertCircle, Calendar, Folder, Lock, Edit2, Mail, Clock, Users } from 'lucide-react';
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
    const { projects, toggleTaskStatus, team, user } = useStore();
    const [isEditing, setIsEditing] = useState(false);

    const project = task.projectId ? projects[task.projectId] : null;

    // Avatar Logic
    const assigneeIds = task.assigneeIds || [];
    const members = assigneeIds.map(id => team[id]).filter(Boolean);
    const showAvatars = members.length > 0;

    // Waiting Logic
    const isOwner = user?.id === task.ownerId;
    const isWaiting = isOwner && task.status === 'backlog' && assigneeIds.length > 0 && !assigneeIds.includes(user?.id || '');

    // Shared Logic
    const isShared = task.visibility === 'team';

    return (
        <>
            <li className={clsx(
                "group flex items-center gap-4 rounded-xl border transition-all duration-300 relative overflow-hidden",
                compact ? "p-3 py-2.5" : "p-4",
                task.status === 'done'
                    ? "bg-bg-input/50 border-bg-input opacity-70"
                    : "bg-bg-card border-border-subtle hover:border-accent-primary/30 hover:shadow-md hover:shadow-accent-primary/5 hover:bg-bg-card-hover"
            )}>
                {/* Priority Indicator Stripe */}
                <div className={clsx(
                    "absolute left-0 top-0 bottom-0 w-[4px] transition-colors",
                    task.status === 'done' ? "bg-transparent" :
                        task.priority === 'critical' ? "bg-red-500" :
                            task.priority === 'high' ? "bg-orange-500" :
                                "bg-transparent"
                )} />

                <button
                    onClick={() => toggleTaskStatus(task.id)}
                    className={clsx(
                        "shrink-0 transition-all duration-300 rounded-full p-0.5",
                        task.status === 'done'
                            ? "text-success bg-success/10"
                            : "text-border-highlight hover:text-accent-primary hover:bg-accent-primary/10"
                    )}
                >
                    {task.status === 'done' ? (
                        <CheckCircle2 className="w-6 h-6" />
                    ) : (
                        <Circle className="w-6 h-6 stroke-2" />
                    )}
                </button>

                <div className="flex-1 flex flex-col gap-1 cursor-pointer min-w-0" onClick={() => setIsEditing(true)}>
                    <div className="flex items-center gap-2">
                        <span className={clsx(
                            "font-medium truncate transition-all",
                            compact ? "text-base" : "text-[15px]",
                            task.status === 'done' ? "line-through text-text-muted" : "text-text-primary group-hover:text-accent-primary"
                        )}>
                            {task.title}
                        </span>

                        {/* Waiting Badge */}
                        {isWaiting && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
                                <Clock size={10} /> Waiting
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-muted">
                        {showProject && project && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-input group-hover:bg-bg-card transition-colors border border-transparent group-hover:border-border-subtle">
                                <Folder size={12} className="text-accent-secondary" />
                                <span className="truncate max-w-[120px]">{project.name}</span>
                            </span>
                        )}

                        {task.dueDate && (
                            <span className={clsx(
                                "flex items-center gap-1.5",
                                task.dueDate < Date.now() && task.status !== 'done' ? "text-red-500 font-medium" : ""
                            )}>
                                <Calendar size={12} /> {format(task.dueDate, 'MMM d')}
                            </span>
                        )}

                        <div className="flex items-center gap-2 border-l border-border-subtle pl-2">
                            {/* Shared Badge (if no specific avatars shown, OR in addition? Let's show if shared and NOT private) */}
                            {/* Logic: 
                                1. If Avatars shown -> Implicitly shared.
                                2. If No Avatars but Shared -> Show Users Icon.
                                3. If Private -> Show Lock.
                            */}

                            {showAvatars ? (
                                <div className="flex -space-x-2">
                                    {members.slice(0, 3).map((member) => (
                                        <div key={member.id} className="w-5 h-5 rounded-full border border-bg-card relative z-10" title={member.name}>
                                            <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`} alt={member.name} className="w-full h-full rounded-full object-cover" />
                                        </div>
                                    ))}
                                    {members.length > 3 && (
                                        <div className="w-5 h-5 rounded-full bg-bg-input border border-bg-card flex items-center justify-center text-[8px] font-bold z-0">
                                            +{members.length - 3}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {isShared && (
                                        <div className="flex items-center gap-1 text-accent-secondary" title="Shared with Team">
                                            <Users size={14} />
                                        </div>
                                    )}
                                    {task.visibility === 'private' && <Lock size={12} />}
                                </>
                            )}


                            {task.source === 'email' && (
                                <div className="flex items-center gap-1 text-accent-primary animate-pulse-subtle bg-accent-primary/5 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    <Mail size={10} /> EMAIL
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                    {/* Stale Task Indicator */}
                    {task.status === 'in_progress' && task.updatedAt && (Date.now() - task.updatedAt > 259200000) && ( // 3 days
                        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-stone-100 text-stone-500 text-[10px] font-bold uppercase tracking-wider border border-stone-200" title="No activity for >3 days">
                            🕸️ Stale
                        </span>
                    )}

                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-primary/5 transition-colors"
                        title="Edit Task"
                    >
                        <Edit2 size={16} />
                    </button>

                    {task.priority === 'critical' && <AlertCircle className="w-5 h-5 text-red-500" />}

                    {['high', 'urgent'].includes(task.priority) && task.status !== 'done' && (
                        <span className="px-2 py-1 rounded-md bg-orange-500/10 text-orange-600 text-[10px] font-bold uppercase tracking-wider border border-orange-500/20">
                            {task.priority}
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
