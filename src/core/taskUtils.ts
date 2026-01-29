import { isSameDay, isFuture } from 'date-fns';
import type { Task, EntityId, UserProfile } from './types';

// Types for filtering
export type TimeFilter = 'all' | 'today' | 'upcoming';
export type ScopeFilter = 'all' | 'private' | 'shared';

export interface FilterOptions {
    timeFilter: TimeFilter;
    scopeFilter: ScopeFilter;
    selectedMemberId: EntityId | null;
    recentlyCompletedIds: Set<EntityId>;
}

/**
 * Core security and visibility logic for tasks.
 * Ensures users only see what they are allowed to see.
 */
export function filterAndSortTasks(
    tasks: Record<string, Task>,
    user: UserProfile | null,
    options: FilterOptions
): Task[] {
    if (!user) return [];

    const priorityScore: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const rawTasks = Object.values(tasks);

    // 1. First Filter (O(N)) - Applies Security, Privacy, and UI Filters
    const filtered = rawTasks.filter(task => {
        // --- SECURITY: Organization Isolation ---
        const isSameOrg = task.organizationId === user.organizationId;
        if (!isSameOrg) return false;

        // --- SECURITY: Access Permission ---
        // Access is strict: either you are the Owner OR you are an Assignee.
        const isOwner = task.ownerId === user.id;
        const isAssignee = task.assigneeIds?.includes(user.id);

        if (!isOwner && !isAssignee) return false;

        // --- FILTER: Scope (Private vs Shared) ---
        if (options.scopeFilter === 'private') {
            if (task.visibility !== 'private') return false;
        }

        if (options.scopeFilter === 'shared') {
            // "Shared" implies it's not strictly private to me. 
            // Note: If I am assigned to someone else's private task, it technically won't show 
            // if we strictly defined 'shared' as 'team' visibility. 
            // But usually 'shared' means 'not private'.
            if (task.visibility === 'private') return false;
        }

        // --- FILTER: Member (UI) ---
        if (options.selectedMemberId) {
            const isMemberAssigned = task.assigneeIds?.includes(options.selectedMemberId);
            const isMemberOwner = task.ownerId === options.selectedMemberId;
            if (!isMemberAssigned && !isMemberOwner) return false;
        }

        // --- FILTER: Time ---
        if (options.timeFilter === 'all') return true;

        const today = new Date();
        if (options.timeFilter === 'today') {
            if (!task.dueDate) return false;
            return isSameDay(new Date(task.dueDate), today);
        }

        if (options.timeFilter === 'upcoming') {
            if (!task.dueDate) return true; // No Date often implies backlog/future
            const taskDate = new Date(task.dueDate);
            return isFuture(taskDate) && !isSameDay(taskDate, today);
        }

        return true;
    });

    // 2. Then Sort (O(M log M))
    return filtered.sort((a, b) => {
        // VISIBILITY FIX: Treat recently completed tasks as NOT done for sorting purposes (keep them at top)
        const aIsEffectiveDone = a.status === 'done' && !options.recentlyCompletedIds.has(a.id);
        const bIsEffectiveDone = b.status === 'done' && !options.recentlyCompletedIds.has(b.id);

        // 1. Status: Active First, Done Last
        if (aIsEffectiveDone !== bIsEffectiveDone) return aIsEffectiveDone ? 1 : -1;

        // 2. Critical Unranked Items (Safety Valve for Shared Tasks)
        // If a task is Critical but has NO rank (e.g. shared from boss), show it top.
        const aRank = a.smartAnalysis?.smartRank;
        const bRank = b.smartAnalysis?.smartRank;
        const pA = priorityScore[a.priority] || 0;
        const pB = priorityScore[b.priority] || 0;

        // If one is Critical and Unranked, and the other is NOT Critical (or is ranked), the Critical Unranked wins? 
        // Actually, let's keep it simple: Rank overrides everything unless specifically Critical?
        // Let's mix them: 
        // We can treat Rank as a primary sort key, but "Unranked Critical" behaves like Rank 0.

        let rankA = aRank ?? 999999;
        let rankB = bRank ?? 999999;

        // Boost Unranked Critical tasks to top (virtual rank 0) if they don't have a specific rank
        if (aRank === undefined && a.priority === 'critical') rankA = -1;
        if (bRank === undefined && b.priority === 'critical') rankB = -1;

        if (rankA !== rankB) return rankA - rankB;

        // 3. Priority fallback (for items with same rank or no rank)
        if (pA !== pB) return pB - pA;

        // 4. Due Date (Earliest first)
        const dateA = a.dueDate || 9999999999999;
        const dateB = b.dueDate || 9999999999999;
        if (dateA !== dateB) return dateA - dateB;

        // 5. Creation (Newest first)
        return (b.createdAt || 0) - (a.createdAt || 0);
    });
}
