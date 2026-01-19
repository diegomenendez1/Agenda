
import type { TeamMember, EntityId } from './types';

export interface TreeNode extends TeamMember {
    children: TreeNode[];
    depth: number;
}

/**
 * Builds a hierarchical tree from a flat list of team members.
 * Handles missing parents and PREVENTS CYCLES by treating cyclic nodes as roots.
 */
export function buildTree(members: TeamMember[]): TreeNode[] {
    const map = new Map<EntityId, TreeNode>();
    const roots: TreeNode[] = [];

    // 1. Initialize Nodes
    members.forEach(m => {
        map.set(m.id, { ...m, children: [], depth: 0 });
    });

    // 2. Build Hierarchy with Cycle Detection
    members.forEach(m => {
        const node = map.get(m.id);
        if (!node) return;

        let parent = m.reportsTo ? map.get(m.reportsTo) : undefined;

        // Cycle Check: Trace parents upwards to see if we reach the current node
        let isCycle = false;
        let curr = parent;
        const visited = new Set<EntityId>();

        // Safety Break: Max depth 100 to prevent infinite loop during check itself if graph is already cyclic in map (shouldn't be if we build sequentially properly, but safety first)
        let depthCheck = 0;

        while (curr && depthCheck < 50) {
            if (curr.id === node.id) {
                isCycle = true;
                break;
            }
            if (visited.has(curr.id)) break; // Found internal loop upstream
            visited.add(curr.id);

            // Move up
            curr = curr.reportsTo ? map.get(curr.reportsTo) : undefined;
            depthCheck++;
        }

        if (parent && !isCycle) {
            // Link child to parent
            parent.children.push(node);
        } else {
            // No parent, missing parent, or Cycle detected -> Root
            roots.push(node);
        }
    });

    // 3. Calculate Depths (BFS)
    // Use Set to prevent re-visiting if multiple paths exist (shouldn't in tree, but safety)
    const queue = roots.map(n => ({ node: n, depth: 0 }));
    const depthVisited = new Set<EntityId>();

    roots.forEach(r => depthVisited.add(r.id));

    while (queue.length > 0) {
        const { node, depth } = queue.shift()!;
        node.depth = depth;

        node.children.forEach(child => {
            if (!depthVisited.has(child.id)) {
                depthVisited.add(child.id);
                queue.push({ node: child, depth: depth + 1 });
            }
        });
    }

    return roots;
}

/**
 * Returns a Set of IDs representing the member and all their descendants (recursive).
 * Used for Strict Visibility Filtering.
 */
export function getDescendants(rootId: EntityId, members: TeamMember[]): Set<EntityId> {
    const descendants = new Set<EntityId>();
    // We rebuild tree locally for traversal. 
    // Optimization: Build tree once in component and pass it, but for safety we build here.
    // Given N < 500, this is fast.
    const tree = buildTree(members);

    // Find the sub-tree root
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
        for (const node of nodes) {
            if (node.id === rootId) return node;
            const found = findNode(node.children);
            if (found) return found;
        }
        return null;
    };

    const rootNode = findNode(tree);
    if (!rootNode) return new Set([rootId]); // Return at least self

    const traverse = (node: TreeNode) => {
        descendants.add(node.id);
        node.children.forEach(traverse);
    };

    traverse(rootNode);
    return descendants;
}

/**
 * Checks if moving `draggedId` to `targetId` would create a cycle.
 * A cycle exists if `targetId` is a descendant of `draggedId`.
 */
export function checkCycle(draggedId: EntityId, targetId: EntityId, members: TeamMember[]): boolean {
    if (draggedId === targetId) return true; // Cannot report to self

    const descendants = getDescendants(draggedId, members);
    return descendants.has(targetId);
}
