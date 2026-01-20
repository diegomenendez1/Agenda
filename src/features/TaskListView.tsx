import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../core/store';
import { CheckCircle2, Calendar, ClipboardList, LayoutList, KanbanSquare, Trash2, Plus, X } from 'lucide-react';
import { TaskItem } from '../components/TaskItem';
import { KanbanBoard } from '../components/KanbanBoard';
import { EditTaskModal } from '../components/EditTaskModal';

import { AvatarMemberFilter } from '../components/AvatarMemberFilter';
import { isSameDay, isFuture } from 'date-fns';
import { useSearchParams, useParams } from 'react-router-dom';
import clsx from 'clsx';
import type { EntityId } from '../core/types';

export function TaskListView() {
    const { tasks, user, updateUserProfile, clearCompletedTasks, team } = useStore();
    const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');

    const [selectedMemberId, setSelectedMemberId] = useState<EntityId | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const { taskId: pathTaskId } = useParams();
    const [editingTask, setEditingTask] = useState<any>(null);

    // Deep Linking to Task
    useEffect(() => {
        const taskId = searchParams.get('taskId') || pathTaskId;
        if (taskId && tasks[taskId]) {
            setEditingTask(tasks[taskId]);
        }
    }, [searchParams, pathTaskId, tasks]);

    // Persistent View Mode
    const viewMode = user?.preferences?.taskViewMode || 'list';

    const handleSetViewMode = (mode: 'list' | 'board') => {
        if (!user) return;
        updateUserProfile({
            ...user,
            preferences: {
                ...user.preferences,
                taskViewMode: mode
            }
        });
    };

    const filteredTasks = useMemo(() => {
        if (!user) return [];

        const priorityScore: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const allTasks = Object.values(tasks).sort((a, b) => {
            // Sort by status (Done at bottom), then Priority, then Creation
            if (a.status !== b.status) return a.status === 'done' ? 1 : -1;

            const pA = priorityScore[a.priority] || 0;
            const pB = priorityScore[b.priority] || 0;

            if (pA !== pB) return pB - pA;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });

        const today = new Date();

        return allTasks.filter(task => {
            const isAssignee = task.assigneeIds?.includes(user.id);
            const isShared = task.visibility === 'team';
            const isOwner = task.ownerId === user.id;
            const isAdmin = user.role === 'owner' || user.role === 'head';

            // View Rules:
            // 1. Owner/Admin roles see everything
            // 2. Creator always sees their tasks
            // 3. Assignees see shared tasks

            if (isShared) {
                // Team tasks: Creator, Assignees, and Admins/Owners
                if (!isAdmin && !isAssignee && !isOwner) return false;
            } else {
                // Private: ONLY the owner. Strict privacy as requested.
                if (!isOwner) return false;
            }



            // Member Filter (Talent Filter)
            if (selectedMemberId) {
                // Determine if selected member is involved
                const isMemberAssigned = task.assigneeIds?.includes(selectedMemberId);
                const isMemberOwner = task.ownerId === selectedMemberId;

                // If I'm filtering by "Person X", I expect to see tasks assigned to them
                // OR tasks they own (if shared with me or if I'm head).
                if (!isMemberAssigned && !isMemberOwner) return false;
            }

            if (filter === 'all') return true;

            // FIX: Handle "No Date" tasks.
            // In 'today', strict match. In 'upcoming', include future dates OR no date (Someday).

            if (filter === 'today') {
                if (!task.dueDate) return false;
                return isSameDay(new Date(task.dueDate), today);
            }

            if (filter === 'upcoming') {
                if (!task.dueDate) return true; // Include "No Date" in Upcoming/Backlog bucket
                const taskDate = new Date(task.dueDate);
                return isFuture(taskDate) && !isSameDay(taskDate, today);
            }

            return true;
        });
    }, [tasks, filter, user, selectedMemberId]);

    return (
        <div className={clsx(
            "flex flex-col h-full bg-bg-app overflow-hidden px-6 pt-6 pb-2 md:px-8 md:pt-8 md:pb-2 transition-all duration-300"
        )}>
            {/* Header Section */}
            <header className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 animate-enter relative z-20">
                <div>
                    <h1 className="text-4xl font-display font-extrabold flex items-center gap-3 tracking-tight text-text-primary mb-2">
                        My Tasks
                    </h1>
                    <p className="text-text-muted text-lg font-light">Manage your personal tasks and assignments.</p>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    {/* Primary Action */}
                    {viewMode === 'list' && (
                        <button
                            className="group relative overflow-hidden bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-violet-500/25 transition-all active:scale-95 flex items-center gap-2.5"
                            onClick={async () => {
                                const { addTask } = useStore.getState();
                                const newId = await addTask({
                                    title: '',
                                    status: 'todo',
                                    priority: 'medium',
                                    visibility: 'private'
                                });
                                setTimeout(() => {
                                    const newTask = useStore.getState().tasks[newId];
                                    if (newTask) setEditingTask(newTask);
                                }, 50);
                            }}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <Plus size={20} strokeWidth={2.5} />
                            <span className="relative">New Task</span>
                        </button>
                    )}

                    {/* Unified Filter Bar */}
                    <div className="flex items-center gap-1 p-1.5 bg-bg-surface/60 backdrop-blur-md border border-border-subtle rounded-2xl shadow-sm overflow-x-auto max-w-full">
                        {/* Time Filters */}
                        <div className="flex bg-bg-input/50 rounded-xl p-1 gap-1">
                            <button
                                onClick={() => setFilter('all')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    filter === 'all'
                                        ? "bg-bg-card text-text-primary shadow-sm ring-1 ring-border-subtle"
                                        : "text-text-muted hover:text-text-secondary hover:bg-bg-card/50"
                                )}
                            >
                                <span className={clsx(!filter || filter === 'all' ? "text-violet-500" : "opacity-50")}><ClipboardList size={16} /></span>
                                <span className="hidden sm:inline">All</span>
                            </button>
                            <button
                                onClick={() => setFilter('today')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    filter === 'today'
                                        ? "bg-bg-card text-emerald-600 shadow-sm ring-1 ring-emerald-500/20"
                                        : "text-text-muted hover:text-text-secondary hover:bg-bg-card/50"
                                )}
                            >
                                <span className={clsx(filter === 'today' ? "text-emerald-500" : "opacity-50")}><CheckCircle2 size={16} /></span>
                                <span className="hidden sm:inline">Today</span>
                            </button>
                            <button
                                onClick={() => setFilter('upcoming')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    filter === 'upcoming'
                                        ? "bg-bg-card text-blue-600 shadow-sm ring-1 ring-blue-500/20"
                                        : "text-text-muted hover:text-text-secondary hover:bg-bg-card/50"
                                )}
                            >
                                <span className={clsx(filter === 'upcoming' ? "text-blue-500" : "opacity-50")}><Calendar size={16} /></span>
                                <span className="hidden sm:inline">Upcoming</span>
                            </button>
                        </div>

                        <div className="h-8 w-px bg-border-subtle/50 mx-1" />

                        {/* Member Filter - Removed Label */}
                        <AvatarMemberFilter
                            members={Object.values(team)}
                            selectedMemberId={selectedMemberId}
                            onSelectionChange={setSelectedMemberId}
                            label="" // Remove the "FILTER BY" text
                        />



                        <div className="h-8 w-px bg-border-subtle/50 mx-1" />

                        {/* View Toggles */}
                        <div className="flex p-1 bg-bg-input/50 rounded-xl">
                            <button
                                onClick={() => handleSetViewMode('list')}
                                className={clsx(
                                    "p-1.5 rounded-lg transition-all duration-200",
                                    viewMode === 'list'
                                        ? "bg-bg-card text-violet-600 shadow-sm"
                                        : "text-text-muted hover:text-text-secondary"
                                )}
                                title="List View"
                            >
                                <LayoutList size={18} />
                            </button>
                            <button
                                onClick={() => handleSetViewMode('board')}
                                className={clsx(
                                    "p-1.5 rounded-lg transition-all duration-200",
                                    viewMode === 'board'
                                        ? "bg-bg-card text-violet-600 shadow-sm"
                                        : "text-text-muted hover:text-text-secondary"
                                )}
                                title="Kanban Board"
                            >
                                <KanbanSquare size={18} />
                            </button>
                        </div>

                        {/* Clear Actions */}
                        {(() => {
                            if (!user) return null;
                            const isAdmin = user.role === 'owner' || user.role === 'head';
                            const hasClearableTasks = Object.values(tasks).some(t => {
                                if (t.status !== 'done') return false;
                                if (t.visibility === 'private') return t.ownerId === user.id;
                                return t.ownerId === user.id || isAdmin || (t.assigneeIds && t.assigneeIds.includes(user.id));
                            });
                            const hasActiveFilters = filter !== 'all' || selectedMemberId !== null;

                            return (hasClearableTasks || hasActiveFilters) && (
                                <div className="flex items-center pl-2 border-l border-border-subtle/50 ml-2">
                                    {hasActiveFilters && (
                                        <button
                                            onClick={() => {
                                                setFilter('all');
                                                setSelectedMemberId(null);
                                            }}
                                            className="p-2 rounded-lg text-text-muted hover:bg-bg-input hover:text-text-primary transition-colors"
                                            title="Clear Filters"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                    {hasClearableTasks && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm('¿Estás seguro de que quieres eliminar todas las tareas completadas?')) {
                                                    clearCompletedTasks();
                                                }
                                            }}
                                            className="p-2 ml-1 rounded-lg text-text-muted hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                            title="Clear Completed Tasks"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto overflow-x-hidden -mr-4 pr-4">
                {viewMode === 'board' ? (
                    <div className="h-full overflow-x-auto pb-4">
                        <KanbanBoard tasks={filteredTasks} />
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-text-muted border-2 border-dashed border-border-subtle rounded-2xl bg-bg-sidebar/50 max-w-5xl mx-auto w-full">
                        <div className="w-16 h-16 rounded-full bg-bg-input flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="font-medium">No tasks found</p>
                        <p className="text-sm opacity-60 mt-1">Try changing the filter or create a new task.</p>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-3 pb-20 max-w-5xl mx-auto w-full">
                        {filteredTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                    </ul>
                )}
            </div>

            {editingTask && (
                <EditTaskModal
                    task={editingTask}
                    onClose={() => {
                        setEditingTask(null);
                        const params = new URLSearchParams(searchParams);
                        params.delete('taskId');
                        setSearchParams(params);
                    }}
                />
            )}
        </div>
    );
}
