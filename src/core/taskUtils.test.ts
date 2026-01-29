import { describe, it, expect } from 'vitest';
import { filterAndSortTasks } from './taskUtils';
import type { Task, UserProfile } from './types';

// --- MOCK DATA FACTORIES ---

const createMockUser = (id: string, orgId: string = 'org-1'): UserProfile => ({
    id,
    organizationId: orgId,
    email: `${id}@test.com`,
    name: `User ${id}`,
    role: 'member',
    preferences: {
        autoPrioritize: false,
        theme: 'system'
    }
} as UserProfile);

const createMockTask = (
    id: string,
    ownerId: string,
    orgId: string = 'org-1',
    overrides: Partial<Task> = {}
): Task => ({
    id,
    ownerId,
    organizationId: orgId,
    title: `Task ${id}`,
    status: 'todo',
    priority: 'medium',
    visibility: 'private',
    assigneeIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: [],
    ...overrides
});

describe('Task Visibility & Security Logic', () => {
    const userA = createMockUser('user-a', 'org-1');

    describe('Security: Organization Isolation', () => {
        it('should strictly filter out tasks from other organizations', () => {
            const tasks = {
                't1': createMockTask('t1', 'user-a', 'org-1'),
                't2': createMockTask('t2', 'user-alien', 'org-2', { visibility: 'team' }) // Even if shared!
            };

            const result = filterAndSortTasks(tasks, userA, {
                timeFilter: 'all', scopeFilter: 'all', selectedMemberId: null, recentlyCompletedIds: new Set()
            });

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('t1');
            // User A must NEVER see data from Org 2
        });
    });


    describe('Privacy: Access Control', () => {
        it('should not show private tasks of other users', () => {
            const tasks = {
                't1': createMockTask('t1', 'user-a', 'org-1', { visibility: 'private' }),
                't2': createMockTask('t2', 'user-b', 'org-1', { visibility: 'private' }),
            };

            const result = filterAndSortTasks(tasks, userA, {
                timeFilter: 'all', scopeFilter: 'all', selectedMemberId: null, recentlyCompletedIds: new Set()
            });

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('t1');
        });

        it('should show tasks assigned to the user, even if created by others', () => {
            const tasks = {
                't1': createMockTask('t1', 'user-b', 'org-1', {
                    visibility: 'private', // Even if private, if I'm assigned, I see it
                    assigneeIds: ['user-a']
                }),
            };

            const result = filterAndSortTasks(tasks, userA, {
                timeFilter: 'all', scopeFilter: 'all', selectedMemberId: null, recentlyCompletedIds: new Set()
            });

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('t1');
        });

        it('should show "team" visibility tasks only if assigned or owner? (Verification of business rule)', () => {
            // Strict rule verification: Unassigned team tasks are hidden in My Tasks.

            const tasks = {
                't1': createMockTask('t1', 'user-b', 'org-1', { visibility: 'team', assigneeIds: [] }),
            };

            const result = filterAndSortTasks(tasks, userA, {
                timeFilter: 'all', scopeFilter: 'all', selectedMemberId: null, recentlyCompletedIds: new Set()
            });

            // If the rule is strict assignment/ownership, this should be 0.
            expect(result).toHaveLength(0);
        });
    });

    describe('Feature: Visibility / "Disappearing" Fix', () => {
        it('should keep recently completed tasks at the top (sorted as if not done)', () => {
            const tasks = {
                't1': createMockTask('t1', 'user-a', 'org-1', { status: 'done', createdAt: 100 }),
                't2': createMockTask('t2', 'user-a', 'org-1', { status: 'todo', createdAt: 200 }),
                't3': createMockTask('t3', 'user-a', 'org-1', { status: 'done', createdAt: 300 }),
            };

            const recentlyCompleted = new Set<string>(['t3']);

            const result = filterAndSortTasks(tasks, userA, {
                timeFilter: 'all',
                scopeFilter: 'all',
                selectedMemberId: null,
                recentlyCompletedIds: recentlyCompleted
            });

            // Expected Order:
            // 1. t3 (recent done -> effective todo, newest)
            // 2. t2 (todo)
            // 3. t1 (old done)

            expect(result[0].id).toBe('t3');
            expect(result[1].id).toBe('t2');
            expect(result[2].id).toBe('t1');
        });
    });

    describe('Feature: Filtering Scopes', () => {
        it('should filter purely private tasks', () => {
            const tasks = {
                't1': createMockTask('t1', 'user-a', 'org-1', { visibility: 'private' }),
                't2': createMockTask('t2', 'user-a', 'org-1', { visibility: 'team' }),
            };

            const result = filterAndSortTasks(tasks, userA, {
                timeFilter: 'all',
                scopeFilter: 'private',
                selectedMemberId: null,
                recentlyCompletedIds: new Set()
            });

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('t1');
        });

        it('should filter shared tasks', () => {
            const tasks = {
                't1': createMockTask('t1', 'user-a', 'org-1', { visibility: 'private' }),
                't2': createMockTask('t2', 'user-a', 'org-1', { visibility: 'team' }),
            };

            const result = filterAndSortTasks(tasks, userA, {
                timeFilter: 'all',
                scopeFilter: 'shared',
                selectedMemberId: null,
                recentlyCompletedIds: new Set()
            });

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('t2');
        });
    });
});
