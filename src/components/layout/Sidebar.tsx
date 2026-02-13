import { NavLink } from 'react-router-dom';
import { Inbox, CheckCircle2, Calendar, StickyNote, Users, Sparkles, LogOut, ChevronRight, BarChart2, Plus, X, LayoutDashboard, HelpCircle } from 'lucide-react';
import { useStore } from '../../core/store';
import { supabase } from '../../core/supabase';
import { NotificationCenter } from '../NotificationCenter';
import clsx from 'clsx';
import { useState } from 'react';
import { PresenceIndicator } from '../PresenceIndicator';
import { CreateWorkspaceModal } from '../CreateWorkspaceModal';
import { EditTaskModal } from '../../features/tasks/EditTaskModal';
import { useTour } from '../../hooks/useTour';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

import { useTranslation } from '../../core/i18n';

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const { user, myWorkspaces } = useStore();
    const { t } = useTranslation();
    const { resetTour } = useTour();
    const [collapsed, setCollapsed] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false); // New State

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    const navItems = [
        { icon: LayoutDashboard, label: t.nav.dashboard, path: '/' },
        { icon: Inbox, label: t.nav.inbox, path: '/inbox' },
        { icon: CheckCircle2, label: t.nav.my_tasks, path: '/tasks' },
        { icon: Users, label: t.nav.my_team, path: '/my-team' },
        { icon: Calendar, label: t.nav.calendar, path: '/calendar' },

        // { icon: BarChart2, label: t.nav.analytics, path: '/kpis' }, // Hidden for MVP Simplicity
        { icon: StickyNote, label: t.nav.notes, path: '/notes' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
                    onClick={onClose}
                />
            )}

            <aside
                id="sidebar-container"
                className={clsx(
                    "h-full border-r border-border-subtle bg-bg-sidebar flex flex-col justify-between shrink-0 transition-all duration-300 relative z-50",
                    // Desktop: Relative and collapsible
                    "hidden lg:flex",
                    collapsed ? "w-[80px]" : "w-[260px]",
                    // Mobile: Fixed drawer
                    "lg:relative",
                    isOpen ? "!flex fixed inset-y-0 left-0 w-[280px] shadow-2xl" : ""
                )}
            >
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    className="lg:hidden absolute top-4 right-4 text-text-muted hover:text-text-primary"
                >
                    <X size={24} />
                </button>

                {/* Toggle Handle (Desktop Only) */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden lg:flex absolute -right-3 top-10 bg-bg-card text-text-muted border border-border-subtle w-6 h-6 rounded-full items-center justify-center shadow-sm hover:text-text-primary hover:border-border-highlight transition-all z-50"
                >
                    <ChevronRight size={14} className={clsx("transition-transform duration-300", !collapsed && "rotate-180")} />
                </button>

                <div className="flex flex-col h-full overflow-hidden">
                    {/* Header with Workspace Switcher */}
                    <div className={clsx("relative flex items-center gap-3 px-6 py-8 transition-all duration-300", collapsed && "lg:px-0 lg:justify-center")}>
                        <div className="w-9 h-9 rounded-xl bg-accent-primary flex items-center justify-center shadow-lg shadow-accent-primary/20 shrink-0 transition-transform hover:scale-105 cursor-pointer">
                            <Sparkles className="text-white w-5 h-5" />
                        </div>
                        {(!collapsed || isOpen) && (
                            <div className="overflow-hidden flex flex-col justify-center animate-enter relative group">
                                {(myWorkspaces && myWorkspaces.length > 1) ? (
                                    <div className="relative group/switcher">
                                        <button className="text-left hover:bg-bg-input -ml-2 px-2 py-1 rounded-lg transition-colors">
                                            <span id="cortex-sidebar-title" className="font-display font-bold text-lg tracking-tight leading-none text-text-primary flex items-center gap-2">
                                                {myWorkspaces.find(w => w.id === user?.organizationId)?.name || 'My Workspace'}
                                                <ChevronRight className="w-3 h-3 rotate-90 opacity-50 text-text-muted" />
                                            </span>
                                            <span className="text-[11px] text-text-muted font-medium tracking-wide uppercase block mt-0.5">
                                                {t.nav.switch_workspace}
                                            </span>
                                        </button>

                                        {/* Dropdown Menu */}
                                        <div className="absolute top-full left-0 mt-2 w-56 bg-bg-card border border-border-subtle rounded-xl shadow-2xl p-2 opacity-0 invisible group-hover/switcher:opacity-100 group-hover/switcher:visible transition-all z-[100] translate-y-2 group-hover/switcher:translate-y-0">
                                            <div className="text-xs font-semibold text-text-muted px-2 py-1.5 uppercase tracking-wider">My Workspaces</div>
                                            {myWorkspaces.map(ws => (
                                                <button
                                                    key={ws.id}
                                                    onClick={() => useStore.getState().switchWorkspace(ws.id)}
                                                    className={clsx(
                                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                                                        ws.id === user?.organizationId
                                                            ? "bg-accent-primary/10 text-accent-primary font-medium"
                                                            : "text-text-secondary hover:bg-bg-input hover:text-text-primary"
                                                    )}
                                                >
                                                    {ws.name}
                                                    {ws.id === user?.organizationId && <div className="w-1.5 h-1.5 rounded-full bg-accent-primary" />}
                                                </button>
                                            ))}
                                            <div className="h-px bg-border-subtle my-1" />
                                            <button
                                                onClick={() => setIsCreateModalOpen(true)}
                                                className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-input transition-colors flex items-center gap-2"
                                            >
                                                <Plus className="w-3 h-3" />
                                                Create New Workspace
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <span id="cortex-sidebar-title" className="font-display font-bold text-lg tracking-tight leading-none text-text-primary">
                                            {myWorkspaces?.find(w => w.id === user?.organizationId)?.name || 'Cortex'}
                                        </span>
                                        <span className="text-[11px] text-text-muted font-medium tracking-wide uppercase mt-1">Workspace</span>
                                        {/* Allow creating new workspace even if only 1 exists */}
                                        <button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className={clsx(
                                                "absolute right-0 top-1 p-1 hover:bg-bg-input rounded transition-all",
                                                !user?.organizationId ? "opacity-100 scale-110 text-accent-primary animate-pulse" : "opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary"
                                            )}
                                            title="Create New Workspace"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Quick Add Button - Prominent CTA */}
                    <div className={clsx("px-4 mb-2 mt-4 transition-all duration-300", collapsed && !isOpen ? "px-2" : "")}>
                        <button
                            id="new-task-btn"
                            onClick={() => setIsTaskModalOpen(true)}
                            className={clsx(
                                "w-full bg-accent-primary hover:brightness-110 text-white font-bold rounded-xl shadow-lg shadow-accent-primary/25 transition-all flex items-center justify-center gap-2 group overflow-hidden relative",
                                collapsed && !isOpen ? "p-3 rounded-full aspect-square" : "py-3 px-4"
                            )}
                            title="Create New Task"
                        >
                            <Plus size={20} className="relative z-10" strokeWidth={3} />
                            {(!collapsed || isOpen) && (
                                <span className="relative z-10 text-sm tracking-wide">New Task</span>
                            )}
                            {/* Shiny effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                        </button>
                    </div>

                    {/* Nav */}
                    <nav className="flex flex-1 flex-col gap-1 px-3 mt-2 overflow-y-auto custom-scrollbar">
                        {/* ... existing nav mapping ... */}
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                id={`nav-${item.path.replace('/', '') || 'dashboard'}`}
                                onClick={() => isOpen && onClose?.()} // Close on navigation (mobile)
                                className={({ isActive }) => clsx(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative mx-1",
                                    isActive
                                        ? "bg-accent-primary/10 text-accent-primary font-medium shadow-sm"
                                        : "text-text-secondary hover:text-text-primary hover:bg-bg-input",
                                    (collapsed && !isOpen) && "justify-center px-0 w-11 h-11 mx-auto"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon
                                            size={20}
                                            strokeWidth={isActive ? 2.5 : 2}
                                            className={clsx("transition-colors duration-300", isActive ? "text-accent-primary" : "text-text-muted group-hover:text-text-secondary")}
                                        />

                                        {(!collapsed || isOpen) && <span className="text-[14px]">{item.label}</span>}

                                        {/* Tooltip for collapsed desktop */}
                                        {(collapsed && !isOpen) && (
                                            <div className="absolute left-[calc(100%+8px)] px-3 py-1.5 bg-bg-card text-text-primary border border-border-subtle text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] transition-opacity shadow-lg translate-x-1 group-hover:translate-x-0 font-medium hidden lg:block">
                                                {item.label}
                                            </div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}

                        <div className="mt-4 mb-2 px-4">
                            <div className="h-px bg-border-subtle w-full" />
                        </div>
                    </nav>

                    {/* Footer Area */}
                    <div className="p-4 border-t border-border-subtle relative z-10 bg-bg-sidebar mt-auto">
                        {/* ... existing footer ... */}
                        {(!collapsed || isOpen) && (
                            <button
                                id="cmd-palette-btn"
                                className="flex items-center gap-3 px-3 py-2.5 w-full text-left bg-bg-input hover:bg-bg-card-hover transition-all rounded-lg border border-transparent mb-4 group shadow-none active:translate-y-[1px]"
                                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                            >
                                <SearchIcon size={16} className="text-text-muted group-hover:text-text-primary transition-colors" />
                                <span className="flex-1 text-xs font-medium text-text-muted group-hover:text-text-primary transition-colors">{t.nav.search}</span>
                                <kbd className="text-[10px] text-text-muted font-sans border border-border-subtle px-1.5 py-0.5 rounded bg-bg-card group-hover:bg-white transition-colors">⌘K</kbd>
                            </button>
                        )}

                        <div className="space-y-4">
                            {/* System Controls Row */}
                            <div className={clsx(
                                "flex items-center gap-2",
                                (collapsed && !isOpen) ? "flex-col justify-center" : "justify-between px-1"
                            )}>
                                <div className="flex items-center gap-1">
                                    <div className={clsx("transition-all", (collapsed && !isOpen) && "mb-2")}>
                                        <NotificationCenter />
                                    </div>

                                    <button
                                        id="help-tour-btn"
                                        onClick={() => resetTour()}
                                        className={clsx(
                                            "p-2 rounded-lg text-text-muted hover:text-accent-primary hover:bg-bg-input transition-all relative group/help",
                                            (collapsed && !isOpen) && "mx-auto"
                                        )}
                                        title="Tour de Ayuda"
                                    >
                                        <HelpCircle size={19} strokeWidth={2.2} />
                                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded font-bold opacity-0 group-hover/help:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl">
                                            Reiniciar Tour
                                        </span>
                                    </button>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className={clsx(
                                        "text-text-muted hover:text-red-500 transition-all hover:bg-red-50/50 rounded-lg shrink-0 flex items-center justify-center p-2",
                                        (collapsed && !isOpen) && "mx-auto"
                                    )}
                                    title="Sign Out"
                                >
                                    <LogOut size={18} strokeWidth={2} />
                                </button>
                            </div>

                            {/* User Profile Section */}
                            <NavLink to="/settings" className={clsx(
                                "flex items-center gap-3 min-w-0 hover:bg-bg-input rounded-xl transition-all group p-2 border border-transparent hover:border-border-subtle hover:shadow-sm",
                                (collapsed && !isOpen) ? "w-12 h-12 justify-center p-0 mx-auto" : "w-full"
                            )}>
                                <div className="w-9 h-9 rounded-full bg-accent-primary/10 p-[1px] shrink-0 relative overflow-hidden ring-2 ring-transparent group-hover:ring-accent-primary/20 transition-all shadow-sm">
                                    <img src={user?.avatar || "https://ui-avatars.com/api/?name=User&background=random"} alt="User" className="rounded-full w-full h-full object-cover" />
                                    <div className="absolute bottom-0 right-0 z-10">
                                        <PresenceIndicator userId={user?.id || ''} size="sm" showOffline={false} />
                                    </div>
                                </div>
                                {(!collapsed || isOpen) && (
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-bold truncate text-text-primary group-hover:text-accent-primary transition-colors leading-none mb-1">{user?.name || "User"}</div>
                                        <div className="text-[11px] text-text-muted truncate group-hover:text-text-secondary transition-colors font-medium">{user?.email}</div>
                                    </div>
                                )}
                            </NavLink>
                        </div>

                        {/* Leave Team Option (Non-Owners) */}
                        {user?.role !== 'owner' && (
                            <div className={clsx("mt-2 border-t border-border-subtle pt-2 flex justify-center", (!collapsed || isOpen) && "justify-start px-2")}>
                                <button
                                    onClick={() => {
                                        if (confirm("Are you sure you want to leave this team? You will lose access to shared items.")) {
                                            useStore.getState().leaveTeam();
                                            window.location.reload();
                                        }
                                    }}
                                    className="flex items-center gap-2 text-[10px] text-text-muted hover:text-red-500 transition-colors w-full justify-center"
                                >
                                    <span className={clsx((!collapsed || isOpen) ? "inline" : "hidden")}>{t.nav.leave_team}</span>
                                </button>
                            </div>
                        )}

                    </div>
                </div>

                <CreateWorkspaceModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                />

                {isTaskModalOpen && (
                    <EditTaskModal
                        task={{ status: 'todo', priority: 'medium' }}
                        mode="create"
                        onClose={() => setIsTaskModalOpen(false)}
                    />
                )}
            </aside >
        </>
    );
}

function SearchIcon({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
    )
}
