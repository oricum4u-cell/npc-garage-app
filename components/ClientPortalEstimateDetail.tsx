import React from 'react';
import { Estimate, EstimateStatus, RepairLogEntry } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';
import { getStatusKey } from '../utils/translationHelpers.ts';

interface ClientPortalEstimateDetailProps {
    estimate: Estimate;
    onBack: () => void;
}

const ClientPortalEstimateDetail: React.FC<ClientPortalEstimateDetailProps> = ({ estimate, onBack }) => {
    const { t } = useLanguage();
    const { garageInfo } = useGarage();

    const { total, totalPaid, remainingToPay } = React.useMemo(() => {
        const sp = estimate.parts.reduce((sum, part) => sum + (part.price * part.quantity), 0);
        const sl = estimate.labor.reduce((sum, l) => sum + (l.rate * l.hours), 0);
        const pda = sp * (estimate.partsDiscount || 0) / 100;
        const lda = sl * (estimate.laborDiscount || 0) / 100;
        const t = (sp - pda) + (sl - lda);
        const tp = estimate.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        const rtp = t - tp;
        return { total: t, totalPaid: tp, remainingToPay: rtp };
    }, [estimate]);

    const statusDetails = React.useMemo(() => {
        const status = estimate.status;
        let details = { title: '', description: '', color: '' };
        switch (status) {
            case EstimateStatus.DRAFT:
                details = { title: t(getStatusKey(status)), description: t('publicStatus.draftDesc'), color: 'border-amber-500' }; break;
            case EstimateStatus.AWAITING_PAYMENT:
                details = { title: t(getStatusKey(status)), description: t('publicStatus.awaitingPaymentDesc'), color: 'border-blue-500' }; break;
            case EstimateStatus.COMPLETED:
                 details = { title: t(getStatusKey(status)), description: t('publicStatus.completedDesc'), color: 'border-green-500' }; break;
        }
        return details;
    }, [estimate, t]);

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Detalii Deviz <span className="text-primary-400">{estimate.estimateNumber}</span></h1>
                <button onClick={onBack} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">&larr; Înapoi</button>
            </div>
            
            <div className={`p-4 bg-gray-900/80 border-l-4 rounded-lg ${statusDetails.color}`}>
                <h3 className="text-xl font-bold text-white">{statusDetails.title}</h3>
                <p className="text-gray-300">{statusDetails.description}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Repair Log */}
                <div className="bg-gray-900/80 border border-primary-500/20 rounded-xl p-6 lg:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-4 border-b-2 border-primary-500/20 pb-2">Jurnal de Reparații</h2>
                     {estimate.repairLog && estimate.repairLog.length > 0 ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {estimate.repairLog.map((entry, index) => (
                                <div key={index} className="flex gap-4 items-start animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="text-xs text-center text-gray-400 flex-shrink-0 w-24">
                                        <p>{new Date(entry.timestamp).toLocaleDateString()}</p>
                                        <p className="font-bold">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                    <div className="flex-grow bg-gray-950/50 p-3 rounded-lg">
                                        {entry.type === 'text' ? (
                                            <p className="text-sm text-gray-200 italic">"{entry.content}"</p>
                                        ) : (
                                            <img src={entry.content} alt="Jurnal reparații" className="max-w-xs rounded-md" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 py-8">Niciun jurnal de reparații disponibil încă.</p>
                    )}
                </div>

                {/* Costs */}
                <div className="bg-gray-900/80 border border-primary-500/20 rounded-xl p-6">
                     <h2 className="text-xl font-bold text-white mb-4 border-b-2 border-primary-500/20 pb-2">Costuri</h2>
                     <div className="space-y-2 text-white">
                        <div className="flex justify-between"><span>Subtotal Piese</span><span>{estimate.parts.reduce((sum, part) => sum + (part.price * part.quantity), 0).toFixed(2)} {garageInfo.currency}</span></div>
                        <div className="flex justify-between"><span>Subtotal Manoperă</span><span>{estimate.labor.reduce((sum, l) => sum + (l.rate * l.hours), 0).toFixed(2)} {garageInfo.currency}</span></div>
                        {(estimate.partsDiscount || 0) > 0 && <div className="flex justify-between text-red-400"><span>Reducere Piese ({estimate.partsDiscount}%)</span><span>-{(estimate.parts.reduce((sum, part) => sum + (part.price * part.quantity), 0) * (estimate.partsDiscount || 0) / 100).toFixed(2)} {garageInfo.currency}</span></div>}
                        {(estimate.laborDiscount || 0) > 0 && <div className="flex justify-between text-red-400"><span>Reducere Manoperă ({estimate.laborDiscount}%)</span><span>-{(estimate.labor.reduce((sum, l) => sum + (l.rate * l.hours), 0) * (estimate.laborDiscount || 0) / 100).toFixed(2)} {garageInfo.currency}</span></div>}
                        <div className="flex justify-between font-bold text-xl border-t-2 border-primary-500/50 pt-2 mt-2"><span>Total Lucrare</span><span>{total.toFixed(2)} {garageInfo.currency}</span></div>
                        <div className="flex justify-between text-green-400"><span>Total Plătit</span><span>-{totalPaid.toFixed(2)} {garageInfo.currency}</span></div>
                        <div className="flex justify-between font-extrabold text-2xl text-primary-300 pt-2 mt-2"><span>Rest de Plată</span><span>{remainingToPay.toFixed(2)} {garageInfo.currency}</span></div>
                    </div>
                </div>
                
                {/* General Info */}
                 <div className="bg-gray-900/80 border border-primary-500/20 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 border-b-2 border-primary-500/20 pb-2">Informații Generale</h2>
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-semibold text-primary-400">Servicii Solicitate</h4>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{estimate.services}</p>
                        </div>
                         <div>
                            <h4 className="font-semibold text-primary-400">Piese Folosite</h4>
                            {estimate.parts.length > 0 ? (
                                <ul className="list-disc pl-5 text-sm text-gray-300">
                                    {estimate.parts.map(p => <li key={p.id}>{p.name} (x{p.quantity})</li>)}
                                </ul>
                            ) : <p className="text-sm text-gray-400 italic">Nicio piesă specificată.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientPortalEstimateDetail;
