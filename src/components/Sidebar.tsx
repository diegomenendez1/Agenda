import { NavLink } from 'react-router-dom';
import { Inbox, CheckSquare, Calendar, Layers, Command, StickyNote, Users, Sparkles, LogOut, Shield, ChevronRight } from 'lucide-react';
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
        { icon: CheckSquare, label: 'My Focus', path: '/tasks' },
        { icon: Users, label: 'Team Board', path: '/team' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
        { icon: Layers, label: 'Projects', path: '/projects' },
        { icon: StickyNote, label: 'Notes', path: '/notes' },
    ];

    return (
        <aside
            className={clsx(
                "h-[calc(100vh-2rem)] my-4 ml-4 rounded-2xl bg-[#13151C]/90 border border-white/5 backdrop-blur-xl flex flex-col justify-between shrink-0 transition-all duration-300 relative z-50",
                collapsed ? "w-20" : "w-64"
            )}
            style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 20px 40px -10px rgba(0,0,0,0.4)" }}
        >
            {/* Toggle Handle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-8 bg-violet-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50 group"
            >
                <ChevronRight size={14} className={clsx("transition-transform duration-300 group-hover:text-white", !collapsed && "rotate-180")} />
            </button>

            <div>
                {/* Header */}
                <div className={clsx("flex items-center gap-3 px-6 py-8 transition-all duration-300", collapsed && "px-0 justify-center")}>
                    <div className="w-9 h-9 min-w-[36px] rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                        <Sparkles className="text-white w-5 h-5" />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <span className="font-bold text-lg tracking-tight block leading-none text-white">Cortex</span>
                            <span className="text-xs text-violet-400 font-bold tracking-widest uppercase">Pro Workspace</span>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex flex-col gap-1 px-3">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-violet-500/15 text-violet-300"
                                    : "text-text-secondary hover:text-text-primary hover:bg-white/5",
                                collapsed && "justify-center"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={20} />

                                    {!collapsed && <span className="text-lg font-medium">{item.label}</span>}

                                    {isActive && !collapsed && (
                                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-violet-500" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}

                    {user?.role === 'owner' && (
                        <NavLink
                            to="/admin"
                            className={({ isActive }) => clsx(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative mt-4",
                                isActive
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "text-text-secondary hover:text-amber-500 hover:bg-white/5",
                                collapsed && "justify-center"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <Shield size={20} />
                                    {!collapsed && <span className="text-lg font-medium">Admin</span>}
                                    {isActive && !collapsed && (
                                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    )}
                </nav>
            </div>

            {/* Command Helper & Profile */}
            <div className="p-4 border-t border-white/5">
                {!collapsed && (
                    <button
                        className="flex items-center gap-3 px-3 py-2.5 w-full text-left text-lg text-text-secondary hover:text-text-primary transition-colors bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 mb-4 group overflow-hidden"
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                    >
                        <Command size={14} className="group-hover:text-violet-400 transition-colors" />
                        <div className="flex-1 text-base font-medium truncate">Search...</div>
                        <kbd className="text-sm text-text-muted font-mono border border-white/10 px-1.5 rounded bg-black/40">^K</kbd>
                    </button>
                )}

                <div className={clsx("flex items-center gap-3", collapsed ? "justify-center flex-col gap-4" : "px-1 pt-2")}>
                    <NavLink to="/settings" className={clsx("flex items-center gap-3 min-w-0 hover:bg-white/5 rounded-xl transition-colors group", !collapsed && "flex-1 p-2")}>
                        <div className="w-9 h-9 min-w-[36px] rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-600 p-[1.5px] shadow-lg">
                            <img src={user?.avatar || "https://ui-avatars.com/api/?name=User&background=random"} alt="User" className="rounded-full w-full h-full bg-bg-app object-cover" />
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="text-lg font-medium truncate text-text-primary group-hover:text-violet-300 transition-colors">{user?.name || "User"}</div>
                                <div className="text-lg text-text-muted truncate">{user?.role || "Team Member"}</div>
                            </div>
                        )}
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        className={clsx("text-text-muted hover:text-danger transition-colors hover:bg-red-500/10 rounded-lg", !collapsed ? "p-2" : "p-2")}
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
