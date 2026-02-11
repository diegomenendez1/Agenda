
import { useState } from 'react';
import { useStore } from '../../core/store'; // Correct path
import { Building2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function OnboardingView() {
    const { createOrganization, user, activeInvitations, myWorkspaces, acceptInvitation, switchWorkspace } = useStore();
    const [name, setName] = useState(`${user?.name || 'My'}'s Workspace`);
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await createOrganization(name);
            toast.success("Workspace created successfully!");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create workspace.");
        } finally {
            setLoading(false);
        }
    };

    const handleSwitch = async (orgId: string) => {
        setLoading(true);
        try {
            await switchWorkspace(orgId);
            toast.success("Switched workspace successfully!");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to switch workspace.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-app text-text-primary p-4 gap-4">
            <div className="max-w-md w-full bg-bg-card rounded-2xl shadow-xl border border-border-subtle p-8 relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-accent-primary/10 rounded-2xl flex items-center justify-center text-accent-primary">
                        <Building2 className="w-8 h-8" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center mb-2">Welcome to Agenda</h1>
                <p className="text-text-secondary text-sm text-center mb-8">
                    To get started, create a new workspace or select an existing one.
                </p>

                <div className="space-y-6">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-text-muted">
                                Workspace Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-bg-app border border-border-subtle rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all placeholder:text-text-secondary/50 font-medium"
                                placeholder="e.g. Acme Corp"
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !name}
                            className="w-full bg-accent-primary hover:brightness-110 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-accent-primary/25"
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
                    </form>

                    {/* Existing Workspaces Section */}
                    {myWorkspaces.length > 0 && (
                        <div className="pt-6 border-t border-border-subtle">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Your Workspaces</h3>
                            <div className="space-y-2">
                                {myWorkspaces.map((ws) => (
                                    <button
                                        key={ws.id}
                                        type="button"
                                        onClick={() => handleSwitch(ws.id)}
                                        disabled={loading}
                                        className="w-full flex items-center justify-between p-3.5 rounded-xl bg-bg-app border border-border-subtle hover:border-accent-primary/50 hover:bg-accent-primary/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-bg-card border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-accent-primary transition-colors shadow-sm">
                                                <Building2 size={18} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-bold text-text-primary capitalize">{ws.name}</div>
                                                <div className="text-[10px] text-text-muted uppercase font-bold tracking-tight">{ws.role}</div>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending Invitations Section */}
                    {activeInvitations.length > 0 && (
                        <div className="pt-6 border-t border-border-subtle">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Pending Invitations</h3>
                            <div className="space-y-2">
                                {activeInvitations.map((invite) => (
                                    <div key={invite.id} className="bg-bg-app p-4 rounded-xl border border-border-subtle flex items-center justify-between">
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-text-primary truncate">
                                                Join <span className="text-accent-primary">{invite.organizationName || 'a new workspace'}</span>
                                            </div>
                                            <div className="text-[11px] text-text-muted font-medium mt-0.5">
                                                Invited by {invite.inviterName || 'Manager'} • {invite.role}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    await acceptInvitation(invite.token || '', user?.id || '');
                                                    toast.success("Joined team successfully!");
                                                } catch (e: any) {
                                                    console.error(e);
                                                    toast.error(e.message || "Failed to accept invitation");
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className="ml-4 px-4 py-2 bg-accent-primary text-white hover:brightness-110 rounded-lg text-xs font-bold transition-all shadow-sm shadow-accent-primary/20"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Debug Info Footer */}
            <div className="text-[10px] text-text-muted/40 font-mono flex gap-4">
                <span>User ID: {user?.id?.slice(0, 8)}...</span>
                <span>Active Org: {user?.organizationId ? user.organizationId.slice(0, 8) + '...' : 'NONE'}</span>
                <button
                    onClick={() => useStore.getState().initialize()}
                    className="hover:text-text-muted transition-colors underline underline-offset-2"
                >
                    Force Sync
                </button>
            </div>
        </div>
    );
}
