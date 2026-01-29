import { useState, useEffect, Component, type ErrorInfo, type ReactNode, useMemo, lazy, Suspense } from 'react';
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
    const { tasks, updateTask, team, user } = useStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [creationDate, setCreationDate] = useState<Date | null>(null);

    // --- State: Resizing ---
    const [resizing, setResizing] = useState<{
        taskId: string;
        type: 'top' | 'bottom';
        initialY: number;
        initialValue: number; // minutes or start time? Let's use minutes for duration
    } | null>(null);

    // Live feedback during resize (optional but recommended for UX)
    const [resizePreview, setResizePreview] = useState<{ id: string, mins: number, topOffset?: number } | null>(null);

    useEffect(() => {
        if (!resizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = e.clientY - resizing.initialY;
            const deltaMins = Math.round((deltaY / 80) * 60 / 15) * 15; // 15 min snaps

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
                    const newDate = new Date(task.dueDate!);
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

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const today = new Date();

    const workingStart = user?.preferences?.workingHours?.start ?? 9;
    const workingEnd = user?.preferences?.workingHours?.end ?? 18;

    const [filterMode, setFilterMode] = useState<'all' | 'me'>('all');

    // --- Safety: Safe Task Filtering ---
    const weekTasks = useMemo(() => {
        if (!tasks || !user) return [];
        const weekEnd = addDays(weekStart, 7);
        const currentUserId = String(user.id);

        return Object.values(tasks).filter(task => {
            // 1. Organization Check
            if (String(task.organizationId) !== String(user.organizationId)) return false;

            // 2. Member Filter ('me' mode)
            if (filterMode === 'me') {
                const isOwner = String(task.ownerId) === currentUserId;
                const isAssignee = task.assigneeIds?.some(id => String(id) === currentUserId);

                if (!isOwner && !isAssignee) return false;
            }

            // 3. Date & Validity Check
            if (!task.dueDate) return false;
            try {
                const taskDate = new Date(task.dueDate);
                return isValid(taskDate) && taskDate >= weekStart && taskDate < weekEnd;
            } catch {
                return false;
            }
        });
    }, [tasks, weekStart, filterMode, user]);

    // --- Logic: Overlap Handling ---
    const getPositionedTasks = (day: Date) => {
        const dayTasks = weekTasks.filter(t => isSameDay(new Date(t.dueDate!), day));
        if (dayTasks.length === 0) return [];

        // 1. Sort by start time
        const sorted = [...dayTasks].sort((a, b) => {
            const da = new Date(a.dueDate!);
            const db = new Date(b.dueDate!);
            return da.getTime() - db.getTime();
        });

        // 2. Build clusters of overlapping tasks
        const clusters: any[][] = [];
        let currentCluster: any[] = [];
        let clusterEnd = 0;

        sorted.forEach(task => {
            const start = new Date(task.dueDate!).getTime();
            const end = start + (task.estimatedMinutes || 60) * 60 * 1000;

            if (start < clusterEnd) {
                currentCluster.push(task);
                clusterEnd = Math.max(clusterEnd, end);
            } else {
                if (currentCluster.length > 0) clusters.push(currentCluster);
                currentCluster = [task];
                clusterEnd = end;
            }
        });
        if (currentCluster.length > 0) clusters.push(currentCluster);

        // 3. Assign columns within each cluster
        const results: any[] = [];
        clusters.forEach(cluster => {
            const columns: any[][] = [];
            cluster.forEach(task => {
                let colIndex = columns.findIndex(col => {
                    const lastTask = col[col.length - 1];
                    const lastEnd = new Date(lastTask.dueDate!).getTime() + (lastTask.estimatedMinutes || 60) * 60 * 1000;
                    return new Date(task.dueDate!).getTime() >= lastEnd;
                });

                if (colIndex === -1) {
                    columns.push([task]);
                    colIndex = columns.length - 1;
                } else {
                    columns[colIndex].push(task);
                }

                results.push({
                    ...task,
                    colIndex,
                    totalCols: 0, // Placeholder
                    cluster
                });
            });

            // Update totalCols for everyone in this cluster based on columns needed
            cluster.forEach(task => {
                const res = results.find(r => r.id === task.id);
                if (res) res.totalCols = columns.length;
            });
        });

        return results;
    };

    // --- Logic: Positioning ---
    const getTaskStyle = (task: any) => {
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
                zIndex: (task.colIndex || 0) + (resizing?.taskId === task.id ? 1000 : 10),
                opacity: resizing?.taskId === task.id ? 0.8 : 1,
                userSelect: 'none' as const,
                cursor: resizing ? 'grabbing' : 'pointer'
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

                    <div className="flex items-center gap-1 bg-bg-app border border-border-subtle rounded-lg p-1 ml-4 shadow-inner">
                        <button
                            onClick={() => setFilterMode('all')}
                            className={clsx(
                                "px-4 py-1 text-[11px] font-bold rounded-md transition-all outline-none",
                                filterMode === 'all'
                                    ? "bg-accent-primary text-white shadow-md ring-1 ring-accent-primary"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-input"
                            )}
                        >
                            All Tasks
                        </button>
                        <button
                            onClick={() => setFilterMode('me')}
                            className={clsx(
                                "px-4 py-1 text-[11px] font-bold rounded-md transition-all outline-none",
                                filterMode === 'me'
                                    ? "bg-accent-primary text-white shadow-md ring-1 ring-accent-primary"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-input"
                            )}
                        >
                            My Tasks
                        </button>
                    </div>

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
                <div ref={(ref) => {
                    if (ref && !ref.dataset.scrolled) {
                        ref.scrollTop = workingStart * 80;
                        ref.dataset.scrolled = "true";
                    }
                }} className="flex-1 overflow-y-auto custom-scrollbar relative bg-bg-app/30">
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
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, day, hour)}
                                            onClick={() => handleSlotClick(day, hour)}
                                        >
                                            {/* Hover Add Button (Visual Hint) */}
                                            <div className="absolute top-1 right-1 p-1.5 rounded-lg text-accent-primary opacity-0 group-hover/cell:opacity-100 transition-all z-20 scale-90">
                                                <Plus size={16} strokeWidth={3} />
                                            </div>
                                        </div>
                                    );
                                })}

                                {getPositionedTasks(day).map(task => {
                                    // Prepare data for rendering
                                    const assigneeIds = task.assigneeIds || [];
                                    const members = assigneeIds.map((id: string) => team[id]).filter(Boolean);
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
                                            draggable={!resizing}
                                            onDragStart={(e) => handleDragStart(e, task)}
                                            onClick={(e) => e.stopPropagation()}
                                            onDoubleClick={(e) => handleTaskDoubleClick(task, e)}
                                            className={clsx(
                                                "rounded-md p-1.5 text-[10px] border cursor-pointer hover:z-[100] transition-all group/card select-none overflow-hidden flex flex-col gap-0.5",
                                                "hover:shadow-lg hover:ring-1 hover:ring-primary/30",
                                                cardStyle,
                                                resizing?.taskId === task.id && "ring-2 ring-accent-primary z-[500]"
                                            )}
                                            style={getTaskStyle(task)}
                                            title={`${task.title} - ${task.status}`}
                                        >
                                            {/* Resize Handles */}
                                            <div
                                                className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-white/40 z-50 transition-colors"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    setResizing({
                                                        taskId: task.id,
                                                        type: 'top',
                                                        initialY: e.clientY,
                                                        initialValue: task.estimatedMinutes || 60
                                                    });
                                                }}
                                            />
                                            <div
                                                className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-white/40 z-50 transition-colors"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    setResizing({
                                                        taskId: task.id,
                                                        type: 'bottom',
                                                        initialY: e.clientY,
                                                        initialValue: task.estimatedMinutes || 60
                                                    });
                                                }}
                                            />
                                            {/* Title & Status */}
                                            <div className="flex items-start justify-between gap-1">
                                                <div className={clsx("font-bold truncate leading-tight", isDone && "line-through")}>
                                                    {task.title}
                                                </div>
                                            </div>

                                            {/* Metadata Row (Time, Status, Avatars) */}
                                            <div className="flex items-center justify-between mt-auto">
                                                {/* Time & Status */}
                                                <div className="flex items-center gap-1 opacity-90 scale-90 origin-left">
                                                    <div className="flex items-center gap-0.5 font-medium whitespace-nowrap">
                                                        <Clock size={8} />
                                                        <span>
                                                            {format(new Date(task.dueDate!), 'HH:mm')}
                                                        </span>
                                                    </div>
                                                    {!isDone && (
                                                        <span className="text-[8px] uppercase font-bold opacity-70 tracking-tighter border border-current px-0.5 rounded leading-none">
                                                            {task.status.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Avatars */}
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
