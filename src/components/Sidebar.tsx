import { NavLink } from 'react-router-dom';
import { Inbox, CheckSquare, Calendar, Layers, StickyNote, Users, Sparkles, LogOut, Shield, ChevronRight } from 'lucide-react';
import { useStore } from '../core/store';
import { supabase } from '../core/supabase';
import clsx from 'clsx';
import { useState } from 'react';

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
        { icon: StickyNote, label: 'Notes', path: '/notes' },
    ];

    return (
        <aside
            className={clsx(
                "h-full border-r border-border-subtle bg-bg-sidebar flex flex-col justify-between shrink-0 transition-all duration-300 relative z-50",
                collapsed ? "w-[72px]" : "w-[240px]"
            )}
        >

            {/* Toggle Handle - Minimalist */}
            {/* Toggle Handle - Minimalist */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-9 bg-bg-card text-text-muted border border-border-subtle w-6 h-6 rounded-full flex items-center justify-center shadow-sm hover:text-accent-primary hover:scale-105 transition-all z-50 hover:border-accent-secondary"
            >
                <ChevronRight size={12} className={clsx("transition-transform duration-300", !collapsed && "rotate-180")} />
            </button>

            <div className="relative z-10">
                {/* Header */}
                <div className={clsx("flex items-center gap-3 px-5 py-6 transition-all duration-300", collapsed && "px-0 justify-center")}>
                    <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center shadow-md shadow-accent-glow shrink-0">
                        <Sparkles className="text-white w-4 h-4" />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden flex flex-col justify-center animate-enter">
                            <span className="font-semibold text-base tracking-tight leading-none text-text-primary">Cortex</span>
                            <span className="text-[11px] text-text-muted font-medium tracking-wider uppercase mt-1">Workspace</span>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex flex-col gap-1 px-3 mt-2">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative mx-2",
                                isActive
                                    ? "bg-bg-card shadow-sm text-accent-primary font-medium border border-border-subtle"
                                    : "text-text-secondary hover:text-text-primary hover:bg-bg-card-hover",
                                collapsed && "justify-center px-0 w-10 h-10 mx-auto"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={18} className={clsx("transition-transform duration-300", isActive ? "text-accent-primary" : "text-text-muted group-hover:text-text-secondary", !collapsed && "group-hover:translate-x-0.5")} />

                                    {!collapsed && <span className="text-[14px]">{item.label}</span>}

                                    {/* Tooltip for collapsed */}
                                    {collapsed && (
                                        <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 bg-text-primary text-bg-app border border-border-subtle text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] transition-opacity shadow-xl translate-x-1 group-hover:translate-x-0">
                                            {item.label}
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}

                    {(user?.role === 'owner' || user?.role === 'admin') && (
                        <>
                            <div className="h-px bg-border-subtle my-2 mx-4" />
                            <NavLink
                                to="/admin"
                                className={({ isActive }) => clsx(
                                    "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative mx-2",
                                    isActive
                                        ? "bg-amber-500/10 text-amber-500 font-medium border border-amber-500/20"
                                        : "text-text-muted hover:text-amber-500 hover:bg-amber-500/10",
                                    collapsed && "justify-center px-0 w-10 h-10 mx-auto"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Shield size={18} className={clsx("transition-transform duration-300", isActive ? "text-amber-500" : "text-text-muted group-hover:text-amber-500", !collapsed && "group-hover:translate-x-0.5")} />
                                        {!collapsed && <span className="text-[14px]">Workspace</span>}
                                        {collapsed && (
                                            <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 bg-text-primary text-bg-app border border-border-subtle text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] transition-opacity shadow-xl">
                                                Workspace
                                            </div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        </>
                    )}
                </nav>
            </div>

            {/* Footer Area */}
            <div className="p-4 border-t border-border-subtle relative z-10 bg-bg-sidebar">
                {!collapsed && (
                    <button
                        className="flex items-center gap-3 px-3 py-2 w-full text-left bg-bg-card hover:bg-bg-card-hover transition-all rounded-md border border-border-subtle mb-4 group shadow-sm"
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                    >
                        <SearchIcon size={14} className="text-text-muted group-hover:text-accent-primary transition-colors" />
                        <span className="flex-1 text-xs font-medium text-text-secondary">Search...</span>
                        <kbd className="text-[10px] text-text-muted font-sans border border-border-subtle px-1.5 rounded bg-bg-input">⌘K</kbd>
                    </button>
                )}

                <div className={clsx("flex items-center gap-2", collapsed ? "justify-center flex-col gap-4" : "")}>
                    <NavLink to="/settings" className={clsx("flex items-center gap-3 min-w-0 hover:bg-bg-card-hover rounded-md transition-colors group p-2", !collapsed && "flex-1")}>
                        <div className="w-8 h-8 rounded-full bg-bg-input p-[1px] shrink-0 relative">
                            <img src={user?.avatar || "https://ui-avatars.com/api/?name=User&background=random"} alt="User" className="rounded-full w-full h-full object-cover" />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-bg-card rounded-full" />
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium truncate text-text-primary group-hover:text-accent-primary transition-colors">{user?.name || "User"}</div>
                                <div className="text-[11px] text-text-muted truncate">{user?.role || "Member"}</div>
                            </div>
                        )}
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        className={clsx("text-text-muted hover:text-red-500 transition-colors hover:bg-bg-card-hover rounded-md shrink-0", !collapsed ? "p-2" : "p-2")}
                        title="Sign Out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}

function SearchIcon({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
    )
}
