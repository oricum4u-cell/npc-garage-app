import React, { useState, useMemo } from 'react';
import { Estimate, AIPrediction } from '../types.ts';
import { getAiMaintenancePrediction } from '../services/geminiService.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import MotorcycleIllustration from './MotorcycleIllustration.tsx';

interface PredictiveMaintenanceProps {
    estimates: Estimate[];
}

interface MotorcycleData {
    vin: string;
    make: string;
    model: string;
    year: number;
    lastMileage: number;
    history: Estimate[];
}

const PredictiveMaintenance: React.FC<PredictiveMaintenanceProps> = ({ estimates }) => {
    const { t } = useLanguage();
    const [predictions, setPredictions] = useState<Record<string, AIPrediction[]>>({});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [errorStates, setErrorStates] = useState<Record<string, string>>({});
    const [expandedVins, setExpandedVins] = useState<Record<string, boolean>>({});

    const uniqueMotorcycles = useMemo((): MotorcycleData[] => {
        const motorcyclesByVin = new Map<string, MotorcycleData>();
        
        estimates.forEach(e => {
            if (!e.motorcycleVin) return;

            const existing = motorcyclesByVin.get(e.motorcycleVin);
            if (existing) {
                existing.history.push(e);
                if ((e.mileageIn || 0) > existing.lastMileage) {
                    existing.lastMileage = e.mileageIn || 0;
                }
            } else {
                motorcyclesByVin.set(e.motorcycleVin, {
                    vin: e.motorcycleVin,
                    make: e.motorcycleMake,
                    model: e.motorcycleModel,
                    year: e.motorcycleYear,
                    lastMileage: e.mileageIn || 0,
                    history: [e]
                });
            }
        });

        return Array.from(motorcyclesByVin.values()).sort((a, b) => a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
    }, [estimates]);

    const handleGeneratePredictions = async (motorcycle: MotorcycleData) => {
        setLoadingStates(prev => ({ ...prev, [motorcycle.vin]: true }));
        setExpandedVins(prev => ({ ...prev, [motorcycle.vin]: true }));
        setErrorStates(prev => ({...prev, [motorcycle.vin]: ''}));

        try {
            const result = await getAiMaintenancePrediction(
                { make: motorcycle.make, model: motorcycle.model, year: motorcycle.year },
                motorcycle.history
            );
            setPredictions(prev => ({ ...prev, [motorcycle.vin]: result }));
        } catch (error) {
            console.error("Prediction failed", error);
            const message = error instanceof Error ? error.message : 'A apărut o eroare necunoscută.';
            setErrorStates(prev => ({...prev, [motorcycle.vin]: message}));
        } finally {
            setLoadingStates(prev => ({ ...prev, [motorcycle.vin]: false }));
        }
    };
    
    const UrgencyPill: React.FC<{ urgency: 'LOW' | 'MEDIUM' | 'HIGH' }> = ({ urgency }) => {
        const styles = {
            LOW: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300', label: t('predictive.urgency.low') },
            MEDIUM: { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-800 dark:text-amber-300', label: t('predictive.urgency.medium') },
            HIGH: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: t('predictive.urgency.high') },
        };
        const style = styles[urgency];
        return <span className={`px-3 py-1 text-xs font-bold rounded-full ${style.bg} ${style.text}`}>{style.label}</span>;
    };


    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
                 <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('nav.predictiveMaintenance')}</h1>
                 <p className="mt-2 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{t('predictive.subtitle')}</p>
            </div>

            <div className="space-y-4">
                {uniqueMotorcycles.map(moto => (
                    <div key={moto.vin} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                        <div className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400">{moto.make} {moto.model} <span className="text-gray-500 dark:text-gray-400 font-normal">({moto.year})</span></h3>
                                <p className="font-mono text-sm text-gray-600 dark:text-gray-300">{moto.vin}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('predictive.lastMileage')}: <strong>{moto.lastMileage.toLocaleString('ro-RO')} km</strong></p>
                            </div>
                            <button
                                onClick={() => handleGeneratePredictions(moto)}
                                disabled={loadingStates[moto.vin]}
                                className="w-full sm:w-auto bg-sky-500/30 text-sky-200 font-bold py-2 px-4 rounded-lg transition-colors border border-sky-500/50 hover:bg-sky-500/40 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loadingStates[moto.vin] ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.707 1.707A1 1 0 003 15v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 00-.293-.707L16 11.586V8a6 6 0 00-6-6zM8 17a1 1 0 112 0v-1a1 1 0 11-2 0v1zm4-13a4 4 0 00-3.416 5.876L8 11.586V14h4v-2.414l.584-.584A4 4 0 0012 4z" /></svg>
                                {loadingStates[moto.vin] ? t('predictive.generating') : t('predictive.generate')}
                            </button>
                        </div>

                        {expandedVins[moto.vin] && (
                             <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                                {loadingStates[moto.vin] && <div className="text-center py-8"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-2 text-gray-500 dark:text-gray-400">{t('predictive.loading')}</p></div>}
                                
                                {errorStates[moto.vin] && <div className="text-center py-8 text-red-500">{errorStates[moto.vin]}</div>}

                                {!loadingStates[moto.vin] && predictions[moto.vin] && (
                                    <div className="space-y-4">
                                        {predictions[moto.vin].length > 0 ? predictions[moto.vin].map((pred, index) => (
                                            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow animate-fade-in">
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{pred.componentName}</h4>
                                                    <UrgencyPill urgency={pred.urgency} />
                                                </div>
                                                <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-2">{pred.recommendation}</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">{pred.reasoning}</p>
                                            </div>
                                        )) : <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('predictive.noPredictions')}</p>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                 {uniqueMotorcycles.length === 0 && (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <MotorcycleIllustration className="w-64 h-auto mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">{t('predictive.noHistory')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PredictiveMaintenance;