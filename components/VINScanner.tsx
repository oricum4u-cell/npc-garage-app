import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getVinFromImage } from '../services/geminiService.ts';

interface VINScannerProps {
    onScanComplete: (vin: string) => void;
    onClose: () => void;
}

const VINScanner: React.FC<VINScannerProps> = ({ onScanComplete, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState<'STREAMING' | 'ANALYZING' | 'ERROR' | 'NO_CAMERA'>('STREAMING');
    const [errorMessage, setErrorMessage] = useState('');

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Eroare la accesarea camerei:", err);
            setStatus('NO_CAMERA');
            setErrorMessage('Nu s-a putut accesa camera. Verificați permisiunile.');
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
        return () => {
            stopCamera();
        };
    }, [startCamera, stopCamera]);

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setStatus('ANALYZING');
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;
        
        // Setează dimensiunile canvas-ului la cele ale videoclipului
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.9);
        stopCamera();

        try {
            const vin = await getVinFromImage(base64Image);
            if (vin && vin.length === 17) {
                onScanComplete(vin);
            } else {
                setStatus('ERROR');
                setErrorMessage('VIN negăsit. Încercați din nou cu o lumină mai bună și o imagine mai clară.');
                startCamera(); // Repornește camera pentru o nouă încercare
            }
        } catch (error) {
            console.error("Eroare la scanarea VIN:", error);
            const message = error instanceof Error ? error.message : 'A apărut o eroare necunoscută.';
            setStatus('ERROR');
            setErrorMessage(message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center animate-fade-in">
            <video ref={videoRef} autoPlay playsInline className={`absolute top-0 left-0 w-full h-full object-cover ${status === 'ANALYZING' ? 'opacity-30' : ''}`}></video>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl aspect-[3/1] rounded-lg border-4 border-dashed border-white/50 pointer-events-none"></div>

            <div className="relative z-10 text-center text-white p-4 w-full h-full flex flex-col justify-between">
                <div className="text-lg font-semibold bg-black/50 p-2 rounded-md">Încadrați seria de șasiu (VIN)</div>

                {status === 'ANALYZING' && (
                    <div className="flex flex-col items-center justify-center flex-grow">
                        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-xl">Se analizează imaginea...</p>
                    </div>
                )}

                {status === 'ERROR' && (
                     <div className="flex flex-col items-center justify-center flex-grow bg-red-900/80 p-4 rounded-lg">
                        <p className="font-bold">Eroare</p>
                        <p className="text-sm">{errorMessage}</p>
                    </div>
                )}
                
                 {status === 'NO_CAMERA' && (
                     <div className="flex flex-col items-center justify-center flex-grow bg-red-900/80 p-4 rounded-lg">
                        <p className="font-bold">Eroare Cameră</p>
                        <p className="text-sm">{errorMessage}</p>
                    </div>
                )}

                <div className="flex justify-center items-center gap-8">
                     <button onClick={onClose} className="bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-lg">Anulează</button>
                     <button onClick={handleCapture} disabled={status !== 'STREAMING'} className="w-20 h-20 rounded-full bg-white/90 border-4 border-white/50 ring-4 ring-black/30 shadow-lg disabled:opacity-50">
                        <span className="sr-only">Capturează</span>
                     </button>
                     <div className="w-[88px]"></div> {/* Placeholder to balance the layout */}
                </div>
            </div>
            
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
    );
};

export default VINScanner;