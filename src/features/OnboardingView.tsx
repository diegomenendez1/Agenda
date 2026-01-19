
import { useState } from 'react';
import { useStore } from '../core/store'; // Correct path
import { Building2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function OnboardingView() {
    const { createOrganization, user, activeInvitations, acceptInvitation } = useStore();
    const [name, setName] = useState(`${user?.name || 'My'}'s Workspace`);
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await createOrganization(name);
            toast.success("Workspace created successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to create workspace.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-bg-app text-text-primary p-4">
            <div className="max-w-md w-full bg-bg-secondary rounded-2xl shadow-xl border border-white/5 p-8 relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                        <Building2 className="w-8 h-8" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center mb-2">Welcome to Agenda</h1>
                <p className="text-text-secondary text-center mb-8">
                    To get started, create a new workspace for your team tasks and projects.
                </p>

                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                            Workspace Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-bg-app border border-white/10 rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-text-secondary/50"
                            placeholder="e.g. Acme Corp"
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !name}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Create Workspace
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    {/* Pending Invitations Section */}
                    {activeInvitations && activeInvitations.length > 0 && (
                        <div className="pt-6 border-t border-white/10 mt-6">
                            <h3 className="text-sm font-semibold text-text-primary mb-3">Pending Invitations</h3>
                            <div className="space-y-2">
                                {activeInvitations.map((invite) => (
                                    <div key={invite.id} className="bg-bg-app p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-sm text-text-primary">
                                                {invite.teamId !== 'default-team' ? 'Join Team' : 'Invitation'}
                                            </div>
                                            <div className="text-xs text-text-secondary">
                                                From: {invite.invitedBy || 'Admin'}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    await acceptInvitation(invite.token, user?.id || '');
                                                    toast.success("Joined team successfully!");
                                                } catch (e) {
                                                    console.error(e);
                                                    toast.error("Failed to accept invitation");
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className="px-3 py-1.5 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
