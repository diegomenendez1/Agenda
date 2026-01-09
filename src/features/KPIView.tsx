import { useStore } from '../core/store';
import { BarChart, Activity, CheckCircle, Clock, AlertCircle, TrendingUp, Users } from 'lucide-react';
import clsx from 'clsx';

export function KPIView() {
    const { tasks, user } = useStore();

    // 1. Filter Tasks based on Role
    const getVisibleTasks = () => {
        const allTasks = Object.values(tasks);

        if (user?.role === 'owner') {
            return allTasks; // Owner sees everything
        }

        if (user?.role === 'admin') {
            // In a full implementation, this would filter by "My Team".
            // For now, assuming Admin has broad visibility or specific team members are defined.
            // PROVISIONAL: Admins see all tasks to enable management. 
            // If strictly "My Team" is needed safely without schema, we'd limit this.
            return allTasks;
        }

        // Regular User: Only own tasks + assigned tasks
        return allTasks.filter(t => t.ownerId === user?.id || t.assigneeIds?.includes(user?.id || ''));
    };

    const visibleTasks = getVisibleTasks();

    // 2. Calculate Metrics
    const totalTasks = visibleTasks.length;
    const completedTasks = visibleTasks.filter(t => t.status === 'done').length;
    const pendingTasks = visibleTasks.filter(t => t.status !== 'done').length;
    const overdueTasks = visibleTasks.filter(t => t.dueDate && t.dueDate < Date.now() && t.status !== 'done').length;

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // High Priority Tasks
    const highPriorityTasks = visibleTasks.filter(t => t.priority === 'high' || t.priority === 'critical');
    const highPriorityCount = highPriorityTasks.length;



    return (
        <div className="h-full flex flex-col p-6 md:p-8 overflow-y-auto bg-bg-app text-text-primary">
            <header className="mb-8">
                <h1 className="text-3xl font-display font-bold flex items-center gap-3 tracking-tight">
                    <TrendingUp className="w-8 h-8 text-accent-primary" />
                    Analytics & KPIs
                </h1>
                <p className="text-text-muted text-lg font-light mt-2 max-w-2xl">
                    Performance metrics and insights for <span className="font-semibold text-text-primary">{user?.role === 'owner' ? 'the entire workspace' : 'your activities'}</span>.
                </p>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={<Activity className="text-blue-500" />}
                    label="Total Tasks"
                    value={totalTasks}
                    trend="Active"
                    color="blue"
                />
                <StatCard
                    icon={<CheckCircle className="text-emerald-500" />}
                    label="Completed"
                    value={completedTasks}
                    subValue={`${completionRate}% Rate`}
                    color="emerald"
                />
                <StatCard
                    icon={<Clock className="text-amber-500" />}
                    label="Pending"
                    value={pendingTasks}
                    trend="In Progress"
                    color="amber"
                />
                <StatCard
                    icon={<AlertCircle className="text-red-500" />}
                    label="Overdue / Critical"
                    value={overdueTasks + highPriorityCount}
                    trend="Requires Attention"
                    color="red"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Completion Progress */}
                <div className="glass-panel p-6 rounded-2xl border border-border-subtle shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-text-muted" />
                        Completion Status
                    </h3>

                    <div className="space-y-6">
                        <ProgressBar label="Overall Completion" percentage={completionRate} color="bg-accent-primary" />

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="p-4 rounded-xl bg-bg-input/30">
                                <span className="text-sm text-text-muted block mb-1">High Priority</span>
                                <div className="text-2xl font-bold text-text-primary">{highPriorityCount}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-bg-input/30">
                                <span className="text-sm text-text-muted block mb-1">Overdue</span>
                                <div className="text-2xl font-bold text-red-500">{overdueTasks}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Team / Role specific context */}
                <div className="glass-panel p-6 rounded-2xl border border-border-subtle shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-text-muted" />
                        Access Context
                    </h3>
                    <div className="p-4 rounded-xl bg-bg-input/50 text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-text-muted">Current Role:</span>
                            <span className="font-semibold capitalize text-accent-primary">{user?.role}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-text-muted">Scope:</span>
                            <span className="font-semibold">
                                {user?.role === 'owner' ? 'All Workspace Data' :
                                    user?.role === 'admin' ? 'Team & Management' : 'Personal Tasks'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Breakdown by Priority</h4>
                        <div className="space-y-3">
                            {['critical', 'high', 'medium', 'low'].map(p => {
                                const count = visibleTasks.filter(t => t.priority === p).length;
                                const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                                return (
                                    <div key={p} className="flex items-center gap-2 text-sm">
                                        <div className="w-20 capitalize text-text-secondary">{p}</div>
                                        <div className="flex-1 h-2 bg-bg-input rounded-full overflow-hidden">
                                            <div
                                                className={clsx("h-full rounded-full",
                                                    p === 'critical' ? 'bg-red-500' :
                                                        p === 'high' ? 'bg-amber-500' :
                                                            p === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                                                )}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <div className="w-8 text-right text-text-muted text-xs">{count}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, subValue, trend, color }: any) {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        red: "bg-red-500/10 text-red-600 border-red-500/20",
    };

    return (
        <div className="glass-panel p-5 rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div className={clsx("p-2.5 rounded-xl border", colorClasses[color] || colorClasses.blue)}>
                    {icon}
                </div>
            </div>
            <div>
                <div className="text-3xl font-display font-bold text-text-primary mb-1">{value}</div>
                <div className="text-sm font-medium text-text-muted">{label}</div>
            </div>
            {(subValue || trend) && (
                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                    {subValue && <span className="font-semibold text-text-primary">{subValue}</span>}
                    {trend && <span className="text-text-muted capitalize">{trend}</span>}
                </div>
            )}
        </div>
    );
}

function ProgressBar({ label, percentage, color }: any) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
                <span className="text-text-primary">{label}</span>
                <span className="text-text-secondary">{percentage}%</span>
            </div>
            <div className="h-3 w-full bg-bg-input rounded-full overflow-hidden">
                <div
                    className={clsx("h-full transition-all duration-1000 ease-out", color)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
