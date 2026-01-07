import { useState, useMemo } from 'react';
import { useStore } from '../core/store';
import { CheckCircle2, Calendar, ClipboardList, LayoutList, KanbanSquare } from 'lucide-react';
import { TaskItem } from '../components/TaskItem';
import { KanbanBoard } from '../components/KanbanBoard';
import { isSameDay, isFuture } from 'date-fns';
import clsx from 'clsx';

export function TaskListView() {
    const { tasks, user, updateUserProfile } = useStore();
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

        const priorityScore = { critical: 4, urgent: 3, high: 2, medium: 1, low: 0, auto: 1 };
        const allTasks = Object.values(tasks).sort((a, b) => {
            // Sort by status (pending first), then priority, then due date
            if (a.status !== b.status) {
                if (a.status === 'done') return 1;
                if (b.status === 'done') return -1;
                return 0;
            }

            const pA = priorityScore[a.priority as keyof typeof priorityScore] || 0;
            const pB = priorityScore[b.priority as keyof typeof priorityScore] || 0;

            if (pA !== pB) return pB - pA; // Higher score first
            return (a.dueDate || 0) - (b.dueDate || 0);
        });

        const today = new Date();

        return allTasks.filter(task => {
            // SEGMENTATION LOGIC:
            // I see tasks that are:
            // 1. Created by me (regardless of visibility)
            // 2. Assigned to me
            const isOwner = task.ownerId === user.id;
            const isAssignee = task.assigneeId === user.id;

            if (!isOwner && !isAssignee) return false;

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
            "flex flex-col h-full p-8 w-full mx-auto transition-all duration-300",
            viewMode === 'list' ? "max-w-4xl" : "max-w-full"
        )}>
            <header className="mb-8 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
                        <CheckCircle2 className="w-8 h-8 text-success" />
                        My Tasks
                    </h1>
                    <div className="flex bg-bg-card border border-border-subtle rounded-lg p-1">
                        <button
                            onClick={() => handleSetViewMode('list')}
                            className={clsx(
                                "p-2 rounded-md transition-all",
                                viewMode === 'list' ? "bg-accent-primary text-white shadow-sm" : "text-text-muted hover:text-text-primary hover:bg-bg-input"
                            )}
                            title="List View"
                        >
                            <LayoutList size={20} />
                        </button>
                        <button
                            onClick={() => handleSetViewMode('board')}
                            className={clsx(
                                "p-2 rounded-md transition-all",
                                viewMode === 'board' ? "bg-accent-primary text-white shadow-sm" : "text-text-muted hover:text-text-primary hover:bg-bg-input"
                            )}
                            title="Kanban Board"
                        >
                            <KanbanSquare size={20} />
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 p-1 bg-bg-card rounded-lg w-fit border border-border-subtle">
                    <button
                        onClick={() => setFilter('all')}
                        className={clsx(
                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            filter === 'all' ? "bg-accent-primary text-white shadow-sm" : "text-muted hover:text-primary hover:bg-bg-input"
                        )}
                    >
                        <ClipboardList size={16} /> All
                    </button>
                    <button
                        onClick={() => setFilter('today')}
                        className={clsx(
                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            filter === 'today' ? "bg-accent-primary text-white shadow-sm" : "text-muted hover:text-primary hover:bg-bg-input"
                        )}
                    >
                        <CheckCircle2 size={16} /> Active
                    </button>
                    <button
                        onClick={() => setFilter('upcoming')}
                        className={clsx(
                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                            filter === 'upcoming' ? "bg-accent-primary text-white shadow-sm" : "text-muted hover:text-primary hover:bg-bg-input"
                        )}
                    >
                        <Calendar size={16} /> Upcoming
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {viewMode === 'board' ? (
                    <div className="h-full overflow-x-auto pb-4">
                        <KanbanBoard tasks={filteredTasks} />
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted">
                        <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                        <p>No tasks found for this filter.</p>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-4 pb-20">
                        {filteredTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

