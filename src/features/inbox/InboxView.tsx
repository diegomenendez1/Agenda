import { useState } from 'react';
import { useStore } from '../../core/store';
import { Inbox, Mail, User, CheckCircle2, Trash2, Pencil, CheckSquare, Square, X, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ProcessItemModal } from './ProcessItemModal';
import { SmartInput } from '../../components/SmartInput';
import type { InboxItem } from '../../core/types';
import clsx from 'clsx';

export function InboxView() {
    const { inbox, addInboxItem, deleteInboxItem, deleteInboxItems, updateInboxItem } = useStore();
    const [processingItem, setProcessingItem] = useState<InboxItem | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const handleCapture = (text: string, source: 'manual' | 'email' | 'voice' | 'system' | 'meeting') => {
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

    const activeOrgId = useStore.getState().user?.organizationId;
    const inboxItems = Object.values(inbox)
        .filter(item => (item as any).organization_id === activeOrgId)
        .filter(item => item.text && item.text.trim().length > 0)
        .sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="flex flex-col h-full w-full max-w-[1600px] mx-auto p-6 md:p-10 transition-all duration-300 relative">
            {/* Header Section */}
            <div className="mb-12 animate-enter">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border-subtle pb-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center shadow-lg shadow-accent-primary/5">
                                <Inbox className="w-7 h-7 text-accent-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
                                        Inbox
                                    </span>
                                </h1>
                                <p className="text-text-muted text-base font-normal">
                                    Quick capture for everything on your mind.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {inboxItems.length > 0 && (
                            <button
                                onClick={() => setIsSelectionMode(!isSelectionMode)}
                                className={clsx(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border shadow-sm active:scale-95",
                                    isSelectionMode
                                        ? "bg-accent-primary text-white border-transparent"
                                        : "bg-bg-card text-text-secondary border-border-subtle hover:bg-bg-card-hover hover:border-border-highlight"
                                )}
                            >
                                {isSelectionMode ? <CheckSquare size={18} /> : <Square size={18} />}
                                {isSelectionMode ? "Done Selecting" : "Bulk Action"}
                            </button>
                        )}
                    </div>
                </header>

                {!isSelectionMode && (
                    <div className="w-full max-w-2xl mx-auto">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative">
                                <SmartInput onCapture={handleCapture} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-y-auto pb-32 custom-scrollbar">
                {inboxItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-enter">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-500/5">
                            <CheckCircle2 className="text-emerald-500 w-10 h-10" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-text-primary mb-2">Workspace Clear</h3>
                        <p className="text-text-muted text-lg max-w-sm text-center font-light">
                            Your inbox is empty. Everything has been processed and organized.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {inboxItems.map((item, index) => (
                            <div
                                key={item.id}
                                style={{ animationDelay: `${index * 50}ms` }}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        toggleSelection(item.id);
                                    } else {
                                        if (editingId === item.id) return;
                                        setProcessingItem(item);
                                    }
                                }}
                                className={clsx(
                                    "group relative bg-bg-card hover:bg-bg-card-hover border transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 rounded-2xl p-6 flex flex-col h-full min-h-[180px] animate-enter overflow-hidden",
                                    editingId !== item.id && "cursor-pointer",
                                    selectedIds.has(item.id)
                                        ? "border-accent-primary ring-2 ring-accent-primary/20 bg-accent-primary/5 shadow-md"
                                        : "border-border-subtle"
                                )}
                            >
                                {/* Decorative background icon */}
                                <div className="absolute top-0 right-0 p-4 opacity-[0.07] group-hover:opacity-[0.1] transition-opacity pointer-events-none">
                                    {item.source === 'email' ? <Mail size={80} /> :
                                        item.source === 'meeting' ? <MessageSquare size={80} /> :
                                            <Inbox size={80} />}
                                </div>
                                <div className="flex items-start gap-4 flex-1">
                                    {isSelectionMode && (
                                        <div className="pt-1 select-none">
                                            {selectedIds.has(item.id) ? (
                                                <div className="w-6 h-6 rounded-lg bg-accent-primary flex items-center justify-center text-white scale-110 transition-transform shadow-md">
                                                    <CheckSquare size={16} strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 rounded-lg border-2 border-border-highlight bg-bg-app/50 group-hover:border-accent-primary/50 group-hover:scale-110 transition-all duration-200" />
                                            )}
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0 flex flex-col h-full">
                                        {editingId === item.id ? (
                                            <div
                                                className="animate-in fade-in zoom-in-95 duration-200 flex flex-col h-full"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <textarea
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    className="w-full bg-bg-input border border-accent-primary/30 rounded-xl p-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-none text-base flex-1 shadow-inner"
                                                    rows={4}
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
                                                <div className="flex justify-end gap-2 mt-4">
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="px-4 py-2 rounded-lg text-sm font-semibold text-text-muted hover:text-text-primary hover:bg-bg-input transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={saveEdit}
                                                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent-primary text-white hover:brightness-110 transition-all shadow-md shadow-accent-primary/20"
                                                    >
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={clsx(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                                            item.source === 'email' ? "bg-blue-500/10 text-blue-500" :
                                                                item.source === 'meeting' ? "bg-purple-500/10 text-purple-500" :
                                                                    "bg-emerald-500/10 text-emerald-500"
                                                        )}>
                                                            {item.source === 'email' ? <Mail size={16} /> :
                                                                item.source === 'meeting' ? <MessageSquare size={16} /> :
                                                                    <User size={16} />}
                                                        </div>
                                                        <span className={clsx(
                                                            "badge text-[10px] font-bold",
                                                            item.source === 'email' ? "badge-low" :
                                                                item.source === 'meeting' ? "badge-medium" :
                                                                    "badge-success"
                                                        )}>
                                                            {item.source}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-medium text-text-muted/70 tabular-nums">
                                                        {format(item.createdAt, 'MMM d • HH:mm')}
                                                    </span>
                                                </div>
                                                <p className={clsx(
                                                    "text-text-primary text-[17px] font-display font-semibold leading-relaxed line-clamp-4 flex-1 tracking-tight relative z-10",
                                                    selectedIds.has(item.id) ? "text-indigo-600" : "group-hover:text-violet-600 transition-colors duration-300"
                                                )}>
                                                    {item.text}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {!isSelectionMode && !editingId && (
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1.5 p-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-border-subtle shadow-xl translate-x-2 group-hover:translate-x-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); startEditing(item); }}
                                            className="p-2 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Delete this item permanently?')) {
                                                    deleteInboxItem(item.id);
                                                }
                                            }}
                                            className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bulk Actions Bar */}
            {isSelectionMode && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[calc(100%-4rem)] max-w-lg z-50 animate-in slide-in-from-bottom-5 duration-500">
                    <div className="bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-white/10 dark:border-black/5 backdrop-blur-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-50 dark:to-white">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={clearSelection}
                                className="p-2.5 hover:bg-white/10 dark:hover:bg-black/10 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">{selectedIds.size} Selected</span>
                                <button
                                    onClick={toggleAll}
                                    className="text-[10px] uppercase tracking-widest font-black opacity-60 hover:opacity-100 text-left transition-opacity"
                                >
                                    {selectedIds.size === inboxItems.length ? "Deselect All" : "Select All"}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleBulkDelete}
                            disabled={selectedIds.size === 0}
                            className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-red-500/30 active:scale-95"
                        >
                            <Trash2 size={18} /> Delete Selected
                        </button>
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
