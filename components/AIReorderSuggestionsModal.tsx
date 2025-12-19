import React, { useState, useEffect } from 'react';
import { AIReorderSuggestion, StockItem, Estimate, Supplier } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getAiReorderSuggestions } from '../services/geminiService.ts';

interface AIReorderSuggestionsModalProps {
    stockItems: StockItem[];
    estimates: Estimate[];
    suppliers: Supplier[];
    onClose: () => void;
    onCreateOrders: (orders: AIReorderSuggestion[]) => void;
}

const AIReorderSuggestionsModal: React.FC<AIReorderSuggestionsModalProps> = ({ stockItems, estimates, suppliers, onClose, onCreateOrders }) => {
    const { t } = useLanguage();
    const [suggestions, setSuggestions] = useState<AIReorderSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const results = await getAiReorderSuggestions(stockItems, estimates, suppliers);
                setSuggestions(results);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchSuggestions();
    }, [stockItems, estimates, suppliers]);

    const handleQuantityChange = (supplierIndex: number, itemIndex: number, newQuantity: number) => {
        const newSuggestions = [...suggestions];
        newSuggestions[supplierIndex].items[itemIndex].quantity = newQuantity;
        setSuggestions(newSuggestions);
    };

    const handleRemoveItem = (supplierIndex: number, itemIndex: number) => {
        const newSuggestions = [...suggestions];
        newSuggestions[supplierIndex].items.splice(itemIndex, 1);
        // If a supplier has no items left, remove the supplier group
        if (newSuggestions[supplierIndex].items.length === 0) {
            newSuggestions.splice(supplierIndex, 1);
        }
        setSuggestions(newSuggestions);
    };

    const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">{t('suppliers.aiReorderTitle')}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">&times;</button>
                </header>
                <main className="flex-grow p-6 overflow-y-auto space-y-6">
                    {isLoading && <div className="text-center py-16"><div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-gray-300">{t('suppliers.aiReorderLoading')}</p></div>}
                    {error && <div className="text-center py-16 text-red-400">{error}</div>}
                    {!isLoading && !error && suggestions.length === 0 && <div className="text-center py-16 text-gray-400">{t('suppliers.aiReorderNoSuggestions')}</div>}
                    
                    {suggestions.map((suggestion, supIndex) => (
                        <div key={suggestion.supplierId} className="bg-gray-800/50 p-4 rounded-lg">
                            <h4 className="font-bold text-lg text-primary-300 mb-3">{supplierMap.get(suggestion.supplierId) || 'Furnizor Necunoscut'}</h4>
                            <div className="space-y-3">
                                {suggestion.items.map((item, itemIndex) => (
                                    <div key={item.sku} className="p-3 bg-gray-900/50 rounded-md grid grid-cols-1 md:grid-cols-[1fr,100px] gap-4">
                                        <div>
                                            <p className="font-semibold text-white">{item.name}</p>
                                            <p className="text-xs text-primary-400/80 font-mono">{item.sku}</p>
                                            <p className="text-xs text-gray-400 mt-1 italic">"{item.reason}"</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="number" min="1" value={item.quantity} onChange={e => handleQuantityChange(supIndex, itemIndex, parseInt(e.target.value, 10))} className="w-20 p-1 futuristic-input text-center" />
                                            <button onClick={() => handleRemoveItem(supIndex, itemIndex)} className="p-1 text-red-400 hover:text-red-300">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </main>
                <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl">
                    <button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">{t('recallsModal.close')}</button>
                    <button type="button" onClick={() => onCreateOrders(suggestions)} disabled={suggestions.length === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">{t('suppliers.aiReorderCreate')}</button>
                </footer>
            </div>
        </div>
    );
};

export default AIReorderSuggestionsModal;