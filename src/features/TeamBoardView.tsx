import { useState } from 'react';
import { useStore } from '../core/store';
import { Users, Filter, X } from 'lucide-react';
import { KanbanBoard } from '../components/KanbanBoard';


export function TeamBoardView() {
    const { tasks, team, user } = useStore();
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    // Strict Filtering for "Selective Visibility"
    // The Team Board is NOT a public board. It only shows tasks that:
    // 1. Are marked as 'team' visibility
    // 2. HAVE assignees (shared with someone)
    // 3. The current user is involved in (either as the owner who shared it, or as an assignee)
    const taskList = Object.values(tasks).filter(t => {
        if (t.visibility !== 'team') return false;

        const hasAssignees = t.assigneeIds && t.assigneeIds.length > 0;
        if (!hasAssignees) return false; // "The only way it shows... is that it has been assigned"

        const isOwner = t.ownerId === user?.id;
        const isAssigned = t.assigneeIds?.includes(user?.id || '');

        // 1. First, basic security filter (must be involved)
        if (!isOwner && !isAssigned) return false;

        // 2. Second, optional member filter
        if (selectedMemberId) {
            // Task must be assigned to the selected member OR owned by them
            // Actually usually "Filter by person" means "Show me what X is doing".
            const isMemberAssigned = t.assigneeIds?.includes(selectedMemberId);
            const isMemberOwner = t.ownerId === selectedMemberId;
            if (!isMemberAssigned && !isMemberOwner) return false;
        }

        return true;
    });

    return (
        <div className="flex flex-col h-full bg-bg-app overflow-hidden p-6 md:p-8">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-enter">
                <div>
                    <h1 className="text-3xl font-display font-bold flex items-center gap-3 tracking-tight text-text-primary">
                        <Users className="w-8 h-8 text-accent-primary" />
                        Team Board
                    </h1>
                    <p className="text-text-muted text-sm mt-1 ml-11">
                        Tasks shared with me or delegated by me.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-bg-card border border-border-subtle p-2 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 px-2">
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wider mr-2 hidden sm:block">Filter by:</span>
                        <div className="flex -space-x-2 hover:space-x-1 transition-all duration-300">
                            {Object.values(team).slice(0, 5).map(member => {
                                const isSelected = selectedMemberId === member.id;
                                const isDimmed = selectedMemberId && !isSelected;
                                return (
                                    <button
                                        key={member.id}
                                        onClick={() => setSelectedMemberId(isSelected ? null : member.id)}
                                        className={`relative group transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 ${isDimmed ? 'opacity-30 scale-90 grayscale' : 'opacity-100 scale-100 z-10'}`}
                                        title={`Filter by ${member.name}`}
                                    >
                                        <img
                                            src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`}
                                            alt={member.name}
                                            className={`w-8 h-8 rounded-full border-2 ${isSelected ? 'border-accent-primary ring-2 ring-accent-primary/30' : 'border-bg-card'}`}
                                        />
                                        {isSelected && (
                                            <div className="absolute -top-1 -right-1 bg-accent-primary text-white rounded-full p-0.5 shadow-sm">
                                                <X size={8} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="h-6 w-px bg-border-subtle" />
                    <button
                        onClick={() => setSelectedMemberId(null)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedMemberId ? 'text-accent-primary bg-accent-primary/10' : 'text-text-muted hover:text-text-primary hover:bg-bg-input'}`}
                    >
                        <Filter size={16} />
                        <span className="hidden md:inline">{selectedMemberId ? 'Clear Filter' : 'Filter'}</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden -mx-2 px-2 pb-2">
                <KanbanBoard tasks={taskList} />
            </div>
        </div>
    );
}
