
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { startRepairLogSession } from '../services/geminiService.ts';
import { Estimate, RepairLogEntry } from '../types.ts';

interface LiveRepairLogModalProps {
    estimate: Estimate;
    onSave: (log: RepairLogEntry[]) => void;
    onClose: () => void;
}

type SessionStatus = 'IDLE' | 'CONNECTING' | 'RECORDING' | 'ENDED' | 'ERROR';

const LiveRepairLogModal: React.FC<LiveRepairLogModalProps> = ({ estimate, onSave, onClose }) => {
    const { t } = useLanguage();
    const [status, setStatus] = useState<SessionStatus>('IDLE');
    const [log, setLog] = useState<RepairLogEntry[]>(estimate.repairLog || []);
    const [error, setError] = useState('');
    
    const sessionRef = useRef<{ session: any; stop: () => void } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        logContainerRef.current?.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [log]);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError('Nu s-a putut accesa camera. Verifică permisiunile.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    useEffect(() => {
        startCamera();
        return stopCamera;
    }, [startCamera, stopCamera]);


    const handleToggleRecording = async () => {
        if (status === 'RECORDING') {
            if (sessionRef.current) {
                sessionRef.current.stop();
                sessionRef.current = null;
            }
            setStatus('ENDED');
        } else {
            setStatus('CONNECTING');
            setError('');
            try {
                sessionRef.current = await startRepairLogSession({
                    onTranscription: (text, isFinal) => {
                        if (text.trim()) {
                            setLog(prev => [...prev, { timestamp: new Date().toISOString(), type: 'text', content: text.trim() }]);
                        }
                    },
                    // FIX: Updated parameter type from ErrorEvent to Error as per corrected SDK usage and session start function
                    onError: (e: Error) => {
                        console.error('Session error:', e);
                        setError(e.message);
                        setStatus('ERROR');
                        if (sessionRef.current) sessionRef.current.stop();
                    },
                    onClose: () => setStatus('ENDED'),
                });
                setStatus('RECORDING');
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Eroare la pornirea sesiunii audio.';
                setError(message);
                setStatus('ERROR');
            }
        }
    };
    
    const handleTakePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        setLog(prev => [...prev, { timestamp: new Date().toISOString(), type: 'image', content: base64Image }]);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Jurnal de Reparații Live - <span className="text-primary-400">{estimate.estimateNumber}</span></h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">&times;</button>
                </header>
                
                <main className="flex-grow p-6 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                        </div>
                        <button onClick={handleTakePhoto} className="w-full bg-sky-600/50 text-sky-200 font-bold py-3 px-4 rounded-lg border border-sky-500/80 hover:bg-sky-500/70 flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                            Adaugă Fotografie
                        </button>
                    </div>

                    <div className="flex flex-col bg-gray-950/50 rounded-lg p-4">
                         <div ref={logContainerRef} className="flex-grow space-y-4 overflow-y-auto pr-2">
                            {log.map((entry, index) => (
                                <div key={index} className="flex gap-3 items-start animate-fade-in-up">
                                    <div className="text-xs text-center text-gray-500 w-16 flex-shrink-0">
                                        <p>{new Date(entry.timestamp).toLocaleDateString()}</p>
                                        <p className="font-bold">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                    <div className="flex-grow bg-gray-800 p-2 rounded-md">
                                        {entry.type === 'text' ? (
                                            <p className="text-sm text-gray-200 italic">"{entry.content}"</p>
                                        ) : (
                                            <img src={entry.content} alt="log entry" className="max-w-full h-auto rounded" />
                                        )}
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                </main>
                
                <footer className="p-4 bg-gray-950/50 flex justify-between items-center rounded-b-xl border-t border-primary-900/50">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleToggleRecording}
                            className={`font-bold py-3 px-6 rounded-lg flex items-center gap-2 ${status === 'RECORDING' ? 'bg-red-600/80 text-white' : 'bg-green-600/80 text-white'}`}
                        >
                            {status === 'RECORDING' ? '■ Oprește' : '● Înregistrează'}
                        </button>
                        <div className="h-6 flex items-center text-sm font-semibold">
                            {status === 'CONNECTING' && <span className="text-amber-400">Conectare...</span>}
                            {status === 'RECORDING' && <span className="text-red-400 flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>Înregistrare...</span>}
                            {status === 'ERROR' && <span className="text-red-500">Eroare: {error}</span>}
                        </div>
                    </div>
                    <button onClick={() => onSave(log)} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg">Salvează Jurnalul</button>
                </footer>
                 <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
        </div>
    );
};

export default LiveRepairLogModal;
