import type { Task, EntityId } from '../types';

export const activeToggles = new Set<string>();
export const recentlyDeletedInboxIds = new Set<string>();

export const toSeconds = (ms?: number) => ms ? Math.round(ms / 1000) : null;

export const fromSeconds = (s?: any) => {
    if (!s) return undefined;
    const num = Number(s);
    if (isNaN(num)) {
        // Handle ISO strings from Supabase (timestamptz)
        return new Date(s).getTime();
    }
    // Safety check: if it looks like MS (year > 3000), treat as MS, else Seconds
    return num > 100000000000 ? num : num * 1000;
};

export const hydrateTask = (t: any): Task => ({
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
    ownerId: t.user_id, // Map DB 'user_id' into app 'ownerId'
    visibility: t.visibility,
    assigneeIds: t.assignee_ids || [],
    smartAnalysis: t.smart_analysis,
    source: t.source,
    estimatedMinutes: t.estimated_minutes,
    acceptedAt: fromSeconds(t.accepted_at),
    acceptedBy: t.accepted_by,
    organizationId: t.organization_id,
    organizationName: t.organization_name, // Hydrated from join
    inviterName: t.inviter_name // Hydrated from join
});

export const hydrateInvitation = (i: any) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    status: i.status as any,
    teamId: i.team_id || 'default-team',
    organizationId: i.organization_id,
    invitedBy: i.invited_by,
    inviterName: i.inviter?.full_name || 'Unknown',
    organizationName: i.organization?.name || 'Unknown Workspace',
    createdAt: i.created_at ? new Date(i.created_at).getTime() : Date.now(),
    token: i.token
});
