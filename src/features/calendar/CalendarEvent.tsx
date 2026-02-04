import type { Task } from '../../core/types';
import { Clock } from 'lucide-react';
import { format, isValid } from 'date-fns';
import clsx from 'clsx';
import { useMemo } from 'react';

interface CalendarEventProps {
    task: Task & { colIndex?: number; totalCols?: number };
    team: Record<string, any>;
    resizing: { taskId: string } | null;
    resizePreview: { id: string; mins: number; topOffset?: number } | null;
    onMouseDownTop: (e: React.MouseEvent, task: Task) => void;
    onMouseDownBottom: (e: React.MouseEvent, task: Task) => void;
    onClick: (e: React.MouseEvent) => void;
    onDoubleClick: (e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
}

export function CalendarEvent({
    task,
    team,
    resizing,
    resizePreview,
    onMouseDownTop,
    onMouseDownBottom,
    onClick,
    onDoubleClick,
    onDragStart
}: CalendarEventProps) {
    const isDone = task.status === 'done';
    const isResizingThis = resizing?.taskId === task.id;

    const style = useMemo(() => {
        try {
            if (!task.dueDate) return { display: 'none' };
            const date = new Date(task.dueDate);
            if (!isValid(date)) return { display: 'none' };

            let startMin = date.getHours() * 60 + date.getMinutes();
            let durationMinutes = task.estimatedMinutes || 60;

            if (resizePreview && resizePreview.id === task.id) {
                durationMinutes = resizePreview.mins;
                if (resizePreview.topOffset !== undefined) {
                    startMin += resizePreview.topOffset;
                }
            }

            const top = (startMin / 60) * 80;
            const height = Math.max((durationMinutes / 60) * 80, 24); // Min height 24px

            const width = 100 / (task.totalCols || 1);
            const left = (task.colIndex || 0) * width;

            return {
                top: `${top}px`,
                height: `${height}px`,
                left: `calc(${left}% + 2px)`,
                width: `calc(${width}% - 4px)`,
                position: 'absolute' as const,
                zIndex: (task.colIndex || 0) + (isResizingThis ? 1000 : 10),
                opacity: isResizingThis ? 0.8 : 1,
                userSelect: 'none' as const,
                cursor: resizing ? 'grabbing' : 'pointer',
                display: 'block' // Explicitly set display
            };
        } catch (e) {
            return { display: 'none' };
        }
    }, [task, resizePreview, isResizingThis, resizing]);


    // Determine card style based on state
    let cardStyle = "bg-bg-card border-border-subtle text-text-primary";
    if (isDone) {
        cardStyle = "bg-bg-input/50 dashed border-border-subtle text-text-muted decoration-slate-400";
    } else if (task.priority === 'critical') {
        cardStyle = "bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-200 shadow-sm shadow-red-900/5 backdrop-blur-sm hover:bg-red-500/30";
    } else if (task.priority === 'high') {
        cardStyle = "bg-orange-500/20 border-orange-500/50 text-orange-700 dark:text-orange-200 shadow-sm shadow-orange-900/5 backdrop-blur-sm hover:bg-orange-500/30";
    } else if (task.priority === 'medium') {
        cardStyle = "bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-200 shadow-sm shadow-blue-900/5 backdrop-blur-sm hover:bg-blue-500/30";
    }

    const members = (task.assigneeIds || []).map(id => team[id]).filter(Boolean);

    return (
        <div
            draggable={!resizing}
            onDragStart={onDragStart}
            onClick={(e) => { e.stopPropagation(); onClick(e); }}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(e); }}
            className={clsx(
                "rounded-md p-1.5 text-[10px] border cursor-pointer hover:z-[100] transition-all group/card select-none overflow-hidden flex flex-col gap-0.5",
                "hover:shadow-lg hover:ring-1 hover:ring-primary/30",
                cardStyle,
                isResizingThis && "ring-2 ring-accent-primary z-[500]"
            )}
            style={style as any}
            title={`${task.title} - ${task.status}`}
        >
            {/* Resize Handles */}
            <div
                className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-white/40 z-50 transition-colors"
                onMouseDown={(e) => onMouseDownTop(e, task)}
            />
            <div
                className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-white/40 z-50 transition-colors"
                onMouseDown={(e) => onMouseDownBottom(e, task)}
            />

            {/* Title */}
            <div className="flex items-start justify-between gap-1">
                <div className={clsx("font-bold truncate leading-tight", isDone && "line-through")}>
                    {task.title}
                </div>
            </div>

            {/* Metadata (Time & Avatars) */}
            <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-1 opacity-90 scale-90 origin-left">
                    <div className="flex items-center gap-0.5 font-medium whitespace-nowrap">
                        <Clock size={8} />
                        <span>
                            {task.dueDate && format(new Date(task.dueDate), 'HH:mm')}
                        </span>
                    </div>
                    {!isDone && (
                        <span className="text-[8px] uppercase font-bold opacity-70 tracking-tighter border border-current px-0.5 rounded leading-none">
                            {task.status?.replace('_', ' ')}
                        </span>
                    )}
                </div>

                {members.length > 0 && (
                    <div className="flex -space-x-1 shrink-0">
                        {members.slice(0, 2).map((member: any) => (
                            <div key={member.id} className="w-3.5 h-3.5 rounded-full border border-white/50 bg-bg-card relative z-10" title={member.name}>
                                <img
                                    src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`}
                                    alt={member.name}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
