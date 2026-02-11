import { useState, useEffect } from 'react';
import { useStore } from '../core/store';
import { Sparkles, Loader2, Plus, CheckCircle2 } from 'lucide-react';
import { FocusCard } from '../components/FocusCard';
import { KanbanBoard } from '../components/KanbanBoard';
import { TaskTable } from '../components/TaskTable';
import { EditTaskModal } from '../components/EditTaskModal';
import { useSearchParams, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { runAITaskPrioritization } from '../core/aiPrioritization';
import { toast } from 'sonner';
import { isToday, isPast } from 'date-fns';

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
                    <div className="flex flex-col gap-8 pb-20 max-w-5xl mx-auto w-full animate-enter">
                        {/* Smart Grouping Logic */}
                        {(() => {
                            const now = new Date();
                            const todayTasks = filteredTasks.filter(t => t.dueDate && (isToday(t.dueDate) || isPast(t.dueDate)) && t.status !== 'done');
                            const upcomingTasks = filteredTasks.filter(t => t.dueDate && !isToday(t.dueDate) && !isPast(t.dueDate) && t.status !== 'done');
                            const noDateTasks = filteredTasks.filter(t => !t.dueDate && t.status !== 'done');
                            const doneTasks = filteredTasks.filter(t => t.status === 'done');

                            const renderGroup = (title: string, groupTasks: typeof filteredTasks) => (
                                groupTasks.length > 0 && (
                                    <div className="flex flex-col gap-3">
                                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider pl-1 mb-1">{title} ({groupTasks.length})</h3>
                                        {groupTasks.map(task => (
                                            <FocusCard key={task.id} task={task} onToggleStatus={handleToggleTask} />
                                        ))}
                                    </div>
                                )
                            );

                            return (
                                <>
                                    {renderGroup("Focus Now", todayTasks)}
                                    {renderGroup("Upcoming", upcomingTasks)}
                                    {renderGroup("Backlog / No Date", noDateTasks)}
                                    {renderGroup("Completed", doneTasks)}
                                </>
                            );
                        })()}
                    </div>
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
