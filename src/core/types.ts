export type EntityId = string;

export type Priority = 1 | 2 | 3 | 4; // 1 = Critical, 4 = Low

export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type ProjectStatus = 'active' | 'paused' | 'archived';

export interface InboxItem {
    id: EntityId;
    text: string;
    createdAt: number;
}

export interface Task {
    id: EntityId;
    title: string;
    status: TaskStatus;
    priority: Priority;
    projectId?: EntityId;
    dueDate?: number; // timestamp
    tagIds: EntityId[];
    createdAt: number;
    completedAt?: number;
}

export interface Project {
    id: EntityId;
    name: string;
    status: ProjectStatus;
    goal?: string;
    createdAt: number;
}

export interface Note {
    id: EntityId;
    title: string;
    body: string; // Markdown supported
    projectId?: EntityId;
    taskId?: EntityId;
    createdAt: number;
    updatedAt: number;
}

export interface FocusBlock {
    id: EntityId;
    taskId: EntityId;
    startTime: number;
    durationMinutes: number;
}

export interface AppState {
    inbox: Record<EntityId, InboxItem>;
    tasks: Record<EntityId, Task>;
    projects: Record<EntityId, Project>;
    notes: Record<EntityId, Note>;
    focusBlocks: Record<EntityId, FocusBlock>;
}
