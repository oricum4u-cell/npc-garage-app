import React, { useState, useMemo, useEffect } from 'react';
import { StockItem, UserRole, AIPartSuggestionFromImage, AIPartSuggestion } from '../types.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';
import AIPartsFinder from './AIPartsFinder.tsx';
import AIPartIdentifier from './AIPartIdentifier.tsx';

type NotificationType = 'success' | 'error' | 'info';

interface StockManagerProps {
    items: StockItem[];
    onSave: (item: Omit<StockItem, 'id'> | StockItem) => void;
    onDelete: (id: string) => void;
    showNotification: (message: string, type?: NotificationType) => void;
}

const StockManager: React.FC<StockManagerProps> = ({ items, onSave, onDelete, showNotification }) => {
    const { user } = useAuth();
    const { garageInfo } = useGarage();
    const [searchTerm, setSearchTerm] = useState('');
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [isIdentifierModalOpen, setIsIdentifierModalOpen] = useState(false);

    useEffect(() => {
        const prefillTerm = localStorage.getItem('stock-search-term');
        if (prefillTerm) {
            setSearchTerm(prefillTerm);
            localStorage.removeItem('stock-search-term');
        }
    }, []);

    const categories = useMemo(() => {
        const cats = new Set(items.map(i => i.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [items]);

    const filteredItems = useMemo(() =>
        items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStockFilter = !showLowStockOnly || item.quantity <= item.lowStockThreshold;
            const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
            return matchesSearch && matchesStockFilter && matchesCategory;
        }).sort((a,b) => a.name.localeCompare(b.name))
    , [items, searchTerm, showLowStockOnly, categoryFilter]);

    const totalValue = useMemo(() => items.reduce((sum, item) => sum + (item.price * item.quantity), 0), [items]);

    const handleOpenModal = (item: StockItem | null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSaveItem = (formData: Omit<StockItem, 'id'>) => {
        if (editingItem) {
            onSave({ ...editingItem, ...formData });
        } else {
            const newItem: Omit<StockItem, 'id'> = formData;
            onSave(newItem);
        }
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleDeleteItem = (id: string) => {
        if (window.confirm('Sunteți sigur că doriți să ștergeți această piesă din stoc?')) {
            onDelete(id);
        }
    };

    const handleQuickAdjust = (id: string, change: number) => {
        const item = items.find(i => i.id === id);
        if(item) {
            const newQty = Math.max(0, item.quantity + change);
            onSave({ ...item, quantity: newQty });
        }
    };
    
    const handleAiPartIdentified = (suggestion: AIPartSuggestionFromImage) => {
        // Try to extract SKU from part name
        const skuMatch = suggestion.partName.match(/[A-Z0-9-]{4,}/);

        const newItemData: Partial<StockItem> = {
            name: suggestion.partName,
            sku: skuMatch ? skuMatch[0] : '',
            price: suggestion.estimatedPrice,
            quantity: 1,
            lowStockThreshold: 1,
            supplier: '',
            category: '',
            location: ''
        };
        setIsIdentifierModalOpen(false);
        setEditingItem(newItemData as StockItem);
        setIsModalOpen(true);
    };


    const StockLevelPill: React.FC<{ quantity: number, threshold: number }> = ({ quantity, threshold }) => {
        let level: 'ok' | 'low' | 'out' = 'ok';
        if (quantity === 0) {
            level = 'out';
        } else if (quantity <= threshold) {
            level = 'low';
        }
        const styles = {
            ok: 'stock-ok',
            low: 'stock-low',
            out: 'stock-out',
        };
        return <span className={`stock-pill ${styles[level]}`}>{quantity}</span>;
    };
    
    return (
        <div className="space-y-8">
             {isIdentifierModalOpen && <AIPartIdentifier onSelectPart={handleAiPartIdentified} onClose={() => setIsIdentifierModalOpen(false)} />}
            <div className="bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl p-6">
                 <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Inventar Piese</h2>
                        <p className="text-sm text-primary-300 mt-1">Valoare Totală Stoc: <span className="font-bold font-mono text-white">{totalValue.toFixed(2)} {garageInfo.currency}</span></p>
                    </div>
                     <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
                        <input
                            type="text"
                            placeholder="Caută în stoc..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-48 futuristic-input py-2"
                        />
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="futuristic-select py-2 text-sm">
                            <option value="ALL">Toate Categoriile</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex items-center">
                            <input type="checkbox" id="low-stock" checked={showLowStockOnly} onChange={(e) => setShowLowStockOnly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                            <label htmlFor="low-stock" className="ml-2 text-sm text-gray-300">Stoc Redus</label>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end gap-4">
                     <button onClick={() => setIsIdentifierModalOpen(true)} className="bg-sky-500/30 text-sky-200 font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /><path d="M14.5 3a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2a.5.5 0 01.5-.5z" /></svg>
                        Identifică Piesă cu Camera
                    </button>
                    <button onClick={() => handleOpenModal(null)} className="bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg transition-all duration-200 border-2 border-primary-500/80 hover:bg-primary-500/70 hover:border-primary-500/100 hover:shadow-lg hover:shadow-primary-500/30 animate-glow flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Adaugă Piesă Nouă
                    </button>
                </div>
                <div className="overflow-x-auto mt-6">
                     <table className="w-full text-left futuristic-table text-sm">
                        <thead>
                            <tr>
                                <th className="p-3">Denumire & SKU</th>
                                <th className="p-3">Categorie</th>
                                <th className="p-3">Locație</th>
                                <th className="p-3 text-center">Cantitate</th>
                                <th className="p-3 text-right">Preț</th>
                                <th className="p-3">Furnizor</th>
                                <th className="p-3 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-800/50">
                                    <td className="p-3">
                                        <p className="font-medium text-white">{item.name}</p>
                                        <p className="text-xs text-primary-400 font-mono">{item.sku}</p>
                                    </td>
                                    <td className="p-3 text-gray-300">{item.category || '-'}</td>
                                    <td className="p-3 text-gray-300 font-mono">{item.location || '-'}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => handleQuickAdjust(item.id, -1)} className="text-gray-500 hover:text-red-400 bg-gray-800 rounded w-5 h-5 flex items-center justify-center">-</button>
                                            <StockLevelPill quantity={item.quantity} threshold={item.lowStockThreshold} />
                                            <button onClick={() => handleQuickAdjust(item.id, 1)} className="text-gray-500 hover:text-green-400 bg-gray-800 rounded w-5 h-5 flex items-center justify-center">+</button>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right text-gray-300">{item.price.toFixed(2)} {garageInfo.currency}</td>
                                    <td className="p-3 text-gray-400 text-xs">{item.supplier}</td>
                                    <td className="p-3 text-right space-x-2">
                                        <button onClick={() => handleOpenModal(item)} className="p-2 rounded-full text-gray-400 hover:bg-amber-500/20 hover:text-amber-300 transition-colors" title="Editează">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => handleDeleteItem(item.id)} className="p-2 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-300 transition-colors" title="Șterge">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredItems.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            <p>Nicio piesă găsită.</p>
                        </div>
                    )}
                </div>
            </div>
            {isModalOpen && <StockModal item={editingItem} onSave={handleSaveItem} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

// Modal for Adding/Editing Items
const StockModal: React.FC<{ item: StockItem | null; onSave: (data: Omit<StockItem, 'id'>) => void; onClose: () => void; }> = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: item?.name || '',
        sku: item?.sku || '',
        quantity: item?.quantity || 0,
        price: item?.price || 0,
        supplier: item?.supplier || '',
        lowStockThreshold: item?.lowStockThreshold || 0,
        category: item?.category || '',
        location: item?.location || ''
    });

    const [isAiFinderOpen, setIsAiFinderOpen] = useState(false);

    const handleAiSelect = (suggestion: AIPartSuggestion) => {
        setFormData(prev => ({
            ...prev,
            name: suggestion.partName,
            sku: suggestion.sku,
            supplier: suggestion.supplier,
            price: suggestion.estimatedPrice
        }));
        setIsAiFinderOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-primary-900/50">
                        <h3 className="text-xl font-bold text-white">{item ? 'Editare Piesă' : 'Adăugare Piesă Nouă'}</h3>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <button type="button" onClick={() => setIsAiFinderOpen(true)} className="w-full bg-sky-500/30 text-sky-200 font-bold py-2 px-4 rounded-lg transition-colors border border-sky-500/50 hover:bg-sky-500/40 flex items-center justify-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 00-.293-.707L16 11.586V8a6 6 0 00-6-6zM8 17a1 1 0 112 0v-1a1 1 0 11-2 0v1zm4-13a4 4 0 00-3.416 5.876L8 11.586V14h4v-2.414l.584-.584A4 4 0 0012 4z" /></svg>
                            Asistent AI Găsire Piesă
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-400 mb-1">Nume Piesă</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 futuristic-input" /></div>
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Cod Produs (SKU)</label><input type="text" name="sku" value={formData.sku} onChange={handleChange} required className="w-full p-2 futuristic-input" /></div>
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Furnizor</label><input type="text" name="supplier" value={formData.supplier} onChange={handleChange} className="w-full p-2 futuristic-input" /></div>
                            
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Categorie</label><input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="ex: Filtre" className="w-full p-2 futuristic-input" /></div>
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Locație (Raft)</label><input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="ex: A3" className="w-full p-2 futuristic-input" /></div>

                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Cantitate</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="0" required className="w-full p-2 futuristic-input" /></div>
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Preț Achiziție</label><input type="number" name="price" value={formData.price} onChange={handleChange} step="0.01" min="0" required className="w-full p-2 futuristic-input" /></div>
                            <div><label className="block text-sm font-medium text-gray-400 mb-1">Prag Stoc Redus</label><input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} min="0" required className="w-full p-2 futuristic-input" /></div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl">
                        <button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors border border-gray-600 hover:bg-gray-500/40">Anulează</button>
                        <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">Salvează</button>
                    </div>
                </form>
            </div>
            {isAiFinderOpen && <AIPartsFinder onSelectPart={handleAiSelect} onClose={() => setIsAiFinderOpen(false)} />}
        </div>
    );
};

export default StockManager;