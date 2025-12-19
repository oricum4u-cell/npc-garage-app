
import React, { useState, useMemo } from 'react';
import { Estimate, Mechanic } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';
import Logo from './Logo.tsx';

declare const html2canvas: any;
declare const jspdf: any;

interface MotorcycleHistoryProps {
    estimates: Estimate[];
    mechanics: Mechanic[];
}

const MotorcycleHistory: React.FC<MotorcycleHistoryProps> = ({ estimates, mechanics }) => {
    const { t } = useLanguage();
    const { garageInfo } = useGarage();
    const [selection, setSelection] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);
    const [modalEstimates, setModalEstimates] = useState<Estimate[] | null>(null);
    
    const mechanicMap = useMemo(() => new Map(mechanics.map(m => [m.id, m.name])), [mechanics]);

    const { uniqueClients, uniqueMotorcycles } = useMemo(() => {
        const clients = new Map<string, { name: string; phone: string }>();
        const motorcycles = new Map<string, { make: string; model: string; year: number; vin: string }>();

        estimates.forEach(e => {
            if (e.customerPhone && e.customerName) {
                if (!clients.has(e.customerPhone)) {
                    clients.set(e.customerPhone, { name: e.customerName, phone: e.customerPhone });
                }
            }
            if (e.motorcycleVin && e.motorcycleMake) {
                if (!motorcycles.has(e.motorcycleVin)) {
                    motorcycles.set(e.motorcycleVin, {
                        make: e.motorcycleMake,
                        model: e.motorcycleModel,
                        year: e.motorcycleYear,
                        vin: e.motorcycleVin
                    });
                }
            }
        });

        return { 
            uniqueClients: Array.from(clients.values()).sort((a, b) => a.name.localeCompare(b.name)),
            uniqueMotorcycles: Array.from(motorcycles.values()).sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`))
        };
    }, [estimates]);

    const groupedEstimates = useMemo((): Record<string, Estimate[]> => {
        if (!selection) return {};
        const [type, value] = selection.split(/_(.+)/);
        let filtered: Estimate[] = [];
        if (type === 'client' && value) {
            filtered = estimates.filter(e => e.customerPhone === value);
        } else if (type === 'moto' && value) {
            filtered = estimates.filter(e => e.motorcycleVin === value);
        }
        if (filtered.length === 0) return {};
        const groups: Record<string, Estimate[]> = filtered.reduce((acc, estimate) => {
            const vin = estimate.motorcycleVin || 'unknown_vin';
            if (!acc[vin]) acc[vin] = [];
            acc[vin].push(estimate);
            return acc;
        }, {} as Record<string, Estimate[]>);
        for (const vin in groups) {
            groups[vin].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        return groups;
    }, [estimates, selection]);

    const ServiceBook = ({ estimatesForVin }: { estimatesForVin: Estimate[] }) => {
        const motorcycleDetails = estimatesForVin.length > 0 ? estimatesForVin[0] : null;
        const printId = `service-book-print-${motorcycleDetails?.motorcycleVin || 'content'}`;

        const handlePrint = () => {
            const input = document.getElementById(printId);
            if (!input) {
                console.error("Element not found:", printId);
                return;
            }
            
            setIsPrinting(true);
            const { jsPDF } = jspdf;

            // Temporarily remove dark mode for accurate PDF rendering
            const isDarkMode = document.body.classList.contains('dark');
            if (isDarkMode) {
                document.body.classList.remove('dark');
            }

            html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then((canvas: any) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / canvasHeight;
                const imgHeight = pdfWidth / ratio;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }
                
                const fileName = motorcycleDetails 
                    ? `carte-service-${motorcycleDetails.motorcycleMake}-${motorcycleDetails.motorcycleModel}.pdf`
                    : 'carte-service.pdf';
                
                pdf.save(fileName);
            })
            .catch((err: any) => {
                console.error("PDF generation failed", err);
                alert("Generarea PDF a eșuat. Verificați consola pentru detalii.");
            })
            .finally(() => {
                setIsPrinting(false);
                if (isDarkMode) {
                    document.body.classList.add('dark');
                }
            });
        };

        return (
            <div className="animate-fade-in">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">
                            {motorcycleDetails?.motorcycleMake} {motorcycleDetails?.motorcycleModel} ({motorcycleDetails?.motorcycleYear})
                        </h3>
                        <p className="font-mono text-sm text-gray-600 dark:text-gray-300 tracking-wider">{motorcycleDetails?.motorcycleVin}</p>
                    </div>
                     <button onClick={handlePrint} disabled={isPrinting} className="bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg transition-all duration-200 border-2 border-primary-500/80 hover:bg-primary-500/70 hover:border-primary-500/100 disabled:opacity-50 flex items-center gap-2">
                        {isPrinting ? t('history.printing') : t('history.print')}
                    </button>
                </div>
                
                <div className="space-y-6">
                    {estimatesForVin.map((estimate, index) => {
                         const mechanicNames = (estimate.mechanicIds || [])
                            .map(id => mechanicMap.get(id) || 'Necunoscut')
                            .join(', ');
                        return (
                        <div key={estimate.id} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-primary-500/50 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex justify-between items-start flex-wrap gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">{t('history.serviceEntry')} #{index + 1}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-300">{new Date(estimate.date).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('history.mileage')} <span className="font-bold text-lg text-gray-800 dark:text-gray-100">{estimate.mileageIn?.toLocaleString('ro-RO') ?? 'N/A'}</span></p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h5 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{t('history.servicesPerformed')}</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">{estimate.services || 'N/A'}</p>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{t('history.partsReplaced')}</h5>
                                    {estimate.parts.length > 0 ? (
                                        <ul className="space-y-1 text-sm list-disc pl-5 text-gray-600 dark:text-gray-300">
                                            {estimate.parts.map(part => <li key={part.id}>{part.name} (x{part.quantity})</li>)}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">{t('history.noPartsReplaced')}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                                <strong>{t('history.mechanic')}:</strong> {mechanicNames || t('history.unassigned')}
                                <strong className="ml-4">Deviz:</strong> {estimate.estimateNumber}
                            </div>
                        </div>
                    )})}
                </div>

                {/* Hidden Printable Area - Positioned off-screen but visible to DOM */}
                <div id={printId} className="absolute top-0 left-[-9999px] z-[-1] p-8 bg-white text-black font-sans w-[210mm]">
                    <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
                        <div className="flex items-center gap-4">
                            <Logo className="w-20 h-20" />
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-800">{garageInfo.name}</h1>
                                <p className="text-sm text-gray-600">{garageInfo.address}</p>
                                <p className="text-sm text-gray-600">Tel: {garageInfo.phone}</p>
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-500">{t('history.title')}</h2>
                    </header>
                    <div className="my-6 p-4 bg-gray-100 rounded">
                        <h3 className="font-bold text-lg text-gray-800">{motorcycleDetails?.motorcycleMake} {motorcycleDetails?.motorcycleModel} ({motorcycleDetails?.motorcycleYear})</h3>
                        <p className="font-mono text-sm text-gray-600">{motorcycleDetails?.motorcycleVin}</p>
                    </div>
                     {estimatesForVin.map((estimate, index) => {
                        const mechanicNames = (estimate.mechanicIds || [])
                            .map(id => mechanicMap.get(id) || 'Necunoscut')
                            .join(', ');
                         return (
                        <div key={estimate.id} className={`p-4 border-t border-gray-300 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-800">{new Date(estimate.date).toLocaleDateString('ro-RO')}</h4>
                                <p className="text-sm font-semibold">{t('history.mileage')} {estimate.mileageIn?.toLocaleString('ro-RO') ?? 'N/A'} km</p>
                            </div>
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <h5 className="font-semibold">{t('history.servicesPerformed')}:</h5>
                                    <p className="whitespace-pre-wrap">{estimate.services || 'N/A'}</p>
                                </div>
                                 <div>
                                    <h5 className="font-semibold">{t('history.partsReplaced')}:</h5>
                                    {estimate.parts.length > 0 ? (
                                        <ul className="list-disc pl-4">{estimate.parts.map(p => <li key={p.id}>{p.name} (x{p.quantity})</li>)}</ul>
                                    ) : (<p className="italic">{t('history.noPartsReplaced')}</p>)}
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-right">{t('history.mechanic')}: {mechanicNames || t('history.unassigned')} / Deviz: {estimate.estimateNumber}</p>
                        </div>
                     )})}
                </div>

            </div>
        )
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('history.title')}</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <select 
                        value={selection}
                        onChange={(e) => setSelection(e.target.value)}
                        className="flex-grow p-3 border rounded-lg bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">{t('history.prompt')}</option>
                        <optgroup label="Clienți">
                            {uniqueClients.map(c => <option key={c.phone} value={`client_${c.phone}`}>{c.name}</option>)}
                        </optgroup>
                        <optgroup label="Motociclete">
                            {uniqueMotorcycles.map(m => <option key={m.vin} value={`moto_${m.vin}`}>{m.make} {m.model} ({m.vin.slice(-6)})</option>)}
                        </optgroup>
                    </select>
                </div>
                
                <div className="mt-8">
                    {Object.keys(groupedEstimates).length > 0 ? (
                        <div className="space-y-4">
                           {(Object.entries(groupedEstimates) as [string, Estimate[]][]).map(([vin, estimatesForVin]) => {
                               const motorcycleDetails = estimatesForVin[0];
                               return (
                                   <div key={vin} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4 animate-fade-in-up">
                                       <div>
                                           <h4 className="font-bold text-lg text-primary-700 dark:text-primary-300">{motorcycleDetails.motorcycleMake} {motorcycleDetails.motorcycleModel} <span className="text-gray-500 font-normal">({motorcycleDetails.motorcycleYear})</span></h4>
                                           <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{motorcycleDetails.motorcycleVin}</p>
                                       </div>
                                       <button onClick={() => setModalEstimates(estimatesForVin)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex-shrink-0">
                                           {t('history.viewDetails')}
                                       </button>
                                   </div>
                               );
                           })}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-300">
                            <p>{selection ? t('history.noHistoryForVin', { vin: selection.split('_')[1] }) : t('history.prompt')}</p>
                        </div>
                    )}
                </div>
            </div>
            
            {modalEstimates && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setModalEstimates(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex-grow overflow-y-auto p-4 sm:p-8">
                            <ServiceBook estimatesForVin={modalEstimates} />
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-4 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
                            <button type="button" onClick={() => setModalEstimates(null)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg">
                                {t('recallsModal.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MotorcycleHistory;
