import { addDays, addWeeks, addMonths, addYears, getDay } from 'date-fns';
import type { RecurrenceConfig, Task } from './types';

export const calculateNextDueDate = (
    config: RecurrenceConfig,
    lastDueDate?: number,
    completionDate: number = Date.now()
): number => {
    // If no last due date, assume "now" or "creation" was the start. 
    // For 'on_schedule', we strictly need a basis. If missing, use completionDate (fallback)
    const baseDate = config.type === 'on_completion'
        ? completionDate
        : (lastDueDate || completionDate);

    const dateObj = new Date(baseDate);
    const interval = config.interval || 1;

    let nextDate: Date;

    switch (config.frequency) {
        case 'daily':
            nextDate = addDays(dateObj, interval);
            break;
        case 'weekly':
            if (config.daysOfWeek && config.daysOfWeek.length > 0) {
                // Logic for specific days (e.g., Mon, Wed)
                // This is complex: need to find the *next* valid day in the sequence
                // relative to baseDate.

                // 1. Sort daysOfWeek (0=Sun, 1=Mon...)
                const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b);
                const currentDay = getDay(dateObj);

                // 2. Find next day in current week
                const nextDayInWeek = sortedDays.find(d => d > currentDay);

                if (nextDayInWeek !== undefined) {
                    // Jump to that day in CURRENT week
                    const diff = nextDayInWeek - currentDay;
                    nextDate = addDays(dateObj, diff);
                } else {
                    // 3. Jump to first valid day in NEXT week (plus interval weeks logic?)
                    // Usually "Every MWF" implies interval 1 week. 
                    // But "Every 2 weeks on MWF" means if we finish Fri, we might skip a week?
                    // Let's assume standard "Weekly" rotation.
                    const firstDay = sortedDays[0];
                    const daysUntilSunday = 7 - currentDay;
                    const diff = daysUntilSunday + firstDay + ((interval - 1) * 7);
                    nextDate = addDays(dateObj, diff);
                }
            } else {
                nextDate = addWeeks(dateObj, interval);
            }
            break;
        case 'monthly':
            nextDate = addMonths(dateObj, interval);
            break;
        case 'yearly':
            nextDate = addYears(dateObj, interval);
            break;
        default:
            nextDate = addDays(dateObj, interval); // Fallback custom
    }

    // Keep the same time of day as the original due date (if it existed)
    // or set to default time?
    // Current tasks seem to use timestamps.
    return nextDate.getTime();
};

export const shouldRecur = (task: Task): boolean => {
    if (!task.recurrence) return false;

    // Check end condition
    if (task.recurrence.endCondition) {
        const { type, value } = task.recurrence.endCondition;
        if (type === 'date' && value && Date.now() > value) return false;
        // 'count' logic requires us to know how many times it occurred.
        // We might need to store `recurrenceCount` on the task chain or check parent.
        // For MVP, we'll skip 'count' or implement it if we track history.
    }
    return true;
};
