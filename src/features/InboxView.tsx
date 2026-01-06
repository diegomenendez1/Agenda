import { useState } from 'react';
import { useStore } from '../core/store';
import { Inbox, Mail, User, Sparkles, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ProcessItemModal } from '../components/ProcessItemModal';
import { SmartInput } from '../components/SmartInput';
import type { InboxItem } from '../core/types';
import clsx from 'clsx';

export function InboxView() {
    const { inbox, addInboxItem } = useStore();
    const [processingItem, setProcessingItem] = useState<InboxItem | null>(null);

    const handleCapture = (text: string, source: 'manual' | 'email' | 'voice' | 'system') => {
        addInboxItem(text, source);
    };

    const inboxItems = Object.values(inbox).sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="flex flex-col h-full bg-bg-app relative">
            {/* Header Section */}
            <div className="px-8 pt-8 pb-4">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
                        <Inbox className="w-8 h-8 text-violet-500" />
                        Inbox
                    </h1>
                    <p className="text-text-muted mt-1 text-lg">
                        Capture thoughts, tasks, and notes in one place.
                    </p>
                </header>

                <div className="max-w-2xl">
                    <SmartInput onCapture={handleCapture} />
                </div>
            </div>

            {/* List Section */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 mt-4">
                {inboxItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border-subtle rounded-xl bg-bg-card/30">
                        <div className="bg-bg-card p-4 rounded-full mb-3 shadow-inner">
                            <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                        </div>
                        <p className="text-text-primary font-medium">Inbox Zero</p>
                        <p className="text-text-muted text-lg mt-1">You're all caught up.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {inboxItems.map(item => (
                            <div
                                key={item.id}
                                className="group relative bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-violet-500/30 rounded-xl p-4 transition-all duration-200 shadow-sm"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={clsx(
                                        "p-2 rounded-lg shrink-0 mt-0.5",
                                        item.source === 'email' ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                                    )}>
                                        {item.source === 'email' ? <Mail size={18} /> : <User size={18} />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-text-muted uppercase tracking-wider">
                                                {item.source}
                                            </span>
                                            <span className="text-base text-text-muted tabular-nums">
                                                {format(item.createdAt, 'HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-text-primary text-lg leading-relaxed line-clamp-3">
                                            {item.text}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setProcessingItem(item)}
                                        className="self-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 btn btn-primary py-2 px-3 shadow-lg shadow-violet-500/20"
                                    >
                                        <Sparkles size={14} />
                                        <span className="ml-1.5">Triage</span>
                                    </button>
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
