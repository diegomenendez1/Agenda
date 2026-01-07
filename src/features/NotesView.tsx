import { useState, useMemo } from 'react';
import { StickyNote, Plus, Trash2, Search, FileText, Folder, MoreVertical } from 'lucide-react';
import { useStore } from '../core/store';
import { useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { format } from 'date-fns';

export function NotesView() {
    const { notes, projects, addNote, updateNote, deleteNote } = useStore();
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const notesList = useMemo(() => {
        return Object.values(notes)
            .filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.body.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [notes, searchQuery]);

    const handleCreateNote = () => {
        const id = addNote('', '');
        navigate(`/notes/${id}`);
    };

    const handleDeleteNote = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this note?')) {
            deleteNote(id);
            if (noteId === id) navigate('/notes');
        }
    };

    const selectedNote = noteId ? notes[noteId] : null;

    return (
        <div className="flex h-full overflow-hidden bg-bg-app">
            {/* Notes Sidebar */}
            <div className="w-80 border-r border-border-subtle bg-bg-sidebar/50 backdrop-blur-xl flex flex-col z-10 transition-all duration-300">
                <div className="p-5 border-b border-border-subtle">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-display font-bold flex items-center gap-2.5 tracking-tight text-text-primary">
                            <div className="w-8 h-8 rounded-lg bg-accent-secondary/10 flex items-center justify-center">
                                <StickyNote size={18} className="text-accent-secondary" />
                            </div>
                            Notes
                        </h2>
                        <button
                            onClick={handleCreateNote}
                            className="btn btn-icon btn-sm bg-bg-card hover:bg-accent-primary hover:text-white shadow-sm border border-border-subtle"
                            title="New Note"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="input w-full pl-9 py-2 text-sm bg-bg-input border-transparent focus:bg-bg-card transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 hover:custom-scrollbar">
                    {notesList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-text-muted text-sm italic opacity-60">
                            No notes found.
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-1.5">
                            {notesList.map(note => (
                                <li
                                    key={note.id}
                                    onClick={() => navigate(`/notes/${note.id}`)}
                                    className={clsx(
                                        "p-3.5 rounded-xl cursor-pointer transition-all border group relative animate-in fade-in slide-in-from-left-2 duration-200",
                                        noteId === note.id
                                            ? "bg-bg-card border-accent-primary/20 shadow-lg shadow-accent-primary/5 scale-[1.02]"
                                            : "border-transparent hover:bg-bg-card hover:scale-[1.01]"
                                    )}
                                >
                                    <div className={clsx("font-semibold text-sm truncate pr-6 mb-1", noteId === note.id ? "text-accent-primary" : "text-text-primary")}>
                                        {note.title || "Untitled Note"}
                                    </div>
                                    <div className="text-xs text-text-muted truncate font-medium opacity-80">
                                        {note.body || "No content"}
                                    </div>
                                    <div className="text-[10px] text-text-muted mt-2.5 flex items-center gap-1 opacity-60">
                                        <span>{format(note.updatedAt, 'MMM d')}</span>
                                        <span>•</span>
                                        <span>{format(note.updatedAt, 'h:mm a')}</span>
                                    </div>

                                    <button
                                        onClick={(e) => handleDeleteNote(note.id, e)}
                                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md p-1.5 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col bg-bg-app h-full overflow-hidden relative">
                {selectedNote ? (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                        <div className="p-8 pb-4 max-w-4xl mx-auto w-full transition-all">
                            <input
                                type="text"
                                placeholder="Untitled Note"
                                value={selectedNote.title}
                                onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                                className="text-4xl font-display font-bold bg-transparent border-none outline-none w-full placeholder:text-text-muted/30 mb-6 text-text-primary tracking-tight"
                            />

                            <div className="text-xs font-medium text-text-muted flex items-center gap-6 mb-6 border-b border-border-subtle pb-4">
                                <span className="flex items-center gap-1.5 bg-bg-input/50 px-2 py-1 rounded-md">
                                    <FileText size={12} />
                                    Last edited {format(selectedNote.updatedAt, 'PP p')}
                                </span>

                                <div className="flex items-center gap-2 ml-auto">
                                    <div className="flex items-center gap-1.5 hover:bg-bg-input px-2 py-1 rounded-md transition-colors cursor-pointer group">
                                        <Folder size={14} className="text-accent-secondary group-hover:text-accent-primary" />
                                        <select
                                            value={selectedNote.projectId || ''}
                                            onChange={(e) => updateNote(selectedNote.id, { projectId: e.target.value || undefined })}
                                            className="bg-transparent border-none outline-none text-text-muted group-hover:text-text-primary transition-colors cursor-pointer appearance-none text-right font-medium pr-1"
                                        >
                                            <option value="">No Project</option>
                                            {Object.values(projects).map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button className="p-1.5 hover:bg-bg-input rounded-md text-text-muted hover:text-text-primary">
                                        <MoreVertical size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar">
                            <textarea
                                value={selectedNote.body}
                                onChange={(e) => updateNote(selectedNote.id, { body: e.target.value })}
                                placeholder="Start typing..."
                                className="w-full h-full max-w-4xl mx-auto bg-transparent border-none outline-none resize-none text-lg leading-relaxed placeholder:text-text-muted/20 text-text-secondary font-serif-heading"
                                style={{ lineHeight: '1.75' }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-muted bg-bg-app">
                        <div className="w-24 h-24 bg-bg-card rounded-3xl mb-6 flex items-center justify-center shadow-lg shadow-accent-primary/5 border border-border-subtle rotate-3">
                            <FileText size={48} className="text-accent-primary/40" />
                        </div>
                        <h3 className="text-xl font-display font-semibold text-text-primary mb-2">Select a note to view</h3>
                        <p className="mb-8 max-w-xs text-center leading-relaxed opacity-70">Capture your ideas, meeting notes, and daily thoughts in a distraction-free environment.</p>
                        <button onClick={handleCreateNote} className="btn btn-primary shadow-xl shadow-accent-primary/20 px-8 py-3 h-auto text-base">
                            <Plus size={20} className="mr-2" /> Create New Note
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
