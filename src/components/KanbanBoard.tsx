import React, { useState, useMemo } from 'react';
import { useStore } from '../core/store';
import type { TaskStatus, Task } from '../core/types';
import { clsx } from 'clsx';
import { MoreHorizontal, Plus, Calendar, AlertCircle, CheckCircle2, Lock, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { EditTaskModal } from './EditTaskModal';

// Simplified columns - removed bgClass to reduce visual noise as requested
const COLUMNS: { id: TaskStatus; label: string; colorClass: string }[] = [
    { id: 'backlog', label: 'Backlog / Incoming', colorClass: 'bg-slate-300' },
    { id: 'todo', label: 'To Do', colorClass: 'bg-slate-300' },
    { id: 'in_progress', label: 'In Progress', colorClass: 'bg-slate-300' },
    { id: 'review', label: 'Review', colorClass: 'bg-slate-300' },
    { id: 'done', label: 'Done', colorClass: 'bg-slate-300' }
];

interface KanbanBoardProps {
    tasks?: Task[];
}

export function KanbanBoard({ tasks: propTasks }: KanbanBoardProps = {}) {
    const { tasks: storeTasks, updateStatus, addTask } = useStore();
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const tasksToUse = propTasks || Object.values(storeTasks);

    // Group tasks by status and sort by priority
    const tasksByStatus = useMemo(() => {
        const groups: Record<TaskStatus, Task[]> = {
            backlog: [],
            todo: [],
            in_progress: [],
            review: [],
            done: []
        };

        const priorityScore: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

        tasksToUse.forEach(task => {
            if (groups[task.status]) {
                groups[task.status].push(task);
            }
        });

        // Sort each group by priority
        Object.keys(groups).forEach(status => {
            groups[status as TaskStatus].sort((a, b) => {
                const pA = priorityScore[a.priority] || 0;
                const pB = priorityScore[b.priority] || 0;
                if (pA !== pB) return pB - pA;
                return (b.createdAt || 0) - (a.createdAt || 0); // Newest first if same priority
            });
        });

        return groups;
    }, [tasksToUse]);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        if (draggedTaskId) {
            await updateStatus(draggedTaskId, status);
            setDraggedTaskId(null);
        }
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
                    className="flex-shrink-0 w-80 flex flex-col gap-3 group/column"
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
                        <button
                            onClick={() => addTask({ title: 'New Task', status: col.id, priority: 'medium' })}
                            className="w-8 h-8 flex items-center justify-center hover:bg-bg-input rounded-full text-text-muted hover:text-accent-primary transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Drop Zone / List */}
                    {/* Removed bgClass and added border-dashed for "sutiles lineas" effect if empty, or just subtle border container */}
                    <div className={clsx(
                        "flex-1 rounded-2xl p-2 transition-all min-h-[150px]",
                        "border border-border-subtle/40 bg-bg-app/50", // Very subtle container border instead of full background
                        "group-hover/column:border-border-subtle group-hover/column:bg-bg-input/10"
                    )}>
                        <div className="flex flex-col gap-3 h-full">
                            {tasksByStatus[col.id].map(task => (
                                <div
                                    key={task.id}
                                    draggable={task.status !== 'backlog'}
                                    onDragStart={(e) => task.status !== 'backlog' && handleDragStart(e, task.id)}
                                    onClick={() => setEditingTask(task)}
                                    className={clsx(
                                        "glass-panel p-4 rounded-xl cursor-grab active:cursor-grabbing hover:-translate-y-1 transition-all duration-200",
                                        "shadow-sm hover:shadow-lg hover:shadow-accent-primary/5 active:scale-[0.98]",
                                        "border border-border-subtle hover:border-accent-primary/30 group relative bg-bg-card",
                                        getPriorityBorder(task.priority),
                                        task.status === 'done' && "opacity-60 grayscale-[0.5]",
                                        task.status === 'backlog' && "cursor-default"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[14px] font-medium text-text-primary line-clamp-3 leading-snug">
                                            {task.title}
                                        </span>
                                        <button className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary p-1 -mt-1 -mr-1 transition-opacity">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>

                                    {/* Action for Backlog Items */}
                                    {task.status === 'backlog' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingTask(task);
                                                setIsProcessing(true);
                                            }}
                                            className="w-full mb-3 py-2 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 hover:from-accent-primary hover:to-accent-secondary border border-accent-primary/20 hover:border-transparent text-accent-primary hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <CheckCircle2 size={14} /> Accept & Process
                                        </button>
                                    )}

                                    {/* Meta info */}
                                    <div className="flex items-center justify-between pt-2 border-t border-border-subtle/40">
                                        <div className="flex items-center gap-2 text-text-muted">
                                            {task.dueDate && (
                                                <div className={clsx(
                                                    "flex items-center gap-1.5 text-[11px] font-medium",
                                                    task.dueDate < Date.now() ? "text-red-500" : ""
                                                )}>
                                                    <Calendar size={12} />
                                                    {format(task.dueDate, 'MMM d')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Avatar Placeholder or Priority Badge */}
                                        <div className="flex items-center gap-2">
                                            {task.priority === 'critical' && <AlertCircle size={14} className="text-red-600" />}
                                            {task.priority === 'high' && <Flag size={14} className="text-orange-500" />}
                                            {task.priority === 'medium' && <Flag size={14} className="text-yellow-500" />}
                                            {task.priority === 'low' && <Flag size={14} className="text-blue-500" />}

                                            {task.assigneeIds && task.assigneeIds.length > 0 && (
                                                <div className="flex -space-x-1.5">
                                                    {task.assigneeIds.map(id => (
                                                        <div key={id} className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 border-2 border-bg-card shadow-sm" title="Assigned" />
                                                    )).slice(0, 3)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Empty State placeholder if needed, acts as "lineas" visual aid */}
                            {tasksByStatus[col.id].length === 0 && (
                                <div className="h-full border-2 border-dashed border-border-subtle/30 rounded-xl flex items-center justify-center opacity-50">
                                    <div className="w-full h-full min-h-[100px]" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {editingTask && (
                <EditTaskModal
                    task={editingTask}
                    isProcessing={isProcessing}
                    onClose={() => {
                        setEditingTask(null);
                        setIsProcessing(false);
                    }}
                />
            )}
        </div>
    );
}
