import { useState, useRef, useEffect } from 'react';
import { type TeamMember, type EntityId } from '../core/types';
import { X, Check, Search, Users } from 'lucide-react';
import clsx from 'clsx';
import { PresenceIndicator } from './PresenceIndicator';

interface MemberFilterProps {
    members: TeamMember[];
    selectedMemberId: EntityId | null;
    onSelectionChange: (id: EntityId | null) => void;
}

export function MemberFilter({ members, selectedMemberId, onSelectionChange }: MemberFilterProps) {
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

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeMember = members.find(m => m.id === selectedMemberId);

    const toggleMember = (id: EntityId) => {
        if (selectedMemberId === id) {
            onSelectionChange(null);
        } else {
            onSelectionChange(id);
            setIsOpen(false);
        }
    };

    const clearFilter = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectionChange(null);
        setIsOpen(false);
    };

    const hasSelection = !!selectedMemberId;

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
                title="Filter by Assignee"
            >
                {hasSelection && activeMember ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full overflow-hidden relative">
                            <img
                                src={activeMember.avatar || `https://ui-avatars.com/api/?name=${activeMember.name}&background=random`}
                                alt={activeMember.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <span className="hidden md:inline max-w-[100px] truncate">{activeMember.name.split(' ')[0]}</span>
                    </div>
                ) : (
                    <>
                        <Users size={16} className="opacity-70" />
                        <span className="hidden md:inline">Assignee</span>
                    </>
                )}

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
                <div className="absolute top-full mt-2 left-0 w-64 bg-bg-card border border-border-subtle rounded-2xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col ring-1 ring-black/5 dark:ring-white/5">
                    <div className="p-3.5 border-b border-border-subtle bg-bg-app/50 backdrop-blur-md">
                        <div className="relative group">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search people..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-bg-input pl-9 pr-3 py-2 rounded-xl text-sm border border-transparent focus:border-accent-primary/30 focus:bg-bg-card outline-none transition-all placeholder:text-text-muted/40 shadow-inner"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto p-1.5 custom-scrollbar">
                        {filteredMembers.length === 0 ? (
                            <div className="py-8 text-center text-text-muted text-xs">
                                No one found
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredMembers.map(member => {
                                    const isSelected = selectedMemberId === member.id;
                                    return (
                                        <button
                                            key={member.id}
                                            onClick={() => toggleMember(member.id)}
                                            className={clsx(
                                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left group",
                                                isSelected
                                                    ? "bg-accent-primary/10 text-text-primary"
                                                    : "hover:bg-bg-input text-text-secondary"
                                            )}
                                        >
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-full overflow-hidden border border-border-subtle group-hover:border-accent-primary/30 transition-colors">
                                                    <img
                                                        src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`}
                                                        alt={member.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="absolute bottom-0 right-0 pointer-events-none">
                                                    <PresenceIndicator userId={member.id} size="sm" showOffline={false} />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className={clsx("font-medium truncate", isSelected && "text-accent-primary")}>{member.name}</div>
                                                <div className="text-[10px] text-text-muted truncate">{member.email}</div>
                                            </div>

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
                                onClick={() => onSelectionChange(null)}
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
