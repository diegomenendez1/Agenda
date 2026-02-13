import { useState, useEffect } from 'react';
import { useStore } from '../../core/store';
import { Sparkles, Loader2, Plus, ListChecks } from 'lucide-react';
import { KanbanBoard } from './KanbanBoard';
import { EditTaskModal } from './EditTaskModal';
import { useSearchParams, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { runAITaskPrioritization } from '../../core/aiPrioritization';
import { toast } from 'sonner';
import { isToday, isPast } from 'date-fns';
import { ModuleHeader } from '../../components/layout/ModuleHeader';

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
        <div id="tasks-view" className={clsx(
            "flex flex-col h-full bg-bg-app overflow-hidden px-4 pt-4 pb-0 md:px-6 md:pt-6 md:pb-0 transition-all duration-300"
        )}>
            {/* Header Section */}
            <ModuleHeader
                icon={ListChecks}
                title="My Tasks"
                subtitle="Manage your personal and team assignments."
                actions={
                    <button
                        id="smart-sort-btn"
                        onClick={handleAutoPrioritize}
                        disabled={isOrganizing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Reorganize with AI"
                    >
                        {isOrganizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        <span className="hidden sm:inline">Smart Sort</span>
                    </button>
                }
            />

            {/* Unified Toolbar */}
            <div className="w-full mb-6 relative z-10">
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
