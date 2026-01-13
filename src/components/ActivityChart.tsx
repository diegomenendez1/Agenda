import { useMemo } from 'react';
import { format, subDays, isSameDay } from 'date-fns';
import clsx from 'clsx';
import type { Task } from '../core/types';

interface ActivityChartProps {
    tasks: Task[];
    days?: number;
    height?: number;
    className?: string;
}

export function ActivityChart({ tasks, days = 14, height = 120, className }: ActivityChartProps) {
    const data = useMemo(() => {
        const result = [];
        const today = new Date();

        // Generate last N days
        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(today, i);
            const count = tasks.filter(t =>
                t.status === 'done' &&
                t.updatedAt &&
                isSameDay(new Date(t.updatedAt), date)
            ).length;

            result.push({
                date,
                count,
                label: format(date, 'MMM d')
            });
        }
        return result;
    }, [tasks, days]);

    const maxCount = Math.max(...data.map(d => d.count), 1); // Avoid division by zero

    // Bar width calculation


    return (
        <div className={clsx("w-full select-none", className)}>
            <div className="flex justify-between items-end gap-1" style={{ height: `${height}px` }}>
                {data.map((d, i) => {
                    const heightPct = (d.count / maxCount) * 100;

                    return (
                        <div
                            key={i}
                            className="group relative flex flex-col justify-end h-full flex-1 hover:bg-bg-input/50 rounded-lg transition-colors cursor-pointer"
                        >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-lg border border-border-subtle whitespace-nowrap">
                                    <span className="font-bold block text-center">{d.count} tasks</span>
                                    <span className="text-muted-foreground">{d.label}</span>
                                </div>
                            </div>

                            {/* Bar */}
                            <div className="relative w-full px-1">
                                <div
                                    className={clsx(
                                        "w-full rounded-t-sm transition-all duration-500 ease-out",
                                        d.count > 0 ? "bg-accent-primary opacity-80 group-hover:opacity-100" : "bg-bg-input h-1 opacity-30"
                                    )}
                                    style={{
                                        height: d.count > 0 ? `${heightPct}%` : '4px',
                                        minHeight: d.count > 0 ? '4px' : '4px'
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* X Axis Labels (simplify to show every 3rd or just start/end) */}
            <div className="flex justify-between mt-2 text-xs text-muted font-mono">
                <span>{data[0]?.label}</span>
                <span>{data[Math.floor(data.length / 2)]?.label}</span>
                <span>{data[data.length - 1]?.label}</span>
            </div>
        </div>
    );
}
