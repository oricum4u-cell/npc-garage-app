import React, { useState, useEffect, useMemo } from 'react';
import { Estimate, EstimateStatus, Mechanic, Appointment, WorkshopBay, BayStatus, Feedback, Promotion, StockItem } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { ESTIMATES_MOCK, MECHANICS_MOCK, APPOINTMENTS_MOCK, WORKSHOP_BAYS_MOCK, FEEDBACK_MOCK, PROMOTIONS_MOCK, STOCK_ITEMS_MOCK } from '../data/motorcycleData.ts';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useMusic } from '../contexts/MusicContext.tsx';
import Logo from './Logo.tsx';
import Clock from './Clock.tsx';
import WeatherWidget from './WeatherWidget.tsx';

interface TVDisplayConfig {
    showWorkshopStatus: boolean;
    showTodaysAgenda: boolean;
    showActivePromotions: boolean;
    showCompletedToday: boolean;
    showPositiveFeedback: boolean;
    showGallery: boolean;
    showInfoPanel: boolean;
    showKpis: boolean;
    showWaitingList: boolean;
    showStockAlerts: boolean;
}

const defaultConfig: TVDisplayConfig = {
    showWorkshopStatus: true,
    showTodaysAgenda: true,
    showActivePromotions: true,
    showCompletedToday: true,
    showPositiveFeedback: true,
    showGallery: true,
    showInfoPanel: true,
    showKpis: true,
    showWaitingList: true,
    showStockAlerts: true,
};

// Reusable Panel Component
const TVPanel: React.FC<{ children: React.ReactNode, className?: string, title: string }> = ({ children, className, title }) => (
    <div className={`relative w-full p-4 bg-black/40 backdrop-blur-sm border border-cyan-500/20 rounded-xl shadow-2xl flex flex-col scanline-subtle ${className}`}>
        <div className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl animate-hud-border"></div>
        <div className="absolute -top-px -right-px w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl animate-hud-border" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-px -left-px w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-xl animate-hud-border" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-xl animate-hud-border" style={{ animationDelay: '3s' }}></div>
        <h2 className="text-lg font-bold text-cyan-400 mb-3 border-b border-cyan-500/20 pb-2 uppercase tracking-widest flex-shrink-0 animate-[text-pulse_3s_ease-in-out_infinite]">{title}</h2>
        <div className="flex-grow relative overflow-hidden">
            {children}
        </div>
    </div>
);


const DEFAULT_GALLERY_IMAGES = [
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1616422285623-13ff0162193c?q=80&w=1932&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620815689122-54d7d812354c?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1621509374431-83165b40f314?q=80&w=1974&auto=format&fit=crop',
];

