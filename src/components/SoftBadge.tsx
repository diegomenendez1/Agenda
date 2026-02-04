import clsx from 'clsx';
import type { Priority } from '../core/types';
import { useTranslation } from '../core/i18n';

interface SoftBadgeProps {
    label?: string;
    color?: 'critical' | 'high' | 'medium' | 'low' | 'success' | 'neutral';
    priority?: Priority; // Helper to auto-map priority
    className?: string;
    icon?: React.ReactNode;
}

export function SoftBadge({ label, color, priority, className, icon }: SoftBadgeProps) {
    const { t } = useTranslation();

    let finalColor = color || 'neutral';
    let finalLabel = label;

    if (priority) {
        if (priority === 'critical') finalColor = 'critical';
        if (priority === 'high') finalColor = 'high';
        if (priority === 'medium') finalColor = 'medium';
        if (priority === 'low') finalColor = 'low';

        // Safe priority label lookup
        if (!label) {
            if (priority === 'auto') {
                finalLabel = 'Auto';
            } else {
                finalLabel = t.priority[priority as keyof typeof t.priority] || priority;
            }
        }
    }

    const colorStyles = {
        critical: 'bg-[var(--bg-badge-critical)] text-[var(--text-badge-critical)]',
        high: 'bg-[var(--bg-badge-high)] text-[var(--text-badge-high)]',
        medium: 'bg-[var(--bg-badge-medium)] text-[var(--text-badge-medium)]',
        low: 'bg-[var(--bg-badge-low)] text-[var(--text-badge-low)]',
        success: 'bg-[var(--bg-badge-success)] text-[var(--text-badge-success)]',
        neutral: 'bg-bg-input text-text-secondary'
    };

    return (
        <span className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors",
            colorStyles[finalColor],
            className
        )}>
            {icon && <span className="opacity-70">{icon}</span>}
            {finalLabel}
        </span>
    );
}
