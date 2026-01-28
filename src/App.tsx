import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { InboxView } from './features/InboxView';
import { TaskListView } from './features/TaskListView';
import { CalendarView } from './features/CalendarView';

import { NotesView } from './features/NotesView';
import { MyTeamView } from './components/MyTeamView';
import { AuthView } from './features/AuthView';
import { SettingsView } from './features/SettingsView';
import { KPIView } from './features/KPIView';
import { OnboardingView } from './features/OnboardingView';
import { CommandPalette } from './components/CommandPalette';
import { Sidebar } from './components/Sidebar';
import { DailyDigestModal } from './components/DailyDigestModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useStore } from './core/store';
import { supabase } from './core/supabase';
import { Toaster } from 'sonner';

import { Menu } from 'lucide-react'; // Added Menu

export default function App() {
  console.log('[App] Component rendering...');
  const { user, initialize } = useStore();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // New State

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await initialize(); // Load data
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

  useEffect(() => {
    // Force light mode
    document.documentElement.classList.remove('dark');
  }, []);


  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-app text-violet-500">
        <Sparkles className="animate-pulse w-8 h-8" />
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="bottom-right" richColors theme="light" />
      <Routes>
        <Route path="/auth" element={!user ? <AuthView /> : <Navigate to="/" />} />

        <Route path="/*" element={
          !user ? <Navigate to="/auth" /> : !user.organizationId ? <OnboardingView /> : (
            <div className="flex h-screen w-screen overflow-hidden bg-bg-app text-text-primary">

              <div className="h-full flex gap-0 relative z-10 w-full max-w-[1920px] mx-auto">
                <ErrorBoundary>
                  <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
                </ErrorBoundary>

                <main className="flex-1 overflow-hidden relative flex flex-col bg-bg-app transition-all">
                  {/* Mobile Menu Button - Floating on top left */}
                  <div className="lg:hidden p-4 absolute top-0 left-0 z-20">
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      className="bg-bg-card border border-border-subtle p-2 rounded-lg shadow-sm text-text-primary hover:text-accent-primary"
                    >
                      <Menu size={20} />
                    </button>
                  </div>

                  <CommandPalette />
                  <DailyDigestModal />

                  <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <ErrorBoundary>
                      <Routes>
                        <Route path="/" element={<Navigate to="/inbox" replace />} />
                        <Route path="/inbox" element={<InboxView />} />
                        <Route path="/tasks" element={<TaskListView />} />
                        <Route path="/tasks/:taskId" element={<TaskListView />} />
                        <Route path="/my-team" element={<MyTeamView />} />
                        <Route path="/calendar" element={<CalendarView />} />

                        <Route path="/notes" element={<NotesView />} />
                        <Route path="/notes/:noteId" element={<NotesView />} />
                        <Route path="/kpis" element={<KPIView />} />
                        <Route path="/settings" element={<SettingsView />} />
                      </Routes>
                    </ErrorBoundary>
                  </div>
                </main>
              </div>
            </div>
          )
        } />
      </Routes>
    </Router>
  );
}
