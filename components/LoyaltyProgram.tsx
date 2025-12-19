
import React, { useMemo, useState } from 'react';
import { Estimate, LoyaltyTier, EstimateStatus, LoyaltyTierConfig, UserRole, LoyaltyConfig } from '../types.ts';
import { useLoyalty } from '../contexts/LoyaltyContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getLoyaltyTierNameKey } from '../utils/translationHelpers.ts';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

// Tipuri locale
type LoyaltyAdjustments = Record<string, number>; // key: client phone, value: points adjustment

interface ClientData {
    name: string;
    phone: string;
    email: string;
    totalSpent: number;
    totalVisits: number;
    avgSpent: number;
    estimates: Estimate[];
    loyaltyPoints: number;
    loyaltyTier: LoyaltyTier | null;
}

const tierDetails: Record<LoyaltyTier | 'NONE', { icon: string, color: string, bg: string, textColor: string }> = {
    [LoyaltyTier.BRONZE]: { icon: '🥉', color: 'border-amber-600', bg: 'bg-amber-900/30', textColor: 'text-amber-300' },
    [LoyaltyTier.SILVER]: { icon: '🥈', color: 'border-slate-500', bg: 'bg-slate-700/30', textColor: 'text-slate-300' },
    [LoyaltyTier.GOLD]: { icon: '🥇', color: 'border-yellow-500', bg: 'bg-yellow-900/30', textColor: 'text-yellow-400' },
    [LoyaltyTier.PLATINUM]: { icon: '💎', color: 'border-violet-500', bg: 'bg-violet-900/30', textColor: 'text-violet-400' },
    [LoyaltyTier.VETERAN]: { icon: '🏆', color: 'border-gray-300', bg: 'bg-gray-800', textColor: 'text-gray-200' },
    [LoyaltyTier.STAFF]: { icon: '🔧', color: 'border-primary-500', bg: 'bg-primary-900/30', textColor: 'text-primary-400' },
    'NONE': { icon: '👤', color: 'border-gray-700', bg: 'bg-gray-700/30', textColor: 'text-gray-400' }
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

const ClientDetailModal: React.FC<{
    client: ClientData;
    loyaltyConfig: LoyaltyConfig;
    onClose: () => void;
    onUpdatePoints: (clientPhone: string, points: number) => void;
}> = ({ client, loyaltyConfig, onClose, onUpdatePoints }) => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [adjustment, setAdjustment] = useState('');
    const { garageInfo } = useGarage();

    const { TIERS } = loyaltyConfig;
    const tiersSorted = (Object.entries(TIERS) as [LoyaltyTier, LoyaltyTierConfig][])
        .filter(([tier]) => tier !== LoyaltyTier.STAFF)
        .sort(([, a], [, b]) => a.points - b.points);

    const nextTierInfo = useMemo(() => {
        if (!client.loyaltyTier) return tiersSorted[0];
        const currentTierIndex = tiersSorted.findIndex(([tier]) => tier === client.loyaltyTier);
        return currentTierIndex < tiersSorted.length - 1 ? tiersSorted[currentTierIndex + 1] : null;
    }, [client.loyaltyTier, tiersSorted]);

    const progress = useMemo(() => {
        const currentTierPoints = client.loyaltyTier ? TIERS[client.loyaltyTier].points : 0;
        if (!nextTierInfo) return { percentage: 100, needed: 0 };
        const nextTierPoints = nextTierInfo[1].points;
        const denominator = nextTierPoints - currentTierPoints;
        if (denominator <= 0) return { percentage: 100, needed: 0 };
        const progressRaw = (client.loyaltyPoints - currentTierPoints) / denominator;
        return {
            percentage: Math.min(100, progressRaw * 100),
            needed: Math.max(0, nextTierPoints - client.loyaltyPoints)
        };
    }, [client, TIERS, nextTierInfo]);

    const handleAdjustPoints = () => {
        const points = parseInt(adjustment, 10);
        if (!isNaN(points) && client.phone) {
            onUpdatePoints(client.phone, points);
            setAdjustment('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">{client.name}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">&times;</button>
                </header>

                <main className="flex-grow p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-gray-950/50 p-3 rounded-lg"><p className="text-xs text-primary-400/80">Vizite Totale</p><p className="text-2xl font-bold text-white">{client.totalVisits}</p></div>
                        <div className="bg-gray-950/50 p-3 rounded-lg"><p className="text-xs text-primary-400/80">Total Cheltuit</p><p className="text-2xl font-bold text-white">{client.totalSpent.toFixed(2)} {garageInfo.currency}</p></div>
                        <div className="bg-gray-950/50 p-3 rounded-lg"><p className="text-xs text-primary-400/80">Medie / Vizită</p><p className="text-2xl font-bold text-white">{client.avgSpent.toFixed(2)} {garageInfo.currency}</p></div>
                    </div>
                    
                    <div>
                        <h4 className="font-semibold text-primary-300 mb-2">Progres Loialitate</h4>
                        <div className="bg-gray-950/50 p-4 rounded-lg">
                            <div className="flex justify-between items-center text-sm font-semibold mb-2">
                                <span className="text-gray-300">{client.loyaltyTier ? t(getLoyaltyTierNameKey(client.loyaltyTier)) : t('loyalty.tierName.STANDARD')}</span>
                                <span className="text-white">{client.loyaltyPoints.toLocaleString('ro-RO')} Pcte</span>
                                <span className="text-gray-300">{nextTierInfo ? t(getLoyaltyTierNameKey(nextTierInfo[0])) : 'Nivel Maxim'}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden"><div className="bg-primary-500 h-4 rounded-full transition-all duration-500 animate-progress-bar" style={{ width: `${progress.percentage}%` }}></div></div>
                             <p className="text-center text-xs text-primary-300/80 mt-2">
                                {nextTierInfo ? `Mai sunt necesare ${progress.needed} puncte pentru a atinge nivelul ${t(getLoyaltyTierNameKey(nextTierInfo[0]))}!` : 'Felicitări, ai atins nivelul maxim!'}
                            </p>
                        </div>
                    </div>

                    {user?.role === UserRole.ADMIN && (
                        <div>
                            <h4 className="font-semibold text-primary-300 mb-2">Panou Administrator</h4>
                            <div className="bg-gray-950/50 p-4 rounded-lg border border-amber-500/20">
                                <label className="block text-sm font-medium text-amber-300/80 mb-1">Ajustare Puncte</label>
                                <div className="flex gap-2">
                                    <input type="number" step="1" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="ex: 50 sau -20" className="flex-grow futuristic-input p-2" />
                                    <button onClick={handleAdjustPoints} className="bg-amber-600/50 text-amber-200 font-bold py-2 px-4 rounded-lg border border-amber-500/80 hover:bg-amber-500/70">Salvează</button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Adaugă puncte pozitive pentru bonusuri sau negative pentru corecții.</p>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <h4 className="font-semibold text-primary-300 mb-2">Istoric Devize</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {client.estimates.map(e => <div key={e.id} className="bg-gray-950/50 p-2 rounded-lg text-sm flex justify-between"><span className="font-mono text-gray-300">{e.estimateNumber}</span><span>{new Date(e.date).toLocaleDateString('ro-RO')}</span></div>)}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

interface LoyaltyProgramProps {
    estimates: Estimate[];
}

const LoyaltyProgram: React.FC<LoyaltyProgramProps> = ({ estimates }) => {
    const { loyaltyConfig } = useLoyalty();
    const { garageInfo } = useGarage();
    const { t } = useLanguage();
    const { user } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTier, setFilterTier] = useState<LoyaltyTier | 'ALL'>('ALL');
    const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
    const [loyaltyAdjustments, setLoyaltyAdjustments] = useLocalStorage<LoyaltyAdjustments>('garage-loyalty-adjustments', {});

    const clients = useMemo((): ClientData[] => {
        const clientData: { [key: string]: Pick<ClientData, 'name' | 'phone' | 'email' | 'totalSpent' | 'estimates'> } = {};

        estimates.filter(e => e.status === EstimateStatus.COMPLETED).forEach(e => {
            const clientKey = e.customerPhone; // Use phone as the unique key
            if (!clientKey) return;

            if (!clientData[clientKey]) {
                clientData[clientKey] = { name: e.customerName, phone: e.customerPhone, email: e.customerEmail, totalSpent: 0, estimates: [] };
            }
            const estimateTotal = (e.parts.reduce((s, p) => s + p.price * p.quantity, 0) * (1 - (e.partsDiscount || 0) / 100)) + (e.labor.reduce((s, l) => s + l.rate * l.hours, 0) * (1 - (e.laborDiscount || 0) / 100));
            clientData[clientKey].totalSpent += estimateTotal;
            clientData[clientKey].estimates.push(e);
        });
        
        const loyaltyTiersSorted = (Object.entries(loyaltyConfig.TIERS) as [LoyaltyTier, LoyaltyTierConfig][]).filter(([tier]) => tier !== LoyaltyTier.STAFF).sort(([, a], [, b]) => b.points - a.points);
        
        const getTier = (points: number): LoyaltyTier | null => {
            for (const [tier, config] of loyaltyTiersSorted) if (points >= config.points) return tier;
            return null;
        };

        return Object.values(clientData).map(client => {
            const loyaltyPoints = Math.floor(client.totalSpent * loyaltyConfig.POINTS_PER_RON) + (loyaltyAdjustments[client.phone] || 0);
            const loyaltyTier = getTier(loyaltyPoints);
            const totalVisits = client.estimates.length;
            return { ...client, loyaltyPoints, loyaltyTier, totalVisits, avgSpent: totalVisits > 0 ? client.totalSpent / totalVisits : 0 };
        })
        .filter(client => {
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch = client.name.toLowerCase().includes(lowerSearch) || client.phone.includes(lowerSearch) || client.email.toLowerCase().includes(lowerSearch);
            const matchesFilter = filterTier === 'ALL' || client.loyaltyTier === filterTier;
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => b.loyaltyPoints - a.loyaltyPoints);

    }, [estimates, loyaltyConfig, loyaltyAdjustments, searchTerm, filterTier]);

    const handleUpdatePoints = (clientPhone: string, points: number) => {
        setLoyaltyAdjustments(prev => ({ ...prev, [clientPhone]: (prev[clientPhone] || 0) + points }));
        setSelectedClient(prev => prev ? { ...prev, loyaltyPoints: prev.loyaltyPoints + points } : null);
    };

    return (
        <>
            {selectedClient && <ClientDetailModal client={selectedClient} loyaltyConfig={loyaltyConfig} onClose={() => setSelectedClient(null)} onUpdatePoints={handleUpdatePoints} />}
            <div className="space-y-8">
                <HudPanel title={t('loyalty.topClients')}>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <input type="text" placeholder="Caută client după nume, telefon, email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-grow futuristic-input py-2" />
                        <select value={filterTier} onChange={e => setFilterTier(e.target.value as any)} className="futuristic-select py-2">
                            <option value="ALL">Toate Nivelurile</option>
                            {Object.values(LoyaltyTier).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left futuristic-table">
                            <thead><tr><th className="p-3">#</th><th className="p-3">Nume</th><th className="p-3 text-right">Puncte</th><th className="p-3 text-center">Nivel</th></tr></thead>
                            <tbody>
                                {clients.map((client, index) => {
                                    const details = client.loyaltyTier ? tierDetails[client.loyaltyTier] : tierDetails['NONE'];
                                    return (
                                        <tr key={client.phone} onClick={() => setSelectedClient(client)} className="cursor-pointer">
                                            <td className="p-3 font-bold text-gray-400">{index + 1}</td>
                                            <td className="p-3"><p className="font-medium text-white">{client.name}</p><p className="text-xs text-gray-400">{client.phone}</p></td>
                                            <td className="p-3 text-right font-semibold text-primary-400 font-mono">{client.loyaltyPoints.toLocaleString('ro-RO')}</td>
                                            <td className="p-3 text-center"><div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${details.bg} ${details.textColor}`}><span className="text-base">{details.icon}</span><span>{client.loyaltyTier ? t(getLoyaltyTierNameKey(client.loyaltyTier)) : t('loyalty.tierName.STANDARD')}</span></div></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {clients.length === 0 && <div className="text-center py-10 text-gray-400"><p>{t('loyalty.noClientData')}</p></div>}
                    </div>
                </HudPanel>
            </div>
        </>
    );
};

export default LoyaltyProgram;
