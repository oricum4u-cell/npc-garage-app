import React, { useState, useMemo } from 'react';
import { Mechanic, UserRole, Estimate, EstimateStatus } from '../types.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';

interface MechanicsManagerProps {
    mechanics: Mechanic[];
    setMechanics: React.Dispatch<React.SetStateAction<Mechanic[]>>;
    setIsAppLoading: (isLoading: boolean) => void;
    estimates: Estimate[]; // Adăugat pentru a calcula KPI-uri
    onSave: (mech: Mechanic) => void;
    onDelete: (id: string) => void;
}

const HudPanel: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="relative w-full p-6 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl shadow-2xl shadow-primary-900/50">
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl"></div>
        <h2 className="text-xl font-bold text-white mb-6 border-b-2 border-primary-500/20 pb-4">{title}</h2>
        {children}
    </div>
);

const MechanicsManager: React.FC<MechanicsManagerProps> = ({ mechanics, setMechanics, setIsAppLoading, estimates, onSave, onDelete }) => {
    const { garageInfo } = useGarage();
    const [formData, setFormData] = useState({
        name: '',
        specialization: '',
        experience: 'JUNIOR' as Mechanic['experience'],
    });

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim()) {
            setIsAppLoading(true);
            setTimeout(() => {
                const newMechanic: Mechanic = {
                    id: `mech-${Date.now()}`,
                    name: formData.name,
                    specialization: formData.specialization,
                    experience: formData.experience,
                };
                onSave(newMechanic);
                setFormData({ name: '', specialization: '', experience: 'JUNIOR' });
                setIsAppLoading(false);
            }, 500);
        }
    };

    const handleDeleteItem = (id: string) => {
        if (window.confirm('Sunteți sigur că doriți să ștergeți acest mecanic?')) {
            setIsAppLoading(true);
            setTimeout(() => {
                onDelete(id);
                setIsAppLoading(false);
            }, 500);
        }
    };

    const mechanicPerformance = useMemo(() => {
        const performanceData = new Map<string, { completedEstimates: number; totalRevenue: number }>();
        mechanics.forEach(m => performanceData.set(m.id, { completedEstimates: 0, totalRevenue: 0 }));

        estimates.forEach(e => {
            if (e.status === EstimateStatus.COMPLETED && e.mechanicIds && e.mechanicIds.length > 0) {
                const laborValue = e.labor.reduce((sum, l) => sum + l.hours * l.rate, 0);
                const valuePerMechanic = laborValue / e.mechanicIds.length;

                e.mechanicIds.forEach(mechId => {
                    if (performanceData.has(mechId)) {
                        const current = performanceData.get(mechId)!;
                        current.completedEstimates += 1;
                        current.totalRevenue += valuePerMechanic;
                    }
                });
            }
        });
        return performanceData;
    }, [mechanics, estimates]);

    return (
        <HudPanel title="Management Echipă Mecanici">
            <form onSubmit={handleAddItem} className="mb-8 p-4 bg-gray-950/50 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-1"><label className="block text-sm font-medium text-gray-300 mb-1">Nume Mecanic</label><input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="ex: Tiberiu Stancu" required className="w-full p-2 futuristic-input" /></div>
                <div className="md:col-span-1"><label className="block text-sm font-medium text-gray-300 mb-1">Specializare</label><input type="text" value={formData.specialization} onChange={(e) => setFormData(p => ({ ...p, specialization: e.target.value }))} placeholder="ex: Motor, Electrică" className="w-full p-2 futuristic-input" /></div>
                <div className="md:col-span-1"><label className="block text-sm font-medium text-gray-300 mb-1">Experiență</label><select value={formData.experience} onChange={(e) => setFormData(p => ({ ...p, experience: e.target.value as Mechanic['experience'] }))} className="w-full p-2 futuristic-select"><option value="JUNIOR">Junior</option><option value="SENIOR">Senior</option><option value="MASTER">Master</option></select></div>
                <button type="submit" className="w-full bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg">Adaugă Mecanic</button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mechanics.map((mechanic, index) => {
                    const performance = mechanicPerformance.get(mechanic.id) || { completedEstimates: 0, totalRevenue: 0 };
                    return (
                        <div key={mechanic.id} className="bg-gray-800/50 border border-primary-500/10 rounded-lg p-4 flex flex-col justify-between animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{mechanic.name}</h3>
                                        <p className="text-sm text-primary-400 font-semibold">{mechanic.specialization || 'General'}</p>
                                        <p className="text-xs text-gray-400 capitalize">{mechanic.experience?.toLowerCase()}</p>
                                    </div>
                                    <button onClick={() => handleDeleteItem(mechanic.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-primary-900/50 space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-300">Devize Finalizate:</span>
                                    <span className="font-bold text-white text-lg">{performance.completedEstimates}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-300">Venit Manoperă:</span>
                                    <span className="font-bold text-green-400 text-lg">{performance.totalRevenue.toFixed(0)} {garageInfo.currency}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {mechanics.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                    <p>Niciun mecanic adăugat.</p>
                </div>
            )}
        </HudPanel>
    );
};

export default MechanicsManager;