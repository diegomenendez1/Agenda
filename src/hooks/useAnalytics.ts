import { useMemo, useState } from 'react';
import { useStore } from '../core/store';

import { isWithinInterval, startOfDay, endOfDay, subDays, format, eachDayOfInterval } from 'date-fns';

export type DateRange = '7days' | '30days' | 'thisMonth' | 'custom';

interface AnalyticsFilter {
    dateRange: DateRange;
    customStart?: number;
    customEnd?: number;
    projectId?: string;
    memberId?: string;
}

export function useAnalytics() {
    const { tasks, team: teamMembers, user } = useStore();
    const [filter, setFilter] = useState<AnalyticsFilter>({ dateRange: '7days' });

    // Helper: Get Date Interval based on filter
    const dateInterval = useMemo(() => {
        const now = new Date();
        let start = subDays(now, 7);
        let end = endOfDay(now);

        switch (filter.dateRange) {
            case '7days':
                start = subDays(now, 7);
                break;
            case '30days':
                start = subDays(now, 30);
                break;
            case 'thisMonth':
                start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
                break;
            case 'custom':
                if (filter.customStart && filter.customEnd) {
                    start = new Date(filter.customStart);
                    end = new Date(filter.customEnd);
                }
                break;
        }
        return { start, end };
    }, [filter.dateRange, filter.customStart, filter.customEnd]);

    // 1. Filter Tasks
    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        const allTasks = Object.values(tasks);

        return allTasks.filter(task => {
            // Role-based visibility
            const isVisible = user?.role === 'owner' || user?.role === 'head'
                ? true
                : (task.ownerId === user?.id || task.assigneeIds?.includes(user?.id || ''));

            if (!isVisible) return false;

            // Project Filter
            if (filter.projectId && task.projectId !== filter.projectId) return false;

            // Member Filter (Assignee)
            if (filter.memberId && !task.assigneeIds?.includes(filter.memberId)) return false;

            // Date Range Filter (Created OR Completed within range)
            // If it's done, check completedAt. If not done, check createdAt.
            const dateToCheck = task.createdAt;
            if (!isWithinInterval(new Date(dateToCheck), dateInterval)) return false;

            return true;
        });
    }, [tasks, user, filter, dateInterval]);


    // 2. Overview Metrics
    const overviewMetrics = useMemo(() => {
        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.status === 'done').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Calculate velocity (tasks completed per day in the interval)
        const daysInInterval = Math.max(1, Math.ceil((dateInterval.end.getTime() - dateInterval.start.getTime()) / (1000 * 60 * 60 * 24)));
        const velocity = (completed / daysInInterval).toFixed(1);

        const overdue = filteredTasks.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== 'done').length;

        return {
            total,
            completed,
            completionRate,
            velocity,
            overdue
        };
    }, [filteredTasks, dateInterval]);

    // 3. Team Workload Metrics
    const teamMetrics = useMemo(() => {
        const workload: Record<string, { total: number; completed: number; overdue: number }> = {};

        // Initialize for all team members if user is head/owner
        if ((user?.role === 'owner' || user?.role === 'head') && teamMembers) {
            Object.values(teamMembers).forEach(member => {
                workload[member.id] = { total: 0, completed: 0, overdue: 0 };
            });
        }

        filteredTasks.forEach(task => {
            task.assigneeIds?.forEach(assigneeId => {
                if (!workload[assigneeId]) {
                    workload[assigneeId] = { total: 0, completed: 0, overdue: 0 };
                }
                workload[assigneeId].total++;
                if (task.status === 'done') workload[assigneeId].completed++;
                if (task.dueDate && task.dueDate < Date.now() && task.status !== 'done') workload[assigneeId].overdue++;
            });
        });

        // Convert to array for charts
        return Object.entries(workload).map(([id, stats]) => {
            const member = teamMembers ? teamMembers[id] : null;
            return {
                id,
                name: member?.name || 'Unknown',
                avatar: member?.avatar,
                ...stats,
                performance: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
            };
        }).sort((a, b) => b.total - a.total); // Sort by busiest
    }, [filteredTasks, teamMembers, user]);

    // 4. Activity History (for charts)
    const activityHistory = useMemo(() => {
        const days = eachDayOfInterval(dateInterval);
        return days.map(day => {
            const label = format(day, 'MMM dd');
            const dayStart = startOfDay(day).getTime();
            const dayEnd = endOfDay(day).getTime();

            const created = filteredTasks.filter(t => t.createdAt >= dayStart && t.createdAt <= dayEnd).length;
            const completed = filteredTasks.filter(t => t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd).length;

            return { label, created, completed };
        });
    }, [filteredTasks, dateInterval]);


    return {
        filter,
        setFilter,
        filteredTasks,
        overviewMetrics,
        teamMetrics,
        activityHistory,
        dateInterval
    };
}
