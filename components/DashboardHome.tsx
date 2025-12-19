
import React, { useMemo, useState } from 'react';
import { Estimate, EstimateStatus, User, Mechanic, Appointment, StockItem, UserRole, WorkshopBay } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import Clock from './Clock.tsx';
import DashboardKPIs from './DashboardKPIs.tsx';
import { STATUS_COLORS } from '../constants.ts';
import { getStatusKey } from '../utils/translationHelpers.ts';
import CostSimulatorModal from './CostSimulatorModal.tsx';

const HudPanel: React.FC<{children: React.ReactNode, className?: string, style?: React.CSSProperties, title?: string, action?: React.ReactNode}> = ({ children, className, style, title, action }) => (
    <div style={style} className={`relative w-full h-full p-4 sm:p-6 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl shadow-2xl shadow-primary-900/50 flex flex-col ${className}`}>
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl"></div>
        
        {(title || action) && (
            <div className="flex justify-between items-center mb-4 border-b border-primary-500/20 pb-2">
                {title && <h3 className="text-xl font-bold text-white">{title}</h3>}
                {action && <div>{action}</div>}
            </div>
        )}
        <div className="flex-grow relative">
            {children}
        </div>
    </div>
);

interface DashboardHomeProps {
    user: Omit<User, 'password'> | null;
    estimates: Estimate[];
    appointments: Appointment[];
    stockItems: StockItem[];
    mechanics: Mechanic[];
    bays: WorkshopBay[];
    setView: (view: any) => void;
    onViewEstimate: (id: string) => void;
}

