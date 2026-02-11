import { useState } from 'react';
import { LayoutDashboard, Calendar, Zap, Settings, Menu, X } from 'lucide-react';
import { TaskBoard } from './TaskBoard';
import { HabitManager } from '../habits/HabitManager';
import { Sidebar } from '../../components/Sidebar';
import clsx from 'clsx';

// Placeholder for HabitManager - will implement next
const ContextPanel = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <aside className={clsx(
            "fixed inset-y-0 right-0 w-80 bg-bg-card border-l border-border-subtle transform transition-transform duration-300 z-20 shadow-xl lg:shadow-none lg:relative lg:translate-x-0 lg:block",
            isOpen ? "translate-x-0" : "translate-x-full",
            "hidden" // Hidden on mobile unless toggled (logic handled by parent layout mostly, simplified here)
        )}>
            <div className="h-full flex flex-col p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-text-primary">Smart Context</h2>
                    <button onClick={onClose} className="lg:hidden p-2 hover:bg-bg-input rounded-lg">
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0 gap-4">
                    {/* Habits Section */}
                    <div className="flex-1 min-h-0">
                        <HabitManager />
                    </div>

                    {/* Stats or other context */}
                    <div className="p-4 bg-accent-primary/10 rounded-xl flex-shrink-0">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="w-5 h-5 text-accent-primary" />
                            <span className="font-semibold text-accent-secondary">Focus Score</span>
                        </div>
                        <p className="text-sm text-text-secondary">
                            You have 4 hours of uninterrupted time available today.
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [contextOpen, setContextOpen] = useState(false);

    return (
        <div className="flex h-screen bg-bg-app overflow-hidden">
            {/* Shared Sidebar Component */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-bg-card m-0 lg:m-4 lg:rounded-2xl shadow-sm border border-border-subtle overflow-hidden relative">
                <div className="lg:hidden p-4 border-b border-border-subtle flex justify-between bg-bg-card">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <Menu className="w-6 h-6 text-text-secondary" />
                    </button>
                    <button onClick={() => setContextOpen(!contextOpen)}>
                        <Zap className="w-6 h-6 text-accent-primary" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative flex">
                    {/* The Task Board */}
                    <div className="flex-1 overflow-hidden">
                        <TaskBoard />
                    </div>

                    {/* Desktop Context Panel (always visible on large screens) */}
                    <div className="hidden xl:block w-80 border-l border-border-subtle bg-bg-app/50">
                        <ContextPanel isOpen={true} onClose={() => { }} />
                    </div>
                </div>
            </main>

            {/* Mobile Context Panel */}
            <div className={clsx("xl:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity", contextOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => setContextOpen(false)} />
            <div className={clsx("xl:hidden fixed inset-y-0 right-0 z-50 transition-transform", contextOpen ? "translate-x-0" : "translate-x-full")}>
                <ContextPanel isOpen={contextOpen} onClose={() => setContextOpen(false)} />
            </div>
        </div>
    );
};
