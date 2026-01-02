import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useStore } from '../core/store';
import { Shield, Crown, Search, UserPlus, X, Loader2 } from 'lucide-react';
import { supabase } from '../core/supabase';
import clsx from 'clsx';

export function AdminView() {
    const { user } = useStore();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);

    // Create User Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPass, setNewUserPass] = useState('');
    const [newName, setNewName] = useState('');
    const [creatingUser, setCreatingUser] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data } = await supabase.from('profiles').select('*');
        if (data) setUsers(data);
        setLoading(false);
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdating(userId);
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId);

        // Optimistic update
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setUpdating(null);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingUser(true);
        setCreateError(null);
        setCreateSuccess(null);

        try {
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            const { data, error } = await tempClient.auth.signUp({
                email: newUserEmail,
                password: newUserPass,
                options: {
                    data: {
                        full_name: newName,
                        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=random`,
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                setCreateSuccess(`User created! ID: ${data.user.id}`);
                setNewUserEmail('');
                setNewUserPass('');
                setNewName('');
                fetchUsers();

                setTimeout(() => {
                    setIsCreateModalOpen(false);
                    setCreateSuccess(null);
                }, 1500);
            }

        } catch (err: any) {
            setCreateError(err.message);
        } finally {
            setCreatingUser(false);
        }
    };

    if (user?.role !== 'owner') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
                <Shield className="w-16 h-16 mb-4 opacity-20" />
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p>This panel is restricted to the workspace owner.</p>
            </div>
        );
    }

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-8 max-w-5xl mx-auto w-full">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg shadow-orange-500/20">
                        <Crown className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Admin Console</h1>
                        <p className="text-text-muted text-base">Manage workspace members and permissions</p>
                    </div>
                </div>
            </header>

            <div className="glass-panel rounded-xl overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="input pl-9 bg-bg-app/50 border-transparent focus:bg-bg-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="btn btn-primary flex items-center gap-2 text-base py-1.5 px-3"
                        >
                            <UserPlus size={18} />
                            <span>Add User</span>
                        </button>
                        <div className="flex items-center gap-2 text-sm text-text-muted border-l border-white/10 pl-4">
                            <div className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">Owner</div>
                            <div className="px-2 py-1 rounded bg-violet-500/10 text-violet-500 border border-violet-500/20 font-medium">Admin</div>
                            <div className="px-2 py-1 rounded bg-zinc-800 border border-white/10 font-medium">User</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-base">
                        <thead className="bg-white/5 text-text-muted font-medium sticky top-0 backdrop-blur-md">
                            <tr>
                                <th className="p-4 pl-6">User</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4 text-right pr-6">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-text-muted">Loading users...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-text-muted">No users found</td></tr>
                            ) : (
                                filteredUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || 'U')}&background=random`}
                                                    className="w-8 h-8 rounded-full bg-bg-card"
                                                />
                                                <span className="font-medium text-text-primary">{u.full_name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-text-secondary">{u.email}</td>
                                        <td className="p-4">
                                            <select
                                                className={clsx(
                                                    "bg-transparent border border-transparent rounded px-2 py-1 outline-none text-sm font-semibold cursor-pointer transition-all",
                                                    "hover:bg-black/20 hover:border-white/10 focus:bg-black/40 focus:border-accent-primary",
                                                    u.role === 'owner' ? "text-amber-400" :
                                                        u.role === 'admin' ? "text-violet-400" :
                                                            "text-text-muted"
                                                )}
                                                value={u.role || 'user'}
                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                disabled={updating === u.id}
                                            >
                                                <option value="user" className="bg-bg-card text-text-muted">User</option>
                                                <option value="admin" className="bg-bg-card text-violet-400">Admin</option>
                                                <option value="owner" className="bg-bg-card text-amber-400">Owner</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-right pr-6 text-text-muted text-sm">
                                            {new Date(u.updated_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-md rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-accent-primary" />
                                Create New User
                            </h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-text-muted hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-text-muted uppercase">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full"
                                    placeholder="Jane Doe"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-text-muted uppercase">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="input w-full"
                                    placeholder="jane@example.com"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-text-muted uppercase">Temporary Password</label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full font-mono"
                                    placeholder="Secret.123"
                                    value={newUserPass}
                                    onChange={(e) => setNewUserPass(e.target.value)}
                                />
                                <p className="text-xs text-text-muted">Must be at least 6 characters.</p>
                            </div>

                            {createError && (
                                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {createError}
                                </div>
                            )}

                            {createSuccess && (
                                <div className="p-3 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                                    {createSuccess}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingUser}
                                    className="btn btn-primary min-w-[100px]"
                                >
                                    {creatingUser ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
