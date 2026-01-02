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
        (inboxRes.data as any[])?.forEach((i: any) => inbox[i.id] = i);

        const tasks: Record<string, any> = {};
        (tasksRes.data as any[])?.forEach((t: any) => {
            tasks[t.id] = { ...t, projectId: t.project_id, tagIds: t.tag_ids || [] };
        });

        const projects: Record<string, any> = {};
        (projectsRes.data as any[])?.forEach((p: any) => projects[p.id] = p);

        const notes: Record<string, any> = {};
        (notesRes.data as any[])?.forEach((n: any) => {
            notes[n.id] = { ...n, projectId: n.project_id };
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
            .subscribe();
    },

    addInboxItem: async (text, source = 'manual') => {
        const { error } = await supabase.from('inbox_items').insert({ text, source });
        if (error) console.error(error);
    },

    deleteInboxItem: async (id) => {
        await supabase.from('inbox_items').delete().eq('id', id);
    },

    addTask: async (taskData) => {
        const id = uuidv4();
        const { error } = await supabase.from('tasks').insert({
            id,
            title: taskData.title,
            project_id: taskData.projectId,
            priority: taskData.priority || 'medium',
            status: taskData.status || 'todo',
            due_date: taskData.dueDate,
            description: taskData.description
        });

        if (error) console.error(error);
        return id;
    },

    updateTask: async (id, updates) => {
        const dbUpdates: any = { ...updates };
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
        await supabase.from('tasks').update({ status: newStatus, completed_at: newStatus === 'done' ? Date.now() : null }).eq('id', id);
    },

    deleteTask: async (id) => {
        await supabase.from('tasks').delete().eq('id', id);
    },

    addProject: async (name, goal, color = '#6366f1') => {
        const id = uuidv4();
        await supabase.from('projects').insert({ id, name, goal, color });
        return id;
    },

    addNote: async (title, body) => {
        const id = uuidv4();
        await supabase.from('notes').insert({ id, title, body });
        return id;
    },

    updateNote: async (id, updates) => {
        const dbUpdates: any = { ...updates };
        if (updates.projectId) {
            dbUpdates.project_id = updates.projectId;
            delete dbUpdates.projectId;
        }
        await supabase.from('notes').update(dbUpdates).eq('id', id);
    },

    deleteNote: async (id) => {
        await supabase.from('notes').delete().eq('id', id);
    },

    convertInboxToTask: async (inboxItemId, taskData) => {
        const state = get();
        const inboxItem = state.inbox[inboxItemId];
        if (!inboxItem) return;

        await state.addTask({
            title: taskData.title || inboxItem.text,
            priority: taskData.priority || 'medium',
            projectId: taskData.projectId,
            dueDate: taskData.dueDate,
            status: 'todo'
        });

        await state.deleteInboxItem(inboxItemId);
    },

    convertInboxToNote: async (inboxItemId, title, body) => {
        const state = get();
        await state.addNote(title, body || '');
        await state.deleteInboxItem(inboxItemId);
    },

    updateUserProfile: async (profile) => {
        // Optimistic update
        set({ user: profile });
    },
}));
