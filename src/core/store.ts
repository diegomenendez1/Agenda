import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { AppState, Task, EntityId, Note } from './types';

interface Actions {
    // Inbox
    addInboxItem: (text: string) => void;
    deleteInboxItem: (id: EntityId) => void;

    // Tasks
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'tagIds' | 'status'>) => EntityId;
    updateTask: (id: EntityId, updates: Partial<Task>) => void;
    toggleTaskStatus: (id: EntityId) => void;
    deleteTask: (id: EntityId) => void;

    // Projects
    addProject: (name: string, goal?: string) => EntityId;

    // Notes
    addNote: (title: string, body: string) => EntityId;
    updateNote: (id: EntityId, updates: Partial<Note>) => void;
    deleteNote: (id: EntityId) => void;

    // Processing
    convertInboxToTask: (inboxItemId: EntityId, taskData: Partial<Task>) => void;
    convertInboxToNote: (inboxItemId: EntityId, title: string, body?: string) => void;
}

type Store = AppState & Actions;

export const useStore = create<Store>()(
    persist(
        (set, get) => ({
            inbox: {},
            tasks: {},
            projects: {},
            notes: {},
            focusBlocks: {},

            addInboxItem: (text) => set((state) => {
                const id = uuidv4();
                return {
                    inbox: {
                        ...state.inbox,
                        [id]: { id, text, createdAt: Date.now() },
                    },
                };
            }),

            deleteInboxItem: (id) => set((state) => {
                const { [id]: _, ...rest } = state.inbox;
                return { inbox: rest };
            }),

            addTask: (taskData) => {
                const id = uuidv4();
                set((state) => ({
                    tasks: {
                        ...state.tasks,
                        [id]: {
                            ...taskData,
                            id,
                            status: 'pending',
                            tagIds: [],
                            createdAt: Date.now(),
                        },
                    },
                }));
                return id;
            },

            updateTask: (id, updates) => set((state) => ({
                tasks: {
                    ...state.tasks,
                    [id]: { ...state.tasks[id], ...updates },
                },
            })),

            toggleTaskStatus: (id) => set((state) => {
                const task = state.tasks[id];
                const newStatus = task.status === 'done' ? 'pending' : 'done';
                return {
                    tasks: {
                        ...state.tasks,
                        [id]: {
                            ...task,
                            status: newStatus,
                            completedAt: newStatus === 'done' ? Date.now() : undefined
                        },
                    },
                };
            }),

            deleteTask: (id) => set((state) => {
                const { [id]: _, ...rest } = state.tasks;
                return { tasks: rest };
            }),

            addProject: (name, goal) => {
                const id = uuidv4();
                set((state) => ({
                    projects: {
                        ...state.projects,
                        [id]: {
                            id,
                            name,
                            goal,
                            status: 'active',
                            createdAt: Date.now()
                        }
                    }
                }));
                return id;
            },

            addNote: (title, body) => {
                const id = uuidv4();
                set((state) => ({
                    notes: {
                        ...state.notes,
                        [id]: {
                            id,
                            title,
                            body,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        }
                    }
                }));
                return id;
            },

            updateNote: (id, updates) => set((state) => ({
                notes: {
                    ...state.notes,
                    [id]: {
                        ...state.notes[id],
                        ...updates,
                        updatedAt: Date.now()
                    },
                },
            })),

            deleteNote: (id) => set((state) => {
                const { [id]: _, ...rest } = state.notes;
                return { notes: rest };
            }),

            convertInboxToTask: (inboxItemId, taskData) => {
                const state = get();
                const inboxItem = state.inbox[inboxItemId];
                if (!inboxItem) return;

                // Create task based on inbox text if title not provided
                state.addTask({
                    title: taskData.title || inboxItem.text,
                    priority: taskData.priority || 4,
                    projectId: taskData.projectId,
                    dueDate: taskData.dueDate
                });

                state.deleteInboxItem(inboxItemId);
            },

            convertInboxToNote: (inboxItemId, title, body) => {
                const state = get();
                // Ensure inbox item exists before processing, though we mainly need the ID to delete it
                if (!state.inbox[inboxItemId]) return;

                state.addNote(title, body || '');
                state.deleteInboxItem(inboxItemId);
            }

        }),
        {
            name: 'volatile-event-storage',
        }
    )
);
