import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, Clock, User, MessageSquare, AlertCircle, X } from 'lucide-react';
import { useStore } from '../core/store';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function NotificationCenter() {
    const { notifications, markNotificationRead, markAllNotificationsRead } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const allNotifications = Object.values(notifications || {}).sort((a, b) => b.createdAt - a.createdAt);
    const unreadCount = allNotifications.filter(n => !n.read).length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (notification: any) => {
        markNotificationRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'mention': return <User size={16} className="text-blue-500" />;
            case 'assignment': return <AlertCircle size={16} className="text-orange-500" />;
            case 'status_change': return <Clock size={16} className="text-purple-500" />;
            case 'system': return <Check size={16} className="text-gray-500" />;
            default: return <MessageSquare size={16} className="text-gray-500" />;
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
                    className="fixed z-[9999] w-[380px] max-h-[600px] bg-bg-card border border-border-subtle rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        left: containerRef.current ? containerRef.current.getBoundingClientRect().right + 16 + 'px' : '300px',
                        bottom: containerRef.current ? (window.innerHeight - containerRef.current.getBoundingClientRect().bottom) + 'px' : '20px'
                    }}
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
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-text-muted hover:text-text-primary p-1 rounded transition-colors"
                            >
                                <X size={14} />
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllNotificationsRead()}
                                    className="text-[10px] font-bold text-accent-primary hover:bg-accent-primary/10 px-2 py-1 rounded transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
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
                                            !notification.read && "bg-accent-primary/5"
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
                                                    {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                                </span>
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
