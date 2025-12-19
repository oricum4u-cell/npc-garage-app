
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { 
    Estimate, Mechanic, StockItem, PredefinedLabor, Appointment, 
    UserRole, EstimateStatus, Promotion, Supplier, PurchaseOrder, 
    ServiceRequest, DamageDossier, JobKit, WorkshopBay, Feedback 
} from '../types.ts';
import { 
    ESTIMATES_MOCK, MECHANICS_MOCK, STOCK_ITEMS_MOCK, 
    PREDEFINED_LABOR_ITEMS_MOCK, APPOINTMENTS_MOCK, PROMOTIONS_MOCK, 
    SUPPLIERS_MOCK, PURCHASE_ORDERS_MOCK, SERVICE_REQUESTS_MOCK, 
    WORKSHOP_BAYS_MOCK, JOB_KITS_MOCK, FEEDBACK_MOCK
} from '../data/motorcycleData.ts';

// Components
import DashboardHome from './DashboardHome.tsx';
import EstimatesList from './EstimatesList.tsx';
import EstimateForm from './EstimateForm.tsx';
import EstimateDetailView from './EstimateDetailView.tsx';
import WorkshopView from './WorkshopView.tsx';
import ClientsDashboard from './ClientsDashboard.tsx';
import LoyaltyProgram from './LoyaltyProgram.tsx';
import MechanicsManager from './MechanicsManager.tsx';
import PricingManager from './PricingManager.tsx';
import StockManager from './StockManager.tsx';
import SuppliersManager from './SuppliersManager.tsx';
import DetailingManager from './DetailingManager.tsx';
import StorageManager from './StorageManager.tsx';
import TransportManager from './TransportManager.tsx';
import ServiceRequestsView from './ServiceRequestsView.tsx';
import DamageDossierManager from './DamageDossierManager.tsx';
import CommunicationsHub from './CommunicationsHub.tsx';
import TVManager from './TVManager.tsx';
import Settings from './Settings.tsx';
import AppointmentsView from './AppointmentsView.tsx';
import MotorcycleHistory from './MotorcycleHistory.tsx';
import PromotionsManager from './PromotionsManager.tsx';
import AdvancedReports from './AdvancedReports.tsx';
import UserManager from './UserManager.tsx';
import UserProfile from './UserProfile.tsx';

// UI Components
import Logo from './Logo.tsx';
import RadioPlayer from './RadioPlayer.tsx';
import ServiceStatus from './ServiceStatus.tsx';
import DarkModeToggle from './DarkModeToggle.tsx';
import GlobalSearchBar from './GlobalSearchBar.tsx';
import ApiKeyPrompt from './ApiKeyPrompt.tsx';

// Helper types
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

