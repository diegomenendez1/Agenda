import { useMemo } from 'react';
import { useStore } from '../../core/store';
import type { Task, TaskStatus } from '../../core/types';
import { Check, Calendar, Flag } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

const StatusBadge = ({ status }: { status: TaskStatus }) => {
    const colors = {
        backlog: 'bg-slate-100 text-slate-500',
        todo: 'bg-blue-50 text-blue-600',
        in_progress: 'bg-amber-50 text-amber-600',
        review: 'bg-purple-50 text-purple-600',
        done: 'bg-emerald-50 text-emerald-600',
        snoozed: 'bg-slate-100 text-slate-400'
    };
    return (
        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', colors[status])}>
            {status.replace('_', ' ')}
        </span>
    );
};

const PriorityIcon = ({ priority }: { priority: Task['priority'] }) => {
    if (priority === 'critical') return <Flag className="w-4 h-4 text-red-500 fill-red-500" />;
    if (priority === 'high') return <Flag className="w-4 h-4 text-orange-500" />;
    if (priority === 'medium') return <Flag className="w-4 h-4 text-blue-400" />;
    return <Flag className="w-4 h-4 text-slate-300" />;
};

export const TaskBoard = () => {
    const { tasks, toggleTaskStatus } = useStore();

    // Sort: Critical first, then by date
    const sortedTasks = useMemo(() => {
        return Object.values(tasks).sort((a, b) => {
            if (a.completedAt && !b.completedAt) return 1;
            if (!a.completedAt && b.completedAt) return -1;

            const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1, auto: 0 };
            const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
            if (pDiff !== 0) return pDiff;

            return (a.dueDate || 0) - (b.dueDate || 0);
        });
    }, [tasks]);

    return (
        <div className="w-full h-full overflow-y-auto px-6 py-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-light text-slate-900 tracking-tight">My Tasks</h1>
                    <p className="text-slate-500 mt-1">Focus on what matters most today.</p>
                </div>
                <button className="btn-primary">
                    + New Task
                </button>
            </header>

            <div className="flex flex-col gap-4">
                {sortedTasks.map(task => (
                    <div
                        key={task.id}
                        className={clsx(
                            "group flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-xl shadow-sm hover:shadow-md transition-all duration-200",
                            task.status === 'done' && "opacity-50"
                        )}
                    >
                        <button
                            onClick={() => toggleTaskStatus(task.id)}
                            className={clsx(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                task.status === 'done'
                                    ? "bg-emerald-500 border-emerald-500"
                                    : "border-slate-300 hover:border-indigo-500"
                            )}
                        >
                            {task.status === 'done' && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                            <h3 className={clsx(
                                "text-base font-medium text-slate-200 truncate",
                                task.status === 'done' && "line-through text-slate-500"
                            )}>
                                {task.title}
                            </h3>
                            {task.description && (
                                <p className="text-sm text-slate-400 truncate mt-1">{task.description}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-400">
                            {task.dueDate && (
                                <span className={clsx("flex items-center gap-1", task.dueDate < Date.now() && "text-amber-600")}>
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(task.dueDate), 'MMM d')}
                                </span>
                            )}



                            <StatusBadge status={task.status} />
                            <PriorityIcon priority={task.priority} />
                        </div>
                    </div>
                ))}

                {sortedTasks.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <p>No tasks yet. Enjoy your day!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
