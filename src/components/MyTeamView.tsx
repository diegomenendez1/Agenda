import { useState, useMemo } from 'react';
import { useStore } from '../core/store';
import { Users, Mail, Clock, Shield, CheckCircle, XCircle, Plus } from 'lucide-react';
import { InviteMemberModal } from './InviteMemberModal';
import clsx from 'clsx';
import { format } from 'date-fns';

export function MyTeamView() {
    const { user, tasks, activeInvitations, team, revokeInvitation } = useStore();
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');

    // Filter members that report to the current user (or all if admin/owner)
    const myTeamMembers = useMemo(() => {
        if (!user) return [];
        const isExec = user.role === 'owner' || user.role === 'admin';

        // Convert team object to array
        const allMembers = Object.values(team || {});

        if (isExec) return allMembers;

        // For managers/leads, filter by reports_to relationship
        // Note: Since we don't have the full hierarchy loaded deeply yet, 
        // we'll simulate "My Team" as anyone in the same primary team/department
        // or eventually use the reports_to field when populated.
        // For now, let's show everyone to establish the UI structure.
        return allMembers;
    }, [team, user]);

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

    const handleRevoke = async (inviteId: string) => {
        if (confirm('Are you sure you want to revoke this invitation?')) {
            await revokeInvitation(inviteId);
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary">My Team</h1>
                    <p className="text-text-muted">Manage your direct reports and team composition</p>
                </div>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    <span>Invite Member</span>
                </button>
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
                        {activeInvitations.filter(i => i.status === 'pending').length}
                    </div>
                </div>

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
                    onClick={() => setActiveTab('invitations')}
                    className={clsx(
                        "pb-3 text-sm font-medium transition-colors relative",
                        activeTab === 'invitations' ? "text-accent-primary" : "text-text-muted hover:text-text-primary"
                    )}
                >
                    Pending Invitations
                    {activeInvitations.length > 0 && (
                        <span className="ml-2 bg-bg-input text-text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                            {activeInvitations.length}
                        </span>
                    )}
                    {activeTab === 'invitations' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-bg-card border border-border-subtle rounded-xl min-h-[400px]">
                {activeTab === 'members' ? (
                    <div className="divide-y divide-border-subtle">
                        {myTeamMembers.length === 0 ? (
                            <div className="p-12 text-center text-text-muted">
                                <Users size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No team members found.</p>
                            </div>
                        ) : (
                            myTeamMembers.map((member) => {
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
                                            <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-bg-input rounded-lg transition-all text-text-muted hover:text-text-primary">
                                                Manage
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-border-subtle">
                        {activeInvitations.length === 0 ? (
                            <div className="p-12 text-center text-text-muted">
                                <Mail size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No pending invitations.</p>
                            </div>
                        ) : (
                            activeInvitations.map((invite) => (
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
                                        {invite.status === 'pending' && (
                                            <button
                                                onClick={() => handleRevoke(invite.id)}
                                                className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                        <div className={clsx(
                                            "px-3 py-1 text-xs rounded-full font-medium border",
                                            invite.status === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                invite.status === 'accepted' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                                    "bg-red-500/10 text-red-500 border-red-500/20"
                                        )}>
                                            {invite.status}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </div>
    );
}
