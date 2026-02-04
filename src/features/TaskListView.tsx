import { useState, useEffect } from 'react';
import { useStore } from '../core/store';
import { Sparkles, Loader2, Plus, CheckCircle2 } from 'lucide-react';
import { TaskItem } from '../components/TaskItem';
import { KanbanBoard } from '../components/KanbanBoard';
import { TaskTable } from '../components/TaskTable';
import { EditTaskModal } from '../components/EditTaskModal';
import { useSearchParams, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { runAITaskPrioritization } from '../core/aiPrioritization';
import { toast } from 'sonner';

// New Modular Code
import { useTaskListLogic } from './tasks/useTaskListLogic';
import { TaskFiltersBar } from './tasks/TaskFiltersBar';

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

    // Persistent View Mode
    const viewMode = user?.preferences?.taskViewMode || 'list';

    const handleSetViewMode = (mode: 'list' | 'board' | 'table') => {
        if (!user) return;
        useStore.getState().updateUserProfile({
            ...user,
            preferences: {
                ...user.preferences,
                taskViewMode: mode
            }
        });
    };

    const handleAutoPrioritize = async () => {
        try {
            setIsOrganizing(true);
            toast.info("Analyzing Global Context...");

            if (!user?.id) return;

            const workingHours = user.preferences?.workingHours || { start: 9, end: 18 };
            const result = await runAITaskPrioritization(user.id, workingHours);

            toast.success(`AI Reorganized ${result.count} tasks based on global context!`);

        } catch (err: any) {
            console.error('Failed to reorganize', err);
            toast.error(err.message || 'AI Sort Failed');
        } finally {
            setIsOrganizing(false);
        }
    };

    return (
        <div className={clsx(
            "flex flex-col h-full bg-bg-app overflow-hidden px-4 pt-4 pb-2 md:px-8 md:pt-8 md:pb-2 transition-all duration-300"
        )}>
            {/* Header Section */}
            <header className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 animate-enter relative z-20">
                <div>
                    <h1 className="text-4xl font-display font-extrabold flex items-center gap-3 tracking-tight text-text-primary mb-2">
                        My Tasks
                    </h1>
                    <p className="text-text-muted text-lg font-light">Manage your personal and team assignments.</p>
                </div>

                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 flex-wrap">
                    {/* Primary Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleAutoPrioritize}
                            disabled={isOrganizing}
                            className="group relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-purple-500/25 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reorganize with AI"
                        >
                            {isOrganizing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                            <span className="hidden sm:inline">AI Sort</span>
                        </button>

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
                    </div>

                    {/* Modular Filter Bar */}
                    <TaskFiltersBar
                        timeFilter={timeFilter}
                        setTimeFilter={setTimeFilter}
                        scopeFilter={scopeFilter}
                        setScopeFilter={setScopeFilter}
                        selectedMemberId={selectedMemberId}
                        setSelectedMemberId={setSelectedMemberId}
                        viewMode={viewMode}
                        setViewMode={handleSetViewMode}
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
                {viewMode === 'board' ? (
                    <div className="h-full overflow-x-auto pb-4">
                        <KanbanBoard tasks={filteredTasks} />
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="max-w-6xl mx-auto w-full pb-20">
                        <TaskTable tasks={filteredTasks} onToggleStatus={handleToggleTask} />
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
                            <TaskItem key={task.id} task={task} onToggleStatus={handleToggleTask} />
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
