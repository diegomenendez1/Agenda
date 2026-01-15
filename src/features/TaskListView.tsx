import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../core/store';
import { CheckCircle2, Calendar, ClipboardList, LayoutList, KanbanSquare, Trash2, Plus, CheckSquare, X } from 'lucide-react';
import { TaskItem } from '../components/TaskItem';
import { KanbanBoard } from '../components/KanbanBoard';
import { EditTaskModal } from '../components/EditTaskModal';
import { ProjectFilter } from '../components/ProjectFilter';
import { AvatarMemberFilter } from '../components/AvatarMemberFilter';
import { isSameDay, isFuture } from 'date-fns';
import { useSearchParams, useParams } from 'react-router-dom';
import clsx from 'clsx';
import type { EntityId } from '../core/types';

export function TaskListView() {
    const { tasks, user, updateUserProfile, clearCompletedTasks, projects, team } = useStore();
    const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');
    const [selectedProjectIds, setSelectedProjectIds] = useState<EntityId[]>([]);
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
            const isAdmin = user.role === 'owner' || user.role === 'admin';

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

            // Project Filter
            if (selectedProjectIds.length > 0) {
                if (!task.projectId || !selectedProjectIds.includes(task.projectId)) return false;
            }

            // Member Filter (Talent Filter)
            if (selectedMemberId) {
                // Determine if selected member is involved
                const isMemberAssigned = task.assigneeIds?.includes(selectedMemberId);
                const isMemberOwner = task.ownerId === selectedMemberId;

                // If I'm filtering by "Person X", I expect to see tasks assigned to them
                // OR tasks they own (if shared with me or if I'm admin).
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
    }, [tasks, filter, user, selectedProjectIds, selectedMemberId]);

    return (
        <div className={clsx(
            "flex flex-col h-full bg-bg-app overflow-hidden px-6 pt-6 pb-2 md:px-8 md:pt-8 md:pb-2 transition-all duration-300",
            viewMode === 'list' && "max-w-5xl mx-auto w-full"
        )}>
            {/* Header Section */}
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-enter relative z-20">
                <div>
                    <h1 className="text-3xl font-display font-bold flex items-center gap-3 tracking-tight text-text-primary">
                        <CheckSquare className="w-8 h-8 text-accent-primary" />
                        My Tasks
                    </h1>
                    <p className="text-text-muted text-sm mt-1 ml-11">Manage your personal tasks and assignments.</p>
                </div>

                <div className="flex gap-2 items-center">
                    {viewMode === 'list' && (
                        <button
                            className="btn-primary shadow-lg shadow-accent-primary/20 flex items-center gap-2"
                            onClick={async () => {
                                // Create a draft task
                                const { addTask } = useStore.getState();
                                const newId = await addTask({
                                    title: '',
                                    status: 'todo',
                                    priority: 'medium',
                                    visibility: 'private'
                                });

                                // Hack: Small delay or direct read to ensure we get the task
                                setTimeout(() => {
                                    const newTask = useStore.getState().tasks[newId];
                                    if (newTask) setEditingTask(newTask);
                                }, 50);
                            }}
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">New Task</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4 bg-bg-card border border-border-subtle p-2 rounded-xl shadow-sm overflow-x-auto">
                    {/* Filter Tabs - Unified Style with ProjectFilter */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => setFilter('all')}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative border",
                                filter === 'all'
                                    ? "bg-text-primary text-bg-card border-text-primary shadow-sm"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-input border-transparent hover:border-border-subtle"
                            )}
                            title="All Tasks"
                        >
                            <ClipboardList size={14} />
                            <span className="hidden sm:inline">All</span>
                        </button>
                        <button
                            onClick={() => setFilter('today')}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative border",
                                filter === 'today'
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-input border-transparent hover:border-border-subtle"
                            )}
                            title="Due Today"
                        >
                            <CheckCircle2 size={14} />
                            <span className="hidden sm:inline">Today</span>
                        </button>
                        <button
                            onClick={() => setFilter('upcoming')}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative border",
                                filter === 'upcoming'
                                    ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-input border-transparent hover:border-border-subtle"
                            )}
                            title="Upcoming Tasks"
                        >
                            <Calendar size={14} />
                            <span className="hidden sm:inline">Upcoming</span>
                        </button>
                    </div>

                    <div className="h-6 w-px bg-border-subtle" />

                    {/* Member Filter - Refactored to match TeamBoard */}
                    <AvatarMemberFilter
                        members={Object.values(team)}
                        selectedMemberId={selectedMemberId}
                        onSelectionChange={setSelectedMemberId}
                    />

                    <div className="h-6 w-px bg-border-subtle" />

                    {/* Project Filter */}
                    <ProjectFilter
                        projects={Object.values(projects)}
                        selectedProjectIds={selectedProjectIds}
                        onSelectionChange={setSelectedProjectIds}
                    />

                    <div className="h-6 w-px bg-border-subtle" />

                    {/* View Toggles */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleSetViewMode('list')}
                            className={clsx(
                                "p-1.5 rounded-lg transition-all duration-200",
                                viewMode === 'list'
                                    ? "bg-accent-primary text-white shadow-sm"
                                    : "text-text-muted hover:text-text-secondary hover:bg-bg-input"
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
                                    ? "bg-accent-primary text-white shadow-sm"
                                    : "text-text-muted hover:text-text-secondary hover:bg-bg-input"
                            )}
                            title="Kanban Board"
                        >
                            <KanbanSquare size={18} />
                        </button>
                    </div>

                    {/* Clear Completed Action */}
                    {(() => {
                        if (!user) return null;
                        const isAdmin = user.role === 'owner' || user.role === 'admin';
                        const hasClearableTasks = Object.values(tasks).some(t => {
                            if (t.status !== 'done') return false;
                            if (t.visibility === 'private') return t.ownerId === user.id;
                            return t.ownerId === user.id || isAdmin || (t.assigneeIds && t.assigneeIds.includes(user.id));
                        });

                        // Also show 'Clear' if filters are active, consistent with TeamBoard
                        const hasActiveFilters = filter !== 'all' || selectedProjectIds.length > 0 || selectedMemberId !== null;

                        return (hasClearableTasks || hasActiveFilters) && (
                            <>
                                <div className="h-6 w-px bg-border-subtle" />
                                <div className="flex items-center gap-1">
                                    {hasActiveFilters && (
                                        <button
                                            onClick={() => {
                                                setFilter('all');
                                                setSelectedProjectIds([]);
                                                setSelectedMemberId(null);
                                            }}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors text-red-500 hover:bg-red-50 hover:text-red-600"
                                            title="Clear Filters"
                                        >
                                            <X size={16} />
                                            <span className="hidden md:inline">Clear</span>
                                        </button>
                                    )}

                                    {hasClearableTasks && !hasActiveFilters && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm('¿Estás seguro de que quieres eliminar todas las tareas completadas?')) {
                                                    clearCompletedTasks();
                                                }
                                            }}
                                            className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all flex items-center gap-1"
                                            title="Clear Completed Tasks"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </>
                        );
                    })()}

                </div>
            </header>

            <div className="flex-1 overflow-y-auto overflow-x-hidden -mr-4 pr-4">
                {viewMode === 'board' ? (
                    <div className="h-full overflow-x-auto pb-4">
                        <KanbanBoard tasks={filteredTasks} />
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-text-muted border-2 border-dashed border-border-subtle rounded-2xl bg-bg-sidebar/50">
                        <div className="w-16 h-16 rounded-full bg-bg-input flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="font-medium">No tasks found</p>
                        <p className="text-sm opacity-60 mt-1">Try changing the filter or create a new task.</p>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-3 pb-20">
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
