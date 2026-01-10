import { useState, useMemo } from 'react';
import { useStore } from '../core/store';
import { CheckCircle2, Calendar, ClipboardList, LayoutList, KanbanSquare, Trash2, Plus } from 'lucide-react';
import { TaskItem } from '../components/TaskItem';
import { KanbanBoard } from '../components/KanbanBoard';
import { isSameDay, isFuture } from 'date-fns';
import clsx from 'clsx';

export function TaskListView() {
    const { tasks, user, updateUserProfile, clearCompletedTasks } = useStore();
    const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');

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
            // Sort by status, priority, creation
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

            // View Rules:
            // 1. Owner always sees their tasks (Private or Shared/Delegated)
            // 2. Assignees see shared tasks
            // 3. Team sees shared tasks (if Policy allows, but UI filters to 'My Tasks' usually. 
            //    Here we want to ensure 'My Delegated Tasks' are visible too).

            if (isShared) {
                // Show if I am the assignee OR the owner
                if (!isAssignee && !isOwner) return false;
            } else {
                // Private: Show only if Owner
                if (!isOwner) return false;
            }

            if (filter === 'all') return true;
            if (!task.dueDate) return false;

            const taskDate = new Date(task.dueDate);
            if (filter === 'today') return isSameDay(taskDate, today);
            if (filter === 'upcoming') {
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
                        {filteredTasks.some(t => t.status === 'done') && (
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete all completed tasks? This cannot be undone.')) {
                                        clearCompletedTasks();
                                    }
                                }}
                                className="btn btn-ghost text-xs text-text-muted hover:text-red-500 hover:bg-red-500/10 px-3 py-2"
                            >
                                <Trash2 size={14} className="mr-1.5" /> Clear Completed
                            </button>
                        )}
                        {viewMode === 'list' && (
                            <button
                                className="btn btn-primary shadow-lg shadow-accent-primary/20"
                                onClick={() => window.dispatchEvent(new CustomEvent('open-task-modal'))}
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
        </div>
    );
}
