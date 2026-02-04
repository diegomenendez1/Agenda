import type { StateCreator } from 'zustand';
import type {
    AppState,
    Task,
    UserProfile,
    TaskStatus,
    EntityId,
    Project,
    Note,
    Habit,
    Workspace
} from '../types';

// Slice Interfaces

export interface AuthSlice {
    initialize: () => Promise<void>;
    updateUserProfile: (profile: UserProfile) => Promise<void>;
    fetchWorkspaces: () => Promise<void>;
    switchWorkspace: (orgId: string) => Promise<void>;
    renameWorkspace: (orgId: string, newName: string) => Promise<void>;
    workspaceAliases: Record<string, string>;
}

export interface TaskSlice {
    addTask: (task: Pick<Task, 'title'> & Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<EntityId>;
    updateTask: (id: EntityId, updates: Partial<Task>) => Promise<void>;
    updateStatus: (id: EntityId, status: TaskStatus) => Promise<void>;
    assignTask: (id: EntityId, assigneeIds: EntityId[]) => Promise<void>;
    toggleTaskStatus: (id: EntityId) => Promise<void>;
    deleteTask: (id: EntityId) => Promise<void>;
    clearCompletedTasks: () => Promise<void>;
    claimTask: (taskId: EntityId) => Promise<boolean>;
    unassignTask: (taskId: EntityId, userId: EntityId) => Promise<void>;
}

export interface ProjectSlice {
    addProject: (name: string, goal?: string, color?: string) => Promise<EntityId>;
    updateProject: (id: EntityId, updates: { name?: string; goal?: string; color?: string; status?: 'active' | 'archived' }) => Promise<void>;
    deleteProject: (id: EntityId) => Promise<void>;
}

export interface NoteSlice {
    addNote: (title: string, body: string) => Promise<EntityId>;
    updateNote: (id: EntityId, updates: Partial<Note>) => Promise<void>;
    deleteNote: (id: EntityId) => Promise<void>;
}

export interface HabitSlice {
    addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => Promise<EntityId>;
    deleteHabit: (id: EntityId) => Promise<void>;
}

export interface InboxSlice {
    addInboxItem: (text: string, source?: 'manual' | 'email' | 'system' | 'voice' | 'meeting') => Promise<void>;
    updateInboxItem: (id: EntityId, text: string) => Promise<void>;
    deleteInboxItem: (id: EntityId) => Promise<void>;
    deleteInboxItems: (ids: EntityId[]) => Promise<void>;
    convertInboxToTask: (inboxItemId: EntityId, taskData: Partial<Task>) => Promise<void>;
    convertInboxToNote: (inboxItemId: EntityId, title: string, body?: string) => Promise<void>;
}

export interface TeamSlice {
    fetchInvitations: () => Promise<void>;
    sendInvitation: (email: string, role: string, reportsTo?: string) => Promise<void>;
    revokeInvitation: (id: string) => Promise<void>;
    resendInvitation: (id: string) => Promise<void>;
    leaveTeam: () => Promise<void>;
    updateTeamMember: (memberId: string, updates: { role?: any; reportsTo?: string | null }) => Promise<void>;
    updateMemberRole: (memberId: string, role: string) => Promise<void>;
    removeTeamMember: (memberId: string) => Promise<void>;
    validateInvitation: (token: string) => Promise<any>;
    acceptInvitation: (token: string, userId: string) => Promise<void>;
    createOrganization: (name: string) => Promise<void>;
    approveInvitation: (id: string, role: string) => Promise<void>;
    rejectInvitation: (id: string) => Promise<void>;
    acceptPendingInvitation: (inviteId: string) => Promise<void>;
    declinePendingInvitation: (inviteId: string) => Promise<void>;
}

export interface ActivitySlice {
    logActivity: (taskId: EntityId, type: string, content: string, metadata?: any) => Promise<void>;
    updateActivity: (id: EntityId, content: string) => Promise<void>;
    fetchActivities: (taskId: EntityId) => Promise<void>;
}

export interface NotificationSlice {
    markNotificationRead: (id: EntityId) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    deleteNotification: (id: EntityId) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
    sendNotification: (userId: EntityId, type: 'mention' | 'assignment' | 'status_change' | 'system' | 'rejection', title: string, message: string, link?: string) => Promise<void>;
    sendEmail: (to: string, subject: string, html: string) => Promise<void>;
}

export interface AISlice {
    fetchAIContext: (userId: EntityId) => Promise<string>;
    updateAIContext: (userId: EntityId, context: string) => Promise<void>;
}

// Combined Store Type
export type Store = AppState &
    AuthSlice &
    TaskSlice &
    ProjectSlice &
    NoteSlice &
    HabitSlice &
    InboxSlice &
    TeamSlice &
    ActivitySlice &
    NotificationSlice &
    AISlice;

export type StoreSlice<T> = StateCreator<Store, [], [], T>;
