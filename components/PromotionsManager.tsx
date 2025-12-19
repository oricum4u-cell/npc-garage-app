
import React, { useState, useMemo } from 'react';
import { Promotion, PromotionType, AIPromotionSuggestion, Estimate, EstimateStatus } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getPromotionTypeKey } from '../utils/translationHelpers.ts';
import { getAiPromotionIdeas } from '../services/geminiService.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { useGarage } from '../contexts/GarageContext.tsx';

interface PromotionsManagerProps {
    promotions: Promotion[];
    setPromotions: React.Dispatch<React.SetStateAction<Promotion[]>>;
    setIsAppLoading: (isLoading: boolean) => void;
    showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
    estimates: Estimate[];
}

const PromotionModal: React.FC<{
    promotion: Omit<Promotion, 'id' | 'isActive'> | null;
    id?: string;
    onSave: (promotionData: Omit<Promotion, 'id' | 'isActive'>, id?: string) => void;
    onClose: () => void;
}> = ({ promotion, id, onSave, onClose }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        name: promotion?.name || '',
        description: promotion?.description || '',
        type: promotion?.type || PromotionType.LABOR_PERCENTAGE,
        value: promotion?.value || 0,
        startDate: promotion?.startDate || '',
        endDate: promotion?.endDate || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() && formData.value > 0) {
            onSave(formData, id);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg animate-fade-in">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700"><h3 className="text-xl font-bold text-gray-900 dark:text-white">{t(id ? 'promotions.editModalTitle' : 'promotions.addModalTitle')}</h3></div>
                    <div className="p-6 space-y-4">
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder={t('promotions.namePlaceholder')} required className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder={t('promotions.descriptionPlaceholder')} rows={3} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"></textarea>
                        <div className="grid grid-cols-2 gap-4">
                            <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"><option value={PromotionType.LABOR_PERCENTAGE}>{t(getPromotionTypeKey(PromotionType.LABOR_PERCENTAGE))}</option><option value={PromotionType.PARTS_PERCENTAGE}>{t(getPromotionTypeKey(PromotionType.PARTS_PERCENTAGE))}</option></select>
                            <input type="number" name="value" value={formData.value} onChange={handleChange} placeholder={t('promotions.valuePlaceholder')} min="1" max="100" required className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.startDate')}</label><input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" /></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.endDate')}</label><input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600" /></div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-4 rounded-b-lg"><button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">{t('estimateForm.cancel')}</button><button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">{t('estimateForm.save')}</button></div>
                </form>
            </div>
        </div>
    );
};

