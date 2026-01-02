import { create } from 'zustand';
import { supabase } from './supabase';
import type { AppState, Task, EntityId, Note, UserProfile, TaskStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

interface Actions {
    // Sync
    initialize: () => Promise<void>;

    // Inbox
    addInboxItem: (text: string, source?: 'manual' | 'email' | 'system') => Promise<void>;
    deleteInboxItem: (id: EntityId) => Promise<void>;

    // Tasks
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'tagIds'> & { status?: TaskStatus }) => Promise<EntityId>;
    updateTask: (id: EntityId, updates: Partial<Task>) => Promise<void>;
    toggleTaskStatus: (id: EntityId) => Promise<void>;
    deleteTask: (id: EntityId) => Promise<void>;

    // Projects
    addProject: (name: string, goal?: string, color?: string) => Promise<EntityId>;

    // Notes
    addNote: (title: string, body: string) => Promise<EntityId>;
    updateNote: (id: EntityId, updates: Partial<Note>) => Promise<void>;
    deleteNote: (id: EntityId) => Promise<void>;

    // Processing
    convertInboxToTask: (inboxItemId: EntityId, taskData: Partial<Task>) => Promise<void>;
    convertInboxToNote: (inboxItemId: EntityId, title: string, body?: string) => Promise<void>;

    // User
    updateUserProfile: (profile: UserProfile) => Promise<void>;
}

type Store = AppState & Actions;

