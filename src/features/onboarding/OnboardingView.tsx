
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
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg-app text-text-primary p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="max-w-[440px] w-full animate-enter">
                <div className="bg-bg-card rounded-[2rem] shadow-2xl border border-border-subtle p-10 relative overflow-hidden">
                    <div className="flex flex-col items-center text-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
                            <Building2 className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-display font-bold tracking-tight mb-3">
                            Let's build your workspace
                        </h1>
                        <p className="text-text-muted text-base font-medium max-w-sm">
                            Organize your life and team with the power of AI. Choose how you want to start.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {/* Invitation Notice (If any) */}
                        {activeInvitations.length > 0 && (
                            <div className="p-1.5 bg-accent-primary/5 rounded-2xl border border-accent-primary/10">
                                {activeInvitations.map((invite) => (
                                    <div key={invite.id} className="flex items-center justify-between p-4 bg-bg-card rounded-xl border border-border-subtle shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-accent-primary uppercase tracking-widest leading-none mb-1">Invitation</span>
                                            <span className="text-sm font-bold text-text-primary">Join {invite.organizationName}</span>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    await acceptInvitation(invite.token || '', user?.id || '');
                                                    toast.success("Joined team!");
                                                } catch (e: any) {
                                                    toast.error("Failed to join.");
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className="px-4 py-2 bg-accent-primary text-white hover:brightness-110 rounded-lg text-xs font-bold transition-all shadow-md shadow-accent-primary/20"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-text-muted ml-1">
                                    New Workspace Name
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-bg-app border border-border-subtle rounded-2xl px-5 py-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 border-border-highlight/30 transition-all placeholder:text-text-secondary/30 font-semibold"
                                        placeholder="e.g. Acme Studio"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !name}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        Create Workspace
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        {myWorkspaces.length > 0 && (
                            <div className="pt-6 border-t border-border-subtle">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4 ml-1">Or switch to existing</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {myWorkspaces.map((ws) => (
                                        <button
                                            key={ws.id}
                                            onClick={() => handleSwitch(ws.id)}
                                            disabled={loading}
                                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-bg-app border border-border-subtle hover:border-accent-primary/40 hover:bg-accent-primary/5 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-bg-card border border-border-subtle flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                                                    <Building2 size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-sm font-bold text-text-primary capitalize">{ws.name}</div>
                                                    <div className="text-[10px] text-text-muted uppercase font-extrabold tracking-widest opacity-60 leading-none">{ws.role}</div>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-8 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-text-muted/40">
                    <span>AGENDA CO. v1.0</span>
                    <button
                        onClick={() => useStore.getState().initialize()}
                        className="hover:text-accent-primary transition-colors underline"
                    >
                        Sync Data
                    </button>
                </div>
            </div>
        </div>
    );
}
