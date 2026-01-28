import clsx from 'clsx';
import { useMemo } from 'react';

// --- Types ---
interface ChartProps {
    className?: string;
    height?: number;
}

interface VelocityChartProps extends ChartProps {
    data: { label: string; created: number; completed: number }[];
}

interface WorkloadChartProps extends ChartProps {
    data: { id: string; name: string; avatar?: string; total: number; completed: number; overdue: number }[];
}

interface StatusChartProps extends ChartProps {
    data: { status: string; count: number; color: string }[];
}


// --- 1. Velocity Chart (Grouped Bar) ---
export function VelocityChart({ data, height = 200, className }: VelocityChartProps) {
    const maxCount = useMemo(() => Math.max(1, ...data.map(d => Math.max(d.created, d.completed))), [data]);

    return (
        <div className={clsx("w-full flex flex-col", className)}>
            <div className="flex items-end justify-between gap-2 flex-1" style={{ height: `${height}px` }}>
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-popover text-popover-foreground text-xs rounded border border-border-subtle shadow-lg p-2 whitespace-nowrap">
                            <div className="font-bold">{d.label}</div>
                            <div className="flex items-center gap-2 text-accent-primary">
                                <span className="w-2 h-2 rounded-full bg-current" />
                                Created: {d.created}
                            </div>
                            <div className="flex items-center gap-2 text-emerald-500">
                                <span className="w-2 h-2 rounded-full bg-current" />
                                Completed: {d.completed}
                            </div>
                        </div>

                        {/* Bars Container */}
                        <div className="flex gap-0.5 w-full justify-center items-end h-full">
                            {/* Created Bar */}
                            <div
                                className="w-1.5 md:w-3 bg-accent-primary/60 rounded-t-sm transition-all duration-500 hover:bg-accent-primary"
                                style={{ height: `${(d.created / maxCount) * 100}%`, minHeight: '2px' }}
                            />
                            {/* Completed Bar */}
                            <div
                                className="w-1.5 md:w-3 bg-emerald-500/60 rounded-t-sm transition-all duration-500 hover:bg-emerald-500"
                                style={{ height: `${(d.completed / maxCount) * 100}%`, minHeight: '2px' }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {/* Labels */}
            <div className="flex justify-between mt-3 text-[10px] text-text-muted uppercase font-medium tracking-wider">
                <span>{data[0]?.label}</span>
                <span>{data[data.length - 1]?.label}</span>
            </div>
        </div>
    );
}

// --- 2. Workload Chart (Horizontal Bars) ---
export function WorkloadChart({ data, className }: WorkloadChartProps) {
    const maxTotal = useMemo(() => Math.max(1, ...data.map(d => d.total)), [data]);

    return (
        <div className={clsx("space-y-4", className)}>
            {data.map(member => (
                <div key={member.id} className="group">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-accent-primary/10 overflow-hidden flex items-center justify-center text-[10px] text-accent-primary font-bold">
                                {member.avatar ? (
                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                    member.name[0]
                                )}
                            </div>
                            <span className="font-medium text-text-secondary group-hover:text-text-primary transition-colors">{member.name}</span>
                        </div>
                        <span className="text-xs text-text-muted">{member.completed}/{member.total} Tasks</span>
                    </div>

                    <div className="h-2.5 w-full bg-bg-input rounded-full overflow-hidden flex">
                        {/* Completed Segment */}
                        <div
                            className="bg-emerald-500/80 group-hover:bg-emerald-500 transition-colors"
                            style={{ width: `${(member.completed / maxTotal) * 100}%` }}
                        />
                        {/* Overdue Segment */}
                        <div
                            className="bg-red-500/80 group-hover:bg-red-500 transition-colors"
                            style={{ width: `${(member.overdue / maxTotal) * 100}%` }}
                        />
                        {/* Remaining (Implicit space) */}
                        <div
                            className="bg-accent-primary/30 group-hover:bg-accent-primary/50 transition-colors"
                            style={{ width: `${((member.total - member.completed - member.overdue) / maxTotal) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

// --- 3. Status Chart (Donut / Segmented) ---
export function StatusChart({ data, height = 160, className }: StatusChartProps) {
    const total = useMemo(() => data.reduce((acc, curr) => acc + curr.count, 0), [data]);

    // Calculate conic-gradient segments
    const gradient = useMemo(() => {
        let currentDeg = 0;
        return data.map(d => {
            const deg = (d.count / total) * 360;
            const segment = `${d.color} ${currentDeg}deg ${currentDeg + deg}deg`;
            currentDeg += deg;
            return segment;
        }).join(', ');
    }, [data, total]);

    if (total === 0) {
        return <div className="h-full flex items-center justify-center text-text-muted text-sm">No data available</div>;
    }

    return (
        <div className={clsx("flex items-center gap-8", className)}>
            {/* Donut */}
            <div
                className="rounded-full relative shrink-0"
                style={{
                    width: height,
                    height: height,
                    background: `conic-gradient(${gradient})`
                }}
            >
                <div className="absolute inset-4 bg-bg-card rounded-full flex items-center justify-center flex-col">
                    <span className="text-3xl font-bold text-text-primary">{total}</span>
                    <span className="text-xs text-text-muted uppercase tracking-wider">Total</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2 flex-1">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                            <span className="text-text-secondary">{d.status}</span>
                        </div>
                        <span className="font-medium text-text-primary">{Math.round((d.count / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
