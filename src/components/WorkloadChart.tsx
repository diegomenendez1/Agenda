import { useMemo } from 'react';
import type { Task, TeamMember } from '../core/types';
import clsx from 'clsx';

interface WorkloadChartProps {
    tasks: Task[];
    team: Record<string, TeamMember>;
    className?: string;
}

export function WorkloadChart({ tasks, team, className }: WorkloadChartProps) {
    const data = useMemo(() => {
        const memberStats = Object.values(team).map(member => {
            const memberTasks = tasks.filter(t => {
                if (t.status === 'done') return false;
                
                // QA-03 FIX: Normalizar carga.
                // Una tarea solo cuenta para quien debe ejecutarla.
                // Prioridad: 
                // 1. Si hay asignados, cuenta SOLO para los asignados.
                // 2. Si no hay asignados, cuenta para el owner.
                const hasAssignees = t.assigneeIds && t.assigneeIds.length > 0;
                
                if (hasAssignees) {
                    return t.assigneeIds.includes(member.id);
                }
                
                return t.ownerId === member.id;
            });

            const count = memberTasks.length;
            const highPri = memberTasks.filter(t => t.priority === 'high' || t.priority === 'critical').length;

            return {
                member,
                count,
                highPri
            };
        });

        // Sort by load
        return memberStats.sort((a, b) => b.count - a.count);
    }, [tasks, team]);

    const maxLoad = Math.max(...data.map(d => d.count), 1);

    return (
        <div className={clsx("w-full space-y-4", className)}>
            {data.map(({ member, count, highPri }) => (
                <div key={member.id} className="group">
                    <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary">{member.name}</span>
                            {highPri > 0 && (
                                <span className="text-xs text-amber-500 bg-amber-500/10 px-1.5 rounded flex items-center gap-1">
                                    {highPri} high pri
                                </span>
                            )}
                        </div>
                        <span className="text-muted">{count} tasks</span>
                    </div>

                    <div className="h-2 w-full bg-bg-input rounded-full overflow-hidden flex">
                        {/* High Priority Segment */}
                        {highPri > 0 && (
                            <div
                                className="h-full bg-amber-500"
                                style={{ width: `${(highPri / maxLoad) * 100}%` }}
                            />
                        )}
                        {/* Normal Segment */}
                        <div
                            className="h-full bg-blue-500/50"
                            style={{ width: `${((count - highPri) / maxLoad) * 100}%` }}
                        />
                    </div>
                </div>
            ))}

            {data.length === 0 && (
                <div className="text-center text-muted text-sm py-4">No active team members found.</div>
            )}
        </div>
    );
}
