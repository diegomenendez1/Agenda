import { useState } from 'react';

import { TrendingUp, Users, BarChart2, Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAnalytics } from '../../hooks/useAnalytics';
import { DateRangePicker } from './analytics/DateRangePicker';
import { VelocityChart, WorkloadChart, StatusChart } from './analytics/AnalyticsCharts';
import { ModuleHeader } from '../../components/layout/ModuleHeader';

export function KPIView() {

    const { filter, setFilter, overviewMetrics, teamMetrics, activityHistory } = useAnalytics();
    const [activeTab, setActiveTab] = useState<'overview' | 'team'>('overview');


    return (
        <div className="h-full flex flex-col bg-bg-app text-text-primary overflow-hidden">
            {/* Header */}
            {/* Header */}
            <div className="px-6 pt-6 shrink-0 max-w-[1600px] mx-auto w-full">
                <ModuleHeader
                    className="mb-0 border-none pb-0"
                    icon={TrendingUp}
                    title="Analytics & Control"
                    subtitle="Workspace insights and performance metrics"
                    actions={
                        <div className="bg-bg-card border border-border-subtle p-1 rounded-2xl shadow-sm flex items-center">
                            <DateRangePicker value={filter.dateRange} onChange={(d) => setFilter({ ...filter, dateRange: d })} />
                        </div>
                    }
                />
            </div>

            {/* Tabs */}
            <div className="px-6 pt-2 shrink-0 max-w-[1600px] mx-auto w-full">
                <div className="flex gap-8 border-b border-border-subtle pb-px relative no-scrollbar overflow-x-auto">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={BarChart2} label="Overview" />
                    <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={Users} label="Team Performance" />
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-[1600px] mx-auto space-y-8 animate-enter">

                    {/* --- TAB: OVERVIEW --- */}
                    {activeTab === 'overview' && (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard
                                    label="Total Tasks"
                                    value={overviewMetrics.total}
                                    icon={Activity}
                                    color="blue"
                                    trend={`${overviewMetrics.velocity} tasks / day`}
                                    description="Active volume"
                                />
                                <StatCard
                                    label="Completed"
                                    value={overviewMetrics.completed}
                                    icon={CheckCircle}
                                    color="emerald"
                                    trend={`${overviewMetrics.completionRate}% completion`}
                                    description="Team output"
                                />
                                <StatCard
                                    label="Pending"
                                    value={overviewMetrics.total - overviewMetrics.completed}
                                    icon={Clock}
                                    color="amber"
                                    description="Work in progress"
                                />
                                <StatCard
                                    label="Overdue"
                                    value={overviewMetrics.overdue}
                                    icon={AlertCircle}
                                    color="red"
                                    trend="Immediate action"
                                    description="Critical items"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Velocity Chart */}
                                <div className="bg-bg-card p-8 rounded-3xl border border-border-subtle shadow-sm lg:col-span-2 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                                    <h3 className="text-lg font-bold mb-8 flex items-center gap-3">
                                        <div className="p-2 bg-accent-primary/10 rounded-xl text-accent-primary">
                                            <TrendingUp size={20} />
                                        </div>
                                        Activity Velocity
                                    </h3>
                                    <div className="h-[250px]">
                                        <VelocityChart data={activityHistory} height={250} />
                                    </div>
                                </div>

                                {/* Status Distribution */}
                                <div className="bg-bg-card p-8 rounded-3xl border border-border-subtle shadow-sm flex flex-col relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-text-muted/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                                    <h3 className="text-lg font-bold mb-8 flex items-center gap-3">
                                        <div className="p-2 bg-bg-app rounded-xl text-text-muted border border-border-subtle">
                                            <BarChart2 size={20} />
                                        </div>
                                        Task Status
                                    </h3>
                                    <div className="flex-1 flex items-center justify-center p-4">
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
                        <div className="bg-bg-card p-10 rounded-3xl border border-border-subtle shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/5 rounded-bl-full -mr-32 -mt-32 transition-transform group-hover:scale-105" />
                            <div className="flex items-center justify-between mb-10 relative z-10">
                                <h3 className="text-2xl font-bold flex items-center gap-4">
                                    <div className="p-3 bg-accent-primary/10 rounded-2xl text-accent-primary shadow-sm">
                                        <Users size={28} />
                                    </div>
                                    Workload & performance
                                </h3>
                                <div className="bg-bg-app border border-border-subtle px-4 py-1.5 rounded-full text-xs font-bold text-text-muted uppercase tracking-widest shadow-inner">
                                    Sorted by total volume
                                </div>
                            </div>

                            <div className="relative z-10 min-h-[400px]">
                                <WorkloadChart data={teamMetrics} />
                            </div>
                        </div>
                    )}
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
                "group flex items-center gap-2.5 pb-4 px-1 text-sm font-bold transition-all relative whitespace-nowrap",
                active ? "text-accent-primary" : "text-text-muted hover:text-text-primary"
            )}
        >
            <Icon size={18} className={clsx("transition-transform", active && "scale-110")} />
            {label}
            {active && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-primary rounded-t-full shadow-[0_-2px_6px_rgba(var(--accent-primary-rgb),0.3)] anim-scale-x" />
            )}
        </button>
    );
}

function StatCard({ label, value, icon: Icon, color, trend, description }: any) {
    const colors: any = {
        blue: "text-blue-500 bg-blue-500/10 shadow-blue-500/5",
        emerald: "text-emerald-500 bg-emerald-500/10 shadow-emerald-500/5",
        amber: "text-amber-500 bg-amber-500/10 shadow-amber-500/5",
        red: "text-red-500 bg-red-500/10 shadow-red-500/5",
    };

    const bgAccents: any = {
        blue: "bg-blue-500/5",
        emerald: "bg-emerald-500/5",
        amber: "bg-amber-500/5",
        red: "bg-red-500/5",
    };

    return (
        <div className="group bg-bg-card p-6 rounded-3xl border border-border-subtle shadow-sm flex flex-col hover:shadow-xl hover:border-border-highlight transition-all duration-300 relative overflow-hidden hover:-translate-y-1">
            <div className={clsx("absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110", bgAccents[color])} />

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className={clsx("p-3 rounded-2xl transition-transform group-hover:rotate-6 shadow-lg", colors[color])}>
                    <Icon size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-0.5">{description || "Metric"}</div>
                    <div className="text-xs font-bold text-text-primary/70">{label}</div>
                </div>
            </div>

            <div className="relative z-10 mt-auto">
                <div className="text-4xl font-display font-extrabold text-text-primary tracking-tight tabular-nums transition-colors group-hover:text-accent-primary">
                    {value}
                </div>
                {trend && (
                    <div className="flex items-center gap-1.5 mt-2 bg-bg-app border border-border-subtle p-1.5 px-3 rounded-xl w-fit shadow-inner">
                        <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", color === 'red' ? "bg-red-500" : "bg-emerald-500")} />
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{trend}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
