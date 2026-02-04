import type { StoreSlice, ActivitySlice } from '../types';
import { supabase } from '../../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

export const createActivitySlice: StoreSlice<ActivitySlice> = (set, get) => ({
    logActivity: async (taskId, type, content, metadata = {}) => {
        const id = uuidv4();
        const userId = get().user?.id;
        const newActivity: any = {
            id,
            taskId,
            userId,
            type,
            content,
            metadata,
            createdAt: Date.now()
        };

        // Optimistic
        set(state => ({ activities: { ...state.activities, [id]: newActivity } }));

        // Check for mentions
        if (type === 'message') {
            const mentionRegex = /@(\w+)/g;
            const matches = content.match(mentionRegex);
            if (matches) {
                const state = get();
                const teamValues = Object.values(state.team);
                matches.forEach(match => {
                    const name = match.substring(1).toLowerCase();
                    const mentionedUser = teamValues.find(u => u.name.toLowerCase().includes(name));
                    if (mentionedUser && mentionedUser.id !== userId) {
                        state.sendNotification(
                            mentionedUser.id,
                            'mention',
                            'You were mentioned',
                            `${state.user?.name} mentioned you in a comment`,
                            `/tasks?taskId=${taskId}`
                        );
                    }
                });
            }
        }

        await supabase.from('activity_logs').insert({
            id,
            task_id: taskId,
            user_id: userId,
            type,
            content,
            metadata
        });
    },

    updateActivity: async (id, content) => {
        // Optimistic
        set(state => {
            const activity = state.activities[id];
            if (!activity) return state;
            return {
                activities: {
                    ...state.activities,
                    [id]: { ...activity, content }
                }
            };
        });

        const { error } = await supabase.from('activity_logs').update({ content }).eq('id', id);

        if (error) {
            console.error("Failed to update activity:", error);
            toast.error("Failed to update message");
        } else {
            toast.success("Message updated");
        }
    },

    fetchActivities: async (taskId) => {
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching activities:', error);
            return;
        }

        const activities: Record<string, any> = {};
        data?.forEach((a: any) => {
            activities[a.id] = {
                ...a,
                taskId: a.task_id,
                userId: a.user_id,
                createdAt: new Date(a.created_at).getTime()
            };
        });

        set(state => ({
            activities: { ...state.activities, ...activities }
        }));
    },
});
