import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../core/store';
import { X, Sunrise, AlertCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { FocusCard } from './FocusCard';
import { SoftBadge } from '../../components/SoftBadge';
import { useTranslation } from '../../core/i18n';

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

    const now = useMemo(() => Date.now(), []);

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
                <div className="relative p-8 pb-6 bg-gradient-to-b from-bg-input/20 to-transparent">
                    <button
                        onClick={handleClose}
                        className="absolute right-6 top-6 p-2 rounded-full hover:bg-bg-input text-text-muted hover:text-text-primary transition-all hover:rotate-90 duration-300"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-start gap-5">
                        <div className="bg-amber-100/40 p-3.5 rounded-2xl text-amber-600 shadow-sm ring-1 ring-amber-200/50 animate-bounce-subtle">
                            <Sunrise size={34} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-display font-bold mb-1 bg-gradient-to-r from-text-primary via-accent-primary to-accent-secondary bg-clip-text text-transparent">
                                {t.daily_digest.good_morning}, {user?.name?.split(' ')[0] || t.daily_digest.greeting_default}
                            </h2>
                            <p className="text-text-secondary text-lg font-light first-letter:capitalize flex items-center gap-2">
                                <span className="opacity-70">{dateStr}</span>
                                <span className="w-1 h-1 rounded-full bg-border-highlight" />
                                <span className="font-normal text-text-primary/80">{t.daily_digest.intro_text}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-8 pb-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">

                    {/* 1. Missed Deadlines (If any) */}
                    {overdueTasks.length > 0 && (
                        <div className="space-y-4 animate-in slide-in-from-left duration-700 delay-100 fill-mode-both">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="bg-red-50 text-red-600 p-1.5 rounded-lg shadow-sm">
                                        <AlertCircle size={16} />
                                    </span>
                                    <h3 className="font-bold text-xs uppercase tracking-widest text-red-600/80">{t.daily_digest.missed_deadlines}</h3>
                                </div>
                                <SoftBadge color="critical" label={`${overdueTasks.length} ${t.daily_digest.missed_deadlines_sub}`} />
                            </div>
                            <div className="space-y-3">
                                {overdueTasks.slice(0, 3).map((task, idx) => (
                                    <div
                                        key={task.id}
                                        className="group flex items-center justify-between p-4 rounded-xl bg-white border border-red-100 hover:border-red-200 hover:shadow-md hover:shadow-red-500/5 transition-all duration-300 relative overflow-hidden"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-full" />
                                        <span className="font-semibold text-text-primary ml-2 group-hover:text-red-700 transition-colors uppercase text-[12px]">{task.title}</span>
                                        <button
                                            onClick={() => { navigate('/tasks?taskId=' + task.id); handleClose(); }}
                                            className="text-xs font-bold bg-white text-red-600 border border-red-100 hover:bg-red-50 hover:border-red-200 px-4 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
                                        >
                                            {t.daily_digest.review}
                                        </button>
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

                <div className="p-8 bg-bg-sidebar border-t border-border-subtle flex justify-end">
                    <button
                        onClick={handleClose}
                        className="group relative overflow-hidden bg-text-primary text-bg-app px-10 py-4 rounded-2xl font-bold shadow-lg hover:shadow-accent-primary/20 hover:shadow-2xl transition-all active:scale-[0.97]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative flex items-center gap-3">
                            {t.daily_digest.go_to_inbox} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
