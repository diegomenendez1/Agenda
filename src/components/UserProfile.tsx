import React, { useState, useEffect } from 'react';
import { useStore } from '../core/store';
import { User, Shield, Palette, Save } from 'lucide-react';
import { clsx } from 'clsx';

export function UserProfile() {
    const { user, updateUserProfile } = useStore();
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setRole(user.role);
            setTheme(user.preferences?.theme || 'dark');
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        await updateUserProfile({
            ...user,
            name,
            role,
            preferences: {
                ...user.preferences,
                theme
            }
        });
        // Could add toast notification here
    };

    if (!user) return <div className="p-8 text-center text-text-muted">Loading profile...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-2">Profile & Settings</h1>
            <p className="text-text-secondary mb-8">Manage your identity and assistant preferences.</p>

            <div className="glass-panel p-6 rounded-2xl space-y-8">

                {/* Identity Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <User className="text-accent-primary" size={20} />
                        Identity
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">Role / Context</label>
                            <input
                                type="text"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                placeholder="e.g. Senior Developer"
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border-subtle" />

                {/* Preferences Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Palette className="text-accent-primary" size={20} />
                        Appearance
                    </h2>
                    <div className="flex gap-4">
                        {(['light', 'dark', 'system'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTheme(t)}
                                className={clsx(
                                    "px-4 py-2 rounded-lg border transition-all capitalize",
                                    theme === t
                                        ? "bg-accent-primary text-white border-accent-primary"
                                        : "bg-bg-input border-border-subtle text-text-muted hover:text-text-primary"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="btn btn-primary px-6"
                    >
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
