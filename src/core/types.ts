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
    completedAt?: number;

    // New fields
    assigneeId?: EntityId;
    ownerId: EntityId; // The creator of the task
    visibility: 'private' | 'team'; // Segmentation logic
    smartAnalysis?: SmartAnalysis;
    source?: 'manual' | 'email' | 'voice' | 'system';
    estimatedMinutes?: number;
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

export interface AppState {
    user: UserProfile | null;
    team: Record<EntityId, TeamMember>;
    inbox: Record<EntityId, InboxItem>;
    tasks: Record<EntityId, Task>;
    projects: Record<EntityId, Project>;
    notes: Record<EntityId, Note>;
    focusBlocks: Record<EntityId, FocusBlock>;
}
