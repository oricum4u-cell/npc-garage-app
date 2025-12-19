import React, { useState, useEffect } from 'react';

const Clock: React.FC<{ className?: string }> = ({ className = '' }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            clearInterval(timerId);
        };
    }, []);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('ro-RO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ro-RO', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className={`text-right ${className}`}>
            <div className="font-semibold text-lg">{formatTime(currentTime)}</div>
            <div className="text-sm capitalize">{formatDate(currentTime)}</div>
        </div>
    );
};

export default Clock;