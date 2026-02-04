import type { StoreSlice, TeamSlice } from '../types';
import { supabase } from '../../supabase';
import { toast } from 'sonner';

export const createTeamSlice: StoreSlice<TeamSlice> = (set, get) => ({
    fetchInvitations: async () => {
        const { data, error } = await supabase
            .from('team_invitations')
            .select('*, inviter:profiles!invited_by(full_name), organization:organizations(name)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Store] Failed to fetch invitations:', error);
            toast.error(`Error loading invitations: ${error.message}`);
            return;
        }

        const invites = data.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            status: i.status as any,
            teamId: i.team_id || 'default-team', // Fallback
            organizationId: i.organization_id,
            invitedBy: i.invited_by,
            inviterName: i.inviter?.full_name || 'Unknown',
            organizationName: ((i.organization as any)?.[0]?.name || (i.organization as any)?.name) || 'Unknown Workspace',
            createdAt: new Date(i.created_at).getTime(),
            token: i.token // Only heads see this usually, but strictly handled by RLS
        }));

        set({ activeInvitations: invites });
    },

    sendInvitation: async (email, role, reportsTo) => {
        const { user } = get();
        if (!user) return;

        // Managers/Leads can also invite directly now
        const canInviteDirectly = user.role === 'owner' || user.role === 'head' || user.role === 'lead';

        if (canInviteDirectly) {
            // New signature supports invite_reports_to
            const { error } = await supabase.rpc('invite_user_direct', {
                invite_email: email,
                invite_role: role,
                invite_reports_to: reportsTo || null
            });
            if (error) {
                console.error('[Store] invite_user_direct failed:', error);
                throw error;
            }

            // Success - Refetch invitations
            await get().fetchInvitations();
        } else {
            const { error } = await supabase.rpc('request_invitation', {
                invite_email: email
            });

            if (error) {
                console.error('[Store] request_invitation failed:', error);
                throw error;
            }
        }

        // Refresh list
        await get().fetchInvitations();
        toast.success(canInviteDirectly ? 'Invitation sent' : 'Request sent for approval');
    },

    approveInvitation: async (id, role) => {
        const { error } = await supabase.rpc('approve_invitation', {
            invite_id: id,
            assigned_role: role
        });

        if (error) throw error;
        await get().fetchInvitations();
        toast.success('Invitation approved');
    },

    rejectInvitation: async (id) => {
        const { error } = await supabase.rpc('delete_invitation', {
            target_invite_id: id
        });

        if (error) throw error;

        set(state => ({
            activeInvitations: state.activeInvitations.filter(i => i.id !== id)
        }));
        toast.success('Invitation rejected/deleted');
    },

    acceptPendingInvitation: async (inviteId) => {
        try {
            const { error } = await supabase.rpc('accept_invitation', {
                invite_id: inviteId
            });

            if (error) {
                console.error('[Store] accept_invitation failed:', error);
                throw error;
            }

            toast.success("Joined team successfully!");
            // Reload app to switch context or show new data
            await get().initialize();
            window.location.reload(); // Force reload to ensure context switch
        } catch (error) {
            console.error("Failed to accept invitation:", error);
            toast.error("Failed to join team");
        }
    },

    declinePendingInvitation: async (inviteId) => {
        try {
            const { error } = await supabase.rpc('decline_invitation', {
                invite_id: inviteId
            });
            if (error) throw error;

            // Remove from local list
            set(state => ({
                activeInvitations: state.activeInvitations.filter(i => i.id !== inviteId)
            }));

            toast.success("Invitation declined");
        } catch (error) {
            console.error("Failed to decline invitation:", error);
            toast.error("Failed to decline invitation");
        }
    },

    revokeInvitation: async (id) => {
        // 1. Optimistic Update
        const previousInvitations = get().activeInvitations;
        set(state => ({
            activeInvitations: state.activeInvitations.filter(i => i.id !== id)
        }));

        try {
            // 2. Use RPC for safe deletion
            const { data: success, error } = await supabase.rpc('delete_invitation', {
                target_invite_id: id
            });

            if (error) throw error;

            // 3. Verify Success
            if (success === false) {
                throw new Error("Permission denied or invitation validation failed");
            }

            toast.success("Invitation revoked");
        } catch (error: any) {
            console.error("Failed to revoke invitation:", error);

            // 4. Rollback on failure
            set({ activeInvitations: previousInvitations });
            toast.error(error.message || "Failed to revoke invitation");

            // 5. Re-sync to ensure consistency
            await get().fetchInvitations();
        }
    },

    resendInvitation: async (id) => {
        const state = get();
        const invite = state.activeInvitations.find(i => i.id === id);
        if (!invite) return;

        // Optimistic: Update createdAt to signify resend
        set(state => ({
            activeInvitations: state.activeInvitations.map(i =>
                i.id === id ? { ...i, createdAt: Date.now() } : i
            )
        }));

        toast.success(`Invitation resent to ${invite.email}`);
        // RPC: await supabase.rpc('resend_invitation', { invite_id: id });
    },

    updateMemberRole: async (memberId, role) => {
        await get().updateTeamMember(memberId, { role });
    },

    leaveTeam: async () => {
        const { user } = get();
        if (!user) return;

        // Clear local team state and tasks to simulate leaving
        set({ team: {}, tasks: {} });

        // RPC call would go here
        // await supabase.rpc('leave_team', { user_id: user.id });
    },

    updateTeamMember: async (memberId, updates) => {
        // Optimistic update
        set(state => {
            const currentMember = state.team[memberId];
            if (!currentMember) return state;

            return {
                team: {
                    ...state.team,
                    [memberId]: {
                        ...currentMember,
                        ...updates
                    } as any
                }
            };
        });

        const dbUpdates: any = {};
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        // Handle explicit null for removing reportsTo reference
        if (updates.reportsTo !== undefined) dbUpdates.reports_to = updates.reportsTo;

        const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', memberId);
        if (error) {
            console.error("Failed to update team member:", error);
            throw error;
        }

        // Refresh to ensure consistency
        await get().initialize();
    },

    removeTeamMember: async (memberId) => {
        // Optimistic update
        set(state => {
            const { [memberId]: _, ...rest } = state.team;
            return { team: rest };
        });

        // Use the Admin RPC for safe deletion/removal
        const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: memberId });
        if (error) {
            console.error("Failed to remove member:", error);
            throw error;
        }
    },

    validateInvitation: async (token) => {
        // 1. Check local state (optimistic)
        const local = get().activeInvitations.find(i => (i as any).token === token);
        if (local) return local;

        // 2. Check DB
        const { data } = await supabase.from('team_invitations').select('*').eq('token', token).single();
        return data;
    },

    acceptInvitation: async (token, userId) => {
        // 1. Validate permissions/existence
        const invite = await get().validateInvitation(token);
        if (!invite) throw new Error("Invalid token");

        // 2. RPC call to link user to team
        const { error } = await supabase.rpc('accept_team_invitation', {
            token,
            user_id: userId
        });

        if (error) throw error;

        // 3. Refresh profile and team
        await get().initialize();
    },

    createOrganization: async (name) => {
        const { data: newOrgId, error } = await supabase.rpc('create_new_organization', { org_name: name });
        if (error) throw error;

        // Optimistically update the active user org to trigger the App redirect immediately
        set(state => {
            if (!state.user) return state;
            return {
                user: {
                    ...state.user,
                    organizationId: newOrgId,
                    role: 'owner'
                }
            };
        });

        // Then do a full refresh to load members, projects, etc.
        await get().initialize();
    },
});
