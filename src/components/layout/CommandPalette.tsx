import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Calendar, CheckSquare, Inbox, Plus, StickyNote } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../core/store';

type CommandAction = {
    id: string;
    label: string;
    icon: React.ElementType;
    shortcut?: string;
    perform: () => void;
    type: 'navigation' | 'action';
};

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();
    const { addNote } = useStore();

    const actions: CommandAction[] = useMemo(() => [
        {
            id: 'nav-inbox',
            label: 'Go to Inbox',
            icon: Inbox,
            type: 'navigation',
            perform: () => navigate('/inbox')
        },
        {
            id: 'nav-tasks',
            label: 'Go to Tasks',
            icon: CheckSquare,
            type: 'navigation',
            perform: () => navigate('/tasks')
        },
        {
            id: 'nav-calendar',
            label: 'Go to Calendar',
            icon: Calendar,
            type: 'navigation',
            perform: () => navigate('/calendar')
        },

        {
            id: 'nav-notes',
            label: 'Go to Notes',
            icon: StickyNote,
            type: 'navigation',
            perform: () => navigate('/notes')
        },
        {
            id: 'act-create-note',
            label: 'Create new Note',
            icon: Plus,
            type: 'action',
            perform: () => {
                const id = addNote('', '');
                navigate(`/notes/${id}`);
            }
        },
        {
            id: 'act-new-task',
            label: 'Create new Task',
            icon: Plus,
            type: 'action',
            perform: () => navigate('/inbox') // For now, direct to inbox for capture
        }
    ], [navigate, addNote]);

    const filteredActions = actions.filter(action =>
        action.label.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(prev => !prev);
                setQuery('');
                setSelectedIndex(0);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        // Reset selection when query changes
        setSelectedIndex(0);
    }, [query]);

    // Handle navigation within palette
    useEffect(() => {
        if (!isOpen) return;
        const handleNav = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredActions.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredActions[selectedIndex]) {
                    filteredActions[selectedIndex].perform();
                    setIsOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [isOpen, filteredActions, selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] transition-opacity duration-200">
            <div className="w-full max-w-[600px] bg-bg-card border border-border-subtle rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200">

                <div className="flex items-center px-5 py-4 border-b border-border-subtle gap-4">
                    <Search className="text-accent-primary w-5 h-5" strokeWidth={2.5} />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Type a command or search..."
                        className="bg-transparent border-none outline-none flex-1 text-lg text-text-primary placeholder:text-text-muted font-medium"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <kbd className="text-[10px] font-bold tracking-wider text-text-muted border border-border-subtle px-2 py-1 rounded bg-bg-input">ESC</kbd>
                </div>

                <div className="max-h-[320px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border-subtle scrollbar-track-transparent">
                    {filteredActions.length === 0 ? (
                        <div className="p-8 text-center text-text-muted text-sm flex flex-col items-center">
                            <Search className="w-8 h-8 opacity-20 mb-2" />
                            No results found
                        </div>
                    ) : (
                        filteredActions.map((action, index) => (
                            <button
                                key={action.id}
                                onClick={() => {
                                    action.perform();
                                    setIsOpen(false);
                                }}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] transition-all text-left group",
                                    index === selectedIndex
                                        ? "bg-accent-primary text-white shadow-md shadow-accent-primary/20"
                                        : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
                                )}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <action.icon
                                    size={20}
                                    className={clsx(
                                        "transition-colors",
                                        index === selectedIndex ? "text-white" : "text-text-muted group-hover:text-text-secondary"
                                    )}
                                />
                                <span className={clsx("flex-1 font-medium", index === selectedIndex ? "text-white" : "")}>
                                    {action.label}
                                </span>
                                {action.shortcut && (
                                    <span className={
                                        clsx(
                                            "text-xs font-mono px-1.5 py-0.5 rounded border",
                                            index === selectedIndex ? "border-white/30 text-white/80" : "border-border-subtle text-text-muted"
                                        )}>
                                        {action.shortcut}
                                    </span>
                                )}
                                {index === selectedIndex && <ArrowRight size={16} className="text-white animate-in slide-in-from-left-2 fade-in duration-200" />}
                            </button>
                        ))
                    )}
                </div>

                <div className="px-4 py-2.5 border-t border-border-subtle bg-bg-input/30 text-[11px] text-text-muted flex items-center justify-between font-medium">
                    <span><span className="text-text-primary">Tab</span> to navigate</span>
                    <span><span className="text-text-primary">Enter</span> to select</span>
                </div>
            </div>
        </div >
    );
}
