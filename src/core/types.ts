export type EntityId = string;

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'auto';
// Previously 1=Critical, but string is more descriptive for the UI.

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type ProjectStatus = 'active' | 'planning' | 'paused' | 'archived';

export interface UserProfile {
    id: EntityId;
    name: string;
    role: string;
    email: string;
    avatar?: string;
    preferences: {
        autoPrioritize: boolean;
        theme: 'light' | 'dark' | 'system';
        taskViewMode?: 'list' | 'board';
    };
}

export interface TeamMember {
    id: EntityId;
    name: string;
    role: string; // e.g., "Developer", "Designer"
    avatar?: string;
    email: string;
}

export interface SmartAnalysis {
    summary: string;
    originalContext: string; // The email trigger or prompt
    confidence: number;
    reasoning?: string; // AI reasoning for the suggestions
    suggestedPriority: Priority;
    suggestedAssigneeId?: EntityId;
}

export interface InboxItem {
    id: EntityId;
    text: string;
    source: 'manual' | 'email' | 'system' | 'voice';
    processed: boolean;
    createdAt: number;
}

export interface Task {
    id: EntityId;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    projectId?: EntityId;
    dueDate?: number; // timestamp
    tags: string[];
    createdAt: number;
    updatedAt: number; // For stale task detection
    completedAt?: number;

    // New fields
    assigneeIds?: EntityId[];
    ownerId: EntityId; // The creator of the task
    visibility: 'private' | 'team'; // Segmentation logic
    smartAnalysis?: SmartAnalysis;
    source?: 'manual' | 'email' | 'voice' | 'system';
    estimatedMinutes?: number;
    acceptedAt?: number;
}

export interface Project {
    id: EntityId;
    name: string;
    status: ProjectStatus;
    color: string; // For UI identification
    goal?: string;
    deadline?: number;
    createdAt: number;
    teamId?: EntityId; // If it belongs to a team
}

export interface Note {
    id: EntityId;
    title: string;
    body: string; // Markdown supported
    projectId?: EntityId;
    taskId?: EntityId;
    createdAt: number;
    updatedAt: number;
    tags: string[];
}

export interface FocusBlock {
    id: EntityId;
    taskId: EntityId;
    startTime: number;
    durationMinutes: number;
}

export interface Habit {
    id: EntityId;
    name: string;
    frequency: 'daily' | 'weekly' | 'custom';
    durationMinutes: number;
    priority: Priority;
    flexibleWindow?: {
        start: string; // "09:00"
        end: string;   // "17:00"
    };
    color?: string;
    createdAt: number;
}

metadata ?: Record<string, any>; // Store diffs here: { old: 'todo', new: 'done' }
createdAt: number;
}

export interface Notification {
    id: EntityId;
    userId: EntityId; // Recipient
    type: 'mention' | 'assignment' | 'status_change' | 'system';
    title: string;
    message: string;
    link?: string; // /tasks/:id
    read: boolean;
    createdAt: number;
    metadata?: any;
}

export interface AppState {
    user: UserProfile | null;
    team: Record<EntityId, TeamMember>;
    inbox: Record<EntityId, InboxItem>;
    tasks: Record<EntityId, Task>;
    projects: Record<EntityId, Project>;
    notes: Record<EntityId, Note>;
    focusBlocks: Record<EntityId, FocusBlock>;
    habits: Record<EntityId, Habit>;
    activities: Record<EntityId, ActivityLog>;
    notifications: Record<EntityId, Notification>;
}

export type ActivityType =
    | 'message'   // User comment
    | 'status_change'
    | 'assignment'
    | 'creation'
    | 'update'
    | 'upload';

export interface ActivityLog {
    id: EntityId;
    taskId: EntityId;
    userId: EntityId;
    type: ActivityType;
    content: string; // "Changed status to Done" or "Hey, check this"
    metadata?: Record<string, any>; // Store diffs here: { old: 'todo', new: 'done' }
    createdAt: number;
}
