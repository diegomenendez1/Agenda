import { useMemo } from 'react';
import { format } from 'date-fns';
import { eachDayOfInterval } from 'date-fns';

import { addDays } from 'date-fns';
import clsx from 'clsx';
import type { Task } from '../core/types';

interface BurndownChartProps {
    tasks: Task[];
    startDate?: number; // timestamp
    endDate?: number;   // timestamp
    height?: number;
    className?: string;
}

export function BurndownChart({ tasks, startDate, endDate, height = 200, className }: BurndownChartProps) {
    const data = useMemo(() => {
        if (!startDate) return [];

        // Define timeline
        // If no endDate, project 1 week from start or look at due dates
        const effectiveEndDate = endDate || addDays(new Date(startDate), 14).getTime();

        let days;
        try {
            days = eachDayOfInterval({
                start: new Date(startDate),
                end: new Date(effectiveEndDate)
            });
        } catch (e) {
            // Fallback for invalid intervals
            return [];
        }

        const totalTasks = tasks.length;
        if (totalTasks === 0) return [];

        return days.map((day, index) => {
            // How many tasks were done ON or BEFORE this day?
            // Actually burndown tracks REMAINING.
            // So we need to subtract tasks completed precisely on this day.

            const tasksCompletedByNow = tasks.filter(t =>
                t.status === 'done' &&
                t.updatedAt &&
                new Date(t.updatedAt) <= day
            ).length;

            const remainingActual = totalTasks - tasksCompletedByNow;

            // Ideal line: Straight line from Total down to 0
            const ideal = totalTasks - (index * (totalTasks / (days.length - 1)));

            // Only show actual for past/today
            const isFuture = day > new Date();

            return {
                date: day,
                label: format(day, 'd MMM'),
                ideal,
                actual: isFuture ? null : remainingActual
            };
        });
    }, [tasks, startDate, endDate]);

    if (data.length < 2) {
        return <div className="h-full flex items-center justify-center text-muted italic">Not enough data for Burn-down</div>;
    }

    const maxY = Math.max(...data.map(d => Math.max(d.ideal, d.actual || 0)));
    const pointsActual = data
        .filter(d => d.actual !== null)
        .map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((d.actual! / maxY) * 100);
            return `${x},${y}`;
        }).join(' ');

    const pointsIdeal = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.ideal / maxY) * 100);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className={clsx("w-full relative", className)} style={{ height: `${height}px` }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                {/* Grid Lines (simplified) */}
                <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

                {/* Ideal Line (Dashed) */}
                <polyline
                    points={pointsIdeal}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.3"
                    strokeDasharray="4"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Actual Line (Solid) */}
                <polyline
                    points={pointsActual}
                    fill="none"
                    stroke="var(--color-accent-primary)" // Needs CSS var or specific color class
                    className="text-accent-primary"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Endpoint Dot */}
                {/* Could add circles at points if needed */}
            </svg>

            {/* Legend / Tooltips could go here, keeping it simple for now */}
            <div className="absolute -bottom-6 w-full flex justify-between text-xs text-muted font-mono">
                <span>{data[0].label}</span>
                <span>{data[data.length - 1].label}</span>
            </div>
        </div>
    );
}
