import { useState } from 'react';

import { TrendingUp, Users, BarChart2, Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAnalytics } from '../hooks/useAnalytics';
import { DateRangePicker } from '../components/analytics/DateRangePicker';
import { VelocityChart, WorkloadChart, StatusChart } from '../components/analytics/AnalyticsCharts';

export function KPIView() {

    const { filter, setFilter, overviewMetrics, teamMetrics, activityHistory } = useAnalytics();
    const [activeTab, setActiveTab] = useState<'overview' | 'team'>('overview');


    return (
        <div className="h-full flex flex-col bg-bg-app text-text-primary overflow-hidden">
            {/* Header */}
            <header className="px-6 py-5 border-b border-border-subtle flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent-primary/10 rounded-lg text-accent-primary">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-display font-bold">Analytics & Control</h1>
                        <p className="text-xs text-text-muted">Workspace insights and performance metrics</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <DateRangePicker value={filter.dateRange} onChange={(d) => setFilter({ ...filter, dateRange: d })} />
                </div>
            </header>

            {/* Tabs */}
            <div className="px-6 pt-4 shrink-0">
                <div className="flex gap-6 border-b border-border-subtle">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={BarChart2} label="Overview" />
                    <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={Users} label="Team Performance" />

                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* --- TAB: OVERVIEW --- */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    label="Total Tasks"
                                    value={overviewMetrics.total}
                                    icon={Activity}
                                    color="blue"
                                    trend={`${overviewMetrics.velocity} / day`}
                                />
                                <StatCard
                                    label="Completed"
                                    value={overviewMetrics.completed}
                                    icon={CheckCircle}
                                    color="emerald"
                                    trend={`${overviewMetrics.completionRate}% Rate`}
                                />
                                <StatCard
                                    label="Pending"
                                    value={overviewMetrics.total - overviewMetrics.completed}
                                    icon={Clock}
                                    color="amber"
                                />
                                <StatCard
                                    label="Overdue"
                                    value={overviewMetrics.overdue}
                                    icon={AlertCircle}
                                    color="red"
                                    trend="Requires Action"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Velocity Chart */}
                                <div className="glass-panel p-6 rounded-2xl border border-border-subtle shadow-sm lg:col-span-2">
                                    <h3 className="font-bold mb-6 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-accent-primary" />
                                        Activity Velocity
                                    </h3>
                                    <VelocityChart data={activityHistory} height={220} />
                                </div>

                                {/* Status Distribution */}
                                <div className="glass-panel p-6 rounded-2xl border border-border-subtle shadow-sm flex flex-col">
                                    <h3 className="font-bold mb-6 flex items-center gap-2">
                                        <BarChart2 className="w-5 h-5 text-text-muted" />
                                        Task Status
                                    </h3>
                                    <div className="flex-1 flex items-center justify-center">
                                        <StatusChart
                                            data={[
                                                { status: 'Done', count: overviewMetrics.completed, color: '#10b981' },
                                                { status: 'In Progress', count: overviewMetrics.total - overviewMetrics.completed - overviewMetrics.overdue, color: '#3b82f6' },
                                                { status: 'Overdue', count: overviewMetrics.overdue, color: '#ef4444' }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- TAB: TEAM --- */}
                    {activeTab === 'team' && (
                        <div className="glass-panel p-8 rounded-2xl border border-border-subtle shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Users className="w-5 h-5 text-accent-primary" />
                                    Workload & Performance
                                </h3>
                                <div className="text-sm text-text-muted">
                                    Sorted by total assigned tasks
                                </div>
                            </div>

                            <WorkloadChart data={teamMetrics} />
                        </div>
                    )}

                    {/* --- TAB: PROJECTS --- */}

                </div>
            </div>
        </div>
    );
}

// --- Subcomponents ---

function TabButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-2 pb-3 px-1 text-sm font-medium transition-all relative",
                active ? "text-accent-primary" : "text-text-muted hover:text-text-secondary"
            )}
        >
            <Icon size={18} />
            {label}
            {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-t-full animate-in zoom-in-50 duration-200" />
            )}
        </button>
    );
}

function StatCard({ label, value, icon: Icon, color, trend }: any) {
    const colors: any = {
        blue: "text-blue-500 bg-blue-500/10",
        emerald: "text-emerald-500 bg-emerald-500/10",
        amber: "text-amber-500 bg-amber-500/10",
        red: "text-red-500 bg-red-500/10",
    };

    return (
        <div className="glass-panel p-5 rounded-xl border border-border-subtle shadow-sm flex items-center gap-4 hover:bg-bg-card-hover transition-colors">
            <div className={clsx("p-3 rounded-xl", colors[color])}>
                <Icon size={24} />
            </div>
            <div>
                <div className="text-2xl font-bold font-display text-text-primary leading-none">{value}</div>
                <div className="text-xs font-medium text-text-muted mt-1">{label}</div>
                {trend && <div className="text-[10px] font-bold text-text-secondary mt-0.5">{trend}</div>}
            </div>
        </div>
    );
}
