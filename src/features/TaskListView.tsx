import { useState, useMemo } from 'react';
import { useStore } from '../core/store';
import { CheckCircle2, Calendar, ClipboardList } from 'lucide-react';
import { TaskItem } from '../components/TaskItem';
import { isSameDay, isFuture } from 'date-fns';
import clsx from 'clsx';

export function TaskListView() {
    const { tasks } = useStore();
    const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');

    const filteredTasks = useMemo(() => {
        const allTasks = Object.values(tasks).sort((a, b) => {
            // Sort by status (pending first), then priority, then due date
            if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
            if (a.priority !== b.priority) return a.priority - b.priority;
            return (a.dueDate || 0) - (b.dueDate || 0);
        });

        const today = new Date();

        return allTasks.filter(task => {
            if (filter === 'all') return true;
            if (!task.dueDate) return false;

            const taskDate = new Date(task.dueDate);
            if (filter === 'today') return isSameDay(taskDate, today);
            if (filter === 'upcoming') {
                return isFuture(taskDate) && !isSameDay(taskDate, today);
            }
            return true;
        });
    }, [tasks, filter]);

    return (
        <div className="flex flex-col h-full p-8 max-w-4xl mx-auto w-full">
            <header className="mb-8 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-md">
                        <CheckCircle2 className="w-8 h-8 text-success" />
                        Tasks
                    </h1>
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
                        <CheckCircle2 size={16} /> Today
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

            <div className="flex-1 overflow-y-auto">
                {filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted">
                        <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                        <p>No tasks found for this filter.</p>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-2 pb-20">
                        {filteredTasks.map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

