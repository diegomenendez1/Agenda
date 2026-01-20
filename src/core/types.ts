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
    reportsTo?: EntityId; // ID of direct superior (Head/Lead)
    organizationId: EntityId; // NEW: Multi-tenancy support
    preferences: {
        autoPrioritize: boolean;
        theme: 'light' | 'dark' | 'system';
        taskViewMode?: 'list' | 'board';
        aiContext?: string;
    };
}

export interface TeamMember {
    id: EntityId;
    name: string;
    role: 'owner' | 'head' | 'lead' | 'member'; // Enhanced roles: Owner -> Head -> Lead -> Member
    avatar?: string;
    email: string;
    status?: 'active' | 'pending' | 'suspended';
    invitedBy?: EntityId;
    invitedAt?: number;
    joined_at?: number; // Added for UI compatibility
    reportsTo?: EntityId;
}

export interface TeamInvitation {
    id: EntityId;
    email: string;
    role: 'owner' | 'head' | 'lead' | 'member';
    invitedBy: EntityId; // User ID of the inviter
    invitedByName?: string; // Legacy?
    inviterName?: string; // Hydrated name
    teamId: EntityId;
    organizationId: EntityId; // NEW
    organizationName?: string; // Hydrated name
    status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'approval_needed';
    createdAt: number;
    token?: string; // For link-based invites
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
    source: 'manual' | 'email' | 'system' | 'voice' | 'meeting';
    processed: boolean;
    createdAt: number;
    organizationId: EntityId;
}

// Recurring Tasks Support
export interface RecurrenceConfig {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    interval: number; // e.g., 2 for "every 2 weeks"
    daysOfWeek?: number[]; // [0, 1, ..., 6] for Sunday, Monday...
    endCondition?: {
        type: 'date' | 'count' | 'never';
        value?: number; // timestamp or count
    };
    type: 'on_schedule' | 'on_completion';
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
    organizationId: EntityId; // NEW
    visibility: 'private' | 'team'; // Segmentation logic
    smartAnalysis?: SmartAnalysis;
    source?: 'manual' | 'email' | 'voice' | 'system' | 'meeting';
    estimatedMinutes?: number;
    acceptedAt?: number;
    organizationName?: string; // Hydrated
    inviterName?: string; // Hydrated

    // Recurrence
    recurrence?: RecurrenceConfig;
    originalTaskId?: EntityId; // If this is a spawned instance
}

export interface Project {
    id: EntityId;
    name: string;
    status: ProjectStatus;
    color: string; // For UI identification
    goal?: string;
    deadline?: number;
    createdAt: number;
    organizationId: EntityId;
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
    organizationId: EntityId;
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


export interface Notification {
    id: EntityId;
    userId: EntityId; // Recipient
    type: 'mention' | 'assignment' | 'status_change' | 'system' | 'rejection';
    title: string;
    message: string;
    link?: string; // /tasks/:id
    read: boolean;
    createdAt: number;
    metadata?: any;
    organizationId: EntityId;
}

export interface AppState {
    user: UserProfile | null;
    team: Record<EntityId, TeamMember>;
    inbox: Record<EntityId, InboxItem>;
    tasks: Record<EntityId, Task>;
    projects: Record<EntityId, Project>;
    notes: Record<EntityId, Note>;
    habits: Record<EntityId, Habit>;
    activities: Record<EntityId, ActivityLog>;
    notifications: Record<EntityId, Notification>;

    activeInvitations: TeamInvitation[]; // List of pending invitations
    onlineUsers: EntityId[]; // List of user IDs currently online
    myWorkspaces: Workspace[]; // NEW: List of workspaces user belongs to
    realtimeCheck?: any;
}

export interface Workspace {
    id: EntityId;
    name: string;
    role: string; // 'owner' | 'head' | 'lead' | 'member'
    joinedAt: number;
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
