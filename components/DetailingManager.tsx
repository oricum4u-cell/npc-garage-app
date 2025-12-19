import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { DetailingJob, Estimate, EstimateStatus, DetailingService } from '../types.ts';
import { useGarage } from '../contexts/GarageContext.tsx';
import { GoogleGenAI, Type } from "@google/genai";

// Initial Mock Data
const INITIAL_DETAILING_JOBS: DetailingJob[] = [
    { id: 'det-1', clientName: 'Andrei Pop', motorcycle: 'BMW R1250GS', package: 'Spălare Detaliată + Degresare', status: 'IN_PROGRESS', date: new Date().toISOString().split('T')[0] },
];

const INITIAL_SERVICES: DetailingService[] = [
    { id: 'svc-1', name: "Spălare Standard", price: 50, description: "Curățare exterioară de bază" },
    { id: 'svc-2', name: "Spălare Detaliată + Degresare", price: 150, description: "Curățare în profunzime, degresare lanț și motor" },
    { id: 'svc-3', name: "Polish Vopsea (Corecție)", price: 400, description: "Eliminare zgârieturi fine și redare luciu" },
    { id: 'svc-4', name: "Ceramic Coating (Protecție)", price: 800, description: "Protecție ceramică 2 ani pentru carene și rezervor" },
    { id: 'svc-5', name: "Curățare & Ungere Lanț", price: 60, description: "Degresare completă și lubrifiere lanț" },
    { id: 'svc-6', name: "Restaurare Plastice", price: 100, description: "Tratament pentru plasticele decolorate" },
];

const HudPanel: React.FC<{ title: string, children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`relative w-full p-6 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl shadow-2xl shadow-primary-900/50 ${className}`}>
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl"></div>
        <h2 className="text-xl font-bold text-white mb-6 border-b-2 border-primary-500/20 pb-4">{title}</h2>
        {children}
    </div>
);

interface DetailingManagerProps {
    estimates: Estimate[];
    setEstimates: React.Dispatch<React.SetStateAction<Estimate[]>>;
    showNotification: (message: string, type?: string) => void;
}

