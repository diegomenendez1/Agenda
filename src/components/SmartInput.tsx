import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, Brain, Zap, Mail, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

interface SmartInputProps {
    onCapture: (text: string, source: 'manual' | 'email') => void;
    isProcessing?: boolean;
}

export function SmartInput({ onCapture, isProcessing = false }: SmartInputProps) {
    const [text, setText] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [text]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!text.trim()) return;

        // Determine source heuristic: Length > 200 chars or newlines is likely email/dump
        const source = text.length > 200 || text.split('\n').length > 3 ? 'email' : 'manual';

        onCapture(text, source);
        setText('');
        setIsExpanded(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const isEmailMode = text.length > 150;

    return (
        <div className={clsx(
            "relative w-full transition-all duration-300 ease-out",
            isExpanded || text.length > 0 ? "scale-100" : "scale-[0.99]"
        )}>

            {/* AI Glow Effect */}
            <div className={clsx(
                "absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl opacity-0 transition-opacity duration-300 blur",
                (isExpanded || text.length > 0) && "opacity-40"
            )} />

            <div className={clsx(
                "relative bg-bg-card border border-border-subtle rounded-xl overflow-hidden transition-all shadow-xl",
                (isExpanded || text.length > 0) ? "shadow-violet-900/20" : "shadow-none"
            )}>

                {/* Header Indicators */}
                {text.length > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-none">
                        {isEmailMode ? (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full">
                                <Mail size={10} /> Email Context
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                <Zap size={10} /> Fast Task
                            </span>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="relative">
                    <div className="flex items-start p-2">
                        <div className="p-2 text-violet-500 mt-1">
                            {isProcessing ? (
                                <Brain className="animate-pulse" size={20} />
                            ) : (
                                <Sparkles size={20} />
                            )}
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onFocus={() => setIsExpanded(true)}
                            onBlur={() => !text && setIsExpanded(false)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me to do anything, or paste an email..."
                            className="w-full bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted resize-none py-2 min-h-[44px] max-h-[300px]"
                            rows={1}
                        />

                        <button
                            type="submit"
                            disabled={!text.trim() || isProcessing}
                            className={clsx(
                                "p-2 rounded-lg transition-all duration-200 mt-1",
                                text.trim()
                                    ? "bg-violet-600 text-white hover:bg-violet-500"
                                    : "bg-transparent text-text-muted cursor-not-allowed"
                            )}
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    {/* Quick Actions / Footer */}
                    {isExpanded && (
                        <div className="flex items-center gap-3 px-4 pb-3 pt-0 animate-in fade-in slide-in-from-top-1">
                            <span className="text-xs text-text-muted">Type <kbd className="font-mono bg-bg-app border border-border-subtle rounded px-1 text-[10px]">Enter</kbd> to capture</span>
                            <div className="flex-1" />
                            <button type="button" className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors">
                                <MessageSquare size={12} /> Add prompting context
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
