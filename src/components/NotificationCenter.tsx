import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, Clock, User, MessageSquare, AlertCircle, X, Trash2, XCircle } from 'lucide-react';
import { useStore } from '../core/store';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function NotificationCenter() {
    const { notifications, markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const navigate = useNavigate();

    // Mark as read when opened
    useEffect(() => {
        if (isOpen && unreadCount > 0) {
            // We could mark all as read automatically, or just clear the "new" visual state.
            // Commercial apps often mark as read when you see them.
            // Let's mark all as read when opened to clear the dot.
            markAllNotificationsRead();
        }
    }, [isOpen]);

    useLayoutEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setPopoverStyle({
                left: rect.right + 16 + 'px',
                bottom: (window.innerHeight - rect.bottom) + 'px'
            });
        }
    }, [isOpen]);

    const allNotifications = Object.values(notifications || {}).sort((a, b) => b.createdAt - a.createdAt);
    const unreadCount = allNotifications.filter(n => !n.read).length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
            const isOutsideContent = contentRef.current && !contentRef.current.contains(target);

            if (isOutsideContainer && isOutsideContent) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = async (notification: any) => {
        await markNotificationRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'mention': return <User size={16} className="text-blue-500" />;
            case 'assignment': return <AlertCircle size={16} className="text-orange-500" />;
            case 'rejection': return <XCircle size={16} className="text-red-500" />;
            case 'status_change': return <Clock size={16} className="text-purple-500" />;
            case 'system': return <Check size={16} className="text-text-muted" />;
            default: return <MessageSquare size={16} className="text-text-muted" />;
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-input transition-all"
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-bg-card animate-pulse" />
                )}
            </button>

            {isOpen && createPortal(
                <div
                    ref={contentRef}
                    className="fixed z-[9999] w-[380px] max-h-[600px] bg-bg-card border border-border-subtle rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
                    style={popoverStyle}
                >
                    <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-app/50 rounded-t-xl backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-text-primary">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-accent-primary/10 text-accent-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {unreadCount} New
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1">
                            {allNotifications.length > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearAllNotifications();
                                    }}
                                    className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-input rounded-lg transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[400px]">
                        {allNotifications.length === 0 ? (
                            <div className="p-8 text-center text-text-muted flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-bg-input/50 flex items-center justify-center">
                                    <Bell size={20} className="opacity-20" />
                                </div>
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-border-subtle/50">
                                {allNotifications.map(notification => (
                                    <li
                                        key={notification.id}
                                        onClick={() => handleItemClick(notification)}
                                        className={clsx(
                                            "p-4 hover:bg-bg-input/50 transition-colors cursor-pointer flex gap-3 group relative",
                                            !notification.read && notification.type === 'rejection' ? "bg-red-500/5 animate-pulse" : !notification.read && "bg-accent-primary/5"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-border-subtle bg-bg-card",
                                            !notification.read && "shadow-lg shadow-accent-primary/5"
                                        )}>
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={clsx("text-sm font-medium leading-tight line-clamp-2", !notification.read ? "text-text-primary" : "text-text-secondary")}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-[10px] text-text-muted shrink-0 whitespace-nowrap">
                                                    {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: es })}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                    className="p-1 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Delete"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                                                {notification.message}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-accent-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
