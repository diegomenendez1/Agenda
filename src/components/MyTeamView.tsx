import { useState, useMemo } from 'react';
import { useStore } from '../core/store';
import { Users, Mail, Shield, CheckCircle, Plus, Search, Clock } from 'lucide-react';
import { InviteMemberModal } from './InviteMemberModal';
import { MemberManagementModal } from './MemberManagementModal';
import { TeamOrganigram } from './TeamOrganigram';
import { getDescendants } from '../core/hierarchyUtils';
// import type { TeamMember } from '../core/types'; // Unused
// import type { TreeNode } from '../core/hierarchyUtils'; // Unused
import clsx from 'clsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function MyTeamView() {
    const { user, tasks, activeInvitations, team, revokeInvitation, resendInvitation, myWorkspaces, updateTeamMember } = useStore();
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // Derived State
    const currentWorkspaceName = useMemo(() => {
        return myWorkspaces?.find(w => w.id === user?.organizationId)?.name || 'Current Workspace';
    }, [myWorkspaces, user?.organizationId]);

    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'approvals' | 'hierarchy'>('members');
    const [searchQuery, setSearchQuery] = useState('');

    const myTeamMembers = useMemo(() => {
        if (!user || !team) return [];
        const allMembers = Object.values(team);

        // Strict Visibility: Owners/Admins see everyone. Others see only their descendants (and themselves).
        const isExec = user.role === 'owner' || user.role === 'admin';

        if (isExec) {
            return allMembers;
        }

        // For managers/members, calculate strictly visible subtree
        const visibleIds = getDescendants(user.id, allMembers);
        return allMembers.filter(m => visibleIds.has(m.id));
    }, [team, user]);

    const filteredMembers = useMemo(() => {
        if (!searchQuery) return myTeamMembers;
        const lowerQuery = searchQuery.toLowerCase();
        return myTeamMembers.filter(m =>
            m.name.toLowerCase().includes(lowerQuery) ||
            m.email.toLowerCase().includes(lowerQuery)
        );
    }, [myTeamMembers, searchQuery]);

    // Calculate workload stats per member
    const memberStats = useMemo(() => {
        const stats: Record<string, { total: number; pending: number; done: number }> = {};

        Object.values(tasks).forEach(task => {
            task.assigneeIds?.forEach(uid => {
                if (!stats[uid]) stats[uid] = { total: 0, pending: 0, done: 0 };
                stats[uid].total++;
                if (task.status === 'done') {
                    stats[uid].done++;
                } else {
                    stats[uid].pending++;
                }
            });
        });
        return stats;
    }, [tasks]);

    const { pendingInvites, approvalRequests } = useMemo(() => {
        return {
            pendingInvites: activeInvitations.filter(i => i.status === 'pending'),
            approvalRequests: activeInvitations.filter(i => i.status === 'approval_needed')
        };
    }, [activeInvitations]);

    const { approveInvitation, rejectInvitation } = useStore();
    const isExec = user?.role === 'owner' || user?.role === 'admin';

    const handleRevoke = async (inviteId: string) => {
        if (confirm('Are you sure you want to revoke this invitation?')) {
            await revokeInvitation(inviteId);
        }
    };

    const handleUpdateManager = async (memberId: string, newManagerId: string) => {
        try {
            await updateTeamMember(memberId, { reportsTo: newManagerId });
            toast.success("Reporting line updated");
        } catch (error) {
            console.error("Failed to update manager:", error);
            toast.error("Failed to update reporting line");
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* Header Actions */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                        My Team
                        <span className="text-lg font-medium text-text-muted bg-bg-card px-3 py-1 rounded-full border border-border-subtle">
                            {currentWorkspaceName}
                        </span>
                    </h1>
                    <p className="text-text-muted">The central hub for team composition, invitations, and performance.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-bg-card border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 w-64"
                        />
                    </div>
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="btn btn-primary flex items-center gap-2"
                        disabled={!isExec && user.role !== 'manager'}
                    >
                        <Plus size={18} />
                        <span>Invite Member</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-bg-card border border-border-subtle p-5 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                            <Users size={20} />
                        </div>
                        <span className="font-semibold text-text-muted text-sm uppercase tracking-wide">Total Members</span>
                    </div>
                    <div className="text-3xl font-bold text-text-primary">
                        {myTeamMembers.length}
                    </div>
                </div>

                <div className="bg-bg-card border border-border-subtle p-5 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                            <Mail size={20} />
                        </div>
                        <span className="font-semibold text-text-muted text-sm uppercase tracking-wide">Pending Invites</span>
                    </div>
                    <div className="text-3xl font-bold text-text-primary">
                        {pendingInvites.length}
                    </div>
                </div>

                {isExec && (
                    <div className="bg-bg-card border border-border-subtle p-5 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                                <Shield size={20} />
                            </div>
                            <span className="font-semibold text-text-muted text-sm uppercase tracking-wide">Approval Requests</span>
                        </div>
                        <div className="text-3xl font-bold text-text-primary">
                            {approvalRequests.length}
                        </div>
                    </div>
                )}

                <div className="bg-bg-card border border-border-subtle p-5 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                            <CheckCircle size={20} />
                        </div>
                        <span className="font-semibold text-text-muted text-sm uppercase tracking-wide">Team Efficiency</span>
                    </div>
                    <div className="text-3xl font-bold text-text-primary">
                        --%
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border-subtle flex gap-6">
                <button
                    onClick={() => setActiveTab('members')}
                    className={clsx(
                        "pb-3 text-sm font-medium transition-colors relative",
                        activeTab === 'members' ? "text-accent-primary" : "text-text-muted hover:text-text-primary"
                    )}
                >
                    Team Members
                    {activeTab === 'members' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('hierarchy')}
                    className={clsx(
                        "pb-3 text-sm font-medium transition-colors relative",
                        activeTab === 'hierarchy' ? "text-accent-primary" : "text-text-muted hover:text-text-primary"
                    )}
                >
                    Team Structure
                    {activeTab === 'hierarchy' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('invitations')}
                    data-testid="tab-invitations"
                    className={clsx(
                        "pb-3 text-sm font-medium transition-colors relative",
                        activeTab === 'invitations' ? "text-accent-primary" : "text-text-muted hover:text-text-primary"
                    )}
                >
                    Sent Invitations
                    {pendingInvites.length > 0 && (
                        <span className="ml-2 bg-bg-input text-text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                            {pendingInvites.length}
                        </span>
                    )}
                    {activeTab === 'invitations' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary rounded-t-full" />
                    )}
                </button>

                {isExec && (
                    <button
                        onClick={() => setActiveTab('approvals')}
                        className={clsx(
                            "pb-3 text-sm font-medium transition-colors relative",
                            activeTab === 'approvals' ? "text-accent-primary" : "text-text-muted hover:text-text-primary"
                        )}
                    >
                        Approvals
                        {approvalRequests.length > 0 && (
                            <span className="ml-2 bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {approvalRequests.length}
                            </span>
                        )}
                        {activeTab === 'approvals' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary rounded-t-full" />
                        )}
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="bg-bg-card border border-border-subtle rounded-xl min-h-[400px]">
                {activeTab === 'members' && (
                    <div className="divide-y divide-border-subtle">
                        {filteredMembers.length === 0 ? (
                            <div className="p-12 text-center text-text-muted">
                                <Users size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No team members found matching "{searchQuery}".</p>
                            </div>
                        ) : (
                            filteredMembers.map((member) => {
                                const stats = memberStats[member.id] || { total: 0, pending: 0, done: 0 };

                                return (
                                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-bg-input/30 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold">
                                                {member.avatar ? (
                                                    <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    member.name.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-text-primary flex items-center gap-2">
                                                    {member.name}
                                                    {member.role === 'owner' && <Shield size={14} className="text-amber-500" />}
                                                </h3>
                                                <p className="text-sm text-text-muted">{member.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="hidden md:block text-right">
                                                <div className="text-xs text-text-muted uppercase font-bold tracking-wider mb-1">Active Tasks</div>
                                                <div className="font-mono text-sm">{stats.pending}</div>
                                            </div>
                                            <div className="hidden md:block text-right">
                                                <div className="text-xs text-text-muted uppercase font-bold tracking-wider mb-1">Completed</div>
                                                <div className="font-mono text-sm text-green-500">{stats.done}</div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedMemberId(member.id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-bg-input rounded-lg transition-all text-text-muted hover:text-text-primary"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'invitations' && (
                    <div className="divide-y divide-border-subtle">
                        {pendingInvites.length === 0 ? (
                            <div className="p-12 text-center text-text-muted">
                                <Mail size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No active sent invitations.</p>
                            </div>
                        ) : (
                            pendingInvites.map((invite) => (
                                <div key={invite.id} className="p-4 flex items-center justify-between hover:bg-bg-input/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-bg-input rounded-lg text-text-muted">
                                            <Mail size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-text-primary">{invite.email}</h3>
                                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                                <span className="capitalize bg-accent-primary/10 text-accent-primary px-2 py-0.5 rounded textxs">
                                                    {invite.role}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    Sent {format(invite.createdAt, 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => resendInvitation(invite.id)}
                                            className="px-3 py-1.5 text-sm text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
                                        >
                                            Resend
                                        </button>
                                        <button
                                            onClick={() => handleRevoke(invite.id)}
                                            className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            Revoke
                                        </button>
                                        <div className={clsx(
                                            "px-3 py-1 text-xs rounded-full font-medium border",
                                            "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                        )}>
                                            Pending
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'approvals' && (
                    <div className="divide-y divide-border-subtle">
                        {approvalRequests.length === 0 ? (
                            <div className="p-12 text-center text-text-muted">
                                <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No pending requests.</p>
                            </div>
                        ) : (
                            approvalRequests.map((req) => (
                                <div key={req.id} className="p-4 flex items-center justify-between hover:bg-bg-input/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-text-primary">{req.email}</h3>
                                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                                <span>Requested by <strong>{req.invitedByName || 'Unknown'}</strong></span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {format(req.createdAt, 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => rejectInvitation(req.id)}
                                            className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => approveInvitation(req.id, 'member')} // Default to member, maybe add dropdown later
                                            className="px-4 py-1.5 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
                                        >
                                            Approve as Member
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'hierarchy' && (
                    <TeamOrganigram
                        members={myTeamMembers}
                        currentUserId={user.id}
                        onMemberClick={(id) => setSelectedMemberId(id)}
                        onUpdateManager={handleUpdateManager}
                        readOnly={!isExec && user.role !== 'manager'}
                    />
                )}
            </div>

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />

            <MemberManagementModal
                isOpen={!!selectedMemberId}
                onClose={() => setSelectedMemberId(null)}
                memberId={selectedMemberId}
            />
        </div>
    );
}
