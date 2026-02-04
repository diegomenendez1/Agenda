import type { StoreSlice, AISlice } from '../types';
import { supabase } from '../../supabase';
import { toast } from 'sonner';

export const createAISlice: StoreSlice<AISlice> = (set, get) => ({
    fetchAIContext: async (userId) => {
        const { data } = await supabase
            .from('user_ai_metadata')
            .select('ai_context')
            .eq('user_id', userId)
            .maybeSingle();
        return data?.ai_context || '';
    },

    updateAIContext: async (userId, context) => {

        // 1. Persist in DB
        const { data, error } = await supabase
            .from('user_ai_metadata')
            .upsert({
                user_id: userId,
                ai_context: context,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error("[STORE] Upsert error:", error);
            toast.error("Failed to save AI Context due to permissions.");
            throw error;
        }


        // 2. Update local state within User Profile (Cross-slice update)
        const currentUserId = get().user?.id;
        if (userId === currentUserId && get().user) {
            set(state => ({
                user: state.user ? {
                    ...state.user,
                    preferences: { ...state.user.preferences, aiContext: context }
                } : null
            }));
        }

        toast.success("AI Context updated successfully.");
    },
});
