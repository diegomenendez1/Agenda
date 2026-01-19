import { useState, useEffect } from 'react';
import { X, Mail, Shield, AlertTriangle, Check, Loader2, Send } from 'lucide-react';
import { useStore } from '../core/store';
import clsx from 'clsx';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
    const { sendInvitation, user, team } = useStore();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member'); // Default role
    const [reportsTo, setReportsTo] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setEmail('');
            setRole('member');
            setReportsTo(user?.role === 'manager' ? user.id : ''); // Default Managers to report to self
            setErrorMsg(null);
            setIsSuccess(false);
        }
    }, [isOpen, user]);

    // Handle escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setIsSubmitting(true);

        try {
            // Validation
            if (!email || !email.includes('@')) {
                throw new Error("Please enter a valid email address.");
            }

            await sendInvitation(email, role, reportsTo);

            setIsSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1000);

        } catch (error: any) {
            console.error('Invitation failed:', error);

            // Audit Recommendation: Graceful Duplicate Handling using Code 23505
            if (error.code === '23505' || error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
                setErrorMsg("This user has already been invited.");
            } else {
                setErrorMsg(error.message || "Failed to send invitation. Please try again.");
            }

            setTimeout(() => setErrorMsg(null), 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-bg-card border border-border-subtle rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-bg-app/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-primary/10 rounded-lg text-accent-primary">
                            <Mail size={20} />
                        </div>
                        <div>
                            <h2 className="font-display font-semibold text-lg text-text-primary">
                                Invite Team Member
                            </h2>
                            <p className="text-xs text-text-muted">Add a new person to your organization</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-text-muted hover:text-text-primary hover:bg-bg-input p-2 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-center gap-3 text-sm animate-pulse">
                            <AlertTriangle size={16} />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Email Input */}
                    <div>
                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                autoFocus
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input w-full pl-10"
                                placeholder="colleague@company.com"
                                required
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                                <Mail size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                            <Shield size={12} /> Role / Permission
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                disabled={!['admin', 'owner', 'manager', 'coordinator'].includes(user?.role || '')}
                                className={clsx(
                                    "input w-full appearance-none",
                                    !['admin', 'owner', 'manager', 'coordinator'].includes(user?.role || '') && "opacity-50 cursor-not-allowed bg-bg-input/50"
                                )}
                            >
                                <option value="member">Member (Standard Access)</option>
                                {/* Manager can only invite Members/Coordinators. Admin/Owner can invite anyone. */}
                                {['admin', 'owner', 'manager'].includes(user?.role || '') && (
                                    <>
                                        {/* Managers can invite Coordinators */}
                                        <option value="coordinator">Coordinator (Sub-Manager)</option>

                                        {['admin', 'owner'].includes(user?.role || '') && (
                                            <>
                                                <option value="lead">Team Lead (Can Invite)</option>
                                                <option value="manager">Manager (Full Team Access)</option>
                                                <option value="admin">Admin (Global Settings)</option>
                                            </>
                                        )}
                                    </>
                                )}
                            </select>

                            {['admin', 'owner', 'manager', 'coordinator'].includes(user?.role || '') ? (
                                <p className="text-[10px] text-text-muted mt-1 px-1">
                                    <strong>Managers/Coordinators</strong> can see tasks of their direct reports.
                                </p>
                            ) : (
                                <div className="mt-2 flex items-start gap-2 text-amber-500 bg-amber-500/10 p-2 rounded-lg text-xs">
                                    <AlertTriangle size={12} className="mt-0.5" />
                                    <span>
                                        As a member, you can <strong>request</strong> to invite someone.
                                        An Admin must approve this request and assign the final role.
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reports To Selection (New for Delegation) */}
                    {['admin', 'owner', 'manager', 'coordinator'].includes(user?.role || '') && (
                        <div>
                            <label className="block text-xs uppercase text-text-muted font-bold tracking-wider mb-2 flex items-center gap-2">
                                <Shield size={12} /> Reports To (Manager)
                            </label>
                            <select
                                value={reportsTo}
                                onChange={(e) => setReportsTo(e.target.value)}
                                className="input w-full appearance-none"
                            >
                                <option value="">-- No Direct Manager --</option>
                                {Object.values(team || {})
                                    .filter(m => {
                                        // Filter rules:
                                        // 1. If I am Manager/Coordinator, I can only assign to MYSELF or my descendants
                                        if (user?.role === 'manager' || user?.role === 'coordinator') {
                                            return m.id === user.id;
                                        }
                                        return true; // Admin sees all
                                    })
                                    .map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} {m.id === user?.id ? '(You)' : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl font-medium text-text-muted hover:bg-bg-input hover:text-text-primary transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isSuccess}
                            className={clsx(
                                "relative px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 text-white",
                                isSuccess
                                    ? "bg-green-500 shadow-green-500/30"
                                    : "bg-accent-primary hover:bg-accent-primary/90 shadow-accent-primary/20",
                                (isSubmitting || !email) && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : isSuccess ? (
                                <>
                                    <Check size={18} />
                                    <span>Sent!</span>
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    <span>
                                        {['admin', 'owner', 'manager', 'coordinator'].includes(user?.role || '') ? 'Send Invitation' : 'Request Access'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
