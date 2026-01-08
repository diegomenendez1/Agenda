import { create } from 'zustand';
import { supabase } from './supabase';
import type { AppState, Task, EntityId, Note, UserProfile, TaskStatus, Habit } from './types';
import { v4 as uuidv4 } from 'uuid';

const hydrateTask = (t: any): Task => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    projectId: t.project_id,
    dueDate: t.due_date ? new Date(t.due_date).getTime() : undefined,
    tags: t.tags || [],
    createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
    updatedAt: t.updated_at ? new Date(t.updated_at).getTime() : (t.created_at ? new Date(t.created_at).getTime() : Date.now()),
    completedAt: t.completed_at ? new Date(t.completed_at).getTime() : undefined,
    ownerId: t.owner_id,
    visibility: t.visibility,
    assigneeIds: t.assignee_ids || [],
    smartAnalysis: t.smart_analysis,
    source: t.source,
    estimatedMinutes: t.estimated_minutes,
    acceptedAt: t.accepted_at ? new Date(t.accepted_at).getTime() : undefined,
});

interface Actions {
    // Sync
    initialize: () => Promise<void>;

    // Inbox
    addInboxItem: (text: string, source?: 'manual' | 'email' | 'system' | 'voice') => Promise<void>;
    deleteInboxItem: (id: EntityId) => Promise<void>;

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
    sendNotification: (userId: EntityId, type: 'mention' | 'assignment' | 'status_change' | 'system', title: string, message: string, link?: string) => Promise<void>;
    claimTask: (taskId: EntityId) => Promise<boolean>;
    toggleFocusMode: () => void;
}

type Store = AppState & Actions;

