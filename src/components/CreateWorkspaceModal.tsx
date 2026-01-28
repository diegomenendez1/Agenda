import { useState } from 'react';
import { useStore } from '../core/store';
import { Building2, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
    const { createOrganization } = useStore();
    const [orgName, setOrgName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgName.trim()) return;

        setIsSubmitting(true);
        try {
            // 1. Create the organization
            // Note: Currently createOrganization implementation in store just calls RPC `create_new_organization`.
            // We need to modify store to return the ID or we can fetchWorkspaces and switch to the newest one.
            await createOrganization(orgName);

            toast.success("Workspace created effectively!");

            // 2. Refresh workspaces list
            // Store's createOrganization calls initialize(), which calls fetchWorkspaces().
            // However, to be safe and get the ID of the new one to switch to it:
            // Usually `create_new_organization` returns the ID. Store doesn't expose it yet.
            // We'll rely on the store refresh and find the new one.

            // wait a bit for store to refresh (it's async inside createOrganization)
            // But simplify for now: just close and let them switch.
            // Or better: Reload page to force full sync as we do in switchWorkspace

            onClose();
            setOrgName('');

            // Optional: Prompt to switch? 
            // window.location.reload(); 

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create workspace");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border-subtle overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-bg-input/20">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                            <Building2 className="text-accent-primary" size={24} />
                            Create Workspace
                        </h2>
                        <p className="text-xs text-text-muted mt-1">Start a new isolated environment for your team.</p>
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-text-primary mb-2">Workspace Name</label>
                        <input
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            placeholder="e.g. Acme Corp Marketing"
                            className="input w-full py-2.5 text-base"
                            autoFocus
                        />
                        <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
                            This will create a new organization where you are the Owner. Data is completely isolated from your other workspaces.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-input transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!orgName.trim() || isSubmitting}
                            className="btn btn-primary px-5 py-2 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                            ) : (
                                <Check size={16} />
                            )}
                            {isSubmitting ? 'Creating...' : 'Create Workspace'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
