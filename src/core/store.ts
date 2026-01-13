import { create } from 'zustand';
import { supabase } from './supabase';
import type { AppState, Task, EntityId, Note, UserProfile, TaskStatus, Habit } from './types';
import { v4 as uuidv4 } from 'uuid';

const toSeconds = (ms?: number) => ms ? Math.round(ms / 1000) : null;
const fromSeconds = (s?: any) => {
    if (!s) return undefined;
    const num = Number(s);
    // Safety check: if it looks like MS (year > 3000), treat as MS, else Seconds
    return num > 100000000000 ? num : num * 1000;
};

const hydrateTask = (t: any): Task => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    projectId: t.project_id,
    dueDate: fromSeconds(t.due_date), // BIGINT
    tags: t.tags || [],
    createdAt: fromSeconds(t.created_at) || Date.now(), // BIGINT
    updatedAt: t.updated_at ? new Date(t.updated_at).getTime() : Date.now(), // TIMESTAMPTZ (String -> Number for App)
    completedAt: fromSeconds(t.completed_at), // BIGINT
    ownerId: t.user_id, // Fixed: Map DB 'user_id' into app 'ownerId'
    visibility: t.visibility,
    assigneeIds: t.assignee_ids || [],
    smartAnalysis: t.smart_analysis,
    source: t.source,
    estimatedMinutes: t.estimated_minutes,
    acceptedAt: fromSeconds(t.accepted_at),
});

interface Actions {
    // Sync
    initialize: () => Promise<void>;

    // Inbox
    addInboxItem: (text: string, source?: 'manual' | 'email' | 'system' | 'voice') => Promise<void>;
    updateInboxItem: (id: EntityId, text: string) => Promise<void>;
    deleteInboxItem: (id: EntityId) => Promise<void>;
    deleteInboxItems: (ids: EntityId[]) => Promise<void>;

    // Tasks
    addTask: (task: Pick<Task, 'title'> & Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<EntityId>;
    updateTask: (id: EntityId, updates: Partial<Task>) => Promise<void>;
    updateStatus: (id: EntityId, status: TaskStatus) => Promise<void>;
    assignTask: (id: EntityId, assigneeIds: EntityId[]) => Promise<void>;
    toggleTaskStatus: (id: EntityId) => Promise<void>;
    deleteTask: (id: EntityId) => Promise<void>;
    clearCompletedTasks: () => Promise<void>;

    // Projects
    addProject: (name: string, goal?: string, color?: string) => Promise<EntityId>;

    // Notes
    addNote: (title: string, body: string) => Promise<EntityId>;
    updateNote: (id: EntityId, updates: Partial<Note>) => Promise<void>;
    deleteNote: (id: EntityId) => Promise<void>;

    // Habits - NEW
    addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => Promise<EntityId>;
    deleteHabit: (id: EntityId) => Promise<void>;

    // Processing
    convertInboxToTask: (inboxItemId: EntityId, taskData: Partial<Task>) => Promise<void>;
    convertInboxToNote: (inboxItemId: EntityId, title: string, body?: string) => Promise<void>;

    // User
    updateUserProfile: (profile: UserProfile) => Promise<void>;

    // Activities
    logActivity: (taskId: EntityId, type: string, content: string, metadata?: any) => Promise<void>;
    fetchActivities: (taskId: EntityId) => Promise<void>;

    // Notifications
    markNotificationRead: (id: EntityId) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    deleteNotification: (id: EntityId) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
    sendNotification: (userId: EntityId, type: 'mention' | 'assignment' | 'status_change' | 'system', title: string, message: string, link?: string) => Promise<void>;
    claimTask: (taskId: EntityId) => Promise<boolean>;
    unassignTask: (taskId: EntityId, userId: EntityId) => Promise<void>;
}

type Store = AppState & Actions;

export const useStore = create<Store>((set, get) => ({
    user: null,
    team: {},
    inbox: {},
    tasks: {},
    projects: {},
    notes: {},
    habits: {},
    activities: {}, // Activity Logs
    notifications: {}, // Notifications
    onlineUsers: [], // Real-time presence

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
        const [inboxRes, tasksRes, projectsRes, notesRes, teamRes, notificationsRes] = await Promise.all([
            supabase.from('inbox_items').select('*'),
            supabase.from('tasks').select('*'),
            supabase.from('projects').select('*'),
            supabase.from('notes').select('*'),
            supabase.from('profiles').select('*'),
            supabase.from('notifications').select('*').eq('user_id', user.id) // Only own notifications
        ]);

        const inbox: Record<string, any> = {};
        (inboxRes.data as any[])?.forEach((i: any) => {
            inbox[i.id] = {
                ...i,
                createdAt: i.created_at ? fromSeconds(i.created_at) || Date.now() : Date.now()
            };
        });

        const tasks: Record<string, any> = {};
        (tasksRes.data as any[])?.forEach((t: any) => {
            tasks[t.id] = hydrateTask(t);
        });

        const projects: Record<string, any> = {};
        (projectsRes.data as any[])?.forEach((p: any) => {
            projects[p.id] = {
                ...p,
                createdAt: p.created_at ? fromSeconds(p.created_at) || Date.now() : Date.now(),
                deadline: fromSeconds(p.deadline)
            }
        });

        const notes: Record<string, any> = {};
        (notesRes.data as any[])?.forEach((n: any) => {
            notes[n.id] = {
                ...n,
                projectId: n.project_id,
                createdAt: fromSeconds(n.created_at) || Date.now(),
                updatedAt: fromSeconds(n.updated_at) || Date.now()
            };
        });

        const team: Record<string, any> = {};
        (teamRes.data as any[])?.forEach((t: any) => {
            team[t.id] = {
                id: t.id,
                name: t.full_name,
                email: t.email,
                role: t.role,
                avatar: t.avatar_url
            };
        });

        const notifications: Record<string, any> = {};
        (notificationsRes.data as any[])?.forEach((n: any) => {
            notifications[n.id] = {
                ...n,
                userId: n.user_id,
                createdAt: n.created_at ? fromSeconds(n.created_at) || Date.now() : Date.now()
            };
        });


        set({ inbox, tasks, projects, notes, team, notifications });

        // Enable Realtime Subscriptions
        supabase
            .channel('public:everything')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: any) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const hydrated = hydrateTask(payload.new);
                    set(state => ({ tasks: { ...state.tasks, [hydrated.id]: hydrated } }));
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload: any) => {
                const p = payload.new;
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    set(state => ({ projects: { ...state.projects, [p.id]: p } }));
                } else if (payload.eventType === 'DELETE') {
                    set(state => {
                        const { [payload.old.id]: _, ...rest } = state.projects;
                        return { projects: rest };
                    });
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload: any) => {
                const n = payload.new;
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    set(state => ({ notes: { ...state.notes, [n.id]: { ...n, projectId: n.project_id } } }));
                } else if (payload.eventType === 'DELETE') {
                    set(state => {
                        const { [payload.old.id]: _, ...rest } = state.notes;
                        return { notes: rest };
                    });
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
                const p = payload.new;
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    // Update team state
                    set(state => ({
                        team: {
                            ...state.team,
                            [p.id]: {
                                id: p.id,
                                name: p.full_name,
                                email: p.email,
                                role: p.role,
                                avatar: p.avatar_url
                            }
                        }
                    }));
                    // If it's the current user, update 'user' state too
                    const currentUser = get().user;
                    if (currentUser && currentUser.id === p.id) {
                        set({ user: { ...currentUser, name: p.full_name, role: p.role, avatar: p.avatar_url } });
                    }
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload: any) => {
                const n = payload.new;
                const currentUserId = get().user?.id;

                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    // Only process if it's for me
                    if (n.user_id !== currentUserId) return;

                    const notification = {
                        ...n,
                        userId: n.user_id,
                        createdAt: n.created_at ? fromSeconds(n.created_at) || Date.now() : Date.now()
                    };
                    set(state => ({ notifications: { ...state.notifications, [n.id]: notification } }));
                } else if (payload.eventType === 'DELETE') {
                    set(state => {
                        const { [payload.old.id]: _, ...rest } = state.notifications;
                        return { notifications: rest };
                    });
                }
            })
            .subscribe();

        // Presence Logic
        const presenceChannel = supabase.channel('online-users');

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel.presenceState();
                const onlineIds = Object.keys(newState);
                set({ onlineUsers: onlineIds });
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                // key is usually the userId if we set it as such, or a session ID.
                // Supabase presence state uses optional 'user_id' in payload?
                // Let's rely on syncing the full state for simplicity or tracking joins.
                // Actually, 'sync' covers everything eventually, but 'join' is faster for instant feedback.
                set((state) => {
                    const newIds = newPresences.map((p: any) => p.user_id).filter(Boolean);
                    // Avoid duplicates
                    const updated = Array.from(new Set([...state.onlineUsers, ...newIds]));
                    return { onlineUsers: updated };
                });
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                set((state) => {
                    const leftIds = leftPresences.map((p: any) => p.user_id);
                    const updated = state.onlineUsers.filter(id => !leftIds.includes(id));
                    return { onlineUsers: updated };
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track myself
                    await presenceChannel.track({
                        user_id: user.id,
                        online_at: new Date().toISOString(),
                    });
                }
            });
    },

    addInboxItem: async (text, source = 'manual') => {
        const id = uuidv4();
        // Optimistic
        const newItem = { id, text, source, processed: false, createdAt: Date.now() };
        set(state => ({ inbox: { ...state.inbox, [id]: newItem as any } }));
        const userId = get().user?.id;
        const { error } = await supabase.from('inbox_items').insert({
            id,
            text,
            source,
            user_id: userId,
            created_at: newItem.createdAt // BIGINT (Number)
        });
        if (error) {
            console.error(error);
            // Rollback could be implemented here
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

    addTask: async (taskData) => {
        const id = uuidv4();
        const userId = get().user?.id || 'unknown';
        const task: any = {
            id,
            title: taskData.title,
            description: taskData.description,
            status: taskData.status || 'backlog',
            priority: taskData.priority || 'medium',
            projectId: taskData.projectId,
            dueDate: taskData.dueDate,
            tags: taskData.tags || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ownerId: userId,
            assigneeIds: taskData.assigneeIds || [],
            visibility: (taskData.assigneeIds && taskData.assigneeIds.filter(id => id !== userId).length > 0) ? 'team' : (taskData.visibility || 'private'),
            smartAnalysis: taskData.smartAnalysis,
            source: taskData.source,
            estimatedMinutes: taskData.estimatedMinutes
        };

        // Optimistic update
        set(state => ({ tasks: { ...state.tasks, [id]: task } }));

        const { error } = await supabase.from('tasks').insert({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            project_id: task.projectId,
            due_date: task.dueDate, // BIGINT (Number)
            tags: task.tags,
            created_at: task.createdAt, // BIGINT (Number)
            updated_at: new Date(task.updatedAt).toISOString(), // TIMESTAMPTZ (String)
            user_id: task.ownerId,
            assignee_ids: task.assigneeIds,
            visibility: task.visibility,
            smart_analysis: task.smartAnalysis,
            source: task.source,
            estimated_minutes: task.estimatedMinutes
        });

        if (error) {
            console.error("Failed to persist task:", error);
            // Rollback optimistic update
            set(state => {
                const { [id]: _, ...rest } = state.tasks;
                return { tasks: rest };
            });
            throw error;
        }

        // 3. PERSISTED ACTIONS (Log & Notify only after DB success)
        get().logActivity(id, 'creation', `Created task "${task.title}"`);

        // Notify assignees (if any)
        if (taskData.assigneeIds && taskData.assigneeIds.length > 0) {
            const currentUserId = get().user?.id;
            taskData.assigneeIds.forEach(uid => {
                if (uid !== currentUserId) {
                    get().sendNotification(uid, 'assignment', 'New Task Assigned', `You were assigned to "${taskData.title}"`, `/tasks/${id}`);
                }
            });
        }

        return id;
    },

    updateTask: async (id, updates) => {
        set(state => {
            const task = state.tasks[id];
            if (!task) return state;

            // If assigning to someone, it implies sharing with the team (if list is not empty)
            const newVisibility = (updates.assigneeIds && updates.assigneeIds.length > 0) ? 'team' : (updates.visibility || task.visibility);
            const finalUpdates = { ...updates, visibility: newVisibility };

            return { tasks: { ...state.tasks, [id]: { ...task, ...finalUpdates } } };
        });

        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate; // BIGINT (Number)
        if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
        if (updates.updatedAt !== undefined) dbUpdates.updated_at = new Date(updates.updatedAt).toISOString(); // TIMESTAMPTZ (String)
        if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt; // BIGINT (Number)
        if (updates.assigneeIds !== undefined) {
            dbUpdates.assignee_ids = updates.assigneeIds;
            const currentUserId = get().user?.id;
            const hasOthers = updates.assigneeIds.filter(id => id !== currentUserId).length > 0;
            if (hasOthers) dbUpdates.visibility = 'team';
        }
        if (updates.visibility !== undefined) dbUpdates.visibility = updates.visibility;
        if (updates.smartAnalysis !== undefined) dbUpdates.smart_analysis = updates.smartAnalysis;
        if (updates.source !== undefined) dbUpdates.source = updates.source;
        if (updates.estimatedMinutes !== undefined) dbUpdates.estimated_minutes = updates.estimatedMinutes;
        if (updates.acceptedAt !== undefined) dbUpdates.accepted_at = updates.acceptedAt ? new Date(updates.acceptedAt).toISOString() : null;

        await supabase.from('tasks').update(dbUpdates).eq('id', id);

        // Notify new assignees logic could go here similar to addTask
        // Simplified: The caller of updateTask/assignTask usually handles specific notifications or we can hook it here.
        // For now, let's keep it simple and let distinct actions handle it or triggers.
    },

    updateStatus: async (id, status) => {
        const state = get();
        const task = state.tasks[id];
        if (!task) return;

        const oldStatus = task.status;
        const currentUserId = state.user?.id;

        // REFINEMENT: If a non-owner tries to move to 'done', force it to 'review' instead
        let targetStatus = status;
        if (status === 'done' && task.ownerId !== currentUserId) {
            targetStatus = 'review';
            console.log(`Forcing status to 'review' because user ${currentUserId} is not the owner ${task.ownerId}`);
        }

        await state.updateTask(id, {
            status: targetStatus,
            completedAt: targetStatus === 'done' ? Date.now() : undefined
        });

        if (oldStatus !== targetStatus) {
            await state.logActivity(id, 'status_change', `Changed status to ${targetStatus.replace('_', ' ')}`, { old: oldStatus, new: targetStatus });

            // Notify owner if moved to review
            if (targetStatus === 'review' && task.ownerId !== currentUserId) {
                state.sendNotification(
                    task.ownerId,
                    'status_change',
                    'Task Ready for Review',
                    `"${task.title}" is ready for your approval.`,
                    `/tasks/${id}`
                );
            }
        }
    },

    assignTask: async (id, assigneeIds) => {
        const state = get();
        await state.updateTask(id, { assigneeIds });
        await state.logActivity(id, 'assignment', `Updated assignees`, { recipientIds: assigneeIds });

        // Phase 2: Notify
        const task = state.tasks[id];
        const currentUserId = state.user?.id;
        assigneeIds.forEach(uid => {
            if (uid !== currentUserId) {
                state.sendNotification(uid, 'assignment', 'Task Assigned', `You were assigned to "${task?.title}"`, `/tasks/${id}`);
            }
        });
    },

    toggleTaskStatus: async (id) => {
        const state = get();
        const task = state.tasks[id];
        if (!task) return;

        const currentUserId = state.user?.id;
        let newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';

        // REFINEMENT: If non-owner toggles, it goes to 'review' instead of 'done'
        if (newStatus === 'done' && task.ownerId !== currentUserId) {
            newStatus = 'review';
        }

        // Optimistic
        set(state => ({
            tasks: {
                ...state.tasks,
                [id]: {
                    ...task,
                    status: newStatus,
                    completedAt: newStatus === 'done' ? Date.now() : undefined,
                    updatedAt: Date.now()
                }
            }
        }));

        const completedAt = newStatus === 'done' ? Date.now() : null;
        const updatedAt = Date.now();

        await supabase.from('tasks').update({
            status: newStatus,
            completed_at: completedAt,
            updated_at: new Date(updatedAt).toISOString()
        }).eq('id', id);

        if (newStatus === 'review' && task.ownerId !== currentUserId) {
            await state.logActivity(id, 'status_change', `Requested review (toggled from ${task.status})`);
            state.sendNotification(
                task.ownerId,
                'status_change',
                'Review Requested',
                `"${task.title}" was marked for review.`,
                `/tasks/${id}`
            );
        }
    },

    deleteTask: async (id) => {
        // Optimistic
        set(state => {
            const { [id]: _, ...rest } = state.tasks;
            return { tasks: rest };
        });
        await supabase.from('tasks').delete().eq('id', id);
    },

    clearCompletedTasks: async () => {
        const state = get();
        const completedTaskIds = Object.values(state.tasks)
            .filter(t => t.status === 'done' && (t.ownerId === state.user?.id)) // Only delete own completed tasks or generally all completed?
            // Better safety: only delete tasks visible to the user that are done.
            // Even safer: Only delete tasks owned by the user.
            // Logic: Filter tasks that are completed.
            .map(t => t.id);

        if (completedTaskIds.length === 0) return;

        // Optimistic
        set(state => {
            const newTasks = { ...state.tasks };
            completedTaskIds.forEach(id => delete newTasks[id]);
            return { tasks: newTasks };
        });

        await supabase.from('tasks').delete().in('id', completedTaskIds);
    },

    addProject: async (name, goal, color = '#6366f1') => {
        const id = uuidv4();
        const now = Date.now();
        // Optimistic
        const newProject = { id, name, goal, color, status: 'active', createdAt: now };
        set(state => ({ projects: { ...state.projects, [id]: newProject as any } }));
        const userId = get().user?.id;
        await supabase.from('projects').insert({
            id,
            name,
            goal,
            color,
            user_id: userId,
            created_at: toSeconds(now)
        });
        return id;
    },

    addNote: async (title, body) => {
        const id = uuidv4();
        const now = Date.now();
        // Optimistic
        const newNote = { id, title, body, createdAt: now, updatedAt: now, tags: [] };
        set(state => ({ notes: { ...state.notes, [id]: newNote as any } }));
        const userId = get().user?.id;
        await supabase.from('notes').insert({
            id,
            title,
            body,
            user_id: userId,
            created_at: now, // BIGINT (Number)
            updated_at: new Date(now).toISOString() // TIMESTAMPTZ (String)
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

        const dbUpdates: any = { ...updates };
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

    addHabit: async (habitData) => {
        const id = uuidv4();
        const newHabit: any = {
            id,
            ...habitData,
            createdAt: Date.now()
        };
        // Optimistic only for now (until backend table is created)
        set(state => ({ habits: { ...state.habits, [id]: newHabit } }));
        return id;
    },

    deleteHabit: async (id) => {
        set(state => {
            const { [id]: _, ...rest } = state.habits;
            return { habits: rest };
        });
    },

    convertInboxToTask: async (inboxItemId, taskData) => {
        const state = get();
        const inboxItem = state.inbox[inboxItemId];
        if (!inboxItem) return;

        // Uses optimistic methods internally
        await state.addTask({
            ...taskData, // Pass all fields including assigneeId and status
            title: taskData.title || inboxItem.text,
            // status is now handled by taskData or defaults to 'backlog' in addTask
        });

        await state.deleteInboxItem(inboxItemId);
    },

    convertInboxToNote: async (inboxItemId, title, body) => {
        const state = get();
        // Uses optimistic methods internally
        await state.addNote(title, body || '');
        await state.deleteInboxItem(inboxItemId);
    },

    updateUserProfile: async (profile) => {
        // Optimistic update
        set({ user: profile });

        const { error } = await supabase.from('profiles').update({
            full_name: profile.name,
            role: profile.role,
            preferences: profile.preferences
        }).eq('id', profile.id);

        if (error) {
            console.error("Failed to update profile:", error);
            // Optionally revert state here if needed
        }
    },

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
                            `/tasks/${taskId}`
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
            Object.keys(updated).forEach(k => updated[k].read = true);
            return { notifications: updated };
        });
        await supabase.from('notifications').update({ read: true }).eq('user_id', get().user?.id);
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


        // We don't necessarily update local state if it's for someone else
        // But if it's for me (testing), I might want to?
        // Actually, realtime subscription will handle the update if it's for me.

        await supabase.from('notifications').insert({
            id,
            user_id: userId,
            type,
            title,
            message,
            link,
            read: false
        });
    },

    claimTask: async (taskId) => {
        const state = get();
        const userId = state.user?.id;
        if (!userId) {
            console.error("No user logged in to claim task");
            return false;
        }

        // Call database RPC for atomic locking
        const { data, error } = await supabase.rpc('claim_task', {
            task_id: taskId,
            user_id: userId
        });

        if (error) {
            console.error("Error claiming task:", error);
            return false;
        }

        if (data && data.success) {
            // Optimistic / Local update after success
            set(state => ({
                tasks: {
                    ...state.tasks,
                    [taskId]: {
                        ...state.tasks[taskId],
                        assigneeIds: [userId],
                        status: 'todo',
                        acceptedAt: Date.now(),
                        updatedAt: Date.now()
                    }
                }
            }));

            // Log activity
            get().logActivity(taskId, 'assignment', `Claimed/Accepted the task`);

            return true;
        }

        return false;
    },

    unassignTask: async (taskId, userId) => {
        const state = get();
        const task = state.tasks[taskId];
        if (!task) return;

        // Filter out the user
        const newAssignees = (task.assigneeIds || []).filter(id => id !== userId);

        // Determine new visibility
        // If there are still OTHER assignees (besides owner), it stays 'team'.
        // If the only person left is the owner (or no one), it effectively becomes private to the owner unless explicitly set otherwise.
        // However, we usually keep 'team' if there are multiple people.
        // If assignees is empty, it's effectively private or backlog.
        // Let's refine: If assigneeIds is empty, visibility could be 'private'.
        // But if the owner wants it shared, they might have set it manually? 
        // For now, let's stick to the rule: if assigneeIds has people != ownerId, it's team. Else private.
        const ownerId = task.ownerId;
        const hasOtherAssignees = newAssignees.filter(id => id !== ownerId).length > 0;
        const newVisibility = hasOtherAssignees ? 'team' : 'private';

        // Optimistic Update
        set(state => ({
            tasks: {
                ...state.tasks,
                [taskId]: {
                    ...task,
                    assigneeIds: newAssignees,
                    visibility: newVisibility,
                    updatedAt: Date.now()
                }
            }
        }));

        // Database Update
        await supabase.from('tasks').update({
            assignee_ids: newAssignees,
            visibility: newVisibility,
            updated_at: new Date().toISOString()
        }).eq('id', taskId);

        // Activity Log
        // Get user name for better log
        const leavingUser = state.team[userId] || state.user;
        const leaverName = leavingUser?.name || 'A user';

        await state.logActivity(taskId, 'assignment', `${leaverName} left the task`);

        // Notify Owner if the one leaving is not the owner
        if (userId !== ownerId) {
            state.sendNotification(
                ownerId,
                'assignment',
                'Assignee Left',
                `${leaverName} removed themselves from "${task.title}"`,
                `/tasks/${taskId}`
            );
        }
    }
}));

