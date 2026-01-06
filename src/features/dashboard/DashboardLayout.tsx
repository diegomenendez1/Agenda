import React, { useState } from 'react';
import { LayoutDashboard, Calendar, Zap, Settings, Menu, X, Plus } from 'lucide-react';
import { TaskBoard } from './TaskBoard';
import { HabitManager } from '../habits/HabitManager';
import clsx from 'clsx';

// Placeholder for HabitManager - will implement next
const ContextPanel = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <aside className={clsx(
            "fixed inset-y-0 right-0 w-80 bg-white border-l border-slate-200 transform transition-transform duration-300 z-20 shadow-xl lg:shadow-none lg:relative lg:translate-x-0 lg:block",
            isOpen ? "translate-x-0" : "translate-x-full",
            "hidden" // Hidden on mobile unless toggled (logic handled by parent layout mostly, simplified here)
        )}>
            <div className="h-full flex flex-col p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-slate-800">Smart Context</h2>
                    <button onClick={onClose} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col min-h-0 gap-4">
                    {/* Habits Section */}
                    <div className="flex-1 min-h-0">
                        <HabitManager />
                    </div>

                    {/* Stats or other context */}
                    <div className="p-4 bg-indigo-50 rounded-xl flex-shrink-0">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="w-5 h-5 text-indigo-600" />
                            <span className="font-semibold text-indigo-900">Focus Score</span>
                        </div>
                        <p className="text-sm text-indigo-700">
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
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-30 transition-transform duration-300 lg:relative lg:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-10 text-indigo-600">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
                        <span className="font-bold text-xl tracking-tight text-slate-900">Agenda</span>
                    </div>

                    <nav className="space-y-1 flex-1">
                        <a href="#" className="flex items-center gap-3 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium">
                            <LayoutDashboard className="w-5 h-5" />
                            My Board
                        </a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                            <Calendar className="w-5 h-5 opacity-70" />
                            Calendar
                        </a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                            <Zap className="w-5 h-5 opacity-70" />
                            Asssitant
                        </a>
                    </nav>

                    <div className="mt-auto pt-6 border-t border-slate-100">
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-900">
                            <Settings className="w-5 h-5" />
                            Settings
                        </a>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar Toggle Area */}
            {/* ... logic for mobile overlay ... */}

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-white m-0 lg:m-4 lg:rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                <div className="lg:hidden p-4 border-b border-slate-100 flex justify-between">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <Menu className="w-6 h-6 text-slate-600" />
                    </button>
                    <button onClick={() => setContextOpen(!contextOpen)}>
                        <Zap className="w-6 h-6 text-indigo-600" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative flex">
                    {/* The Task Board */}
                    <div className="flex-1 overflow-hidden">
                        <TaskBoard />
                    </div>

                    {/* Desktop Context Panel (always visible on large screens) */}
                    <div className="hidden xl:block w-80 border-l border-slate-100 bg-slate-50/50">
                        <ContextPanel isOpen={true} onClose={() => { }} />
                    </div>
                </div>
            </main>

            {/* Mobile Context Panel */}
            <div className={clsx("xl:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity", contextOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => setContextOpen(false)} />
            <div className={clsx("xl:hidden fixed inset-y-0 right-0 z-50 transition-transform", contextOpen ? "translate-x-0" : "translate-x-full")}>
                <ContextPanel isOpen={contextOpen} onClose={() => setContextOpen(false)} />
            </div>
        </div>
    );
};
