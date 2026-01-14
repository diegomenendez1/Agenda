import { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { PresenceIndicator } from '../components/PresenceIndicator';
import { WorkloadChart } from '../components/WorkloadChart';
import { useStore } from '../core/store';
import { Users, Filter, X, BarChart2 } from 'lucide-react';
import { KanbanBoard } from '../components/KanbanBoard';
import { ProjectFilter } from '../components/ProjectFilter';


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
    // The Team Board is NOT a public board. It only shows tasks that:
    // 1. Are marked as 'team' visibility
    // 2. HAVE assignees (shared with someone)
    // 3. The current user is involved in (either as the owner who shared it, or as an assignee)
    const taskList = useMemo(() => {
        return Object.values(tasks).filter(t => {
            // 1. Core Definition: What is a "Team Task"?
            const isShared = t.visibility === 'team' || (t.assigneeIds && t.assigneeIds.length > 0);

            // STRICT PRIVACY
            if (t.visibility === 'private' && t.ownerId !== user?.id) return false;

            if (!isShared) return false;

            // 2. Role-Based Access Control
            if (user?.role === 'owner' || user?.role === 'admin') return true;

            // 3. Hierarchy Check (Audit Recommendation)
            // - Managers see their own tasks + tasks of people who report to them.
            // - Members see their own tasks + tasks of their manager + tasks of peers (same manager).
            // - Everyone sees tasks they are assigned to.

            const isOwner = t.ownerId === user?.id;
            const isAssigned = t.assigneeIds?.includes(user?.id || '');

            // Fast track
            if (isOwner || isAssigned) return true;

            // Resolve Team Relationships
            const taskOwner = team[t.ownerId];
            if (!taskOwner) return false; // Can't verify hierarchy if profile missing

            // If I am a Manager...
            if (user?.role === 'manager') {
                // I see tasks owned by my reports
                const isMyReport = taskOwner.reportsTo === user.id;
                return isMyReport;
            }

            // If I am a Member...
            // I see tasks from my Manager
            const isMyManager = user.reportsTo === t.ownerId;
            if (isMyManager) return true;

            // I see tasks from Peers (same reportsTo) - excluding orphans (null reportsTo) unless in same null group? 
            // Better to be strict: Only if reportsTo is set and matches.
            const isPeer = user.reportsTo && taskOwner.reportsTo === user.reportsTo;
            if (isPeer) return true;

            return false;
        });
    }, [tasks, team, user, selectedMemberId, selectedProjectIds]);

    return (
        <div className="flex flex-col h-full bg-bg-app overflow-hidden p-6 md:p-8">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-enter relative z-20">
                <div>
                    <h1 className="text-3xl font-display font-bold flex items-center gap-3 tracking-tight text-text-primary">
                        <Users className="w-8 h-8 text-accent-primary" />
                        Team Board
                    </h1>
                    <p className="text-text-muted text-sm mt-1 ml-11">
                        Tasks shared with me or delegated by me.
                    </p>
                </div>

                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-accent-primary text-white text-sm font-bold px-4 py-2 rounded-xl shadow-lg shadow-accent-primary/20 hover:bg-accent-primary-hover transition-all flex items-center gap-2"
                    >
                        <Users size={16} />
                        <span className="hidden sm:inline">Invite Member</span>
                    </button>
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
        </div >
    );
}
