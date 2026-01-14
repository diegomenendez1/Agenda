
import { describe, it, expect } from 'vitest';
import { calculateNextDueDate } from '../src/core/recurrenceUtils';
import { addDays, addWeeks, addYears, addMonths } from 'date-fns';

describe('Recurrence Logic Stress Test (recurrenceUtils)', () => {

    describe('on_schedule vs on_completion', () => {
        it('on_schedule: should strictly follow the schedule ignoring delay', () => {
            const config = { frequency: 'daily', interval: 1, type: 'on_schedule' } as const;
            // Jan 1st 2024 (Noon - Safe)
            const lastDueDate = new Date('2024-01-01T12:00:00').getTime();
            // Completed Jan 3rd
            const completionDate = new Date('2024-01-03T12:00:00').getTime();

            const nextDue = calculateNextDueDate(config, lastDueDate, completionDate);

            try {
                // Expect Jan 2nd
                expect(new Date(nextDue).toISOString().split('T')[0]).toBe('2024-01-02');
            } catch (e: any) {
                console.error('FAIL on_schedule:', e.message, 'Actual:', new Date(nextDue).toISOString());
                throw e;
            }
        });

        it('on_completion: should calculate from completion date', () => {
            const config = { frequency: 'daily', interval: 1, type: 'on_completion' } as const;
            const lastDueDate = new Date('2024-01-01T12:00:00').getTime();
            const completionDate = new Date('2024-01-03T12:00:00').getTime();

            const nextDue = calculateNextDueDate(config, lastDueDate, completionDate);

            try {
                // Expect Jan 4th
                expect(new Date(nextDue).toISOString().split('T')[0]).toBe('2024-01-04');
            } catch (e: any) {
                console.error('FAIL on_completion:', e.message, 'Actual:', new Date(nextDue).toISOString());
                throw e;
            }
        });
    });

    describe('Complex Weekly Recurrence', () => {
        it('should correctly handle MWF recurrences (Mon -> Wed)', () => {
            const config = { frequency: 'weekly', interval: 1, daysOfWeek: [1, 3, 5], type: 'on_schedule' } as const;
            const lastDueDate = new Date('2024-01-01T12:00:00').getTime(); // Mon

            const nextDue = calculateNextDueDate(config, lastDueDate);
            try {
                expect(new Date(nextDue).toISOString().split('T')[0]).toBe('2024-01-03');
            } catch (e: any) {
                console.error('FAIL MWF Mon->Wed:', e.message, 'Actual:', new Date(nextDue).toISOString());
                throw e;
            }
        });

        it('should correctly handle MWF recurrence (Fri -> Next Mon)', () => {
            const config = { frequency: 'weekly', interval: 1, daysOfWeek: [1, 3, 5], type: 'on_schedule' } as const;
            const lastDueDate = new Date('2024-01-05T12:00:00').getTime(); // Fri

            const nextDue = calculateNextDueDate(config, lastDueDate);
            try {
                expect(new Date(nextDue).toISOString().split('T')[0]).toBe('2024-01-08');
            } catch (e: any) {
                console.error('FAIL MWF Fri->Mon:', e.message, 'Actual:', new Date(nextDue).toISOString());
                throw e;
            }
        });
    });

    describe('Edge Cases & Month Boundaries', () => {
        it('Monthly: Jan 31st + 1 month should handle February correctly', () => {
            const config = { frequency: 'monthly', interval: 1, type: 'on_schedule' } as const;
            // Jan 31 2024 UTC
            const lastDueDate = new Date('2024-01-31T00:00:00Z').getTime();

            const nextDue = calculateNextDueDate(config, lastDueDate);
            try {
                expect(new Date(nextDue).toISOString().split('T')[0]).toBe('2024-02-29');
            } catch (e: any) {
                console.error('FAIL MonthEnd:', e.message, 'Actual:', new Date(nextDue).toISOString());
                throw e;
            }
        });

        it('Leap Year: Feb 29 2024 + 1 year should be Feb 28 2025', () => {
            const config = { frequency: 'yearly', interval: 1, type: 'on_schedule' } as const;
            const lastDueDate = new Date('2024-02-29T12:00:00').getTime();

            const nextDue = calculateNextDueDate(config, lastDueDate);
            try {
                expect(new Date(nextDue).toISOString().split('T')[0]).toBe('2025-02-28');
            } catch (e: any) {
                console.error('FAIL LeapYear:', e.message, 'Actual:', new Date(nextDue).toISOString());
                throw e;
            }
        });
    });
});
