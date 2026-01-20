import { useState, useEffect } from 'react';
import { useStore } from '../core/store';
import { User, Palette, Save, Users, Check, X } from 'lucide-react';
import { supabase } from '../core/supabase';
import { clsx } from 'clsx';

export function UserProfile() {
    const { user, updateUserProfile } = useStore();
    const [name, setName] = useState('');

    const [aiContext, setAiContext] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setAiContext(user.preferences?.aiContext || '');
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        await updateUserProfile({
            ...user,
            name,
            // Role is preserved from the existing user object, not editable here
            preferences: {
                ...user.preferences,
                theme: 'light',
                aiContext
            }
        });
    };

    if (!user) return <div className="p-8 text-center text-text-muted">Loading profile...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
            <p className="text-text-secondary mb-8">Manage your personal information and application preferences.</p>

            <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">

                {/* Header / Avatar Section */}
                <div className="p-8 border-b border-border-subtle flex flex-col md:flex-row items-center gap-6 bg-bg-surface/50">
                    <div className="w-24 h-24 rounded-full bg-accent-secondary/10 ring-4 ring-bg-surface flex items-center justify-center text-4xl shadow-inner">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User className="text-accent-secondary w-10 h-10" />
                        )}
                    </div>
                    <div className="text-center md:text-left space-y-1">
                        <h2 className="text-xl font-bold text-text-primary">{user.name}</h2>
                        <p className="text-text-muted text-sm">{user.email}</p>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Team Invitations Section */}
                    <TeamInvitations />

                    {/* Identity Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input w-full bg-bg-input focus:bg-bg-card transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">Email Address</label>
                                <input
                                    type="email"
                                    value={user.email}
                                    disabled
                                    className="input w-full bg-bg-surface text-text-muted border-transparent cursor-not-allowed opacity-70"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border-subtle" />

                    {/* AI Assistant Context - Restricted to Head/Owner */}
                    {(user?.role === 'owner' || user?.role === 'head') && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-text-primary">AI Assistant Context</h3>
                            </div>
                            <p className="text-sm text-text-secondary">
                                Define your team's focus, your role, or any specific instructions for the AI when processing tasks.
                                This helps filter noise and prioritize what matters.
                            </p>
                            <textarea
                                value={aiContext}
                                onChange={(e) => setAiContext(e.target.value)}
                                className="input w-full min-h-[120px] resize-y text-sm leading-relaxed"
                                placeholder="Example: I am a Project Manager. Focus on high-priority tasks and team blockers. Filter out generic newsletters. My key goals are 'Q1 Launch' and 'Process Optimization'."
                            />
                        </div>
                    )}

                    {(user?.role === 'owner' || user?.role === 'head') && <div className="h-px bg-border-subtle" />}

                    {/* (Appearance section removed) */}

                    <div className="pt-8 flex justify-end border-t border-border-subtle mt-8">
                        <button
                            onClick={handleSave}
                            className="btn btn-primary px-8 py-2.5 shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30 transition-all active:scale-95"
                        >
                            <Save size={18} className="mr-2" />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TeamInvitations() {
    const { user } = useStore();
    const [invites, setInvites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchInvites();
    }, [user]);

    const fetchInvites = async () => {
        const { data } = await supabase
            .from('team_memberships')
            .select(`
                id,
                status,
                manager:manager_id (full_name, avatar_url, email)
            `)
            .eq('member_id', user?.id)
            .eq('status', 'pending');

        if (data) setInvites(data);
        setLoading(false);
    };

    const handleRespond = async (id: string, accept: boolean) => {
        try {
            const { error } = await supabase.rpc('respond_to_team_invite', {
                membership_id: id,
                accept
            });
            if (error) throw error;

            // Remove from list
            setInvites(invites.filter(i => i.id !== id));

            // If accepted, maybe reload window or team store? 
            // Ideally we initiate a store refresh for 'team'
            if (accept) {
                // simple reload for now
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            alert('Error processing response');
        }
    };

    if (loading || invites.length === 0) return null;

    return (
        <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-sm font-bold text-accent-primary flex items-center gap-2 mb-3">
                <Users size={16} />
                Team Invitations
            </h3>
            <div className="space-y-3">
                {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between bg-bg-card p-3 rounded-lg border border-border-subtle shadow-sm">
                        <div className="flex items-center gap-3">
                            <img
                                src={invite.manager.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(invite.manager.full_name)}&background=random`}
                                className="w-8 h-8 rounded-full bg-bg-input"
                            />
                            <div>
                                <p className="text-sm font-medium text-text-primary">
                                    <span className="font-bold">{invite.manager.full_name}</span> invites you to join their team.
                                </p>
                                <p className="text-xs text-text-muted">Lead • {invite.manager.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleRespond(invite.id, false)}
                                className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Decline"
                            >
                                <X size={16} />
                            </button>
                            <button
                                onClick={() => handleRespond(invite.id, true)}
                                className="px-3 py-1.5 bg-accent-primary text-white text-xs font-bold rounded-lg shadow-md shadow-accent-primary/20 hover:bg-accent-primary-hover transition-all flex items-center gap-1.5"
                            >
                                <Check size={14} />
                                Accept
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
