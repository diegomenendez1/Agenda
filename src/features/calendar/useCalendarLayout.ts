import { useMemo } from 'react';
import { isSameDay, addDays, startOfWeek, isValid } from 'date-fns';
import type { Task } from '../../core/types';

export interface CalendarEventProps extends Task {
    colIndex?: number;
    totalCols?: number;
    cluster?: Task[];
}

export function useCalendarLayout(
    tasks: Record<string, Task>,
    currentDate: Date,
    weekStart: Date,

    filterMode: 'all' | 'me',
    user: any,
    isMobile: boolean
) {
    const weekTasks = useMemo(() => {
        if (!tasks || !user) return [];
        const weekEnd = isMobile ? addDays(currentDate, 1) : addDays(weekStart, 7);
        const currentUserId = String(user.id);

        return Object.values(tasks).filter(task => {
            // 1. Organization Check
            if (String(task.organizationId) !== String(user.organizationId)) return false;

            // 2. Member Filter ('me' mode)
            if (filterMode === 'me') {
                const isOwner = String(task.ownerId) === currentUserId;
                const isAssignee = task.assigneeIds?.some(id => String(id) === currentUserId);

                if (!isOwner && !isAssignee) return false;
            }

            // 3. Validity Check
            if (!task.dueDate) return false;
            try {
                const taskDate = new Date(task.dueDate);
                return isValid(taskDate) && taskDate >= weekStart && taskDate < weekEnd;
            } catch {
                return false;
            }
        });
    }, [tasks, weekStart, filterMode, user, currentDate, isMobile]);

    const getPositionedTasks = (day: Date): CalendarEventProps[] => {
        const dayTasks = weekTasks.filter(t => isSameDay(new Date(t.dueDate!), day));
        if (dayTasks.length === 0) return [];

        // 1. Sort by time
        const sorted = [...dayTasks].sort((a, b) => {
            return (a.dueDate || 0) - (b.dueDate || 0);
        });

        // 2. Cluster
        const clusters: Task[][] = [];
        let currentCluster: Task[] = [];
        let clusterEnd = 0;

        sorted.forEach(task => {
            const start = task.dueDate || 0;
            const end = start + (task.estimatedMinutes || 60) * 60 * 1000;

            if (start < clusterEnd) {
                currentCluster.push(task);
                clusterEnd = Math.max(clusterEnd, end);
            } else {
                if (currentCluster.length > 0) clusters.push(currentCluster);
                currentCluster = [task];
                clusterEnd = end;
            }
        });
        if (currentCluster.length > 0) clusters.push(currentCluster);

        // 3. Assign columns
        const results: CalendarEventProps[] = [];
        clusters.forEach(cluster => {
            const columns: Task[][] = [];
            cluster.forEach(task => {
                let colIndex = columns.findIndex(col => {
                    const lastTask = col[col.length - 1];
                    const lastEnd = (lastTask.dueDate || 0) + (lastTask.estimatedMinutes || 60) * 60 * 1000;
                    return (task.dueDate || 0) >= lastEnd;
                });

                if (colIndex === -1) {
                    columns.push([task]);
                    colIndex = columns.length - 1;
                } else {
                    columns[colIndex].push(task);
                }

                results.push({
                    ...task,
                    colIndex,
                    totalCols: 0, // Placeholder
                    cluster // Keep reference just in case
                });
            });

            // Update totalCols
            cluster.forEach(task => {
                const res = results.find(r => r.id === task.id);
                if (res) res.totalCols = columns.length;
            });
        });

        return results;
    };

    return { getPositionedTasks };
}
