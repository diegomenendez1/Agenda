
import React, { useState } from 'react';
import { TeamMember, EntityId } from '../core/types';
import { buildTree, TreeNode, checkCycle } from '../core/hierarchyUtils';
import clsx from 'clsx';
import { User, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TeamOrganigramProps {
    members: TeamMember[];
    currentUserId?: string;
    onMemberClick?: (memberId: string) => void;
    onUpdateManager?: (memberId: string, newManagerId: string) => void;
    readOnly?: boolean;
}

export function TeamOrganigram({ members, currentUserId, onMemberClick, onUpdateManager, readOnly = false }: TeamOrganigramProps) {
    const roots = buildTree(members);
    const [draggedId, setDraggedId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        if (readOnly) return;
        setDraggedId(id);
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const droppedId = e.dataTransfer.getData('text/plain');
        setDraggedId(null);

        if (!droppedId || droppedId === targetId) return;

        // Validation
        if (checkCycle(droppedId, targetId, members)) {
            toast.error("Cannot move a supervisor under their own report (Project Cycle detected).");
            return;
        }

        if (onUpdateManager) {
            onUpdateManager(droppedId, targetId);
        }
    };

    if (members.length === 0) {
        return <div className="p-8 text-center text-text-muted">No members to display in hierarchy.</div>;
    }

    return (
        <div className="w-full h-full overflow-auto p-8 bg-bg-app/50 rounded-xl border border-border-subtle">
            <div className="flex flex-col items-center gap-8 min-w-max">
                {roots.map(node => (
                    <OrgNode
                        key={node.id}
                        node={node}
                        currentUserId={currentUserId}
                        onMemberClick={onMemberClick}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        readOnly={readOnly}
                    />
                ))}
            </div>
        </div>
    );
}

interface OrgNodeProps {
    node: TreeNode;
    currentUserId?: string;
    onMemberClick?: (id: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, targetId: string) => void;
    readOnly: boolean;
}

function OrgNode({ node, currentUserId, onMemberClick, onDragStart, onDragOver, onDrop, readOnly }: OrgNodeProps) {
    const isMe = node.id === currentUserId;
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div className="flex flex-col items-center relative group">
            {/* The Node Card */}
            <div
                className={clsx(
                    "w-64 bg-bg-card border rounded-lg shadow-sm p-3 relative transition-all z-10 cursor-pointer hover:shadow-md hover:-translate-y-1",
                    isMe ? "border-accent-primary ring-2 ring-accent-primary/20" : "border-border-subtle",
                    isDragOver ? "ring-2 ring-accent-primary border-accent-primary scale-105 bg-accent-primary/5" : "",
                    readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                )}
                draggable={!readOnly}
                onDragStart={(e) => onDragStart(e, node.id)}
                onDragOver={(e) => {
                    if (readOnly) return;
                    onDragOver(e);
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                    if (readOnly) return;
                    setIsDragOver(false);
                    onDrop(e, node.id);
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onMemberClick) onMemberClick(node.id);
                }}
            >
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                        node.role === 'owner' ? "bg-amber-500/10 text-amber-500" :
                            node.role === 'admin' ? "bg-accent-primary/10 text-accent-primary" :
                                "bg-bg-input text-text-muted"
                    )}>
                        {node.avatar ? (
                            <img src={node.avatar} alt={node.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            node.name.charAt(0)
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-text-primary truncate flex items-center gap-1.5">
                            {node.name}
                            {node.role === 'owner' && <Shield size={12} className="text-amber-500" fill="currentColor" />}
                        </div>
                        <div className="text-xs text-text-muted truncate">
                            {node.role} • {node.children.length > 0 ? `${node.children.length} reports` : 'No reports'}
                        </div>
                    </div>
                </div>

                {/* Connector Line (Top) - If functionality needed later */}
            </div>

            {/* Children */}
            {node.children.length > 0 && (
                <>
                    {/* Vertical Line Down from Parent */}
                    <div className="w-px h-8 bg-border-subtle" />

                    {/* Children Container */}
                    <div className="flex gap-4 items-start relative pt-4">
                        {/* Horizontal Line connecting children */}
                        {node.children.length > 1 && (
                            <div className="absolute top-0 left-[calc(50%-50%)] right-[calc(50%-50%)] h-px bg-border-subtle"
                                style={{
                                    left: 'calc(4rem)', // Approximation: logic for exact line fitting requires DOM measure or fixed width
                                    right: 'calc(4rem)',
                                    display: 'none' // React-only tree drawing without fixed widths is hard. Disabling horizontal bar simplifies visual.
                                    // Use simple flex gap instead.
                                }}
                            />
                        )}

                        {/* Recursive Render */}
                        {node.children.map(child => (
                            <div key={child.id} className="relative flex flex-col items-center">
                                {/* Connector Up to Parent's Connector */}
                                {/* Simple CSS tree: Parent -> Line Down. Children -> Flex Row. Each Child -> Line Up? */}
                                <div className="w-px h-4 bg-border-subtle absolute -top-4" />
                                <OrgNode
                                    node={child}
                                    currentUserId={currentUserId}
                                    onMemberClick={onMemberClick}
                                    onDragStart={onDragStart}
                                    onDragOver={onDragOver}
                                    onDrop={onDrop}
                                    readOnly={readOnly}
                                />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
