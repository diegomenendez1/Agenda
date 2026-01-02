import { useState } from 'react';
import { useStore } from '../core/store';
import { Users, MoreHorizontal, Plus, UserCircle2 } from 'lucide-react';
import type { TaskStatus, EntityId } from '../core/types';
import clsx from 'clsx';
import { format } from 'date-fns';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'todo', label: 'To Do', color: 'bg-zinc-500' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
    { id: 'review', label: 'Review', color: 'bg-amber-500' },
    { id: 'done', label: 'Done', color: 'bg-emerald-500' },
];

export function TeamBoardView() {
    const { tasks, team, updateTask } = useStore();
    const [draggingId, setDraggingId] = useState<EntityId | null>(null);

    const taskList = Object.values(tasks);

    const getTasksByStatus = (status: TaskStatus) => {
        return taskList.filter(t => t.status === status);
    };

    const handleDragStart = (e: React.DragEvent, id: EntityId) => {
        setDraggingId(id);
        e.dataTransfer.setData('text/plain', id);
        // Visual effect
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
            updateTask(id, { status });
        }
        setDraggingId(null);
    };

    return (
        <div className="flex flex-col h-full bg-bg-app overflow-hidden">
            <header className="px-8 py-6 border-b border-border-subtle flex justify-between items-center bg-bg-app/50 backdrop-blur-sm z-10">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Users className="w-6 h-6 text-violet-500" />
                        Team Board
                    </h1>
                    <p className="text-text-muted text-sm mt-1">
                        Track project velocity and team assignments.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted mr-2">Team Members:</span>
                    <div className="flex -space-x-2">
                        {Object.values(team).map(member => (
                            <img
                                key={member.id}
                                src={member.avatar}
                                alt={member.name}
                                title={member.name}
                                className="w-8 h-8 rounded-full border-2 border-bg-app hover:scale-110 transition-transform cursor-pointer"
                            />
                        ))}
                        <button className="w-8 h-8 rounded-full bg-bg-card border border-dashed border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:border-violet-500 transition-colors">
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="h-full flex px-8 py-8 gap-6 min-w-max">
                    {COLUMNS.map(col => (
                        <div
                            key={col.id}
                            className="w-80 flex flex-col h-full rounded-xl bg-bg-sidebar/50 border border-border-subtle/50"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            {/* Column Header */}
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={clsx("w-2 h-2 rounded-full", col.color)} />
                                    <h3 className="font-semibold text-sm text-text-primary">{col.label}</h3>
                                    <span className="text-xs text-text-muted px-2 py-0.5 bg-bg-card rounded-full">{getTasksByStatus(col.id).length}</span>
                                </div>
                                <button className="text-text-muted hover:text-text-primary">
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/* Column Content */}
                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                                {getTasksByStatus(col.id).map(task => (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        className={clsx(
                                            "p-4 rounded-lg bg-bg-card border border-border-subtle cursor-grab active:cursor-grabbing hover:border-violet-500/50 hover:shadow-lg transition-all group",
                                            draggingId === task.id ? "opacity-50 rotate-3 scale-95" : "opacity-100"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={clsx(
                                                "text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider",
                                                task.priority === 'critical' || task.priority === 'high' ? "bg-red-500/10 text-red-400" :
                                                    task.priority === 'medium' ? "bg-amber-500/10 text-amber-400" :
                                                        "bg-slate-500/10 text-slate-400"
                                            )}>
                                                {task.priority || 'Normal'}
                                            </span>
                                            <button className="text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </div>

                                        <h4 className="text-sm font-medium text-text-primary mb-1">{task.title}</h4>
                                        <p className="text-xs text-text-muted line-clamp-2 mb-3">{task.description}</p>

                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-subtle/50">
                                            <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                                {task.assigneeId && team[task.assigneeId] ? (
                                                    <img src={team[task.assigneeId].avatar} className="w-5 h-5 rounded-full" alt="assignee" />
                                                ) : (
                                                    <UserCircle2 size={16} className="text-text-muted" />
                                                )}
                                                <span>{task.dueDate ? format(task.dueDate, 'MMM d') : 'No date'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
