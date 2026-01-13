import { useState } from 'react';
import clsx from 'clsx';
import { PresenceIndicator } from '../components/PresenceIndicator';
import { WorkloadChart } from '../components/WorkloadChart';
import { useStore } from '../core/store';
import { Users, Filter, X, BarChart2 } from 'lucide-react';
import { KanbanBoard } from '../components/KanbanBoard';
import { ProjectFilter } from '../components/ProjectFilter';


export function TeamBoardView() {
    const { tasks, team, user, projects } = useStore();
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [showWorkload, setShowWorkload] = useState(false);

    // Strict Filtering for "Selective Visibility"
    // The Team Board is NOT a public board. It only shows tasks that:
    // 1. Are marked as 'team' visibility
    // 2. HAVE assignees (shared with someone)
    // 3. The current user is involved in (either as the owner who shared it, or as an assignee)
    const taskList = Object.values(tasks).filter(t => {
        // 1. Core Definition: What is a "Team Task"?
        // It must have 'team' visibility OR have assignees (which implies sharing)
        const isShared = t.visibility === 'team' || (t.assigneeIds && t.assigneeIds.length > 0);
        if (!isShared) return false;

        // 2. Role-Based Access Control
        // OWNER: Sees ALL shared tasks (God Mode for Team Board)
        if (user?.role === 'owner') return true;

        // ADMIN: Should see tasks from their specific team.
        // TODO: Once 'team_members' relationship is loaded in store, enable this:
        // if (user?.role === 'admin' && (isMyTeam(t.ownerId) || hasMyTeamMember(t.assigneeIds))) return true;

        // USER / DEFAULT ADMIN: strict "Involved" filter
        const isOwner = t.ownerId === user?.id;
        const isAssigned = t.assigneeIds?.includes(user?.id || '');

        // Must be involved to see it
        if (!isOwner && !isAssigned) return false;

        // 3. UI Filters (Selected Member)
        if (selectedMemberId) {
            const isMemberAssigned = t.assigneeIds?.includes(selectedMemberId);
            const isMemberOwner = t.ownerId === selectedMemberId;
            if (!isMemberAssigned && !isMemberOwner) return false;
        }

        // 4. Project Filter
        if (selectedProjectIds.length > 0) {
            if (!t.projectId || !selectedProjectIds.includes(t.projectId)) return false;
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
                    <div className="h-6 w-px bg-border-subtle" />
                    <ProjectFilter
                        projects={Object.values(projects)}
                        selectedProjectIds={selectedProjectIds}
                        onSelectionChange={setSelectedProjectIds}
                    />
                    <div className="h-6 w-px bg-border-subtle" />
                    <button
                        onClick={() => {
                            setSelectedMemberId(null);
                            setSelectedProjectIds([]);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedMemberId || selectedProjectIds.length > 0 ? 'text-accent-primary bg-accent-primary/10' : 'text-text-muted hover:text-text-primary hover:bg-bg-input'}`}
                    >
                        <Filter size={16} />
                        <span className="hidden md:inline">{selectedMemberId || selectedProjectIds.length > 0 ? 'Clear Filters' : 'Filter'}</span>
                    </button>
                    <div className="h-6 w-px bg-border-subtle" />
                    <button
                        onClick={() => setShowWorkload(!showWorkload)}
                        className={clsx(
                            "p-1.5 rounded-lg transition-colors",
                            showWorkload ? "bg-accent-primary text-white" : "text-muted hover:text-primary hover:bg-bg-input"
                        )}
                        title="Toggle Workload View"
                    >
                        <BarChart2 size={20} />
                    </button>
                </div>
            </header>

            {showWorkload && (
                <div className="mb-6 p-4 rounded-xl glass-panel border border-border-subtle animate-enter">
                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Team Workload Distribution</h3>
                    <WorkloadChart tasks={taskList} team={team} />
                </div>
            )
            }

            <div className="flex-1 overflow-hidden -mx-2 px-2 pb-2">
                <KanbanBoard tasks={taskList} />
            </div>
        </div >
    );
}
