import type { StoreSlice, NotificationSlice } from '../types';
import { supabase } from '../../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

export const createNotificationSlice: StoreSlice<NotificationSlice> = (set, get) => ({
    markNotificationRead: async (id) => {
        set(state => ({
            notifications: {
                ...state.notifications,
                [id]: { ...state.notifications[id], read: true }
            }
        }));
        await supabase.from('notifications').update({ read: true }).eq('id', id);
    },

    markAllNotificationsRead: async () => {
        set(state => {
            const updated = { ...state.notifications };
            Object.keys(updated).forEach(k => {
                if (updated[k].type !== 'rejection') {
                    updated[k].read = true;
                }
            });
            return { notifications: updated };
        });
        await supabase.from('notifications')
            .update({ read: true })
            .eq('user_id', get().user?.id)
            .neq('type', 'rejection');
    },

    deleteNotification: async (id) => {
        set(state => {
            const { [id]: _, ...rest } = state.notifications;
            return { notifications: rest };
        });
        await supabase.from('notifications').delete().eq('id', id);
    },

    clearAllNotifications: async () => {
        const userId = get().user?.id;
        if (!userId) return;
        set({ notifications: {} });
        await supabase.from('notifications').delete().eq('user_id', userId);
    },

    sendNotification: async (userId, type, title, message, link) => {
        const id = uuidv4();
        const orgId = get().user?.organizationId;



        if (!orgId) {
            console.error("[Store] Critical: Cannot send notification, missing Organization ID in user state.");
            toast.error("Error: Missing Organization Setup");
            return;
        }

        // Database Insert
        const { error } = await supabase.from('notifications').insert({
            id,
            user_id: userId,
            organization_id: orgId,
            type,
            title,
            message,
            link,
            read: false
        });

        if (error) {
            console.error("[Store] Failed to persist notification:", error);
        } else {

        }
    },

    sendEmail: async (to, subject, html) => {
        try {
            // Using Edge Function for better security and stability
            const { error } = await supabase.functions.invoke('send-email', {
                body: { to, subject, html }
            });

            if (error) throw error;

        } catch (error) {
            console.error('[Store] Failed to send email:', error);
        }
    },
});