export const useStore = create<Store>((set, get) => ({
    user: null,
    team: {},
    inbox: {},
    tasks: {},
    projects: {},
    notes: {},
    focusBlocks: {},

    initialize: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
            set({
                user: {
                    id: profile.id,
                    name: profile.full_name,
                    email: profile.email,
                    avatar: profile.avatar_url,
                    role: profile.role,
                    preferences: profile.preferences
                }
            });
        }

        // Fetch All Data (Realtime initial load)
        const [inboxRes, tasksRes, projectsRes, notesRes, teamRes] = await Promise.all([
            supabase.from('inbox_items').select('*'),
            supabase.from('tasks').select('*'),
            supabase.from('projects').select('*'),
            supabase.from('notes').select('*'),
            supabase.from('team_members').select('*')
        ]);

        const inbox: Record<string, any> = {};
        (inboxRes.data as any[])?.forEach((i: any) => {
            inbox[i.id] = {
                ...i,
                createdAt: i.created_at ? new Date(i.created_at).getTime() : Date.now()
            };
        });

        const tasks: Record<string, any> = {};
        (tasksRes.data as any[])?.forEach((t: any) => {
            tasks[t.id] = {
                ...t,
                projectId: t.project_id,
                tagIds: t.tag_ids || [],
                createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
                dueDate: t.due_date ? new Date(t.due_date).getTime() : undefined,
                completedAt: t.completed_at ? new Date(t.completed_at).getTime() : undefined,
                ownerId: t.owner_id,
                assigneeId: t.assignee_id,
                visibility: t.visibility || 'private'
            };
        });

        const projects: Record<string, any> = {};
        (projectsRes.data as any[])?.forEach((p: any) => {
            projects[p.id] = {
                ...p,
                createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
                deadline: p.deadline ? new Date(p.deadline).getTime() : undefined
            }
        });

        const notes: Record<string, any> = {};
        (notesRes.data as any[])?.forEach((n: any) => {
            notes[n.id] = {
                ...n,
                projectId: n.project_id,
                createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
                updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now()
            };
        });

        const team: Record<string, any> = {};
        (teamRes.data as any[])?.forEach((t: any) => team[t.id] = t);


        set({ inbox, tasks, projects, notes, team });

        // Enable Realtime Subscriptions
        supabase
            .channel('public:everything')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    const t = payload.new;
                    set(state => ({ tasks: { ...state.tasks, [t.id]: { ...t, projectId: t.project_id, tagIds: t.tag_ids || [] } } }));
                } else if (payload.eventType === 'UPDATE') {
                    const t = payload.new;
                    set(state => ({ tasks: { ...state.tasks, [t.id]: { ...t, projectId: t.project_id, tagIds: t.tag_ids || [] } } }));
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
                    set(state => ({ inbox: { ...state.inbox, [i.id]: i } }));
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
                    set(state => ({ projects: { ...state.projects, [p.id]: p } }));
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
                    set(state => ({ notes: { ...state.notes, [n.id]: { ...n, projectId: n.project_id } } }));
                } else if (payload.eventType === 'DELETE') {
                    set(state => {
                        const { [payload.old.id]: _, ...rest } = state.notes;
                        return { notes: rest };
                    });
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, (payload: any) => {
                // Although team_members is usually managed via auth/profiles, if we have a direct table:
                const t = payload.new;
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    set(state => ({ team: { ...state.team, [t.id]: t } }));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
                // Listen for profile changes (roles, avatars)
                const p = payload.new;
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    // If it's the current user, update 'user' state too
                    const currentUser = get().user;
                    if (currentUser && currentUser.id === p.id) {
                        set({ user: { ...currentUser, name: p.full_name, role: p.role, avatar: p.avatar_url } });
                    }
                }
            })
            .subscribe();
    },

    addInboxItem: async (text, source = 'manual') => {
        const id = uuidv4();
        // Optimistic
        const newItem = { id, text, source, processed: false, created_at: Date.now() };
        set(state => ({ inbox: { ...state.inbox, [id]: newItem as any } }));

        const { error } = await supabase.from('inbox_items').insert({ id, text, source });
        if (error) {
            console.error(error);
            // Rollback could be implemented here
        }
    },

    deleteInboxItem: async (id) => {
        // Optimistic
        set(state => {
            const { [id]: _, ...rest } = state.inbox;
            return { inbox: rest };
        });
        await supabase.from('inbox_items').delete().eq('id', id);
    },

    addTask: async (taskData) => {
        const id = uuidv4();
        const newTask: any = {
            id,
            title: taskData.title,
            description: taskData.description,
            status: taskData.status || 'todo',
            priority: taskData.priority || 'medium',
            projectId: taskData.projectId,
            project_id: taskData.projectId, // for consistency in view if needed before reload
            dueDate: taskData.dueDate,
            ownerId: get().user?.id || '',
            assigneeId: taskData.assigneeId,
            visibility: taskData.assigneeId ? 'team' : (taskData.visibility || 'private'),
            created_at: Date.now(),
            tagIds: []
        };

        // Optimistic Update
        set(state => ({ tasks: { ...state.tasks, [id]: newTask } }));

        const { error } = await supabase.from('tasks').insert({
            id,
            title: taskData.title,
            project_id: taskData.projectId,
            priority: taskData.priority || 'medium',
            status: taskData.status || 'todo',
            due_date: taskData.dueDate,
            description: taskData.description,
            owner_id: get().user?.id,
            assignee_id: taskData.assigneeId,
            visibility: taskData.assigneeId ? 'team' : (taskData.visibility || 'private')
        });

        if (error) console.error(error);
        return id;
    },

    updateTask: async (id, updates) => {
        // Optimistic
        set(state => {
            const task = state.tasks[id];
            if (!task) return state;

            // If assigning to someone, it implies sharing with the team
            const newVisibility = updates.assigneeId ? 'team' : (updates.visibility || task.visibility);
            const finalUpdates = { ...updates, visibility: newVisibility };

            return { tasks: { ...state.tasks, [id]: { ...task, ...finalUpdates } } };
        });

        const dbUpdates: any = { ...updates };
        if (updates.assigneeId) dbUpdates.visibility = 'team';
        if (updates.projectId) {
            dbUpdates.project_id = updates.projectId;
            delete dbUpdates.projectId;
        }
        await supabase.from('tasks').update(dbUpdates).eq('id', id);
    },

    toggleTaskStatus: async (id) => {
        const state = get();
        const task = state.tasks[id];
        const newStatus = task.status === 'done' ? 'todo' : 'done';

        // Optimistic
        set(state => ({
            tasks: {
                ...state.tasks,
                [id]: { ...task, status: newStatus as any, completedAt: newStatus === 'done' ? Date.now() : undefined }
            }
        }));

        await supabase.from('tasks').update({ status: newStatus, completed_at: newStatus === 'done' ? Date.now() : null }).eq('id', id);
    },

    deleteTask: async (id) => {
        // Optimistic
        set(state => {
            const { [id]: _, ...rest } = state.tasks;
            return { tasks: rest };
        });
        await supabase.from('tasks').delete().eq('id', id);
    },

    addProject: async (name, goal, color = '#6366f1') => {
        const id = uuidv4();
        // Optimistic
        const newProject = { id, name, goal, color, status: 'active', created_at: Date.now() };
        set(state => ({ projects: { ...state.projects, [id]: newProject as any } }));

        await supabase.from('projects').insert({ id, name, goal, color });
        return id;
    },

    addNote: async (title, body) => {
        const id = uuidv4();
        // Optimistic
        const newNote = { id, title, body, created_at: Date.now(), updated_at: Date.now(), tags: [] };
        set(state => ({ notes: { ...state.notes, [id]: newNote as any } }));

        await supabase.from('notes').insert({ id, title, body });
        return id;
    },

    updateNote: async (id, updates) => {
        // Optimistic
        set(state => {
            const note = state.notes[id];
            if (!note) return state;
            return { notes: { ...state.notes, [id]: { ...note, ...updates } } };
        });

        const dbUpdates: any = { ...updates };
        if (updates.projectId) {
            dbUpdates.project_id = updates.projectId;
            delete dbUpdates.projectId;
        }
        await supabase.from('notes').update(dbUpdates).eq('id', id);
    },

    deleteNote: async (id) => {
        // Optimistic
        set(state => {
            const { [id]: _, ...rest } = state.notes;
            return { notes: rest };
        });
        await supabase.from('notes').delete().eq('id', id);
    },

    convertInboxToTask: async (inboxItemId, taskData) => {
        const state = get();
        const inboxItem = state.inbox[inboxItemId];
        if (!inboxItem) return;

        // Uses optimistic methods internally
        await state.addTask({
            ...taskData, // Pass all fields including assigneeId
            title: taskData.title || inboxItem.text,
            status: 'todo'
        });

        await state.deleteInboxItem(inboxItemId);
    },

    convertInboxToNote: async (inboxItemId, title, body) => {
        const state = get();
        // Uses optimistic methods internally
        await state.addNote(title, body || '');
        await state.deleteInboxItem(inboxItemId);
    },

    updateUserProfile: async (profile) => {
        // Optimistic update
        set({ user: profile });
    },
}));
