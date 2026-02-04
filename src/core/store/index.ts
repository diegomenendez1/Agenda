import { create } from 'zustand';
import type { Store } from './types';
import { createAuthSlice } from './slices/createAuthSlice';
import { createTaskSlice } from './slices/createTaskSlice';
import { createProjectSlice } from './slices/createProjectSlice';
import { createInboxSlice } from './slices/createInboxSlice';
import { createNoteSlice } from './slices/createNoteSlice';
import { createHabitSlice } from './slices/createHabitSlice';
import { createTeamSlice } from './slices/createTeamSlice';
import { createNotificationSlice } from './slices/createNotificationSlice';
import { createActivitySlice } from './slices/createActivitySlice';
import { createAISlice } from './slices/createAISlice';

export const useStore = create<Store>((...a) => ({
    // Initial State
    user: null,
    team: {},
    inbox: {},
    tasks: {},
    projects: {},
    notes: {},
    habits: {},
    activities: {},
    notifications: {},
    onlineUsers: [],
    activeInvitations: [],
    myWorkspaces: [],
    // Loaded from localStorage in AuthSlice but default empty here
    // workspaceAliases: {}, remove duplicate
    realtimeCheck: undefined,

    // Slices
    ...createAuthSlice(...a),
    ...createTaskSlice(...a),
    ...createProjectSlice(...a),
    ...createInboxSlice(...a),
    ...createNoteSlice(...a),
    ...createHabitSlice(...a),
    ...createTeamSlice(...a),
    ...createNotificationSlice(...a),
    ...createActivitySlice(...a),
    ...createAISlice(...a),
}));
