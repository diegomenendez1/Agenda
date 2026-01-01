import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Inbox, CheckSquare, Calendar, Layers, Command, StickyNote } from 'lucide-react';
import { InboxView } from './features/InboxView';
import { TaskListView } from './features/TaskListView';
import { CalendarView } from './features/CalendarView';
import { ProjectsView } from './features/ProjectsView';
import { ProjectDetailView } from './features/ProjectDetailView';
import { NotesView } from './features/NotesView';
import { CommandPalette } from './components/CommandPalette';
import clsx from 'clsx';

function Sidebar() {
  const navItems = [
    { icon: Inbox, label: 'Inbox', path: '/inbox' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: Layers, label: 'Projects', path: '/projects' },
    { icon: StickyNote, label: 'Notes', path: '/notes' },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-border-subtle flex flex-col justify-between p-4 pt-8 shrink-0">
      <div>
        <div className="flex items-center gap-3 px-4 mb-8">
          <div className="w-6 h-6 bg-accent-primary rounded-md"></div>
          <span className="font-bold text-lg tracking-tight">Organize</span>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                isActive ? "bg-bg-card text-accent-primary" : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto">
        <button
          className="flex items-center gap-3 px-4 py-2 w-full text-left text-sm text-text-secondary hover:text-text-primary transition-colors bg-bg-card/50 rounded-md border border-transparent hover:border-border-subtle"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
        >
          <Command size={16} />
          <div className="flex-1">Cmd Palette</div>
          <kbd className="text-xs text-muted font-mono border border-border-subtle px-1.5 rounded bg-bg-app">^K</kbd>
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <Router>
      <div className="flex h-screen w-screen overflow-hidden bg-bg-app text-text-primary">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative flex flex-col">
          <CommandPalette />
          <Routes>
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox" element={<InboxView />} />
            <Route path="/tasks" element={<TaskListView />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/projects" element={<ProjectsView />} />
            <Route path="/projects/:projectId" element={<ProjectDetailView />} />
            <Route path="/notes" element={<NotesView />} />
            <Route path="/notes/:noteId" element={<NotesView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
