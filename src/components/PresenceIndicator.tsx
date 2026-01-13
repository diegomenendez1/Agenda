import { useStore } from '../core/store';

interface PresenceIndicatorProps {
    userId: string;
    size?: 'sm' | 'md' | 'lg';
    showOffline?: boolean;
}

export const PresenceIndicator = ({ userId, size = 'md', showOffline = false }: PresenceIndicatorProps) => {
    const { onlineUsers } = useStore();
    const isOnline = onlineUsers.includes(userId);

    if (!isOnline && !showOffline) return null;

    const sizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4'
    };

    return (
        <span
            className={`
                inline-block rounded-full border-2 border-bg-app
                ${sizeClasses[size]}
                ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
            `}
            title={isOnline ? 'Active now' : 'Offline'}
            aria-label={isOnline ? 'User is online' : 'User is offline'}
        />
    );
};
