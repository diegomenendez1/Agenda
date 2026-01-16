import { useState, Component, ErrorInfo, ReactNode, useMemo, lazy, Suspense } from 'react';
import { startOfWeek, addDays, format, isSameDay, addWeeks, subWeeks, setHours, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../core/store';
import type { Task } from '../core/types';

// Lazy load to prevent circular dependency crashes
const EditTaskModal = lazy(() => import('../components/EditTaskModal').then(m => ({ default: m.EditTaskModal })));

// Safety: Error Boundary to catch crashes within the Calendar only
class LocalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("CalendarView Crash:", error, errorInfo);
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
    const { tasks, updateTask, team } = useStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [creationDate, setCreationDate] = useState<Date | null>(null);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const today = new Date();

    // --- Safety: Safe Task Filtering ---
    const weekTasks = useMemo(() => {
        if (!tasks) return [];
        const weekEnd = addDays(weekStart, 7);
        return Object.values(tasks).filter(task => {
            if (!task.dueDate) return false;
            try {
                const taskDate = new Date(task.dueDate);
                return isValid(taskDate) && taskDate >= weekStart && taskDate < weekEnd;
            } catch {
                return false;
            }
        });
    }, [tasks, weekStart]);

    // --- Logic: Positioning ---
    const getTaskStyle = (task: Task) => {
        try {
            if (!task.dueDate) return { display: 'none' };
            const date = new Date(task.dueDate);
            if (!isValid(date)) return { display: 'none' };

            const startHour = date.getHours();
            const startMin = date.getMinutes();
            // Default duration 1h if not tracked
            const durationMinutes = 60;

            // Top: (Hour * 80px) + (Minutes / 60 * 80px)
            const top = (startHour * 80) + ((startMin / 60) * 80);
            // Height: (Duration / 60 * 80px)
            const height = (durationMinutes / 60) * 80;

            return {
                top: `${top}px`,
                height: `${height}px`,
                left: '2px',
                right: '2px',
                position: 'absolute' as const
            };
        } catch (e) {
            return { display: 'none' };
        }
    };

    // --- Interactions ---
    const handleSlotClick = (day: Date, hour: number) => {
        const d = new Date(day);
        d.setHours(hour, 0, 0, 0);
        setCreationDate(d);
    };

    const handleTaskDoubleClick = (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTask(task);
    };

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
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

    return (
        <div className="flex flex-col h-full overflow-hidden bg-bg-app">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-card/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
                        <CalendarIcon className="text-accent-primary" />
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-1 bg-bg-input rounded-lg p-1 border border-border-subtle">
                        <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-1 hover:bg-bg-card rounded text-text-muted hover:text-text-primary transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-text-primary hover:bg-bg-card rounded transition-colors">
                            Today
                        </button>
                        <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-1 hover:bg-bg-card rounded text-text-muted hover:text-text-primary transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Days Header */}
                <div className="grid grid-cols-8 border-b border-border-subtle bg-bg-card z-10 shadow-sm shrink-0">
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
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-bg-app/30">
                    <div className="grid grid-cols-8 min-h-[1920px]"> {/* 24h * 80px = 1920px */}

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
                                {hours.map(hour => (
                                    <div
                                        key={`slot-${dayIdx}-${hour}`}
                                        className="h-20 border-b border-border-subtle/30 hover:bg-accent-primary/5 transition-colors group/cell relative"
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, day, hour)}
                                    >
                                        {/* Hover Add Button */}
                                        <button
                                            onClick={() => handleSlotClick(day, hour)}
                                            className="absolute top-1 right-1 p-1.5 rounded-lg text-accent-primary opacity-0 group-hover/cell:opacity-100 hover:bg-accent-primary/10 transition-all z-20 scale-90 hover:scale-100 cursor-pointer"
                                            title="Add Task"
                                        >
                                            <Plus size={16} strokeWidth={3} />
                                        </button>
                                    </div>
                                ))}

                                {/* Tasks Overlay */}
                                {weekTasks
                                    .filter(t => isSameDay(new Date(t.dueDate!), day))
                                    .map(task => {
                                        // Prepare data for rendering
                                        const assigneeIds = task.assigneeIds || [];
                                        const members = assigneeIds.map(id => team[id]).filter(Boolean);
                                        const isDone = task.status === 'done';

                                        // Determine styles
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

                                        return (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task)}
                                                onDoubleClick={(e) => handleTaskDoubleClick(task, e)}
                                                className={clsx(
                                                    "rounded-md p-1.5 text-xs border cursor-pointer hover:z-30 transition-all group/card select-none overflow-hidden flex flex-col gap-0.5",
                                                    "hover:shadow-lg hover:scale-[1.02]",
                                                    cardStyle,
                                                    "left-[2px] right-[2px]"
                                                )}
                                                style={getTaskStyle(task)}
                                                title={`${task.title} - ${task.status}`}
                                            >
                                                {/* Title & Status */}
                                                <div className="flex items-start justify-between gap-1">
                                                    <div className={clsx("font-semibold truncate leading-tight", isDone && "line-through")}>
                                                        {task.title}
                                                    </div>
                                                </div>

                                                {/* Metadata Row (Time, Status, Avatars) */}
                                                <div className="flex items-center justify-between mt-auto pt-1">
                                                    {/* Time & Status */}
                                                    <div className="flex items-center gap-1.5 opacity-90 scale-95 origin-left">
                                                        <div className="flex items-center gap-0.5">
                                                            <Clock size={10} />
                                                            <span className="text-[10px] font-medium leading-none">
                                                                {format(new Date(task.dueDate!), 'HH:mm')}
                                                            </span>
                                                        </div>
                                                        {/* Tiny Status indicator if not implicit by color */}
                                                        {!isDone && (
                                                            <span className="text-[9px] uppercase font-bold opacity-80 tracking-tighter border border-border-subtle px-0.5 rounded">
                                                                {task.status.replace('_', ' ')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Avatars */}
                                                    {members.length > 0 && (
                                                        <div className="flex -space-x-1.5 shrink-0">
                                                            {members.slice(0, 3).map((member) => (
                                                                <div key={member.id} className="w-4 h-4 rounded-full border border-border-subtle bg-bg-card relative z-10" title={member.name}>
                                                                    <img
                                                                        src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`}
                                                                        alt={member.name}
                                                                        className="w-full h-full rounded-full object-cover"
                                                                    />
                                                                </div>
                                                            ))}
                                                            {members.length > 3 && (
                                                                <div className="w-4 h-4 rounded-full bg-bg-input border border-border-subtle flex items-center justify-center text-[8px] font-bold text-text-primary z-0">
                                                                    +{members.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

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

            {/* Modals - Lazy Loaded */}
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
