import { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';

import { WorkloadChart } from '../components/WorkloadChart';
import { useStore } from '../core/store';
import { Users, X, BarChart2 } from 'lucide-react';
import { KanbanBoard } from '../components/KanbanBoard';
import { ProjectFilter } from '../components/ProjectFilter';
import { AvatarMemberFilter } from '../components/AvatarMemberFilter';


export function TeamBoardView() {
    const { tasks, team, user, projects, fetchInvitations, activeInvitations, sendInvitation, revokeInvitation } = useStore();
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [showWorkload, setShowWorkload] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    useEffect(() => {
        fetchInvitations();
    }, []);

    // Strict Filtering for "Selective Visibility"
    const taskList = useMemo(() => {
        return Object.values(tasks).filter(t => {
            // 4. Feature: Team Member Filter (Moved to Top)
            if (selectedMemberId) {
                const isMemberOwner = t.ownerId === selectedMemberId;
                const isMemberAssigned = t.assigneeIds?.includes(selectedMemberId);
                if (!isMemberOwner && !isMemberAssigned) return false;
            }

            // 5. Feature: Project Filter (Moved to Top)
            if (selectedProjectIds.length > 0) {
                if (!t.projectId || !selectedProjectIds.includes(t.projectId)) return false;
            }

            // 0. ABSOLUTE PRIVACY: If it's private and I'm not the owner or assignee, it's GONE.
            // No exceptions for admins in this view to keep it clean.
            const isOwner = t.ownerId === user?.id;
            const isAssigned = t.assigneeIds?.includes(user?.id || '');

            if (t.visibility === 'private' && !isOwner && !isAssigned) {
                return false;
            }

            // 1. Core Definition
            const isShared = t.visibility === 'team' || (t.assigneeIds && t.assigneeIds.length > 0);

            // 2. Access Logic
            if (isOwner || isAssigned) return true;
            if (user?.role === 'owner' || user?.role === 'admin') return true;

            // 3. Final Fallback
            return isShared;
        });
    }, [tasks, team, user, selectedMemberId, selectedProjectIds]);

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
                            members={Object.values(team)}
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
                        <ProjectFilter
                            projects={Object.values(projects)}
                            selectedProjectIds={selectedProjectIds}
                            onSelectionChange={setSelectedProjectIds}
                        />

                        {/* Clear & View Tools */}
                        <div className="flex items-center pl-2 border-l border-border-subtle/50 ml-2 gap-1">
                            {(selectedMemberId || selectedProjectIds.length > 0) && (
                                <button
                                    onClick={() => {
                                        setSelectedMemberId(null);
                                        setSelectedProjectIds([]);
                                    }}
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

            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-bg-card rounded-xl shadow-2xl w-full max-w-md border border-border-subtle animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                            <h3 className="font-bold text-lg">Manage Team</h3>
                            <button onClick={() => setShowInviteModal(false)}><X size={20} className="text-text-muted hover:text-text-primary" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase text-text-muted mb-2">Invite New Member</label>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="colleague@example.com"
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        className="input flex-1"
                                    />
                                    <button
                                        onClick={() => {
                                            if (!inviteEmail) return;
                                            sendInvitation(inviteEmail, 'member');
                                            setInviteEmail('');
                                        }}
                                        className="bg-accent-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-accent-primary-hover"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-text-muted mb-2">Pending Invitations</label>
                                {activeInvitations && activeInvitations.length > 0 ? (
                                    <div className="space-y-2">
                                        {activeInvitations.map((invite: any) => (
                                            <div key={invite.id} className="flex items-center justify-between bg-bg-input p-3 rounded-lg text-sm">
                                                <div>
                                                    <div className="font-bold text-text-primary">{invite.member_email || invite.manager_name}</div>
                                                    <div className="text-[10px] text-text-muted capitalize">
                                                        {invite.direction === 'sent' ? 'Sent to' : 'From'} • {invite.status}
                                                    </div>
                                                </div>
                                                {invite.direction === 'sent' && (
                                                    <button
                                                        onClick={() => revokeInvitation(invite.id)}
                                                        className="text-red-500 text-xs hover:underline"
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                                {invite.direction === 'received' && (
                                                    <div className="text-xs text-accent-primary font-bold">Check Inbox</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center p-4 bg-bg-app rounded-lg text-text-muted text-sm italic">
                                        No pending invitations.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
