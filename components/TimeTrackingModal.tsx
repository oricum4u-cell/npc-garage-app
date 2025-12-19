
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Estimate, TimeLog, Mechanic } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

interface TimeTrackingModalProps {
    estimate: Estimate;
    mechanics: Mechanic[];
    onClose: () => void;
}

const TimeTrackingModal: React.FC<TimeTrackingModalProps> = ({ estimate, mechanics, onClose }) => {
    const { t } = useLanguage();
    const [estimates, setEstimates] = useLocalStorage<Estimate[]>('garage-estimates', []);
    
    // Local state for current logs to avoid flickering before save
    const [currentLogs, setCurrentLogs] = useState<TimeLog[]>(estimate.timeLogs || []);
    
    // Active Timer State
    const [activeLogId, setActiveLogId] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerInterval = useRef<number | null>(null);
    const [selectedMechanic, setSelectedMechanic] = useState<string>('');

    // Manual Entry State
    const [manualMechanic, setManualMechanic] = useState('');
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualHours, setManualHours] = useState(0);
    const [manualMinutes, setManualMinutes] = useState(0);
    const [manualNotes, setManualNotes] = useState('');

    // Initialize active log if exists
    useEffect(() => {
        const active = currentLogs.find(l => !l.endTime);
        if (active) {
            setActiveLogId(active.id);
            setSelectedMechanic(active.mechanicId);
            const start = new Date(active.startTime).getTime();
            setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
        } else if (mechanics.length > 0 && !selectedMechanic) {
            setSelectedMechanic(mechanics[0].id);
            setManualMechanic(mechanics[0].id);
        }
    }, []);

    // Timer Logic
    useEffect(() => {
        if (activeLogId) {
            timerInterval.current = window.setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (timerInterval.current) clearInterval(timerInterval.current);
        }
        return () => {
            if (timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [activeLogId]);

    // Save changes to localStorage
    const saveLogs = (newLogs: TimeLog[]) => {
        setCurrentLogs(newLogs);
        setEstimates(prev => prev.map(e => e.id === estimate.id ? { ...e, timeLogs: newLogs } : e));
    };

    const handleStartTimer = () => {
        if (!selectedMechanic) return;
        const mechanic = mechanics.find(m => m.id === selectedMechanic);
        
        const newLog: TimeLog = {
            id: `log-${Date.now()}`,
            mechanicId: selectedMechanic,
            mechanicName: mechanic?.name || 'Unknown',
            startTime: new Date().toISOString(),
            durationMinutes: 0,
            notes: 'Cronometru Live'
        };
        
        setActiveLogId(newLog.id);
        setElapsedSeconds(0);
        saveLogs([...currentLogs, newLog]);
    };

    const handleStopTimer = () => {
        if (!activeLogId) return;
        
        const now = new Date();
        const updatedLogs = currentLogs.map(log => {
            if (log.id === activeLogId) {
                const startTime = new Date(log.startTime);
                const durationMs = now.getTime() - startTime.getTime();
                return {
                    ...log,
                    endTime: now.toISOString(),
                    durationMinutes: Math.floor(durationMs / 1000 / 60)
                };
            }
            return log;
        });
        
        setActiveLogId(null);
        saveLogs(updatedLogs);
    };

    const handleAddManual = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualMechanic || (manualHours === 0 && manualMinutes === 0)) return;
        
        const mechanic = mechanics.find(m => m.id === manualMechanic);
        const totalMinutes = (manualHours * 60) + manualMinutes;
        
        // Create ISO dates for start/end based on manual date
        const start = new Date(manualDate);
        start.setHours(9, 0, 0, 0); // Default to 9 AM
        const end = new Date(start.getTime() + totalMinutes * 60000);

        const newLog: TimeLog = {
            id: `log-man-${Date.now()}`,
            mechanicId: manualMechanic,
            mechanicName: mechanic?.name || 'Unknown',
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            durationMinutes: totalMinutes,
            notes: manualNotes || 'Adăugat manual',
            isManual: true
        };

        saveLogs([...currentLogs, newLog]);
        
        // Reset inputs
        setManualHours(0);
        setManualMinutes(0);
        setManualNotes('');
    };

    const handleDeleteLog = (id: string) => {
        if (id === activeLogId) return; // Cannot delete active log
        if (confirm('Sigur dorești să ștergi această intrare?')) {
            saveLogs(currentLogs.filter(l => l.id !== id));
        }
    };

    // Formatting
    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const formatDuration = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    // Stats
    const estimatedHours = estimate.labor.reduce((sum, l) => sum + l.hours, 0);
    const totalWorkedMinutes = currentLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0) + (activeLogId ? Math.floor(elapsedSeconds / 60) : 0);
    const totalWorkedHours = totalWorkedMinutes / 60;
    const progressPercent = Math.min((totalWorkedHours / (estimatedHours || 1)) * 100, 100);
    const isOverBudget = totalWorkedHours > estimatedHours;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">⏱️</span> Pontaj & Raportare - <span className="text-primary-400">{estimate.estimateNumber}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </header>

                <main className="flex-grow p-6 overflow-y-auto space-y-8">
                    
                    {/* Progress Bar */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">Timp Estimat: <strong className="text-white">{estimatedHours.toFixed(1)} ore</strong></span>
                            <span className={`${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>Lucrat: <strong>{totalWorkedHours.toFixed(1)} ore</strong></span>
                        </div>
                        <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`} 
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Live Timer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center ${activeLogId ? 'bg-green-900/20 border-green-500/50' : 'bg-gray-800/30 border-gray-700'}`}>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Cronometru Live</h4>
                            <div className="font-mono text-5xl font-bold text-white mb-6">
                                {formatTime(elapsedSeconds)}
                            </div>
                            
                            {activeLogId ? (
                                <div className="w-full space-y-4">
                                    <p className="text-center text-green-400 animate-pulse">● Înregistrare activă...</p>
                                    <button onClick={handleStopTimer} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg">STOP</button>
                                </div>
                            ) : (
                                <div className="w-full space-y-4">
                                    <select 
                                        value={selectedMechanic} 
                                        onChange={e => setSelectedMechanic(e.target.value)} 
                                        className="w-full p-2 futuristic-select"
                                    >
                                        <option value="" disabled>Selectează Mecanic</option>
                                        {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <button onClick={handleStartTimer} disabled={!selectedMechanic} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">START</button>
                                </div>
                            )}
                        </div>

                        {/* Manual Entry */}
                        <div className="p-6 rounded-xl border border-gray-700 bg-gray-800/30">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Adăugare Manuală</h4>
                            <form onSubmit={handleAddManual} className="space-y-3">
                                <select value={manualMechanic} onChange={e => setManualMechanic(e.target.value)} className="w-full p-2 futuristic-select text-sm">
                                    {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full p-2 futuristic-input text-sm" />
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500">Ore</label>
                                        <input type="number" min="0" value={manualHours} onChange={e => setManualHours(Number(e.target.value))} className="w-full p-2 futuristic-input text-sm" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500">Minute</label>
                                        <input type="number" min="0" max="59" value={manualMinutes} onChange={e => setManualMinutes(Number(e.target.value))} className="w-full p-2 futuristic-input text-sm" />
                                    </div>
                                </div>
                                <input type="text" placeholder="Descriere activitate..." value={manualNotes} onChange={e => setManualNotes(e.target.value)} className="w-full p-2 futuristic-input text-sm" />
                                <button type="submit" className="w-full py-2 bg-blue-600/50 border border-blue-500/50 hover:bg-blue-600/80 text-blue-100 font-bold rounded text-sm">Adaugă Intrare</button>
                            </form>
                        </div>
                    </div>

                    {/* History Log */}
                    <div>
                        <h4 className="text-lg font-bold text-white mb-3 border-b border-gray-700 pb-2">Istoric Pontaj</h4>
                        <div className="bg-gray-950/50 rounded-lg border border-gray-800 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Mecanic</th>
                                        <th className="p-3">Dată / Oră</th>
                                        <th className="p-3">Notițe</th>
                                        <th className="p-3 text-right">Durată</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {currentLogs.slice().reverse().map(log => (
                                        <tr key={log.id} className="hover:bg-gray-800/50">
                                            <td className="p-3 font-medium text-white">{log.mechanicName}</td>
                                            <td className="p-3 text-gray-400">
                                                {new Date(log.startTime).toLocaleDateString()} 
                                                <span className="text-xs ml-1 opacity-70">{new Date(log.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </td>
                                            <td className="p-3 text-gray-300 italic">{log.notes} {log.isManual && <span className="text-[10px] bg-gray-700 px-1 rounded ml-1">Manual</span>}</td>
                                            <td className="p-3 text-right font-mono font-bold text-primary-400">
                                                {log.endTime ? formatDuration(log.durationMinutes) : <span className="text-green-500 animate-pulse">Activ...</span>}
                                            </td>
                                            <td className="p-3 text-right">
                                                {!activeLogId || activeLogId !== log.id ? (
                                                    <button onClick={() => handleDeleteLog(log.id)} className="text-red-500 hover:text-red-400 hover:bg-red-900/30 p-1 rounded">×</button>
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))}
                                    {currentLogs.length === 0 && (
                                        <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nu există înregistrări de timp.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
};

export default TimeTrackingModal;
