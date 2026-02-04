import type { StoreSlice, TaskSlice } from '../types';
import type { Task, TaskStatus } from '../../types';
import { supabase } from '../../supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { calculateNextDueDate, shouldRecur } from '../../recurrenceUtils';
import { activeToggles } from '../utils';

export const createTaskSlice: StoreSlice<TaskSlice> = (set, get) => ({
    addTask: async (taskData) => {
        const id = uuidv4();
        const userId = get().user?.id || 'unknown';
        const hasOtherAssignees = taskData.assigneeIds && taskData.assigneeIds.filter(id => id !== userId).length > 0;

        const task = {
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
            visibility: hasOtherAssignees ? 'team' : (taskData.visibility || 'private'),
            smartAnalysis: taskData.smartAnalysis,
            source: taskData.source,
            estimatedMinutes: taskData.estimatedMinutes,
            organizationId: get().user?.organizationId
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
            due_date: task.dueDate,
            tags: task.tags,
            created_at: task.createdAt,
            updated_at: new Date(task.updatedAt).toISOString(),
            user_id: task.ownerId,
            assignee_ids: task.assigneeIds,
            visibility: task.visibility,
            smart_analysis: task.smartAnalysis,
            source: task.source,
            estimated_minutes: task.estimatedMinutes,
            organization_id: task.organizationId
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

        // Log & Notify
        get().logActivity(id, 'creation', `Created task "${task.title}"`);

        // Notify assignees
        if (taskData.assigneeIds && taskData.assigneeIds.length > 0) {
            taskData.assigneeIds.forEach(uid => {
                get().sendNotification(uid, 'assignment', 'New Task Assigned', `You were assigned to "${taskData.title}"`, `/tasks?taskId=${id}`);
            });
        }

        return id;
    },

    updateTask: async (id, updates) => {
        const userId = get().user?.id;
        const oldTask = get().tasks[id];

        set(state => {
            const task = state.tasks[id];
            if (!task) return state;

            const targetAssigneeIds = updates.assigneeIds || task.assigneeIds || [];
            const hasOtherAssignees = targetAssigneeIds.filter(uid => uid !== userId).length > 0;

            const newVisibility = hasOtherAssignees ? 'team' : (updates.visibility || task.visibility);
            const finalUpdates = { ...updates, visibility: newVisibility };

            return { tasks: { ...state.tasks, [id]: { ...task, ...finalUpdates } } };
        });

        const dbUpdates: Record<string, any> = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
        if (updates.updatedAt !== undefined) dbUpdates.updated_at = new Date(updates.updatedAt).toISOString();
        if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
        if (updates.assigneeIds !== undefined) {
            dbUpdates.assignee_ids = updates.assigneeIds;
            const hasOthers = updates.assigneeIds.filter(uid => uid !== userId).length > 0;
            dbUpdates.visibility = hasOthers ? 'team' : 'private';
        }
        if (updates.visibility !== undefined) dbUpdates.visibility = updates.visibility;
        if (updates.smartAnalysis !== undefined) dbUpdates.smart_analysis = updates.smartAnalysis;
        if (updates.source !== undefined) dbUpdates.source = updates.source;
        if (updates.estimatedMinutes !== undefined) dbUpdates.estimated_minutes = updates.estimatedMinutes;
        if (updates.acceptedAt !== undefined) dbUpdates.accepted_at = updates.acceptedAt ? new Date(updates.acceptedAt).toISOString() : null;
        if (updates.acceptedBy !== undefined) dbUpdates.accepted_by = updates.acceptedBy;

        await supabase.from('tasks').update(dbUpdates).eq('id', id);

        // NOTIFICATION LOGIC
        if (updates.assigneeIds && updates.assigneeIds.length > 0) {
            const oldAssignees = new Set(oldTask?.assigneeIds || []);
            const newAssignees = updates.assigneeIds.filter(uid => !oldAssignees.has(uid));

            if (newAssignees.length > 0) {
                let displayTitle = oldTask?.title || updates.title;
                // If title is missing (not in store), fetch it
                if (!displayTitle) {
                    try {
                        const { data: taskData } = await supabase.from('tasks').select('title').eq('id', id).maybeSingle();
                        if (taskData) displayTitle = taskData.title;
                    } catch (err) {
                        console.warn('Could not fetch task title for notification:', err);
                    }
                }
                const finalTitle = displayTitle || 'Task';
                newAssignees.forEach(uid => {
                    get().sendNotification(uid, 'assignment', 'New Task Assigned', `You were assigned to "${finalTitle}"`, `/tasks?taskId=${id}`);
                });
            }
        }

        // RECURRENCE LOGIC
        if (oldTask && updates.status === 'done' && oldTask.status !== 'done') {
            const currentTask = get().tasks[id];
            if (currentTask.recurrence && shouldRecur(currentTask)) {
                const nextDueDate = calculateNextDueDate(currentTask.recurrence, currentTask.dueDate, Date.now());
                try {
                    await get().addTask({
                        title: currentTask.title,
                        description: currentTask.description,
                        priority: currentTask.priority,
                        projectId: currentTask.projectId,
                        tags: currentTask.tags,
                        assigneeIds: currentTask.assigneeIds,
                        estimatedMinutes: currentTask.estimatedMinutes,
                        source: 'system',
                        visibility: currentTask.visibility,
                        recurrence: currentTask.recurrence,
                        originalTaskId: currentTask.originalTaskId || currentTask.id,
                        dueDate: nextDueDate,
                        status: 'todo'
                    });
                } catch (err) {
                    console.error("Failed to generate recurring task:", err);
                }
            }
        }
    },

    updateStatus: async (id, status) => {
        const state = get();
        const task = state.tasks[id];
        if (!task) return;

        const oldStatus = task.status;
        const currentUserId = state.user?.id;

        let targetStatus = status;
        if (status === 'done' && task.ownerId !== currentUserId) {
            targetStatus = 'review';

        }

        const updates: Partial<Task> = {
            status: targetStatus,
            completedAt: targetStatus === 'done' ? Date.now() : undefined
        };

        await state.updateTask(id, updates);

        if (oldStatus !== targetStatus) {
            await state.logActivity(id, 'status_change', `Changed status to ${targetStatus.replace('_', ' ')}`, { old: oldStatus, new: targetStatus });

            if (targetStatus === 'review' && task.ownerId !== currentUserId) {
                state.sendNotification(task.ownerId, 'status_change', 'Task Ready for Review', `"${task.title}" is ready for your approval.`, `/tasks?taskId=${id}`);
            }

            if (oldStatus === 'review' && (targetStatus === 'in_progress' || targetStatus === 'todo')) {
                task.assigneeIds?.forEach(uid => {
                    if (uid !== currentUserId) {
                        state.sendNotification(uid, 'status_change', 'Task Returned for Revision', `"${task.title}" was returned by the owner.`, `/tasks?taskId=${id}`);
                    }
                });
            }
        }
    },

    assignTask: async (id, assigneeIds) => {
        const state = get();
        await state.updateTask(id, { assigneeIds });
        await state.logActivity(id, 'assignment', `Updated assignees`, { recipientIds: assigneeIds });

        const task = state.tasks[id];
        const currentUserId = state.user?.id;
        assigneeIds.forEach(uid => {
            if (uid !== currentUserId) {
                state.sendNotification(uid, 'assignment', 'Task Assigned', `You were assigned to "${task?.title}"`, `/tasks?taskId=${id}`);
            }
        });
    },

    toggleTaskStatus: async (id) => {
        const state = get();
        if (activeToggles.has(id)) {
            console.warn(`Duplicate toggle blocked for task ${id}`);
            return;
        }
        activeToggles.add(id);

        try {
            const task = state.tasks[id];
            if (!task) return;

            const currentUserId = state.user?.id;
            let newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';

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

            // Recurring Check for Toggle
            if (newStatus === 'done') {
                const { data: wasUpdated, error: rpcError } = await supabase.rpc('complete_task_atomic', { target_task_id: id });

                if (rpcError) {
                    console.error("Atomic toggle failed:", rpcError);
                    toast.error("Failed to sync status. Please check connection.");
                    set(state => ({ tasks: { ...state.tasks, [id]: { ...task } } })); // Revert
                    return;
                }

                if (!wasUpdated) {
                    console.warn("Task was already completed by another session. Skipping recurrence.");
                    return;
                }

                if (task.recurrence && shouldRecur(task)) {
                    const nextDueDate = calculateNextDueDate(task.recurrence, task.dueDate, Date.now());
                    try {
                        await state.addTask({
                            title: task.title,
                            description: task.description,
                            priority: task.priority,
                            projectId: task.projectId,
                            tags: task.tags,
                            assigneeIds: task.assigneeIds,
                            estimatedMinutes: task.estimatedMinutes,
                            source: 'system',
                            visibility: task.visibility,
                            recurrence: task.recurrence,
                            originalTaskId: task.originalTaskId || task.id,
                            dueDate: nextDueDate,
                            status: 'todo'
                        });
                        toast.success("Recurrence created for next cycle.");
                    } catch (e) {
                        toast.error("Failed to create recurring task.");
                    }
                }
            } else {
                await supabase.from('tasks').update({
                    status: newStatus,
                    completed_at: null,
                    updated_at: new Date().toISOString()
                }).eq('id', id);
            }

            if (newStatus === 'review' && task.ownerId !== currentUserId) {
                await state.logActivity(id, 'status_change', `Requested review (toggled from ${task.status})`);
                state.sendNotification(task.ownerId, 'status_change', 'Review Requested', `"${task.title}" was marked for review.`, `/tasks?taskId=${id}`);
                toast.success("Sent for review.");
            }
        } catch (e) {
            console.error(e);
            toast.error("An unexpected error occurred.");
        } finally {
            activeToggles.delete(id);
        }
    },

    deleteTask: async (id) => {
        set(state => {
            const { [id]: _, ...rest } = state.tasks;
            return { tasks: rest };
        });
        await supabase.from('tasks').delete().eq('id', id);
    },

    clearCompletedTasks: async () => {
        const state = get();
        const currentUserId = state.user?.id;
        if (!currentUserId) return;

        const completedTaskIds = Object.values(state.tasks)
            .filter(t => {
                if (t.status !== 'done') return false;
                const isOwner = t.ownerId === currentUserId;
                const isAssignee = t.assigneeIds && t.assigneeIds.includes(currentUserId);
                return isOwner || isAssignee;
            })
            .map(t => t.id);

        if (completedTaskIds.length === 0) return;

        const previousTasksFn = state.tasks;

        set(state => {
            const newTasks = { ...state.tasks };
            completedTaskIds.forEach(id => delete newTasks[id]);
            return { tasks: newTasks };
        });

        const { error } = await supabase.from('tasks').delete().in('id', completedTaskIds);

        if (error) {
            console.error("clearCompletedTasks: Failed to delete, rolling back.", error);
            set({ tasks: previousTasksFn });
        }
    },

    claimTask: async (taskId) => {
        const state = get();
        const userId = state.user?.id;
        if (!userId) {
            console.error("No user logged in to claim task");
            return false;
        }

        const { data, error } = await supabase.rpc('claim_task', { task_id: taskId, user_id: userId });

        if (error) {
            console.error("Error claiming task:", error);
            return false;
        }

        if (data && data.success) {
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
            get().logActivity(taskId, 'assignment', `Claimed/Accepted the task`);
            return true;
        }
        return false;
    },

    unassignTask: async (taskId, userId) => {
        const state = get();
        const task = state.tasks[taskId];
        if (!task) return;

        const previousTask = { ...task };
        const newAssignees = (task.assigneeIds || []).filter(id => id !== userId);
        const ownerId = task.ownerId;
        const hasOtherAssignees = newAssignees.filter(id => id !== ownerId).length > 0;
        const newVisibility = hasOtherAssignees ? 'team' : 'private';

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

        try {
            const { error } = await supabase.rpc('remove_task_assignee', { task_id: taskId, target_user_id: userId });
            if (error) throw error;

            const leavingUser = state.team[userId] || state.user;
            const leaverName = leavingUser?.name || 'A user';

            await state.logActivity(taskId, 'assignment', `${leaverName} left the task`);

            if (userId !== ownerId) {
                state.sendNotification(ownerId, 'assignment', 'Assignee Left', `${leaverName} removed themselves from "${task.title}"`, `/tasks?taskId=${taskId}`);
            }
        } catch (error: any) {
            console.error("Failed to unassign task:", error);
            toast.error("Failed to leave task: " + (error?.message || "Unknown error"));
            set(state => ({ tasks: { ...state.tasks, [taskId]: previousTask } }));
        }
    }
});
