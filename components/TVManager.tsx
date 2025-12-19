import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';

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


const ToggleSwitch: React.FC<{ label: string; enabled: boolean; onChange: () => void }> = ({ label, enabled, onChange }) => (
    <div 
        onClick={onChange}
        className="flex items-center justify-between p-4 bg-gray-950/50 rounded-lg border border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors"
    >
        <span className="font-semibold text-white">{label}</span>
        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-primary-600' : 'bg-gray-600'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </div>
    </div>
);

const BROKEN_IMAGE_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzRmNGY0NiI+PHBhdGggZD0iTTE5IDUuNVYxOWgtMTRWNS41aDE0bTAtMkg1Yy0xLjEgMC0yIC45LTIgMnYxNGMwIDEuMS45IDIgMiAyaDE0YzEuMSAwIDItLjkgMi0yVjUuNWMwLTEuMS0uOS0yLTItMnpNMTQgOS43NWwxLjc1IDEuNzVMMTggOS43NWwxLjUgMS41TDE2LjI1IDEzbDEuNzUgMS43NUwxOCAxNi4yNWwtMS43NS0xLjc1TDE0LjUgMTYuMjVsLTEuNS0xLjVMMTQuNzUgMTNsLTEuNzUtMS43NXoiLz48L3N2Zz4=';


const TVManager: React.FC = () => {
    const { t } = useLanguage();
    const [config, setConfig] = useLocalStorage<TVDisplayConfig>('tv-display-config', defaultConfig);
    
    // Content management state
    const [announcement, setAnnouncement] = useLocalStorage<string>('garage-announcement', 'Atenție: Mâine, 25.07, se livrează comanda de piese Motodis. Verificați necesarul!');
    const [galleryImages, setGalleryImages] = useLocalStorage<string[]>('tv-gallery-images', []);
    const [newImageUrl, setNewImageUrl] = useState('');

    const handleToggle = (key: keyof TVDisplayConfig) => {
        setConfig(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleResetVisibility = () => {
        if (confirm(t('tvManager.resetConfirm'))) {
            setConfig(defaultConfig);
        }
    };
    
    // Gallery management functions
    const handleAddImage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newImageUrl.trim() && !galleryImages.includes(newImageUrl.trim())) {
            setGalleryImages(prev => [...prev, newImageUrl.trim()]);
            setNewImageUrl('');
        }
    };

    const handleDeleteImage = (urlToDelete: string) => {
        setGalleryImages(prev => prev.filter(url => url !== urlToDelete));
    };

    const configOptions: { key: keyof TVDisplayConfig; label: string }[] = [
        { key: 'showWorkshopStatus', label: t('tvManager.widgets.workshopStatus') },
        { key: 'showKpis', label: t('tvManager.widgets.kpis') },
        { key: 'showWaitingList', label: t('tvManager.widgets.waitingList') },
        { key: 'showStockAlerts', label: t('tvManager.widgets.stockAlerts') },
        { key: 'showTodaysAgenda', label: t('tvManager.widgets.todaysAgenda') },
        { key: 'showActivePromotions', label: t('tvManager.widgets.activePromotions') },
        { key: 'showCompletedToday', label: t('tvManager.widgets.completedToday') },
        { key: 'showPositiveFeedback', label: t('tvManager.widgets.positiveFeedback') },
        { key: 'showGallery', label: t('tvManager.widgets.gallery') },
        { key: 'showInfoPanel', label: t('tvManager.widgets.infoPanel') },
    ];


    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">{t('tvManager.title')}</h1>
                    <p className="text-gray-400 mt-1 max-w-2xl">{t('tvManager.description')}</p>
                </div>
                 <a 
                    href="?view=tv"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-cyan-600/50 text-cyan-200 font-bold py-3 px-6 rounded-lg border-2 border-cyan-500/80 hover:bg-cyan-500/70 hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center gap-2 self-start sm:self-center"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15 5H5a2 2 0 00-2 2v5a2 2 0 002 2h2v1a1 1 0 001 1h4a1 1 0 001-1v-1h2a2 2 0 002-2V7a2 2 0 00-2-2zm-1 7H6V7h8v5z"/>
                     </svg>
                    {t('tvManager.openInNewTab')}
                </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                <HudPanel title="Vizibilitate Panouri">
                    <div className="space-y-4">
                        {configOptions.map(option => (
                            <ToggleSwitch
                                key={option.key}
                                label={option.label}
                                enabled={config[option.key]}
                                onChange={() => handleToggle(option.key)}
                            />
                        ))}
                    </div>
                    <div className="mt-6 border-t border-primary-500/20 pt-4 flex justify-end">
                        <button onClick={handleResetVisibility} className="text-xs bg-amber-900/50 text-amber-300 border border-amber-700/50 px-3 py-1.5 rounded-lg hover:bg-amber-800/50">
                            {t('tvManager.resetVisibility')}
                        </button>
                    </div>
                </HudPanel>
                
                <HudPanel title={t('tvManager.contentManagement')}>
                     <div className="space-y-6">
                        {/* Announcement */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('tvManager.announcementTitle')}</label>
                            <textarea 
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                                rows={3}
                                className="w-full p-2 futuristic-input"
                                placeholder={t('tvManager.announcementPlaceholder')}
                            />
                        </div>

                        {/* Gallery */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('tvManager.galleryTitle')}</label>
                            <form onSubmit={handleAddImage} className="flex gap-2 mb-4">
                                <input 
                                    type="url"
                                    value={newImageUrl}
                                    onChange={(e) => setNewImageUrl(e.target.value)}
                                    placeholder={t('tvManager.addImageUrl')}
                                    className="flex-grow p-2 futuristic-input"
                                />
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">{t('tvManager.addImageButton')}</button>
                            </form>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {galleryImages.length > 0 ? galleryImages.map(url => (
                                    <div key={url} className="flex items-center justify-between p-2 bg-gray-800/50 rounded text-xs">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <img 
                                                src={url} 
                                                alt="Previzualizare" 
                                                className="w-10 h-10 object-cover rounded bg-gray-700 flex-shrink-0"
                                                onError={(e) => { e.currentTarget.src = BROKEN_IMAGE_PLACEHOLDER; e.currentTarget.classList.add('p-1'); }}
                                            />
                                            <span className="truncate text-gray-300 flex-grow" title={url}>{url}</span>
                                        </div>
                                        <button onClick={() => handleDeleteImage(url)} className="text-red-400 hover:text-red-300 ml-2 px-2 flex-shrink-0">✕</button>
                                    </div>
                                )) : <p className="text-center text-gray-500 text-sm py-4">Nicio imagine personalizată adăugată.</p>}
                            </div>
                        </div>
                     </div>
                </HudPanel>
            </div>
        </div>
    );
};

export default TVManager;