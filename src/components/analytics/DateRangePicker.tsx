import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import type { DateRange } from '../../hooks/useAnalytics';

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    customRange?: { start?: number; end?: number };
    onCustomChange?: (start: number, end: number) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const options: { label: string; value: DateRange }[] = [
        { label: 'Last 7 Days', value: '7days' },
        { label: 'Last 30 Days', value: '30days' },
        { label: 'This Month', value: 'thisMonth' },
        // Future: Add 'Custom' with a date picker modal
    ];

    const currentLabel = options.find(o => o.value === value)?.label || 'Custom Logic';

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-sm font-medium hover:bg-bg-card-hover transition-colors shadow-sm"
            >
                <CalendarIcon size={16} className="text-text-muted" />
                <span>{currentLabel}</span>
                <ChevronDown size={14} className="text-text-muted" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-bg-card border border-border-subtle rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        <div className="py-1">
                            {options.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={clsx(
                                        "w-full text-left px-4 py-2 text-sm transition-colors",
                                        value === option.value
                                            ? "bg-accent-primary/10 text-accent-primary font-medium"
                                            : "text-text-secondary hover:bg-bg-card-hover"
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