const DetailingManager: React.FC<DetailingManagerProps> = ({ estimates, setEstimates, showNotification }) => {
    const { t } = useLanguage();
    const { garageInfo } = useGarage();
    
    // Main Data State for Detailing Jobs (Still local as it is specific to this module)
    const [jobs, setJobs] = useLocalStorage<DetailingJob[]>('garage-detailing-jobs', INITIAL_DETAILING_JOBS);
    const [availableServices, setAvailableServices] = useLocalStorage<DetailingService[]>('garage-detailing-services-v2', INITIAL_SERVICES);

    // Form State
    const [newJob, setNewJob] = useState<Partial<DetailingJob>>({ clientName: '', motorcycle: '', package: '', status: 'PENDING' });
    
    // Service Management State
    const [isServiceManagerOpen, setIsServiceManagerOpen] = useState(false);
    const [newService, setNewService] = useState<Partial<DetailingService>>({ name: '', price: 0, description: '' });
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // --- AI Service Generation ---
    const handleGenerateAiServices = async () => {
        // FIX: Initialize Gemini API with API key from environment variables as per guidelines.
        if (!process.env.API_KEY) {
            alert("Cheia API pentru serviciul AI nu este configurată.");
            return;
        }

        setIsAiLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const currentNames = availableServices.map(s => s.name).join(', ');
            const prompt = `Ești un expert în detailing moto. Generează o listă cu 3 servicii de detailing moderne și atractive pentru clienți, diferite de acestea: ${currentNames}. 
            Pentru fiecare serviciu, oferă un nume, un preț estimativ în RON și o scurtă descriere.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { 
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                price: { type: Type.NUMBER },
                                description: { type: Type.STRING }
                            },
                            required: ["name", "price", "description"]
                        }
                    }
                }
            });

            const suggestions = JSON.parse(response.text || "[]") as Omit<DetailingService, 'id'>[];
            if (suggestions && Array.isArray(suggestions)) {
                const newServicesWithIds = suggestions.map(s => ({ ...s, id: `svc-${Date.now()}-${Math.random()}` }));
                setAvailableServices(prev => [...prev, ...newServicesWithIds]);
            }
        } catch (error) {
            console.error("AI Error:", error);
            alert("Eroare la generarea serviciilor AI.");
        } finally {
            setIsAiLoading(false);
        }
    };

    // --- Job Management ---
    const handleAddJob = (e: React.FormEvent) => {
        e.preventDefault();
        if (newJob.clientName && newJob.motorcycle && newJob.package) {
            const job: DetailingJob = {
                id: `det-${Date.now()}`,
                clientName: newJob.clientName,
                motorcycle: newJob.motorcycle,
                package: newJob.package,
                status: 'PENDING',
                date: new Date().toISOString().split('T')[0],
                notes: ''
            };
            setJobs([...jobs, job]);
            setNewJob({ clientName: '', motorcycle: '', package: '', status: 'PENDING' });
        }
    };

    const createEstimateFromJob = (job: DetailingJob) => {
        // Robust ID generation logic
        let nextSequenceNumber = garageInfo.estimateNumberStart || 1;

        if (estimates && estimates.length > 0) {
            const existingNumbers = estimates.map(e => {
                // Extract only digits from the estimate number string
                const numStr = e.estimateNumber.replace(/\D/g, ''); 
                const parsed = parseInt(numStr, 10);
                return isNaN(parsed) ? 0 : parsed;
            });

            if (existingNumbers.length > 0) {
                nextSequenceNumber = Math.max(...existingNumbers) + 1;
            }
        }
        
        // Fallback safety
        if (isNaN(nextSequenceNumber) || nextSequenceNumber <= 0) {
            nextSequenceNumber = 1;
        }

        const estimateNumber = `${garageInfo.estimateNumberPrefix}${nextSequenceNumber.toString().padStart(4, '0')}`;
        
        // Find the service details to get the price
        const serviceDetails = availableServices.find(s => s.name === job.package);
        const price = serviceDetails ? serviceDetails.price : 0;
        const description = serviceDetails ? serviceDetails.description : 'Serviciu Detailing';

        const newEstimate: Estimate = {
            id: `est-${Date.now()}`,
            estimateNumber,
            date: new Date().toISOString().split('T')[0],
            customerName: job.clientName,
            customerPhone: '', // Not available in detailing job, would need to be added
            customerEmail: '',
            motorcycleMake: job.motorcycle.split(' ')[0] || 'Unknown',
            motorcycleModel: job.motorcycle.split(' ').slice(1).join(' ') || 'Unknown',
            motorcycleYear: new Date().getFullYear(),
            motorcycleVin: '',
            services: `Lucrare Detailing Moto: ${job.package}`,
            parts: [],
            labor: [{
                id: `l-${Date.now()}`,
                description: `${job.package} - ${description}`,
                hours: 1,
                rate: price, // Set rate as the total price
                observations: 'Generat automat din modulul Detailing'
            }],
            status: EstimateStatus.DRAFT,
            mechanicIds: []
        };

        setEstimates(prev => [...prev, newEstimate]);
        
        if (showNotification) {
            showNotification(`Devizul ${estimateNumber} a fost generat automat!`, 'success');
        } else {
            alert(`Deviz generat: ${estimateNumber}`);
        }
    };

    const handleStatusChange = (id: string, status: DetailingJob['status']) => {
        const job = jobs.find(j => j.id === id);
        setJobs(jobs.map(j => j.id === id ? { ...j, status } : j));

        if (status === 'COMPLETED' && job) {
            // Trigger estimate creation
            createEstimateFromJob(job);
        }
    };

    const handleDeleteJob = (id: string) => {
        if (confirm('Sigur dorești să ștergi acest job?')) {
            setJobs(jobs.filter(j => j.id !== id));
        }
    };

    // --- Service List Management ---
    const handleSaveService = () => {
        if (newService.name && newService.price) {
            if (editingServiceId) {
                // Update existing service
                setAvailableServices(prev => prev.map(s => 
                    s.id === editingServiceId 
                    ? { ...s, name: newService.name!, price: Number(newService.price), description: newService.description || '' } 
                    : s
                ));
                setEditingServiceId(null);
            } else {
                // Add new service
                const serviceToAdd: DetailingService = {
                    id: `svc-${Date.now()}`,
                    name: newService.name,
                    price: Number(newService.price),
                    description: newService.description || ''
                };
                setAvailableServices([...availableServices, serviceToAdd]);
            }
            setNewService({ name: '', price: 0, description: '' });
        }
    };

    const handleEditService = (service: DetailingService) => {
        setNewService({ name: service.name, price: service.price, description: service.description });
        setEditingServiceId(service.id);
        setIsServiceManagerOpen(true);
    };

    const handleCancelEdit = () => {
        setNewService({ name: '', price: 0, description: '' });
        setEditingServiceId(null);
    }

    const handleDeleteService = (id: string) => {
        if (confirm('Sigur dorești să ștergi acest serviciu?')) {
            setAvailableServices(availableServices.filter(s => s.id !== id));
            if (editingServiceId === id) handleCancelEdit();
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'PENDING': return 'border-amber-500 text-amber-400';
            case 'IN_PROGRESS': return 'border-blue-500 text-blue-400';
            case 'COMPLETED': return 'border-green-500 text-green-400';
            default: return 'border-gray-500 text-gray-400';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Studio Detailing Moto</h1>
                <button 
                    onClick={() => setIsServiceManagerOpen(!isServiceManagerOpen)}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 flex items-center gap-2"
                >
                    ⚙️ Gestionează Prețuri & Servicii
                </button>
            </div>

            {isServiceManagerOpen && (
                <div className="bg-gray-900/90 border border-primary-500/30 p-6 rounded-xl mb-6 animate-slide-in-top shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-4">{editingServiceId ? 'Editare Serviciu' : 'Adăugare Serviciu Nou'}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">Denumire Serviciu</label>
                            <input 
                                type="text" 
                                value={newService.name} 
                                onChange={e => setNewService({...newService, name: e.target.value})} 
                                placeholder="Ex: Polish rezervor" 
                                className="w-full p-2 futuristic-input"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Preț ({garageInfo.currency})</label>
                            <input 
                                type="number" 
                                value={newService.price || ''} 
                                onChange={e => setNewService({...newService, price: Number(e.target.value)})} 
                                placeholder="0" 
                                className="w-full p-2 futuristic-input"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSaveService} className={`flex-1 text-white px-4 py-2 rounded font-bold transition-colors ${editingServiceId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
                                {editingServiceId ? 'Actualizează' : '+ Adaugă'}
                            </button>
                            {editingServiceId && (
                                <button onClick={handleCancelEdit} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded font-bold">
                                    Anulează
                                </button>
                            )}
                        </div>
                        <div className="md:col-span-4">
                            <label className="block text-xs text-gray-400 mb-1">Descriere (va apărea pe deviz)</label>
                            <input 
                                type="text" 
                                value={newService.description} 
                                onChange={e => setNewService({...newService, description: e.target.value})} 
                                placeholder="Detalii operațiune..." 
                                className="w-full p-2 futuristic-input"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end mb-4">
                         <button onClick={handleGenerateAiServices} disabled={isAiLoading} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-bold flex items-center gap-2 transition-colors">
                            {isAiLoading ? '...' : '🤖 Generează Idei Prețuri AI'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2">
                        {availableServices.map((service) => (
                            <div key={service.id} className={`bg-gray-800 p-3 rounded border flex justify-between items-center ${editingServiceId === service.id ? 'border-primary-500 bg-gray-700' : 'border-gray-700'}`}>
                                <div>
                                    <p className="font-bold text-white">{service.name}</p>
                                    <p className="text-xs text-gray-400">{service.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-green-400 font-bold mr-2">{service.price} {garageInfo.currency}</span>
                                    <button onClick={() => handleEditService(service)} className="text-blue-400 hover:text-blue-200 font-bold p-1" title="Editează">✏️</button>
                                    <button onClick={() => handleDeleteService(service.id)} className="text-red-400 hover:text-red-200 font-bold p-1" title="Șterge">×</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <HudPanel title="Job Nou Detailing">
                        <form onSubmit={handleAddJob} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Client</label>
                                <input type="text" value={newJob.clientName} onChange={e => setNewJob({...newJob, clientName: e.target.value})} className="w-full p-2 futuristic-input" required />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Motocicletă</label>
                                <input type="text" value={newJob.motorcycle} onChange={e => setNewJob({...newJob, motorcycle: e.target.value})} className="w-full p-2 futuristic-input" required />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Pachet / Servicii</label>
                                <select value={newJob.package} onChange={e => setNewJob({...newJob, package: e.target.value})} className="w-full p-2 futuristic-select" required>
                                    <option value="">-- Selectează --</option>
                                    {availableServices.map(s => <option key={s.id} value={s.name}>{s.name} - {s.price} {garageInfo.currency}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg mt-4 shadow-[0_0_15px_rgba(var(--color-primary-500),0.4)]">Adaugă Job</button>
                        </form>
                    </HudPanel>
                </div>

                <div className="lg:col-span-2">
                    <HudPanel title="Flux de Lucru">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map(status => (
                                <div key={status} className="bg-gray-950/30 p-3 rounded-lg border border-gray-800 min-h-[200px]">
                                    <h3 className={`font-bold text-center mb-3 pb-2 border-b border-gray-700 ${status === 'PENDING' ? 'text-amber-400' : status === 'IN_PROGRESS' ? 'text-blue-400' : 'text-green-400'}`}>
                                        {status === 'PENDING' ? 'În Așteptare' : status === 'IN_PROGRESS' ? 'În Lucru' : 'Finalizat'}
                                    </h3>
                                    <div className="space-y-3">
                                        {jobs.filter(j => j.status === status).map(job => (
                                            <div key={job.id} className={`p-3 bg-gray-900 rounded border-l-4 ${getStatusColor(job.status)} shadow-lg relative group transition-all hover:bg-gray-800`}>
                                                <p className="font-bold text-white text-sm">{job.clientName}</p>
                                                <p className="text-xs text-gray-400">{job.motorcycle}</p>
                                                <p className="text-xs text-primary-300 mt-1 font-semibold">{job.package}</p>
                                                <p className="text-[10px] text-gray-500 mt-1">{job.date}</p>
                                                
                                                <div className="mt-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1 rounded backdrop-blur-sm absolute bottom-2 right-2 left-2">
                                                    {status !== 'PENDING' && <button onClick={() => handleStatusChange(job.id, 'PENDING')} className="text-xs text-gray-300 hover:text-white px-2">⏪</button>}
                                                    
                                                    {status !== 'COMPLETED' && (
                                                        <button 
                                                            onClick={() => handleStatusChange(job.id, status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED')} 
                                                            className="text-xs text-green-400 hover:text-green-200 font-bold px-2"
                                                        >
                                                            {status === 'PENDING' ? 'Start ▶' : 'Finalizare ✅'}
                                                        </button>
                                                    )}
                                                    
                                                    <button onClick={() => handleDeleteJob(job.id)} className="text-xs text-red-400 hover:text-red-200 px-2">🗑️</button>
                                                </div>
                                            </div>
                                        ))}
                                        {jobs.filter(j => j.status === status).length === 0 && (
                                            <p className="text-center text-xs text-gray-600 italic py-4">Nimic aici</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </HudPanel>
                </div>
            </div>
        </div>
    );
};

export default DetailingManager;
