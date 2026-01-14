import { type TeamMember, type EntityId } from '../core/types';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { PresenceIndicator } from './PresenceIndicator';

interface AvatarMemberFilterProps {
    members: TeamMember[];
    selectedMemberId: EntityId | null;
    onSelectionChange: (id: EntityId | null) => void;
    label?: string;
    limit?: number;
}

export function AvatarMemberFilter({ members, selectedMemberId, onSelectionChange, label = "Filter by:", limit = 5 }: AvatarMemberFilterProps) {
    return (
        <div className="flex items-center gap-2 px-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider mr-2 hidden sm:block">{label}</span>
            <div className="flex -space-x-2 hover:space-x-1 transition-all duration-300 items-center">
                <button
                    onClick={() => onSelectionChange(null)}
                    className={clsx(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all relative z-20 hover:scale-110 hover:z-30",
                        !selectedMemberId
                            ? "bg-text-primary text-bg-card border-text-primary ring-2 ring-text-primary/20"
                            : "bg-bg-card text-text-muted border-border-subtle hover:border-text-primary hover:text-text-primary"
                    )}
                    title="Show All Team Members"
                >
                    ALL
                </button>
                {members.slice(0, limit).map(member => {
                    const isSelected = selectedMemberId === member.id;
                    const isDimmed = selectedMemberId && !isSelected;
                    return (
                        <button
                            key={member.id}
                            onClick={() => onSelectionChange(isSelected ? null : member.id)}
                            className={`relative group transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 ${isDimmed ? 'opacity-30 scale-90 grayscale' : 'opacity-100 scale-100 z-10'}`}
                            title={`Filter by ${member.name}`}
                        >
                            <div className="relative">
                                <img
                                    src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`}
                                    alt={member.name}
                                    className={`w-8 h-8 rounded-full border-2 ${isSelected ? 'border-accent-primary ring-2 ring-accent-primary/30' : 'border-bg-card'}`}
                                />
                                <div className="absolute bottom-0 right-0 z-10">
                                    <PresenceIndicator userId={member.id} size="sm" />
                                </div>
                            </div>
                            {isSelected && (
                                <div className="absolute -top-1 -right-1 bg-accent-primary text-white rounded-full p-0.5 shadow-sm z-20">
                                    <X size={8} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
