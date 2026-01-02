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
        { icon: CheckSquare, label: 'My Focus', path: '/tasks' },
        { icon: Users, label: 'Team Board', path: '/team' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
        { icon: Layers, label: 'Projects', path: '/projects' },
        { icon: StickyNote, label: 'Notes', path: '/notes' },
    ];

    return (
        <aside
            className={clsx(
                "h-[calc(100vh-2rem)] my-4 ml-4 rounded-[24px] bg-[#07080C] border border-white/5 flex flex-col justify-between shrink-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-50 overflow-hidden",
                collapsed ? "w-[72px]" : "w-[260px]"
            )}
            style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 20px 40px -10px rgba(0,0,0,0.6)" }}
        >
            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

            {/* Toggle Handle - Minimalist */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-10 bg-[#1A1D24] text-gray-400 border border-white/5 w-6 h-6 rounded-full flex items-center justify-center shadow-xl hover:text-white hover:scale-105 transition-all z-50 group hover:border-white/10"
            >
                <ChevronRight size={12} className={clsx("transition-transform duration-500", !collapsed && "rotate-180")} />
            </button>

            <div className="relative z-10">
                {/* Header */}
                <div className={clsx("flex items-center gap-3 px-5 py-8 transition-all duration-300 h-[88px]", collapsed && "px-0 justify-center")}>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 shrink-0">
                        <Sparkles className="text-white w-4 h-4" />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden flex flex-col justify-center animate-enter">
                            <span className="font-semibold text-base tracking-tight leading-none text-white">Cortex</span>
                            <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase mt-1">Pro Workspace</span>
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
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                                isActive
                                    ? "bg-white/[0.04] text-indigo-300"
                                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]",
                                collapsed && "justify-center px-0 w-10 h-10 mx-auto"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={18} className={clsx("transition-transform duration-300", isActive && "text-indigo-400", !collapsed && "group-hover:translate-x-0.5")} />

                                    {!collapsed && <span className="text-[14px] font-medium tracking-wide">{item.label}</span>}

                                    {isActive && (
                                        <div className={clsx(
                                            "absolute rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]",
                                            collapsed ? "top-3 right-2 w-1.5 h-1.5" : "left-0 w-1 h-4 rounded-r-lg opacity-80"
                                        )} />
                                    )}

                                    {/* Tooltip for collapsed */}
                                    {collapsed && (
                                        <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 bg-[#1A1D24] border border-white/10 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] transition-opacity shadow-2xl translate-x-1 group-hover:translate-x-0">
                                            {item.label}
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}

                    {user?.role === 'owner' && (
                        <>
                            <div className="h-px bg-white/5 my-2 mx-4" />
                            <NavLink
                                to="/admin"
                                className={({ isActive }) => clsx(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-amber-500/5 text-amber-500"
                                        : "text-gray-400 hover:text-amber-400 hover:bg-amber-500/5",
                                    collapsed && "justify-center px-0 w-10 h-10 mx-auto"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Shield size={18} />
                                        {!collapsed && <span className="text-[14px] font-medium tracking-wide">Admin</span>}
                                        {collapsed && (
                                            <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 bg-[#1A1D24] border border-white/10 text-amber-500 text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] transition-opacity shadow-2xl">
                                                Admin
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
            <div className="p-4 border-t border-white/5 relative z-10 bg-[#07080C]">
                {!collapsed && (
                    <button
                        className="flex items-center gap-3 px-3 py-2 w-full text-left bg-[#13151A] hover:bg-[#1A1D24] hover:border-white/10 transition-all rounded-lg border border-white/5 mb-4 group ring-1 ring-transparent hover:ring-white/5"
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                    >
                        <SearchIcon size={14} className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
                        <span className="flex-1 text-xs font-medium text-gray-400">Search...</span>
                        <kbd className="text-[10px] text-gray-600 font-sans border border-white/5 px-1.5 rounded bg-black/20">⌘K</kbd>
                    </button>
                )}

                <div className={clsx("flex items-center gap-3", collapsed ? "justify-center flex-col gap-4" : "px-0")}>
                    <NavLink to="/settings" className={clsx("flex items-center gap-3 min-w-0 hover:bg-white/5 rounded-lg transition-colors group -ml-2 p-2", !collapsed && "flex-1")}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 p-[1px] ring-2 ring-black shrink-0 relative">
                            <img src={user?.avatar || "https://ui-avatars.com/api/?name=User&background=random"} alt="User" className="rounded-full w-full h-full bg-black object-cover" />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full" />
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium truncate text-gray-200 group-hover:text-white transition-colors">{user?.name || "User"}</div>
                                <div className="text-[11px] text-gray-500 truncate">{user?.role || "Member"}</div>
                            </div>
                        )}
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        className={clsx("text-gray-500 hover:text-white transition-colors hover:bg-white/5 rounded-lg shrink-0", !collapsed ? "p-2" : "p-2")}
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
