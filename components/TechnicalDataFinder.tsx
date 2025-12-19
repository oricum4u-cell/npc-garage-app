import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getAiTechnicalData } from '../services/geminiService.ts';
import { AITechnicalData, Estimate } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import MotorcycleIllustration from './MotorcycleIllustration.tsx';

interface TechnicalDataFinderProps {
    estimates: Estimate[];
    setView: (view: any) => void;
}

const TechnicalDataFinder: React.FC<TechnicalDataFinderProps> = ({ estimates, setView }) => {
    const { t } = useLanguage();
    const [motorcycleInfo, setMotorcycleInfo] = useState({ make: '', model: '', year: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [technicalData, setTechnicalData] = useState<AITechnicalData | null>(null);
    const [cachedData, setCachedData] = useLocalStorage<Record<string, AITechnicalData>>('garage-tech-data-cache', {});
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

    const uniqueMotorcycles = useMemo(() => {
        const unique = new Map<string, { make: string; model: string; year: number }>();
        estimates.forEach(e => {
            const key = `${e.motorcycleMake}-${e.motorcycleModel}-${e.motorcycleYear}`.toLowerCase();
            if (!unique.has(key) && e.motorcycleMake && e.motorcycleModel && e.motorcycleYear) {
                unique.set(key, { make: e.motorcycleMake, model: e.motorcycleModel, year: e.motorcycleYear });
            }
        });
        return Array.from(unique.values()).sort((a, b) => a.make.localeCompare(b.make));
    }, [estimates]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const { make, model, year } = motorcycleInfo;
        if (!make || !model || !year) {
            setError(t('technicalData.errorIncomplete'));
            return;
        }

        const cacheKey = `${make}-${model}-${year}`.toLowerCase().replace(/\s+/g, '-');
        if (cachedData[cacheKey]) {
            setTechnicalData(cachedData[cacheKey]);
            return;
        }

        setIsLoading(true);
        setError('');
        setTechnicalData(null);

        try {
            const data = await getAiTechnicalData({ make, model, year: parseInt(year, 10) });
            setTechnicalData(data);
            setCachedData(prev => ({ ...prev, [cacheKey]: data }));
        } catch (err) {
            const message = err instanceof Error ? err.message : t('technicalData.genericError');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedStates(prev => ({ ...prev, [key]: true }));
            setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000);
        });
    };

    const handleSearchInStock = (sku: string) => {
        localStorage.setItem('stock-search-term', sku);
        setView('STOCK');
    };
    
    const handleSelectMotorcycle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedValue = e.target.value;
        const [make, model, year] = selectedValue.split(' | ');
        if (make && model && year) {
            setMotorcycleInfo({ make, model, year });
        }
    };

    const DataRow: React.FC<{ label: string; value: string | undefined; dataKey: string; isPart?: boolean }> = ({ label, value, dataKey, isPart }) => (
        <div className="flex justify-between items-center py-3 border-b border-gray-700 group">
            <dt className="text-sm font-medium text-gray-300">{label}</dt>
            <dd className="flex items-center gap-2 text-sm font-semibold text-white text-right">
                <span>{value || 'N/A'}</span>
                {value && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleCopyToClipboard(value, dataKey)} title="Copiază" className="p-1 rounded-md hover:bg-gray-600">
                            {copiedStates[dataKey] ? '✅' : '📋'}
                        </button>
                        {isPart && (
                            <button onClick={() => handleSearchInStock(value)} title="Caută în stoc" className="p-1 rounded-md hover:bg-gray-600">📦</button>
                        )}
                    </div>
                )}
            </dd>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl p-6">
                <h1 className="text-2xl font-bold text-white text-center mb-2">{t('technicalData.title')}</h1>
                <p className="text-center text-primary-300/80 mb-6">{t('technicalData.subtitle')}</p>
                <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <datalist id="motorcycle-list">
                        {uniqueMotorcycles.map((m, i) => <option key={i} value={`${m.make} | ${m.model} | ${m.year}`} />)}
                    </datalist>
                    <div className="sm:col-span-3">
                        <label className="block text-sm font-medium text-gray-300 mb-1">{t('history.prompt')}</label>
                        <input
                            type="text"
                            list="motorcycle-list"
                            placeholder="Selectează sau scrie Marcă | Model | An"
                            onChange={handleSelectMotorcycle}
                            className="w-full p-2 futuristic-input"
                        />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg transition-all duration-200 border-2 border-primary-500/80 hover:bg-primary-500/70 disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '🔍'}
                        <span>{t('technicalData.searchButton')}</span>
                    </button>
                </form>
            </div>

            <div className="bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl p-6 min-h-[300px] flex items-center justify-center">
                {isLoading && <div className="text-center"><div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-gray-300">{t('manualFinder.loading')}</p></div>}
                {error && <div className="text-center text-red-400">{error}</div>}

                {!isLoading && !technicalData && !error && (
                    <div className="text-center text-gray-400">
                        <MotorcycleIllustration className="w-48 h-auto mx-auto text-primary-500/20" />
                        <p className="mt-4 font-semibold">{t('technicalData.prompt')}</p>
                    </div>
                )}
                
                {technicalData && (
                    <div className="w-full animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-4">{t('technicalData.resultsTitle', { make: motorcycleInfo.make, model: motorcycleInfo.model, year: motorcycleInfo.year })}</h2>
                        <dl>
                            <DataRow label={t('technicalData.oilType')} value={technicalData.oilType} dataKey="oilType" />
                            <DataRow label={t('technicalData.oilQuantityWithFilter')} value={technicalData.oilQuantityWithFilter} dataKey="oilQuantityWithFilter"/>
                            <DataRow label={t('technicalData.oilQuantityWithoutFilter')} value={technicalData.oilQuantityWithoutFilter} dataKey="oilQuantityWithoutFilter"/>
                            <DataRow label={t('technicalData.sparkPlugs')} value={technicalData.sparkPlugs} dataKey="sparkPlugs" isPart />
                            <DataRow label={t('technicalData.airFilter')} value={technicalData.airFilter} dataKey="airFilter" isPart />
                            <DataRow label={t('technicalData.oilFilter')} value={technicalData.oilFilter} dataKey="oilFilter" isPart />
                            <DataRow label={t('technicalData.coolantType')} value={technicalData.coolantType} dataKey="coolantType" />
                            <DataRow label={t('technicalData.coolantQuantity')} value={technicalData.coolantQuantity} dataKey="coolantQuantity" />
                        </dl>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TechnicalDataFinder;