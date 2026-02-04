import type { StoreSlice, AuthSlice } from '../types';
import { supabase } from '../../supabase';
import { toast } from 'sonner';
import { fromSeconds, hydrateTask, hydrateInvitation, recentlyDeletedInboxIds } from '../utils';

export const createAuthSlice: StoreSlice<AuthSlice> = (set, get) => ({
    workspaceAliases: JSON.parse(localStorage.getItem('agenda_workspace_aliases') || '{}'),

    fetchWorkspaces: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.from('organization_members')
                .select('organization_id, role, joined_at, organizations(name)')
                .eq('user_id', user.id);

            if (error) throw error;

            const aliases = get().workspaceAliases || {};
            const workspaces = (data || []).map((m) => ({
                id: m.organization_id,
                name: aliases[m.organization_id] || m.organizations?.name || 'Unknown Workspace',
                role: m.role,
                joinedAt: m.joined_at ? new Date(m.joined_at).getTime() : Date.now()
            }));

            set({ myWorkspaces: workspaces });

        } catch (err) {
            console.error('[Store] Failed to fetch workspaces:', err);
        }
    },

    switchWorkspace: async (id: string) => {
        set(state => ({
            user: state.user ? { ...state.user, organizationId: id } : state.user
        }));

        try {

            const { error } = await supabase.rpc('switch_workspace', { target_org_id: id });
            if (error) throw error;

            // Re-initialize to fetch data for the NEW organization
            await get().initialize();
            toast.success("Switched workspace");
        } catch (error) {
            console.error('Switch workspace failed:', error);
            toast.error('Failed to switch workspace');
        }
    },

    renameWorkspace: async (orgId, newName) => {
        // Local Alias Implementation
        const aliases = { ...get().workspaceAliases, [orgId]: newName };
        localStorage.setItem('agenda_workspace_aliases', JSON.stringify(aliases));

        set(state => ({
            workspaceAliases: aliases,
            myWorkspaces: state.myWorkspaces.map(w => w.id === orgId ? { ...w, name: newName } : w)
        }));

        toast.success("Workspace renamed successfully (Local Alias)");
    },

    updateUserProfile: async (profile) => {
        // Optimistic update
        set({ user: profile });

        const { error } = await supabase.from('profiles').update({
            full_name: profile.name,
            role: profile.role,
            preferences: profile.preferences
        }).eq('id', profile.id);

        if (error) {
            console.error("Failed to update profile:", error);
        }
    },

    initialize: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const currentUser = get().user;

            // Set skeleton user only if we don't already have one with an org (to avoid flickering)
            if (!currentUser || !currentUser.organizationId) {
                set({
                    user: {
                        id: user.id,
                        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                        email: user.email || '',
                        avatar: user.user_metadata?.avatar_url,
                        role: currentUser?.role || 'member',
                        preferences: {
                            theme: 'light',
                            autoPrioritize: true,
                            ...(currentUser?.preferences || {})
                        },
                        organizationId: currentUser?.organizationId || user.user_metadata?.organization_id
                    }
                });
            }



            await get().fetchWorkspaces();

            // Fetch Profile
            const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();

            if (profileErr) {
                console.warn('[Store] Profile load failed, might be missing RLS or record:', profileErr);
            }

            if (profile) {
                // Load Private AI Context fallback
                let aiContext = '';
                try {
                    const { data: aiData } = await supabase.from('user_ai_metadata').select('ai_context').eq('user_id', user.id).maybeSingle();
                    aiContext = aiData?.ai_context || '';
                } catch (e) { console.warn('AI context load failed', e); }

                set({
                    user: {
                        id: profile.id,
                        name: profile.full_name,
                        email: profile.email,
                        avatar: profile.avatar_url,
                        role: profile.role,
                        preferences: {
                            ...profile.preferences,
                            aiContext
                        },
                        organizationId: profile.organization_id // NEW
                    }
                });
            } else {
                console.error('[Store] Critical: User authenticated but no profile found in DB.');
            }

            // Fetch All Data (Optimized with Time-Window Sync and Organization Multi-tenancy)
            let activeOrgId = profile?.organization_id;

            // AUTO-RECOVERY
            if (!activeOrgId && get().myWorkspaces.length > 0) {
                const firstOrg = get().myWorkspaces[0];

                await get().switchWorkspace(firstOrg.id);
                return; // switchWorkspace calls initialize again
            }

            if (!activeOrgId) {

                const { data: invitations } = await supabase.from('team_invitations')
                    .select('*, inviter:profiles!invited_by(full_name), organization:organizations(name)')
                    .order('created_at', { ascending: false });

                set({ activeInvitations: (invitations || []).map(hydrateInvitation) });
                return;
            }

            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

            // Fetch core data in parallel
            const results = await Promise.allSettled([
                supabase.from('inbox_items').select('*')
                    .eq('organization_id', activeOrgId)
                    .or(`processed.eq.false,created_at.gt.${thirtyDaysAgo}`),

                supabase.from('tasks').select('*')
                    .eq('organization_id', activeOrgId)
                    .or(`status.neq.done,updated_at.gt.${new Date(thirtyDaysAgo).toISOString()}`),

                supabase.from('projects').select('*')
                    .eq('organization_id', activeOrgId)
                    .eq('status', 'active'),

                supabase.from('notes').select('*')
                    .eq('organization_id', activeOrgId),

                supabase.from('profiles').select('*')
                    .eq('organization_id', activeOrgId),

                supabase.from('notifications').select('*')
                    .eq('organization_id', activeOrgId)
                    .eq('user_id', user.id).limit(100),

                supabase.from('team_invitations')
                    .select('*, inviter:profiles!invited_by(full_name), organization:organizations(name)')
                    .order('created_at', { ascending: false })
            ]);

            const [inboxRes, tasksRes, projectsRes, notesRes, teamRes, notificationsRes, invitationsRes] = results.map(r => r.status === 'fulfilled' ? r.value : { data: [], error: r.reason });

            if (results.some(r => r.status === 'rejected')) {
                console.warn('[Store] Some initialization queries failed:', results.filter(r => r.status === 'rejected'));
            }

            const inbox: Record<string, any> = {};
            (inboxRes.data as any[])?.forEach((i: any) => {
                inbox[i.id] = {
                    ...i,
                    createdAt: i.created_at ? fromSeconds(i.created_at) || Date.now() : Date.now()
                };
            });

            const tasks: Record<string, any> = {};
            (tasksRes.data as any[])?.forEach((t: any) => {
                tasks[t.id] = hydrateTask(t);
            });

            const projects: Record<string, any> = {};
            (projectsRes.data as any[])?.forEach((p: any) => {
                projects[p.id] = {
                    ...p,
                    createdAt: p.created_at ? fromSeconds(p.created_at) || Date.now() : Date.now(),
                    deadline: fromSeconds(p.deadline),
                    organizationId: p.organization_id
                }
            });

            const notes: Record<string, any> = {};
            (notesRes.data as any[])?.forEach((n: any) => {
                notes[n.id] = {
                    ...n,
                    projectId: n.project_id,
                    createdAt: fromSeconds(n.created_at) || Date.now(),
                    updatedAt: fromSeconds(n.updated_at) || Date.now(),
                    organizationId: n.organization_id
                };
            });

            const team: Record<string, any> = {};
            (teamRes.data as any[])?.forEach((t: any) => {
                if (!t.full_name && !t.email) return;
                team[t.id] = {
                    id: t.id,
                    name: t.full_name || t.email || 'Unknown',
                    email: t.email,
                    role: t.role,
                    avatar: t.avatar_url,
                    reportsTo: t.reports_to
                };
            });

            // Hierarchy Post-Processing
            Object.values(team).forEach((member: any) => {
                if (member.reportsTo && team[member.reportsTo]) {
                    if (!team[member.reportsTo].directReports) {
                        team[member.reportsTo].directReports = [];
                    }
                    team[member.reportsTo].directReports.push(member.id);
                }
            });

            const notifications: Record<string, any> = {};
            (notificationsRes.data as any[])?.forEach((n: any) => {
                notifications[n.id] = {
                    ...n,
                    userId: n.user_id,
                    createdAt: n.created_at ? fromSeconds(n.created_at) || Date.now() : Date.now(),
                    organizationId: n.organization_id
                };
            });

            // Hydrate Invitations
            const activeInvitations = (invitationsRes?.data || []).map((i: any) => hydrateInvitation(i));

            set({ inbox, tasks, projects, notes, team, notifications, activeInvitations });

            // Enable Realtime Subscriptions
            supabase
                .channel('public:everything')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: any) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const hydrated = hydrateTask(payload.new);
                        const activeOrgId = get().user?.organizationId;
                        if (hydrated.organizationId !== activeOrgId) return;

                        set(state => ({ tasks: { ...state.tasks, [hydrated.id]: hydrated } }));
                    } else if (payload.eventType === 'DELETE') {
                        set(state => {
                            const { [payload.old.id]: _, ...rest } = state.tasks;
                            return { tasks: rest };
                        });
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_items' }, (payload: any) => {
                    const i = payload.new;
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        // Anti-Resurrection
                        if (recentlyDeletedInboxIds.has(i.id)) {

                            return;
                        }

                        const activeOrgId = get().user?.organizationId;
                        if (i.organization_id !== activeOrgId) return;
                        if (i.user_id !== get().user?.id) return;

                        const hydrated = {
                            ...i,
                            createdAt: i.created_at ? fromSeconds(i.created_at) || Date.now() : Date.now()
                        };
                        set(state => ({ inbox: { ...state.inbox, [i.id]: hydrated } }));
                    } else if (payload.eventType === 'DELETE') {
                        set(state => {
                            const { [payload.old.id]: _, ...rest } = state.inbox;
                            return { inbox: rest };
                        });
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload: any) => {
                    const p = payload.new;
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const activeOrgId = get().user?.organizationId;
                        if (p.organization_id !== activeOrgId) return;

                        const hydrated = {
                            ...p,
                            createdAt: p.created_at ? fromSeconds(p.created_at) || Date.now() : Date.now(),
                            deadline: fromSeconds(p.deadline),
                            organizationId: p.organization_id
                        };
                        set(state => ({ projects: { ...state.projects, [p.id]: hydrated } }));
                    } else if (payload.eventType === 'DELETE') {
                        set(state => {
                            const { [payload.old.id]: _, ...rest } = state.projects;
                            return { projects: rest };
                        });
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload: any) => {
                    const n = payload.new;
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const activeOrgId = get().user?.organizationId;
                        if (n.organization_id !== activeOrgId) return;

                        const hydrated = {
                            ...n,
                            projectId: n.project_id,
                            createdAt: fromSeconds(n.created_at) || Date.now(),
                            updatedAt: fromSeconds(n.updated_at) || Date.now(),
                            organizationId: n.organization_id
                        };
                        set(state => ({ notes: { ...state.notes, [n.id]: hydrated } }));
                    } else if (payload.eventType === 'DELETE') {
                        set(state => {
                            const { [payload.old.id]: _, ...rest } = state.notes;
                            return { notes: rest };
                        });
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
                    const p = payload.new;
                    const activeOrgId = get().user?.organizationId;

                    if (!activeOrgId) return;

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        if (p.organization_id !== activeOrgId) {
                            set(state => {
                                const { [p.id]: _, ...rest } = state.team;
                                return { team: rest };
                            });
                            return;
                        }

                        if (!p.full_name && !p.email) return;

                        set(state => ({
                            team: {
                                ...state.team,
                                [p.id]: {
                                    id: p.id,
                                    name: p.full_name || p.email || 'Unknown',
                                    email: p.email || '',
                                    role: p.role,
                                    avatar: p.avatar_url,
                                    reportsTo: p.reports_to
                                }
                            }
                        }));
                        const currentUser = get().user;
                        if (currentUser && currentUser.id === p.id) {
                            set({
                                user: {
                                    ...currentUser,
                                    name: p.full_name || p.email?.split('@')[0] || 'User',
                                    role: p.role,
                                    avatar: p.avatar_url,
                                    organizationId: p.organization_id
                                }
                            });
                        }
                    } else if (payload.eventType === 'DELETE') {
                        set(state => {
                            const { [payload.old.id]: _, ...rest } = state.team;
                            return { team: rest };
                        });
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invitations' }, () => {
                    get().fetchInvitations();
                })
                .subscribe(() => {

                });

            supabase.channel('public:notifications')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, (payload: any) => {

                    const n = payload.new;
                    const currentUserId = get().user?.id;

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        if (n.user_id !== currentUserId) return;
                        const notification = {
                            ...n,
                            userId: n.user_id,
                            createdAt: n.created_at ? fromSeconds(n.created_at) || Date.now() : Date.now(),
                            organizationId: n.organization_id
                        };
                        set(state => ({ notifications: { ...state.notifications, [n.id]: notification } }));
                    } else if (payload.eventType === 'DELETE') {
                        set(state => {
                            const { [payload.old.id]: _, ...rest } = state.notifications;
                            return { notifications: rest };
                        });
                    }
                })
                .subscribe();

            // Presence Logic
            const presenceChannel = supabase.channel('online-users');
            let throttleTimer: any = null;

            const updatePresence = () => {
                if (throttleTimer) return;
                throttleTimer = setTimeout(() => {
                    const newState = presenceChannel.presenceState();
                    const uniqueOnlineUsers = [
                        ...new Set(
                            Object.values(newState)
                                .flat()
                                .map((p: any) => p.user_id)
                                .filter(Boolean)
                        )
                    ];
                    set({ onlineUsers: uniqueOnlineUsers });
                    throttleTimer = null;
                }, 2000);
            };

            presenceChannel
                .on('presence', { event: 'sync' }, updatePresence)
                .on('presence', { event: 'join' }, updatePresence)
                .on('presence', { event: 'leave' }, updatePresence)
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await presenceChannel.track({
                            user_id: user.id,
                            online_at: new Date().toISOString(),
                        });
                    }
                });
        } catch (error) {
            console.error('[Store] Initialize failed unexpectedly:', error);
        }
    },
});
