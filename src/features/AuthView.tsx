import { useState } from 'react';
import { supabase } from '../core/supabase';
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export function AuthView() {
    const [isLogin, setIsLogin] = useState(true);
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
        <div className="min-h-screen w-full flex items-center justify-center bg-bg-app relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.05] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md p-8 glass-panel rounded-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-4">
                        <Sparkles className="text-white w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Cortex AI</h1>
                    <p className="text-text-muted text-sm mt-1">Intelligence for your daily workflow</p>
                </div>

                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                    {!isLogin && (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-text-muted ml-1">Full Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="input pl-10"
                                    placeholder="John Doe"
                                    required={!isLogin}
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                    <Mail size={16} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-text-muted ml-1">Email</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input pl-10"
                                placeholder="name@company.com"
                                required
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                <Mail size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-text-muted ml-1">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input pl-10"
                                placeholder="••••••••"
                                required
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                <Lock size={16} />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-3 mt-2 text-base relative overflow-hidden group"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={16} />
                                </span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(null); }}
                        className="text-text-muted hover:text-accent-primary transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
}
