
import { addDays, addWeeks, addMonths, addYears, getDay } from 'date-fns';
import type { RecurrenceConfig, Task } from './types';

export const calculateNextDueDate = (
    config: RecurrenceConfig,
    lastDueDate?: number,
    completionDate: number = Date.now()
): number => {
    // Strategy:
    // 'on_schedule': Strictly Calendar-based. We assume dates are stored as UTC Midnight or we treat them as "Events on a Day".
    // To ensure stability, we perform all math on UTC components and return UTC Midnight.
    // 'on_completion': Time-based. We preserve the "Time of Day" of completion (Local).

    // Determine Mode
    // Fallback: If 'on_schedule' but missing lastDueDate, we treat completionDate as the "anchor" 
    // but should we standardize it to Midnight next time? 
    // Usually 'on_schedule' implies "Due Date". Due Dates are usually Days. So we snap to Midnight UTC.

    const isScheduleMode = config.type !== 'on_completion';
    const interval = config.interval || 1;

    if (isScheduleMode) {
        // --- ON SCHEDULE (UTC Logic) ---
        // Basis: lastDueDate (preferred) or completionDate (fallback)
        const baseTimestamp = lastDueDate || completionDate;
        const d = new Date(baseTimestamp);

        // Extract UTC components (Floating Date interpretation)
        let year = d.getUTCFullYear();
        let month = d.getUTCMonth();
        let day = d.getUTCDate();

        // Perform calculation manually or via lightweight logic to avoid date-fns Local conversion issues
        // OR: Construct a "UTC Date" object, use date-fns (which uses setMonth/getDate), then read back?
        // date-fns addMonths works on local.
        // TRICK: Construct a "Fake Local" date that matches the UTC components. 
        // e.g. 2024-01-31 00:00 UTC -> 2024-01-31 00:00 Local (Safe Fake).
        // Apply math. 
        // Convert resultant Local Y/M/D back to UTC.

        // Using "Noon" is safer for the "Fake Local" to avoid day-boundary-drift during addMonths (DST).
        const fakeLocal = new Date(year, month, day, 12, 0, 0);

        // Apply Math
        let nextFake: Date;
        switch (config.frequency) {
            case 'daily': nextFake = addDays(fakeLocal, interval); break;
            case 'weekly':
                if (config.daysOfWeek && config.daysOfWeek.length > 0) {
                    const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b);
                    const currentDay = fakeLocal.getDay(); // 0-6 matches standard
                    const nextDayInWeek = sortedDays.find(d => d > currentDay);
                    if (nextDayInWeek !== undefined) {
                        nextFake = addDays(fakeLocal, nextDayInWeek - currentDay);
                    } else {
                        const firstDay = sortedDays[0];
                        const diff = (7 - currentDay) + firstDay + ((interval - 1) * 7);
                        nextFake = addDays(fakeLocal, diff);
                    }
                } else {
                    nextFake = addWeeks(fakeLocal, interval);
                }
                break;
            case 'monthly': nextFake = addMonths(fakeLocal, interval); break;
            case 'yearly': nextFake = addYears(fakeLocal, interval); break;
            default: nextFake = addDays(fakeLocal, interval);
        }

        // Convert back to UTC Midnight
        // nextFake is e.g. Feb 29 12:00 Local
        return Date.UTC(nextFake.getFullYear(), nextFake.getMonth(), nextFake.getDate());
    }
    else {
        // --- ON COMPLETION (Local Logic) ---
        // Basis: completionDate
        const baseDate = new Date(completionDate);

        let nextDate: Date;
        switch (config.frequency) {
            case 'daily': nextDate = addDays(baseDate, interval); break;
            case 'weekly':
                if (config.daysOfWeek && config.daysOfWeek.length > 0) {
                    // Same logic, but on real Local date
                    const sortedDays = [...config.daysOfWeek].sort((a, b) => a - b);
                    const currentDay = getDay(baseDate);
                    const nextDayInWeek = sortedDays.find(d => d > currentDay);
                    if (nextDayInWeek !== undefined) {
                        nextDate = addDays(baseDate, nextDayInWeek - currentDay);
                    } else {
                        const firstDay = sortedDays[0];
                        const diff = (7 - currentDay) + firstDay + ((interval - 1) * 7);
                        nextDate = addDays(baseDate, diff);
                    }
                } else {
                    nextDate = addWeeks(baseDate, interval);
                }
                break;
            case 'monthly': nextDate = addMonths(baseDate, interval); break;
            case 'yearly': nextDate = addYears(baseDate, interval); break;
            default: nextDate = addDays(baseDate, interval);
        }

        return nextDate.getTime();
    }
};

export const shouldRecur = (task: Task): boolean => {
    if (!task.recurrence) return false;
    if (task.recurrence.endCondition) {
        const { type, value } = task.recurrence.endCondition;
        if (type === 'date' && value && Date.now() > value) return false;
    }
    return true;
};
