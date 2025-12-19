
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { MotoModel, PartFitment, StockItem } from '../types.ts';

// Mock Data Initialization
const INITIAL_MODELS: MotoModel[] = [
    { id: 'moto-1', make: 'Yamaha', model: 'MT-07', year: 2022 },
    { id: 'moto-2', make: 'Honda', model: 'CBR 600RR', year: 2018 },
    { id: 'moto-3', make: 'Kawasaki', model: 'Ninja 400', year: 2022 },
];

const INITIAL_FITMENTS: PartFitment[] = [
    { id: 'fit-1', partSku: 'HF204', partName: 'Filtru Ulei Hiflofiltro', category: 'Filtre', motoModelId: 'moto-1', isOem: false },
    { id: 'fit-2', partSku: '5GH-13440-50', partName: 'Filtru Ulei Yamaha OEM', category: 'Filtre', motoModelId: 'moto-1', isOem: true },
    { id: 'fit-3', partSku: 'FA296HH', partName: 'Plăcuțe Frână EBC', category: 'Frânare', motoModelId: 'moto-2', isOem: false },
];

interface CompatibilityManagerProps {
    stockItems: StockItem[];
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

const CompatibilityManager: React.FC<CompatibilityManagerProps> = ({ stockItems }) => {
    const { t } = useLanguage();
    const [motoModels, setMotoModels] = useLocalStorage<MotoModel[]>('garage-moto-models', INITIAL_MODELS);
    const [fitments, setFitments] = useLocalStorage<PartFitment[]>('garage-part-fitments', INITIAL_FITMENTS);
    
    const [activeTab, setActiveTab] = useState<'search' | 'manage'>('search');
    const [searchMode, setSearchMode] = useState<'byMoto' | 'byPart'>('byMoto');
    
    // Search State
    const [selectedMotoId, setSelectedMotoId] = useState('');
    const [searchSku, setSearchSku] = useState('');

    // Management State
    const [newModel, setNewModel] = useState({ make: '', model: '', year: '' });
    const [newFitment, setNewFitment] = useState({ partSku: '', partName: '', category: '', motoModelId: '', isOem: false, notes: '' });

    // Derived Data
    const searchResults = useMemo(() => {
        if (searchMode === 'byMoto') {
            if (!selectedMotoId) return [];
            return fitments.filter(f => f.motoModelId === selectedMotoId);
        } else {
            if (!searchSku.trim()) return [];
            const skuLower = searchSku.toLowerCase();
            // Find fitments matching SKU
            const matchedFitments = fitments.filter(f => f.partSku.toLowerCase().includes(skuLower) || f.partName.toLowerCase().includes(skuLower));
            
            // Map to include bike details
            return matchedFitments.map(f => {
                const moto = motoModels.find(m => m.id === f.motoModelId);
                return { ...f, motoDetails: moto ? `${moto.make} ${moto.model} (${moto.year})` : 'Unknown Moto' };
            });
        }
    }, [searchMode, selectedMotoId, searchSku, fitments, motoModels]);

    const handleAddModel = (e: React.FormEvent) => {
        e.preventDefault();
        if (newModel.make && newModel.model && newModel.year) {
            setMotoModels(prev => [...prev, { id: `moto-${Date.now()}`, make: newModel.make, model: newModel.model, year: parseInt(newModel.year) }]);
            setNewModel({ make: '', model: '', year: '' });
        }
    };

    const handleAddFitment = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFitment.partSku && newFitment.motoModelId) {
            setFitments(prev => [...prev, { id: `fit-${Date.now()}`, ...newFitment }]);
            setNewFitment(prev => ({ ...prev, partSku: '', partName: '', isOem: false, notes: '' })); // Keep category and model for faster entry
        }
    };

    const handleSelectStockItem = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const stockId = e.target.value;
        const item = stockItems.find(i => i.id === stockId);
        if (item) {
            setNewFitment(prev => ({ ...prev, partSku: item.sku, partName: item.name }));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-white">Bază de Date Compatibilități</h1>
                <div className="bg-gray-900 p-1 rounded-lg flex">
                    <button onClick={() => setActiveTab('search')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'search' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>Căutare</button>
                    <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'manage' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>Administrare</button>
                </div>
            </div>

            {activeTab === 'search' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Search Controls */}
                    <HudPanel title="Filtre Căutare">
                        <div className="space-y-4">
                            <div className="flex gap-2 mb-4">
                                <button onClick={() => { setSearchMode('byMoto'); setSearchSku(''); }} className={`flex-1 py-2 rounded border text-sm font-bold ${searchMode === 'byMoto' ? 'bg-blue-900/50 border-blue-500 text-blue-200' : 'bg-transparent border-gray-700 text-gray-400'}`}>După Moto</button>
                                <button onClick={() => { setSearchMode('byPart'); setSelectedMotoId(''); }} className={`flex-1 py-2 rounded border text-sm font-bold ${searchMode === 'byPart' ? 'bg-amber-900/50 border-amber-500 text-amber-200' : 'bg-transparent border-gray-700 text-gray-400'}`}>După Piesă</button>
                            </div>

                            {searchMode === 'byMoto' ? (
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Selectează Motocicletă</label>
                                    <select 
                                        value={selectedMotoId} 
                                        onChange={e => setSelectedMotoId(e.target.value)} 
                                        className="w-full p-2 futuristic-select"
                                    >
                                        <option value="">-- Alege --</option>
                                        {motoModels.sort((a,b) => a.make.localeCompare(b.make)).map(m => (
                                            <option key={m.id} value={m.id}>{m.make} {m.model} ({m.year})</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Caută SKU sau Nume</label>
                                    <input 
                                        type="text" 
                                        value={searchSku} 
                                        onChange={e => setSearchSku(e.target.value)} 
                                        placeholder="ex: HF204" 
                                        className="w-full p-2 futuristic-input" 
                                    />
                                </div>
                            )}
                        </div>
                    </HudPanel>

                    {/* Results */}
                    <div className="lg:col-span-2">
                        <HudPanel title="Rezultate Compatibilitate">
                            {searchResults.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left futuristic-table">
                                        <thead>
                                            <tr>
                                                <th className="p-3">Tip</th>
                                                <th className="p-3">SKU</th>
                                                <th className="p-3">Denumire</th>
                                                <th className="p-3">{searchMode === 'byPart' ? 'Motocicletă Compatibilă' : 'Categorie'}</th>
                                                <th className="p-3 text-right">Notițe</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {searchResults.map(res => (
                                                <tr key={res.id} className="hover:bg-gray-800/50">
                                                    <td className="p-3">
                                                        {res.isOem ? (
                                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-cyan-900/50 text-cyan-300 border border-cyan-700">OEM</span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-900/50 text-orange-300 border border-orange-700">AFTERMARKET</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 font-mono text-white">{res.partSku}</td>
                                                    <td className="p-3 text-gray-300">{res.partName}</td>
                                                    <td className="p-3 text-gray-400">
                                                        {searchMode === 'byPart' ? (res as any).motoDetails : res.category}
                                                    </td>
                                                    <td className="p-3 text-right text-xs text-gray-500">{res.notes || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500">
                                    <p>Niciun rezultat găsit. Selectează o motocicletă sau caută o piesă.</p>
                                </div>
                            )}
                        </HudPanel>
                    </div>
                </div>
            )}

            {activeTab === 'manage' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Add Model Form */}
                    <HudPanel title="1. Definește Modele Moto">
                        <form onSubmit={handleAddModel} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Marcă (ex: Honda)" value={newModel.make} onChange={e => setNewModel({...newModel, make: e.target.value})} required className="p-2 futuristic-input" />
                                <input type="text" placeholder="Model (ex: Hornet)" value={newModel.model} onChange={e => setNewModel({...newModel, model: e.target.value})} required className="p-2 futuristic-input" />
                            </div>
                            <input type="number" placeholder="An (ex: 2008)" value={newModel.year} onChange={e => setNewModel({...newModel, year: e.target.value})} required className="w-full p-2 futuristic-input" />
                            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 rounded-lg">Adaugă Model</button>
                        </form>
                        
                        <div className="mt-6 border-t border-gray-700 pt-4">
                            <h4 className="text-sm text-gray-400 mb-2">Modele Existente ({motoModels.length})</h4>
                            <div className="max-h-40 overflow-y-auto space-y-1 text-sm text-gray-300">
                                {motoModels.map(m => (
                                    <div key={m.id} className="flex justify-between px-2 py-1 bg-gray-800/50 rounded">
                                        <span>{m.make} {m.model}</span>
                                        <span className="font-mono text-gray-500">{m.year}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </HudPanel>

                    {/* Link Parts Form */}
                    <HudPanel title="2. Leagă Piese de Modele">
                        <form onSubmit={handleAddFitment} className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Alege Motocicletă</label>
                                <select value={newFitment.motoModelId} onChange={e => setNewFitment({...newFitment, motoModelId: e.target.value})} required className="w-full p-2 futuristic-select">
                                    <option value="">-- Selectează --</option>
                                    {motoModels.map(m => <option key={m.id} value={m.id}>{m.make} {m.model} ({m.year})</option>)}
                                </select>
                            </div>

                            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                <p className="text-xs text-primary-400 mb-2">Opțional: Alege din Stoc</p>
                                <select onChange={handleSelectStockItem} className="w-full p-2 futuristic-select text-sm">
                                    <option value="">-- Copiază din Stoc --</option>
                                    {stockItems.map(s => <option key={s.id} value={s.id}>{s.name} ({s.sku})</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="SKU Piesă" value={newFitment.partSku} onChange={e => setNewFitment({...newFitment, partSku: e.target.value})} required className="p-2 futuristic-input" />
                                <input type="text" placeholder="Nume Piesă" value={newFitment.partName} onChange={e => setNewFitment({...newFitment, partName: e.target.value})} required className="p-2 futuristic-input" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Categorie (ex: Filtre)" value={newFitment.category} onChange={e => setNewFitment({...newFitment, category: e.target.value})} required className="p-2 futuristic-input" />
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="isOem" checked={newFitment.isOem} onChange={e => setNewFitment({...newFitment, isOem: e.target.checked})} className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-primary-600" />
                                    <label htmlFor="isOem" className="text-sm text-gray-300">Este piesă OEM?</label>
                                </div>
                            </div>
                            
                            <input type="text" placeholder="Notițe (opțional)" value={newFitment.notes} onChange={e => setNewFitment({...newFitment, notes: e.target.value})} className="w-full p-2 futuristic-input" />
                            
                            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg">Salvează Compatibilitate</button>
                        </form>
                    </HudPanel>
                </div>
            )}
        </div>
    );
};

export default CompatibilityManager;
