import { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import { Users, Mail, Shield, CheckCircle, Plus, Search, Clock } from 'lucide-react';
import { InviteMemberModal } from './InviteMemberModal';
import { MemberManagementModal } from './MemberManagementModal';
import { TeamOrganigram } from './TeamOrganigram';
// import type { TeamMember } from '../core/types'; // Unused
// import type { TreeNode } from '../core/hierarchyUtils'; // Unused
import clsx from 'clsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function MyTeamView() {
    const { user, tasks, activeInvitations, team, revokeInvitation, resendInvitation, myWorkspaces, updateTeamMember, renameWorkspace } = useStore();
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempWorkspaceName, setTempWorkspaceName] = useState('');

    // Derived State
    const currentWorkspaceName = useMemo(() => {
        return myWorkspaces?.find(w => w.id === user?.organizationId)?.name || 'Current Workspace';
    }, [myWorkspaces, user?.organizationId]);

    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'approvals' | 'hierarchy'>('members');
    const [searchQuery, setSearchQuery] = useState('');

    const myTeamMembers = useMemo(() => {
        if (!user || !team) return [];
        // Company Directory: Everyone in the org can see the full team list and structure.
        return Object.values(team);
    }, [team, user]);

    const filteredMembers = useMemo(() => {
        if (!searchQuery) return myTeamMembers;
        const lowerQuery = searchQuery.toLowerCase();
        return myTeamMembers.filter(m =>
            (m.name || '').toLowerCase().includes(lowerQuery) ||
            (m.email || '').toLowerCase().includes(lowerQuery) ||
            m.role.toLowerCase().includes(lowerQuery)
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

    const { pendingInvites, approvalRequests, incomingInvites } = useMemo(() => {
        const pending = activeInvitations.filter(i => i.status === 'pending');
        return {
            pendingInvites: pending.filter(i => i.organizationId === user?.organizationId), // Sent by this org
            incomingInvites: pending.filter(i => i.email?.toLowerCase() === user?.email?.toLowerCase()), // Sent TO me (case-insensitive)
            approvalRequests: activeInvitations.filter(i => i.status === 'approval_needed')
        };
    }, [activeInvitations, user]);

    const { approveInvitation, rejectInvitation, acceptPendingInvitation, declinePendingInvitation, leaveTeam } = useStore();
    const isExec = user?.role === 'owner' || user?.role === 'head';

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
        <div className="space-y-8 animate-enter flex flex-col h-full w-full max-w-[1600px] mx-auto p-4 md:p-8">

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-display font-extrabold tracking-tight text-text-primary">
                            My Team
                        </h1>
                        {isEditingName ? (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!tempWorkspaceName.trim()) return;
                                    renameWorkspace(user.organizationId, tempWorkspaceName.trim());
                                    setIsEditingName(false);
                                }}
                                className="flex items-center animate-in zoom-in-95 duration-200"
                            >
                                <input
                                    autoFocus
                                    value={tempWorkspaceName}
                                    onChange={(e) => setTempWorkspaceName(e.target.value)}
                                    onBlur={() => setIsEditingName(false)}
                                    className="text-sm font-bold text-text-primary bg-bg-card px-3 py-1.5 rounded-xl border border-accent-primary shadow-sm shadow-accent-primary/10 outline-none min-w-[200px]"
                                />
                            </form>
                        ) : (
                            <span
                                onClick={() => {
                                    setTempWorkspaceName(currentWorkspaceName);
                                    setIsEditingName(true);
                                }}
                                className="text-xs font-bold text-text-muted bg-bg-card px-3 py-1.5 rounded-full border border-border-subtle cursor-pointer hover:border-accent-primary hover:text-text-primary transition-all shadow-sm flex items-center gap-2 group"
                                title="Click to rename workspace"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/40 group-hover:bg-accent-primary transition-colors" />
                                {currentWorkspaceName}
                            </span>
                        )}
                    </div>
                    <p className="text-text-muted text-lg font-light">The central hub for team composition and performance.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-accent-primary" />
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 pr-4 py-2.5 bg-bg-card border border-border-subtle rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 w-64 shadow-sm hover:border-border-highlight transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {user.role !== 'owner' && (
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure you want to leave this team? You will lose access to all data.")) {
                                        leaveTeam();
                                    }
                                }}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                            >
                                Leave Team
                            </button>
                        )}

                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="bg-accent-primary hover:bg-accent-secondary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-accent-primary/20 transition-all active:scale-95 flex items-center gap-2.5"
                            disabled={!isExec && user.role !== 'lead'}
                        >
                            <Plus size={20} strokeWidth={2.5} />
                            Invite Member
                        </button>
                    </div>
                </div>
            </div>

            {/* Incoming Invitations Alert */}
            {incomingInvites.length > 0 && (
                <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-2xl p-5 animate-in slide-in-from-top-4 duration-500">
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-accent-primary flex items-center justify-center text-white shadow-lg shadow-accent-primary/20">
                            <Mail className="w-5 h-5" />
                        </div>
                        You have {incomingInvites.length} pending invitation{incomingInvites.length > 1 ? 's' : ''}
                    </h3>
                    <div className="grid gap-3">
                        {incomingInvites.map(invite => (
                            <div key={invite.id} className="bg-bg-card p-4 rounded-xl border border-border-subtle flex items-center justify-between shadow-sm hover:border-accent-primary/30 transition-colors">
                                <div>
                                    <div className="font-semibold text-text-primary">
                                        Join as a <span className="capitalize text-accent-primary">{invite.role}</span>
                                    </div>
                                    <div className="text-sm text-text-muted mt-1">
                                        Invited by <span className="text-text-primary font-medium">{invite.inviterName || 'Unknown'}</span> to <span className="text-text-primary font-medium">{invite.organizationName || 'Workspace'}</span> • {format(invite.createdAt, 'MMM d, yyyy')}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (confirm("Are you sure you want to decline this invitation?")) {
                                                declinePendingInvitation(invite.id);
                                            }
                                        }}
                                        className="text-text-muted hover:text-red-500 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                    >
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => acceptPendingInvitation(invite.id)}
                                        className="bg-accent-primary hover:bg-accent-secondary text-white px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-md shadow-accent-primary/10 flex items-center gap-2"
                                    >
                                        <CheckCircle size={18} />
                                        Accept
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="group bg-bg-card border border-border-subtle p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-border-highlight transition-all duration-300 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                            <Users size={20} />
                        </div>
                        <span className="font-bold text-text-muted text-xs uppercase tracking-widest">Total Members</span>
                    </div>
                    <div className="text-4xl font-display font-extrabold text-text-primary tracking-tight">
                        {myTeamMembers.length}
                    </div>
                </div>

                <div className="group bg-bg-card border border-border-subtle p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-border-highlight transition-all duration-300 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                            <Mail size={20} />
                        </div>
                        <span className="font-bold text-text-muted text-xs uppercase tracking-widest">Pending</span>
                    </div>
                    <div className="text-4xl font-display font-extrabold text-text-primary tracking-tight">
                        {pendingInvites.length}
                    </div>
                </div>

                <div className="group bg-bg-card border border-border-subtle p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-border-highlight transition-all duration-300 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                            <Shield size={20} />
                        </div>
                        <span className="font-bold text-text-muted text-xs uppercase tracking-widest">Approvals</span>
                    </div>
                    <div className="text-4xl font-display font-extrabold text-text-primary tracking-tight">
                        {isExec ? approvalRequests.length : '0'}
                    </div>
                </div>

                <div className="group bg-bg-card border border-border-subtle p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-border-highlight transition-all duration-300 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                            <CheckCircle size={20} />
                        </div>
                        <span className="font-bold text-text-muted text-xs uppercase tracking-widest">Efficiency</span>
                    </div>
                    <div className="text-4xl font-display font-extrabold text-emerald-500 tracking-tight">
                        --<span className="text-2xl ml-0.5">%</span>
                    </div>
                </div>
            </div>

            {/* Tabs Section */}
            <div className="flex items-center gap-6 border-b border-border-subtle pb-px relative overflow-x-auto no-scrollbar">
                {[
                    { id: 'members', label: 'Team Members', count: myTeamMembers.length },
                    { id: 'hierarchy', label: 'Team Structure' },
                    { id: 'invitations', label: 'Sent Invitations', count: pendingInvites.length },
                    ...(isExec ? [{ id: 'approvals', label: 'Approvals', count: approvalRequests.length }] : [])
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                            "group pb-4 text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap",
                            activeTab === tab.id
                                ? "text-accent-primary"
                                : "text-text-muted hover:text-text-primary"
                        )}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className={clsx(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                                activeTab === tab.id ? "bg-accent-primary text-white" : "bg-bg-input text-text-muted group-hover:text-text-primary"
                            )}>
                                {tab.count}
                            </span>
                        )}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-accent-primary rounded-t-full shadow-[0_-2px_6px_rgba(var(--accent-primary-rgb),0.3)] anim-scale-x" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1">
                {activeTab === 'members' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {filteredMembers.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-bg-card border-2 border-dashed border-border-subtle rounded-3xl">
                                <Users size={48} className="mx-auto mb-4 text-text-muted opacity-20" />
                                <h3 className="text-xl font-bold text-text-primary">No team members found</h3>
                                <p className="text-text-muted mt-1">Try adjusting your search or ensure you are in the correct workspace.</p>
                            </div>
                        ) : (
                            filteredMembers.map((member) => {
                                const stats = memberStats[member.id] || { total: 0, pending: 0, done: 0 };
                                const isOwner = member.role === 'owner';
                                const isLead = member.role === 'head' || member.role === 'lead';

                                return (
                                    <div
                                        key={member.id}
                                        onClick={() => setSelectedMemberId(member.id)}
                                        className="group bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-accent-primary/50 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="flex items-start gap-5">
                                            {/* Avatar */}
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center text-accent-primary text-xl font-extrabold shadow-inner overflow-hidden border border-white/10">
                                                    {member.avatar ? (
                                                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        (member.name || '?').charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                {(isOwner || isLead) && (
                                                    <div className="absolute -top-1.5 -right-1.5 p-1 bg-amber-500 rounded-lg text-white shadow-lg shadow-amber-500/20 border-2 border-bg-card">
                                                        <Shield size={10} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <h3 className="text-lg font-bold text-text-primary truncate transition-colors group-hover:text-accent-primary">
                                                        {member.name}
                                                    </h3>
                                                    <span className={clsx(
                                                        "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border",
                                                        isOwner ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                                            isLead ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                                                                "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                    )}>
                                                        {member.role}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-text-muted truncate mb-4">{member.email}</p>

                                                {/* Mini Stats */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-bg-app rounded-xl p-2.5 border border-border-subtle/50 group-hover:border-accent-primary/20 transition-colors">
                                                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Active Tasks</div>
                                                        <div className="text-lg font-display font-bold text-text-primary tabular-nums">{stats.pending}</div>
                                                    </div>
                                                    <div className="bg-bg-app rounded-xl p-2.5 border border-border-subtle/50 group-hover:border-accent-primary/20 transition-colors">
                                                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Completed</div>
                                                        <div className="text-lg font-display font-bold text-emerald-500 tabular-nums">{stats.done}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover Actions Bar */}
                                        <div className="mt-4 pt-4 border-t border-border-subtle/30 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 flex items-center justify-between">
                                            <span className="text-[10px] font-medium text-text-muted italic">Click card to manage member</span>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase">Active</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'invitations' && (
                    <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle">
                        {pendingInvites.length === 0 ? (
                            <div className="p-20 text-center text-text-muted">
                                <Mail size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-bold text-text-primary">No active invitations</p>
                                <p className="mt-1">When you invite someone, they will appear here.</p>
                            </div>
                        ) : (
                            pendingInvites.map((invite) => (
                                <div key={invite.id} className="p-5 flex items-center justify-between hover:bg-bg-input/30 transition-colors">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 bg-bg-input rounded-xl flex items-center justify-center text-text-muted shadow-inner">
                                            <Mail size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-text-primary text-lg">{invite.email}</h3>
                                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-text-muted font-medium">
                                                <span className="capitalize bg-accent-primary/10 text-accent-primary px-2.5 py-0.5 rounded-lg text-xs font-bold border border-accent-primary/20">
                                                    {invite.role}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={14} className="opacity-60" />
                                                    Sent {format(invite.createdAt, 'MMM d, yyyy')} • By {invite.inviterName || 'You'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => resendInvitation(invite.id)}
                                            className="px-4 py-2 text-sm font-bold text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-all"
                                        >
                                            Resend
                                        </button>
                                        <button
                                            onClick={() => handleRevoke(invite.id)}
                                            className="px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            Revoke
                                        </button>
                                        <div className="px-3 py-1.5 text-[10px] rounded-lg font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                            Pending
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'approvals' && (
                    <div className="bg-bg-card border border-border-subtle rounded-2xl overflow-hidden divide-y divide-border-subtle">
                        {approvalRequests.length === 0 ? (
                            <div className="p-20 text-center text-text-muted">
                                <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-bold text-text-primary">No pending approvals</p>
                                <p className="mt-1">Team join requests needing your review will appear here.</p>
                            </div>
                        ) : (
                            approvalRequests.map((req) => (
                                <div key={req.id} className="p-5 flex items-center justify-between hover:bg-bg-input/30 transition-colors">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner">
                                            <Users size={28} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-text-primary text-xl">{req.email}</h3>
                                            <p className="text-sm text-text-muted font-medium mt-1">
                                                Requested by <span className="text-purple-600">{req.inviterName || 'Manager'}</span> • {format(req.createdAt, 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => rejectInvitation(req.id)}
                                            className="px-5 py-2.5 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => approveInvitation(req.id, 'member')}
                                            className="px-6 py-2.5 text-sm font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-xl shadow-lg shadow-purple-500/20 transition-all"
                                        >
                                            Approve Member
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'hierarchy' && (
                    <div className="bg-bg-card border border-border-subtle rounded-3xl p-8 shadow-sm min-h-[500px]">
                        <TeamOrganigram
                            members={myTeamMembers}
                            currentUserId={user.id}
                            onMemberClick={(id) => setSelectedMemberId(id)}
                            onUpdateManager={handleUpdateManager}
                            readOnly={!isExec && user.role !== 'lead'}
                        />
                    </div>
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
