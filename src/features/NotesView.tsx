import { useState, useMemo } from 'react';
import { StickyNote, Plus, Trash2, Search, FileText, Folder } from 'lucide-react';
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
        <div className="flex h-full overflow-hidden">
            {/* Notes Sidebar */}
            <div className="w-80 border-r border-border-subtle bg-bg-sidebar flex flex-col">
                <div className="p-4 border-b border-border-subtle">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold flex items-center gap-2">
                            <StickyNote size={20} className="text-accent-primary" />
                            Notes
                        </h2>
                        <button onClick={handleCreateNote} className="btn btn-icon btn-sm" title="New Note">
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="input w-full pl-9 py-1.5 text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {notesList.length === 0 ? (
                        <div className="text-center py-8 text-muted text-sm">
                            No notes found.
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-1">
                            {notesList.map(note => (
                                <li
                                    key={note.id}
                                    onClick={() => navigate(`/notes/${note.id}`)}
                                    className={clsx(
                                        "p-3 rounded-lg cursor-pointer transition-colors border border-transparent group relative",
                                        noteId === note.id ? "bg-bg-card border-border-subtle shadow-sm" : "hover:bg-bg-card-hover"
                                    )}
                                >
                                    <div className="font-medium text-sm truncate pr-6 mb-1">
                                        {note.title || "Untitled Note"}
                                    </div>
                                    <div className="text-xs text-muted truncate">
                                        {note.body || "No content"}
                                    </div>
                                    <div className="text-[10px] text-muted mt-2">
                                        {format(note.updatedAt, 'MMM d, h:mm a')}
                                    </div>

                                    <button
                                        onClick={(e) => handleDeleteNote(note.id, e)}
                                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-opacity p-1"
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
            <div className="flex-1 flex flex-col bg-bg-app h-full overflow-hidden">
                {selectedNote ? (
                    <>
                        <div className="p-8 pb-4 max-w-3xl mx-auto w-full">
                            <input
                                type="text"
                                placeholder="Note Title"
                                value={selectedNote.title}
                                onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                                className="text-3xl font-bold bg-transparent border-none outline-none w-full placeholder:text-muted/50 mb-4"
                            />
                            <div className="text-xs text-muted flex items-center gap-4 mb-4 border-b border-border-subtle pb-4">
                                <span>Created: {format(selectedNote.createdAt, 'PP p')}</span>

                                <div className="flex items-center gap-2 ml-auto">
                                    <Folder size={14} />
                                    <select
                                        value={selectedNote.projectId || ''}
                                        onChange={(e) => updateNote(selectedNote.id, { projectId: e.target.value || undefined })}
                                        className="bg-transparent border-none outline-none text-muted hover:text-primary transition-colors cursor-pointer appearance-none pr-4 text-right"
                                    >
                                        <option value="">No Project</option>
                                        {Object.values(projects).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-8 pb-8">
                            <textarea
                                value={selectedNote.body}
                                onChange={(e) => updateNote(selectedNote.id, { body: e.target.value })}
                                placeholder="Start typing..."
                                className="w-full h-full max-w-3xl mx-auto bg-transparent border-none outline-none resize-none text-lg leading-relaxed placeholder:text-muted/30 font-sans"
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted">
                        <FileText size={48} className="mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">Select a note to view</h3>
                        <p className="mb-6">Or create a new one to get started</p>
                        <button onClick={handleCreateNote} className="btn btn-primary">
                            Create New Note
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
