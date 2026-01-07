import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, Brain, Zap, Mail, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

interface SmartInputProps {
    onCapture: (text: string, source: 'manual' | 'email' | 'voice' | 'system') => void;
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
                "absolute -inset-0.5 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-xl opacity-0 transition-opacity duration-300 blur",
                (isExpanded || text.length > 0) && "opacity-30"
            )} />

            <div className={clsx(
                "relative bg-bg-card border border-border-subtle rounded-xl overflow-hidden transition-all shadow-xl",
                (isExpanded || text.length > 0) ? "shadow-accent-primary/10 border-accent-primary/30" : "shadow-none"
            )}>

                {/* Header Indicators */}
                {text.length > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-none">
                        {isEmailMode ? (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-full">
                                <Mail size={10} /> Email Context
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <Zap size={10} /> Fast Task
                            </span>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="relative">
                    <div className="flex items-start p-2.5">
                        <div className="p-2 text-accent-primary mt-0.5">
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
                            className="w-full bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted resize-none py-2 px-1 min-h-[44px] max-h-[300px] text-[15px] font-medium leading-relaxed"
                            rows={1}
                        />

                        <button
                            type="submit"
                            disabled={!text.trim() || isProcessing}
                            className={clsx(
                                "p-2 rounded-lg transition-all duration-200 mt-0.5",
                                text.trim()
                                    ? "bg-accent-primary text-white hover:brightness-110 shadow-md shadow-accent-primary/20"
                                    : "bg-transparent text-text-muted cursor-not-allowed"
                            )}
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    {/* Quick Actions / Footer */}
                    {isExpanded && (
                        <div className="flex items-center gap-3 px-4 pb-3 pt-1 animate-in fade-in slide-in-from-top-1">
                            <span className="text-xs text-text-muted">Type <kbd className="font-mono bg-bg-app border border-border-subtle rounded px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">Enter</kbd> to capture</span>
                            <div className="flex-1" />
                            <button type="button" className="text-xs text-text-secondary hover:text-accent-primary flex items-center gap-1 transition-colors font-medium">
                                <MessageSquare size={12} /> Add prompting context
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
