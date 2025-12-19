import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Estimate, PredefinedLabor, ServiceRequest, ServiceRequestStatus } from '../types.ts';
import { PREDEFINED_LABOR_ITEMS_MOCK, SERVICE_REQUESTS_MOCK, ESTIMATES_MOCK } from '../data/motorcycleData.ts';
import Logo from './Logo.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import ClientPortalDashboard from './ClientPortalDashboard.tsx';
import ClientPortalEstimateDetail from './ClientPortalEstimateDetail.tsx';

type PortalView = 'LOGIN' | 'DASHBOARD' | 'DETAIL';

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

const PublicClientPortal: React.FC = () => {
    const { garageInfo } = useGarage();
    const { t } = useLanguage();
    
    const [estimates] = useLocalStorage<Estimate[]>('garage-estimates', ESTIMATES_MOCK);
    const [authenticatedClient, setAuthenticatedClient] = useLocalStorage<string | null>('client-portal-auth', null);

    const [view, setView] = useState<PortalView>('LOGIN');
    const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);

    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const foundEstimate = estimates.find(est => est.customerPhone === phone);
        if (foundEstimate) {
            setAuthenticatedClient(phone);
            setError('');
        } else {
            setError('Numărul de telefon nu a fost găsit. Verificați numărul introdus sau creați o cerere de service nouă.');
        }
    };
    
    const handleLogout = () => {
        setAuthenticatedClient(null);
        setView('LOGIN');
    };

    const handleViewEstimate = (id: string) => {
        setSelectedEstimateId(id);
        setView('DETAIL');
    };
    
    const handleNavigate = (path: string) => {
        const newUrl = new URL(window.location.href);
        newUrl.search = path;
        window.location.href = newUrl.toString();
    };
    
    const selectedEstimate = useMemo(() => {
        if (!selectedEstimateId) return null;
        return estimates.find(e => e.id === selectedEstimateId);
    }, [selectedEstimateId, estimates]);


    const renderContent = () => {
        if (authenticatedClient) {
            switch (view) {
                case 'DASHBOARD':
                    return <ClientPortalDashboard 
                                clientPhone={authenticatedClient} 
                                estimates={estimates} 
                                onLogout={handleLogout} 
                                onViewEstimate={handleViewEstimate} 
                            />;
                case 'DETAIL':
                    if (selectedEstimate) {
                        return <ClientPortalEstimateDetail 
                                    estimate={selectedEstimate} 
                                    onBack={() => setView('DASHBOARD')} 
                                />;
                    }
                    // Fallback if estimate is not found
                    setView('DASHBOARD');
                    return null;
                default:
                    // Default to dashboard if logged in
                     return <ClientPortalDashboard 
                                clientPhone={authenticatedClient} 
                                estimates={estimates} 
                                onLogout={handleLogout} 
                                onViewEstimate={handleViewEstimate} 
                            />;
            }
        }
        
        // Render Login Form if not authenticated
        return (
            <div className="w-full max-w-lg mx-auto">
                <HudPanel title="Autentificare Portal Client">
                    <p className="text-center text-primary-300/80 mb-6">Introduceți numărul de telefon pentru a accesa istoricul și statusul lucrărilor.</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Număr de Telefon</label>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full p-2 futuristic-input" placeholder="07xxxxxxxx" />
                        </div>
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <button type="submit" className="w-full bg-primary-600/50 text-primary-200 font-bold py-3 px-6 rounded-lg">Autentificare</button>
                        <div className="flex justify-center pt-4">
                           <button type="button" onClick={() => handleNavigate('?view=request')} className="text-cyan-400 hover:text-cyan-300 font-semibold underline">Solicită Service Nou</button>
                        </div>
                        <button type="button" onClick={() => handleNavigate('')} className="w-full text-gray-400 text-xs font-bold hover:text-white transition-colors pt-4">Înapoi la Administrare</button>
                    </form>
                </HudPanel>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8 flex items-center justify-center scanline">
            <div className="absolute inset-0 hud-grid opacity-30 z-0"></div>
            <div className="w-full max-w-6xl z-10">
                <header className="text-center mb-6">
                    <Logo className="w-20 h-20 mx-auto mb-2" />
                    <h1 className="text-2xl font-bold text-white">{garageInfo.name}</h1>
                </header>
                {renderContent()}
            </div>
        </div>
    );
};

export default PublicClientPortal;