import React, { useState, useMemo, useEffect } from 'react';
import { Appointment, Mechanic, UserRole } from '../types.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import MessageModal from './MessageModal.tsx';
import { getAiAppointmentReminderSms } from '../services/geminiService.ts';

interface AppointmentsViewProps {
    appointments: Appointment[];
    mechanics: Mechanic[];
    onSave: (appointment: Appointment) => void;
    onDelete: (id: string) => void;
    prefillData?: any | null;
    onPrefillConsumed: () => void;
}

const AppointmentModal: React.FC<{
    appointment: Appointment | null,
    mechanics: Mechanic[],
    onSave: (appointment: Appointment) => void,
    onDelete: (id: string) => void,
    onClose: () => void,
    selectedDate: Date,
    prefillData?: any | null;
}> = ({ appointment, mechanics, onSave, onDelete, onClose, selectedDate, prefillData }) => {
    const { user } = useAuth();
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [isMessageLoading, setIsMessageLoading] = useState(false);

    const getInitialAppointmentData = () => {
        if (prefillData) {
            return {
                date: new Date().toISOString().split('T')[0],
                time: '09:00',
                customerName: prefillData.customerName || '',
                motorcycle: prefillData.motorcycle || '',
                description: prefillData.description || '',
                mechanicId: undefined,
            };
        }
        return appointment ? { ...appointment } : {
            date: selectedDate.toISOString().split('T')[0],
            time: '09:00',
            customerName: '',
            motorcycle: '',
            description: '',
            mechanicId: undefined,
        };
    };

    const [currentAppointment, setCurrentAppointment] = useState<Omit<Appointment, 'id' | 'status'>>(getInitialAppointmentData());
    
    useEffect(() => {
       if (prefillData) {
            setCurrentAppointment({
                date: new Date().toISOString().split('T')[0],
                time: '09:00',
                customerName: prefillData.customerName || '',
                motorcycle: prefillData.motorcycle || '',
                description: prefillData.description || '',
                mechanicId: undefined,
            });
       }
    }, [prefillData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCurrentAppointment(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalAppointment: Appointment = {
            id: appointment?.id || `apt-${Date.now()}`,
            status: appointment?.status || 'Programat',
            ...currentAppointment,
        };
        onSave(finalAppointment);
        onClose();
    };
    
    const handleDelete = () => {
        if(appointment) {
            onDelete(appointment.id);
            onClose();
        }
    }

    const handleGenerateReminder = async () => {
        if (!appointment) return;
        setIsMessageLoading(true);
        try {
            const content = await getAiAppointmentReminderSms(appointment);
            setMessageContent(content);
            setIsMessageModalOpen(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsMessageLoading(false);
        }
    };


    return (
        <>
            {isMessageModalOpen && <MessageModal title="Reminder Programare" content={messageContent} onClose={() => setIsMessageModalOpen(false)} />}
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg animate-fade-in">
                    <form onSubmit={handleSubmit}>
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{appointment ? 'Editare' : 'Adăugare'} Programare</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <input type="text" name="customerName" value={currentAppointment.customerName} onChange={handleChange} placeholder="Nume Client" required className="w-full p-2 futuristic-input" />
                            <input type="text" name="motorcycle" value={currentAppointment.motorcycle} onChange={handleChange} placeholder="Motocicletă (ex: Honda CBR600RR)" required className="w-full p-2 futuristic-input" />
                            <textarea name="description" value={currentAppointment.description} onChange={handleChange} placeholder="Descriere scurtă" rows={3} className="w-full p-2 futuristic-input"></textarea>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" name="date" value={currentAppointment.date} onChange={handleChange} required className="w-full p-2 futuristic-input" />
                                <input type="time" name="time" value={currentAppointment.time} onChange={handleChange} required className="w-full p-2 futuristic-input" />
                            </div>
                            <select name="mechanicId" value={currentAppointment.mechanicId || ''} onChange={handleChange} className="w-full p-2 futuristic-select">
                                <option value="">-- Alocă Mecanic --</option>
                                {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center gap-4 rounded-b-lg">
                            <div className="flex gap-2">
                                {appointment && (
                                    <button
                                        type="button"
                                        onClick={handleGenerateReminder}
                                        disabled={isMessageLoading}
                                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm"
                                    >
                                        {isMessageLoading ? '...' : '💬'} Reminder
                                    </button>
                                )}
                                {appointment && user?.role === UserRole.ADMIN && (
                                    <button type="button" onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Șterge</button>
                                )}
                            </div>
                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg text-sm">Închide</button>
                                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Salvează</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};


const AppointmentsView: React.FC<AppointmentsViewProps> = ({ appointments, mechanics, onSave, onDelete, prefillData, onPrefillConsumed }) => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [modalState, setModalState] = useState<{ isOpen: boolean; appointment: Appointment | null, selectedDate: Date, prefill: any | null }>({ isOpen: false, appointment: null, selectedDate: new Date(), prefill: null });
    const [mechanicFilter, setMechanicFilter] = useState<'ALL' | string>('ALL');

    useEffect(() => {
        if (prefillData) {
            setModalState({ isOpen: true, appointment: null, selectedDate: new Date(), prefill: prefillData });
            onPrefillConsumed();
        }
    }, [prefillData, onPrefillConsumed]);
    
    const mechanicMap = useMemo(() => new Map(mechanics.map(m => [m.id, m.name])), [mechanics]);
    const mechanicColorMap = useMemo(() => {
        const colors = ['bg-sky-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-500'];
        const map = new Map<string, string>();
        mechanics.forEach((mech, index) => {
            map.set(mech.id, colors[index % colors.length]);
        });
        return map;
    }, [mechanics]);

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDayOfWeek = startOfMonth.getDay() === 0 ? 6 : startOfMonth.getDay() - 1;

    const daysInMonth = useMemo(() => {
        const days = [];
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        for (let i = 1; i <= endOfMonth.getDate(); i++) {
            days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
        }
        return days;
    }, [currentDate, startDayOfWeek, endOfMonth]);

    const filteredAppointments = useMemo(() => {
        return appointments.filter(app => 
            mechanicFilter === 'ALL' || app.mechanicId === mechanicFilter
        );
    }, [appointments, mechanicFilter]);
    
    const appointmentsByDate = useMemo(() => {
        const map = new Map<string, Appointment[]>();
        filteredAppointments.forEach(app => {
            const date = app.date;
            if (!map.has(date)) map.set(date, []);
            map.get(date)!.push(app);
        });
        return map;
    }, [filteredAppointments]);
    
    const appointmentsByDayInMonth = useMemo(() => {
        const filtered = filteredAppointments.filter(app => {
            const appDate = new Date(app.date);
            return appDate.getMonth() === currentDate.getMonth() && appDate.getFullYear() === currentDate.getFullYear();
        });
        const grouped = filtered.reduce((acc, app) => {
            const date = app.date;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(app);
            return acc;
        }, {} as Record<string, Appointment[]>);
        
        return Object.entries(grouped).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
    }, [filteredAppointments, currentDate]);


    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const goToToday = () => setCurrentDate(new Date());

    const handleOpenModal = (appointment: Appointment | null, date: Date) => {
        setModalState({ isOpen: true, appointment, selectedDate: date, prefill: null });
    };
    
    const handleAddNewAppointment = () => {
         handleOpenModal(null, new Date());
    };

    const handleModalClose = () => {
        setModalState({ isOpen: false, appointment: null, selectedDate: new Date(), prefill: null });
    };

    const weekDays = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
    const today = new Date();

    return (
        <>
            {modalState.isOpen && <AppointmentModal appointment={modalState.appointment} mechanics={mechanics} onSave={onSave} onDelete={onDelete} onClose={handleModalClose} selectedDate={modalState.selectedDate} prefillData={modalState.prefill} />}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                        <button onClick={goToToday} className="px-3 py-1.5 text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hidden sm:block">Astăzi</button>
                         <button onClick={() => changeMonth(1)} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg></button>
                         <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white capitalize text-center">{currentDate.toLocaleString('ro-RO', { month: 'long', year: 'numeric' })}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <select value={mechanicFilter} onChange={e => setMechanicFilter(e.target.value)} className="w-full sm:w-auto p-2 futuristic-select text-sm">
                            <option value="ALL">Toți Mecanicii</option>
                            {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <button onClick={handleAddNewAppointment} className="bg-primary-600 hover:bg-primary-700 text-white font-bold p-2 sm:py-2 sm:px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            <span className="hidden sm:inline">Adaugă</span>
                        </button>
                    </div>
                </div>
                
                 <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-xs">
                    {mechanics.map(m => (
                        <div key={m.id} className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${mechanicColorMap.get(m.id)}`}></span>
                            <span className="text-gray-600 dark:text-gray-300">{m.name}</span>
                        </div>
                    ))}
                </div>
                
                {/* Desktop Calendar View */}
                <div className="hidden md:grid">
                    <div className="grid grid-cols-7">
                        {['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'].map(day => <div key={day} className="text-center font-semibold text-sm text-gray-500 dark:text-gray-300 py-2 border-b-2 border-gray-200 dark:border-gray-700">{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 border-l border-t border-gray-200 dark:border-gray-700">
                        {daysInMonth.map((day, index) => {
                            const isToday = day && today.toDateString() === day.toDateString();
                            const appointmentsForDay = day ? appointmentsByDate.get(day.toISOString().split('T')[0])?.sort((a,b) => a.time.localeCompare(b.time)) || [] : [];
                            
                            return (
                                <div key={index} className={`relative border-b border-r border-gray-200 dark:border-gray-700 p-2 min-h-[8rem] flex flex-col ${day ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
                                    {day && (
                                        <>
                                            <button onClick={() => handleOpenModal(null, day)} className={`self-end text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                                {day.getDate()}
                                            </button>
                                            <div className="mt-1 space-y-1 overflow-y-auto text-xs flex-grow">
                                                {appointmentsForDay.map(app => (
                                                    <div key={app.id} onClick={() => handleOpenModal(app, day)} className="p-1.5 rounded-md cursor-pointer group bg-gray-100 dark:bg-gray-900/40 hover:bg-gray-200 dark:hover:bg-gray-900/80 relative">
                                                        <div className="flex items-start gap-2">
                                                            <span className={`flex-shrink-0 w-2 h-2 mt-1 rounded-full ${mechanicColorMap.get(app.mechanicId || '') || 'bg-gray-400'}`}></span>
                                                            <div className="flex-grow overflow-hidden">
                                                                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{app.time} - {app.customerName}</p>
                                                                <p className="text-gray-600 dark:text-gray-300 truncate">{app.motorcycle}</p>
                                                            </div>
                                                        </div>
                                                        {user?.role === UserRole.ADMIN && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDelete(app.id);
                                                                }}
                                                                className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity"
                                                                title="Șterge programarea"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Mobile Agenda View */}
                <div className="md:hidden space-y-4">
                    {appointmentsByDayInMonth.length > 0 ? appointmentsByDayInMonth.map(([date, apps], index) => {
                         const day = new Date(date + 'T00:00:00');
                         const isToday = today.toDateString() === day.toDateString();
                         return (
                            <div key={date} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}>
                                <h3 className={`font-bold p-2 rounded-t-lg ${isToday ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{day.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                                <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
                                    {apps.sort((a,b) => a.time.localeCompare(b.time)).map(app => (
                                        <div key={app.id} onClick={() => handleOpenModal(app, day)} className="p-2 rounded-md cursor-pointer group bg-white dark:bg-gray-800 shadow">
                                             <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-grow overflow-hidden">
                                                    <span className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${mechanicColorMap.get(app.mechanicId || '') || 'bg-gray-400'}`}></span>
                                                    <div className="flex-grow overflow-hidden">
                                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{app.time} - {app.customerName}</p>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300">{app.motorcycle}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{app.description}</p>
                                                    </div>
                                                </div>
                                                {user?.role === UserRole.ADMIN && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(app.id);
                                                        }}
                                                        className="flex-shrink-0 p-1.5 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-300"
                                                        title="Șterge programarea"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         )
                    }) : <p className="text-center text-gray-500 dark:text-gray-300 py-8">Nicio programare în această lună.</p>}
                </div>
            </div>
        </>
    );
};

export default AppointmentsView;