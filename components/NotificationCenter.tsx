import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext.tsx';

const NOTIFICATION_DURATION = 5000; // 5 seconds
const ANIMATION_DURATION = 500; // 0.5 seconds

const Notification: React.FC<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onDismiss: (id: string) => void;
}> = ({ id, message, type, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
        }, NOTIFICATION_DURATION - ANIMATION_DURATION);

        return () => clearTimeout(timer);
    }, [id]);
    
    useEffect(() => {
        if (isExiting) {
            const timer = setTimeout(() => {
                onDismiss(id);
            }, ANIMATION_DURATION);
            return () => clearTimeout(timer);
        }
    }, [isExiting, onDismiss, id]);
    
    const handleDismiss = () => {
        setIsExiting(true);
    };

    const typeDetails = {
        success: { icon: '✔️', progressClass: 'bg-green-500' },
        error: { icon: '❌', progressClass: 'bg-red-500' },
        info: { icon: 'ℹ️', progressClass: 'bg-blue-500' },
        warning: { icon: '⚠️', progressClass: 'bg-yellow-500' },
    };

    const animationClass = isExiting ? 'animate-slide-out-right' : 'animate-slide-in-down';

    return (
        <div
            onClick={handleDismiss}
            className={`relative w-full max-w-sm cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-gray-800/80 p-4 text-white shadow-2xl backdrop-blur-md ${animationClass}`}
        >
            <div className="flex items-start gap-3">
                <span className="mt-1 flex-shrink-0 text-xl">{typeDetails[type].icon}</span>
                <p className="flex-grow text-sm font-semibold">{message}</p>
            </div>
            <div
                className={`absolute bottom-0 left-0 h-1 ${typeDetails[type].progressClass} animate-progress-timer`}
                style={{ '--duration': `${NOTIFICATION_DURATION}ms` } as React.CSSProperties}
            ></div>
        </div>
    );
};

const NotificationCenter: React.FC = () => {
    const { notifications, dismissNotification } = useNotification();

    return (
        <div
            aria-live="assertive"
            className="pointer-events-none fixed inset-0 z-50 flex items-start px-4 py-6 sm:p-6"
        >
            <div className="flex w-full flex-col items-end space-y-4">
                {notifications.map((notification) => (
                    <Notification
                        key={notification.id}
                        id={notification.id}
                        message={notification.message}
                        type={notification.type}
                        onDismiss={dismissNotification}
                    />
                ))}
            </div>
        </div>
    );
};

export default NotificationCenter;