import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../core/store';
import { X, Sun, AlertTriangle, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

export function DailyDigestModal() {
    const { tasks, user } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const lastDigestDate = localStorage.getItem('lastDigestDate');
        const today = new Date().toDateString();

        // Show only once per day
        if (lastDigestDate !== today) {
            // Introduce a small delay for better UX (let app load)
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('lastDigestDate', new Date().toDateString());
    };

    // Calculate Stats
    const allTasks = Object.values(tasks);

    const staleTasks = allTasks.filter(t =>
        t.status === 'in_progress' &&
        t.updatedAt &&
        (Date.now() - t.updatedAt > 259200000) // 3 days
    );

    const overdueTasks = allTasks.filter(t =>
        t.status !== 'done' &&
        t.status !== 'backlog' && // Maybe exclude backlog? User preference.
        t.dueDate &&
        t.dueDate < Date.now()
    );

    const highPriorityTasks = allTasks.filter(t =>
        t.status !== 'done' &&
        ['urgent', 'critical', 'high'].includes(t.priority)
    );

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-bg-card rounded-2xl shadow-2xl border border-border-subtle flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header with Morning Vibe */}
                <div className="relative bg-gradient-to-r from-orange-100 to-amber-50 p-8 border-b border-orange-100/50">
                    <button
                        onClick={handleClose}
                        className="absolute right-4 top-4 p-2 rounded-full hover:bg-black/5 text-text-muted transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-full bg-orange-400 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                            <Sun size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-display font-bold text-gray-800">
                                Good Morning, {user?.name?.split(' ')[0] || 'there'}!
                            </h2>
                            <p className="text-gray-600 font-medium">Here's your briefing for {format(new Date(), 'EEEE, MMMM do')}.</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">

                    {/* 1. Stale Tasks - The "Unblockers" */}
                    {staleTasks.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-stone-600">
                                <Clock size={18} className="text-stone-500" />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Stalled in Progress ({staleTasks.length})</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {staleTasks.slice(0, 3).map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-3 bg-stone-50 border border-stone-100 rounded-lg group">
                                        <span className="text-sm font-medium text-stone-700 truncate">{task.title}</span>
                                        <button
                                            onClick={() => { navigate(`/tasks`); handleClose(); }}
                                            className="text-xs text-stone-500 hover:text-stone-800 underline decoration-stone-300"
                                        >
                                            View
                                        </button>
                                    </div>
                                ))}
                                {staleTasks.length > 3 && (
                                    <p className="text-xs text-stone-500 text-center">+ {staleTasks.length - 3} more stalled tasks</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 2. Overdue - The "Urgent" */}
                    {overdueTasks.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle size={18} />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Overdue ({overdueTasks.length})</h3>
                            </div>
                            <div className="space-y-2">
                                {overdueTasks.slice(0, 3).map(task => (
                                    <div key={task.id} className="flex items-center gap-3 p-3 bg-red-50/50 border border-red-100 rounded-lg">
                                        <AlertCircle size={16} className="text-red-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-gray-800 truncate">{task.title}</div>
                                            <div className="text-xs text-red-500 font-medium">Due {format(task.dueDate!, 'MMM d')}</div>
                                        </div>
                                    </div>
                                ))}
                                {overdueTasks.length > 3 && (
                                    <p className="text-xs text-red-400 text-center">+ {overdueTasks.length - 3} more overdue</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3. High Priority - The "Focus" */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-600">
                            <CheckCircle2 size={18} />
                            <h3 className="font-bold text-sm uppercase tracking-wide">Top Priorities</h3>
                        </div>
                        {highPriorityTasks.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No high priority tasks. Clear skies ahead!</p>
                        ) : (
                            <div className="space-y-2">
                                {highPriorityTasks.slice(0, 3).map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-3 bg-white border border-indigo-100 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className={clsx("w-2 h-2 rounded-full shrink-0", task.priority === 'critical' ? 'bg-red-500' : 'bg-orange-500')} />
                                            <span className="text-sm font-medium text-gray-700 truncate">{task.title}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={handleClose}
                        className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-gray-200 active:scale-95"
                    >
                        Let's get to work
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
