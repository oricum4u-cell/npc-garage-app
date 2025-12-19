import React from 'react';
import { Feedback, Estimate } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';

interface ClientsDashboardProps {
    feedback: Feedback[];
    estimates: Estimate[];
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex">
        {[...Array(5)].map((_, i) => (
            <svg key={i} className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
    </div>
);

const ClientsDashboard: React.FC<ClientsDashboardProps> = ({ feedback, estimates }) => {
    const { t } = useLanguage();
    const estimateMap = new Map<string, Estimate>(estimates.map(e => [e.id, e]));

    const sortedFeedback = [...feedback].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-6">
            <div className="bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl p-6">
                <h1 className="text-2xl font-bold text-white mb-4">{t('nav.clientFeedback')}</h1>
                {sortedFeedback.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">{t('feedback.noFeedbackYet')}</p>
                ) : (
                    <div className="space-y-4">
                        {sortedFeedback.map(f => {
                            const estimate = estimateMap.get(f.estimateId);
                            return (
                                <div key={f.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-white">{estimate?.customerName}</p>
                                            <p className="text-xs text-primary-400 font-mono">{estimate?.estimateNumber}</p>
                                        </div>
                                        <div className="text-right">
                                            <StarRating rating={f.rating} />
                                            <p className="text-xs text-gray-400 mt-1">{new Date(f.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-300 italic">"{f.comment}"</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientsDashboard;