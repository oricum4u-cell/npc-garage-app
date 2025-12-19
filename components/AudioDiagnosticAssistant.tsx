
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { startAudioDiagnosticSession } from '../services/geminiService.ts';
import MarkdownRenderer from './MarkdownRenderer.tsx';

interface AudioDiagnosticAssistantProps {
    onAppend: (diagnosis: string) => void;
    onClose: () => void;
}

type SessionStatus = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'ENDED' | 'ERROR';

const AudioDiagnosticAssistant: React.FC<AudioDiagnosticAssistantProps> = ({ onAppend, onClose }) => {
    const { t } = useLanguage();
    const [status, setStatus] = useState<SessionStatus>('IDLE');
    const [transcription, setTranscription] = useState('');
    const [error, setError] = useState('');
    
    const sessionRef = useRef<{ session: any; stop: () => void } | null>(null);
    const transcriptionRef = useRef(''); // Use ref to accumulate transcription chunks

    useEffect(() => {
        // Cleanup function to stop session on component unmount
        return () => {
            if (sessionRef.current) {
                sessionRef.current.stop();
            }
        };
    }, []);

    const handleStartSession = async () => {
        setStatus('CONNECTING');
        setError('');
        setTranscription('');
        transcriptionRef.current = '';

        try {
            sessionRef.current = await startAudioDiagnosticSession({
                onTranscription: (text, isFinal) => {
                    if (status !== 'LISTENING') setStatus('LISTENING');
                    transcriptionRef.current += text;
                    setTranscription(transcriptionRef.current);
                },
                // FIX: Updated parameter type from ErrorEvent to Error as per corrected SDK usage and session start function
                onError: (e: Error) => {
                    console.error('Session error:', e);
                    setError(e.message);
                    setStatus('ERROR');
                    if (sessionRef.current) sessionRef.current.stop();
                },
                onClose: () => {
                    setStatus('ENDED');
                }
            });
        } catch (err) {
            console.error("Failed to initialize session:", err);
            const message = err instanceof Error ? err.message : t('audioDiagnostic.micError');
            setError(message);
            setStatus('ERROR');
        }
    };
    
    const handleStopSession = () => {
        if (sessionRef.current) {
            sessionRef.current.stop();
            sessionRef.current = null;
        }
        setStatus('ENDED');
    };

    const handleAppend = () => {
        if (transcription) {
            onAppend(transcription);
            setTranscription('');
            transcriptionRef.current = '';
            setStatus('IDLE');
        }
    };

    const renderStatus = () => {
        switch (status) {
            case 'IDLE': return null;
            case 'CONNECTING': return <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t('audioDiagnostic.connecting')}</span>;
            case 'LISTENING': return <span className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>{t('audioDiagnostic.listening')}</span>;
            case 'ENDED': return <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('audioDiagnostic.sessionEnded')}</span>;
            case 'ERROR': return <span className="text-sm font-semibold text-red-500">{t('audioDiagnostic.error')}: {error}</span>;
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('audioDiagnostic.title')}</h3>
                </div>
                <div className="p-6 space-y-4">
                     <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="flex-grow space-y-2">
                            <div className="flex gap-2">
                                {status === 'IDLE' || status === 'ENDED' || status === 'ERROR' ? (
                                    <button type="button" onClick={handleStartSession} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" /><path d="M5.5 10.5a.5.5 0 01.5.5v1a4 4 0 004 4h.5a.5.5 0 010 1h-.5a5 5 0 01-5-5v-1a.5.5 0 01.5-.5z" /></svg>
                                        {t('audioDiagnostic.startSession')}
                                    </button>
                                ) : (
                                    <button type="button" onClick={handleStopSession} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        {t('audioDiagnostic.stopSession')}
                                    </button>
                                )}
                            </div>
                            <div className="h-6 flex items-center">{renderStatus()}</div>
                        </div>
                    </div>
                    {transcription ? (
                        <div className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700 min-h-[100px] max-h-60 overflow-y-auto">
                            <MarkdownRenderer content={transcription} />
                        </div>
                    ) : (
                        <div className="p-3 text-center text-gray-500 dark:text-gray-400 min-h-[100px] flex items-center justify-center">
                            <p>Apropie microfonul de sursa zgomotului și pornește sesiunea. Rezultatele vor apărea aici.</p>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">{t('recallsModal.close')}</button>
                    {transcription && <button type="button" onClick={handleAppend} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">{t('audioDiagnostic.appendToServices')}</button>}
                </div>
            </div>
        </div>
    );
};

export default AudioDiagnosticAssistant;
