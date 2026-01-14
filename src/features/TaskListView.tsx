import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../core/store';
import { CheckCircle2, Calendar, ClipboardList, LayoutList, KanbanSquare, Trash2, Plus } from 'lucide-react';
import { TaskItem } from '../components/TaskItem';
import { KanbanBoard } from '../components/KanbanBoard';
import { EditTaskModal } from '../components/EditTaskModal';
import { isSameDay, isFuture } from 'date-fns';
import { useSearchParams, useParams } from 'react-router-dom';
import clsx from 'clsx';

export function TaskListView() {
    const { tasks, user, updateUserProfile, clearCompletedTasks } = useStore();
    const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');
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
    }, [tasks, filter, user]);

    return (
        <div className={clsx(
            "flex flex-col h-full p-6 md:p-10 w-full mx-auto transition-all duration-300",
            viewMode === 'list' ? "max-w-5xl" : "max-w-full"
        )}>
            {/* Header Section */}
            <header className="mb-10 flex flex-col gap-6 animate-enter">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight mb-1">My Tasks</h1>
                        <p className="text-text-muted text-sm">Manage your personal tasks and assignments.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Toggles */}
                        <div className="flex p-1 bg-bg-input rounded-lg border border-border-subtle/50">
                            <button
                                onClick={() => handleSetViewMode('list')}
                                className={clsx(
                                    "p-2 rounded-md transition-all duration-200",
                                    viewMode === 'list'
                                        ? "bg-bg-card text-accent-primary shadow-sm ring-1 ring-border-subtle"
                                        : "text-text-muted hover:text-text-secondary hover:bg-black/5"
                                )}
                                title="List View"
                            >
                                <LayoutList size={18} />
                            </button>
                            <button
                                onClick={() => handleSetViewMode('board')}
                                className={clsx(
                                    "p-2 rounded-md transition-all duration-200",
                                    viewMode === 'board'
                                        ? "bg-bg-card text-accent-primary shadow-sm ring-1 ring-border-subtle"
                                        : "text-text-muted hover:text-text-secondary hover:bg-black/5"
                                )}
                                title="Kanban Board"
                            >
                                <KanbanSquare size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
                    {/* Filter Tabs - Segmented Style */}
                    <div className="flex gap-1 p-1 bg-bg-input/50 rounded-xl border border-border-subtle/30">
                        <button
                            onClick={() => setFilter('all')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative",
                                filter === 'all'
                                    ? "bg-bg-card text-text-primary shadow-sm ring-1 ring-border-subtle"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-card/50"
                            )}
                        >
                            <ClipboardList size={16} className={filter === 'all' ? "text-accent-primary" : ""} /> All Tasks
                        </button>
                        <button
                            onClick={() => setFilter('today')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative",
                                filter === 'today'
                                    ? "bg-bg-card text-text-primary shadow-sm ring-1 ring-border-subtle"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-card/50"
                            )}
                        >
                            <CheckCircle2 size={16} className={filter === 'today' ? "text-emerald-500" : ""} /> Today
                        </button>
                        <button
                            onClick={() => setFilter('upcoming')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative",
                                filter === 'upcoming'
                                    ? "bg-bg-card text-text-primary shadow-sm ring-1 ring-border-subtle"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-card/50"
                            )}
                        >
                            <Calendar size={16} className={filter === 'upcoming' ? "text-blue-500" : ""} /> Upcoming
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        {(() => {
                            if (!user) return null;
                            const isAdmin = user.role === 'owner' || user.role === 'admin';
                            const hasClearableTasks = Object.values(tasks).some(t => {
                                if (t.status !== 'done') return false;
                                if (t.visibility === 'private') return t.ownerId === user.id;
                                return t.ownerId === user.id || isAdmin || (t.assigneeIds && t.assigneeIds.includes(user.id));
                            });

                            return hasClearableTasks && (
                                <button
                                    onClick={() => {
                                        if (window.confirm('¿Estás seguro de que quieres eliminar todas las tareas completadas?')) {
                                            clearCompletedTasks();
                                        }
                                    }}
                                    className="btn btn-ghost text-xs text-accent-primary hover:bg-accent-primary/10 px-3 py-2 flex items-center gap-2"
                                >
                                    <Trash2 size={14} />
                                    <span>Clear Completed</span>
                                </button>
                            );
                        })()}
                        {viewMode === 'list' && (
                            <button
                                className="btn btn-primary shadow-lg shadow-accent-primary/20"
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
                                <Plus size={18} /> New Task
                            </button>
                        )}
                    </div>
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
