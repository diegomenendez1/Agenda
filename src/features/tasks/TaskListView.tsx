import { useState, useEffect } from 'react';
import { useStore } from '../../core/store';
import { Sparkles, Loader2, Plus } from 'lucide-react';
import { KanbanBoard } from './KanbanBoard';
import { EditTaskModal } from './EditTaskModal';
import { useSearchParams, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { runAITaskPrioritization } from '../../core/aiPrioritization';
import { toast } from 'sonner';
import { isToday, isPast } from 'date-fns';

// New Modular Code
import { useTaskListLogic } from './useTaskListLogic';
import { TaskFiltersBar } from './TaskFiltersBar';

export function TaskListView() {
    const { tasks, user, clearCompletedTasks, team, toggleTaskStatus } = useStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const { taskId: pathTaskId } = useParams();
    const [editingTask, setEditingTask] = useState<any>(null);
    const [isOrganizing, setIsOrganizing] = useState(false);

    // useTaskListLogic Hook
    const {
        timeFilter, setTimeFilter,
        scopeFilter, setScopeFilter,
        selectedMemberId, setSelectedMemberId,
        filteredTasks,
        handleToggleTask,
        clearFilters,
        hasActiveFilters
    } = useTaskListLogic(tasks, user, toggleTaskStatus);

    // Deep Linking to Task
    useEffect(() => {
        const taskId = searchParams.get('taskId') || pathTaskId;
        if (taskId && tasks[taskId]) {
            setEditingTask(tasks[taskId]);
        }
    }, [searchParams, pathTaskId, tasks]);


    const handleAutoPrioritize = async () => {
        try {
            setIsOrganizing(true);
            toast.info("Analyzing Global Context...");

            if (!user?.id) return;

            // Use Direct Client Service based on User Request for simpler flow
            const workingHours = user.preferences?.workingHours || { start: 9, end: 18 };
            const result = await runAITaskPrioritization(user.id, workingHours);

            toast.success(`AI Reorganized ${result.count} tasks based on global context!`);

        } catch (err: any) {
            console.error('Failed to reorganize', err);
            toast.error(err.message || 'AI Sort Failed');
        } finally {
            // Force a refresh of the local store to ensure UI matches DB exactly
            await useStore.getState().initialize();
            setIsOrganizing(false);
        }
    };

    return (
        <div className={clsx(
            "flex flex-col h-full bg-bg-app overflow-hidden px-4 pt-4 pb-2 md:px-8 md:pt-8 md:pb-2 transition-all duration-300"
        )}>
            {/* Header Section */}
            <header className="mb-6 flex flex-col gap-6 animate-enter relative z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-extrabold flex items-center gap-3 tracking-tight text-text-primary">
                            My Tasks
                        </h1>
                        <p className="text-text-muted text-base font-medium mt-1">Manage your personal and team assignments.</p>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-center">
                        <button
                            onClick={handleAutoPrioritize}
                            disabled={isOrganizing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reorganize with AI"
                        >
                            {isOrganizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            <span className="hidden sm:inline">Smart Sort</span>
                        </button>

                        <button
                            className="bg-accent-primary hover:bg-accent-secondary text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md shadow-accent-primary/20 transition-all active:scale-95 flex items-center gap-2"
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
                            <Plus size={18} strokeWidth={2.5} />
                            <span className="hidden sm:inline">New Task</span>
                        </button>
                    </div>
                </div>

                {/* Unified Toolbar */}
                <div className="w-full">
                    <TaskFiltersBar
                        timeFilter={timeFilter}
                        setTimeFilter={setTimeFilter}
                        scopeFilter={scopeFilter}
                        setScopeFilter={setScopeFilter}
                        selectedMemberId={selectedMemberId}
                        setSelectedMemberId={setSelectedMemberId}
                        team={team}
                        hasActiveFilters={hasActiveFilters}
                        clearFilters={clearFilters}
                        tasks={tasks}
                        user={user}
                        clearCompletedTasks={clearCompletedTasks}
                    />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto overflow-x-hidden -mr-4 pr-4">
                <div className="h-full overflow-x-auto pb-4">
                    <KanbanBoard tasks={filteredTasks} />
                </div>
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
