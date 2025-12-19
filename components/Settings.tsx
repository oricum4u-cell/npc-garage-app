import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useTheme, colorPalettes, ThemeColor } from '../contexts/ThemeContext.tsx';
import { useLoyalty } from '../contexts/LoyaltyContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Estimate, StockItem, PredefinedLabor, Mechanic, Appointment, User, Promotion, Supplier, PurchaseOrder, LoyaltyTier, UserRole, ServiceRequest, DamageDossier, JobKit } from '../types.ts';
import { getLoyaltyTierNameKey } from '../utils/translationHelpers.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

interface SettingsProps {
    showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
    data: {
        estimates: Estimate[];
        stockItems: StockItem[];
        predefinedLaborItems: PredefinedLabor[];
        mechanics: Mechanic[];
        appointments: Appointment[];
        users: User[];
        promotions: Promotion[];
        suppliers: Supplier[];
        purchaseOrders: PurchaseOrder[];
        serviceRequests: ServiceRequest[];
        dossiers: DamageDossier[];
        jobKits: JobKit[];
    };
    setters: {
        setEstimates: React.Dispatch<React.SetStateAction<Estimate[]>>;
        setStockItems: React.Dispatch<React.SetStateAction<StockItem[]>>;
        setPredefinedLaborItems: React.Dispatch<React.SetStateAction<PredefinedLabor[]>>;
        setMechanics: React.Dispatch<React.SetStateAction<Mechanic[]>>;
        setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
        setUsers: React.Dispatch<React.SetStateAction<User[]>>;
        setPromotions: React.Dispatch<React.SetStateAction<Promotion[]>>;
        setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
        setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
        setServiceRequests: React.Dispatch<React.SetStateAction<ServiceRequest[]>>;
        setDossiers: React.Dispatch<React.SetStateAction<DamageDossier[]>>;
        setJobKits: React.Dispatch<React.SetStateAction<JobKit[]>>;
    };
    runSync: () => void;
    lastSyncTime: string | null;
    syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
    lastSyncSource: string;
}

const HudPanel: React.FC<{ title: string, children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`relative w-full p-6 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl shadow-2xl shadow-primary-900/50 ${className}`}>
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl"></div>
        <h2 className="text-xl font-bold text-white mb-6 border-b-2 border-primary-500/20 pb-4">{title}</h2>
        {children}
    </div>
);

