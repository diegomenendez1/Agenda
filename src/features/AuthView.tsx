import { useState } from 'react';
import { supabase } from '../core/supabase';
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';


export function AuthView() {
    const [isLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);

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
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
                            preferences: {
                                theme: 'system',
                                autoPrioritize: true
                            }
                        },
                    },
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-bg-app relative overflow-hidden selection:bg-accent-primary/20 selection:text-accent-primary">
            {/* Extended Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-accent-primary/10 rounded-full blur-[120px] pointer-events-none opacity-60 animate-pulse" />
            <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

            <div className="w-full max-w-[420px] p-8 md:p-10 glass-panel rounded-3xl relative z-10 animate-in fade-in zoom-in-95 duration-700 slide-in-from-bottom-4 shadow-2xl ring-1 ring-white/40 dark:ring-white/5">
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/25 mb-5 rotate-3 hover:rotate-6 transition-transform duration-500">
                        <Sparkles className="text-white w-7 h-7" />
                    </div>
                    <h1 className="text-3xl font-display font-bold tracking-tight text-text-primary mb-2">Welcome Back</h1>
                    <p className="text-text-muted text-[15px] max-w-[280px]">Enter your credentials to access your Cortex workspace.</p>
                </div>

                <form onSubmit={handleAuth} className="flex flex-col gap-5">
                    {!isLogin && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted ml-0.5">Full Name</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="input pl-11 py-3"
                                    placeholder="Jane Doe"
                                    required={!isLogin}
                                />
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors">
                                    <Mail size={18} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted ml-0.5">Email Address</label>
                        <div className="relative group">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input pl-11 py-3"
                                placeholder="name@company.com"
                                required
                            />
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors">
                                <Mail size={18} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted ml-0.5">Password</label>
                            {isLogin && (
                                <a href="#" className="text-xs text-accent-primary hover:text-accent-secondary font-medium hover:underline">Forgot password?</a>
                            )}
                        </div>
                        <div className="relative group">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input pl-11 py-3"
                                placeholder="••••••••"
                                required
                            />
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors">
                                <Lock size={18} />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                            <div className="mt-0.5 text-xs font-bold uppercase shrink-0">Error</div>
                            <div>{error}</div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-3.5 mt-2 text-[15px] font-semibold tracking-wide relative overflow-hidden group rounded-xl shadow-lg shadow-accent-primary/25 hover:shadow-accent-primary/40 transition-all"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    {/* Public sign-up disabled to enforce Admin-only user creation */}
                </div>
            </div>

            <div className="absolute bottom-6 text-center w-full text-xs text-text-muted font-medium opacity-60">
                &copy; 2024 Cortex Systems Inc. All rights reserved.
            </div>
        </div >
    );
}