const SyncIndicator: React.FC<{ status: SyncStatus, lastSync: string | null, t: (key: string) => string, backupTimer: string }> = ({ status, lastSync, t, backupTimer }) => {
    const statusInfo = {
        idle: { icon: '☁️', color: 'text-gray-400', label: t('settings.syncStatus.idle') },
        syncing: { icon: '🔄', color: 'text-green-400 animate-spin', label: t('settings.syncStatus.syncing') },
        synced: { icon: '✔️', color: 'text-green-500', label: t('settings.syncStatus.synced') },
        error: { icon: '⚠️', color: 'text-red-400', label: t('settings.syncStatus.error') },
    };
    const currentStatus = statusInfo[status];
    const title = `${currentStatus.label}\n${t('settings.lastSync')}: ${lastSync ? new Date(lastSync).toLocaleTimeString() : t('settings.neverSynced')}`;
    
    return (
        <div className="flex items-center gap-3 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700/50 transition-all hover:bg-gray-800/60">
            <div className="text-xl cursor-help" title={title}>
                <span className={currentStatus.color}>{currentStatus.icon}</span>
            </div>
            {backupTimer && (
                <div className="flex flex-col items-end border-l border-gray-600 pl-3">
                    <span className="text-[9px] text-gray-500 font-mono leading-none uppercase tracking-wider mb-0.5">Backup</span>
                    <span className="text-xs text-primary-300 font-bold font-mono leading-none">{backupTimer}</span>
                </div>
            )}
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const { t } = useLanguage();

    // Data State
    const [estimates, setEstimates] = useLocalStorage<Estimate[]>('garage-estimates', ESTIMATES_MOCK);
    const [mechanics, setMechanics] = useLocalStorage<Mechanic[]>('garage-mechanics', MECHANICS_MOCK);
    const [stockItems, setStockItems] = useLocalStorage<StockItem[]>('garage-stock', STOCK_ITEMS_MOCK);
    const [predefinedLaborItems, setPredefinedLaborItems] = useLocalStorage<PredefinedLabor[]>('garage-labor', PREDEFINED_LABOR_ITEMS_MOCK);
    const [appointments, setAppointments] = useLocalStorage<Appointment[]>('garage-appointments', APPOINTMENTS_MOCK);
    const [promotions, setPromotions] = useLocalStorage<Promotion[]>('garage-promotions', PROMOTIONS_MOCK);
    const [suppliers, setSuppliers] = useLocalStorage<Supplier[]>('garage-suppliers', SUPPLIERS_MOCK);
    const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('garage-orders', PURCHASE_ORDERS_MOCK);
    const [serviceRequests, setServiceRequests] = useLocalStorage<ServiceRequest[]>('garage-service-requests', SERVICE_REQUESTS_MOCK);
    const [dossiers, setDossiers] = useLocalStorage<DamageDossier[]>('garage-dossiers', []);
    const [jobKits, setJobKits] = useLocalStorage<JobKit[]>('garage-job-kits', JOB_KITS_MOCK);
    const [bays, setBays] = useLocalStorage<WorkshopBay[]>('garage-bays', WORKSHOP_BAYS_MOCK);
    const [feedback, setFeedback] = useLocalStorage<Feedback[]>('garage-feedback', FEEDBACK_MOCK);

    // App State
    const [currentView, setCurrentView] = useState('DASHBOARD');
    const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Notification Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; id: number } | null>(null);
    
    // Appointment Prefill from Service Request
    const [appointmentPrefill, setAppointmentPrefill] = useState<any>(null);

    // Sync & Backup State
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [lastSyncSource] = useState<string>('Local');
    
    // Backup Timer Logic
    const [lastBackupTime] = useLocalStorage<number>('last-auto-backup-time', Date.now());
    const [backupTimer, setBackupTimer] = useState<string>('--h --m');

    useEffect(() => {
        const updateTimer = () => {
            const now = Date.now();
            const BACKUP_INTERVAL_MS = 15 * 60 * 1000; 
            const nextBackup = lastBackupTime + BACKUP_INTERVAL_MS;
            const diff = nextBackup - now;

            if (diff <= 0) {
                setBackupTimer('Acum');
            } else {
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                setBackupTimer(`${hours}h ${minutes}m`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [lastBackupTime]);

    // API Key Handling
    const [apiKey, setApiKey] = useLocalStorage<string | null>('gemini-api-key', null);
    const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);

    useEffect(() => {
        const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
        if (!envKey && !apiKey) {
             setShowApiKeyPrompt(true);
        } else {
             setShowApiKeyPrompt(false);
        }
    }, [apiKey]);

    const runSync = async () => {
        setSyncStatus('syncing');
        setTimeout(() => {
            setSyncStatus('synced');
            setLastSyncTime(new Date().toISOString());
        }, 1000);
    };

    const handleNotification = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now();
        setToast({ message: msg, type, id });
        setTimeout(() => {
            setToast(current => (current?.id === id ? null : current));
        }, 3000);
    };

    // Navigation Items - Simplified
    const navItems = [
        { type: 'separator', name: t('nav.operations') },
        { name: t('nav.dashboard'), view: 'DASHBOARD', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> },
        { name: t('nav.workshop'), view: 'WORKSHOP', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
        { name: t('nav.estimates'), view: 'ESTIMATES', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2-2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg> },
        { name: t('nav.appointments'), view: 'APPOINTMENTS', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> },
        { name: t('nav.vehicleHistory'), view: 'HISTORY', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg> },

        { type: 'separator', name: t('nav.management') },
        { name: t('nav.stockManagement'), view: 'STOCK', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg> },
        { name: t('nav.suppliers'), view: 'SUPPLIERS', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" /></svg> },
        { name: t('nav.mechanicsManagement'), view: 'MECHANICS', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" /></svg>, adminOnly: true },
        { name: t('nav.pricingManagement'), view: 'PRICING', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>, adminOnly: true },

        { type: 'separator', name: t('nav.business') },
        { name: t('nav.clientLoyalty'), view: 'LOYALTY', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1V8a1 1 0 011-1zm5-5a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1V8a1 1 0 011-1z" clipRule="evenodd" /></svg> },
        { name: t('nav.promotions'), view: 'PROMOTIONS', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>, adminOnly: true },
        { name: t('nav.advancedReports'), view: 'ADVANCED_REPORTS', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>, adminOnly: true },
        { name: t('nav.communications'), view: 'COMMUNICATIONS', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" /></svg> },

        { type: 'separator', name: t('nav.extraServices') },
        { name: t('nav.detailing'), view: 'DETAILING', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg> },
        { name: t('nav.storage'), view: 'STORAGE', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg> },
        { name: t('nav.transport'), view: 'TRANSPORT', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" /></svg> },

        { type: 'separator', name: t('nav.administration') },
        { name: t('nav.profile'), view: 'USER_PROFILE', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" /></svg> },
        { name: t('nav.users'), view: 'USER_MANAGER', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>, adminOnly: true },
        { name: t('nav.tvManager'), view: 'TV_MANAGER', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.9 2.6a1 1 0 01-.97 1.4H6.29a1 1 0 01-.97-1.4l.9-2.6H5a2 2 0 01-2-2V5zm2 0v8h10V5H5z" clipRule="evenodd" /></svg>, adminOnly: true },
        { name: t('nav.settings'), view: 'SETTINGS', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
    ];

    const handleViewEstimate = (id: string) => {
        setSelectedEstimateId(id);
        setCurrentView('ESTIMATE_DETAIL');
    };

    const handleEditEstimate = (id: string) => {
        setSelectedEstimateId(id);
        setCurrentView('ESTIMATE_EDIT');
    };

    const handleSaveEstimate = (estimate: Estimate) => {
        setIsLoading(true);
        setTimeout(() => {
            const existingIndex = estimates.findIndex(e => e.id === estimate.id);
            if (existingIndex >= 0) {
                const newEstimates = [...estimates];
                newEstimates[existingIndex] = estimate;
                setEstimates(newEstimates);
            } else {
                setEstimates([...estimates, estimate]);
            }
            setIsLoading(false);
            setCurrentView('ESTIMATES');
            setSelectedEstimateId(null);
            handleNotification(t('notifications.estimateUpdated'), 'success');
        }, 500);
    };

    const handleDeleteEstimate = (id: string) => {
        setEstimates(estimates.filter(e => e.id !== id));
        setCurrentView('ESTIMATES');
        setSelectedEstimateId(null);
        handleNotification(t('notifications.estimateDeleted'), 'info');
    };

    const handleUpdateEstimateStatus = (id: string, status: EstimateStatus) => {
        setEstimates(estimates.map(e => e.id === id ? { ...e, status } : e));
    };

    const handleSaveMechanic = (mechanic: Mechanic) => {
        if (mechanic.id && mechanics.some(m => m.id === mechanic.id)) {
            setMechanics(mechanics.map(m => m.id === mechanic.id ? mechanic : m));
        } else {
            setMechanics([...mechanics, mechanic]);
        }
    };

    const handleDeleteMechanic = (id: string) => {
        setMechanics(mechanics.filter(m => m.id !== id));
    };

    const renderContent = () => {
        switch (currentView) {
            case 'DASHBOARD':
                return <DashboardHome 
                    user={user} 
                    estimates={estimates} 
                    appointments={appointments}
                    stockItems={stockItems}
                    mechanics={mechanics}
                    bays={bays}
                    setView={setCurrentView}
                    onViewEstimate={handleViewEstimate}
                />;
            case 'ESTIMATES':
                return <EstimatesList 
                    estimates={estimates} 
                    onViewEstimate={handleViewEstimate} 
                    onEditEstimate={handleEditEstimate} 
                    onDeleteEstimate={handleDeleteEstimate}
                    setView={setCurrentView}
                    onUpdateStatus={handleUpdateEstimateStatus}
                />;
            case 'ESTIMATE_NEW':
                return <EstimateForm 
                    onSave={handleSaveEstimate} 
                    onCancel={() => setCurrentView('DASHBOARD')}
                    predefinedLabor={predefinedLaborItems}
                    stockItems={stockItems}
                    mechanics={mechanics}
                    estimates={estimates}
                    promotions={promotions}
                    appointments={appointments}
                    jobKits={jobKits}
                />;
            case 'ESTIMATE_EDIT':
                const estimateToEdit = estimates.find(e => e.id === selectedEstimateId);
                return estimateToEdit ? <EstimateForm 
                    estimate={estimateToEdit} 
                    onSave={handleSaveEstimate} 
                    onCancel={() => setCurrentView('ESTIMATES')}
                    predefinedLabor={predefinedLaborItems}
                    stockItems={stockItems}
                    mechanics={mechanics}
                    estimates={estimates}
                    promotions={promotions}
                    appointments={appointments}
                    jobKits={jobKits}
                /> : <div>Deviz negăsit</div>;
            case 'ESTIMATE_DETAIL':
                const estimateToView = estimates.find(e => e.id === selectedEstimateId);
                return estimateToView ? <EstimateDetailView 
                    estimate={estimateToView} 
                    onBack={() => setCurrentView('ESTIMATES')} 
                    onEdit={handleEditEstimate}
                    onUpdateEstimate={handleSaveEstimate}
                    promotions={promotions}
                    setView={setCurrentView}
                    mechanics={mechanics}
                    showNotification={handleNotification}
                /> : <div>Deviz negăsit</div>;
            case 'WORKSHOP':
                return <WorkshopView 
                    estimates={estimates} 
                    mechanics={mechanics} 
                    bays={bays} 
                    setBays={setBays}
                    onViewEstimate={handleViewEstimate}
                />;
            case 'HISTORY':
                return <MotorcycleHistory estimates={estimates} mechanics={mechanics} />;
            case 'LOYALTY':
                return <LoyaltyProgram estimates={estimates} />;
            case 'MECHANICS':
                return <MechanicsManager 
                    mechanics={mechanics} 
                    setMechanics={setMechanics} 
                    setIsAppLoading={setIsLoading}
                    estimates={estimates}
                    onSave={handleSaveMechanic}
                    onDelete={handleDeleteMechanic}
                />;
            case 'PRICING':
                return <PricingManager 
                    items={predefinedLaborItems}
                    onSaveLabor={(item) => {
                        if(predefinedLaborItems.some(i => i.id === item.id)) {
                            setPredefinedLaborItems(prev => prev.map(i => i.id === item.id ? item : i));
                        } else {
                            setPredefinedLaborItems(prev => [...prev, item]);
                        }
                    }}
                    onDeleteLabor={(id) => setPredefinedLaborItems(prev => prev.filter(i => i.id !== id))}
                    jobKits={jobKits}
                    onSaveKit={(kit) => setJobKits(prev => [...prev, kit])}
                    onDeleteKit={(id) => setJobKits(prev => prev.filter(k => k.id !== id))}
                    estimates={estimates}
                />;
            case 'STOCK':
                return <StockManager 
                    items={stockItems} 
                    onSave={(item) => {
                        if('id' in item) {
                            setStockItems(prev => prev.map(i => i.id === item.id ? item : i));
                        } else {
                            setStockItems(prev => [...prev, {id: `stock-${Date.now()}`, ...item}]);
                        }
                    }} 
                    onDelete={(id) => setStockItems(prev => prev.filter(i => i.id !== id))}
                    showNotification={handleNotification}
                />;
            case 'SUPPLIERS':
                return <SuppliersManager 
                    suppliers={suppliers}
                    setSuppliers={setSuppliers}
                    purchaseOrders={purchaseOrders}
                    setPurchaseOrders={setPurchaseOrders}
                    stockItems={stockItems}
                    setStockItems={setStockItems}
                    showNotification={handleNotification}
                    setIsAppLoading={setIsLoading}
                    estimates={estimates}
                />;
            case 'DETAILING':
                return <DetailingManager 
                    estimates={estimates}
                    setEstimates={setEstimates}
                    showNotification={handleNotification}
                />;
            case 'STORAGE':
                return <StorageManager />;
            case 'TRANSPORT':
                return <TransportManager />;
            case 'COMMUNICATIONS':
                return <CommunicationsHub estimates={estimates} />;
            case 'TV_MANAGER':
                return <TVManager />;
            case 'PROMOTIONS':
                return <PromotionsManager 
                    promotions={promotions}
                    setPromotions={setPromotions}
                    setIsAppLoading={setIsLoading}
                    showNotification={handleNotification}
                    estimates={estimates}
                />;
            case 'ADVANCED_REPORTS':
                return <AdvancedReports estimates={estimates} mechanics={mechanics} stockItems={stockItems} />;
            case 'USER_MANAGER':
                return <UserManager setIsAppLoading={setIsLoading} />;
            case 'USER_PROFILE':
                return <UserProfile />;
            case 'SETTINGS':
                return <Settings 
                    showNotification={handleNotification}
                    data={{ estimates, stockItems, predefinedLaborItems, mechanics, appointments, users: [], promotions, suppliers, purchaseOrders, serviceRequests, dossiers, jobKits }}
                    setters={{ setEstimates, setStockItems, setPredefinedLaborItems: setPredefinedLaborItems, setMechanics, setAppointments, setUsers: () => {}, setPromotions, setSuppliers, setPurchaseOrders, setServiceRequests, setDossiers, setJobKits }}
                    runSync={runSync}
                    lastSyncTime={lastSyncTime}
                    syncStatus={syncStatus}
                    lastSyncSource={lastSyncSource}
                />;
            case 'APPOINTMENTS':
                return <AppointmentsView 
                    appointments={appointments}
                    mechanics={mechanics}
                    onSave={(app) => {
                        if (appointments.some(a => a.id === app.id)) {
                            setAppointments(prev => prev.map(a => a.id === app.id ? app : a));
                        } else {
                            setAppointments(prev => [...prev, app]);
                        }
                    }}
                    onDelete={(id) => setAppointments(prev => prev.filter(a => a.id !== id))}
                    prefillData={appointmentPrefill}
                    onPrefillConsumed={() => setAppointmentPrefill(null)}
                />;
            default:
                return <DashboardHome 
                    user={user} 
                    estimates={estimates} 
                    appointments={appointments}
                    stockItems={stockItems}
                    mechanics={mechanics}
                    bays={bays}
                    setView={setCurrentView}
                    onViewEstimate={handleViewEstimate}
                />;
        }
    };

    return (
        <div className={`flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden transition-colors duration-300 scanline`}>
            {showApiKeyPrompt && (
                <div className="fixed inset-0 z-50">
                    <ApiKeyPrompt onApiKeySubmit={(key) => { setApiKey(key); setShowApiKeyPrompt(false); }} />
                </div>
            )}
            
            <div className="absolute inset-0 hud-grid opacity-30 pointer-events-none z-0"></div>

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-primary-500/20 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-2xl flex flex-col`}>
                <div className="flex items-center justify-center h-20 border-b border-primary-500/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary-600/10 animate-pulse"></div>
                    <Logo className="h-12 w-auto relative z-10" />
                    <span className="ml-3 text-2xl font-black tracking-widest text-white relative z-10 glitch-text" data-text="NPC">NPC</span>
                </div>

                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item, index) => {
                        if (item.type === 'separator') {
                            return <div key={index} className="px-4 py-2 mt-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{item.name}</div>;
                        }
                        if (item.adminOnly && user?.role !== UserRole.ADMIN) return null;
                        
                        const isActive = currentView === item.view;

                        return (
                            <button
                                key={index}
                                onClick={() => { setCurrentView(item.view || 'DASHBOARD'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative overflow-hidden ${isActive ? 'text-white bg-primary-600 shadow-[0_0_15px_rgba(var(--color-primary-500),0.5)]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                            >
                                <span className={`mr-3 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>{item.icon}</span>
                                <span className="relative z-10">{item.name}</span>
                                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-primary-600/0 via-white/10 to-primary-600/0 animate-shimmer"></div>}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Topbar */}
                <header className="flex items-center justify-between h-16 px-6 bg-gray-900/80 backdrop-blur-md border-b border-primary-500/20 shadow-lg">
                    <div className="flex items-center">
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-400 hover:text-white focus:outline-none lg:hidden mr-4">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        
                        <div className="hidden md:block w-96">
                            <GlobalSearchBar estimates={estimates} onResultClick={handleViewEstimate} />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <SyncIndicator status={syncStatus} lastSync={lastSyncTime} t={t} backupTimer={backupTimer} />
                        <RadioPlayer />
                        <ServiceStatus />
                        <div className="hidden md:block h-6 w-px bg-gray-700 mx-2"></div>
                        <DarkModeToggle />
                        
                        {/* Admin/User Profile Section */}
                        <div className="flex items-center gap-3 pl-2 border-l border-gray-700 ml-2">
                             <div className="hidden md:block text-right">
                                <p className="text-sm font-bold text-white leading-tight">{user?.username}</p>
                                <p className="text-[10px] text-primary-400 font-mono uppercase tracking-wide mt-0.5">{user?.role}</p>
                            </div>
                            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-400 transition-colors bg-gray-800/50 rounded-full hover:bg-red-900/20 border border-transparent hover:border-red-500/30" title={t('nav.logout')}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-4 sm:p-6 relative scroll-smooth">
                    {/* Background decoration */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-900/10 rounded-full blur-[100px]"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px]"></div>
                    </div>
                    
                    <div className="relative z-10 max-w-7xl mx-auto">
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* Overlay for mobile menu */}
            {isMobileMenuOpen && (
                <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"></div>
            )}

            {/* Notification Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-3 animate-slide-in-right ${
                    toast.type === 'success' ? 'bg-green-900/90 border-green-500 text-green-100' :
                    toast.type === 'error' ? 'bg-red-900/90 border-red-500 text-red-100' :
                    'bg-blue-900/90 border-blue-500 text-blue-100'
                }`}>
                    <span className="text-2xl">
                        {toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">{toast.type === 'success' ? 'Succes' : toast.type === 'error' ? 'Eroare' : 'Info'}</h4>
                        <p className="text-sm font-medium">{toast.message}</p>
                    </div>
                    <button onClick={() => setToast(null)} className="ml-4 text-white/50 hover:text-white">✕</button>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
