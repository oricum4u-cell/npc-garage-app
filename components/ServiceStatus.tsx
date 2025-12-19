import React, { useState, useEffect } from 'react';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';

const ServiceStatus: React.FC = () => {
    const { garageInfo } = useGarage();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [scheduleText, setScheduleText] = useState('');

    useEffect(() => {
        const checkStatus = () => {
            if (!garageInfo || !garageInfo.schedule) {
                setIsOpen(false);
                setStatusText('ÎNCHIS');
                return;
            }

            const now = new Date();
            const dayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            // Map JS getDay() to our schedule keys
            const dayKeys = ['duminica', 'luni', 'marti', 'miercuri', 'joi', 'vineri', 'sambata'];
            const currentDayKey = dayKeys[dayIndex];
            
            const schedule = garageInfo.schedule[currentDayKey];

            if (!schedule || !schedule.isOpen) {
                setIsOpen(false);
                setStatusText('ÎNCHIS');
                setScheduleText('Azi: Închis');
                return;
            }

            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            // Safety check for start/end strings
            const startStr = schedule.start || '00:00';
            const endStr = schedule.end || '00:00';

            const [startHour, startMinute] = startStr.split(':').map(Number);
            const [endHour, endMinute] = endStr.split(':').map(Number);
            
            const startTime = startHour * 60 + startMinute;
            const endTime = endHour * 60 + endMinute;

            if (currentTime >= startTime && currentTime < endTime) {
                setIsOpen(true);
                setStatusText('DESCHIS');
            } else {
                setIsOpen(false);
                setStatusText('ÎNCHIS');
            }
            setScheduleText(`Azi: ${startStr} - ${endStr}`);
        };

        checkStatus();
        const interval = setInterval(checkStatus, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [garageInfo]); 

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50 group cursor-help relative" title={scheduleText}>
            <div className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
            <span className={`text-xs font-bold tracking-wider ${isOpen ? 'text-green-400' : 'text-gray-400'}`}>
                {statusText}
            </span>
            
            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-700 z-50">
                {scheduleText}
            </div>
        </div>
    );
};

export default ServiceStatus;