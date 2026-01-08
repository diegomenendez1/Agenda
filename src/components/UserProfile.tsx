import { useState, useEffect } from 'react';
import { useStore } from '../core/store';
import { User, Palette, Save } from 'lucide-react';
import { clsx } from 'clsx';

export function UserProfile() {
    const { user, updateUserProfile } = useStore();
    const [name, setName] = useState('');
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [aiContext, setAiContext] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setTheme(user.preferences?.theme || 'system');
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
                theme,
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

                    {/* AI Assistant Context - Restricted to Admin/Owner */}
                    {(user?.role === 'owner' || user?.role === 'admin') && (
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

                    {(user?.role === 'owner' || user?.role === 'admin') && <div className="h-px bg-border-subtle" />}

                    {/* Preferences Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            <Palette size={18} />
                            Appearance
                        </h3>
                        <div className="grid grid-cols-3 gap-3 max-w-md">
                            {(['light', 'dark', 'system'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTheme(t)}
                                    className={clsx(
                                        "px-4 py-3 rounded-xl border text-sm font-medium transition-all capitalize flex flex-col items-center gap-2",
                                        theme === t
                                            ? "bg-accent-primary/5 border-accent-primary text-accent-primary ring-1 ring-accent-primary"
                                            : "bg-bg-input border-border-subtle text-text-muted hover:bg-bg-surface hover:text-text-primary"
                                    )}
                                >
                                    {/* Simple icons for themes could go here */}
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

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
