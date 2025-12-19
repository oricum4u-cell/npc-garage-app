
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';

interface CostItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
}

interface CostSimulatorModalProps {
    onClose: () => void;
    onCreateEstimate?: (data: any) => void; // Optional callback to turn this into a real estimate
}

const CostSimulatorModal: React.FC<CostSimulatorModalProps> = ({ onClose, onCreateEstimate }) => {
    const { t } = useLanguage();
    const { garageInfo } = useGarage();

    const [parts, setParts] = useState<CostItem[]>([]);
    const [labor, setLabor] = useState<CostItem[]>([]);

    // Temporary inputs
    const [newPart, setNewPart] = useState({ name: '', price: '', qty: '1' });
    const [newLabor, setNewLabor] = useState({ name: '', rate: garageInfo.defaultLaborRate.toString(), hours: '1' });

    const handleAddPart = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPart.name && newPart.price) {
            setParts(prev => [...prev, {
                id: `p-${Date.now()}`,
                name: newPart.name,
                price: parseFloat(newPart.price),
                quantity: parseFloat(newPart.qty)
            }]);
            setNewPart({ name: '', price: '', qty: '1' });
        }
    };

    const handleAddLabor = (e: React.FormEvent) => {
        e.preventDefault();
        if (newLabor.name && newLabor.rate) {
            setLabor(prev => [...prev, {
                id: `l-${Date.now()}`,
                name: newLabor.name,
                price: parseFloat(newLabor.rate),
                quantity: parseFloat(newLabor.hours)
            }]);
            setNewLabor({ name: '', rate: garageInfo.defaultLaborRate.toString(), hours: '1' });
        }
    };

    const removeItem = (id: string, type: 'part' | 'labor') => {
        if (type === 'part') setParts(prev => prev.filter(i => i.id !== id));
        else setLabor(prev => prev.filter(i => i.id !== id));
    };

    const totals = useMemo(() => {
        const partsTotal = parts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const laborTotal = labor.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return { partsTotal, laborTotal, grandTotal: partsTotal + laborTotal };
    }, [parts, labor]);

    const handleCopySummary = () => {
        const lines = [
            `Estimare Cost - ${garageInfo.name}`,
            `----------------`,
            ...parts.map(p => `${p.name} (x${p.quantity}): ${(p.price * p.quantity).toFixed(2)} ${garageInfo.currency}`),
            ...labor.map(l => `${l.name} (${l.quantity}h): ${(l.price * l.quantity).toFixed(2)} ${garageInfo.currency}`),
            `----------------`,
            `Total Piese: ${totals.partsTotal.toFixed(2)} ${garageInfo.currency}`,
            `Total Manoperă: ${totals.laborTotal.toFixed(2)} ${garageInfo.currency}`,
            `TOTAL GENERAL: ${totals.grandTotal.toFixed(2)} ${garageInfo.currency}`
        ];
        navigator.clipboard.writeText(lines.join('\n'));
        alert(t('costSimulator.copiedToClipboard'));
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50 flex justify-between items-center bg-gray-800/50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🧮</span> {t('costSimulator.title')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </header>

                <main className="flex-grow p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Parts Section */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-primary-300 border-b border-gray-700 pb-2">{t('estimateForm.parts')}</h4>
                        
                        <form onSubmit={handleAddPart} className="flex gap-2 items-end bg-gray-800/30 p-2 rounded">
                            <div className="flex-grow">
                                <input type="text" placeholder={t('costSimulator.partName')} value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} className="w-full p-1 text-sm futuristic-input" />
                            </div>
                            <div className="w-16">
                                <input type="number" placeholder="Qty" value={newPart.qty} onChange={e => setNewPart({...newPart, qty: e.target.value})} className="w-full p-1 text-sm futuristic-input text-center" />
                            </div>
                            <div className="w-20">
                                <input type="number" placeholder="Preț" value={newPart.price} onChange={e => setNewPart({...newPart, price: e.target.value})} className="w-full p-1 text-sm futuristic-input text-right" />
                            </div>
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white p-1 rounded text-sm px-3">+</button>
                        </form>

                        <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                            {parts.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-2 bg-gray-800/50 rounded text-sm group hover:bg-gray-700 transition-colors">
                                    <div>
                                        <span className="text-white">{p.name}</span>
                                        <span className="text-gray-400 text-xs ml-2">x{p.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-primary-400">{(p.price * p.quantity).toFixed(2)}</span>
                                        <button onClick={() => removeItem(p.id, 'part')} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                    </div>
                                </div>
                            ))}
                            {parts.length === 0 && <p className="text-center text-gray-500 text-xs py-4">{t('costSimulator.noParts')}</p>}
                        </div>
                        
                        <div className="text-right text-sm font-bold text-gray-300 pt-2 border-t border-gray-700">
                            Subtotal Piese: <span className="text-white text-lg">{totals.partsTotal.toFixed(2)} {garageInfo.currency}</span>
                        </div>
                    </div>

                    {/* Labor Section */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-primary-300 border-b border-gray-700 pb-2">{t('estimateForm.labor')}</h4>
                        
                        <form onSubmit={handleAddLabor} className="flex gap-2 items-end bg-gray-800/30 p-2 rounded">
                            <div className="flex-grow">
                                <input type="text" placeholder={t('costSimulator.laborName')} value={newLabor.name} onChange={e => setNewLabor({...newLabor, name: e.target.value})} className="w-full p-1 text-sm futuristic-input" />
                            </div>
                            <div className="w-16">
                                <input type="number" placeholder="Ore" value={newLabor.hours} onChange={e => setNewLabor({...newLabor, hours: e.target.value})} className="w-full p-1 text-sm futuristic-input text-center" />
                            </div>
                            <div className="w-20">
                                <input type="number" placeholder="Tarif" value={newLabor.rate} onChange={e => setNewLabor({...newLabor, rate: e.target.value})} className="w-full p-1 text-sm futuristic-input text-right" />
                            </div>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-sm px-3">+</button>
                        </form>

                        <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                            {labor.map(l => (
                                <div key={l.id} className="flex justify-between items-center p-2 bg-gray-800/50 rounded text-sm group hover:bg-gray-700 transition-colors">
                                    <div>
                                        <span className="text-white">{l.name}</span>
                                        <span className="text-gray-400 text-xs ml-2">{l.quantity}h @ {l.price}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-blue-400">{(l.price * l.quantity).toFixed(2)}</span>
                                        <button onClick={() => removeItem(l.id, 'labor')} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                    </div>
                                </div>
                            ))}
                            {labor.length === 0 && <p className="text-center text-gray-500 text-xs py-4">{t('costSimulator.noLabor')}</p>}
                        </div>

                        <div className="text-right text-sm font-bold text-gray-300 pt-2 border-t border-gray-700">
                            Subtotal Manoperă: <span className="text-white text-lg">{totals.laborTotal.toFixed(2)} {garageInfo.currency}</span>
                        </div>
                    </div>
                </main>

                <footer className="p-6 bg-gray-950/50 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-xl border-t border-primary-900/50">
                    <div className="text-center sm:text-left">
                        <p className="text-sm text-gray-400">Total General Estimativ</p>
                        <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                            {totals.grandTotal.toFixed(2)} <span className="text-lg text-gray-500">{garageInfo.currency}</span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleCopySummary} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                            {t('costSimulator.copySummary')}
                        </button>
                        <button onClick={onClose} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-lg shadow-primary-900/50 transition-colors">
                            {t('recallsModal.close')}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default CostSimulatorModal;
