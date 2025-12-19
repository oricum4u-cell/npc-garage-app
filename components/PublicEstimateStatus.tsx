import React, { useState, useEffect, useMemo } from 'react';
import { Estimate, EstimateStatus } from '../types.ts';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getStatusKey } from '../utils/translationHelpers.ts';
import Logo from './Logo.tsx';
import Clock from './Clock.tsx';

// This is a standalone component, likely rendered on a separate route.
const PublicEstimateStatus: React.FC = () => {
    const { garageInfo } = useGarage();
    const { t, language } = useLanguage();
    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [error, setError] = useState('');
    
    useEffect(() => {
        // This component is likely intended for a separate HTML file/route,
        // so we parse the query string manually.
        const urlParams = new URLSearchParams(window.location.search);
        const estimateId = urlParams.get('id');

        if (!estimateId) {
            setError(t('publicStatus.noIdError'));
            return;
        }

        try {
            const allEstimatesJson = localStorage.getItem('garage-estimates');
            if (!allEstimatesJson) {
                setError(t('publicStatus.loadError'));
                return;
            }
            
            const allEstimates: Estimate[] = JSON.parse(allEstimatesJson);
            const foundEstimate = allEstimates.find(e => e.id === estimateId);
            
            if (foundEstimate) {
                setEstimate(foundEstimate);
            } else {
                setError(t('publicStatus.notFoundError'));
            }
        } catch (e) {
            setError(t('publicStatus.loadError'));
        }
    }, [t]);

    const statusDetails = useMemo(() => {
        if (!estimate) return null;
        const status = estimate.status;
        let details = {
            title: '',
            description: '',
            icon: '',
            color: ''
        };
        switch (status) {
            case EstimateStatus.DRAFT:
                details = { title: t(getStatusKey(status)), description: t('publicStatus.draftDesc'), icon: '📝', color: 'amber' };
                break;
            case EstimateStatus.AWAITING_PAYMENT:
                details = { title: t(getStatusKey(status)), description: t('publicStatus.awaitingPaymentDesc'), icon: '💰', color: 'blue' };
                break;
            case EstimateStatus.COMPLETED:
                 details = { title: t(getStatusKey(status)), description: t('publicStatus.completedDesc'), icon: '✅', color: 'green' };
                break;
            default:
                details = { title: 'Unknown Status', description: '', icon: '❓', color: 'gray' };
        }
        return details;
    }, [estimate, t]);
    
    // We need to handle Tailwind's purging by including the full class names if they are dynamically generated.
    const colorClasses = {
      amber: {
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        border: 'border-amber-500',
        text: 'text-amber-800 dark:text-amber-200'
      },
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        border: 'border-blue-500',
        text: 'text-blue-800 dark:text-blue-200'
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/30',
        border: 'border-green-500',
        text: 'text-green-800 dark:text-green-200'
      },
       gray: {
        bg: 'bg-gray-50 dark:bg-gray-900/30',
        border: 'border-gray-500',
        text: 'text-gray-800 dark:text-gray-200'
      }
    };


    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 sm:p-8 space-y-6">
                <header className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <Logo className="w-16 h-16" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{garageInfo.name}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('publicStatus.title')}</p>
                        </div>
                    </div>
                    <Clock className="text-sm text-gray-500 dark:text-gray-400" />
                </header>

                {error && <div className="p-4 text-center text-red-800 bg-red-100 dark:bg-red-900/50 dark:text-red-200 rounded-lg">{error}</div>}

                {estimate && statusDetails && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold">{t('publicStatus.greeting', { name: estimate.customerName })}</h2>
                            <p className="text-gray-600 dark:text-gray-300">{t('publicStatus.intro', { number: estimate.estimateNumber })}</p>
                        </div>

                        <div className={`p-6 rounded-lg ${colorClasses[statusDetails.color as keyof typeof colorClasses]?.bg} border-l-4 ${colorClasses[statusDetails.color as keyof typeof colorClasses]?.border}`}>
                            <div className="flex items-center gap-4">
                                <span className="text-4xl">{statusDetails.icon}</span>
                                <div>
                                    <h3 className={`text-xl font-bold ${colorClasses[statusDetails.color as keyof typeof colorClasses]?.text}`}>{statusDetails.title}</h3>
                                    <p className={`mt-1 text-gray-700 dark:text-gray-300`}>{statusDetails.description}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <p className="font-semibold text-gray-500 dark:text-gray-400">{t('publicStatus.motorcycle')}</p>
                                <p className="font-bold text-lg">{estimate.motorcycleMake} {estimate.motorcycleModel} ({estimate.motorcycleYear})</p>
                            </div>
                             <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <p className="font-semibold text-gray-500 dark:text-gray-400">{t('publicStatus.lastUpdate')}</p>
                                <p className="font-bold text-lg">{new Date(estimate.date).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                        </div>

                        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                             <p className="text-sm text-gray-500 dark:text-gray-400">{t('publicStatus.contactPrompt')}</p>
                             <p className="font-semibold">{garageInfo.phone}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicEstimateStatus;
