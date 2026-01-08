import { useState } from 'react';
import { useStore } from '../core/store';
import { Inbox, Mail, User, Sparkles, CheckCircle2, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ProcessItemModal } from '../components/ProcessItemModal';
import { SmartInput } from '../components/SmartInput';
import type { InboxItem } from '../core/types';
import clsx from 'clsx';

export function InboxView() {
    const { inbox, addInboxItem, deleteInboxItem, updateInboxItem } = useStore();
    const [processingItem, setProcessingItem] = useState<InboxItem | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

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

    const inboxItems = Object.values(inbox).sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto p-6 md:p-10 transition-all duration-300">
            {/* Header Section */}
            <div className="mb-10 animate-enter">
                <header className="mb-8">
                    <h1 className="text-3xl font-display font-bold flex items-center gap-3 tracking-tight text-text-primary mb-2">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Inbox className="w-6 h-6 text-violet-600" />
                        </div>
                        Inbox
                    </h1>
                    <p className="text-text-muted text-lg font-light max-w-2xl leading-relaxed ml-1">
                        Capture thoughts, tasks, and notes instantly. Process them when you're ready.
                    </p>
                </header>

                <div className="w-full mb-6">
                    <SmartInput onCapture={handleCapture} />
                </div>
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-y-auto -mx-2 px-2 pb-8">
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
                                className="group relative bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-violet-500/30 rounded-xl p-5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={clsx(
                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                        item.source === 'email'
                                            ? "bg-blue-500/10 text-blue-500"
                                            : "bg-emerald-500/10 text-emerald-500"
                                    )}>
                                        {item.source === 'email' ? <Mail size={20} /> : <User size={20} />}
                                    </div>

                                    <div className="flex-1 min-w-0 pt-1">
                                        {editingId === item.id ? (
                                            <div className="animate-in fade-in zoom-in-95 duration-200">
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
                                                <p className="text-text-primary text-base font-medium leading-relaxed line-clamp-3">
                                                    {item.text}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 self-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                                        {!editingId && (
                                            <>
                                                <button
                                                    onClick={() => startEditing(item)}
                                                    className="p-2.5 text-text-muted hover:text-violet-500 hover:bg-violet-500/10 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to delete this specific item?')) {
                                                            deleteInboxItem(item.id);
                                                        }
                                                    }}
                                                    className="p-2.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setProcessingItem(item)}
                                                    className="btn btn-primary py-2.5 px-4 shadow-lg shadow-violet-500/20 rounded-lg text-sm flex items-center"
                                                >
                                                    <Sparkles size={16} />
                                                    <span className="ml-2 font-semibold">Process</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {processingItem && (
                <ProcessItemModal
                    item={processingItem}
                    onClose={() => setProcessingItem(null)}
                />
            )}
        </div>
    );
}
