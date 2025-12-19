
import React, { useState, useMemo } from 'react';
import { ServiceRequest, ServiceRequestStatus } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';

interface ServiceRequestsViewProps {
    requests: ServiceRequest[];
    setRequests: React.Dispatch<React.SetStateAction<ServiceRequest[]>>;
    onSetAppointmentData: (data: any) => void;
    setView: (view: any) => void;
}

const ServiceRequestsView: React.FC<ServiceRequestsViewProps> = ({ requests, setRequests, onSetAppointmentData, setView }) => {
    const { t } = useLanguage();
    const [filterStatus, setFilterStatus] = useState<'ALL' | ServiceRequestStatus>('ALL');

    const filteredRequests = useMemo(() => {
        return requests.filter(req => filterStatus === 'ALL' || req.status === filterStatus)
            .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }, [requests, filterStatus]);

    const handleCreateAppointment = (request: ServiceRequest) => {
        // Update request status
        setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: ServiceRequestStatus.ACCEPTED } : r));

        const appointmentData = {
            customerName: request.clientName,
            motorcycle: `${request.motorcycleMake} ${request.motorcycleModel} (${request.motorcycleYear})`,
            description: `Cerere client: ${request.selectedServices.join(', ')}. Observații: ${request.clientObservations}`
        };

        onSetAppointmentData(appointmentData);
        setView('APPOINTMENTS');
    };

    const handleReject = (id: string) => {
        if (window.confirm('Sigur doriți să respingeți această cerere?')) {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: ServiceRequestStatus.REJECTED } : r));
        }
    };

    const handleDelete = (id: string) => {
         if (window.confirm('Sigur doriți să ștergeți definitiv această cerere?')) {
            setRequests(prev => prev.filter(r => r.id !== id));
        }
    }

    const statusColors = {
        [ServiceRequestStatus.PENDING]: 'bg-amber-900/50 text-amber-300 border-amber-700',
        [ServiceRequestStatus.ACCEPTED]: 'bg-green-900/50 text-green-300 border-green-700',
        [ServiceRequestStatus.REJECTED]: 'bg-red-900/50 text-red-300 border-red-700',
    };

    const statusLabels = {
        [ServiceRequestStatus.PENDING]: 'În Așteptare',
        [ServiceRequestStatus.ACCEPTED]: 'Acceptată',
        [ServiceRequestStatus.REJECTED]: 'Respinsă',
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">{t('nav.serviceRequests')}</h1>
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value as any)} 
                    className="p-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 focus:border-primary-500 focus:ring-primary-500"
                >
                    <option value="ALL">Toate</option>
                    <option value={ServiceRequestStatus.PENDING}>În Așteptare</option>
                    <option value={ServiceRequestStatus.ACCEPTED}>Acceptate</option>
                    <option value={ServiceRequestStatus.REJECTED}>Respinse</option>
                </select>
            </div>

            {filteredRequests.length === 0 ? (
                <div className="bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl p-10 text-center">
                    <p className="text-gray-400">Nu există cereri de service care să corespundă filtrelor.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequests.map((request) => (
                        <div key={request.id} className={`relative bg-gray-900/80 backdrop-blur-sm border-l-4 rounded-xl p-6 shadow-lg flex flex-col justify-between ${statusColors[request.status]}`}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{request.clientName}</h3>
                                        <p className="text-sm text-gray-300">{request.clientPhone}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-bold rounded uppercase border ${statusColors[request.status]}`}>
                                        {statusLabels[request.status]}
                                    </span>
                                </div>
                                
                                <div className="mb-4 space-y-1">
                                    <p className="text-sm font-semibold text-primary-300">{request.motorcycleMake} {request.motorcycleModel} ({request.motorcycleYear})</p>
                                    {request.motorcycleVin && <p className="text-xs font-mono text-gray-400">{request.motorcycleVin}</p>}
                                </div>

                                <div className="mb-4 bg-black/20 p-3 rounded text-sm">
                                    <p className="font-semibold text-gray-300 mb-1">Servicii:</p>
                                    <ul className="list-disc pl-4 text-gray-400">
                                        {request.selectedServices.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                    {request.clientObservations && (
                                        <p className="mt-2 text-gray-400 italic">"{request.clientObservations}"</p>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 text-right">{new Date(request.requestDate).toLocaleString('ro-RO')}</p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between gap-2">
                                {request.status === ServiceRequestStatus.PENDING ? (
                                    <>
                                        <button onClick={() => handleReject(request.id)} className="flex-1 bg-red-900/50 hover:bg-red-800 text-red-200 py-2 rounded font-semibold text-sm transition-colors">
                                            Respinge
                                        </button>
                                        <button onClick={() => handleCreateAppointment(request)} className="flex-1 bg-green-700 hover:bg-green-600 text-white py-2 rounded font-bold text-sm transition-colors shadow-lg shadow-green-900/20">
                                            Programează
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => handleDelete(request.id)} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 rounded text-sm transition-colors">
                                        Șterge din listă
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ServiceRequestsView;