const CsvExportModal: React.FC<{
    data: SettingsProps['data'];
    onClose: () => void;
    showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ data, onClose, showNotification }) => {
    const { t } = useLanguage();

    const handleExport = (type: string) => {
        let rows: any[] = [];
        let filename = `${type}.csv`;

        const escapeCsvCell = (cell: any): string => {
            if (cell === null || cell === undefined) return '';
            let str = String(cell);
            if (typeof cell === 'object') {
                str = JSON.stringify(cell);
            }
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                str = `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        
        const downloadCsv = (dataToExport: any[], fname: string) => {
            if (dataToExport.length === 0) {
                showNotification(`Nu există date de exportat pentru ${type}`, 'info');
                return;
            }

            // Robust header generation
            const allKeys = new Set<string>();
            dataToExport.forEach(row => {
                Object.keys(row).forEach(key => allKeys.add(key));
            });
            const headers = Array.from(allKeys);
            
            const csvContent = [
                headers.join(','),
                ...dataToExport.map(row => headers.map(header => escapeCsvCell(row[header])).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fname);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        
        switch (type) {
            case 'users': rows = data.users; break;
            case 'estimates': rows = data.estimates.map(({ parts, labor, inspection, payments, repairLog, timeLogs, ...rest }) => ({...rest, mechanicIds: Array.isArray(rest.mechanicIds) ? rest.mechanicIds.join(',') : '' })); break;
            case 'estimate_parts': rows = data.estimates.flatMap(e => e.parts.map(p => ({ estimate_id: e.id, ...p }))); break;
            case 'estimate_labor': rows = data.estimates.flatMap(e => e.labor.map(l => ({ estimate_id: e.id, ...l }))); break;
            case 'stock_items': rows = data.stockItems; break;
            case 'predefined_labor': rows = data.predefinedLaborItems; break;
            case 'mechanics': rows = data.mechanics; break;
            case 'appointments': rows = data.appointments; break;
            case 'promotions': rows = data.promotions; break;
            case 'suppliers': rows = data.suppliers; break;
            case 'purchase_orders': rows = data.purchaseOrders; break;
            case 'service_requests': rows = data.serviceRequests.map(sr => ({...sr, selectedServices: Array.isArray(sr.selectedServices) ? sr.selectedServices.join(',') : ''})); break;
            case 'dossiers': rows = data.dossiers; break;
            case 'job_kits': rows = data.jobKits.map(k => ({...k, parts: JSON.stringify(k.parts), labor: JSON.stringify(k.labor)})); break;
            default: break;
        }

        downloadCsv(rows, filename);
    };

    const exportTypes = [
        'users', 'estimates', 'estimate_parts', 'estimate_labor', 'stock_items', 
        'predefined_labor', 'mechanics', 'appointments', 'promotions', 'suppliers', 
        'purchase_orders', 'service_requests', 'dossiers', 'job_kits'
    ];

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50"><h3 className="text-xl font-bold text-white">{t('settings.exportCsvTitle')}</h3></header>
                <main className="p-6">
                    <p className="text-sm text-gray-400 mb-4">{t('settings.exportCsvDesc')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {exportTypes.map(type => (
                            <button key={type} onClick={() => handleExport(type)} className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-2 px-3 rounded text-sm transition-colors">
                                {type}.csv
                            </button>
                        ))}
                    </div>
                </main>
                <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl"><button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">{t('recallsModal.close')}</button></footer>
            </div>
        </div>
    );
};


const Settings: React.FC<SettingsProps> = ({ showNotification, data, setters, runSync, lastSyncTime, syncStatus, lastSyncSource }) => {
    const { garageInfo, setGarageInfo } = useGarage();
    const { language, setLanguage, t } = useLanguage();
    const { themeColor, setThemeColor, isHighContrast, setIsHighContrast } = useTheme();
    const { loyaltyConfig, setLoyaltyConfig } = useLoyalty();
    const { user } = useAuth();
    
    const [apiKey, setApiKey] = useLocalStorage<string>('gemini-api-key', '');
    const [serverUrl, setServerUrl] = useLocalStorage<string>('garage-server-url', 'http://localhost:3001');
    
    const [localServerUrl, setLocalServerUrl] = useState(serverUrl);
    const [isCsvExportModalOpen, setIsCsvExportModalOpen] = useState(false);

    useEffect(() => {
        setLocalServerUrl(serverUrl);
    }, [serverUrl]);

    const [lastLocalUpdate, setLastLocalUpdate] = useLocalStorage<string>('last-local-update', new Date(0).toISOString());
    const fileInputRef = useRef<HTMLInputElement>(null);

    const timeSlots = useMemo(() => {
        const slots = [];
        for (let i = 0; i < 24; i++) {
            for (let j = 0; j < 60; j += 15) {
                const h = i.toString().padStart(2, '0');
                const m = j.toString().padStart(2, '0');
                slots.push(`${h}:${m}`);
            }
        }
        return slots;
    }, []);

    const handleGarageInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setGarageInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setGarageInfo(prev => ({ ...prev, customLogo: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleScheduleChange = (day: string, field: 'isOpen' | 'start' | 'end', value: any) => {
        setGarageInfo(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: {
                    ...prev.schedule[day],
                    [field]: value
                }
            }
        }));
    };

    const handleExportData = () => {
        // Create a complete backup object including context data
        const fullBackup = {
            timestamp: new Date().toISOString(),
            version: "2.3.0",
            garageInfo: garageInfo, // Include current settings
            loyaltyConfig: loyaltyConfig, // Include loyalty settings
            data: data // Include all main app data (estimates, stock, users, etc.)
        };

        const date = new Date();
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
        
        const jsonString = JSON.stringify(fullBackup, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup-NPC_Garage-${dateStr}-${timeStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification("Backup complet creat și descărcat cu succes!", 'success');
    };

    const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                
                // Handle both old structure (direct data) and new structure (wrapped in 'data' property)
                const importData = imported.data || imported;

                if (importData) {
                    if(importData.estimates) setters.setEstimates(importData.estimates);
                    if(importData.stockItems) setters.setStockItems(importData.stockItems);
                    if(importData.predefinedLaborItems) setters.setPredefinedLaborItems(importData.predefinedLaborItems);
                    if(importData.mechanics) setters.setMechanics(importData.mechanics);
                    if(importData.appointments) setters.setAppointments(importData.appointments);
                    if(importData.users) setters.setUsers(importData.users);
                    if(importData.promotions) setters.setPromotions(importData.promotions);
                    if(importData.suppliers) setters.setSuppliers(importData.suppliers);
                    if(importData.purchaseOrders) setters.setPurchaseOrders(importData.purchaseOrders);
                    if(importData.serviceRequests) setters.setServiceRequests(importData.serviceRequests);
                    if(importData.dossiers) setters.setDossiers(importData.dossiers);
                    if(importData.jobKits) setters.setJobKits(importData.jobKits);
                    
                    // Restore settings if available in backup
                    if (imported.garageInfo) setGarageInfo(imported.garageInfo);
                    if (imported.loyaltyConfig) setLoyaltyConfig(imported.loyaltyConfig);

                    showNotification(t('settings.notificationImportSuccess'), 'success');
                    // Force sync after import
                    setLastLocalUpdate(new Date().toISOString());
                    setTimeout(runSync, 1000);
                } else {
                    throw new Error('Invalid format');
                }
            } catch (err) {
                showNotification(t('settings.notificationImportErrorGeneric'), 'error');
            }
        };
        reader.readAsText(file);
    };

    const handleResetData = () => {
        const confirmText = "RESET";
        const userText = prompt(t('settings.resetConfirmationPrompt', { text: confirmText }));
        if (userText === confirmText) {
            setters.setEstimates([]);
            setters.setAppointments([]);
            showNotification(t('settings.resetSuccess'), 'info');
        }
    };

    const handleAutoSetUrl = () => {
        const currentOrigin = window.location.origin;
        setLocalServerUrl(currentOrigin);
        setServerUrl(currentOrigin);
        showNotification("URL Server setat automat la: " + currentOrigin, 'success');
    };

    const handleForcePull = () => {
        setLastLocalUpdate(new Date(0).toISOString());
        showNotification("S-a solicitat descărcarea datelor. Se va iniția sincronizarea...", 'info');
        setTimeout(runSync, 500);
    };

    const handleForcePush = () => {
        const now = new Date().toISOString();
        setLastLocalUpdate(now);
        showNotification("Se forțează încărcarea datelor pe server...", 'info');
        setTimeout(runSync, 1000);
    };

    const triggerSaveNotification = () => {
        setLastLocalUpdate(new Date().toISOString());
        showNotification(t('settings.notificationInfoSaved'), 'success');
        setTimeout(() => {
            runSync();
        }, 1500);
    };

    const handleUrlBlur = () => {
        if (localServerUrl !== serverUrl) {
            setServerUrl(localServerUrl);
        }
    };

    const renderSaveButton = (customAction?: () => void, label?: string) => (
        <div className="mt-6 flex justify-end border-t border-primary-500/20 pt-4">
            <button 
                onClick={customAction || triggerSaveNotification} 
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-primary-500/30"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {label || t('settings.saveInfo')}
            </button>
        </div>
    );

    const syncSettingsContent = (
        <div className="space-y-6">
            <div>
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <span className="text-lg">🔄</span> {t('settings.autoSyncTitle')}
                </h4>
                
                <div className="bg-black/30 p-4 rounded-lg border border-gray-700 mb-3">
                    <p className="text-xs font-bold text-green-400 mb-2 border-b border-gray-600 pb-1">
                        Sincronizare Master-Slave (PC Prioritar)
                    </p>
                    <ul className="list-disc list-inside text-[10px] text-gray-400 space-y-1 font-mono">
                        <li><span className="text-primary-400">Main Data:</span> Sincronizare la fiecare 15 minute.</li>
                        <li><span className="text-primary-400">Users:</span> Sincronizare separată la fiecare 60 minute.</li>
                        <li><span className="text-primary-400">Prioritate:</span> Modificările de pe server (Desktop) suprascriu datele de pe mobil în caz de conflict.</li>
                    </ul>
                </div>

                <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">Server URL (Frontend/Proxy)</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={localServerUrl} 
                            onChange={(e) => setLocalServerUrl(e.target.value)} 
                            onBlur={handleUrlBlur}
                            placeholder="ex: https://app-noua.ngrok-free.app"
                            className="w-full p-2 futuristic-input"
                        />
                        <button 
                            onClick={handleAutoSetUrl}
                            className="whitespace-nowrap px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded"
                            title="Setează la adresa din bara de adrese"
                        >
                            Setează Automat
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    <button 
                        onClick={runSync} 
                        disabled={syncStatus === 'syncing'} 
                        className={`w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${syncStatus === 'syncing' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/30'}`}
                    >
                        {syncStatus === 'syncing' ? (
                            <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Sincronizare...</>
                        ) : (
                            <>{t('settings.forceSync')}</>
                        )}
                    </button>
                    
                    <button 
                        onClick={handleForcePull} 
                        className="w-full py-2 rounded-lg font-bold text-sm bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/30"
                        title="Descarcă forțat datele de pe server, ignorând versiunea locală"
                    >
                        Descarcă Date (Force Pull)
                    </button>
                </div>

                {user?.role === UserRole.ADMIN && (
                    <button 
                        onClick={handleForcePush} 
                        className="w-full py-2 rounded-lg font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30"
                        title="Trimite forțat datele locale către server (Suprascrie Serverul)"
                    >
                        Inițializează Server (Upload Desktop)
                    </button>
                )}
                
                <div className="mt-3 flex justify-between text-[10px] text-gray-500 border-t border-gray-700 pt-2">
                    <div className="flex flex-col">
                        <span>Status: <span className={syncStatus === 'error' ? 'text-red-400' : syncStatus === 'synced' ? 'text-green-400' : 'text-gray-400'}>{t(`settings.syncStatus.${syncStatus}`)}</span></span>
                        <span>Sursă Main Update: <span className="text-primary-400 font-bold">{lastSyncSource}</span></span>
                    </div>
                    <span>{t('settings.lastSync')}: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : t('settings.neverSynced')}</span>
                </div>
            </div>
        </div>
    );

    const dayOrder = ['luni', 'marti', 'miercuri', 'joi', 'vineri', 'sambata', 'duminica'];

    if (user?.role === UserRole.MECHANIC) {
        return (
            <div className="space-y-8 animate-fade-in pb-20">
                <h1 className="text-3xl font-bold text-white mb-4">Profil Mecanic</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <HudPanel title="Datele Tale">
                        <div className="flex flex-col items-center mb-6">
                            {user.profilePicture ? (
                                <img src={user.profilePicture} alt={user.username} className="w-24 h-24 rounded-full object-cover border-4 border-primary-500 mb-4" />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center text-3xl font-bold text-primary-500 border-4 border-primary-500 mb-4">
                                    {user.username.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <h2 className="text-2xl font-bold text-white">{user.username}</h2>
                            <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs font-bold mt-2 border border-blue-700 uppercase tracking-wider">
                                {user.role}
                            </span>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Email</label>
                                <input type="text" value={user.email || '-'} disabled className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-gray-400 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">ID Sistem</label>
                                <input type="text" value={user.id} disabled className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-gray-400 font-mono text-xs cursor-not-allowed" />
                            </div>
                        </div>
                    </HudPanel>

                    <HudPanel title={t('settings.themeTitle')}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('settings.accentColor')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {(Object.keys(colorPalettes) as ThemeColor[]).map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setThemeColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${themeColor === color ? 'border-white scale-110 ring-2 ring-white/50' : 'border-transparent'}`}
                                            style={{ backgroundColor: `rgb(${colorPalettes[color]['500']})` }}
                                            title={t(`settings.color.${color}`)}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{t('settings.language')}</label>
                                <div className="flex bg-gray-800 rounded-lg p-1">
                                    <button onClick={() => setLanguage('ro')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${language === 'ro' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>Română</button>
                                    <button onClick={() => setLanguage('en')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${language === 'en' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>English</button>
                                </div>
                            </div>
                        </div>
                    </HudPanel>

                    <HudPanel title={t('settings.dataManagement')}>
                        {syncSettingsContent}
                    </HudPanel>
                </div>
            </div>
        );
    }

    // --- ADMIN VIEW ---
    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {isCsvExportModalOpen && <CsvExportModal data={data} onClose={() => setIsCsvExportModalOpen(false)} showNotification={showNotification} />}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">{t('nav.settings')}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Visual & System Settings */}
                <div className="space-y-6">
                    <HudPanel title={t('settings.themeTitle')}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('settings.accentColor')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {(Object.keys(colorPalettes) as ThemeColor[]).map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setThemeColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${themeColor === color ? 'border-white scale-110 ring-2 ring-white/50' : 'border-transparent'}`}
                                            style={{ backgroundColor: `rgb(${colorPalettes[color]['500']})` }}
                                            title={t(`settings.color.${color}`)}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                <div>
                                    <p className="text-sm font-bold text-white">{t('settings.highContrast')}</p>
                                    <p className="text-xs text-gray-400">{t('settings.highContrastDesc')}</p>
                                </div>
                                <button 
                                    onClick={() => setIsHighContrast(!isHighContrast)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isHighContrast ? 'bg-primary-600' : 'bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isHighContrast ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{t('settings.language')}</label>
                                <div className="flex bg-gray-800 rounded-lg p-1">
                                    <button onClick={() => setLanguage('ro')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${language === 'ro' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>Română</button>
                                    <button onClick={() => setLanguage('en')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${language === 'en' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>English</button>
                                </div>
                            </div>
                        </div>
                        {renderSaveButton()}
                    </HudPanel>

                    <HudPanel title={t('settings.branding')}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('settings.logo')}</label>
                                <div className="flex items-center gap-4 bg-gray-800/30 p-2 rounded border border-gray-700">
                                    {garageInfo.customLogo ? (
                                        <img src={garageInfo.customLogo} alt="Logo" className="h-12 w-auto rounded bg-white/10" />
                                    ) : (
                                        <div className="h-12 w-12 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">N/A</div>
                                    )}
                                    <div className="flex-grow">
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-white hover:file:bg-gray-600 w-full" />
                                        <p className="text-[10px] text-gray-500 mt-1">{t('settings.logoSpecs')}</p>
                                    </div>
                                    {garageInfo.customLogo && (
                                        <button onClick={() => setGarageInfo(prev => ({...prev, customLogo: undefined}))} className="text-red-400 hover:text-red-300 p-1">✕</button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Stil Logo NPC</label>
                                <select 
                                    name="logoVariant" 
                                    value={garageInfo.logoVariant || 'default'} 
                                    onChange={handleGarageInfoChange}
                                    className="w-full p-2 futuristic-select"
                                >
                                    <option value="default">Industrial Gear (Implicit)</option>
                                    <option value="rpm">Turometru Sport</option>
                                    <option value="wings">Classic Wings</option>
                                    <option value="hex">Cyberpunk Hex</option>
                                    <option value="shield">Premium Shield</option>
                                </select>
                            </div>
                        </div>
                        {renderSaveButton()}
                    </HudPanel>

                    <HudPanel title={t('settings.generalSettings')}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('settings.garageName')}</label>
                                    <input type="text" name="name" value={garageInfo.name} onChange={handleGarageInfoChange} className="w-full p-2 futuristic-input" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('settings.phone')}</label>
                                    <input type="text" name="phone" value={garageInfo.phone} onChange={handleGarageInfoChange} className="w-full p-2 futuristic-input" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('settings.address')}</label>
                                <input type="text" name="address" value={garageInfo.address} onChange={handleGarageInfoChange} className="w-full p-2 futuristic-input" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('settings.email')}</label>
                                <input type="text" name="email" value={garageInfo.email} onChange={handleGarageInfoChange} className="w-full p-2 futuristic-input" />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">API Key (Google Gemini)</label>
                                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-2 futuristic-input" placeholder="AI Key..." />
                            </div>
                        </div>
                        {renderSaveButton()}
                    </HudPanel>
                </div>

                {/* 2. Operational & Financial */}
                <div className="space-y-6">
                    <HudPanel title={t('settings.operationalSettings')}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('settings.estimateNumbering')} ({t('settings.prefix')})</label>
                                    <input type="text" name="estimateNumberPrefix" value={garageInfo.estimateNumberPrefix} onChange={handleGarageInfoChange} className="w-full p-2 futuristic-input text-center" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('settings.startNumber')}</label>
                                    <input type="number" name="estimateNumberStart" value={garageInfo.estimateNumberStart} onChange={handleGarageInfoChange} className="w-full p-2 futuristic-input text-center" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('settings.defaultLaborRate')}</label>
                                    <input type="number" name="defaultLaborRate" value={garageInfo.defaultLaborRate} onChange={handleGarageInfoChange} className="w-full p-2 futuristic-input" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Adaos Piese (%)</label>
                                    <input type="number" name="defaultPartsMarkup" value={garageInfo.defaultPartsMarkup || 0} onChange={handleGarageInfoChange} className="w-full p-2 futuristic-input" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('settings.defaultCurrency')}</label>
                                    <select name="currency" value={garageInfo.currency} onChange={handleGarageInfoChange} className="w-full p-2 futuristic-select">
                                        <option value="RON">RON</option>
                                        <option value="EUR">EUR</option>
                                        <option value="USD">USD</option>
                                        <option value="GBP">GBP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">{t('settings.currencyPosition')}</label>
                                    <select name="currencyPosition" value={garageInfo.currencyPosition} onChange={handleGarageInfoChange} className="w-full p-2 futuristic-select">
                                        <option value="after">După (100 RON)</option>
                                        <option value="before">Înainte ($100)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1">{t('settings.defaultTerms')}</label>
                                <textarea name="termsAndConditions" value={garageInfo.termsAndConditions} onChange={handleGarageInfoChange} rows={3} className="w-full p-2 futuristic-input text-xs"></textarea>
                            </div>
                        </div>
                        {renderSaveButton()}
                    </HudPanel>

                    <HudPanel title={t('settings.workshopSchedule')}>
                        <div className="space-y-2">
                            {dayOrder.map(day => (
                                <div key={day} className="flex items-center gap-2 text-sm">
                                    <div className="w-24 font-bold text-gray-300 capitalize">{t(`settings.day.${day}`)}</div>
                                    <input 
                                        type="checkbox" 
                                        checked={garageInfo.schedule[day]?.isOpen} 
                                        onChange={(e) => handleScheduleChange(day, 'isOpen', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                                    />
                                    {garageInfo.schedule[day]?.isOpen ? (
                                        <div className="flex items-center gap-2 flex-grow">
                                            <select 
                                                value={garageInfo.schedule[day].start} 
                                                onChange={(e) => handleScheduleChange(day, 'start', e.target.value)} 
                                                className="bg-gray-800 border border-gray-700 text-white text-xs rounded p-1 appearance-none cursor-pointer hover:bg-gray-700 focus:border-primary-500 outline-none"
                                            >
                                                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <span className="text-gray-500">-</span>
                                            <select 
                                                value={garageInfo.schedule[day].end} 
                                                onChange={(e) => handleScheduleChange(day, 'end', e.target.value)} 
                                                className="bg-gray-800 border border-gray-700 text-white text-xs rounded p-1 appearance-none cursor-pointer hover:bg-gray-700 focus:border-primary-500 outline-none"
                                            >
                                                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500 italic text-xs flex-grow">{t('settings.closed')}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {renderSaveButton()}
                    </HudPanel>
                </div>
            </div>

            {/* 3. Loyalty & Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HudPanel title={t('settings.loyaltySettingsTitle')}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Puncte per 1 {garageInfo.currency}</label>
                            <input 
                                type="number" 
                                value={loyaltyConfig.POINTS_PER_RON} 
                                onChange={(e) => setLoyaltyConfig({...loyaltyConfig, POINTS_PER_RON: parseFloat(e.target.value)})} 
                                step="0.1"
                                className="w-full p-2 futuristic-input" 
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <h4 className="font-bold text-primary-400 text-sm border-b border-primary-500/30 pb-1">Niveluri (Tiers)</h4>
                            {Object.values(LoyaltyTier).filter(tier => tier !== LoyaltyTier.STAFF).map(tier => {
                                const config = loyaltyConfig.TIERS[tier];
                                return (
                                    <div key={tier} className="bg-gray-800/40 p-2 rounded border border-gray-700">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-white text-sm">{t(getLoyaltyTierNameKey(tier))}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="text-[10px] text-gray-500">Puncte</label>
                                                <input 
                                                    type="number" 
                                                    value={config.points} 
                                                    onChange={(e) => setLoyaltyConfig(prev => ({...prev, TIERS: {...prev.TIERS, [tier]: {...prev.TIERS[tier], points: parseInt(e.target.value)}} }) )}
                                                    className="w-full p-1 text-xs bg-gray-900 border border-gray-700 rounded text-white" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500">Red. Manoperă %</label>
                                                <input 
                                                    type="number" 
                                                    value={(config.laborDiscount * 100).toFixed(0)} 
                                                    onChange={(e) => setLoyaltyConfig(prev => ({...prev, TIERS: {...prev.TIERS, [tier]: {...prev.TIERS[tier], laborDiscount: parseFloat(e.target.value)/100}} }) )}
                                                    className="w-full p-1 text-xs bg-gray-900 border border-gray-700 rounded text-white" 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500">Red. Piese %</label>
                                                <input 
                                                    type="number" 
                                                    value={(config.partsDiscount * 100).toFixed(0)} 
                                                    onChange={(e) => setLoyaltyConfig(prev => ({...prev, TIERS: {...prev.TIERS, [tier]: {...prev.TIERS[tier], partsDiscount: parseFloat(e.target.value)/100}} }) )}
                                                    className="w-full p-1 text-xs bg-gray-900 border border-gray-700 rounded text-white" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {renderSaveButton(() => {
                        setLastLocalUpdate(new Date().toISOString());
                        showNotification(t('settings.notificationLoyaltySaved'), 'success');
                        setTimeout(() => runSync(), 1500);
                    }, t('settings.saveLoyalty'))}
                </HudPanel>

                <HudPanel title={t('settings.dataManagement')}>
                    {syncSettingsContent}

                    <div className="border-t border-gray-700 pt-4 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <button onClick={handleExportData} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            Backup (JSON)
                        </button>
                        
                        <div className="relative">
                            <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportData} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg w-full flex items-center justify-center gap-2 text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                {t('settings.import')}
                            </button>
                        </div>
                        <button onClick={() => setIsCsvExportModalOpen(true)} className="bg-blue-800 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                            Export CSV
                        </button>
                    </div>

                    <div className="border-t border-red-900/50 pt-4 mt-4">
                        <h4 className="text-xs font-bold text-red-400 mb-2">{t('settings.dangerZone')}</h4>
                        <button onClick={handleResetData} className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800 font-bold py-2 px-4 rounded-lg w-full flex items-center justify-center gap-2 text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                            {t('settings.resetApp')}
                        </button>
                    </div>
                </HudPanel>
            </div>
        </div>
    );
};

export default Settings;