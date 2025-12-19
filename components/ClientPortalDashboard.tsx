
import React, { useState, useMemo, useEffect } from 'react';
import { Estimate, EstimateStatus, ClientDocument } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getStatusKey } from '../utils/translationHelpers.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

interface ClientPortalDashboardProps {
    clientPhone: string;
    estimates: Estimate[];
    onLogout: () => void;
    onViewEstimate: (id: string) => void;
}

const ClientPortalDashboard: React.FC<ClientPortalDashboardProps> = ({ clientPhone, estimates, onLogout, onViewEstimate }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'history' | 'documents' | 'achievements'>('history');
    
    // Document Management
    const [documents, setDocuments] = useLocalStorage<ClientDocument[]>(`client-docs-${clientPhone}`, []);
    const [newDocType, setNewDocType] = useState<ClientDocument['type']>('RCA');
    const [newDocExpiry, setNewDocExpiry] = useState('');

    const clientEstimates = estimates
        .filter(e => e.customerPhone === clientPhone)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const clientName = clientEstimates.length > 0 ? clientEstimates[0].customerName : 'Client';

    const statusColors: Record<EstimateStatus, string> = {
        [EstimateStatus.DRAFT]: 'bg-amber-900/50 text-amber-300',
        [EstimateStatus.AWAITING_PAYMENT]: 'bg-blue-900/50 text-blue-300',
        [EstimateStatus.COMPLETED]: 'bg-green-900/50 text-green-300',
    };

    // Achievements Logic
    const achievements = useMemo(() => {
        const list = [];
        const completed = clientEstimates.filter(e => e.status === EstimateStatus.COMPLETED);
        const totalSpent = completed.reduce((sum, e) => {
             const parts = e.parts.reduce((s, p) => s + p.price * p.quantity, 0);
             const labor = e.labor.reduce((s, l) => s + l.rate * l.hours, 0);
             return sum + parts + labor;
        }, 0);

        if (clientEstimates.length >= 1) list.push({ icon: '🆕', title: 'Bun venit!', desc: 'Prima vizită în service.' });
        if (completed.length >= 3) list.push({ icon: '🤝', title: 'Client Fidel', desc: '3+ vizite finalizate cu succes.' });
        if (completed.length >= 10) list.push({ icon: '🏆', title: 'Veteran', desc: '10+ vizite. Ești parte din familie!' });
        if (totalSpent > 5000) list.push({ icon: '💎', title: 'Premium Rider', desc: 'Investiții serioase în pasiune.' });
        
        // Check for specific services
        const hasBrakes = completed.some(e => e.services.toLowerCase().includes('fran') || e.services.toLowerCase().includes('brake'));
        if (hasBrakes) list.push({ icon: '🛑', title: 'Safety First', desc: 'Întreținere sistem frânare.' });

        return list;
    }, [clientEstimates]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Fișierul este prea mare (max 2MB).");
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = ev.target?.result as string;
                const newDoc: ClientDocument = {
                    id: `doc-${Date.now()}`,
                    type: newDocType,
                    name: file.name,
                    expiryDate: newDocExpiry,
                    imageBase64: base64
                };
                setDocuments(prev => [...prev, newDoc]);
                setNewDocExpiry('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteDocument = (id: string) => {
        if(confirm('Sigur dorești să ștergi acest document?')) {
            setDocuments(prev => prev.filter(d => d.id !== id));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Bun venit, <span className="text-primary-400">{clientName}</span>!</h1>
                <button onClick={onLogout} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-500/30 transition-colors">Deconectare</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-gray-900/50 p-1 rounded-lg w-full sm:w-auto self-start overflow-x-auto">
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'history' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>📜 Istoric Service</button>
                <button onClick={() => setActiveTab('documents')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'documents' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>📂 Garaj Digital</button>
                <button onClick={() => setActiveTab('achievements')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'achievements' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>🏆 Realizări</button>
            </div>
            
            <div className="bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl p-6 min-h-[400px]">
                
                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <>
                        <h2 className="text-xl font-bold text-white mb-4">Istoricul tău de service</h2>
                        {clientEstimates.length > 0 ? (
                            <div className="space-y-4">
                                {clientEstimates.map(estimate => (
                                    <div key={estimate.id} className="bg-gray-950/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-gray-800 hover:border-primary-500/30 transition-colors">
                                        <div>
                                            <p className="font-bold text-lg text-white">{estimate.motorcycleMake} {estimate.motorcycleModel}</p>
                                            <p className="text-sm text-primary-400 font-mono">{estimate.estimateNumber} - {new Date(estimate.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[estimate.status]}`}>
                                                {t(getStatusKey(estimate.status))}
                                            </span>
                                            <button onClick={() => onViewEstimate(estimate.id)} className="bg-blue-600/50 text-blue-200 font-semibold py-2 px-4 rounded-lg hover:bg-blue-600/70 transition-colors">
                                                Vezi Detalii
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 py-10">Nu ai niciun deviz înregistrat.</p>
                        )}
                    </>
                )}

                {/* DOCUMENTS TAB */}
                {activeTab === 'documents' && (
                    <>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h2 className="text-xl font-bold text-white">Portofel Documente</h2>
                            <div className="bg-gray-800 p-2 rounded-lg flex flex-col sm:flex-row gap-2 items-center border border-gray-700">
                                <select 
                                    value={newDocType} 
                                    onChange={(e) => setNewDocType(e.target.value as any)} 
                                    className="bg-gray-900 text-white text-sm p-2 rounded border-none focus:ring-1 focus:ring-primary-500"
                                >
                                    <option value="RCA">RCA (Asigurare)</option>
                                    <option value="ITP">ITP</option>
                                    <option value="TALON">Talon</option>
                                    <option value="PERMIS">Permis</option>
                                    <option value="OTHER">Altele</option>
                                </select>
                                <input 
                                    type="date" 
                                    value={newDocExpiry} 
                                    onChange={(e) => setNewDocExpiry(e.target.value)} 
                                    className="bg-gray-900 text-white text-sm p-2 rounded border-none focus:ring-1 focus:ring-primary-500"
                                    title="Data expirării (opțional)"
                                />
                                <label className="cursor-pointer bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors">
                                    <span>+ Încarcă</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>
                        </div>

                        {documents.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {documents.map(doc => (
                                    <div key={doc.id} className="group relative bg-gray-950 rounded-lg overflow-hidden border border-gray-800 hover:border-primary-500/50 transition-all">
                                        <img src={doc.imageBase64} alt={doc.type} className="w-full h-40 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="p-3">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-white">{doc.type}</span>
                                                <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-400 hover:text-red-200 text-xs bg-red-900/20 p-1 rounded">Șterge</button>
                                            </div>
                                            {doc.expiryDate && (
                                                <p className={`text-xs mt-1 ${new Date(doc.expiryDate) < new Date() ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                                                    Expira: {new Date(doc.expiryDate).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <a href={doc.imageBase64} download={doc.name} className="absolute inset-0 z-10" title="Descarcă" />
                                        <div className="absolute top-2 right-2 z-20 pointer-events-auto">
                                            {/* Only delete button is interactive above the link overlay */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-xl">
                                <span className="text-4xl block mb-2">📂</span>
                                <p className="text-gray-400">Nu ai documente încărcate.</p>
                                <p className="text-xs text-gray-500 mt-1">Păstrează aici poze cu RCA, ITP sau Talon pentru acces rapid.</p>
                            </div>
                        )}
                    </>
                )}

                {/* ACHIEVEMENTS TAB */}
                {activeTab === 'achievements' && (
                    <>
                        <h2 className="text-xl font-bold text-white mb-4">Insigne & Realizări</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {achievements.map((badge, idx) => (
                                <div key={idx} className="bg-gray-950/50 p-4 rounded-xl border border-primary-500/20 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                                    <div className="text-4xl bg-gray-900 p-3 rounded-full shadow-inner">{badge.icon}</div>
                                    <div>
                                        <h3 className="font-bold text-white">{badge.title}</h3>
                                        <p className="text-xs text-gray-400">{badge.desc}</p>
                                    </div>
                                </div>
                            ))}
                            {achievements.length === 0 && <p className="text-gray-400 col-span-full text-center">Vizitează service-ul pentru a debloca insigne!</p>}
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default ClientPortalDashboard;
