
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from '../src/core/store';

// Mock Supabase
const mockDelete = vi.fn();
vi.mock('../src/core/supabase', () => ({
    supabase: {
        from: () => ({
            delete: () => ({ in: mockDelete })
        }),
        auth: { getUser: () => ({ data: { user: { id: 'user-1' } } }) },
        channel: () => ({
            on: () => ({ on: () => ({ subscribe: () => { } }) }),
            track: () => { },
            presenceState: () => ({}),
        }),
    }
}));

// We need to mock 'create' from zustand to reset state properly if needed,
// but useStore is already a hook/store. We can use setState.

describe('Stress Test: clearCompletedTasks', () => {
    beforeEach(() => {
        // Reset Store State
        useStore.setState({
            user: { id: 'user-1', role: 'user' } as any,
            tasks: {
                't1': { id: 't1', title: 'Task 1', status: 'done', ownerId: 'user-1', visibility: 'private' } as any,
                't2': { id: 't2', title: 'Task 2', status: 'done', ownerId: 'user-2', visibility: 'private' } as any, // Should NOT be deleted
                't3': { id: 't3', title: 'Task 3', status: 'todo', ownerId: 'user-1', visibility: 'private' } as any, // Should NOT be deleted (not done)
            }
        });
        mockDelete.mockReset();
    });

    it('Happy Path: Should only delete own completed tasks', async () => {
        const { clearCompletedTasks } = useStore.getState();

        // Simulate Success
        mockDelete.mockResolvedValue({ error: null });

        await clearCompletedTasks();

        const tasks = useStore.getState().tasks;
        expect(tasks['t1']).toBeUndefined(); // Deleted
        expect(tasks['t2']).toBeDefined();   // Persists (user-2)
        expect(tasks['t3']).toBeDefined();   // Persists (todo)
        expect(mockDelete).toHaveBeenCalledWith('id', ['t1']);
    });

    it('Safe Rollback: Should restore state instantly on Network Error', async () => {
        const { clearCompletedTasks } = useStore.getState();

        // Simulate Network Failure
        mockDelete.mockResolvedValue({ error: { message: 'Network Error' } });

        // Spy on initialize to ensure it is NOT called (old buggy behavior)
        const spyInit = vi.spyOn(useStore.getState(), 'initialize');

        await clearCompletedTasks();

        // Verify State is Restored
        const tasks = useStore.getState().tasks;
        expect(tasks['t1']).toBeDefined(); // Should be back!
        expect(tasks['t1'].title).toBe('Task 1');

        // Verify initialize was NOT called (we used local rollback)
        expect(spyInit).not.toHaveBeenCalled();
    });
});
