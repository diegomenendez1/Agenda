import { useState } from 'react';
import { useStore } from '../core/store';
import { Inbox, Mail, User, CheckCircle2, Trash2, Pencil, CheckSquare, Square, X, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ProcessItemModal } from '../components/ProcessItemModal';
import { SmartInput } from '../components/SmartInput';
import type { InboxItem } from '../core/types';
import clsx from 'clsx';

export function InboxView() {
    const { inbox, addInboxItem, deleteInboxItem, deleteInboxItems, updateInboxItem } = useStore();
    const [processingItem, setProcessingItem] = useState<InboxItem | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const handleCapture = (text: string, source: 'manual' | 'email' | 'voice' | 'system') => {
        addInboxItem(text, source);
    };

    const startEditing = (item: InboxItem) => {
        setEditingId(item.id);
        setEditText(item.text);
    };

    const saveEdit = async () => {
        if (editingId && editText.trim()) {
            await updateInboxItem(editingId, editText.trim());
            setEditingId(null);
            setEditText('');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        if (newSelected.size > 0) setIsSelectionMode(true);
        else if (!isSelectionMode) setIsSelectionMode(false);
    };

    const toggleAll = () => {
        if (selectedIds.size === inboxItems.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(inboxItems.map(i => i.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) {
            await deleteInboxItems(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        }
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    };

    const inboxItems = Object.values(inbox).sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto p-6 md:p-10 transition-all duration-300 relative">
            {/* Header Section */}
            <div className="mb-10 animate-enter">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold flex items-center gap-3 tracking-tight text-text-primary mb-2">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                <Inbox className="w-6 h-6 text-violet-600" />
                            </div>
                            Inbox
                        </h1>
                        <p className="text-text-muted text-lg font-light max-w-2xl leading-relaxed ml-1">
                            Capture thoughts, tasks, and notes instantly. Process them when you're ready.
                        </p>
                    </div>

                    {inboxItems.length > 0 && (
                        <button
                            onClick={() => setIsSelectionMode(!isSelectionMode)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                                isSelectionMode
                                    ? "bg-violet-500/10 text-violet-600 border-violet-500/30"
                                    : "bg-bg-card text-text-muted border-border-subtle hover:text-text-primary hover:border-border-highlight"
                            )}
                        >
                            {isSelectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
                            {isSelectionMode ? "Exit Selection" : "Select Multiple"}
                        </button>
                    )}
                </header>

                {!isSelectionMode && (
                    <div className="w-full mb-6">
                        <SmartInput onCapture={handleCapture} />
                    </div>
                )}
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-y-auto -mx-2 px-2 pb-24">
                {inboxItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-border-subtle/60 rounded-2xl bg-bg-card/30">
                        <div className="bg-bg-card p-6 rounded-full mb-4 shadow-sm border border-border-subtle">
                            <CheckCircle2 className="text-emerald-500 w-10 h-10" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-semibold text-text-primary mb-1">Inbox Zero</h3>
                        <p className="text-text-muted">You're all caught up. Great job!</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {inboxItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        toggleSelection(item.id);
                                    } else {
                                        if (editingId === item.id) return;
                                        setProcessingItem(item);
                                    }
                                }}
                                className={clsx(
                                    "group relative bg-bg-card hover:bg-bg-card-hover border transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-xl p-5",
                                    editingId !== item.id && "cursor-pointer",
                                    selectedIds.has(item.id) ? "border-violet-500 bg-violet-500/5 shadow-violet-500/10" : "border-border-subtle hover:border-violet-500/30"
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    {isSelectionMode && (
                                        <div className="pt-1">
                                            {selectedIds.has(item.id) ? (
                                                <div className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center text-white scale-110 transition-transform">
                                                    <CheckSquare size={14} strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <div className="w-5 h-5 rounded border-2 border-border-highlight bg-bg-app/50 group-hover:border-violet-400 group-hover:bg-bg-card transition-colors" />
                                            )}
                                        </div>
                                    )}

                                    {!isSelectionMode && (
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                            item.source === 'email'
                                                ? "bg-blue-500/10 text-blue-500"
                                                : item.source === 'meeting'
                                                    ? "bg-purple-500/10 text-purple-500"
                                                    : "bg-emerald-500/10 text-emerald-500"
                                        )}>
                                            {item.source === 'email' ? <Mail size={20} /> :
                                                item.source === 'meeting' ? <MessageSquare size={20} /> :
                                                    item.source === 'voice' ? <User size={20} /> :
                                                        <User size={20} />}
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0 pt-1">
                                        {editingId === item.id ? (
                                            <div
                                                className="animate-in fade-in zoom-in-95 duration-200"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <textarea
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    className="w-full bg-transparent border border-violet-500/30 rounded-lg p-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-base"
                                                    rows={3}
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            saveEdit();
                                                        } else if (e.key === 'Escape') {
                                                            cancelEdit();
                                                        }
                                                    }}
                                                />
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="text-xs font-medium text-text-muted hover:text-text-primary px-3 py-1.5 rounded-md hover:bg-neutral-500/10 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={saveEdit}
                                                        className="text-xs font-medium bg-violet-600 text-white px-3 py-1.5 rounded-md hover:bg-violet-700 transition-colors shadow-sm shadow-violet-500/20"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                                        {item.source}
                                                    </span>
                                                    <span className="text-sm font-medium text-text-muted/80 tabular-nums">
                                                        {format(item.createdAt, 'MMM d • HH:mm')}
                                                    </span>
                                                </div>
                                                <p className={clsx(
                                                    "text-text-primary text-base font-medium leading-relaxed line-clamp-3",
                                                    selectedIds.has(item.id) && "text-violet-900"
                                                )}>
                                                    {item.text}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {!isSelectionMode && (
                                        <div className="flex items-center gap-2 self-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                                            {!editingId && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEditing(item);
                                                        }}
                                                        className="p-2.5 text-text-muted hover:text-violet-500 hover:bg-violet-500/10 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('Are you sure you want to delete this specific item?')) {
                                                                deleteInboxItem(item.id);
                                                            }
                                                        }}
                                                        className="p-2.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bulk Actions Bar */}
            {isSelectionMode && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-2xl z-50 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-bg-card-hover text-text-primary rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-border-highlight backdrop-blur-xl bg-opacity-95">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={clearSelection}
                                className="p-2 hover:bg-bg-input rounded-full transition-colors text-text-muted hover:text-text-primary"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">{selectedIds.size} items selected</span>
                                <button
                                    onClick={toggleAll}
                                    className="text-[10px] uppercase tracking-wider font-bold text-violet-400 hover:text-violet-300 text-left"
                                >
                                    {selectedIds.size === inboxItems.length ? "Deselect All" : "Select All"}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.size === 0}
                                className="btn flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white border-none py-2 px-5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                            >
                                <Trash2 size={16} /> Delete Items
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {processingItem && (
                <ProcessItemModal
                    item={processingItem}
                    onClose={() => setProcessingItem(null)}
                />
            )}
        </div>
    );
}
