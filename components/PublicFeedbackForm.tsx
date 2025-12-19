import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Estimate, Feedback } from '../types.ts';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import Logo from './Logo.tsx';

const StarRating: React.FC<{ rating: number; onRating: (rating: number) => void }> = ({ rating, onRating }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex justify-center space-x-2">
            {[...Array(5)].map((_, index) => {
                const ratingValue = index + 1;
                return (
                    <button
                        type="button"
                        key={ratingValue}
                        className={`text-4xl transition-colors ${ratingValue <= (hover || rating) ? 'text-yellow-400' : 'text-gray-600'}`}
                        onClick={() => onRating(ratingValue)}
                        onMouseEnter={() => setHover(ratingValue)}
                        onMouseLeave={() => setHover(0)}
                    >
                        ★
                    </button>
                );
            })}
        </div>
    );
};

const PublicFeedbackForm: React.FC = () => {
    const { garageInfo } = useGarage();
    const { t } = useLanguage();
    const [estimates, setEstimates] = useLocalStorage<Estimate[]>('garage-estimates', []);
    const [feedback, setFeedback] = useLocalStorage<Feedback[]>('garage-feedback', []);
    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isPublic, setIsPublic] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const estimateId = urlParams.get('id');
        if (!estimateId) {
            setError('ID-ul devizului lipsește.');
            return;
        }
        const foundEstimate = estimates.find(e => e.id === estimateId);
        if (foundEstimate) {
            if (foundEstimate.feedbackId) {
                setError('Feedback-ul pentru acest deviz a fost deja trimis.');
            } else {
                setEstimate(foundEstimate);
            }
        } else {
            setError('Devizul nu a fost găsit.');
        }
    }, [estimates]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!estimate || rating === 0) return;

        const newFeedback: Feedback = {
            id: `fb-${Date.now()}`,
            estimateId: estimate.id,
            rating,
            comment,
            isPublic,
            date: new Date().toISOString(),
        };

        setFeedback(prev => [...prev, newFeedback]);
        setEstimates(prev => prev.map(e => e.id === estimate.id ? { ...e, feedbackId: newFeedback.id } : e));
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-900 text-gray-100 p-8 flex items-center justify-center">
                <div className="w-full max-w-lg text-center bg-gray-800 p-8 rounded-lg shadow-2xl">
                    <h1 className="text-3xl font-bold text-primary-400 mb-4">{t('feedback.thankYouTitle')}</h1>
                    <p className="text-lg">{t('feedback.thankYouMessage')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-lg bg-gray-800 rounded-lg shadow-2xl p-6 sm:p-8">
                <header className="text-center mb-6 pb-4 border-b border-gray-700">
                    <Logo className="w-20 h-20 mx-auto mb-2" />
                    <h1 className="text-2xl font-bold">{t('feedback.publicFormTitle')}</h1>
                </header>
                
                {error && <p className="text-center text-red-400 mb-4">{error}</p>}

                {estimate && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="text-center">
                            <p>{t('feedback.greeting', { name: estimate.customerName, garageName: garageInfo.name })}</p>
                            <p className="text-sm text-gray-400">{t('feedback.intro', { estimateNumber: estimate.estimateNumber })}</p>
                        </div>

                        <div>
                            <label className="block text-center text-lg font-medium text-primary-300 mb-4">{t('feedback.ratingLabel')}</label>
                            <StarRating rating={rating} onRating={setRating} />
                        </div>

                        <div>
                            <label htmlFor="comment" className="block text-sm font-medium text-gray-300 mb-1">{t('feedback.commentLabel')}</label>
                            <textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={t('feedback.commentPlaceholder')} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500"></textarea>
                        </div>
                        
                        <div className="flex items-center">
                            <input id="isPublic" type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500" />
                            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-300">{t('feedback.publicConsent')}</label>
                        </div>

                        <button type="submit" disabled={rating === 0} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            {t('feedback.submitButton')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PublicFeedbackForm;