const QuickActionCard: React.FC<{ 
    icon: React.ReactNode, 
    label: string, 
    desc: string, 
    onClick: () => void,
    colorClass?: string 
}> = ({ icon, label, desc, onClick, colorClass = "bg-primary-600/20 border-primary-500/50 text-primary-300" }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg w-full text-left group ${colorClass}`}
    >
        <div className="p-3 rounded-full bg-gray-900/50 mb-2 group-hover:bg-gray-900 transition-colors">
            {icon}
        </div>
        <span className="font-bold text-white text-sm text-center">{label}</span>
        <span className="text-[10px] opacity-70 text-center">{desc}</span>
    </button>
);

const DashboardHome: React.FC<DashboardHomeProps> = ({ user, estimates, appointments, stockItems, bays, mechanics, setView, onViewEstimate }) => {
    const { t } = useLanguage();
    const [rightPanelTab, setRightPanelTab] = useState<'appointments' | 'stock'>('appointments');
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.greetingMorning');
        if (hour < 18) return t('dashboard.greetingAfternoon');
        return t('dashboard.greetingEvening');
    };

    const todaysAppointments = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return appointments.filter(a => a.date === today).sort((a,b) => a.time.localeCompare(b.time));
    }, [appointments]);

    const lowStockAlerts = useMemo(() => {
        return stockItems.filter(item => item.quantity <= item.lowStockThreshold);
    }, [stockItems]);
    
    const mechanicMap = useMemo(() => new Map(mechanics.map(m => [m.id, m.name])), [mechanics]);

    if (!user) return null;

    const handleSearchFocus = () => {
        const searchInput = document.getElementById('global-search-bar');
        if (searchInput) {
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {isSimulatorOpen && <CostSimulatorModal onClose={() => setIsSimulatorOpen(false)} />}
            
            {/* Header Section */}
            <div className="flex justify-between items-end flex-wrap gap-4 border-b border-gray-800 pb-4">
                 <div>
                    <p className="text-xs text-primary-400 font-mono mb-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        {t('dashboard.systemStatus')}
                    </p>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        {getGreeting()} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400 capitalize">{user.username}</span>
                    </h1>
                </div>
                <Clock className="text-gray-400 text-right bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-800" />
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <QuickActionCard 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    label={t('dashboard.newEstimate')}
                    desc="Creează deviz nou"
                    onClick={() => setView('ESTIMATE_NEW')}
                    colorClass="bg-primary-600/10 border-primary-500/30 text-primary-200 hover:bg-primary-600/20"
                />
                <QuickActionCard 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    label="Programare"
                    desc="Adaugă în calendar"
                    onClick={() => setView('APPOINTMENTS')}
                    colorClass="bg-violet-600/10 border-violet-500/30 text-violet-200 hover:bg-violet-600/20"
                />
                <QuickActionCard 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                    label="Simulator"
                    desc="Calcul rapid costuri"
                    onClick={() => setIsSimulatorOpen(true)}
                    colorClass="bg-green-600/10 border-green-500/30 text-green-200 hover:bg-green-600/20"
                />
                <QuickActionCard 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>}
                    label="Stoc Rapid"
                    desc="Verifică piese"
                    onClick={() => setView('STOCK')}
                    colorClass="bg-amber-600/10 border-amber-500/30 text-amber-200 hover:bg-amber-600/20"
                />
                <QuickActionCard 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                    label="Caută"
                    desc="Găsește orice"
                    onClick={handleSearchFocus}
                    colorClass="bg-gray-700/30 border-gray-600/30 text-gray-300 hover:bg-gray-700/50"
                />
            </div>

             {user.role === UserRole.ADMIN && (
                <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                    <DashboardKPIs estimates={estimates} stockItems={stockItems} />
                </div>
            )}

            {/* Main Operations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Workshop View (Live) */}
                <HudPanel 
                    title={t('dashboard.workshopStatus')} 
                    className="lg:col-span-2 animate-fade-in-up min-h-[400px]" 
                    style={{ animationDelay: '200ms' }}
                    action={<button onClick={() => setView('WORKSHOP')} className="text-xs text-primary-400 hover:text-white underline">Vezi Tot</button>}
                >
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full content-start">
                        {bays.map(bay => {
                            const estimate = bay.estimateId ? estimates.find(e=>e.id === bay.estimateId) : null;
                            
                            // Determine status color/visuals
                            let statusBorder = "border-gray-700";
                            let statusBg = "bg-gray-900";
                            let statusIcon = <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>;
                            
                            if (estimate) {
                                if(estimate.status === EstimateStatus.DRAFT) {
                                    statusBorder = "border-amber-500/50";
                                    statusBg = "bg-amber-950/20";
                                    statusIcon = <span className="w-3 h-3 rounded-full bg-amber-500"></span>;
                                } else if (estimate.status === EstimateStatus.COMPLETED) {
                                    statusBorder = "border-green-500/50";
                                    statusBg = "bg-green-950/20";
                                    statusIcon = <span className="w-3 h-3 rounded-full bg-green-500"></span>;
                                }
                            }

                            const mechanicNames = estimate?.mechanicIds?.map(id => mechanicMap.get(id)).filter(Boolean).join(', ') || 'Mecanic Nealocat';

                            return (
                                <div
                                    key={bay.id}
                                    className={`relative rounded-lg p-4 border-2 transition-all duration-300 ${statusBorder} ${statusBg} ${estimate ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : 'border-dashed border-gray-800 hover:border-gray-600'}`}
                                    onClick={() => estimate ? onViewEstimate(estimate.id) : setView('WORKSHOP')}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-300 text-sm uppercase tracking-wider">{bay.name}</h4>
                                        {estimate ? statusIcon : <span className="text-xs text-gray-500 font-mono">LIBER</span>}
                                    </div>
                                    
                                    {estimate ? (
                                        <div className="space-y-2">
                                            <div>
                                                <p className="font-black text-lg text-white truncate leading-tight">{estimate.motorcycleMake} {estimate.motorcycleModel}</p>
                                                <p className="text-xs text-primary-400 truncate">{estimate.customerName}</p>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/30 p-1.5 rounded">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                                <span className="truncate">{mechanicNames}</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${STATUS_COLORS[estimate.status]}`}>
                                                    {t(getStatusKey(estimate.status))}
                                                </span>
                                                <span className="text-[10px] font-mono text-gray-500">{estimate.estimateNumber}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-24 text-gray-600 group">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                            <span className="text-xs font-bold group-hover:text-primary-400">Alocă Lucrare</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </HudPanel>

                {/* Right Column: Today's Pulse (Tabbed) */}
                <HudPanel 
                    className="animate-fade-in-up" 
                    style={{ animationDelay: '300ms' }}
                    action={
                        <div className="flex bg-gray-950 rounded-lg p-1">
                            <button onClick={() => setRightPanelTab('appointments')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${rightPanelTab === 'appointments' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Agenda</button>
                            <button onClick={() => setRightPanelTab('stock')} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${rightPanelTab === 'stock' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Stoc</button>
                        </div>
                    }
                >
                    {rightPanelTab === 'appointments' ? (
                        <div className="h-full flex flex-col">
                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">{t('dashboard.todaysAppointments')}</h3>
                            {todaysAppointments.length > 0 ? (
                                <div className="space-y-0 relative border-l-2 border-gray-800 ml-2">
                                    {todaysAppointments.map((appt, i) => (
                                        <div key={appt.id} className="mb-4 ml-4 relative group">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 bg-gray-800 rounded-full border-2 border-gray-600 group-hover:border-primary-500 transition-colors"></div>
                                            <div className="bg-gray-800/40 p-3 rounded-r-lg border-l-2 border-primary-500/0 hover:bg-gray-800 hover:border-primary-500 transition-all">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-mono font-bold text-primary-300 text-sm">{appt.time}</span>
                                                    <span className="text-[10px] bg-gray-900 px-1.5 py-0.5 rounded text-gray-400">{appt.status}</span>
                                                </div>
                                                <p className="font-semibold text-white text-sm truncate">{appt.customerName}</p>
                                                <p className="text-xs text-gray-400 truncate">{appt.motorcycle}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                                    <span className="text-2xl mb-2">📅</span>
                                    <p className="text-sm">{t('dashboard.noAppointmentsToday')}</p>
                                    <button onClick={() => setView('APPOINTMENTS')} className="mt-2 text-xs text-primary-400 hover:underline">Adaugă una acum</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">{t('dashboard.stockAlerts')}</h3>
                            <div className="space-y-2 flex-grow overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                                {lowStockAlerts.length > 0 ? lowStockAlerts.map(item => (
                                    <div key={item.id} className="p-2 bg-amber-950/30 border border-amber-900/50 rounded flex justify-between items-center group hover:bg-amber-900/40 transition-colors">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-xs text-amber-200 truncate">{item.name}</p>
                                            <p className="text-[10px] text-amber-500/70 font-mono">{item.sku}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-amber-400">{item.quantity}</span>
                                            <span className="text-[10px] text-gray-500">/ {item.lowStockThreshold}</span>
                                        </div>
                                    </div>
                                )) : (
                                     <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                                        <span className="text-2xl mb-2">✅</span>
                                        <p className="text-sm">{t('dashboard.noStockAlerts')}</p>
                                    </div>
                                )}
                            </div>
                            {lowStockAlerts.length > 0 && (
                                <button onClick={() => setView('SUPPLIERS')} className="mt-3 w-full py-2 bg-amber-900/20 text-amber-400 text-xs font-bold rounded hover:bg-amber-900/40 transition-colors">
                                    Comandă Stoc (AI)
                                </button>
                            )}
                        </div>
                    )}
                </HudPanel>
            </div>
        </div>
    );
};

export default DashboardHome;
