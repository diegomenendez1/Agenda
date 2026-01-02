import { useState } from 'react';
import { useStore } from '../core/store';
import { User, Camera, Save, Mail, Shield } from 'lucide-react';
import { supabase } from '../core/supabase';

export function SettingsView() {
    const { user, updateUserProfile } = useStore();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setMessage(null);

        try {
            // Update Supabase Auth Meta (optional but good for consistency)
            await supabase.auth.updateUser({ data: { full_name: name } });

            // Update Profiles Table
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: name })
                .eq('id', user.id);

            if (error) throw error;

            // Update Local Store
            updateUserProfile({ ...user, name });
            setMessage('Profile updated successfully!');
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            console.error(err);
            setMessage(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 max-w-2xl mx-auto w-full">
            <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

            <div className="glass-panel p-8 rounded-xl space-y-8">

                {/* Profile Picture Section (Visual Only for now) */}
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-bg-card border-2 border-border-subtle group-hover:border-accent-primary transition-colors">
                            <img
                                src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <button className="absolute bottom-0 right-0 p-2 rounded-full bg-accent-primary text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-1/4 translate-x-1/4">
                            <Camera size={16} />
                        </button>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">{name || 'Your Name'}</h2>
                        <p className="text-text-muted text-sm">{user?.email}</p>
                        <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-text-muted">
                            <Shield size={12} />
                            <span className="capitalize">{user?.role || 'User'}</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Display Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input w-full pl-10"
                                placeholder="Enter your full name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
                        <div className="relative opacity-50 cursor-not-allowed">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="input w-full pl-10 bg-bg-app"
                            />
                        </div>
                        <p className="text-xs text-text-muted mt-2">Email cannot be changed efficiently in this demo.</p>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        {message && (
                            <span className={`text-sm ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                                {message}
                            </span>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary ml-auto flex items-center gap-2"
                        >
                            <Save size={16} />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
