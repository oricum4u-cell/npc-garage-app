
import React, { useState, useMemo } from 'react';
import { Estimate, Mechanic, WorkshopBay, EstimateStatus, BayStatus } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getStatusKey } from '../utils/translationHelpers.ts';
import { STATUS_COLORS } from '../constants.ts';

interface WorkshopViewProps {
    estimates: Estimate[];
    mechanics: Mechanic[];
    bays: WorkshopBay[];
    setBays: React.Dispatch<React.SetStateAction<WorkshopBay[]>>;
    onViewEstimate: (id: string) => void;
}

const HudPanel: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
    <div className={`relative w-full h-full p-4 sm:p-6 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl shadow-2xl shadow-primary-900/50 ${className}`}>
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl"></div>
        {children}
    </div>
);

const TrafficLight: React.FC<{ status: BayStatus, onChange: (status: BayStatus) => void, disabled: boolean }> = ({ status, onChange, disabled }) => {
    if (disabled) {
        return (
            <div className="flex gap-1 opacity-30 grayscale pointer-events-none">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
        );
    }

    return (
        <div className="flex gap-1 bg-black/40 p-1 rounded-full">
            <button 
                onClick={(e) => { e.stopPropagation(); onChange('PROBLEM'); }} 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${status === 'PROBLEM' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] scale-125' : 'bg-red-900/50 hover:bg-red-800'}`}
                title="Problemă / Blocat"
            ></button>
            <button 
                onClick={(e) => { e.stopPropagation(); onChange('WAITING'); }} 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${status === 'WAITING' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] scale-125' : 'bg-amber-900/50 hover:bg-amber-800'}`}
                title="În Așteptare (Piese/Client)"
            ></button>
            <button 
                onClick={(e) => { e.stopPropagation(); onChange('ACTIVE'); }} 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${status === 'ACTIVE' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] scale-125' : 'bg-green-900/50 hover:bg-green-800'}`}
                title="Activ / Se Lucrează"
            ></button>
        </div>
    );
};

