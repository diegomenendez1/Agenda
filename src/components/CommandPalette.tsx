import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Calendar, CheckSquare, Inbox, Layers, Plus, StickyNote } from 'lucide-react';
import clsx from 'clsx';


type CommandAction = {
    id: string;
    label: string;
    icon: React.ElementType;
    shortcut?: string;
    perform: () => void;
    type: 'navigation' | 'action';
};

import { useStore } from '../core/store';

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
            id: 'nav-projects',
            label: 'Go to Projects',
            icon: Layers,
            type: 'navigation',
            perform: () => navigate('/projects')
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]">
            <div className="w-full max-w-xl bg-bg-card border border-border-subtle rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">

                <div className="flex items-center px-4 py-4 border-b border-border-subtle gap-3">
                    <Search className="text-muted w-5 h-5" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Type a command or search..."
                        className="bg-transparent border-none outline-none flex-1 text-lg text-primary placeholder:text-muted"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <div className="text-xs font-mono text-muted border border-border-subtle px-2 py-1 rounded">Esc</div>
                </div>

                <div className="max-h-[300px] overflow-y-auto p-2">
                    {filteredActions.length === 0 ? (
                        <div className="p-4 text-center text-muted text-sm">No results found</div>
                    ) : (
                        filteredActions.map((action, index) => (
                            <button
                                key={action.id}
                                onClick={() => {
                                    action.perform();
                                    setIsOpen(false);
                                }}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors text-left",
                                    index === selectedIndex ? "bg-accent-primary text-white" : "text-text-secondary hover:bg-bg-card-hover hover:text-primary"
                                )}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <action.icon size={18} className={index === selectedIndex ? "text-white" : "text-muted"} />
                                <span className="flex-1">{action.label}</span>
                                {action.shortcut && (
                                    <span className="text-xs opacity-60 font-mono">{action.shortcut}</span>
                                )}
                                {index === selectedIndex && <ArrowRight size={14} className="opacity-60" />}
                            </button>
                        ))
                    )}
                </div>

                <div className="p-2 border-t border-border-subtle bg-bg-app/50 text-xs text-muted flex items-center justify-between px-4">
                    <span>Protip: Navigate with <span className="font-mono">↑↓</span> and selects with <span className="font-mono">Enter</span></span>
                </div>
            </div>
        </div>
    );
}
