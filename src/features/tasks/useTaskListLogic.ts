import { useState, useMemo, useCallback } from 'react';
import type { Task, UserProfile, EntityId } from '../../core/types';
import { filterAndSortTasks } from '../../core/taskUtils';

export function useTaskListLogic(
    tasks: Record<string, Task>,
    user: UserProfile | null,
    toggleTaskStatus: (id: EntityId) => Promise<void>
) {
    const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'upcoming'>('all');
    const [scopeFilter, setScopeFilter] = useState<'all' | 'private' | 'shared'>('all');
    const [selectedMemberId, setSelectedMemberId] = useState<EntityId | null>(null);
    const [recentlyCompletedIds, setRecentlyCompletedIds] = useState<Set<EntityId>>(new Set());

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

            // Remove after 2.5 seconds
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

    const filteredTasks = useMemo(() => {
        return filterAndSortTasks(tasks, user, {
            timeFilter,
            scopeFilter,
            selectedMemberId,
            recentlyCompletedIds
        });
    }, [tasks, timeFilter, scopeFilter, user, selectedMemberId, recentlyCompletedIds]);

    const clearFilters = () => {
        setTimeFilter('all');
        setScopeFilter('all');
        setSelectedMemberId(null);
    };

    const hasActiveFilters = timeFilter !== 'all' || selectedMemberId !== null || scopeFilter !== 'all';

    return {
        timeFilter, setTimeFilter,
        scopeFilter, setScopeFilter,
        selectedMemberId, setSelectedMemberId,
        filteredTasks,
        handleToggleTask,
        clearFilters,
        hasActiveFilters
    };
}
