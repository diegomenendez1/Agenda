import type { StoreSlice, NoteSlice } from '../types';
import { supabase } from '../../supabase';
import { v4 as uuidv4 } from 'uuid';

export const createNoteSlice: StoreSlice<NoteSlice> = (set, get) => ({
    addNote: async (title, body) => {
        const id = uuidv4();
        const now = Date.now();
        const userId = get().user?.id;
        const orgId = get().user?.organizationId;

        // Optimistic
        const newNote: any = {
            id,
            title,
            body,
            createdAt: now,
            updatedAt: now,
            tags: [],
            organizationId: orgId
        };
        set(state => ({ notes: { ...state.notes, [id]: newNote } }));

        await supabase.from('notes').insert({
            id,
            title,
            body,
            user_id: userId,
            organization_id: orgId,
            created_at: now, // BIGINT
            updated_at: new Date(now).toISOString()
        });
        return id;
    },

    updateNote: async (id, updates) => {
        // Optimistic
        set(state => {
            const note = state.notes[id];
            if (!note) return state;
            return { notes: { ...state.notes, [id]: { ...note, ...updates } } };
        });

        const dbUpdates: Record<string, any> = { ...updates };
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
});
