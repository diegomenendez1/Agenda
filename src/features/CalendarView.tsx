import { useState, useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay, getHours, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../core/store';

export function CalendarView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

    const { tasks, updateTask, user } = useStore();
    const today = new Date();

    const nextWeek = () => setCurrentDate(d => addWeeks(d, 1));
    const prevWeek = () => setCurrentDate(d => subWeeks(d, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Mapping tasks to calendar grid
    const tasksOnCalendar = useMemo(() => {
        if (!user) return [];
        return Object.values(tasks).filter(task => {
            if (!task.dueDate || task.status === 'done') return false;

            // Visibility Check
            const isOwner = task.ownerId === user.id;
            const isAssignee = task.assigneeIds?.includes(user.id);
            if (!isOwner && !isAssignee) return false;

            const hour = getHours(task.dueDate);
            return hour >= 6 && hour <= 21;
        });
    }, [tasks, user]);

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

        const newDate = new Date(day);
        newDate.setHours(hour, 0, 0, 0);

        updateTask(taskId, { dueDate: newDate.getTime() });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-bg-app">

            {/* Control Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-bg-card border-b border-border-subtle shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-display font-bold text-text-primary capitalize min-w-[200px]">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-1 bg-bg-input rounded-lg p-1 border border-border-subtle">
                        <button onClick={prevWeek} className="p-1 hover:bg-bg-card hover:text-accent-primary rounded-md transition-colors text-text-muted">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={goToToday} className="px-3 py-1 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors">
                            Today
                        </button>
                        <button onClick={nextWeek} className="p-1 hover:bg-bg-card hover:text-accent-primary rounded-md transition-colors text-text-muted">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Header - Days */}
            <div className="grid grid-cols-8 border-b border-border-subtle bg-bg-card shadow-sm z-10 shrink-0">
                <div className="p-4 border-r border-border-subtle text-[10px] font-bold tracking-widest text-text-muted uppercase text-center pt-8 bg-bg-sidebar/50">
                    GMT-5
                </div>
                {weekDays.map(day => {
                    const isToday = isSameDay(day, today);
                    return (
                        <div key={day.toString()} className={clsx("p-3 text-center border-r border-border-subtle last:border-r-0 min-w-[120px]", isToday ? "bg-accent-primary/5" : "bg-bg-card")}>
                            <div className={clsx("text-xs font-bold uppercase mb-1.5 tracking-wider", isToday ? "text-accent-primary" : "text-text-muted")}>
                                {format(day, 'EEE')}
                            </div>
                            <div className={clsx("text-xl font-display font-bold rounded-full w-10 h-10 flex items-center justify-center mx-auto transition-all", isToday ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/30" : "text-text-primary")}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-8 relative min-h-[1000px]">
                    {/* Time labels */}
                    <div className="border-r border-border-subtle bg-bg-sidebar/30">
                        {hours.map(hour => (
                            <div key={hour} className="h-20 border-b border-border-subtle text-xs font-medium text-text-muted text-right pr-3 -mt-2 uppercase tracking-wider relative group">
                                <span className="relative z-10">{hour}:00</span>
                            </div>
                        ))}
                    </div>

                    {/* Days Columns */}
                    {weekDays.map((day, dayIdx) => (
                        <div key={day.toString()} className="border-r border-border-subtle bg-bg-app relative group">
                            {/* Hour Cells */}
                            {hours.map(hour => (
                                <div
                                    key={`${dayIdx}-${hour}`}
                                    className="h-20 border-b border-border-subtle/40 hover:bg-accent-primary/5 transition-colors"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, day, hour)}
                                >
                                </div>
                            ))}

                            {/* Tasks overlapping the grid */}
                            {(() => {
                                const dayTasks = tasksOnCalendar
                                    .filter(task => isSameDay(new Date(task.dueDate!), day))
                                    .sort((a, b) => a.dueDate! - b.dueDate!);

                                // Group tasks into overlapping bubbles
                                const bubbles: any[][] = [];
                                dayTasks.forEach(task => {
                                    let placed = false;
                                    for (const bubble of bubbles) {
                                        // Simple overlap check: within 1 hour of any task in bubble
                                        const overlaps = bubble.some(t => {
                                            const start1 = t.dueDate!;
                                            const end1 = t.dueDate! + (60 * 60 * 1000);
                                            const start2 = task.dueDate!;
                                            const end2 = task.dueDate! + (60 * 60 * 1000);
                                            return start1 < end2 && start2 < end1;
                                        });
                                        if (overlaps) {
                                            bubble.push(task);
                                            placed = true;
                                            break;
                                        }
                                    }
                                    if (!placed) bubbles.push([task]);
                                });

                                return bubbles.flatMap(bubble => {
                                    return bubble.map((task, idx) => {
                                        const date = new Date(task.dueDate!);
                                        const hour = date.getHours();
                                        const minutes = date.getMinutes();
                                        const topOffset = ((hour - 6) * 80) + ((minutes / 60) * 80);

                                        const width = 100 / bubble.length;
                                        const left = idx * width;

                                        return (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task.id)}
                                                className={clsx(
                                                    "absolute rounded-lg px-2.5 py-1.5 text-xs font-medium overflow-hidden hover:z-20 hover:scale-[1.02] transition-all cursor-grab active:cursor-grabbing shadow-sm border-l-[3px]",
                                                    task.priority === 'critical' ? "bg-red-500/10 border-red-500 text-red-700 dark:text-red-300" :
                                                        task.priority === 'high' ? "bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-300" :
                                                            "bg-accent-primary/10 border-accent-primary text-accent-primary"
                                                )}
                                                style={{
                                                    top: `${topOffset}px`,
                                                    height: '75px',
                                                    left: `${left}%`,
                                                    width: `${width}%`
                                                }}
                                                title={task.title}
                                            >
                                                <div className="font-bold truncate text-[13px]">{task.title}</div>
                                                <div className="opacity-80 mt-0.5 font-medium">{format(date, 'h:mm a')}</div>
                                            </div>
                                        );
                                    });
                                });
                            })()}

                            {/* Current Time Indicator */}
                            {isSameDay(day, today) && (
                                <div
                                    className="absolute z-10 w-full left-0 border-t-2 border-red-500 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                    style={{ top: `${((today.getHours() - 6) * 80) + ((today.getMinutes() / 60) * 80)}px` }}
                                >
                                    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
