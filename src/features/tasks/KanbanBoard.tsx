import React, { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import type { TaskStatus, Task } from '../../core/types';
import { clsx } from 'clsx';
import { MoreHorizontal, Calendar, CheckCircle2, Lock, Flag, Clock, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { EditTaskModal } from './EditTaskModal';

import { useTranslation } from '../../core/i18n';

// Simplified columns - removed bgClass to reduce visual noise as requested
// MOVED INSIDE COMPONENT FOR TRANSLATION

interface KanbanBoardProps {
    tasks?: Task[];
}

export function KanbanBoard({ tasks: propTasks }: KanbanBoardProps = {}) {
    const { tasks: storeTasks, updateStatus, updateTask, user, team } = useStore();
    const { t } = useTranslation();
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const tasksToUse = propTasks || Object.values(storeTasks);

    // Group tasks by status (preserves incoming sort order)
    const tasksByStatus = useMemo(() => {
        const groups: Record<TaskStatus, Task[]> = {
            backlog: [],
            todo: [],
            in_progress: [],
            review: [],
            done: []
        };

        tasksToUse.forEach(task => {
            if (groups[task.status]) {
                groups[task.status].push(task);
            }
        });

        return groups;


    }, [tasksToUse]);

    const COLUMNS: { id: TaskStatus; label: string; colorClass: string }[] = [
        { id: 'backlog', label: t.status.backlog, colorClass: 'bg-neutral-400' },
        { id: 'todo', label: t.status.todo, colorClass: 'bg-blue-500' },
        { id: 'in_progress', label: t.status.in_progress, colorClass: 'bg-indigo-500' },
        { id: 'review', label: t.status.review, colorClass: 'bg-purple-500' },
        { id: 'done', label: t.status.done, colorClass: 'bg-emerald-500' }
    ];

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');

        if (taskId) {
            await updateStatus(taskId, status);
        } else if (draggedTaskId) {
            // Fallback to state if dataTransfer is empty (some browsers/conditions)
            await updateStatus(draggedTaskId, status);
        }
        setDraggedTaskId(null);
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'critical':
                return (
                    <div className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Flag size={10} className="fill-current" /> Critical
                    </div>
                );
            case 'high':
                return (
                    <div className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Flag size={10} className="fill-current" /> High
                    </div>
                );
            case 'medium':
                return <div className="px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] font-bold uppercase tracking-wider">Medium</div>;
            case 'low':
                return <div className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">Low</div>;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-full gap-4 pb-4 px-2 flex-col overflow-y-auto lg:flex-row lg:overflow-x-auto lg:overflow-y-hidden snap-x snap-mandatory lg:snap-none">
            {COLUMNS.map(col => (
                <div
                    key={col.id}
                    className="flex-shrink-0 flex-1 w-full lg:min-w-[260px] lg:max-w-[450px] flex flex-col gap-4 group/column snap-center"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    {/* Column Header */}
                    <div className={clsx(
                        "flex items-center justify-between px-5 py-4 rounded-xl border border-border-subtle/60 shadow-sm transition-all group-hover/column:shadow-md group-hover/column:border-border-highlight",
                        "bg-bg-card relative overflow-hidden"
                    )}>
                        <div className={clsx("absolute top-0 left-0 w-full h-1 opacity-80", col.colorClass)} />

                        <div className="flex items-center gap-3">
                            <div className={clsx("w-2 h-2 rounded-full", col.colorClass)} />
                            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                                {col.label}
                                {col.id === 'backlog' && <Lock size={12} className="text-text-muted" />}
                            </h3>
                            <span className="text-[10px] bg-bg-input px-2 py-0.5 rounded-full text-text-muted font-bold border border-border-subtle">
                                {tasksByStatus[col.id].length}
                            </span>
                        </div>

                        {col.id === 'done' && tasksByStatus.done.length > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('¿Eliminar todas las tareas en "Done"?')) {
                                        useStore.getState().clearCompletedTasks();
                                    }
                                }}
                                className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all"
                                title="Clear Done Tasks"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                    {/* Drop Zone / List */}
                    <div className={clsx(
                        "flex-1 rounded-2xl p-3 transition-all min-h-[100px] text-sm",
                        "bg-bg-input/30 border border-transparent",
                        "group-hover/column:bg-bg-input/50 group-hover/column:border-border-subtle/30"
                    )}>
                        <div className="flex flex-col gap-3 h-full overflow-y-auto custom-scrollbar pr-1">
                            {tasksByStatus[col.id].map(task => (
                                <div
                                    key={task.id}
                                    draggable={task.status !== 'backlog'}
                                    onDragStart={(e) => task.status !== 'backlog' && handleDragStart(e, task.id)}
                                    className={clsx(
                                        "p-4 rounded-xl transition-all duration-200 group relative cursor-pointer border",
                                        "bg-bg-card hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5",
                                        "border-border-subtle shadow-sm",
                                        task.status === 'done' && "opacity-60 saturate-50 hover:opacity-100 transition-opacity",
                                        task.status === 'backlog' && "cursor-default border-dashed"
                                    )}
                                    onClick={() => setEditingTask(task)}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <h4 className={clsx(
                                            "text-sm font-semibold text-text-primary leading-snug line-clamp-2",
                                            task.status === 'done' && "line-through text-text-muted"
                                        )}>
                                            {task.title}
                                        </h4>
                                        {task.ownerId === user?.id && (
                                            <button className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary transition-opacity p-1">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Action for Backlog/Tasks */}
                                    <div className="mb-3">
                                        {task.status === 'backlog' && (
                                            <div className="flex flex-col gap-2 mt-2">
                                                {task.acceptedAt ? (
                                                    (task.ownerId === user?.id || task.acceptedBy === user?.id) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateStatus(task.id, 'todo');
                                                            }}
                                                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm"
                                                        >
                                                            Start
                                                        </button>
                                                    )
                                                ) : task.assigneeIds?.includes(user?.id || '') ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateTask(task.id, { acceptedAt: Date.now(), acceptedBy: user?.id });
                                                            }}
                                                            className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newAssignees = (task.assigneeIds || []).filter(id => id !== user?.id);
                                                                updateTask(task.id, { assigneeIds: newAssignees });
                                                            }}
                                                            className="px-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-200"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-subtle/50">
                                        <div className="flex items-center gap-2">
                                            {getPriorityBadge(task.priority)}
                                            {task.dueDate && (
                                                <div className={clsx(
                                                    "flex items-center gap-1 text-[10px] font-medium",
                                                    task.dueDate < Date.now() && task.status !== 'done' ? "text-red-500" : "text-text-muted"
                                                )}>
                                                    <Calendar size={10} />
                                                    {format(task.dueDate, 'MMM d')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Assignees Avatars */}
                                        <div className="flex -space-x-1.5">
                                            {Array.from(new Set([task.ownerId, ...task.assigneeIds || []]))
                                                .map(id => team[id])
                                                .filter(Boolean)
                                                .slice(0, 3)
                                                .map(member => (
                                                    <div
                                                        key={member.id}
                                                        className="w-5 h-5 rounded-full border border-bg-card bg-violet-100 flex items-center justify-center text-[8px] font-bold text-violet-700"
                                                        title={member.name}
                                                    >
                                                        {member.avatar ? (
                                                            <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                                        ) : member.name.charAt(0)}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}

            {editingTask && (
                <EditTaskModal
                    task={editingTask}
                    onClose={() => setEditingTask(null)}
                />
            )}
        </div>
    );
}
