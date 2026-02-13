import { useState } from 'react';
import { useStore } from '../../core/store';
import { Inbox, Mail, User, CheckCircle2, Trash2, Pencil, CheckSquare, Square, X, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ProcessItemModal } from './ProcessItemModal';
import { SmartInput } from '../../components/SmartInput';
import { ModuleHeader } from '../../components/layout/ModuleHeader';
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
        .filter(item => ((item as any).organization_id || item.organizationId) === activeOrgId)
        .filter(item => item.text && item.text.trim().length > 0)
        .sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div id="inbox-view" className="flex flex-col h-full w-full max-w-[1600px] mx-auto p-6 md:p-6 md:pt-6 transition-all duration-300 relative">
            {/* Header Section */}
            <ModuleHeader
                icon={Inbox}
                title="Inbox"
                subtitle="Quick capture for everything on your mind."
                actions={
                    inboxItems.length > 0 && (
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
                    )
                }
            />

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
                    <div className="flex flex-col border border-border-subtle rounded-2xl overflow-hidden bg-bg-card shadow-sm divide-y divide-border-subtle">
                        {inboxItems.map((item, index) => (
                            <div
                                key={item.id}
                                id={index === 0 ? "first-inbox-item" : undefined}
                                style={{ animationDelay: `${index * 30}ms` }}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        toggleSelection(item.id);
                                    } else {
                                        if (editingId === item.id) return;
                                        setProcessingItem(item);
                                    }
                                }}
                                className={clsx(
                                    "group relative flex items-center gap-4 px-6 py-4 transition-all duration-200 hover:bg-bg-input/50 animate-enter",
                                    editingId !== item.id && "cursor-pointer",
                                    selectedIds.has(item.id)
                                        ? "bg-accent-primary/5 shadow-inner"
                                        : "bg-transparent"
                                )}
                            >
                                {/* Selection Checkbox */}
                                {(isSelectionMode || selectedIds.has(item.id)) && (
                                    <div className="shrink-0 animate-in fade-in zoom-in-90 duration-200">
                                        {selectedIds.has(item.id) ? (
                                            <div className="w-5 h-5 rounded-md bg-accent-primary flex items-center justify-center text-white shadow-sm">
                                                <CheckSquare size={14} strokeWidth={3} />
                                            </div>
                                        ) : (
                                            <div className="w-5 h-5 rounded-md border-2 border-border-highlight bg-bg-app/50 group-hover:border-accent-primary/50 transition-colors" />
                                        )}
                                    </div>
                                )}

                                {/* Main Content Row */}
                                <div className="flex-1 flex items-center gap-4 min-w-0">
                                    {/* Source Icon */}
                                    <div className={clsx(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-border-subtle/50",
                                        item.source === 'email' ? "bg-blue-500/10 text-blue-500" :
                                            item.source === 'meeting' ? "bg-purple-500/10 text-purple-500" :
                                                "bg-emerald-500/10 text-emerald-500"
                                    )}>
                                        {item.source === 'email' ? <Mail size={16} /> :
                                            item.source === 'meeting' ? <MessageSquare size={16} /> :
                                                <User size={16} />}
                                    </div>

                                    {/* Text Content */}
                                    <div className="flex-1 min-w-0">
                                        {editingId === item.id ? (
                                            <div
                                                className="flex items-center gap-2 w-full"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    className="flex-1 bg-bg-input border-b-2 border-accent-primary/50 py-1 text-text-primary focus:outline-none text-[16px] font-medium"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEdit();
                                                        else if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                />
                                                <div className="flex gap-1">
                                                    <button onClick={saveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={18} /></button>
                                                    <button onClick={cancelEdit} className="p-1.5 text-text-muted hover:bg-bg-input rounded-lg"><X size={18} /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-4">
                                                <p className={clsx(
                                                    "text-[16px] font-medium truncate tracking-tight transition-colors duration-200",
                                                    selectedIds.has(item.id) ? "text-accent-primary" : "text-text-primary group-hover:text-violet-600"
                                                )}>
                                                    {item.text}
                                                </p>

                                                <div className="flex items-center gap-4 shrink-0">
                                                    <span className="text-xs font-semibold text-text-muted/50 tabular-nums hidden sm:block">
                                                        {format(item.createdAt, 'MMM d, HH:mm')}
                                                    </span>

                                                    {/* Hover Actions */}
                                                    {!isSelectionMode && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); startEditing(item); }}
                                                                className="p-1.5 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
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
                                                                className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bulk Actions Bar */}
            {
                isSelectionMode && (
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
                )
            }

            {
                processingItem && (
                    <ProcessItemModal
                        item={processingItem!}
                        onClose={() => setProcessingItem(null)}
                    />
                )
            }
        </div >
    );
}
