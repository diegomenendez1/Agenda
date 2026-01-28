import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '../core/store';
import { CheckCircle2, Calendar, ClipboardList, LayoutList, KanbanSquare, Trash2, Plus, X, Lock, Users, Table, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../core/supabase';
import { TaskItem } from '../components/TaskItem';
import { KanbanBoard } from '../components/KanbanBoard';
import { TaskTable } from '../components/TaskTable';

import { EditTaskModal } from '../components/EditTaskModal';

import { AvatarMemberFilter } from '../components/AvatarMemberFilter';
import { isSameDay, isFuture } from 'date-fns';
import { useSearchParams, useParams } from 'react-router-dom';
import clsx from 'clsx';
import type { EntityId } from '../core/types';
import { filterAndSortTasks } from '../core/taskUtils';
import { runAITaskPrioritization } from '../core/aiPrioritization';
import { toast } from 'sonner';
export function TaskListView() {
    const { tasks, user, clearCompletedTasks, team, toggleTaskStatus } = useStore();

    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'upcoming'>('all');
    const [scopeFilter, setScopeFilter] = useState<'all' | 'private' | 'shared'>('all');

    const [selectedMemberId, setSelectedMemberId] = useState<EntityId | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const { taskId: pathTaskId } = useParams();
    const [editingTask, setEditingTask] = useState<any>(null);
    const [recentlyCompletedIds, setRecentlyCompletedIds] = useState<Set<EntityId>>(new Set());
    const [isOrganizing, setIsOrganizing] = useState(false);

    const handleAutoPrioritize = async () => {
        try {
            setIsOrganizing(true);
            toast.info("Analyzing Global Context...");

            if (!user?.id) return;

            // Use Direct Client Service based on User Request for simpler flow
            const result = await runAITaskPrioritization(user.id);

            toast.success(`AI Reorganized ${result.count} tasks based on global context!`);

        } catch (err: any) {
            console.error('Failed to reorganize', err);
            toast.error(err.message || 'AI Sort Failed');
        } finally {
            setIsOrganizing(false);
        }
    };

    const handleToggleTask = useCallback((taskId: EntityId) => {
        const task = tasks[taskId];
        if (!task) return;

        const willBeDone = task.status !== 'done';

        // Toggle state in store
        toggleTaskStatus(taskId);

        if (willBeDone) {
            // Add to delayed set to prevent immediate sorting jump
            setRecentlyCompletedIds(prev => {
                const newSet = new Set(prev);
                newSet.add(taskId);
                return newSet;
            });

            // Remove after 2 seconds (or could be longer, or on view change)
            setTimeout(() => {
                setRecentlyCompletedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(taskId);
                    return newSet;
                });
            }, 2500);
        } else {
            // If un-toggling, remove immediately
            setRecentlyCompletedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });
        }
    }, [tasks, toggleTaskStatus]);

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

    const filteredTasks = useMemo(() => {
        return filterAndSortTasks(tasks, user, {
            timeFilter,
            scopeFilter,
            selectedMemberId,
            recentlyCompletedIds
        });
    }, [tasks, timeFilter, scopeFilter, user, selectedMemberId, recentlyCompletedIds]);

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
                    <p className="text-text-muted text-lg font-light">Manage your personal and team assignments.</p>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    {/* Primary Action */}
                    {/* Primary Action */}
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

                    {/* Unified Filter Bar */}
                    <div className="flex items-center gap-1 p-1.5 bg-bg-surface/60 backdrop-blur-md border border-border-subtle rounded-2xl shadow-sm overflow-x-auto max-w-full">

                        {/* Scope Filters (Private vs Shared) */}
                        <div className="flex bg-bg-input/50 rounded-xl p-1 gap-1">
                            <button
                                onClick={() => setScopeFilter('all')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    scopeFilter === 'all'
                                        ? "bg-bg-card text-text-primary shadow-sm ring-1 ring-border-subtle"
                                        : "text-text-muted hover:text-text-secondary hover:bg-bg-card/50"
                                )}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setScopeFilter('private')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    scopeFilter === 'private'
                                        ? "bg-bg-card text-amber-600 shadow-sm ring-1 ring-amber-500/20"
                                        : "text-text-muted hover:text-text-secondary hover:bg-bg-card/50"
                                )}
                                title="Private Only"
                            >
                                <Lock size={14} />
                                <span className="hidden sm:inline">Private</span>
                            </button>
                            <button
                                onClick={() => setScopeFilter('shared')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    scopeFilter === 'shared'
                                        ? "bg-bg-card text-indigo-600 shadow-sm ring-1 ring-indigo-500/20"
                                        : "text-text-muted hover:text-text-secondary hover:bg-bg-card/50"
                                )}
                                title="Shared / Assigned"
                            >
                                <Users size={14} />
                                <span className="hidden sm:inline">Shared</span>
                            </button>
                        </div>

                        <div className="h-8 w-px bg-border-subtle/50 mx-1" />

                        {/* Time Filters */}
                        <div className="flex bg-bg-input/50 rounded-xl p-1 gap-1">
                            <button
                                onClick={() => setTimeFilter('all')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    timeFilter === 'all'
                                        ? "bg-bg-card text-text-primary shadow-sm ring-1 ring-border-subtle"
                                        : "text-text-muted hover:text-text-secondary hover:bg-bg-card/50"
                                )}
                            >
                                <span className={clsx(!timeFilter || timeFilter === 'all' ? "text-violet-500" : "opacity-50")}><ClipboardList size={16} /></span>
                            </button>
                            <button
                                onClick={() => setTimeFilter('today')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    timeFilter === 'today'
                                        ? "bg-bg-card text-emerald-600 shadow-sm ring-1 ring-emerald-500/20"
                                        : "text-text-muted hover:text-text-secondary hover:bg-bg-card/50"
                                )}
                            >
                                <span className={clsx(timeFilter === 'today' ? "text-emerald-500" : "opacity-50")}><CheckCircle2 size={16} /></span>
                                <span className="hidden sm:inline">Today</span>
                            </button>
                            <button
                                onClick={() => setTimeFilter('upcoming')}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                    timeFilter === 'upcoming'
                                        ? "bg-bg-card text-blue-600 shadow-sm ring-1 ring-blue-500/20"
                                        : "text-text-muted hover:text-text-secondary hover:bg-bg-card/50"
                                )}
                            >
                                <span className={clsx(timeFilter === 'upcoming' ? "text-blue-500" : "opacity-50")}><Calendar size={16} /></span>
                                <span className="hidden sm:inline">Upcoming</span>
                            </button>
                        </div>

                        <div className="h-8 w-px bg-border-subtle/50 mx-1" />

                        <AvatarMemberFilter
                            members={Object.values(team)}
                            selectedMemberId={selectedMemberId}
                            onSelectionChange={setSelectedMemberId}
                            label=""
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
                                onClick={() => handleSetViewMode('table')}
                                className={clsx(
                                    "p-1.5 rounded-lg transition-all duration-200",
                                    viewMode === 'table'
                                        ? "bg-bg-card text-violet-600 shadow-sm"
                                        : "text-text-muted hover:text-text-secondary"
                                )}
                                title="Table View"
                            >
                                <Table size={18} />
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
                            const hasClearableTasks = Object.values(tasks).some(t => {
                                if (t.status !== 'done') return false;
                                return t.ownerId === user.id || t.assigneeIds?.includes(user.id);
                            });
                            const hasActiveFilters = timeFilter !== 'all' || selectedMemberId !== null || scopeFilter !== 'all';

                            return (hasClearableTasks || hasActiveFilters) && (
                                <div className="flex items-center pl-2 border-l border-border-subtle/50 ml-2">
                                    {hasActiveFilters && (
                                        <button
                                            onClick={() => {
                                                setTimeFilter('all');
                                                setScopeFilter('all');
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
                                                if (window.confirm('Are you sure you want to clear all completed tasks?')) {
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
