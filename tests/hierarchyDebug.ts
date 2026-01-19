
import { buildTree, getDescendants, TreeNode } from '../src/core/hierarchyUtils';
import { TeamMember } from '../src/core/types';

// Mock Data Builders
const createMember = (id: string, reportsTo?: string): TeamMember => ({
    id,
    name: `User ${id}`,
    role: 'member',
    email: `${id}@test.com`,
    reportsTo,
    organizationId: 'org1',
    preferences: { autoPrioritize: false, theme: 'light' }
} as any);

function testHierarchy() {
    console.log("=== Starting Hierarchy Utils Test ===");

    try {
        // Scenario 1: Simple Tree
        console.log("\n1. Testing Simple Tree (A -> B)");
        const simple = [createMember('A'), createMember('B', 'A')];
        const tree1 = buildTree(simple);
        console.log("Tree 1 Roots:", tree1.map(n => n.id).join(', '));
        // console.assert(tree1.length === 1 && tree1[0].id === 'A', "A should be root");

        // Scenario 2: Direct Cycle (A <-> B)
        console.log("\n2. Testing Direct Cycle (A <-> B)");
        const cycle1 = [createMember('A', 'B'), createMember('B', 'A')];
        const tree2 = buildTree(cycle1);
        console.log("Tree 2 Roots:", tree2.map(n => n.id).join(', '));

        // Scenario 3: Self Cycle (A -> A)
        console.log("\n3. Testing Self Cycle (A -> A)");
        const selfCycle = [createMember('A', 'A')];
        const tree3 = buildTree(selfCycle);
        console.log("Tree 3 Roots:", tree3.map(n => n.id).join(', '));

        // Scenario 4: Deep Cycle (A -> B -> C -> A)
        console.log("\n4. Testing Deep Cycle (A -> B -> C -> A)");
        const deepCycle = [
            createMember('A', 'C'),
            createMember('B', 'A'),
            createMember('C', 'B')
        ];
        const tree4 = buildTree(deepCycle);
        console.log("Tree 4 Roots:", tree4.map(n => n.id).join(', '));

        // Scenario 5: getDescendants (Recursion Check)
        console.log("\n5. Testing getDescendants recursion");
        const descendants = getDescendants('A', simple);
        console.log("Descendants of A (Simple):", Array.from(descendants).join(', '));

        // Scenario 6: User Not In List
        console.log("\n6. User Not In List");
        const descMissing = getDescendants('Z', simple);
        console.log("Descendants of Z (Missing):", Array.from(descMissing).join(', '));

        console.log("\n=== Test Complete - No Crashes ===");
    } catch (error) {
        console.error("!!! CRASHED !!!");
        console.error(error);
        process.exit(1);
    }
}

testHierarchy();
