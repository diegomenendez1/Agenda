import React, { useState, useMemo } from 'react';
import { useStore } from '../core/store';
import type { TaskStatus, Task } from '../core/types';
import { clsx } from 'clsx';
import { MoreHorizontal, Plus, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { EditTaskModal } from './EditTaskModal';

const COLUMNS: { id: TaskStatus; label: string }[] = [
    { id: 'backlog', label: 'Backlog' },
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' }
];

interface KanbanBoardProps {
    tasks?: Task[];
}

export function KanbanBoard({ tasks: propTasks }: KanbanBoardProps = {}) {
    const { tasks: storeTasks, updateStatus, addTask } = useStore();
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const tasksToUse = propTasks || Object.values(storeTasks);

    // Group tasks by status
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
        e.dataTransfer.effectAllowed = 'move';
        // Transparent drag image or default
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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'border-l-4 border-l-[var(--priority-critical)]';
            case 'high': return 'border-l-4 border-l-[var(--priority-high)]';
            case 'medium': return 'border-l-4 border-l-[var(--priority-medium)]';
            case 'low': return 'border-l-4 border-l-[var(--priority-low)]';
            default: return 'border-l-4 border-l-transparent';
        }
    };

    return (
        <div className="flex h-full gap-4 overflow-x-auto pb-4">
            {COLUMNS.map(col => (
                <div
                    key={col.id}
                    className="flex-shrink-0 w-80 flex flex-col gap-3"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-2 py-1">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                            {col.label}
                            <span className="bg-bg-card-hover text-text-secondary px-2 py-0.5 rounded-full text-xs">
                                {tasksByStatus[col.id].length}
                            </span>
                        </h3>
                        <button
                            onClick={() => addTask({ title: 'New Task', status: col.id, priority: 'medium' })}
                            className="p-1 hover:bg-bg-card-hover rounded text-text-muted hover:text-text-primary transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Drop Zone / List */}
                    <div className={clsx(
                        "flex-1 rounded-xl p-2 transition-colors overflow-y-auto min-h-[150px]",
                        "hover:bg-bg-card-hover/20"
                    )}>
                        <div className="flex flex-col gap-3">
                            {tasksByStatus[col.id].map(task => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task.id)}
                                    onClick={() => setEditingTask(task)}
                                    className={clsx(
                                        "glass-panel p-4 rounded-lg cursor-grab active:cursor-grabbing hover:translate-y-[-2px] transition-all",
                                        "shadow-sm hover:shadow-lg relative group",
                                        getPriorityColor(task.priority),
                                        task.status === 'done' && "opacity-60 grayscale"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-medium text-text-primary line-clamp-2">
                                            {task.title}
                                        </span>
                                        <button className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary p-1">
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>

                                    {/* Meta info */}
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center gap-2 text-text-muted">
                                            {task.dueDate && (
                                                <div className={clsx(
                                                    "flex items-center gap-1 text-xs",
                                                    task.dueDate < Date.now() ? "text-red-400" : ""
                                                )}>
                                                    <Calendar size={12} />
                                                    {format(task.dueDate, 'MMM d')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Avatar Placeholder or Priority Badge */}
                                        {task.assigneeId ? (
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 border border-white/10" />
                                        ) : task.priority === 'critical' ? (
                                            <AlertCircle size={14} className="text-[var(--priority-critical)]" />
                                        ) : null}
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
