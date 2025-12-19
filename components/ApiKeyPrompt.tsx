import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';

interface ApiKeyPromptProps {
    onApiKeySubmit: (key: string) => void;
}

const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ onApiKeySubmit }) => {
    const [apiKey, setApiKey] = useState('');
    const { t } = useLanguage();
    
    React.useEffect(() => {
        document.body.classList.add('theme-hud');
        return () => {
            document.body.classList.remove('theme-hud');
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim()) {
            onApiKeySubmit(apiKey.trim());
        }
    };

    const HudPanel: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
        <div className={`relative w-full p-6 sm:p-8 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl shadow-2xl shadow-primary-900/50 ${className}`}>
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl"></div>
            {children}
        </div>
    );

    return (
        <div className="relative flex flex-col min-h-screen bg-gray-900 transition-colors duration-300 overflow-hidden scanline">
            <div className="absolute inset-0 hud-grid opacity-30"></div>
            <main className="flex-grow flex items-center justify-center w-full p-4 z-10">
                <div className="w-full max-w-lg text-center animate-fade-in">
                    <HudPanel>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">{t('apiKeyPrompt.title')}</h1>
                        <p className="text-primary-300/80 mb-6">
                            {t('apiKeyPrompt.description')} <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-bold text-primary-400 hover:text-primary-300 underline">{t('apiKeyPrompt.getYourKey')}</a>.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={t('apiKeyPrompt.inputPlaceholder')}
                                required
                                className="w-full p-3 futuristic-input text-center"
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="w-full py-3 px-4 font-bold text-white bg-primary-600/90 hover:bg-primary-600 rounded-lg transition-all duration-300 ring-1 ring-primary-500/50 hover:shadow-lg hover:shadow-primary-500/30 animate-glow"
                            >
                                {t('apiKeyPrompt.saveButton')}
                            </button>
                        </form>
                    </HudPanel>
                </div>
            </main>
        </div>
    );
};

export default ApiKeyPrompt;