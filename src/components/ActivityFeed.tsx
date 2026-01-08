import { useEffect, useState } from 'react';
import { useStore } from '../core/store';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, RefreshCw, User as UserIcon, FileEdit, Plus } from 'lucide-react';
import clsx from 'clsx';
import type { EntityId } from '../core/types';

interface ActivityFeedProps {
    taskId: EntityId;
}

export function ActivityFeed({ taskId }: ActivityFeedProps) {
    const { activities, fetchActivities, logActivity, user, team } = useStore();
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Suggestion State
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [cursorPosition, setCursorPosition] = useState(0);

    useEffect(() => {
        fetchActivities(taskId);
    }, [taskId, fetchActivities]);

    const taskActivities = Object.values(activities)
        .filter(a => a.taskId === taskId)
        .sort((a, b) => b.createdAt - a.createdAt); // Newest first

    // Handle Input Change for Mentions
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setComment(val);
        setCursorPosition(e.target.selectionStart || 0);

        // Simple regex to detect if we are typing a mention: @name
        // Looks for the last @ before the cursor
        const lastAt = val.lastIndexOf('@', e.target.selectionStart || 0);
        if (lastAt !== -1) {
            const textAfterAt = val.substring(lastAt + 1, e.target.selectionStart || 0);
            // Valid if no spaces yet (simple autocompletion)
            if (!textAfterAt.includes(' ')) {
                setMentionQuery(textAfterAt);
                return;
            }
        }
        setMentionQuery(null);
    };

    const handleSelectMention = (memberName: string) => {
        if (mentionQuery === null) return;
        const lastAt = comment.lastIndexOf('@', cursorPosition);
        const before = comment.substring(0, lastAt);
        const after = comment.substring(cursorPosition);
        const newText = `${before}@${memberName} ${after}`;
        setComment(newText);
        setMentionQuery(null);
        // Focus back would be ideal but simple state update works for now
    };

    const filteredMembers = mentionQuery !== null
        ? Object.values(team).filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
        : [];

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;

        setIsSubmitting(true);
        try {
            await logActivity(taskId, 'message', comment);
            setComment('');
            setMentionQuery(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'message': return <MessageSquare size={14} className="text-white" />;
            case 'status_change': return <RefreshCw size={14} className="text-white" />;
            case 'assignment': return <UserIcon size={14} className="text-white" />;
            case 'creation': return <Plus size={14} className="text-white" />;
            default: return <FileEdit size={14} className="text-white" />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'message': return 'bg-blue-500';
            case 'status_change': return 'bg-orange-500';
            case 'assignment': return 'bg-purple-500';
            case 'creation': return 'bg-emerald-500';
            default: return 'bg-gray-500';
        }
    };

    const getUserName = (userId: string) => {
        if (!userId) return 'System';
        if (user?.id === userId) return 'You';

        // Robust lookup: Check direct ID map or search values if ID mismatch
        const direct = team[userId];
        if (direct) return direct.name;

        // Fallback: This handles cases where ID might be different casing or link issues
        const found = Object.values(team).find(m => m.id === userId);
        return found ? found.name : 'Unknown User';
    };

    return (
        <div className="flex flex-col h-full bg-bg-app/30 rounded-xl border border-border-subtle overflow-hidden relative">
            <div className="p-4 border-b border-border-subtle bg-bg-card/50 flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase tracking-wider text-text-muted">Activity & Comments</h3>
                <span className="text-xs text-text-muted">{taskActivities.length} events</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {taskActivities.length === 0 ? (
                    <div className="text-center py-10 text-text-muted/50 text-sm">
                        No activity yet.
                    </div>
                ) : (
                    taskActivities.map(activity => (
                        <div key={activity.id} className="relative pl-6 last:mb-0 group">
                            {/* Timeline Line */}
                            <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-border-subtle group-last:hidden" />

                            <div className="flex items-start gap-3">
                                {/* Icon Bubble */}
                                <div className={clsx(
                                    "relative z-10 w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white/10 shrink-0",
                                    getColor(activity.type)
                                )}>
                                    {getIcon(activity.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-text-primary">
                                            {getUserName(activity.userId)}
                                        </span>
                                        <span className="text-[10px] text-text-muted">
                                            {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                                        </span>
                                    </div>

                                    {activity.type === 'message' ? (
                                        <div className="bg-bg-card p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-border-subtle text-sm text-text-primary shadow-sm">
                                            {activity.content}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-text-secondary">
                                            {activity.content}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Comment Input */}
            <div className="p-4 bg-bg-card border-t border-border-subtle sm:rounded-b-xl relative">
                {mentionQuery !== null && filteredMembers.length > 0 && (
                    <div className="absolute bottom-full left-4 mb-2 w-64 bg-bg-card border border-border-subtle rounded-lg shadow-xl overflow-hidden z-50">
                        <div className="px-3 py-2 bg-bg-input text-[10px] font-bold uppercase text-text-muted border-b border-border-subtle">
                            Mention Team Member
                        </div>
                        {filteredMembers.map(member => (
                            <button
                                key={member.id}
                                onClick={() => handleSelectMention(member.name)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent-primary/10 hover:text-accent-primary flex items-center gap-2 transition-colors"
                            >
                                <div className="w-5 h-5 rounded-full bg-accent-secondary/20 flex items-center justify-center text-[10px] font-bold">
                                    {member.avatar ? <img src={member.avatar} className="w-full h-full rounded-full" /> : member.name.charAt(0)}
                                </div>
                                {member.name}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSendComment} className="flex gap-2">
                    <input
                        type="text"
                        value={comment}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Tab' || e.key === 'Enter') {
                                if (mentionQuery !== null && filteredMembers.length > 0) {
                                    e.preventDefault();
                                    handleSelectMention(filteredMembers[0].name);
                                }
                            }
                        }}
                        placeholder="Write a comment... (Type @ to mention)"
                        className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm focus:border-accent-primary outline-none transition-all"
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        disabled={!comment.trim() || isSubmitting}
                        className="bg-accent-primary text-white p-2 rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <MessageSquare size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
}
