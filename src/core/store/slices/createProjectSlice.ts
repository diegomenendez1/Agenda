import type { StoreSlice, ProjectSlice } from '../types';
import { supabase } from '../../supabase';
import { v4 as uuidv4 } from 'uuid';

const toSeconds = (ms?: number) => ms ? Math.round(ms / 1000) : null;

export const createProjectSlice: StoreSlice<ProjectSlice> = (set, get) => ({
    addProject: async (name, goal, color = '#6366f1') => {
        const id = uuidv4();
        const now = Date.now();
        const userId = get().user?.id || 'unknown';
        const orgId = get().user?.organizationId;

        // Optimistic
        const newProject = {
            id,
            name,
            goal,
            color,
            status: 'active',
            createdAt: now,
            organizationId: orgId
        };
        set(state => ({ projects: { ...state.projects, [id]: newProject as any } }));

        await supabase.from('projects').insert({
            id,
            name,
            goal,
            color,
            user_id: userId,
            organization_id: orgId,
            created_at: toSeconds(now)
        });
        return id;
    },

    updateProject: async (id, updates) => {
        // Optimistic
        set(state => {
            const project = state.projects[id];
            if (!project) return state;
            return { projects: { ...state.projects, [id]: { ...project, ...updates } } };
        });

        const dbUpdates: Record<string, any> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.goal !== undefined) dbUpdates.goal = updates.goal;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        await supabase.from('projects').update(dbUpdates).eq('id', id);
    },

    deleteProject: async (id) => {
        // Optimistic
        set(state => {
            const { [id]: _, ...rest } = state.projects;

            // Also clean up local tasks/notes for this project to prevent ghosts
            const newTasks = { ...state.tasks };
            Object.values(newTasks).forEach(t => {
                if (t.projectId === id) delete newTasks[t.id];
            });

            const newNotes = { ...state.notes };
            Object.values(newNotes).forEach(n => {
                if (n.projectId === id) delete newNotes[n.id];
            });

            return { projects: rest, tasks: newTasks, notes: newNotes };
        });

        await supabase.from('projects').delete().eq('id', id);
    },
});
