import { useMemo } from 'react';
import { clsx } from 'clsx';
import { ClipboardList, CheckCircle2, Calendar, Lock, Users, X, LayoutList, Table, KanbanSquare, Trash2 } from 'lucide-react';
import { AvatarMemberFilter } from '../team/AvatarMemberFilter';
import type { TeamMember, Task, UserProfile, EntityId } from '../../core/types';

interface TaskFiltersBarProps {
    timeFilter: 'all' | 'today' | 'upcoming';
    setTimeFilter: (val: 'all' | 'today' | 'upcoming') => void;
    scopeFilter: 'all' | 'private' | 'shared';
    setScopeFilter: (val: 'all' | 'private' | 'shared') => void;
    selectedMemberId: EntityId | null;
    setSelectedMemberId: (val: EntityId | null) => void;
    viewMode: 'list' | 'board' | 'table';
    setViewMode: (val: 'list' | 'board' | 'table') => void;
    team: Record<string, TeamMember>;
    hasActiveFilters: boolean;
    clearFilters: () => void;
    tasks: Record<string, Task>;
    user: UserProfile | null;
    clearCompletedTasks: () => void;
}

export function TaskFiltersBar({
    timeFilter, setTimeFilter,
    scopeFilter, setScopeFilter,
    selectedMemberId, setSelectedMemberId,
    viewMode, setViewMode,
    team,
    hasActiveFilters,
    clearFilters,
    tasks, user, clearCompletedTasks
}: TaskFiltersBarProps) {

    const hasClearableTasks = useMemo(() => {
        if (!user) return false;
        return Object.values(tasks).some(t => {
            if (t.status !== 'done') return false;
            return t.ownerId === user.id || t.assigneeIds?.includes(user.id);
        });
    }, [tasks, user]);

    return (
        <div className="flex items-center gap-2 p-1 bg-transparent overflow-x-auto max-w-full min-w-0 no-scrollbar">

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
                    onClick={() => setViewMode('list')}
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
                    onClick={() => setViewMode('table')}
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
                    onClick={() => setViewMode('board')}
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
            {(hasClearableTasks || hasActiveFilters) && (
                <div className="flex items-center pl-2 border-l border-border-subtle/50 ml-2">
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
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
            )}
        </div>
    );
}