const TVDisplay: React.FC = () => {
    const { garageInfo } = useGarage();
    const { currentStation, isPlaying } = useMusic();
    const [config, setConfig] = useLocalStorage<TVDisplayConfig>('tv-display-config', defaultConfig);
    const [estimates, setEstimates] = useLocalStorage<Estimate[]>('garage-estimates', ESTIMATES_MOCK);
    const [mechanics, setMechanics] = useLocalStorage<Mechanic[]>('garage-mechanics', MECHANICS_MOCK);
    const [appointments, setAppointments] = useLocalStorage<Appointment[]>('garage-appointments', APPOINTMENTS_MOCK);
    const [bays, setBays] = useLocalStorage<WorkshopBay[]>('garage-bays', WORKSHOP_BAYS_MOCK);
    const [promotions, setPromotions] = useLocalStorage<Promotion[]>('garage-promotions', PROMOTIONS_MOCK);
    const [announcement, setAnnouncement] = useLocalStorage<string>('garage-announcement', 'Atenție: Mâine, 25.07, se livrează comanda de piese Motodis. Verificați necesarul!');
    const [galleryImages, setGalleryImages] = useLocalStorage<string[]>('tv-gallery-images', []);
    const [feedback, setFeedback] = useLocalStorage<Feedback[]>('garage-feedback', FEEDBACK_MOCK);
    const [stockItems, setStockItems] = useLocalStorage<StockItem[]>('garage-stock', STOCK_ITEMS_MOCK);
    
    const [rotatingPanelIndex, setRotatingPanelIndex] = useState(0);

    // Data refresh interval
    useEffect(() => {
        const interval = setInterval(() => {
            const read = <T,>(key: string, def: T): T => JSON.parse(localStorage.getItem(key) || 'null') || def;
            setConfig(read('tv-display-config', defaultConfig));
            setEstimates(read('garage-estimates', ESTIMATES_MOCK));
            setAppointments(read('garage-appointments', APPOINTMENTS_MOCK));
            setBays(read('garage-bays', WORKSHOP_BAYS_MOCK));
            setPromotions(read('garage-promotions', PROMOTIONS_MOCK));
            setAnnouncement(read('garage-announcement', ''));
            setGalleryImages(read('tv-gallery-images', []));
            setFeedback(read('garage-feedback', FEEDBACK_MOCK));
            setStockItems(read('garage-stock', STOCK_ITEMS_MOCK));
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        document.body.classList.add('theme-hud', 'dark');
        document.body.classList.remove('theme-future');
        return () => { document.body.classList.remove('theme-hud'); }
    }, []);

    // Memoized data calculations
    const kpiData = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const completed = estimates.filter(e => e.status === EstimateStatus.COMPLETED && new Date(e.date).toISOString().split('T')[0] === today);
        const revenue = completed.reduce((sum, e) => sum + e.parts.reduce((s,p) => s + p.price * p.quantity, 0) + e.labor.reduce((s,l) => s + l.rate*l.hours, 0), 0);
        const totalMinutes = completed.flatMap(e => e.timeLogs || []).reduce((sum, log) => sum + log.durationMinutes, 0);
        return { completedCount: completed.length, revenue, avgTime: completed.length > 0 ? totalMinutes / completed.length : 0 };
    }, [estimates]);

    const waitingList = useMemo(() => estimates.filter(e => e.status === EstimateStatus.DRAFT).map(e => ({ ...e, daysWaiting: Math.floor((new Date().getTime() - new Date(e.date).getTime()) / 86400000) })).filter(e => e.daysWaiting > 2).sort((a, b) => b.daysWaiting - a.daysWaiting).slice(0, 5), [estimates]);
    const stockAlerts = useMemo(() => ({ outOfStock: stockItems.filter(i => i.quantity === 0), lowStock: stockItems.filter(i => i.quantity > 0 && i.quantity <= i.lowStockThreshold) }), [stockItems]);
    const todaysAppointments = useMemo(() => appointments.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'Programat').sort((a, b) => a.time.localeCompare(b.time)), [appointments]);
    const activePromotions = useMemo(() => promotions.filter(p => p.isActive), [promotions]);
    const fiveStarFeedback = useMemo(() => feedback.filter(f => f.rating === 5).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [feedback]);
    const activeGalleryImages = useMemo(() => (galleryImages.length > 0 ? galleryImages : DEFAULT_GALLERY_IMAGES), [galleryImages]);
    const estimateMap = useMemo(() => new Map(estimates.map(e => [e.id, e])), [estimates]);
    
    // Panel rotation logic
    const rotatingPanels = useMemo(() => [
        { key: 'kpis', title: 'Indicatori Performanță (Azi)', condition: config.showKpis, content: (
            <div className="flex flex-col justify-around h-full gap-2">
                <div className="text-center"><p className="text-4xl font-black text-cyan-400 font-mono animate-[text-pulse_2s_ease-in-out_infinite]">{kpiData.completedCount}</p><p className="text-sm font-bold text-gray-300">Lucrări Finalizate</p></div>
                <div className="text-center"><p className="text-4xl font-black text-green-400 font-mono animate-[text-pulse_2.5s_ease-in-out_infinite]">{kpiData.revenue.toFixed(0)} <span className="text-2xl">{garageInfo.currency}</span></p><p className="text-sm font-bold text-gray-300">Venit</p></div>
                <div className="text-center"><p className="text-4xl font-black text-amber-400 font-mono animate-[text-pulse_3s_ease-in-out_infinite]">{kpiData.avgTime.toFixed(0)} <span className="text-2xl">min</span></p><p className="text-sm font-bold text-gray-300">Timp Mediu</p></div>
            </div>
        )},
        { key: 'stock', title: 'Alerte Stoc', condition: config.showStockAlerts, content: (
            <div className="flex flex-col gap-4 h-full">
                <div className="bg-red-900/20 p-2 rounded-lg border border-red-500/50 flex-grow flex flex-col"><h4 className="text-md font-bold text-red-400 mb-2">Stoc Epuizat</h4><ul className="space-y-1 text-xs text-red-200 overflow-y-auto font-mono">{stockAlerts.outOfStock.length > 0 ? stockAlerts.outOfStock.map(i => <li key={i.id}>{i.name}</li>) : <li className="italic text-gray-500">Niciun produs</li>}</ul></div>
                <div className="bg-amber-900/20 p-2 rounded-lg border border-amber-500/50 flex-grow flex flex-col"><h4 className="text-md font-bold text-amber-400 mb-2">Stoc Redus</h4><ul className="space-y-1 text-xs text-amber-200 overflow-y-auto font-mono">{stockAlerts.lowStock.length > 0 ? stockAlerts.lowStock.map(i => <li key={i.id} className="flex justify-between"><span>{i.name}</span><strong>{i.quantity} buc.</strong></li>) : <li className="italic text-gray-500">Niciun produs</li>}</ul></div>
            </div>
        )},
        { key: 'promos', title: 'Promoții Active', condition: config.showActivePromotions, content: <div className="space-y-2 overflow-y-auto h-full pr-2">{activePromotions.map(p => <div key={p.id} className="bg-purple-900/20 p-2 rounded-md"><p className="font-semibold text-purple-300 text-sm animate-[text-pulse_4s_ease-in-out_infinite]">{p.name}</p><p className="text-xs text-gray-400">{p.description}</p></div>)}</div> },
        { key: 'feedback', title: 'Feedback Pozitiv', condition: config.showPositiveFeedback, content: <div className="h-full flex flex-col justify-center text-center">{fiveStarFeedback.length > 0 ? <><p className="text-3xl mb-2">⭐⭐⭐⭐⭐</p><p className="text-md text-gray-300 italic">"{fiveStarFeedback[0].comment}"</p></> : <p>...</p>}</div> },
        { key: 'gallery', title: 'Galerie', condition: config.showGallery, content: <div className="h-full rounded-md overflow-hidden"><img src={activeGalleryImages[0]} className="w-full h-full object-cover" alt="Motorcycle"/></div>},
    ].filter(p => p.condition), [config, kpiData, stockAlerts, activePromotions, fiveStarFeedback, activeGalleryImages, garageInfo.currency]);

    useEffect(() => {
        if (rotatingPanels.length === 0) return;
        const interval = setInterval(() => {
            setRotatingPanelIndex(prev => (prev + 1) % rotatingPanels.length);
        }, 20000);
        return () => clearInterval(interval);
    }, [rotatingPanels.length]);

    const tickerText = useMemo(() => `${announcement}  //  ${isPlaying && currentStation ? `NOW PLAYING: ${currentStation.name}` : 'MUSIC PAUSED'}  //  `, [announcement, isPlaying, currentStation]);
    const bayStatusColor = (status: BayStatus) => status === 'ACTIVE' ? 'border-green-500/80' : status === 'WAITING' ? 'border-amber-500/80' : 'border-red-500/80 animate-pulse';

    const ActiveRotatingPanel = rotatingPanels[rotatingPanelIndex];

    return (
        <div className="min-h-screen h-screen bg-black text-white font-sans flex flex-col gap-4 hud-grid crt-glow overflow-y-auto">
            <header className="flex justify-between items-center flex-shrink-0 px-6 pt-6">
                <div className="flex items-center gap-6">
                    <Logo className="h-20 w-auto" />
                    <h1 className="text-4xl font-black tracking-wider text-cyan-300 animate-flicker">{garageInfo.name}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <WeatherWidget />
                    <Clock className="text-cyan-300 text-right" />
                </div>
            </header>

            <main className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-4 px-6">
                {/* Left Column */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    {config.showTodaysAgenda && <TVPanel title="Agenda Zilei" className="flex-grow">{todaysAppointments.length > 0 ? <div className="space-y-2 overflow-y-auto h-full">{todaysAppointments.map(a => <div key={a.id} className="bg-gray-900/50 p-2 rounded-md"><span className="font-mono font-bold text-primary-400">{a.time}</span><p className="font-semibold text-white text-sm">{a.customerName}</p><p className="text-xs text-gray-400">{a.motorcycle}</p></div>)}</div> : <p className="text-center text-gray-500 pt-8">Nicio programare azi.</p>}</TVPanel>}
                    {config.showWaitingList && <TVPanel title="Listă Așteptare" className="flex-grow">{waitingList.length > 0 ? <div className="space-y-2 overflow-y-auto h-full">{waitingList.map(est => <div key={est.id} className="bg-gray-900/50 p-2 rounded-md flex justify-between"><div><p className="font-semibold text-white">{est.customerName}</p><p className="text-xs text-gray-400">{est.motorcycleMake}</p></div><p className="text-lg font-bold text-red-400 font-mono">{est.daysWaiting} zile</p></div>)}</div> : <p className="text-center text-gray-500 pt-8">Nimic în așteptare.</p>}</TVPanel>}
                </div>

                {/* Center Column */}
                <div className="lg:col-span-3 flex flex-col">
                    {config.showWorkshopStatus && (
                        <TVPanel title="Stare Atelier" className="h-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto pr-2">
                                {bays.map(bay => {
                                    const e = bay.estimateId ? estimateMap.get(bay.estimateId) : null;
                                    return (
                                        <div key={bay.id} className={`p-3 rounded-lg border-2 ${bay.estimateId ? bayStatusColor(bay.status) : 'border-gray-800 border-dashed'} bg-black/50 flex flex-col justify-between`}>
                                            <h3 className="font-bold text-lg uppercase tracking-widest text-gray-300 animate-[text-pulse_5s_ease-in-out_infinite]">{bay.name}</h3>
                                            {e ? (
                                                <div className="mt-1 space-y-1">
                                                    <p className="font-bold text-xl text-white">{e.motorcycleMake} {e.motorcycleModel}</p>
                                                    <p className="text-md text-gray-300">{e.customerName}</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full"><p className="text-xl text-gray-600 font-bold">LIBER</p></div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </TVPanel>
                    )}
                </div>

                {/* Right Column (Rotating) */}
                <div className="lg:col-span-1 flex flex-col h-full">
                    {ActiveRotatingPanel && (
                        <div key={rotatingPanelIndex} className="animate-fade-cycle h-full">
                            <TVPanel title={ActiveRotatingPanel.title} className="h-full">
                                {ActiveRotatingPanel.content}
                            </TVPanel>
                        </div>
                    )}
                </div>
            </main>

            <footer className="flex-shrink-0 w-full bg-black/50 border-t-2 border-cyan-500/30 overflow-hidden h-12 flex items-center">
                <p className="whitespace-nowrap animate-marquee text-cyan-300 font-bold text-lg pl-[100%]">
                    {tickerText} {tickerText}
                </p>
            </footer>
        </div>
    );
};

export default TVDisplay;