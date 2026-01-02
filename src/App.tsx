import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
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
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useStore } from './core/store';
import { supabase } from './core/supabase';

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
            <div className="flex h-screen w-screen overflow-hidden bg-[#000000] text-text-primary selection:bg-accent-primary/30">
              {/* Background Ambient Effects */}
              <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
              </div>

              <ErrorBoundary>
                <Sidebar />
              </ErrorBoundary>

              <main className="flex-1 overflow-hidden relative flex flex-col m-4 ml-0 rounded-2xl bg-[#0E1016] border border-white/5 shadow-2xl z-10 clip-path-content">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none" />

                <CommandPalette />

                <div className="flex-1 overflow-auto custom-scrollbar relative">
                  <ErrorBoundary>
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
                  </ErrorBoundary>
                </div>
              </main>
            </div>
          )
        } />
      </Routes>
    </Router>
  );
}
