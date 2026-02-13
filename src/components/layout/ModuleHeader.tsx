import React from 'react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface ModuleHeaderProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
    iconClassName?: string;
}

export function ModuleHeader({
    icon: Icon,
    title,
    subtitle,
    actions,
    className,
    iconClassName
}: ModuleHeaderProps) {
    return (
        <header className={clsx(
            "mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4 animate-enter",
            className
        )}>
            <div className="flex items-center gap-3">
                <div className={clsx(
                    "w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center shadow-lg shadow-accent-primary/5 shrink-0",
                    iconClassName
                )}>
                    <Icon className="w-6 h-6 text-accent-primary" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
                            {title}
                        </span>
                    </h1>
                    {subtitle && (
                        <p className="text-text-muted text-sm font-normal mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </header>
    );
}
