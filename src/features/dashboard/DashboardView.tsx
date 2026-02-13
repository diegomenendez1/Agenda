import { useState, useEffect } from 'react';
import { useStore } from '../../core/store';
import {
    LayoutDashboard,
    CheckCircle2,
    Clock,
    AlertCircle,
    TrendingUp,
    Calendar,
    ArrowRight,
    MessageSquare,
    User
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { supabase } from '../../core/supabase';
import { useTour } from '../../hooks/useTour';
import { ModuleHeader } from '../../components/layout/ModuleHeader';

export function DashboardView() {
    const { user, tasks, team } = useStore();
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(true);

    // Initialize Tour
    useTour();

    const taskList = Object.values(tasks);

    // KPI Calculations
    const pendingTasks = taskList.filter(t => (t.status === 'todo' || t.status === 'in_progress') && t.assigneeIds?.includes(user?.id || '')).length;
    const inReviewTasks = taskList.filter(t => t.status === 'review' && t.assigneeIds?.includes(user?.id || '')).length;
    const completedTasks = taskList.filter(t => t.status === 'done' && t.assigneeIds?.includes(user?.id || '')).length;

    // Recent Activities Fetcher
    useEffect(() => {
        async function fetchRecent() {
            try {
                const { data, error } = await supabase
                    .from('activity_logs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (!error && data) {
                    setRecentActivities(data);
                }
            } catch (e) {
                console.error("Failed to fetch activities", e);
            } finally {
                setLoadingActivities(false);
            }
        }
        fetchRecent();
    }, []);

    // Get My Tasks (Top 5 due soon)
    const myTasks = taskList
        .filter(t => t.status !== 'done' && t.assigneeIds?.includes(user?.id || ''))
        .sort((a, b) => (a.dueDate || Infinity) - (b.dueDate || Infinity))
        .slice(0, 5);

    // Get Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <div id="dashboard-view" className="flex flex-col h-full w-full max-w-[1600px] mx-auto p-6 md:p-6 md:pt-6 overflow-y-auto">
            {/* Header */}
            <ModuleHeader
                icon={LayoutDashboard}
                title={`${greeting}, ${user?.name?.split(' ')[0]} 👋`}
                subtitle="Here's what's happening in your workspace today."
                actions={
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-bg-card border border-border-subtle rounded-xl shadow-sm text-sm text-text-muted">
                        <Calendar size={16} />
                        {format(new Date(), 'EEEE, MMMM d, yyyy')}
                    </div>
                }
            />

            {/* KPI Grid */}
            <div id="dashboard-kpi" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-enter" style={{ animationDelay: '0.1s' }}>
                <div className="bg-bg-card p-6 rounded-2xl border border-border-subtle shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={80} className="text-orange-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-orange-600 font-bold uppercase text-xs tracking-wider">
                            <Clock size={14} /> Pending Tasks
                        </div>
                        <div className="text-4xl font-display font-bold text-text-primary mb-1">{pendingTasks}</div>
                        <div className="text-sm text-text-muted">Tasks waiting for action</div>
                    </div>
                </div>

                <div className="bg-bg-card p-6 rounded-2xl border border-border-subtle shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertCircle size={80} className="text-yellow-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-yellow-600 font-bold uppercase text-xs tracking-wider">
                            <AlertCircle size={14} /> In Review
                        </div>
                        <div className="text-4xl font-display font-bold text-text-primary mb-1">{inReviewTasks}</div>
                        <div className="text-sm text-text-muted">Tasks needing approval</div>
                    </div>
                </div>

                <div className="bg-bg-card p-6 rounded-2xl border border-border-subtle shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 size={80} className="text-emerald-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 text-emerald-600 font-bold uppercase text-xs tracking-wider">
                            <TrendingUp size={14} /> Completed
                        </div>
                        <div className="text-4xl font-display font-bold text-text-primary mb-1">{completedTasks}</div>
                        <div className="text-sm text-text-muted">Tasks finished effectively</div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-enter" style={{ animationDelay: '0.2s' }}>

                {/* Left Column: Recent Activity (2/3 width) */}
                <div id="dashboard-recent" className="xl:col-span-2 flex flex-col gap-6">
                    <div className="bg-bg-card rounded-2xl border border-border-subtle shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-border-subtle flex justify-between items-center">
                            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <MessageSquare size={18} className="text-violet-500" />
                                Recent Activity
                            </h2>
                        </div>
                        <div className="p-0">
                            {loadingActivities ? (
                                <div className="p-8 text-center text-text-muted">Loading activities...</div>
                            ) : recentActivities.length > 0 ? (
                                <div className="divide-y divide-border-subtle">
                                    {recentActivities.map((activity) => {
                                        const actor = team[activity.user_id];
                                        return (
                                            <div key={activity.id} className="p-4 hover:bg-bg-card-hover transition-colors flex gap-4 items-start">
                                                <div className="mt-1">
                                                    {actor?.avatar ? (
                                                        <img src={actor.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                                                            {actor?.name?.substring(0, 2).toUpperCase() || <User size={14} />}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="text-sm font-semibold text-text-primary">
                                                            {actor?.name || 'Unknown User'}
                                                        </span>
                                                        <span className="text-xs text-text-muted tabular-nums">
                                                            {format(new Date(activity.created_at), 'MMM d, HH:mm')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
                                                        {activity.content}
                                                    </p>
                                                    {activity.task_id && (
                                                        <Link to={`/tasks?taskId=${activity.task_id}`} className="text-xs text-violet-500 hover:underline mt-1 inline-block">
                                                            View Task
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-text-muted">No recent activity found.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: My Tasks Summary (1/3 width) */}
                <div className="flex flex-col gap-6">
                    <div className="bg-bg-card rounded-2xl border border-border-subtle shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="p-6 border-b border-border-subtle flex justify-between items-center">
                            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <LayoutDashboard size={18} className="text-indigo-500" />
                                My Focus
                            </h2>
                            <Link to="/tasks" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                                View All <ArrowRight size={12} />
                            </Link>
                        </div>
                        <div className="p-2 flex-1 overflow-y-auto">
                            {myTasks.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {myTasks.map(task => (
                                        <Link
                                            key={task.id}
                                            to={`/tasks?taskId=${task.id}`}
                                            className="group p-3 rounded-xl hover:bg-bg-input/50 transition-all border border-transparent hover:border-border-subtle flex items-start gap-3"
                                        >
                                            <div className={clsx(
                                                "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                                                task.priority === 'critical' ? "bg-red-500" :
                                                    task.priority === 'high' ? "bg-orange-500" :
                                                        task.priority === 'medium' ? "bg-yellow-500" : "bg-blue-500"
                                            )} />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-text-primary mb-0.5 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                    {task.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-text-muted">
                                                    {task.dueDate && (
                                                        <span className={clsx(
                                                            task.dueDate < Date.now() ? "text-red-500 font-bold" : ""
                                                        )}>
                                                            {format(task.dueDate, 'MMM d')}
                                                        </span>
                                                    )}
                                                    <span className="dot" />
                                                    <span className="capitalize">{task.status.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-text-muted opacity-60">
                                    <CheckCircle2 size={32} className="mb-2" />
                                    <p>All caught up!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