export const useStore = create<Store>((set, get) => ({
    user: null,
    team: {},
    inbox: {},
    tasks: {},
    projects: {},
    notes: {},
    focusBlocks: {},
    habits: {},
    activities: {}, // Activity Logs
    notifications: {}, // Notifications
    isFocusMode: false,


    toggleFocusMode: () => set(state => ({ isFocusMode: !state.isFocusMode })),

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
                createdAt: i.created_at ? new Date(i.created_at).getTime() : Date.now()
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
                createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
                deadline: p.deadline ? new Date(p.deadline).getTime() : undefined
            }
        });

        const notes: Record<string, any> = {};
        (notesRes.data as any[])?.forEach((n: any) => {
            notes[n.id] = {
                ...n,
                projectId: n.project_id,
                createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
                updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now()
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
                createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now()
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
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
                const n = payload.new;
                const currentUserId = get().user?.id;
                // Only process if it's for me
                if (n.user_id !== currentUserId) return;

                const notification = {
                    ...n,
                    userId: n.user_id,
                    createdAt: new Date(n.created_at).getTime()
                };
                set(state => ({ notifications: { ...state.notifications, [n.id]: notification } }));
            })
            .subscribe();
    },

    addInboxItem: async (text, source = 'manual') => {
        const id = uuidv4();
        // Optimistic
        const newItem = { id, text, source, processed: false, createdAt: Date.now() };
        set(state => ({ inbox: { ...state.inbox, [id]: newItem as any } }));

        const { error } = await supabase.from('inbox_items').insert({ id, text, source });
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

    addTask: async (taskData) => {
        const id = uuidv4();
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
            ownerId: get().user?.id || 'unknown',
            assigneeIds: taskData.assigneeIds || [],
            visibility: (taskData.assigneeIds && taskData.assigneeIds.length > 0) ? 'team' : (taskData.visibility || 'private'),
            smartAnalysis: taskData.smartAnalysis,
            source: taskData.source,
            estimatedMinutes: taskData.estimatedMinutes
        };

        // Optimistic update
        set(state => ({ tasks: { ...state.tasks, [id]: task } }));

        // Log Activity (Automatic)
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

        const { error } = await supabase.from('tasks').insert({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            project_id: task.projectId,
            due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
            tags: task.tags,
            created_at: new Date(task.createdAt).toISOString(),
            updated_at: new Date(task.updatedAt).toISOString(),
            owner_id: task.ownerId,
            assignee_ids: task.assigneeIds,
            visibility: task.visibility,
            smart_analysis: task.smartAnalysis,
            source: task.source,
            estimated_minutes: task.estimatedMinutes
        });

        if (error) console.error(error);

        return id;
    },

    updateTask: async (id, updates) => {
        // Optimistic
        set(state => {
            const task = state.tasks[id];
            if (!task) return state;

            // If assigning to someone, it implies sharing with the team (if list is not empty)
            const newVisibility = (updates.assigneeIds && updates.assigneeIds.length > 0) ? 'team' : (updates.visibility || task.visibility);
            const finalUpdates = { ...updates, visibility: newVisibility };

            return { tasks: { ...state.tasks, [id]: { ...task, ...finalUpdates } } };
        });

        const dbUpdates: any = { ...updates };
        if (updates.assigneeIds) {
            dbUpdates.assignee_ids = updates.assigneeIds;
            dbUpdates.visibility = (updates.assigneeIds.length > 0) ? 'team' : dbUpdates.visibility;
            delete dbUpdates.assigneeIds;
        }
        if (updates.visibility) dbUpdates.visibility = updates.visibility;
        if (updates.projectId) {
            dbUpdates.project_id = updates.projectId;
            delete dbUpdates.projectId;
        }
        if (updates.acceptedAt) {
            dbUpdates.accepted_at = new Date(updates.acceptedAt).toISOString();
            delete dbUpdates.acceptedAt;
        }
        await supabase.from('tasks').update(dbUpdates).eq('id', id);

        // Notify new assignees logic could go here similar to addTask
        // Simplified: The caller of updateTask/assignTask usually handles specific notifications or we can hook it here. 
        // For now, let's keep it simple and let distinct actions handle it or triggers.
    },

    updateStatus: async (id, status) => {
        const state = get();
        const oldStatus = state.tasks[id]?.status;
        await state.updateTask(id, { status, completedAt: status === 'done' ? Date.now() : undefined });

        if (oldStatus !== status) {
            await state.logActivity(id, 'status_change', `Changed status to ${status.replace('_', ' ')}`, { old: oldStatus, new: status });
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
        const newStatus = task.status === 'done' ? 'todo' : 'done';

        // Optimistic
        set(state => ({
            tasks: {
                ...state.tasks,
                [id]: { ...task, status: newStatus as any, completedAt: newStatus === 'done' ? Date.now() : undefined, updatedAt: Date.now() }
            }
        }));

        await supabase.from('tasks').update({ status: newStatus, completed_at: newStatus === 'done' ? Date.now() : null, updated_at: new Date().toISOString() }).eq('id', id);
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
        // Optimistic
        const newProject = { id, name, goal, color, status: 'active', created_at: Date.now() };
        set(state => ({ projects: { ...state.projects, [id]: newProject as any } }));

        await supabase.from('projects').insert({ id, name, goal, color });
        return id;
    },

    addNote: async (title, body) => {
        const id = uuidv4();
        // Optimistic
        const newNote = { id, title, body, created_at: Date.now(), updated_at: Date.now(), tags: [] };
        set(state => ({ notes: { ...state.notes, [id]: newNote as any } }));

        await supabase.from('notes').insert({ id, title, body });
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
            ...taskData, // Pass all fields including assigneeId
            title: taskData.title || inboxItem.text,
            status: 'backlog'
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

    sendNotification: async (userId, type, title, message, link) => {
        const id = uuidv4();
        const notification = {
            id,
            userId,
            type,
            title,
            message,
            link,
            read: false,
            createdAt: Date.now()
        };

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
        } else {
            // Task likely already taken
            // Refresh the specific task to see the new assignee
            const { data: updatedTask } = await supabase.from('tasks').select('*').eq('id', taskId).single();
            if (updatedTask) {
                const hydrated = hydrateTask(updatedTask);
                set(state => ({ tasks: { ...state.tasks, [taskId]: hydrated } }));
            }
            return false;
        }
    }
}));
