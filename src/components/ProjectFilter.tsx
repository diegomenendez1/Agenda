import { useState, useRef, useEffect } from 'react';
import { type Project, type EntityId } from '../core/types';
import { Filter, X, Check, Search, Folder } from 'lucide-react';
import clsx from 'clsx';

interface ProjectFilterProps {
    projects: Project[];
    selectedProjectIds: EntityId[];
    onSelectionChange: (ids: EntityId[]) => void;
}

export function ProjectFilter({ projects, selectedProjectIds, onSelectionChange }: ProjectFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'planning');

    const filteredProjects = activeProjects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleProject = (id: EntityId) => {
        if (selectedProjectIds.includes(id)) {
            onSelectionChange(selectedProjectIds.filter(pid => pid !== id));
        } else {
            onSelectionChange([...selectedProjectIds, id]);
        }
    };

    const clearFilter = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectionChange([]);
        setIsOpen(false);
    };

    const hasSelection = selectedProjectIds.length > 0;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border",
                    hasSelection
                        ? "bg-accent-primary/10 text-accent-primary border-accent-primary/20"
                        : "text-text-muted hover:text-text-primary hover:bg-bg-input border-transparent hover:border-border-subtle"
                )}
            >
                <Folder size={16} className={hasSelection ? "fill-current opacity-20" : ""} />
                <span className="hidden md:inline">
                    {hasSelection
                        ? `${selectedProjectIds.length} Project${selectedProjectIds.length > 1 ? 's' : ''}`
                        : 'Projects'}
                </span>
                {hasSelection && (
                    <div
                        role="button"
                        onClick={clearFilter}
                        className="ml-1 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"
                    >
                        <X size={12} />
                    </div>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 w-64 bg-bg-card border border-border-subtle rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-border-subtle bg-bg-app/50 backdrop-blur-sm">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                type="text"
                                placeholder="Find project..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-bg-input pl-8 pr-3 py-1.5 rounded-lg text-sm border-none focus:ring-1 focus:ring-accent-primary placeholder:text-text-muted/50"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                        {filteredProjects.length === 0 ? (
                            <div className="py-8 text-center text-text-muted text-xs">
                                No active projects found
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredProjects.map(project => {
                                    const isSelected = selectedProjectIds.includes(project.id);
                                    return (
                                        <button
                                            key={project.id}
                                            onClick={() => toggleProject(project.id)}
                                            className={clsx(
                                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                                                isSelected
                                                    ? "bg-accent-primary/10 text-text-primary"
                                                    : "hover:bg-bg-input text-text-secondary"
                                            )}
                                        >
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shadow-sm ring-1 ring-inset ring-white/10"
                                                style={{ backgroundColor: project.color }}
                                            />
                                            <span className="flex-1 truncate">{project.name}</span>
                                            {isSelected && <Check size={14} className="text-accent-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {hasSelection && (
                        <div className="p-2 border-t border-border-subtle bg-bg-app/50">
                            <button
                                onClick={() => onSelectionChange([])}
                                className="w-full py-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors hover:bg-bg-input rounded-md"
                            >
                                Clear Filter
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
