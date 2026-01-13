import { NavLink } from 'react-router-dom';
import { Inbox, CheckSquare, Calendar, Layers, StickyNote, Users, Sparkles, LogOut, Shield, ChevronRight, TrendingUp } from 'lucide-react';
import { useStore } from '../core/store';
import { supabase } from '../core/supabase';
import { NotificationCenter } from './NotificationCenter';
import clsx from 'clsx';
import { useState } from 'react';
import { PresenceIndicator } from './PresenceIndicator';

export function Sidebar() {
    const { user } = useStore();
    const [collapsed, setCollapsed] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    const navItems = [
        { icon: Inbox, label: 'Inbox', path: '/inbox' },
        { icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
        { icon: Users, label: 'Team', path: '/team' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
        { icon: Layers, label: 'Projects', path: '/projects' },
        { icon: TrendingUp, label: 'Analytics', path: '/kpis' },
        { icon: StickyNote, label: 'Notes', path: '/notes' },
    ];

    return (
        <aside
            className={clsx(
                "h-full border-r border-border-subtle bg-bg-sidebar flex flex-col justify-between shrink-0 transition-all duration-300 relative z-50",
                collapsed ? "w-[80px]" : "w-[260px]"
            )}
        >
            {/* Toggle Handle - Clean & Integrated */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-10 bg-bg-card text-text-muted border border-border-subtle w-6 h-6 rounded-full flex items-center justify-center shadow-sm hover:text-accent-primary hover:scale-110 active:scale-95 transition-all z-50 hover:border-accent-secondary"
            >
                <ChevronRight size={14} className={clsx("transition-transform duration-300", !collapsed && "rotate-180")} />
            </button>

            <div className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className={clsx("flex items-center gap-3 px-6 py-8 transition-all duration-300", collapsed && "px-0 justify-center")}>
                    <div className="w-9 h-9 rounded-xl bg-accent-primary flex items-center justify-center shadow-lg shadow-accent-glow shrink-0 transition-transform hover:scale-105 cursor-pointer">
                        <Sparkles className="text-white w-5 h-5" />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden flex flex-col justify-center animate-enter">
                            <span id="cortex-sidebar-title" className="font-display font-bold text-lg tracking-tight leading-none text-text-primary">Cortex</span>
                            <span className="text-[11px] text-text-muted font-medium tracking-wide uppercase mt-1">Workspace</span>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex flex-1 flex-col gap-1 px-3 mt-2 overflow-y-auto custom-scrollbar">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative mx-1",
                                isActive
                                    ? "bg-bg-card shadow-sm text-accent-primary font-medium ring-1 ring-border-subtle"
                                    : "text-text-secondary hover:text-text-primary hover:bg-bg-card-hover/80",
                                collapsed && "justify-center px-0 w-11 h-11 mx-auto"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon
                                        size={20}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={clsx("transition-colors duration-300", isActive ? "text-accent-primary" : "text-text-muted group-hover:text-text-secondary")}
                                    />

                                    {!collapsed && <span className="text-[14px]">{item.label}</span>}

                                    {/* Tooltip for collapsed */}
                                    {collapsed && (
                                        <div className="absolute left-[calc(100%+8px)] px-3 py-1.5 bg-text-primary text-bg-app border border-border-subtle text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] transition-opacity shadow-lg translate-x-1 group-hover:translate-x-0 font-medium">
                                            {item.label}
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}

                    <div className="mt-4 mb-2 px-4">
                        <div className="h-px bg-border-subtle/60 w-full" />
                    </div>

                    {(user?.role === 'owner' || user?.role === 'admin') && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative mx-1",
                                isActive
                                    ? "bg-amber-500/10 text-amber-600 font-medium ring-1 ring-amber-500/20"
                                    : "text-text-muted hover:text-amber-600 hover:bg-amber-500/5",
                                collapsed && "justify-center px-0 w-11 h-11 mx-auto"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <Shield size={20} strokeWidth={isActive ? 2.5 : 2} className={clsx("transition-transform duration-300", isActive ? "text-amber-600" : "text-text-muted group-hover:text-amber-600")} />
                                    {!collapsed && <span className="text-[14px]">Admin</span>}
                                    {collapsed && (
                                        <div className="absolute left-[calc(100%+8px)] px-3 py-1.5 bg-text-primary text-bg-app border border-border-subtle text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] transition-opacity shadow-lg">
                                            Admin
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    )}
                </nav>

                {/* Footer Area */}
                <div className="p-4 border-t border-border-subtle relative z-10 bg-bg-sidebar mt-auto">
                    {!collapsed && (
                        <button
                            className="flex items-center gap-3 px-3 py-2.5 w-full text-left bg-bg-card hover:bg-bg-card-hover transition-all rounded-lg border border-border-subtle mb-4 group shadow-sm active:translate-y-[1px]"
                            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                        >
                            <SearchIcon size={16} className="text-text-muted group-hover:text-accent-primary transition-colors" />
                            <span className="flex-1 text-xs font-medium text-text-secondary">Search...</span>
                            <kbd className="text-[10px] text-text-muted font-sans border border-border-subtle px-1.5 py-0.5 rounded bg-bg-input group-hover:bg-bg-card transition-colors">⌘K</kbd>
                        </button>
                    )}

                    <div className={clsx("flex items-center gap-2", collapsed ? "justify-center flex-col gap-4" : "")}>
                        {/* Notification Center */}
                        <div className={clsx("transition-all", collapsed && "mx-auto")}>
                            <NotificationCenter />
                        </div>

                        <NavLink to="/settings" className={clsx("flex items-center gap-3 min-w-0 hover:bg-bg-card-hover rounded-lg transition-colors group p-2 flex-1 border border-transparent hover:border-border-subtle", !collapsed && "")}>
                            <div className="w-9 h-9 rounded-full bg-accent-secondary/20 p-[1px] shrink-0 relative overflow-hidden ring-2 ring-transparent group-hover:ring-border-subtle transition-all">
                                <img src={user?.avatar || "https://ui-avatars.com/api/?name=User&background=random"} alt="User" className="rounded-full w-full h-full object-cover" />
                                <div className="absolute bottom-0 right-0 z-10">
                                    <PresenceIndicator userId={user?.id || ''} size="sm" showOffline={false} />
                                </div>
                            </div>
                            {!collapsed && (
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-semibold truncate text-text-primary group-hover:text-accent-primary transition-colors">{user?.name || "User"}</div>
                                    <div className="text-[11px] text-text-muted truncate group-hover:text-text-secondary">{user?.email}</div>
                                </div>
                            )}
                        </NavLink>

                        <button
                            onClick={handleLogout}
                            className={clsx("text-text-muted hover:text-priority-critical transition-all hover:bg-red-50 rounded-lg shrink-0 flex items-center justify-center", !collapsed ? "p-2.5" : "p-2.5")}
                            title="Sign Out"
                        >
                            <LogOut size={18} strokeWidth={2} />
                        </button>
                    </div>

                </div>
            </div >
        </aside >
    );
}

function SearchIcon({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
    )
}
