import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useStore } from '../core/store';
import { Shield, Crown, Search, UserPlus, X, Loader2, Trash2, ShieldCheck, User, Bot, Key, Lock, Mail, Users } from 'lucide-react';
import { supabase } from '../core/supabase';
import clsx from 'clsx';
import { format } from 'date-fns';

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

    // Delete User State
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // AI Context Modal State
    const [isContextModalOpen, setIsContextModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [contextValue, setContextValue] = useState('');
    const [savingContext, setSavingContext] = useState(false);

    // Security Modal State
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [securityUser, setSecurityUser] = useState<any>(null);
    const [manualPassword, setManualPassword] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);
    const [sendingResetEmail, setSendingResetEmail] = useState(false);
    const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenSecurityModal = (u: any) => {
        setSecurityUser(u);
        setManualPassword('');
        setSecurityMessage(null);
        setIsSecurityModalOpen(true);
    };

    const handleSendResetEmail = async () => {
        if (!securityUser?.email) return;
        setSendingResetEmail(true);
        setSecurityMessage(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(securityUser.email, {
                redirectTo: window.location.origin + '/reset-password', // Ensure you have this route or handled
            });
            if (error) throw error;
            setSecurityMessage({ type: 'success', text: `Reset email sent to ${securityUser.email}` });
        } catch (err: any) {
            setSecurityMessage({ type: 'error', text: err.message });
        } finally {
            setSendingResetEmail(false);
        }
    };

    const handleManualReset = async () => {
        if (!manualPassword || manualPassword.length < 6) {
            setSecurityMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }
        if (!confirm(`Are you sure you want to forcefully overwrite the password for ${securityUser.full_name}?`)) return;

        setResettingPassword(true);
        setSecurityMessage(null);
        try {
            const { error } = await supabase.rpc('admin_reset_password_by_owner', {
                target_user_id: securityUser.id,
                new_password: manualPassword
            });

            if (error) throw error;
            setSecurityMessage({ type: 'success', text: 'Password successfully changed.' });
            setManualPassword('');
        } catch (err: any) {
            console.error(err);
            setSecurityMessage({ type: 'error', text: 'Failed to reset: ' + err.message });
        } finally {
            setResettingPassword(false);
        }
    };

    const handleInviteToTeam = async (targetId: string, targetName: string) => {
        if (!confirm(`Invite ${targetName} to join your team?`)) return;

        try {
            const { error } = await supabase.rpc('invite_user_to_team', {
                target_user_id: targetId
            });

            if (error) throw error;
            alert(`Invitation sent to ${targetName}`);
        } catch (err: any) {
            console.error(err);
            alert('Failed to invite: ' + err.message);
        }
    };

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

    const handleOpenContextModal = (u: any) => {
        setSelectedUser(u);
        setContextValue(u.preferences?.aiContext || '');
        setIsContextModalOpen(true);
    };

    const handleSaveContext = async () => {
        if (!selectedUser) return;
        setSavingContext(true);
        try {
            const updatedPreferences = {
                ...(selectedUser.preferences || {}),
                aiContext: contextValue
            };

            const { error } = await supabase
                .from('profiles')
                .update({ preferences: updatedPreferences })
                .eq('id', selectedUser.id);

            if (error) throw error;

            // Optimistic update
            setUsers(users.map(u => u.id === selectedUser.id ? { ...u, preferences: updatedPreferences } : u));
            setIsContextModalOpen(false);
        } catch (err: any) {
            console.error(err);
            alert('Failed to save context: ' + err.message);
        } finally {
            setSavingContext(false);
        }
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

    const handleDeleteUser = async (targetId: string, targetName: string) => {
        if (!confirm(`Are you sure you want to delete user "${targetName}"? This action cannot be undone.`)) {
            return;
        }

        setDeletingId(targetId);
        try {
            const { error } = await supabase.rpc('delete_user_by_admin', {
                target_user_id: targetId
            });

            if (error) throw error;

            // Remove from local state
            setUsers(users.filter(u => u.id !== targetId));

        } catch (err: any) {
            console.error('Error deleting user:', err);
            alert('Failed to delete user: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    if (user?.role !== 'owner' && user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-text-muted bg-bg-app">
                <div className="w-24 h-24 bg-bg-card rounded-2xl flex items-center justify-center shadow-lg border border-border-subtle mb-6">
                    <Shield className="w-12 h-12 text-text-muted/50" />
                </div>
                <h2 className="text-2xl font-display font-bold text-text-primary mb-2">Access Denied</h2>
                <p className="text-text-secondary">This panel is restricted to workspace administrators.</p>
            </div>
        );
    }

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-8 max-w-6xl mx-auto w-full bg-bg-app">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-display font-bold flex items-center gap-3 tracking-tight text-text-primary mb-2">
                        <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center shadow-inner">
                            <Crown className="w-6 h-6 text-accent-primary" />
                        </div>
                        Admin Console
                    </h1>
                    <p className="text-text-muted text-lg font-light ml-1">
                        Manage workspace members, roles, and security settings.
                    </p>
                </div>
            </header>

            <div className="glass-panel rounded-2xl overflow-hidden flex-1 flex flex-col border border-border-subtle shadow-xl shadow-accent-primary/5">
                {/* Toolbar */}
                <div className="p-5 border-b border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 bg-bg-card/50">
                    <div className="relative flex-1 w-full max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="input pl-10 w-full bg-bg-input border-transparent focus:bg-bg-card transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="btn btn-primary shadow-lg shadow-accent-primary/20 flex items-center gap-2"
                        >
                            <UserPlus size={18} />
                            <span>Add User</span>
                        </button>
                    </div>
                </div>

                {/* User Table */}
                <div className="flex-1 overflow-auto custom-scrollbar bg-bg-card">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-bg-input/50 text-xs font-bold text-text-muted uppercase tracking-wider sticky top-0 backdrop-blur-md z-10">
                            <tr>
                                <th className="p-5 pl-6 font-semibold">User</th>
                                <th className="p-5 font-semibold">Email</th>
                                <th className="p-5 font-semibold">Role</th>
                                <th className="p-5 font-semibold">Joined</th>
                                <th className="p-5 text-right pr-6 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                            {loading ? (
                                <tr><td colSpan={5} className="p-12 text-center text-text-muted">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin text-accent-primary" size={24} />
                                        <span className="text-sm font-medium">Loading users...</span>
                                    </div>
                                </td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center text-text-muted">No users found matching your search.</td></tr>
                            ) : (
                                filteredUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-accent-primary/5 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3.5">
                                                <div className="relative">
                                                    <img
                                                        src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || 'U')}&background=random`}
                                                        className="w-10 h-10 rounded-full bg-bg-input object-cover border border-border-subtle shadow-sm"
                                                    />
                                                    <div className={clsx(
                                                        "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-bg-card",
                                                        u.role === 'owner' ? "bg-amber-400" :
                                                            u.role === 'admin' ? "bg-accent-primary" :
                                                                "bg-emerald-500"
                                                    )} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-text-primary text-sm">{u.full_name || 'Unknown'}</span>
                                                    <span className="text-xs text-text-muted">ID: {u.id.slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-text-secondary font-medium">{u.email}</td>
                                        <td className="p-4">
                                            <div className="relative inline-block">
                                                <select
                                                    className={clsx(
                                                        "appearance-none pl-8 pr-8 py-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer transition-all uppercase tracking-wide",
                                                        u.role === 'owner' ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20" :
                                                            u.role === 'admin' ? "bg-accent-primary/10 text-accent-primary border-accent-primary/20 hover:bg-accent-primary/20" :
                                                                "bg-bg-input text-text-secondary border-border-subtle hover:bg-bg-input/80"
                                                    )}
                                                    value={u.role || 'user'}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                    disabled={updating === u.id}
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="owner">Owner</option>
                                                </select>
                                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    {u.role === 'owner' ? <Crown size={12} className="text-amber-600" /> :
                                                        u.role === 'admin' ? <ShieldCheck size={12} className="text-accent-primary" /> :
                                                            <User size={12} className="text-text-muted" />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-text-muted text-sm font-mono">
                                            {format(new Date(u.updated_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="p-4 text-right pr-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    className="p-2 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title={
                                                        (user?.role !== 'owner' && (u.role === 'admin' || u.role === 'owner'))
                                                            ? "You cannot modify AI settings for other Admins/Owners"
                                                            : "Configure AI Context"
                                                    }
                                                    disabled={user?.role !== 'owner' && (u.role === 'admin' || u.role === 'owner')}
                                                    onClick={() => handleOpenContextModal(u)}
                                                >
                                                    <Bot className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="p-2 text-text-muted hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                                                    title="Invite to Team"
                                                    disabled={u.id === user?.id}
                                                    onClick={() => handleInviteToTeam(u.id, u.full_name)}
                                                >
                                                    <Users className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="p-2 text-text-muted hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                                                    title="Security Settings"
                                                    onClick={() => handleOpenSecurityModal(u)}
                                                >
                                                    <Lock className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                    title="Delete User"
                                                    disabled={deletingId === u.id || u.id === user?.id}
                                                    onClick={() => handleDeleteUser(u.id, u.full_name)}
                                                >
                                                    {deletingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-md rounded-2xl p-0 shadow-2xl border border-border-subtle overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 bg-bg-card">
                        <div className="p-6 border-b border-border-subtle bg-bg-input/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-display font-bold text-text-primary flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-accent-primary/10 text-accent-primary">
                                        <UserPlus size={18} />
                                    </div>
                                    Create New User
                                </h3>
                                <p className="text-xs text-text-muted mt-1">Add a new member to your workspace.</p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-text-muted hover:text-text-primary transition-colors p-1 hover:bg-bg-input rounded-md"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full"
                                    placeholder="e.g., Jane Doe"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="input w-full"
                                    placeholder="e.g., jane@example.com"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Temporary Password</label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full font-mono text-sm bg-bg-input/50"
                                    placeholder="Secret.123"
                                    value={newUserPass}
                                    onChange={(e) => setNewUserPass(e.target.value)}
                                />
                                <p className="text-[11px] text-text-muted ml-1 flex items-center gap-1">
                                    <ShieldCheck size={10} /> Must be at least 6 characters.
                                </p>
                            </div>

                            {createError && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-2">
                                    <Shield size={14} />
                                    {createError}
                                </div>
                            )}

                            {createSuccess && (
                                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium flex items-center gap-2">
                                    <ShieldCheck size={14} />
                                    {createSuccess}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="btn btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingUser}
                                    className="btn btn-primary min-w-[120px] shadow-lg shadow-accent-primary/20"
                                >
                                    {creatingUser ? <Loader2 className="animate-spin w-4 h-4" /> : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* AI Context Modal */}
            {isContextModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-0 shadow-2xl border border-border-subtle overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 bg-bg-card">
                        <div className="p-6 border-b border-border-subtle bg-bg-input/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-display font-bold text-text-primary flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-500">
                                        <Bot size={18} />
                                    </div>
                                    AI Context Settings
                                </h3>
                                <p className="text-xs text-text-muted mt-1">
                                    Configure the AI assistant behavior for <span className="font-bold text-text-primary">{selectedUser.full_name}</span>.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsContextModalOpen(false)}
                                className="text-text-muted hover:text-text-primary transition-colors p-1 hover:bg-bg-input rounded-md"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">
                                    Custom AI Prompt / Context
                                </label>
                                <textarea
                                    className="input w-full min-h-[150px] resize-y text-sm leading-relaxed"
                                    placeholder="Enter specific instructions for the AI when processing tasks for this user..."
                                    value={contextValue}
                                    onChange={(e) => setContextValue(e.target.value)}
                                />
                                <p className="text-xs text-text-muted ml-1">
                                    This context is invisible to the user but determines how their tasks are processed.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                                <button
                                    onClick={() => setIsContextModalOpen(false)}
                                    className="btn btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveContext}
                                    disabled={savingContext}
                                    className="btn btn-primary min-w-[100px] shadow-lg shadow-accent-primary/20"
                                >
                                    {savingContext ? <Loader2 className="animate-spin w-4 h-4" /> : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Security Modal */}
            {isSecurityModalOpen && securityUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-0 shadow-2xl border border-border-subtle overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 bg-bg-card">
                        <div className="p-6 border-b border-border-subtle bg-bg-input/30 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-display font-bold text-text-primary flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                                        <Lock size={18} />
                                    </div>
                                    Security Settings
                                </h3>
                                <p className="text-xs text-text-muted mt-1">
                                    Manage access and credentials for <span className="font-bold text-text-primary">{securityUser.full_name}</span>.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSecurityModalOpen(false)}
                                className="text-text-muted hover:text-text-primary transition-colors p-1 hover:bg-bg-input rounded-md"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            {securityMessage && (
                                <div className={clsx(
                                    "p-3 rounded-lg text-sm font-medium flex items-center gap-2",
                                    securityMessage.type === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                                )}>
                                    {securityMessage.type === 'success' ? <ShieldCheck size={14} /> : <Shield size={14} />}
                                    {securityMessage.text}
                                </div>
                            )}

                            {/* Option 1: Email Reset */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 rounded-lg bg-bg-input text-text-muted">
                                        <Mail size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-text-primary">Send Password Reset Email</h4>
                                        <p className="text-xs text-text-secondary mt-1">
                                            Sends a secure link to <strong>{securityUser.email}</strong> allowing them to choose a new password. This is the recommended method.
                                        </p>
                                        <button
                                            onClick={handleSendResetEmail}
                                            disabled={sendingResetEmail}
                                            className="mt-3 btn btn-outline btn-sm"
                                        >
                                            {sendingResetEmail ? <Loader2 className="animate-spin w-3.5 h-3.5 mr-2" /> : null}
                                            Send Reset Link
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-border-subtle" />

                            {/* Option 2: Manual Reset (Owner Only) */}
                            {(user?.role === 'owner' || user?.role === 'admin') && (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                            <Key size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                                Manual Password Override
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 uppercase">Danger Zone</span>
                                            </h4>
                                            <p className="text-xs text-text-secondary mt-1">
                                                Forcefully set a new password. Use this if you need to take control of the account or if the user cannot access their email.
                                            </p>

                                            <div className="mt-3 flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Enter new password..."
                                                    className="input flex-1 text-sm h-9"
                                                    value={manualPassword}
                                                    onChange={(e) => setManualPassword(e.target.value)}
                                                />
                                                <button
                                                    onClick={handleManualReset}
                                                    disabled={resettingPassword || !manualPassword}
                                                    className="btn btn-warning btn-sm whitespace-nowrap"
                                                >
                                                    {resettingPassword ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : 'Set Password'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

