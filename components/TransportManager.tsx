
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { TransportRequest, TransportType, TransportStatus } from '../types.ts';
import { useGarage } from '../contexts/GarageContext.tsx';

const INITIAL_TRANSPORT: TransportRequest[] = [
    {
        id: 'trans-1',
        clientName: 'Mihai Popescu',
        phone: '0722123456',
        address: 'Str. Victoriei 12, București',
        motorcycle: 'Yamaha R1',
        type: 'PICKUP',
        status: 'PENDING',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '10:00',
        cost: 100,
        notes: 'Nu pornește, trebuie platformă'
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

const TransportManager: React.FC = () => {
    const { t } = useLanguage();
    const { garageInfo } = useGarage();
    const [requests, setRequests] = useLocalStorage<TransportRequest[]>('garage-transport', INITIAL_TRANSPORT);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<TransportRequest | null>(null);
    const [filterType, setFilterType] = useState<'ALL' | TransportType>('ALL');

    // Form State
    const [formData, setFormData] = useState<Partial<TransportRequest>>({
        type: 'PICKUP',
        status: 'PENDING',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00',
        cost: 50
    });

    const handleOpenModal = (request: TransportRequest | null) => {
        setEditingRequest(request);
        if (request) {
            setFormData(request);
        } else {
            setFormData({
                type: 'PICKUP',
                status: 'PENDING',
                scheduledDate: new Date().toISOString().split('T')[0],
                scheduledTime: '09:00',
                cost: 50,
                clientName: '',
                phone: '',
                address: '',
                motorcycle: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingRequest) {
            setRequests(prev => prev.map(r => r.id === editingRequest.id ? { ...r, ...formData } as TransportRequest : r));
        } else {
            const newRequest: TransportRequest = {
                id: `trans-${Date.now()}`,
                ...formData as TransportRequest
            };
            setRequests(prev => [...prev, newRequest]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm(t('transport.confirmDelete'))) {
            setRequests(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleStatusChange = (id: string, newStatus: TransportStatus) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    };

    const openMap = (address: string) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    };

    const filteredRequests = useMemo(() => {
        return requests.filter(r => filterType === 'ALL' || r.type === filterType)
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    }, [requests, filterType]);

    const getStatusColor = (status: TransportStatus) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-900/50 text-amber-300 border-amber-700';
            case 'SCHEDULED': return 'bg-blue-900/50 text-blue-300 border-blue-700';
            case 'IN_PROGRESS': return 'bg-purple-900/50 text-purple-300 border-purple-700';
            case 'COMPLETED': return 'bg-green-900/50 text-green-300 border-green-700';
            case 'CANCELLED': return 'bg-red-900/50 text-red-300 border-red-700';
            default: return 'bg-gray-800 text-gray-300';
        }
    };

    const getTypeIcon = (type: TransportType) => {
        return type === 'PICKUP' ? 'arrow_upward' : 'arrow_downward'; // Conceptual icons
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-white">{t('transport.title')}</h1>
                <div className="flex gap-2">
                    <select 
                        value={filterType} 
                        onChange={e => setFilterType(e.target.value as any)}
                        className="p-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                    >
                        <option value="ALL">{t('transport.filterAll')}</option>
                        <option value="PICKUP">{t('transport.pickup')}</option>
                        <option value="DELIVERY">{t('transport.delivery')}</option>
                    </select>
                    <button 
                        onClick={() => handleOpenModal(null)}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                    >
                        <span className="text-xl">+</span> {t('transport.addRequest')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary Cards */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-900/80 p-4 rounded-xl border border-primary-500/20 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">{t('transport.pending')}</p>
                            <p className="text-2xl font-bold text-amber-400">{requests.filter(r => r.status === 'PENDING').length}</p>
                        </div>
                        <div className="p-3 bg-amber-900/30 rounded-full text-amber-400">⏳</div>
                    </div>
                    <div className="bg-gray-900/80 p-4 rounded-xl border border-primary-500/20 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">{t('transport.scheduled')}</p>
                            <p className="text-2xl font-bold text-blue-400">{requests.filter(r => r.status === 'SCHEDULED').length}</p>
                        </div>
                        <div className="p-3 bg-blue-900/30 rounded-full text-blue-400">📅</div>
                    </div>
                    <div className="bg-gray-900/80 p-4 rounded-xl border border-primary-500/20 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">{t('transport.inProgress')}</p>
                            <p className="text-2xl font-bold text-purple-400">{requests.filter(r => r.status === 'IN_PROGRESS').length}</p>
                        </div>
                        <div className="p-3 bg-purple-900/30 rounded-full text-purple-400">🚚</div>
                    </div>
                    <div className="bg-gray-900/80 p-4 rounded-xl border border-primary-500/20 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">{t('transport.completed')}</p>
                            <p className="text-2xl font-bold text-green-400">{requests.filter(r => r.status === 'COMPLETED').length}</p>
                        </div>
                        <div className="p-3 bg-green-900/30 rounded-full text-green-400">✅</div>
                    </div>
                </div>

                {/* Request List */}
                <div className="lg:col-span-3">
                    <HudPanel title={t('transport.activeRequests')}>
                        <div className="space-y-4">
                            {filteredRequests.map(req => (
                                <div key={req.id} className={`p-4 rounded-lg border-l-4 bg-gray-950/50 flex flex-col md:flex-row justify-between gap-4 ${req.type === 'PICKUP' ? 'border-l-cyan-500' : 'border-l-orange-500'}`}>
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${req.type === 'PICKUP' ? 'bg-cyan-900/30 text-cyan-400' : 'bg-orange-900/30 text-orange-400'}`}>
                                                {req.type === 'PICKUP' ? t('transport.pickup') : t('transport.delivery')}
                                            </span>
                                            <h3 className="font-bold text-white text-lg">{req.clientName}</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-300">
                                            <p className="flex items-center gap-2">
                                                <span className="text-gray-500">📞</span> {req.phone}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <span className="text-gray-500">🏍️</span> {req.motorcycle}
                                            </p>
                                            <p className="flex items-center gap-2 cursor-pointer hover:text-primary-400 transition-colors" onClick={() => openMap(req.address)}>
                                                <span className="text-gray-500">📍</span> {req.address}
                                                <span className="text-xs bg-gray-800 px-1 rounded border border-gray-700">Hartă</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <span className="text-gray-500">🕒</span> {new Date(req.scheduledDate).toLocaleDateString()} - {req.scheduledTime}
                                            </p>
                                        </div>
                                        {req.notes && <p className="text-xs text-gray-500 mt-2 italic">"{req.notes}"</p>}
                                    </div>

                                    <div className="flex flex-col justify-between items-end min-w-[150px]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-mono text-lg font-bold text-white">{req.cost} {garageInfo.currency}</span>
                                        </div>
                                        
                                        <div className="flex flex-col w-full gap-2">
                                            <select 
                                                value={req.status}
                                                onChange={(e) => handleStatusChange(req.id, e.target.value as TransportStatus)}
                                                className={`w-full p-1 text-xs font-bold rounded border text-center appearance-none cursor-pointer ${getStatusColor(req.status)}`}
                                            >
                                                <option value="PENDING">{t('transport.status.PENDING')}</option>
                                                <option value="SCHEDULED">{t('transport.status.SCHEDULED')}</option>
                                                <option value="IN_PROGRESS">{t('transport.status.IN_PROGRESS')}</option>
                                                <option value="COMPLETED">{t('transport.status.COMPLETED')}</option>
                                                <option value="CANCELLED">{t('transport.status.CANCELLED')}</option>
                                            </select>
                                            
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal(req)} className="p-1 text-gray-400 hover:text-white bg-gray-800 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                                                <button onClick={() => handleDelete(req.id)} className="p-1 text-gray-400 hover:text-red-400 bg-gray-800 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredRequests.length === 0 && (
                                <div className="text-center py-8 text-gray-500">{t('transport.noRequests')}</div>
                            )}
                        </div>
                    </HudPanel>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleSave}>
                            <header className="p-4 border-b border-primary-900/50">
                                <h3 className="text-xl font-bold text-white">{editingRequest ? t('transport.editRequest') : t('transport.addRequest')}</h3>
                            </header>
                            <main className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="p-2 futuristic-select">
                                        <option value="PICKUP">{t('transport.pickup')}</option>
                                        <option value="DELIVERY">{t('transport.delivery')}</option>
                                    </select>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="p-2 futuristic-select">
                                        <option value="PENDING">{t('transport.status.PENDING')}</option>
                                        <option value="SCHEDULED">{t('transport.status.SCHEDULED')}</option>
                                        <option value="IN_PROGRESS">{t('transport.status.IN_PROGRESS')}</option>
                                        <option value="COMPLETED">{t('transport.status.COMPLETED')}</option>
                                    </select>
                                </div>
                                <input type="text" placeholder="Nume Client" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full p-2 futuristic-input" required />
                                <input type="tel" placeholder="Telefon" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 futuristic-input" required />
                                <input type="text" placeholder="Adresă" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-2 futuristic-input" required />
                                <input type="text" placeholder="Motocicletă" value={formData.motorcycle} onChange={e => setFormData({...formData, motorcycle: e.target.value})} className="w-full p-2 futuristic-input" required />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="date" value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} className="w-full p-2 futuristic-input" required />
                                    <input type="time" value={formData.scheduledTime} onChange={e => setFormData({...formData, scheduledTime: e.target.value})} className="w-full p-2 futuristic-input" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Cost" value={formData.cost} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})} className="w-full p-2 futuristic-input" />
                                </div>
                                <textarea placeholder="Notițe" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2 futuristic-input" rows={2}></textarea>
                            </main>
                            <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">{t('estimateForm.cancel')}</button>
                                <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">{t('estimateForm.save')}</button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransportManager;
