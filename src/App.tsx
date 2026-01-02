import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Inbox, CheckSquare, Calendar, Layers, Command, StickyNote, Users, Sparkles, LogOut, Shield } from 'lucide-react';
import { InboxView } from './features/InboxView';
import { TaskListView } from './features/TaskListView';
import { CalendarView } from './features/CalendarView';
import { ProjectsView } from './features/ProjectsView';
import { ProjectDetailView } from './features/ProjectDetailView';
import { NotesView } from './features/NotesView';
import { TeamBoardView } from './features/TeamBoardView';
import { AuthView } from './features/AuthView';
import { AdminView } from './features/AdminView';
import { SettingsView } from './features/SettingsView';
import { CommandPalette } from './components/CommandPalette';
import { useStore } from './core/store';
import { supabase } from './core/supabase';
import clsx from 'clsx';

function Sidebar() {
  const { user } = useStore();

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

  if (user?.role === 'owner') {
    navItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  return (
    <aside className="w-64 bg-bg-sidebar border-r border-border-subtle flex flex-col justify-between shrink-0 glass-panel">
      <div>
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block leading-none">Cortex</span>
            <span className="text-[10px] text-violet-400 font-medium tracking-wider uppercase">AI Assistant</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-violet-500/10 text-violet-300 shadow-sm border border-violet-500/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card-hover"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-border-subtle bg-black/20">

        {/* Command Helper */}
        <button
          className="flex items-center gap-3 px-3 py-2 w-full text-left text-sm text-text-secondary hover:text-text-primary transition-colors bg-bg-card/40 rounded-lg border border-border-subtle mb-4 group"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
        >
          <Command size={14} className="group-hover:text-violet-400 transition-colors" />
          <div className="flex-1 text-xs font-medium">Command Menu</div>
          <kbd className="text-[10px] text-text-muted font-mono border border-border-subtle px-1.5 rounded bg-bg-app">^K</kbd>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 px-1 pt-2">
          <NavLink to="/settings" className="flex-1 flex items-center gap-3 min-w-0 hover:bg-white/5 p-1 rounded-lg transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-600 p-[1px]">
              <img src={user?.avatar} alt="User" className="rounded-full w-full h-full bg-bg-app object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-text-primary group-hover:text-violet-300 transition-colors">{user?.name || "User"}</div>
              <div className="text-xs text-text-muted truncate">{user?.role || "Team Member"}</div>
            </div>
          </NavLink>
          <button onClick={handleLogout} className="text-text-muted hover:text-danger transition-colors p-2" title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}



export default function App() {
  const { user, initialize } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        initialize(); // Load data
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        initialize();
      } else {
        // Handle sign out cleanup if needed
      }
    });

    return () => subscription.unsubscribe();
  }, [initialize]);


  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-app text-violet-500">
        <Sparkles className="animate-pulse w-8 h-8" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={!user ? <AuthView /> : <Navigate to="/" />} />

        <Route path="/*" element={
          !user ? <Navigate to="/auth" /> : (
            <div className="flex h-screen w-screen overflow-hidden bg-bg-app text-text-primary">
              <Sidebar />
              <main className="flex-1 overflow-hidden relative flex flex-col bg-bg-app">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none" />
                <CommandPalette />
                <Routes>
                  <Route path="/" element={<Navigate to="/inbox" replace />} />
                  <Route path="/inbox" element={<InboxView />} />
                  <Route path="/tasks" element={<TaskListView />} />
                  <Route path="/team" element={<TeamBoardView />} />
                  <Route path="/calendar" element={<CalendarView />} />
                  <Route path="/projects" element={<ProjectsView />} />
                  <Route path="/projects/:projectId" element={<ProjectDetailView />} />
                  <Route path="/notes" element={<NotesView />} />
                  <Route path="/notes/:noteId" element={<NotesView />} />
                  <Route path="/admin" element={<AdminView />} />
                  <Route path="/settings" element={<SettingsView />} />
                </Routes>
              </main>
            </div>
          )
        } />
      </Routes>
    </Router>
  );
}
