import { useState, useEffect, Component, type ErrorInfo, type ReactNode, lazy, Suspense } from 'react';
import { startOfWeek, addDays, format, isSameDay, setHours } from 'date-fns';
import { Plus, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';
import type { Task } from '../../core/types';

import { useCalendarLayout } from './useCalendarLayout';
import { CalendarHeader } from './CalendarHeader';
import { CalendarEvent } from './CalendarEvent';

// Lazy load
const EditTaskModal = lazy(() => import('../tasks/EditTaskModal').then(m => ({ default: m.EditTaskModal })));

// --- Error Boundary ---
class LocalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Safe console error
        if (import.meta.env.DEV) {
            console.error("CalendarView Crash:", error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-10 text-red-600 bg-red-500/10">
                    <AlertCircle size={48} className="mb-4 text-red-500" />
                    <h2 className="font-bold text-lg mb-2">Calendar Error</h2>
                    <p className="text-sm text-text-muted mb-4 text-center max-w-md">
                        {this.state.error?.message || "Unknown error occurred"}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="px-4 py-2 bg-bg-card border border-red-200 rounded shadow-sm hover:bg-red-500/10 text-sm font-medium"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export function CalendarView() {
    return (
        <LocalErrorBoundary>
            <CalendarContent />
        </LocalErrorBoundary>
    );
}

function CalendarContent() {
    const { tasks, updateTask, team, user } = useStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [creationDate, setCreationDate] = useState<Date | null>(null);
    const [filterMode, setFilterMode] = useState<'all' | 'me'>('all');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    // --- Resizing State ---
    const [resizing, setResizing] = useState<{
        taskId: string;
        type: 'top' | 'bottom';
        initialY: number;
        initialValue: number;
    } | null>(null);

    const [resizePreview, setResizePreview] = useState<{ id: string, mins: number, topOffset?: number } | null>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Layout Handling ---
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const today = new Date();
    const workingStart = user?.preferences?.workingHours?.start ?? 9;
    const workingEnd = user?.preferences?.workingHours?.end ?? 18;
    const weekDays = isMobile ? [currentDate] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const { getPositionedTasks } = useCalendarLayout(
        tasks,
        currentDate,
        weekStart,

        filterMode,
        user,
        isMobile
    );
    // const getPositionedTasks = (day: Date) => []; // Safe Mode

    // --- Resizing Logic ---
    useEffect(() => {
        if (!resizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = e.clientY - resizing.initialY;
            const deltaMins = Math.round((deltaY / 80) * 60 / 15) * 15; // 80px per hour

            if (resizing.type === 'bottom') {
                const newMins = Math.max(resizing.initialValue + deltaMins, 15);
                setResizePreview({ id: resizing.taskId, mins: newMins });
            } else {
                const newMins = Math.max(resizing.initialValue - deltaMins, 15);
                setResizePreview({ id: resizing.taskId, mins: newMins, topOffset: deltaMins });
            }
        };

        const handleMouseUp = async (e: MouseEvent) => {
            const deltaY = e.clientY - resizing.initialY;
            const deltaMins = Math.round((deltaY / 80) * 60 / 15) * 15;
            const task = tasks[resizing.taskId];

            if (task) {
                if (resizing.type === 'bottom') {
                    const newMins = Math.max(resizing.initialValue + deltaMins, 15);
                    await updateTask(task.id, { estimatedMinutes: newMins });
                } else {
                    const newDate = new Date(task.dueDate || Date.now());
                    newDate.setMinutes(newDate.getMinutes() + deltaMins);
                    const newMins = Math.max((task.estimatedMinutes || 60) - deltaMins, 15);
                    await updateTask(task.id, {
                        dueDate: newDate.getTime(),
                        estimatedMinutes: newMins
                    });
                }
            }
            setResizing(null);
            setResizePreview(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, tasks, updateTask]);

    // --- Interactions ---
    const handleSlotClick = (day: Date, hour: number) => {
        const d = new Date(day);
        d.setHours(hour, 0, 0, 0);
        setCreationDate(d);
    };

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e: React.DragEvent, day: Date, hour: number) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks[taskId];
        if (task) {
            try {
                const newDate = new Date(day);
                newDate.setHours(hour, 0, 0, 0);
                await updateTask(task.id, { dueDate: newDate.getTime() });
            } catch (err) {
                console.error("Failed to move task", err);
            }
        }
    };

    // --- Handlers for Event Component ---
    const onMouseDownTop = (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();
        setResizing({
            taskId: task.id,
            type: 'top',
            initialY: e.clientY,
            initialValue: task.estimatedMinutes || 60
        });
    };

    const onMouseDownBottom = (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();
        setResizing({
            taskId: task.id,
            type: 'bottom',
            initialY: e.clientY,
            initialValue: task.estimatedMinutes || 60
        });
    };

    return (
        <div id="calendar-view" className="flex flex-col h-full overflow-hidden bg-bg-app">
            <CalendarHeader
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                filterMode={filterMode}
                setFilterMode={setFilterMode}
                isMobile={isMobile}
            />

            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Days Header */}
                <div
                    className="grid border-b border-border-subtle bg-bg-card z-10 shadow-sm shrink-0"
                    style={{ gridTemplateColumns: `60px repeat(${weekDays.length}, 1fr)` }}
                >
                    <div className="p-4 border-r border-border-subtle text-xs font-semibold text-text-muted uppercase tracking-wider text-center flex items-center justify-center bg-bg-app/50 relative">
                        TIME
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-accent-primary/20"></div>
                    </div>
                    {weekDays.map((day, i) => {
                        const isToday = isSameDay(day, today);
                        return (
                            <div key={i} className={clsx(
                                "flex flex-col items-center justify-center py-3 border-r border-border-subtle transition-colors relative",
                                isToday ? "bg-accent-primary/5" : ""
                            )}>
                                <span className={clsx("text-xs font-bold uppercase mb-1", isToday ? "text-accent-primary" : "text-text-muted")}>
                                    {format(day, 'EEE')}
                                </span>
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                                    isToday ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/30" : "text-text-primary group-hover:bg-bg-input"
                                )}>
                                    {format(day, 'd')}
                                </div>
                                {isToday && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-accent-primary"></div>}
                            </div>
                        );
                    })}
                </div>

                {/* Scrollable Content */}
                <div ref={(ref) => {
                    if (ref && !ref.dataset.scrolled) {
                        ref.scrollTop = workingStart * 80;
                        ref.dataset.scrolled = "true";
                    }
                }} className="flex-1 overflow-y-auto custom-scrollbar relative bg-bg-app/30">
                    <div
                        className="grid min-h-[1920px]"
                        style={{ gridTemplateColumns: `60px repeat(${weekDays.length}, 1fr)` }}
                    >
                        {/* Time labels Column */}
                        <div className="border-r border-border-subtle bg-bg-card/30 relative">
                            {hours.map(hour => (
                                <div key={`time-${hour}`} className="h-20 border-b border-border-subtle/50 relative">
                                    <span className="absolute -top-3 right-2 text-xs font-mono text-text-muted/60">
                                        {format(setHours(new Date(), hour), 'HH:00')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Day Columns */}
                        {weekDays.map((day, dayIdx) => (
                            <div key={dayIdx} className="relative border-r border-border-subtle group/column bg-bg-app/10">
                                {/* Hour Cells */}
                                {hours.map(hour => {
                                    const isWorkingHour = hour >= workingStart && hour < workingEnd;
                                    return (
                                        <div
                                            key={`slot-${dayIdx}-${hour}`}
                                            className={clsx(
                                                "h-20 border-b border-border-subtle/30 transition-colors group/cell relative cursor-cell",
                                                isWorkingHour ? "bg-transparent transition-opacity" : "bg-black/5 dark:bg-white/5",
                                                "hover:bg-accent-primary/5"
                                            )}
                                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                            onDrop={(e) => handleDrop(e, day, hour)}
                                            onClick={() => handleSlotClick(day, hour)}
                                        >
                                            <div className="absolute top-1 right-1 p-1.5 rounded-lg text-accent-primary opacity-0 group-hover/cell:opacity-100 transition-all z-20 scale-90">
                                                <Plus size={16} strokeWidth={3} />
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Render Events */}
                                {getPositionedTasks(day).map(task => (
                                    <CalendarEvent
                                        key={task.id}
                                        task={task}
                                        team={team}
                                        resizing={resizing}
                                        resizePreview={resizePreview}
                                        onMouseDownTop={onMouseDownTop}
                                        onMouseDownBottom={onMouseDownBottom}
                                        onClick={() => setEditingTask(task)} // Single click now opens edit for simplicity? Or keep double click logic?
                                        onDoubleClick={() => setEditingTask(task)}
                                        onDragStart={(e) => handleDragStart(e, task)}
                                    />
                                ))}

                                {/* Current Time Indicator */}
                                {isSameDay(day, today) && (
                                    <div
                                        className="absolute w-full border-t-2 border-red-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                                        style={{
                                            top: `${(today.getHours() * 80) + ((today.getMinutes() / 60) * 80)}px`
                                        }}
                                    >
                                        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-sm" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Suspense fallback={null}>
                {editingTask && (
                    <EditTaskModal
                        task={editingTask}
                        onClose={() => setEditingTask(null)}
                        mode="edit"
                    />
                )}
                {creationDate && (
                    <EditTaskModal
                        task={{
                            title: '',
                            dueDate: creationDate.getTime(),
                            status: 'todo',
                            priority: 'medium'
                        } as any}
                        onClose={() => setCreationDate(null)}
                        mode="create"
                    />
                )}
            </Suspense>
        </div>
    );
}
