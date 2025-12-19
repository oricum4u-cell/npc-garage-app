
import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { GarageProvider } from './contexts/GarageContext.tsx';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { LoyaltyProvider } from './contexts/LoyaltyContext.tsx';
import { MusicProvider } from './contexts/MusicContext.tsx';

import Dashboard from './components/Dashboard.tsx';
import { useAuth } from './contexts/AuthContext.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import PublicClientPortal from './components/PublicClientPortal.tsx';
import PublicEstimateStatus from './components/PublicEstimateStatus.tsx';

const AppContent: React.FC = () => {
    const { user } = useAuth();
    // Initialize state safely in case accessing window.location throws
    const [currentPath, setCurrentPath] = useState(() => {
        try { return window.location.search; } catch { return ''; }
    });

    useEffect(() => {
        const handlePopState = () => {
            try { setCurrentPath(window.location.search); } catch { /* ignore */ }
        };

        const handleNavigate = (event: Event) => {
            const customEvent = event as CustomEvent;
            const newPath = customEvent.detail?.path;
            
            if (typeof newPath === 'string') {
                // Always update internal state to trigger re-render
                setCurrentPath(newPath);
                
                // Attempt to update URL for aesthetics/history, but ignore errors
                try {
                    const url = new URL(window.location.href);
                    if (newPath.startsWith('?')) {
                        url.search = newPath;
                    } else {
                        url.search = '';
                    }
                    window.history.pushState({}, '', url.toString());
                } catch (e) {
                    // Suppress SecurityError: The operation is insecure.
                    console.log('Navigation URL update suppressed due to environment restrictions.');
                }
            }
        };

        // Listen for browser back/forward
        window.addEventListener('popstate', handlePopState);
        // Listen for internal navigation requests
        window.addEventListener('navigate', handleNavigate);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('navigate', handleNavigate);
        };
    }, []);

    // Route: Public Client Portal (?portal=true)
    if (currentPath.includes('portal=true')) {
        return <PublicClientPortal />;
    }

    // Route: Public Estimate Status (?view=public)
    if (currentPath.includes('view=public')) {
        return <PublicEstimateStatus />;
    }
    
    // Route: Main Admin Dashboard (Requires Login)
    if (!user) {
        return <LoginScreen />;
    }

    return <Dashboard />;
};

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <ThemeProvider>
                <GarageProvider>
                    <AuthProvider>
                        <LoyaltyProvider>
                            <MusicProvider>
                                <AppContent />
                            </MusicProvider>
                        </LoyaltyProvider>
                    </AuthProvider>
                </GarageProvider>
            </ThemeProvider>
        </LanguageProvider>
    );
};

export default App;
