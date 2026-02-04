import type { StoreSlice, InboxSlice } from '../types';
import { supabase } from '../../supabase';
import { v4 as uuidv4 } from 'uuid';

export const createInboxSlice: StoreSlice<InboxSlice> = (set, get) => ({
    addInboxItem: async (text, source = 'manual') => {
        if (!text || !text.trim()) return;
        const id = uuidv4();
        // Optimistic
        const userId = get().user?.id;
        const orgId = get().user?.organizationId;
        const newItem = { id, text, source, processed: false, createdAt: Date.now(), organizationId: orgId };

        set(state => ({ inbox: { ...state.inbox, [id]: newItem as any } }));

        const { error } = await supabase.from('inbox_items').insert({
            id,
            text,
            source,
            user_id: userId,
            organization_id: orgId,
            created_at: newItem.createdAt
        });

        if (error) {
            console.error(error);
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

    deleteInboxItems: async (ids) => {
        if (ids.length === 0) return;
        // Optimistic
        set(state => {
            const newInbox = { ...state.inbox };
            ids.forEach(id => delete newInbox[id]);
            return { inbox: newInbox };
        });
        await supabase.from('inbox_items').delete().in('id', ids);
    },

    updateInboxItem: async (id, text) => {
        set(state => {
            const item = state.inbox[id];
            if (!item) return state;
            return { inbox: { ...state.inbox, [id]: { ...item, text } } };
        });
        await supabase.from('inbox_items').update({ text }).eq('id', id);
    },

    convertInboxToTask: async (inboxItemId, taskData) => {
        const state = get();
        const inboxItem = state.inbox[inboxItemId];
        if (!inboxItem) return;

        // Uses optimistic methods internally
        await state.addTask({
            ...taskData,
            title: taskData.title || inboxItem.text,
        });

        await state.deleteInboxItem(inboxItemId);
    },

    convertInboxToNote: async (inboxItemId, title, body) => {
        const state = get();
        await state.addNote(title, body || state.inbox[inboxItemId].text);
        await state.deleteInboxItem(inboxItemId);
    },
});
