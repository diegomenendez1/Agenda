import type { StoreSlice, HabitSlice } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const createHabitSlice: StoreSlice<HabitSlice> = (set, get) => ({
    addHabit: async (habitData) => {
        const id = uuidv4();
        // Optimistic only for now
        const newHabit: any = {
            id,
            ...habitData,
            createdAt: Date.now(),
        };
        set(state => ({ habits: { ...state.habits, [id]: newHabit } }));
        return id;
    },

    deleteHabit: async (id) => {
        set(state => {
            const { [id]: _, ...rest } = state.habits;
            return { habits: rest };
        });
    },
});
