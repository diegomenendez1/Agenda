import { format, addDays, subWeeks, addWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import clsx from 'clsx';

interface CalendarHeaderProps {
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    filterMode: 'all' | 'me';
    setFilterMode: (mode: 'all' | 'me') => void;
    isMobile: boolean;
}

export function CalendarHeader({ currentDate, setCurrentDate, filterMode, setFilterMode, isMobile }: CalendarHeaderProps) {
    return (
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-card/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
                    <CalendarIcon className="text-accent-primary" />
                    {format(currentDate, 'MMMM yyyy')}
                </h2>

                <div className="flex items-center gap-1 bg-bg-app border border-border-subtle rounded-lg p-1 ml-4 shadow-inner">
                    <button
                        onClick={() => setFilterMode('all')}
                        className={clsx(
                            "px-4 py-1 text-[11px] font-bold rounded-md transition-all outline-none",
                            filterMode === 'all'
                                ? "bg-accent-primary text-white shadow-md ring-1 ring-accent-primary"
                                : "text-text-muted hover:text-text-primary hover:bg-bg-input"
                        )}
                    >
                        All Tasks
                    </button>
                    <button
                        onClick={() => setFilterMode('me')}
                        className={clsx(
                            "px-4 py-1 text-[11px] font-bold rounded-md transition-all outline-none",
                            filterMode === 'me'
                                ? "bg-accent-primary text-white shadow-md ring-1 ring-accent-primary"
                                : "text-text-muted hover:text-text-primary hover:bg-bg-input"
                        )}
                    >
                        My Tasks
                    </button>
                </div>

                <div className="flex items-center gap-1 bg-bg-input rounded-lg p-1 border border-border-subtle">
                    <button
                        onClick={() => setCurrentDate(isMobile ? addDays(currentDate, -1) : subWeeks(currentDate, 1))}
                        className="p-1 hover:bg-bg-card rounded text-text-muted hover:text-text-primary transition-colors"
                        aria-label="Previous week"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1 text-xs font-bold text-text-primary hover:bg-bg-card rounded transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setCurrentDate(isMobile ? addDays(currentDate, 1) : addWeeks(currentDate, 1))}
                        className="p-1 hover:bg-bg-card rounded text-text-muted hover:text-text-primary transition-colors"
                        aria-label="Next week"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