const PerformanceModal: React.FC<{
    promotion: Promotion;
    estimates: Estimate[];
    onClose: () => void;
}> = ({ promotion, estimates, onClose }) => {
    const { t } = useLanguage();
    const { garageInfo } = useGarage();
    
    const stats = useMemo(() => {
        const relevantEstimates = estimates.filter(e => e.promotionId === promotion.id && e.status === EstimateStatus.COMPLETED);
        const usageCount = relevantEstimates.length;
        let totalRevenue = 0;
        let totalDiscount = 0;

        relevantEstimates.forEach(e => {
            const subtotalParts = e.parts.reduce((sum, p) => sum + p.price * p.quantity, 0);
            const subtotalLabor = e.labor.reduce((sum, l) => sum + l.rate * l.hours, 0);
            totalRevenue += subtotalParts + subtotalLabor;
            totalDiscount += (subtotalParts * (e.partsDiscount || 0) / 100) + (subtotalLabor * (e.laborDiscount || 0) / 100);
        });

        return { usageCount, totalRevenue, totalDiscount };
    }, [promotion, estimates]);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg animate-fade-in">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700"><h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('promotions.performanceTitle')}: <span className="text-primary-500">{promotion.name}</span></h3></div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg"><p className="text-sm text-gray-500 dark:text-gray-400">{t('promotions.usageCount')}</p><p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.usageCount}</p></div>
                    <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg"><p className="text-sm text-gray-500 dark:text-gray-400">{t('promotions.generatedRevenue')}</p><p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalRevenue.toFixed(2)}</p></div>
                    <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg"><p className="text-sm text-gray-500 dark:text-gray-400">{t('promotions.totalDiscount')}</p><p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.totalDiscount.toFixed(2)}</p></div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-4 rounded-b-lg"><button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">{t('recallsModal.close')}</button></div>
            </div>
        </div>
    )
}

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void }> = ({ enabled, onChange }) => (
    <button
        role="switch"
        aria-checked={enabled}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${enabled ? 'bg-primary-600' : 'bg-gray-600'}`}
    >
        <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
        />
    </button>
);

const PromotionsManager: React.FC<PromotionsManagerProps> = ({ promotions, setPromotions, setIsAppLoading, showNotification, estimates }) => {
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ promotion: Omit<Promotion, 'id' | 'isActive'> | null; id?: string }>({ promotion: null });
    const [apiKey] = useLocalStorage<string | null>('gemini-api-key', null);
    
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiIdeas, setAiIdeas] = useState<AIPromotionSuggestion[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [performanceModalPromo, setPerformanceModalPromo] = useState<Promotion | null>(null);

    const getPromotionStatus = (promo: Promotion): { label: string; color: string; } => {
        const now = new Date();
        const start = promo.startDate ? new Date(promo.startDate) : null;
        const end = promo.endDate ? new Date(promo.endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);
        
        if (start && now < start) return { label: t('promotions.status.scheduled'), color: 'bg-blue-900/50 text-blue-300' };
        if (end && now > end) return { label: t('promotions.status.expired'), color: 'bg-gray-700 text-gray-300' };
        if (promo.isActive) return { label: t('promotions.status.active'), color: 'bg-green-900/50 text-green-300' };
        return { label: t('promotions.status.inactive'), color: 'bg-red-900/50 text-red-300' };
    };

    const handleGenerateAiIdeas = async () => {
        setIsAiModalOpen(true);
        setIsAiLoading(true);
        setAiIdeas([]);
        try {
            const ideas = await getAiPromotionIdeas(promotions);
            setAiIdeas(ideas);
        } catch (error) {
            console.error(error);
            showNotification(error instanceof Error ? error.message : "A apărut o eroare la generarea ideilor.", "error");
        } finally {
            setIsAiLoading(false);
        }
    };

    const useAiIdea = (idea: AIPromotionSuggestion) => {
        setIsAiModalOpen(false);
        const promoData = {
            name: idea.name,
            description: idea.description,
            type: idea.type,
            value: idea.value,
            startDate: new Date().toISOString().split('T')[0],
            endDate: ''
        };
        handleOpenModal(promoData);
    };

    const handleOpenModal = (promotion: Omit<Promotion, 'id' | 'isActive'> | null, id?: string) => { setModalData({ promotion, id }); setIsModalOpen(true); };
    const handleSavePromotion = (promotionData: Omit<Promotion, 'id' | 'isActive'>, id?: string) => { setIsAppLoading(true); setTimeout(() => { if (id) { setPromotions(promos => promos.map(p => p.id === id ? { ...p, ...promotionData } : p)); showNotification(t('promotions.notificationUpdated')); } else { const newPromotion: Promotion = { id: `promo-${Date.now()}`, ...promotionData, isActive: true }; setPromotions(promos => [...promos, newPromotion]); showNotification(t('promotions.notificationAdded')); } setIsModalOpen(false); setIsAppLoading(false); }, 500); };
    const handleDeletePromotion = (id: string) => { if (window.confirm(t('promotions.confirmDelete'))) { setIsAppLoading(true); setTimeout(() => { setPromotions(promos => promos.filter(p => p.id !== id)); showNotification(t('promotions.notificationDeleted')); setIsAppLoading(false); }, 500); }};
    const handleToggleActive = (id: string) => { setPromotions(promos => promos.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)); };

    return (
        <>
            {isModalOpen && <PromotionModal promotion={modalData.promotion} id={modalData.id} onSave={handleSavePromotion} onClose={() => setIsModalOpen(false)} />}
            {performanceModalPromo && <PerformanceModal promotion={performanceModalPromo} estimates={estimates} onClose={() => setPerformanceModalPromo(null)} />}
            
            {isAiModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsAiModalOpen(false)}>
                    <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <header className="p-4 border-b border-primary-900/50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">{t('promotions.aiAssistant')}</h3>
                            <button onClick={() => setIsAiModalOpen(false)} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">&times;</button>
                        </header>
                        <main className="flex-grow p-6 space-y-4 overflow-y-auto">
                            {isAiLoading ? (
                                <div className="flex flex-col items-center justify-center h-48">
                                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="mt-4 text-gray-300">AI-ul generează idei de campanii...</p>
                                </div>
                            ) : (
                                aiIdeas.length > 0 ? (
                                    <div className="space-y-3">
                                        {aiIdeas.map((idea, index) => (
                                            <div key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-primary-500/50 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-white">{idea.name}</h4>
                                                        <p className="text-sm text-gray-400 mt-1">{idea.description}</p>
                                                        <p className="text-xs font-semibold text-primary-400 mt-2">
                                                            {idea.value}% {t(getPromotionTypeKey(idea.type))}
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={() => useAiIdea(idea)} 
                                                        className="bg-green-600/50 hover:bg-green-600 text-green-100 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                                                    >
                                                        Folosește
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-400">Nu au fost generate sugestii. Încercați din nou.</p>
                                )
                            )}
                        </main>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4"><h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('promotions.title')}</h2><div className="flex gap-4"><button onClick={handleGenerateAiIdeas} className="bg-sky-500/30 text-sky-200 font-bold py-2 px-4 rounded-lg flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 00-.293-.707L16 11.586V8a6 6 0 00-6-6zM8 17a1 1 0 112 0v-1a1 1 0 11-2 0v1zm4-13a4 4 0 00-3.416 5.876L8 11.586V14h4v-2.414l.584-.584A4 4 0 0012 4z" /></svg>{t('promotions.aiAssistant')}</button><button onClick={() => handleOpenModal(null)} className="bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>{t('promotions.addPromotion')}</button></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{promotions.map((promo) => {
                        const status = getPromotionStatus(promo);
                        const isToggleable = status.label === t('promotions.status.active') || status.label === t('promotions.status.inactive');

                        return (<div key={promo.id} className={`rounded-lg shadow-md p-4 flex flex-col justify-between transition-all border-l-4 ${promo.isActive ? 'bg-green-50 dark:bg-green-900/30 border-green-500' : 'bg-gray-100 dark:bg-gray-700/50 border-gray-400'}`}>
                            <div>
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 pr-2">{promo.name}</h3>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{promo.description}</p>
                                {(promo.startDate || promo.endDate) && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{promo.startDate} - {promo.endDate}</p>}
                                <div className="text-sm font-semibold text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/50 inline-block px-2 py-1 rounded">{promo.value}% {t(getPromotionTypeKey(promo.type))}</div>
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex gap-2 items-center">
                                    <ToggleSwitch enabled={promo.isActive} onChange={() => handleToggleActive(promo.id)} />
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-300">{promo.isActive ? 'Activă' : 'Inactivă'}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => setPerformanceModalPromo(promo)} className="p-2 rounded-full text-gray-400 hover:text-white" title={t('promotions.performanceTitle')}>📊</button>
                                    <button onClick={() => handleOpenModal(promo, promo.id)} className="p-2 rounded-full text-gray-400 hover:text-white" title={t('promotions.edit')}>✏️</button>
                                    <button onClick={() => handleDeletePromotion(promo.id)} className="p-2 rounded-full text-gray-400 hover:text-white" title={t('promotions.delete')}>🗑️</button>
                                </div>
                            </div>
                        </div>)
                    })}</div>
                    {promotions.length === 0 && (<div className="text-center py-10 text-gray-500 dark:text-gray-300"><p>{t('promotions.noPromotions')}</p></div>)}
                </div>
            </div>
        </>
    );
};

export default PromotionsManager;
