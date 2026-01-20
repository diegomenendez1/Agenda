import { useState, useMemo } from 'react';
import { useStore } from '../core/store';
import { canManageRole, canAssignManager } from '../core/permissions';
import {
    X, Shield, Mail, CheckCircle, Clock,
    BarChart2, Zap, AlertTriangle, Save,
    User, Users, Briefcase, Lock
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { supabase } from '../core/supabase';
import { toast } from 'sonner';

interface MemberManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId: string | null;
}

export function MemberManagementModal({ isOpen, onClose, memberId }: MemberManagementModalProps) {
    const { team, tasks, user, updateMemberRole, removeTeamMember, fetchAIContext, updateAIContext } = useStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
    const [contextValue, setContextValue] = useState('');
    const [isLoadingContext, setIsLoadingContext] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const member = useMemo(() => {
        if (!memberId || !team) return null;
        // Search in team object values
        return Object.values(team).find(m => m.id === memberId);
    }, [team, memberId]);

    const isMe = user?.id === member?.id;

    // Permission Logic: STRICT HIERARCHY
    const canManage = useMemo(() => {
        if (!user || !member) return false;
        // Cannot manage self
        if (user.id === member.id) return false;

        return canManageRole(user.role, member.role);
    }, [user, member]);

    // Workload Stats
    const stats = useMemo(() => {
        if (!memberId) return { total: 0, pending: 0, done: 0, completionRate: 0 };

        let total = 0;
        let pending = 0;
        let done = 0;

        Object.values(tasks).forEach(t => {
            const isAssigned = t.assigneeIds?.includes(memberId);
            if (isAssigned) {
                total++;
                if (t.status === 'done') done++;
                else pending++;
            }
        });

        return {
            total,
            pending,
            done,
            completionRate: total > 0 ? Math.round((done / total) * 100) : 0
        };
    }, [tasks, memberId]);

    // Fetch AI Context when tab changes to settings
    const handleTabChange = async (tab: 'overview' | 'settings') => {
        setActiveTab(tab);
        if (tab === 'settings' && memberId && !contextValue && canManage) {
            setIsLoadingContext(true);
            try {
                const ctx = await fetchAIContext(memberId);
                setContextValue(ctx || '');
            } catch (error) {
                console.error("Failed to fetch context", error);
            } finally {
                setIsLoadingContext(false);
            }
        }
    };

    const handleRoleChange = async (newRole: string) => {
        if (!memberId) return;
        setIsSaving(true);
        try {
            await updateMemberRole(memberId, newRole);
            toast.success('Role updated successfully');
        } catch (error) {
            toast.error('Failed to update role');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveContext = async () => {
        if (!memberId) return;
        setIsSaving(true);
        try {
            await updateAIContext(memberId, contextValue);
            toast.success('AI Context updated');
        } catch (error) {
            toast.error('Failed to update context');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!memberId || !member) return;
        if (!confirm(`Are you sure you want to remove ${member.name} from the team? This cannot be undone.`)) return;

        setIsSaving(true);
        try {
            await removeTeamMember(memberId);
            toast.success('Member removed from team');
            onClose();
        } catch (error) {
            toast.error('Failed to remove member');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendPasswordReset = async () => {
        if (!member || !member.email) return;
        if (!confirm(`Send password reset email to ${member.email}?`)) return;

        setIsSaving(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
                redirectTo: `${window.location.origin}/auth?reset=true`
            });
            if (error) throw error;
            toast.success(`Password reset email sent to ${member.email}`);
        } catch (error: any) {
            toast.error('Failed to send reset email: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !member) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="relative h-32 bg-gradient-to-r from-accent-primary/20 to-blue-500/20">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-text-primary rounded-full transition-colors backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute -bottom-12 left-8 flex items-end">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-2xl bg-bg-card p-1 shadow-xl">
                                {member.avatar ? (
                                    <img src={member.avatar} alt={member.name} className="w-full h-full rounded-xl object-cover" />
                                ) : (
                                    <div className="w-full h-full rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary text-3xl font-bold">
                                        {member.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className={clsx(
                                "absolute -bottom-2 -right-2 p-1.5 rounded-full bg-bg-card border-4 border-bg-card",
                                member.role === 'owner' ? "text-amber-500" :
                                    member.role === 'head' ? "text-accent-primary" : "text-emerald-500"
                            )}>
                                {member.role === 'owner' ? <Shield size={16} fill="currentColor" /> :
                                    member.role === 'head' ? <Shield size={16} /> : <User size={16} />}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-16 px-8 pb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                                {member.name}
                                {member.role === 'owner' && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">Owner</span>}
                            </h2>
                            <div className="flex items-center gap-4 mt-1 text-sm text-text-muted">
                                <div className="flex items-center gap-1.5">
                                    <Mail size={14} />
                                    {member.email}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    Joined {member.joined_at ? format(new Date(member.joined_at), 'MMM yyyy') : 'Recently'}
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions or Status */}
                        <div className="flex gap-2">
                            {/* Placeholder for "Send Message" or similar */}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-6 mt-8 border-b border-border-subtle">
                        <button
                            onClick={() => handleTabChange('overview')}
                            className={clsx(
                                "pb-3 text-sm font-medium transition-colors relative",
                                activeTab === 'overview' ? "text-accent-primary" : "text-text-muted hover:text-text-primary"
                            )}
                        >
                            Overview
                            {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary rounded-t-full" />}
                        </button>

                        {(canManage || isMe) && (
                            <button
                                onClick={() => handleTabChange('settings')}
                                className={clsx(
                                    "pb-3 text-sm font-medium transition-colors relative",
                                    activeTab === 'settings' ? "text-accent-primary" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                Settings & Access
                                {activeTab === 'settings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-primary rounded-t-full" />}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-bg-app/50 p-8 min-h-[300px]">
                    {activeTab === 'overview' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-bg-card p-4 rounded-xl border border-border-subtle shadow-sm">
                                    <div className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Briefcase size={14} /> Active Tasks
                                    </div>
                                    <div className="text-2xl font-bold text-text-primary">{stats.pending}</div>
                                </div>
                                <div className="bg-bg-card p-4 rounded-xl border border-border-subtle shadow-sm">
                                    <div className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <CheckCircle size={14} /> Completed
                                    </div>
                                    <div className="text-2xl font-bold text-green-500">{stats.done}</div>
                                </div>
                                <div className="bg-bg-card p-4 rounded-xl border border-border-subtle shadow-sm">
                                    <div className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <BarChart2 size={14} /> Efficiency
                                    </div>
                                    <div className="text-2xl font-bold text-accent-primary">{stats.completionRate}%</div>
                                </div>
                            </div>

                            {/* Recent Activity (Placeholder) */}
                            <div className="bg-bg-card rounded-xl border border-border-subtle shadow-sm p-6">
                                <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                                    <Clock size={18} className="text-text-muted" /> Recent Activity
                                </h3>
                                <div className="text-center py-8 text-text-muted text-sm">
                                    No recent activity recorded for this member.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

                            {/* Role Management */}
                            <div className="bg-bg-card rounded-xl border border-border-subtle shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-border-subtle bg-bg-input/30 flex justify-between items-center">
                                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                                        <Shield size={16} className="text-accent-primary" /> Role & Permissions
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-text-primary">Workspace Role</p>
                                            <p className="text-xs text-text-muted mt-1">Determines access level and administrative capabilities.</p>
                                        </div>
                                        <select
                                            value={member.role}
                                            onChange={(e) => handleRoleChange(e.target.value)}
                                            disabled={!canManage || isMe || isSaving}
                                            className="input w-40 text-sm py-1.5"
                                        >
                                            <option value="member">Member</option>
                                            <option value="lead">Lead</option>
                                            <option value="head">Head</option>
                                            {/* Only Owners can make Owners */}
                                            {user?.role === 'owner' && <option value="owner">Owner</option>}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Manager / Reports To */}
                            <div className="bg-bg-card rounded-xl border border-border-subtle shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-border-subtle bg-bg-input/30 flex justify-between items-center">
                                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                                        <Users size={16} className="text-blue-500" /> Reporting Line
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-text-primary">Direct Manager</p>
                                            <p className="text-xs text-text-muted mt-1">Select who this member reports to directly.</p>
                                        </div>
                                        <select
                                            value={member.reportsTo || ''}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? null : e.target.value;
                                                useStore.getState().updateTeamMember(member.id, { reportsTo: val });
                                                toast.success('Reporting line updated');
                                            }}
                                            disabled={!canManage || isSaving}
                                            className="input w-48 text-sm py-1.5"
                                        >
                                            <option value="">-- No Manager --</option>
                                            {Object.values(team || {})
                                                .filter(m => m.id !== member.id) // Cannot report to self
                                                .filter(m => {
                                                    // Ensure user has permission to assign this manager
                                                    // OR if this person is ALREADY the manager, show them so the UI reflects reality.
                                                    if (m.id === member.reportsTo) return true;

                                                    return canAssignManager(user?.role || 'member', m.role);
                                                })
                                                .map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                            </div>



                            {/* AI Context */}
                            <div className="bg-bg-card rounded-xl border border-border-subtle shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-border-subtle bg-bg-input/30 flex justify-between items-center">
                                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                                        <Zap size={16} className="text-violet-500" /> AI Assistant Context
                                    </h3>
                                    <button
                                        onClick={handleSaveContext}
                                        disabled={isSaving || isLoadingContext}
                                        className="text-xs font-bold bg-violet-500/10 text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-500/20 transition-colors flex items-center gap-2"
                                    >
                                        <Save size={14} /> Save Context
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="mb-3">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Custom Instructions</label>
                                        <p className="text-xs text-text-muted mt-1 mb-3">
                                            These instructions help the AI understand this member's specific role, preferences, and priorities when processing tasks.
                                        </p>
                                    </div>
                                    <textarea
                                        value={contextValue}
                                        onChange={(e) => setContextValue(e.target.value)}
                                        disabled={isLoadingContext || isSaving || !canManage}
                                        className="input w-full min-h-[120px] resize-y text-sm font-mono leading-relaxed"
                                        placeholder={isLoadingContext ? "Loading context..." : "e.g., 'This user focuses on Graphic Design and prefers tasks with clear deadlines...'"}
                                    />
                                </div>
                            </div>

                            {/* Security Section (NEW) */}
                            <div className="bg-bg-card rounded-xl border border-border-subtle shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-border-subtle bg-bg-input/30 flex justify-between items-center">
                                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                                        <Lock size={16} className="text-blue-500" /> Security
                                    </h3>
                                </div>
                                <div className="p-6 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-text-primary text-sm">Password Reset</h4>
                                        <p className="text-xs text-text-muted mt-1">
                                            Send an email to {member.email} with instructions to reset their password.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleSendPasswordReset}
                                        disabled={isSaving}
                                        className="btn bg-white border border-border-subtle text-text-primary hover:bg-bg-input hover:border-border-strong shadow-sm text-xs font-semibold px-3 py-2"
                                    >
                                        Send Reset Email
                                    </button>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            {canManage && !isMe && (
                                <div className="bg-red-500/5 rounded-xl border border-red-500/20 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-red-500/10 bg-red-500/5 flex justify-between items-center">
                                        <h3 className="font-bold text-red-600 flex items-center gap-2">
                                            <AlertTriangle size={16} /> Danger Zone
                                        </h3>
                                    </div>
                                    <div className="p-6 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-text-primary text-sm">Remove from Team</h4>
                                            <p className="text-xs text-text-muted mt-1">
                                                Revokes access immediately. Assigned tasks will need to be reassigned.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleRemoveMember}
                                            disabled={isSaving}
                                            className="btn bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm"
                                        >
                                            {isSaving ? 'Processing...' : 'Remove Member'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}
