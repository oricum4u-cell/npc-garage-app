
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { StorageEntry } from '../types.ts';
import { useGarage } from '../contexts/GarageContext.tsx';

const INITIAL_STORAGE: StorageEntry[] = [
    { 
        id: 'store-1', 
        clientName: 'Ion Vasile', 
        phone: '0722000000', 
        motorcycle: 'Honda Hornet', 
        startDate: '2023-11-15', 
        dailyFee: 15, 
        status: 'ACTIVE', 
        contactLog: [] 
    }
];

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

const StorageManager: React.FC = () => {
    const { t } = useLanguage();
    const { garageInfo } = useGarage();
    const [storageList, setStorageList] = useLocalStorage<StorageEntry[]>('garage-storage', INITIAL_STORAGE);
    const [newEntry, setNewEntry] = useState<Partial<StorageEntry>>({ clientName: '', phone: '', motorcycle: '', startDate: new Date().toISOString().split('T')[0], dailyFee: 15 });
    
    const [logModalOpen, setLogModalOpen] = useState(false);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [newLog, setNewLog] = useState({ method: 'PHONE', notes: '' });

    const calculateDays = (startDate: string) => {
        const start = new Date(startDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    };

    const handleAddEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (newEntry.clientName && newEntry.motorcycle) {
            const entry: StorageEntry = {
                id: `store-${Date.now()}`,
                clientName: newEntry.clientName!,
                phone: newEntry.phone || '',
                motorcycle: newEntry.motorcycle!,
                startDate: newEntry.startDate || new Date().toISOString().split('T')[0],
                dailyFee: Number(newEntry.dailyFee) || 15,
                status: 'ACTIVE',
                contactLog: []
            };
            setStorageList([...storageList, entry]);
            setNewEntry({ clientName: '', phone: '', motorcycle: '', startDate: new Date().toISOString().split('T')[0], dailyFee: 15 });
        }
    };

    const handleAddLog = () => {
        if (selectedEntryId && newLog.notes) {
            setStorageList(storageList.map(entry => {
                if (entry.id === selectedEntryId) {
                    return {
                        ...entry,
                        contactLog: [...entry.contactLog, { date: new Date().toISOString(), method: newLog.method as any, notes: newLog.notes }]
                    };
                }
                return entry;
            }));
            setLogModalOpen(false);
            setNewLog({ method: 'PHONE', notes: '' });
        }
    };

    const handleStatusChange = (id: string, status: StorageEntry['status']) => {
        setStorageList(storageList.map(entry => entry.id === id ? { ...entry, status } : entry));
    };

    const handleDeleteEntry = (id: string) => {
        if (window.confirm('Ești sigur că vrei să ștergi această intrare din evidență?')) {
            setStorageList(storageList.filter(entry => entry.id !== id));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-white">Depozitare & Moto Abandonate</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formular Adaugare */}
                <HudPanel title="Înregistrare Depozitare">
                    <form onSubmit={handleAddEntry} className="space-y-4">
                        <input type="text" placeholder="Nume Client" value={newEntry.clientName} onChange={e => setNewEntry({...newEntry, clientName: e.target.value})} className="w-full p-2 futuristic-input" required />
                        <input type="tel" placeholder="Telefon" value={newEntry.phone} onChange={e => setNewEntry({...newEntry, phone: e.target.value})} className="w-full p-2 futuristic-input" required />
                        <input type="text" placeholder="Motocicletă" value={newEntry.motorcycle} onChange={e => setNewEntry({...newEntry, motorcycle: e.target.value})} className="w-full p-2 futuristic-input" required />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400">Data Start</label>
                                <input type="date" value={newEntry.startDate} onChange={e => setNewEntry({...newEntry, startDate: e.target.value})} className="w-full p-2 futuristic-input" required />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Taxă Zilnică ({garageInfo.currency})</label>
                                <input type="number" value={newEntry.dailyFee} onChange={e => setNewEntry({...newEntry, dailyFee: parseFloat(e.target.value)})} className="w-full p-2 futuristic-input" required />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 rounded-lg mt-4">Adaugă la Depozit</button>
                    </form>
                </HudPanel>

                {/* Lista */}
                <div className="lg:col-span-2">
                    <HudPanel title="Situație Curentă">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left futuristic-table text-sm">
                                <thead>
                                    <tr>
                                        <th className="p-3">Client / Moto</th>
                                        <th className="p-3">Zile</th>
                                        <th className="p-3 text-right">Total</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Acțiuni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {storageList.map(entry => {
                                        const days = calculateDays(entry.startDate);
                                        const total = days * entry.dailyFee;
                                        const isAlert = days > 30 && entry.status === 'ACTIVE';

                                        return (
                                            <tr key={entry.id} className={`hover:bg-gray-800/50 ${isAlert ? 'bg-red-900/20 border-l-2 border-red-500' : ''}`}>
                                                <td className="p-3">
                                                    <p className="font-bold text-white">{entry.clientName}</p>
                                                    <p className="text-xs text-gray-400">{entry.motorcycle}</p>
                                                    <p className="text-xs text-gray-500">{entry.phone}</p>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`font-bold ${isAlert ? 'text-red-400' : 'text-gray-300'}`}>{days} zile</span>
                                                    <p className="text-xs text-gray-500">din {new Date(entry.startDate).toLocaleDateString()}</p>
                                                </td>
                                                <td className="p-3 text-right font-mono text-primary-400">{total.toFixed(2)} {garageInfo.currency}</td>
                                                <td className="p-3">
                                                    <select 
                                                        value={entry.status} 
                                                        onChange={(e) => handleStatusChange(entry.id, e.target.value as any)}
                                                        className={`p-1 rounded text-xs font-bold ${entry.status === 'ACTIVE' ? 'bg-green-900/50 text-green-400' : entry.status === 'ABANDONED' ? 'bg-red-900/50 text-red-400' : 'bg-gray-700 text-gray-300'}`}
                                                    >
                                                        <option value="ACTIVE">Activ</option>
                                                        <option value="ABANDONED">Abandonat</option>
                                                        <option value="RETURNED">Ridicat</option>
                                                    </select>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => { setSelectedEntryId(entry.id); setLogModalOpen(true); }}
                                                            className="text-xs bg-blue-600/50 hover:bg-blue-600 px-2 py-1 rounded text-blue-200 border border-blue-500/50"
                                                            title="Jurnal Contact"
                                                        >
                                                            Jurnal ({entry.contactLog.length})
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteEntry(entry.id)}
                                                            className="text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-2 py-1 rounded border border-red-500/30"
                                                            title="Șterge"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </HudPanel>
                </div>
            </div>

            {/* Modal Jurnal Contact */}
            {logModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setLogModalOpen(false)}>
                    <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-white mb-4">Adaugă Notă Contact</h3>
                        <select value={newLog.method} onChange={e => setNewLog({...newLog, method: e.target.value})} className="w-full p-2 futuristic-select mb-4">
                            <option value="PHONE">Apel Telefonic</option>
                            <option value="SMS">SMS / WhatsApp</option>
                            <option value="EMAIL">Email</option>
                            <option value="LETTER">Scrisoare / Notificare</option>
                        </select>
                        <textarea 
                            value={newLog.notes} 
                            onChange={e => setNewLog({...newLog, notes: e.target.value})} 
                            placeholder="Rezultatul discuției..." 
                            className="w-full p-2 futuristic-input mb-4"
                            rows={3}
                        ></textarea>
                        <div className="flex justify-end gap-4">
                            <button onClick={() => setLogModalOpen(false)} className="text-gray-400">Anulează</button>
                            <button onClick={handleAddLog} className="bg-primary-600 px-4 py-2 rounded text-white font-bold">Salvează Nota</button>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-gray-700">
                            <h4 className="text-sm font-bold text-gray-400 mb-2">Istoric:</h4>
                            <ul className="text-xs space-y-2 max-h-40 overflow-y-auto">
                                {storageList.find(s => s.id === selectedEntryId)?.contactLog.map((log, i) => (
                                    <li key={i} className="bg-gray-800 p-2 rounded">
                                        <span className="text-primary-400 font-bold">{new Date(log.date).toLocaleDateString()} ({log.method}):</span> <span className="text-gray-300">{log.notes}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StorageManager;
