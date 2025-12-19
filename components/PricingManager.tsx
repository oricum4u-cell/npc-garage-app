import React, { useState, useEffect } from 'react';
import { PredefinedLabor, UserRole, AILaborSuggestion, JobKit, JobKitPart, JobKitLabor, Estimate } from '../types.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getAiLaborIdeas } from '../services/geminiService.ts';

interface PricingManagerProps {
    items: PredefinedLabor[];
    onSaveLabor: (item: PredefinedLabor) => void;
    onDeleteLabor: (id: string) => void;
    jobKits: JobKit[];
    onSaveKit: (kit: JobKit) => void;
    onDeleteKit: (id: string) => void;
    estimates: Estimate[];
}

const CreateKitModal: React.FC<{
    onClose: () => void;
    onSave: (kit: JobKit) => void;
    initialData?: Omit<JobKit, 'id'>;
}> = ({ onClose, onSave, initialData }) => {
    const { t } = useLanguage();
    const [kitData, setKitData] = useState(initialData || { name: '', description: '', parts: [], labor: [] });

    useEffect(() => {
        if(initialData) setKitData(initialData);
    }, [initialData]);

    const handleAddPart = () => setKitData(prev => ({ ...prev, parts: [...prev.parts, { name: '', quantity: 1, price: 0 }] }));
    const handleUpdatePart = (index: number, field: keyof JobKitPart, value: any) => { const newParts = [...kitData.parts]; (newParts[index] as any)[field] = (field === 'quantity' || field === 'price') ? parseFloat(value) || 0 : value; setKitData(prev => ({ ...prev, parts: newParts })); };
    const handleRemovePart = (index: number) => setKitData(prev => ({ ...prev, parts: prev.parts.filter((_, i) => i !== index) }));
    const handleAddLabor = () => setKitData(prev => ({ ...prev, labor: [...prev.labor, { description: '', hours: 1, rate: 180, observations: '' }] }));
    const handleUpdateLabor = (index: number, field: keyof JobKitLabor, value: any) => { const newLabor = [...kitData.labor]; (newLabor[index] as any)[field] = (field === 'hours' || field === 'rate') ? parseFloat(value) || 0 : value; setKitData(prev => ({ ...prev, labor: newLabor })); };
    const handleRemoveLabor = (index: number) => setKitData(prev => ({ ...prev, labor: prev.labor.filter((_, i) => i !== index) }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (kitData.name.trim() && (kitData.parts.length > 0 || kitData.labor.length > 0)) {
            onSave({ id: `kit-${Date.now()}`, ...kitData });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50"><h3 className="text-xl font-bold text-white">{t('pricingManager.createNewKit')}</h3></header>
                <form onSubmit={handleSubmit} className="flex-grow contents">
                    <main className="p-6 space-y-4 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-300 mb-1">{t('pricingManager.kitName')}</label><input type="text" value={kitData.name} onChange={(e) => setKitData(prev => ({ ...prev, name: e.target.value }))} required className="w-full p-2 futuristic-input" /></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-1">{t('pricingManager.kitDescription')}</label><input type="text" value={kitData.description} onChange={(e) => setKitData(prev => ({ ...prev, description: e.target.value }))} className="w-full p-2 futuristic-input" /></div>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-300 mb-2">{t('pricingManager.kitParts')}</h4>
                            <div className="space-y-2">{kitData.parts.map((part, index) => (<div key={index} className="grid grid-cols-[1fr,auto,auto,auto] items-end gap-2 p-2 bg-gray-800 rounded"><input type="text" value={part.name} onChange={(e) => handleUpdatePart(index, 'name', e.target.value)} placeholder={t('pricingManager.partName')} className="p-1 futuristic-input" /><input type="number" value={part.quantity} onChange={(e) => handleUpdatePart(index, 'quantity', e.target.value)} placeholder={t('pricingManager.quantityAbbr')} className="w-20 p-1 futuristic-input" /><input type="number" value={part.price} onChange={(e) => handleUpdatePart(index, 'price', e.target.value)} placeholder={t('pricingManager.price')} className="w-24 p-1 futuristic-input" /><button type="button" onClick={() => handleRemovePart(index)} className="text-red-400 hover:text-red-300 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button></div>))}</div>
                            <button type="button" onClick={handleAddPart} className="mt-2 text-sm text-blue-400 hover:text-blue-300 font-semibold">{t('pricingManager.addPart')}</button>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-300 mb-2">{t('pricingManager.kitLabor')}</h4>
                            <div className="space-y-2">{kitData.labor.map((l, index) => (<div key={index} className="p-2 bg-gray-800 rounded space-y-2"><div className="grid grid-cols-[1fr,auto,auto,auto] items-end gap-2"><input type="text" value={l.description} onChange={(e) => handleUpdateLabor(index, 'description', e.target.value)} placeholder={t('pricingManager.laborDescription')} className="p-1 futuristic-input" /><input type="number" step="0.1" value={l.hours} onChange={(e) => handleUpdateLabor(index, 'hours', e.target.value)} placeholder={t('pricingManager.hours')} className="w-20 p-1 futuristic-input" /><input type="number" value={l.rate} onChange={(e) => handleUpdateLabor(index, 'rate', e.target.value)} placeholder={t('pricingManager.rate')} className="w-24 p-1 futuristic-input" /><button type="button" onClick={() => handleRemoveLabor(index)} className="text-red-400 hover:text-red-300 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button></div><input type="text" value={l.observations || ''} onChange={(e) => handleUpdateLabor(index, 'observations', e.target.value)} placeholder="Observații (opțional)" className="w-full p-1 futuristic-input text-sm" /></div>))}</div>
                            <button type="button" onClick={handleAddLabor} className="mt-2 text-sm text-blue-400 hover:text-blue-300 font-semibold">{t('pricingManager.addLabor')}</button>
                        </div>
                    </main>
                    <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl border-t border-primary-900/50"><button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">Anulează</button><button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">{t('pricingManager.saveNewKit')}</button></footer>
                </form>
            </div>
        </div>
    );
};


const PricingManager: React.FC<PricingManagerProps> = ({ items, onSaveLabor, onDeleteLabor, jobKits, onSaveKit, onDeleteKit, estimates }) => {
    const [activeTab, setActiveTab] = useState<'labor' | 'kits'>('labor');
    const [isKitModalOpen, setIsKitModalOpen] = useState(false);
    const [initialKitData, setInitialKitData] = useState<Omit<JobKit, 'id'> | undefined>(undefined);

    const { user } = useAuth();
    const { garageInfo } = useGarage();
    const { t } = useLanguage();

    const [description, setDescription] = useState('');
    const [rate, setRate] = useState<number | ''>('');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingDescription, setEditingDescription] = useState('');
    const [editingRate, setEditingRate] = useState<number | ''>('');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<AILaborSuggestion[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    useEffect(() => {
        const estimateId = localStorage.getItem('kit-from-estimate');
        if (estimateId) {
            const estimate = estimates.find(e => e.id === estimateId);
            if (estimate) {
                const kitParts: JobKitPart[] = estimate.parts.map(p => ({ name: p.name, description: p.description, quantity: p.quantity, price: p.price }));
                const kitLabor: JobKitLabor[] = estimate.labor.map(l => ({ description: l.description, hours: l.hours, rate: l.rate, observations: l.observations }));
                setInitialKitData({ name: `Kit - ${estimate.motorcycleMake} ${estimate.motorcycleModel}`, description: estimate.services, parts: kitParts, labor: kitLabor });
                setActiveTab('kits');
                setIsKitModalOpen(true);
            }
            localStorage.removeItem('kit-from-estimate');
        }
    }, [estimates]);

    const handleSaveNewKit = (kitToAdd: JobKit) => {
        onSaveKit(kitToAdd);
        setIsKitModalOpen(false);
        setInitialKitData(undefined);
    };

    const handleDeleteKit = (id: string) => { if (window.confirm(t('pricingManager.confirmDeleteKit'))) { onDeleteKit(id); }};
    const handleAddItem = (e: React.FormEvent) => { e.preventDefault(); if (description.trim() && typeof rate === 'number' && rate > 0) { const newItem: PredefinedLabor = { id: `pl-${Date.now()}`, description, rate }; onSaveLabor(newItem); setDescription(''); setRate(''); }};
    const handleDeleteItem = (id: string) => { if (window.confirm(t('pricingManager.confirmDelete'))) { onDeleteLabor(id); }};
    const handleEditItem = (item: PredefinedLabor) => { setEditingItemId(item.id); setEditingDescription(item.description); setEditingRate(item.rate); };
    const handleCancelEdit = () => { setEditingItemId(null); setEditingDescription(''); setEditingRate(''); };
    const handleUpdateItem = () => { if (editingItemId && editingDescription.trim() && typeof editingRate === 'number' && editingRate > 0) { onSaveLabor({ id: editingItemId, description: editingDescription, rate: editingRate }); handleCancelEdit(); }};

    const handleGenerateAiIdeas = async () => {
        setIsAiModalOpen(true);
        setIsAiLoading(true);
        setAiSuggestions([]);
        setAiError('');
        try {
            const ideas = await getAiLaborIdeas(items);
            setAiSuggestions(ideas);
        } catch (e) {
            setAiError(e instanceof Error ? e.message : t('pricingManager.aiError'));
        } finally {
            setIsAiLoading(false);
        }
    };
    const useAiIdea = (idea: AILaborSuggestion) => {
        setDescription(idea.description);
        setRate(idea.rate);
        setIsAiModalOpen(false);
    };
    
    return (
        <div className="space-y-8">
            {isKitModalOpen && <CreateKitModal onClose={() => { setIsKitModalOpen(false); setInitialKitData(undefined); }} onSave={handleSaveNewKit} initialData={initialKitData} />}
            
            {isAiModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsAiModalOpen(false)}>
                    <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <header className="p-4 border-b border-primary-900/50"><h3 className="text-xl font-bold text-white">{t('pricingManager.aiModalTitle')}</h3></header>
                        <main className="p-6 space-y-4 overflow-y-auto">
                            {isAiLoading ? (
                                <div className="text-center py-8"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-2 text-gray-400">{t('pricingManager.aiLoading')}</p></div>
                            ) : aiError ? (
                                <div className="text-center py-8 text-red-400">{aiError}</div>
                            ) : (
                                aiSuggestions.map((idea, index) => (
                                    <div key={index} className="p-3 bg-gray-800/50 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-white">{idea.description}</p>
                                            <p className="text-sm text-primary-300">{idea.rate} {garageInfo.currency}</p>
                                        </div>
                                        <button onClick={() => useAiIdea(idea)} className="bg-green-600/50 text-green-200 font-semibold py-1 px-3 text-sm rounded-lg">{t('pricingManager.useIdea')}</button>
                                    </div>
                                ))
                            )}
                            { !isAiLoading && !aiError && aiSuggestions.length === 0 && <div className="text-center text-gray-400">Nicio sugestie generată.</div> }
                        </main>
                        <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl border-t border-primary-900/50"><button type="button" onClick={() => setIsAiModalOpen(false)} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">{t('recallsModal.close')}</button></footer>
                    </div>
                </div>
            )}

            <div className="bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('nav.pricingManagement')}</h2>
                     <div className="p-1 bg-gray-900 rounded-lg flex items-center">
                        <button onClick={() => setActiveTab('labor')} className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${activeTab === 'labor' ? 'bg-gray-700 text-primary-300' : 'text-gray-400'}`}>{t('pricingManager.laborTab')}</button>
                        <button onClick={() => setActiveTab('kits')} className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${activeTab === 'kits' ? 'bg-gray-700 text-primary-300' : 'text-gray-400'}`}>{t('pricingManager.kitsTab')}</button>
                    </div>
                </div>

                {activeTab === 'labor' && (
                    <div className="animate-fade-in">
                        <form onSubmit={handleAddItem} className="mb-8 p-4 bg-gray-950/50 rounded-lg flex flex-col md:flex-row gap-4 items-end">
                             <div className="flex-grow w-full"><label className="block text-sm font-medium text-gray-300 mb-1">{t('pricingManager.descriptionLabel')}</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('pricingManager.descriptionPlaceholder')} required className="w-full p-2 futuristic-input"/></div>
                             <div className="w-full md:w-40"><label className="block text-sm font-medium text-gray-300 mb-1">{t('pricingManager.rateLabel')}</label><input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} placeholder={t('pricingManager.ratePlaceholder')} required className="w-full p-2 futuristic-input"/></div>
                            <div className="w-full md:w-auto flex gap-2"><button type="submit" className="flex-grow bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg">{t('pricingManager.addButton')}</button><button type="button" onClick={handleGenerateAiIdeas} className="bg-sky-500/30 text-sky-200 font-bold p-2 rounded-lg" title={t('pricingManager.aiAssistant')}>🤖</button></div>
                        </form>
                        <div className="space-y-2">{items.map(item => (editingItemId === item.id ? (<div key={item.id} className="p-2 bg-gray-700 rounded-lg flex gap-2 items-center"><input type="text" value={editingDescription} onChange={e => setEditingDescription(e.target.value)} className="flex-grow futuristic-input"/><input type="number" value={editingRate} onChange={e => setEditingRate(Number(e.target.value))} className="w-24 futuristic-input"/><button onClick={handleUpdateItem}>✔️</button><button onClick={handleCancelEdit}>✖️</button></div>) : (<div key={item.id} className="p-3 bg-gray-800/50 rounded-lg flex justify-between items-center"><p className="text-gray-200">{item.description}</p><div className="flex items-center gap-4"><span className="font-semibold text-primary-300">{item.rate} {garageInfo.currency}</span><button onClick={() => handleEditItem(item)}>✏️</button><button onClick={() => handleDeleteItem(item.id)}>🗑️</button></div></div>)))}</div>
                    </div>
                )}
                
                {activeTab === 'kits' && (
                     <div className="animate-fade-in">
                        <div className="flex justify-end mb-4"><button onClick={() => { setInitialKitData(undefined); setIsKitModalOpen(true); }} className="bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg flex items-center gap-2">{t('pricingManager.createNewKit')}</button></div>
                         <div className="space-y-4">{jobKits.map(kit => (<div key={kit.id} className="p-4 bg-gray-800/50 rounded-lg"><div className="flex justify-between items-start"><div className="flex-grow"><h4 className="font-bold text-lg text-primary-300">{kit.name}</h4><p className="text-sm text-gray-400">{kit.description}</p></div><button onClick={() => handleDeleteKit(kit.id)}>🗑️</button></div><div className="mt-2 text-xs grid grid-cols-2 gap-x-4"><p><strong>{t('pricingManager.partsLabel')}:</strong> {kit.parts.length > 0 ? kit.parts.map(p=>p.name).join(', ') : t('pricingManager.noParts')}</p><p><strong>{t('pricingManager.laborLabel')}:</strong> {kit.labor.length > 0 ? kit.labor.map(l=>l.description).join(', ') : t('pricingManager.noLabor')}</p></div></div>))}</div>
                     </div>
                )}

            </div>
        </div>
    );
};

export default PricingManager;