const EstimateCard: React.FC<{ estimate: Estimate, onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void, onViewEstimate: (id: string) => void }> = ({ estimate, onDragStart, onViewEstimate }) => {
    const { t } = useLanguage();
    return (
        <div 
            draggable 
            onDragStart={(e) => onDragStart(e, estimate.id)}
            className="p-3 bg-gray-950/70 backdrop-blur-sm border border-primary-500/10 rounded-lg shadow-lg cursor-grab active:cursor-grabbing transition-all hover:border-primary-500/50"
        >
            <p className="font-bold text-white truncate">{estimate.motorcycleMake} {estimate.motorcycleModel}</p>
            <p className="text-sm text-gray-300 truncate">{estimate.customerName}</p>
            <p className="text-xs text-primary-400 font-mono truncate">{estimate.estimateNumber}</p>
            <div className="mt-2 flex justify-between items-center">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[estimate.status]}`}>{t(getStatusKey(estimate.status))}</span>
                <button onClick={() => onViewEstimate(estimate.id)} className="text-xs text-gray-400 hover:text-white underline">Detalii</button>
            </div>
        </div>
    );
};

const WorkshopView: React.FC<WorkshopViewProps> = ({ estimates, mechanics, bays, setBays, onViewEstimate }) => {
    const { t } = useLanguage();
    const [dragOverBay, setDragOverBay] = useState<string | null>(null);
    const [editingBay, setEditingBay] = useState<{ id: string; name: string } | null>(null);

    const mechanicMap = useMemo(() => new Map(mechanics.map(m => [m.id, m.name])), [mechanics]);

    const { unassignedEstimates, assignedEstimatesMap } = useMemo(() => {
        const assignedIds = new Set(bays.map(b => b.estimateId).filter(id => id !== null));
        const unassigned = estimates.filter(e => !assignedIds.has(e.id) && e.status === EstimateStatus.DRAFT);
        const assignedMap = new Map<string, Estimate>();
        estimates.forEach(e => {
            if (assignedIds.has(e.id)) {
                assignedMap.set(e.id, e);
            }
        });
        return { unassignedEstimates: unassigned, assignedEstimatesMap: assignedMap };
    }, [estimates, bays]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, estimateId: string) => {
        e.dataTransfer.setData("estimateId", estimateId);
        const sourceBay = bays.find(b => b.estimateId === estimateId);
        if (sourceBay) {
            e.dataTransfer.setData("sourceBayId", sourceBay.id);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetBayId: string) => {
        e.preventDefault();
        setDragOverBay(null);
        const estimateId = e.dataTransfer.getData("estimateId");
        const sourceBayId = e.dataTransfer.getData("sourceBayId");
        
        setBays(currentBays => {
            const newBays = [...currentBays];
            const targetBay = newBays.find(b => b.id === targetBayId);
            const sourceBay = sourceBayId ? newBays.find(b => b.id === sourceBayId) : null;
            
            if (!targetBay || !estimateId) return currentBays;

            const estimateOnTarget = targetBay.estimateId;
            targetBay.estimateId = estimateId;
            targetBay.status = 'ACTIVE'; // Default to Active when dropped

            if (sourceBay) {
                sourceBay.estimateId = estimateOnTarget || null;
                if (!sourceBay.estimateId) sourceBay.status = 'ACTIVE'; // Reset status if became free
            }
            
            return newBays;
        });
    };

    const handleRelease = (bayId: string) => {
        setBays(currentBays => 
            currentBays.map(b => b.id === bayId ? { ...b, estimateId: null, status: 'ACTIVE' } : b)
        );
    };

    const handleSaveBayName = () => {
        if (!editingBay || !editingBay.name.trim()) {
            setEditingBay(null);
            return;
        }
        setBays(currentBays => 
            currentBays.map(b => 
                b.id === editingBay.id ? { ...b, name: editingBay.name.trim() } : b
            )
        );
        setEditingBay(null);
    };

    const handleBayStatusChange = (bayId: string, newStatus: BayStatus) => {
        setBays(prev => prev.map(b => b.id === bayId ? { ...b, status: newStatus } : b));
    };

    const getBayBorderColor = (status: BayStatus, hasEstimate: boolean) => {
        if (!hasEstimate) return 'border-primary-500/20';
        switch (status) {
            case 'ACTIVE': return 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
            case 'WAITING': return 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
            case 'PROBLEM': return 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
            default: return 'border-primary-500/20';
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            <div className="lg:w-1/4 flex-shrink-0">
                 <HudPanel className="flex flex-col h-full">
                    <h2 className="text-xl font-bold text-white mb-4 text-center">{t('workshop.unassignedEstimates')}</h2>
                    <div 
                        className="flex-grow space-y-3 overflow-y-auto p-2 -m-2"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                             const sourceBayId = e.dataTransfer.getData("sourceBayId");
                             if (sourceBayId) {
                                handleRelease(sourceBayId);
                             }
                        }}
                    >
                        {unassignedEstimates.length > 0 ? (
                            unassignedEstimates.map(est => <EstimateCard key={est.id} estimate={est} onDragStart={handleDragStart} onViewEstimate={onViewEstimate} />)
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-gray-400">
                                <p>{t('workshop.noUnassigned')}</p>
                            </div>
                        )}
                    </div>
                </HudPanel>
            </div>

            <div className="flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {bays.map(bay => {
                        const estimate = bay.estimateId ? assignedEstimatesMap.get(bay.estimateId) : null;
                        const isDragOver = dragOverBay === bay.id;

                        const mechanicNames = estimate 
                            ? (estimate.mechanicIds || [])
                                .map(id => mechanicMap.get(id) || 'Necunoscut')
                                .join(', ')
                            : t('history.unassigned');

                        return (
                            <div 
                                key={bay.id} 
                                onDragOver={(e) => { e.preventDefault(); setDragOverBay(bay.id); }}
                                onDragLeave={() => setDragOverBay(null)}
                                onDrop={(e) => handleDrop(e, bay.id)}
                                className={`min-h-[16rem] transition-all duration-300 ${isDragOver ? 'scale-105' : ''}`}
                            >
                                <div className={`relative w-full h-full p-4 sm:p-6 bg-gray-900/80 backdrop-blur-sm border rounded-xl shadow-2xl flex flex-col transition-colors duration-500 ${getBayBorderColor(bay.status, !!estimate)}`}>
                                    {/* Decorative Corners */}
                                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl pointer-events-none"></div>
                                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl pointer-events-none"></div>
                                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl pointer-events-none"></div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl pointer-events-none"></div>

                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <div className="flex flex-col w-full">
                                            <div className="flex justify-between items-center w-full mb-1">
                                                {editingBay?.id === bay.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingBay.name}
                                                        onChange={(e) => setEditingBay({ ...editingBay, name: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveBayName();
                                                            if (e.key === 'Escape') setEditingBay(null);
                                                        }}
                                                        onBlur={handleSaveBayName}
                                                        className="bg-transparent border-b-2 border-primary-500/50 focus:border-primary-500 text-lg font-bold text-white outline-none w-full mr-2"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2 group flex-grow min-w-0">
                                                        <h3 className="text-lg font-bold text-white truncate" title={bay.name}>{bay.name}</h3>
                                                        <button 
                                                            onClick={() => setEditingBay({ id: bay.id, name: bay.name })} 
                                                            className="p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0" 
                                                            title="Editează nume"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                                <TrafficLight status={bay.status} onChange={(s) => handleBayStatusChange(bay.id, s)} disabled={!estimate} />
                                            </div>
                                            
                                            {estimate ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${STATUS_COLORS[estimate.status]}`}>
                                                        {t(getStatusKey(estimate.status))}
                                                    </span>
                                                    {bay.status === 'PROBLEM' && <span className="text-[10px] font-bold text-red-500 bg-red-900/20 px-2 py-0.5 rounded border border-red-900/50 animate-pulse">BLOCAT</span>}
                                                    {bay.status === 'WAITING' && <span className="text-[10px] font-bold text-amber-500 bg-amber-900/20 px-2 py-0.5 rounded border border-amber-900/50">AȘTEPTARE</span>}
                                                </div>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-900/30 text-green-400 border border-green-900/50 w-max">{t('workshop.bayFree')}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`flex-grow flex flex-col justify-center items-center p-2 rounded-lg transition-colors duration-300 ${estimate ? 'bg-black/30' : 'bg-black/10'}`}>
                                        {estimate ? (
                                            <div className="w-full text-left p-2 space-y-2">
                                                <div>
                                                    <p className="font-bold text-lg text-white truncate">{estimate.motorcycleMake} {estimate.motorcycleModel}</p>
                                                    <p className="text-gray-300 truncate text-sm">{estimate.customerName}</p>
                                                </div>
                                                <p className="font-mono text-xs text-primary-400 truncate bg-primary-900/20 px-2 py-1 rounded w-max">{estimate.estimateNumber}</p>
                                                <div className="pt-2 border-t border-primary-900/50">
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider">{t('history.mechanic')}</p>
                                                    <p className="font-semibold text-gray-300 truncate text-sm">{mechanicNames || t('history.unassigned')}</p>
                                                </div>
                                                <div className="flex justify-end gap-2 mt-2">
                                                     <button onClick={() => onViewEstimate(estimate.id)} className="text-xs text-primary-300 hover:text-white underline font-bold">{t('estimatesList.view')}</button>
                                                     <button onClick={() => handleRelease(bay.id)} className="text-xs text-amber-500 hover:text-amber-300 underline">{t('workshop.release')}</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto opacity-30 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                <p className="text-sm font-semibold">{t('workshop.assign')}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WorkshopView;
