import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../core/store';
import { X, Sunrise, AlertCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { FocusCard } from './FocusCard';
import { SoftBadge } from './SoftBadge';
import { useTranslation } from '../core/i18n';

export function DailyDigestModal() {
    const { tasks, user } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const { t, lang } = useTranslation();

    useEffect(() => {
        const lastDigestDate = localStorage.getItem('lastDigestDate');
        const today = new Date().toDateString();

        // Show once per day, with a small delay to allow app to settle
        if (lastDigestDate !== today) {
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('lastDigestDate', new Date().toDateString());
    };

    // Calculate Stats
    const allTasks = Object.values(tasks);
    const now = Date.now();

    const staleTasks = allTasks.filter(t =>
        t.status === 'in_progress' &&
        t.updatedAt &&
        (now - t.updatedAt > 259200000) // 3 days
    );

    const overdueTasks = allTasks.filter(t =>
        t.status !== 'done' &&
        t.dueDate &&
        t.dueDate < now
    );

    const focusTasks = allTasks.filter(t =>
        t.status !== 'done' &&
        (['urgent', 'critical', 'high'].includes(t.priority) ||
            (t.dueDate && t.dueDate >= now && t.dueDate <= now + 86400000)) // Top priority + Due Today
    ).slice(0, 3);

    if (!isOpen) return null;

    // Localized Date
    const dateStr = format(new Date(), 'EEEE, MMMM do', { locale: lang === 'es' ? es : undefined });

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-app/80 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="w-full max-w-2xl bg-bg-card rounded-2xl shadow-2xl border border-border-subtle flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">

                {/* Calm Header */}
                <div className="relative p-8 pb-6">
                    <button
                        onClick={handleClose}
                        className="absolute right-4 top-4 p-2 rounded-full hover:bg-bg-input text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="bg-amber-100/50 p-3 rounded-2xl text-amber-600">
                            <Sunrise size={32} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-display font-bold text-text-primary mb-1">
                                {t.daily_digest.good_morning}, {user?.name?.split(' ')[0] || t.daily_digest.greeting_default}
                            </h2>
                            <p className="text-text-secondary text-lg font-light first-letter:capitalize">
                                {dateStr}. {t.daily_digest.intro_text}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-8 pb-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">

                    {/* 1. Missed Deadlines (If any) */}
                    {overdueTasks.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="bg-red-50 text-red-600 p-1 rounded-md">
                                    <AlertCircle size={14} />
                                </span>
                                <h3 className="font-semibold text-xs uppercase tracking-wider text-text-muted">{t.daily_digest.missed_deadlines}</h3>
                            </div>
                            <div className="space-y-2">
                                {overdueTasks.slice(0, 3).map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50/30 border border-red-100/50">
                                        <span className="font-medium text-text-primary">{task.title}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-red-600 font-medium">{t.daily_digest.missed_deadlines_sub}</span>
                                            <button
                                                onClick={() => { navigate('/tasks?taskId=' + task.id); handleClose(); }}
                                                className="text-xs bg-white border border-border-subtle hover:border-border-highlight px-2 py-1 rounded shadow-sm transition-all"
                                            >
                                                {t.daily_digest.review}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. Needs Attention (Stale) */}
                    {staleTasks.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <SoftBadge color="neutral" label={t.daily_digest.blocked} />
                                <h3 className="font-semibold text-xs uppercase tracking-wider text-text-muted">{t.daily_digest.needs_attention}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {staleTasks.slice(0, 4).map(task => (
                                    <div key={task.id} className="p-3 bg-bg-sidebar border border-border-subtle rounded-xl flex items-center justify-between">
                                        <span className="text-sm text-text-secondary truncate pr-2">{task.title}</span>
                                        <button
                                            onClick={() => { navigate('/tasks?taskId=' + task.id); handleClose(); }}
                                            className="opacity-0 group-hover:opacity-100 text-accent-primary"
                                        >
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. Today's Focus - The Meat */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-text-muted">{t.daily_digest.todays_focus}</h3>
                            <span className="text-xs text-text-secondary">{t.daily_digest.focus_sub}</span>
                        </div>

                        {focusTasks.length === 0 ? (
                            <div className="py-8 text-center bg-bg-sidebar/30 rounded-2xl border border-dashed border-border-subtle">
                                <p className="text-text-muted">{t.daily_digest.no_urgent}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {focusTasks.map(task => (
                                    <FocusCard key={task.id} task={task} onToggleStatus={useStore.getState().toggleTaskStatus} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-bg-sidebar border-t border-border-subtle flex justify-end">
                    <button
                        onClick={handleClose}
                        className="group relative overflow-hidden bg-text-primary text-bg-app px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <span className="relative flex items-center gap-2">
                            {t.daily_digest.go_to_inbox} <ArrowRight size={16} />
                        </span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
