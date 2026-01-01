import { useState } from 'react';
import { useStore } from '../core/store';
import { Inbox, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ProcessItemModal } from '../components/ProcessItemModal';
import type { InboxItem } from '../core/types';

export function InboxView() {
    const { inbox, addInboxItem } = useStore();
    const [inputValue, setInputValue] = useState('');
    const [processingItem, setProcessingItem] = useState<InboxItem | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        addInboxItem(inputValue);
        setInputValue('');
    };

    const inboxItems = Object.values(inbox).sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="flex flex-col h-full p-8 max-w-3xl mx-auto w-full">
            <header className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-md">
                    <Inbox className="w-8 h-8 text-accent-primary" />
                    Inbox
                </h1>
                <p className="text-muted mt-2">Capture everything here. Process it later.</p>
            </header>

            <form onSubmit={handleSubmit} className="mb-8">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="What's on your mind? (Press Enter to capture)"
                    className="w-full bg-input border border-border-subtle p-4 rounded-lg text-lg focus:border-accent-primary outline-none transition-colors text-primary"
                    autoFocus
                />
            </form>

            <div className="flex-1 overflow-y-auto">
                {inboxItems.length === 0 ? (
                    <div className="text-center text-muted py-12">
                        Inbox is empty. You are all clear!
                    </div>
                ) : (
                    <ul className="flex flex-col gap-sm">
                        {inboxItems.map(item => (
                            <li key={item.id} className="group bg-card p-4 rounded-lg flex items-center justify-between border border-transparent hover:border-border-subtle transition-all">
                                <span className="text-base">{item.text}</span>
                                <div className="flex items-center gap-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs text-muted">{format(item.createdAt, 'HH:mm')}</span>
                                    <button
                                        onClick={() => setProcessingItem(item)}
                                        className="btn btn-primary text-xs"
                                        title="Convert to Task"
                                    >
                                        <ArrowRight size={14} /> Process
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
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
