import { useState, useMemo } from 'react';
import clsx from 'clsx';

import { WorkloadChart } from '../components/WorkloadChart';
import { useStore } from '../core/store';
import { Users, X, BarChart2 } from 'lucide-react';
import { KanbanBoard } from '../components/KanbanBoard';

import { AvatarMemberFilter } from '../components/AvatarMemberFilter';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { getDescendants } from '../core/hierarchyUtils';


export function TeamBoardView() {
    const { tasks, team, user } = useStore();
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    const [showWorkload, setShowWorkload] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);



    // Strict Filtering for "Selective Visibility"
    const taskList = useMemo(() => {
        const allMembers = Object.values(team);

        // STRICT ISOLATION LOGIC:
        // 1. Calculate the "Visible Universe" of users for the current viewer.
        //    - Head/Owner: All users.
        //    - Lead/Member: Self + All recursive descendants (direct reports tree).
        const isExec = user?.role === 'owner' || user?.role === 'head';
        const myDescendants = user ? getDescendants(user.id, allMembers) : new Set<string>();

        return Object.values(tasks).filter(t => {
            // 0. Base Access Check (Who can see this task?)
            //    - I am the owner
            //    - I am assigned
            //    - I am an Admin/Owner
            //    - The task owner is one of my DESCENDANTS (Strict Supervision)

            const isOwner = t.ownerId === user?.id;
            const isAssigned = t.assigneeIds?.includes(user?.id || '');
            const isDownline = t.ownerId && myDescendants.has(t.ownerId) && t.ownerId !== user?.id; // Owned by someone below me

            let hasAccess = false;
            if (isExec) hasAccess = true;
            else if (isOwner || isAssigned) hasAccess = true;
            else if (isDownline) hasAccess = true; // Managers see downline tasks

            if (!hasAccess) return false;

            // 1. Visibility Scope Check (Private vs Team)
            //    Even if I technically "could" see it (e.g. I'm head), if it's Private and not mine/assigned, I shouldn't see it on Team Board?
            //    Actually, standard rule: Private is strictly private unless assigned.
            //    "Team Board" implies Shared Work.
            //    We stick to: Private tasks are hidden here unless I am assigned (which makes it shared-private).
            if (t.visibility === 'private' && !isAssigned && !isOwner) return false;

            // 2. Feature: Team Member Filter
            if (selectedMemberId) {
                const isMemberOwner = t.ownerId === selectedMemberId;
                const isMemberAssigned = t.assigneeIds?.includes(selectedMemberId);
                if (!isMemberOwner && !isMemberAssigned) return false;
            }



            return true;
        });
    }, [tasks, team, user, selectedMemberId]); // Re-run when team changes to update descendants

    // NEW: Computed "My Direct Reports" for the Quick Filter UI
    const myDirectReports = useMemo(() => {
        if (!user) return [];
        return Object.values(team).filter(m => m.reportsTo === user.id);
    }, [team, user]);

    return (
        <div className="flex flex-col h-full bg-bg-app overflow-hidden p-6 md:p-8">
            <header className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 animate-enter relative z-20">
                <div>
                    <h1 className="text-4xl font-display font-extrabold flex items-center gap-3 tracking-tight text-text-primary mb-2">
                        Team Board
                    </h1>
                    <p className="text-text-muted text-lg font-light">
                        Tasks shared with me or delegated by me.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="group relative overflow-hidden bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-violet-500/25 transition-all active:scale-95 flex items-center gap-2.5"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Users size={20} strokeWidth={2.5} />
                        <span className="relative">Invite Member</span>
                    </button>

                    <div className="flex items-center gap-1 p-1.5 bg-bg-surface/60 backdrop-blur-md border border-border-subtle rounded-2xl shadow-sm overflow-x-auto max-w-full">
                        <AvatarMemberFilter
                            members={Object.values(team).filter(m => {
                                // Only show members I can see in the filter
                                if (!user) return false;
                                if (user.role === 'owner' || user.role === 'head') return true;
                                const myDescendants = getDescendants(user.id, Object.values(team));
                                return myDescendants.has(m.id) || m.id === user.id;
                            })}
                            selectedMemberId={selectedMemberId}
                            onSelectionChange={setSelectedMemberId}
                            label=""
                        />

                        {/* HIERARCHY FILTER SHORTCUT */}
                        {myDirectReports.length > 0 && (
                            <>
                                <div className="h-8 w-px bg-border-subtle/50 mx-1" />
                                <div className="text-[10px] font-bold text-accent-primary uppercase tracking-wider px-2 whitespace-nowrap hidden lg:block">
                                    Mi Equipo ({myDirectReports.length})
                                </div>
                            </>
                        )}

                        <div className="h-8 w-px bg-border-subtle/50 mx-1" />


                        {/* Clear & View Tools */}
                        <div className="flex items-center pl-2 border-l border-border-subtle/50 ml-2 gap-1">
                            {selectedMemberId && (
                                <button
                                    onClick={() => setSelectedMemberId(null)}
                                    className="p-2 rounded-lg text-text-muted hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                    title="Clear Filters"
                                >
                                    <X size={18} />
                                </button>
                            )}

                            <button
                                onClick={() => setShowWorkload(!showWorkload)}
                                className={clsx(
                                    "p-2 rounded-lg transition-colors",
                                    showWorkload ? "bg-bg-card text-violet-600 shadow-sm" : "text-text-muted hover:text-text-primary hover:bg-bg-card/50"
                                )}
                                title="Toggle Workload View"
                            >
                                <BarChart2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {showWorkload && (
                <div className="mb-6 p-4 rounded-xl glass-panel border border-border-subtle animate-enter">
                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Team Workload Distribution</h3>
                    <WorkloadChart tasks={taskList} team={team} />
                </div>
            )}

            <div className="flex-1 overflow-hidden -mx-2 px-2 pb-2">
                <KanbanBoard tasks={taskList} />
            </div>

            <InviteMemberModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
            />
        </div >
    );
}
