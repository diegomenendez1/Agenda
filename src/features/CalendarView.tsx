import { useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay, getHours } from 'date-fns';
import clsx from 'clsx';
import { useStore } from '../core/store';

export function CalendarView() {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

    const { tasks, updateTask } = useStore();

    // Map tasks to grid positions
    // This is a naive implementation assuming task.dueDate maps to the start time block
    const tasksOnCalendar = useMemo(() => {
        return Object.values(tasks).filter(task => {
            if (!task.dueDate || task.status === 'done') return false;
            // Only show if it's within the displayed hour range (6-21)
            const hour = getHours(task.dueDate);
            return hour >= 6 && hour <= 21;
        });
    }, [tasks]);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        // Create new date object with dropped day and hour
        const newDate = new Date(day);
        newDate.setHours(hour, 0, 0, 0);

        updateTask(taskId, { dueDate: newDate.getTime() });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* Header - Days */}
            <div className="grid grid-cols-8 border-b border-border-subtle bg-bg-sidebar">
                <div className="p-4 border-r border-border-subtle text-xs text-muted font-medium uppercase text-center pt-8">
                    GMT-5
                </div>
                {weekDays.map(day => {
                    const isToday = isSameDay(day, today);
                    return (
                        <div key={day.toString()} className={clsx("p-4 text-center border-r border-border-subtle last:border-r-0 min-w-[120px]", isToday && "bg-bg-card")}>
                            <div className={clsx("text-xs font-medium uppercase mb-1", isToday ? "text-accent-primary" : "text-muted")}>
                                {format(day, 'EEE')}
                            </div>
                            <div className={clsx("text-xl font-bold rounded-full w-10 h-10 flex items-center justify-center mx-auto", isToday && "bg-accent-primary text-white")}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-8 relative min-h-[1000px]">
                    {/* Time labels */}
                    <div className="border-r border-border-subtle bg-bg-sidebar">
                        {hours.map(hour => (
                            <div key={hour} className="h-20 border-b border-border-subtle text-xs text-muted text-right pr-3 -mt-2.5">
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    {/* Days Columns */}
                    {weekDays.map((day, dayIdx) => (
                        <div key={day.toString()} className="border-r border-border-subtle hover:bg-bg-card-hover/20 transition-colors relative">
                            {hours.map(hour => (
                                <div
                                    key={`${dayIdx}-${hour}`}
                                    className="h-20 border-b border-border-subtle/50 border-dashed"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, day, hour)}
                                >
                                    {/* Empty slots for now */}
                                </div>
                            ))}

                            {/* Render Tasks for this Day */}
                            {tasksOnCalendar
                                .filter(task => isSameDay(new Date(task.dueDate!), day))
                                .map(task => {
                                    const date = new Date(task.dueDate!);
                                    const hour = date.getHours();
                                    const minutes = date.getMinutes();
                                    // Calculate top position relative to 6 AM start, 80px per hour
                                    const topOffset = ((hour - 6) * 80) + ((minutes / 60) * 80);

                                    return (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            className="absolute left-1 right-1 rounded px-2 py-1 text-xs font-medium bg-accent-primary/20 border-l-2 border-accent-primary text-text-primary overflow-hidden hover:z-20 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                                            style={{
                                                top: `${topOffset}px`,
                                                height: '75px' // Fixed height for now
                                            }}
                                            title={task.title}
                                        >
                                            <div className="font-semibold truncate">{task.title}</div>
                                            <div className="text-secondary opacity-75">{format(date, 'h:mm a')}</div>
                                        </div>
                                    );
                                })
                            }

                            {/* Current Time Indicator (if today) */}
                            {isSameDay(day, today) && (
                                <div
                                    className="absolute z-10 w-full left-0 border-t-2 border-danger pointer-events-none"
                                    style={{ top: `${((today.getHours() - 6) * 80) + ((today.getMinutes() / 60) * 80)}px` }}
                                >
                                    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-danger"></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
