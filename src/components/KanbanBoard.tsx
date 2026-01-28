import React, { useState, useMemo } from 'react';
import { useStore } from '../core/store';
import type { TaskStatus, Task } from '../core/types';
import { clsx } from 'clsx';
import { MoreHorizontal, Calendar, CheckCircle2, Lock, Flag, Clock, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { EditTaskModal } from './EditTaskModal';

// Simplified columns - removed bgClass to reduce visual noise as requested
const COLUMNS: { id: TaskStatus; label: string; colorClass: string }[] = [
    { id: 'backlog', label: 'Backlog / Incoming', colorClass: 'bg-border-highlight' },
    { id: 'todo', label: 'To Do', colorClass: 'bg-border-highlight' },
    { id: 'in_progress', label: 'In Progress', colorClass: 'bg-border-highlight' },
    { id: 'review', label: 'Review', colorClass: 'bg-border-highlight' },
    { id: 'done', label: 'Done', colorClass: 'bg-border-highlight' }
];

interface KanbanBoardProps {
    tasks?: Task[];
}

export function KanbanBoard({ tasks: propTasks }: KanbanBoardProps = {}) {
    const { tasks: storeTasks, updateStatus, updateTask, user, team } = useStore();
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

    const getPriorityBorder = (priority: string) => {
        switch (priority) {
            case 'critical': return 'border-l-[3px] border-l-red-600 shadow-sm shadow-red-500/10';
            case 'high': return 'border-l-[3px] border-l-orange-500 shadow-sm shadow-orange-500/10';
            case 'medium': return 'border-l-[3px] border-l-yellow-500 shadow-sm shadow-yellow-500/10';
            case 'low': return 'border-l-[3px] border-l-blue-500 shadow-sm shadow-blue-500/10';
            default: return 'border-l-[3px] border-l-transparent';
        }
    };

    return (
        <div className="flex h-full gap-6 overflow-x-auto pb-4 px-2">
            {COLUMNS.map(col => (
                <div
                    key={col.id}
                    className="flex-shrink-0 flex-1 min-w-[300px] flex flex-col gap-3 group/column"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    {/* Column Header */}
                    <div className={clsx(
                        "flex items-center justify-between px-4 py-3 rounded-xl border border-border-subtle shadow-sm transition-all group-hover/column:shadow-md",
                        "bg-bg-card relative overflow-hidden"
                    )}>
                        <div className={clsx("absolute left-0 top-0 bottom-0 w-1.5", col.colorClass)} />

                        <div className="flex items-center gap-3 pl-2">
                            <div className="flex flex-col">
                                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                                    {col.label}
                                    {col.id === 'backlog' && <Lock size={12} className="text-text-muted" />}
                                </h3>
                                <span className="text-[10px] text-text-muted font-medium">
                                    {tasksByStatus[col.id].length} tasks
                                </span>
                            </div>
                        </div>

                        {col.id === 'done' && tasksByStatus.done.length > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('¿Eliminar todas las tareas en "Done"?')) {
                                        useStore.getState().clearCompletedTasks();
                                    }
                                }}
                                className="mr-2 p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all flex items-center gap-1 text-[10px] font-bold uppercase"
                                title="Clear Done Tasks"
                            >
                                <Trash2 size={12} />
                                <span className="hidden sm:inline">Clear</span>
                            </button>
                        )}
                    </div>

                    {/* Drop Zone / List */}
                    {/* Removed bgClass and added border-dashed for "sutiles lineas" effect if empty, or just subtle border container */}
                    <div className={clsx(
                        "flex-1 rounded-2xl p-2 transition-all min-h-[150px] overflow-y-auto",
                        "border border-border-subtle/40 bg-bg-app/50", // Very subtle container border instead of full background
                        "group-hover/column:border-border-subtle group-hover/column:bg-bg-input/10"
                    )}>
                        <div className="flex flex-col gap-3">
                            {tasksByStatus[col.id].map(task => {
                                // Strict ID comparison to avoid type mismatches
                                // Strict ID comparison to avoid type mismatches

                                // Debug log kept for verification
                                // console.log('DEBUG V2:', { taskId: task.id, assignees: task.assigneeIds, userId: user?.id, isAssigned: isAssignedToMe });

                                return (
                                    <div
                                        key={task.id}
                                        draggable={task.status !== 'backlog'}
                                        onDragStart={(e) => task.status !== 'backlog' && handleDragStart(e, task.id)}
                                        className={clsx(
                                            "p-4 rounded-xl transition-all duration-200 group relative cursor-pointer",
                                            "active:scale-[0.98]",
                                            "bg-bg-card border border-border-subtle shadow-sm hover:shadow-lg hover:shadow-accent-primary/5 opacity-100",
                                            getPriorityBorder(task.priority),
                                            task.status === 'done' && "opacity-50 grayscale-[0.8]",
                                            task.status === 'backlog' && "cursor-default",
                                        )}
                                        onClick={() => setEditingTask(task)}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col gap-1 pr-6 w-full">

                                                <span className="text-[14px] font-medium text-text-primary line-clamp-3 leading-snug">
                                                    {task.title}
                                                </span>
                                            </div>
                                            {task.ownerId === user?.id && (
                                                <button className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary p-1 -mt-1 -mr-1 transition-opacity">
                                                    <MoreHorizontal size={16} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Action for Backlog Items */}
                                        {task.status === 'backlog' && (
                                            <div className="flex flex-col gap-2 w-full mb-3">
                                                {task.acceptedAt ? (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="w-full py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-sm">
                                                            <CheckCircle2 size={14} />
                                                            Accepted by {team[task.acceptedBy || '']?.name?.split(' ')[0] || 'Team'}
                                                        </div>
                                                        {/* Only the owner or the person who accepted can "Start" it */}
                                                        {(task.ownerId === user?.id || task.acceptedBy === user?.id) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateStatus(task.id, 'todo');
                                                                }}
                                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-95"
                                                            >
                                                                <CheckCircle2 size={14} /> Start Task
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        {/* Not Accepted Yet: Show Accept to Assignees, Waiting to Owner */}
                                                        {task.assigneeIds?.includes(user?.id || '') ? (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        updateTask(task.id, { acceptedAt: Date.now(), acceptedBy: user?.id });
                                                                    }}
                                                                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                                                                >
                                                                    <CheckCircle2 size={14} /> Accept
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const newAssignees = (task.assigneeIds || []).filter(id => id !== user?.id);
                                                                        updateTask(task.id, { assigneeIds: newAssignees });
                                                                    }}
                                                                    className="px-3 py-2 bg-bg-input hover:bg-red-50 text-text-muted hover:text-red-500 border border-border-subtle hover:border-red-200 rounded-lg transition-colors"
                                                                    title="Reject"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : task.ownerId === user?.id ? (
                                                            (task.assigneeIds && task.assigneeIds.length > 0) ? (
                                                                <>
                                                                    <div className="w-full py-2 bg-bg-input border border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 cursor-default opacity-80">
                                                                        <Clock size={14} /> Waiting for Team
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            updateStatus(task.id, 'todo');
                                                                        }}
                                                                        className="w-full py-2 bg-bg-surface hover:bg-indigo-50 text-text-muted hover:text-indigo-600 border border-border-subtle hover:border-indigo-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2"
                                                                    >
                                                                        <CheckCircle2 size={14} /> Skip & Start
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        updateStatus(task.id, 'todo');
                                                                    }}
                                                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-95"
                                                                >
                                                                    <CheckCircle2 size={14} /> Start Task
                                                                </button>
                                                            )
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Meta info */}
                                        <div className="flex flex-col gap-2.5 pt-3 border-t border-border-subtle/40 mt-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {task.dueDate && (
                                                        <div className={clsx(
                                                            "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors",
                                                            task.dueDate < Date.now() && task.status !== 'done'
                                                                ? "bg-red-500/10 text-red-600 border-red-500/20"
                                                                : "bg-bg-input text-text-muted border-border-subtle"
                                                        )}>
                                                            <Calendar size={10} />
                                                            {format(task.dueDate, 'MMM d')}
                                                        </div>
                                                    )}
                                                    {task.acceptedAt && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/5 border border-emerald-500/20 text-[9px] text-emerald-600 font-bold uppercase tracking-wider">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                            Accepted {format(task.acceptedAt, 'MMM d, p')}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    {task.priority === 'critical' && (
                                                        <div className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/20 text-[9px] font-bold uppercase">Critical</div>
                                                    )}
                                                    {task.priority === 'high' && <Flag size={12} className="text-orange-500" />}
                                                    {task.priority === 'medium' && <Flag size={12} className="text-yellow-500" />}
                                                    {task.priority === 'low' && <Flag size={12} className="text-blue-500" />}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-3">
                                                {/* Assignees & Owner */}
                                                {(() => {
                                                    const uniqueIds = Array.from(new Set([task.ownerId, ...task.assigneeIds || []]));
                                                    const members = uniqueIds.map(id => team[id]).filter(Boolean);

                                                    if (members.length === 0) return <div />;

                                                    return (
                                                        <div className="flex items-center gap-2 overflow-hidden w-full">
                                                            <div className="flex -space-x-1.5 shrink-0">
                                                                {members.slice(0, 3).map((member) => {
                                                                    const colors = ['bg-pink-500', 'bg-violet-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-orange-500'];
                                                                    const colorClass = colors[member.name.length % colors.length];

                                                                    return (
                                                                        <div
                                                                            key={member.id}
                                                                            className={clsx(
                                                                                "w-5 h-5 rounded-full border-2 border-bg-card flex items-center justify-center text-[8px] font-bold text-white shadow-sm ring-1 ring-border-subtle/20",
                                                                                !member.avatar && colorClass
                                                                            )}
                                                                            title={member.name}
                                                                        >
                                                                            {member.avatar ? (
                                                                                <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                                                                            ) : (
                                                                                member.name.substring(0, 2).toUpperCase()
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                                {members.length > 3 && (
                                                                    <div className="w-5 h-5 rounded-full bg-bg-input border-2 border-bg-card flex items-center justify-center text-[8px] font-bold text-text-muted shadow-sm">
                                                                        +{members.length - 3}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <span className="text-[10px] text-text-muted truncate opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">
                                                                {members.map(m => m.name?.split(' ')[0]).join(', ')}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Empty State placeholder if needed, acts as "lineas" visual aid */}
                            {tasksByStatus[col.id].length === 0 && (
                                <div className="h-full border-2 border-dashed border-border-subtle/30 rounded-xl flex items-center justify-center opacity-50">
                                    <div className="w-full h-full min-h-[100px]" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))
            }

            {
                editingTask && (
                    <EditTaskModal
                        task={editingTask}
                        onClose={() => {
                            setEditingTask(null);
                        }}
                    />
                )
            }
        </div >
    );
}
