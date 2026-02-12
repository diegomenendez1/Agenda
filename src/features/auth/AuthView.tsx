import { useState, useEffect } from 'react';
import { useStore } from '../../core/store';
import { supabase } from '../../core/supabase';
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export function AuthView() {
    const { validateInvitation, acceptInvitation } = useStore();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [inviteToken, setInviteToken] = useState<string | null>(null);
    const [isInviteValid, setIsInviteValid] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (token) {
            setInviteToken(token);
            setIsLogin(false); // Force Sign Up
            validateInvitation(token).then((invite) => {
                if (invite) {
                    setEmail(invite.email);
                    setIsInviteValid(true);
                } else {
                    setError('Invalid or expired invitation link.');
                }
            }).catch(() => setError('Failed to validate invitation.'));
        }
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
                            preferences: {
                                theme: 'light',
                                autoPrioritize: true
                            }
                        },
                    },
                });

                if (signUpError) throw signUpError;

                // Handle Invite Acceptance
                if (inviteToken && isInviteValid && authData.user) {
                    try {
                        await acceptInvitation(inviteToken, authData.user.id);
                    } catch (invErr) {
                        console.error("Failed to accept invitation linkage:", invErr);
                        // Don't block sign-up, but warn. Role might need manual fix.
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-bg-app relative overflow-hidden">
            {/* Subtle Textured Background - Matching App Cleanliness */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            <div className="w-full max-w-[400px] p-8 md:p-10 bg-bg-card border border-border-subtle rounded-2xl shadow-xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center mb-4">
                        <Sparkles className="text-accent-primary w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-text-primary mb-2">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-text-secondary text-sm">
                        Enter your credentials to access your workspace.
                    </p>
                </div>

                <form onSubmit={handleAuth} className="flex flex-col gap-5">
                    {!isLogin && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide ml-1">Full Name</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="input pl-11"
                                    placeholder="Jane Doe"
                                    required={!isLogin}
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors">
                                    <Mail size={16} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide ml-1">Email Address</label>
                        <div className="relative group">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input pl-11"
                                placeholder="name@company.com"
                                required
                                disabled={isInviteValid}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors">
                                <Mail size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide ml-1">Password</label>
                        </div>
                        <div className="relative group">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input pl-11"
                                placeholder="••••••••"
                                required
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors">
                                <Lock size={16} />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-100 text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                            <div className="w-1 h-4 bg-red-500 rounded-full" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-3 mt-2 rounded-lg justify-center group"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Create Account'}
                                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-border-subtle pt-6">
                    <p className="text-sm text-text-muted">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(null); }}
                            className="text-accent-primary hover:text-accent-secondary font-semibold hover:underline transition-all"
                        >
                            {isLogin ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>

            <div className="absolute bottom-6 text-center w-full text-xs text-text-muted opacity-50">
                &copy; {new Date().getFullYear()} Cortex Systems. All rights reserved.
            </div>
        </div>
    );
}
