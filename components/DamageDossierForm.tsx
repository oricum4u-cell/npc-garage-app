
import React, { useState, useEffect, useMemo } from 'react';
import { DamageDossier, Estimate, PhotoAnnotation, DamageDossierStatus, Labor } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getAiDamageReport } from '../services/geminiService.ts';

interface DamageDossierFormProps {
    dossier: DamageDossier | null;
    onSave: (dossier: DamageDossier) => void;
    onClose: () => void;
    estimates: Estimate[];
}

const getInitialDossier = (dossiersCount: number): Omit<DamageDossier, 'id'> => ({
    dossierNumber: `DSJ-${(dossiersCount + 1).toString().padStart(4, '0')}`,
    estimateId: '',
    insuranceCompany: '',
    claimNumber: '',
    dateOfIncident: new Date().toISOString().split('T')[0],
    status: DamageDossierStatus.DRAFT,
    photoAnnotations: {},
    damageDescription: '',
});

const DamageDossierForm: React.FC<DamageDossierFormProps> = ({ dossier, onSave, onClose, estimates }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState(dossier || getInitialDossier(estimates.length));
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [newAnnotation, setNewAnnotation] = useState<{ x: number, y: number } | null>(null);
    const [annotationText, setAnnotationText] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const availableEstimates = useMemo(() => estimates.filter(e => e.inspection?.images && e.inspection.images.length > 0), [estimates]);
    const selectedEstimate = useMemo(() => estimates.find(e => e.id === formData.estimateId), [estimates, formData.estimateId]);
    const images = useMemo(() => selectedEstimate?.inspection?.images || [], [selectedEstimate]);

    useEffect(() => {
        if (images.length > 0 && !selectedImage) {
            setSelectedImage(images[0]);
        } else if (images.length === 0) {
            setSelectedImage(null);
        }
    }, [images, selectedImage]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (!selectedImage) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setNewAnnotation({ x, y });
    };

    const handleSaveAnnotation = () => {
        if (!selectedImage || !newAnnotation || !annotationText.trim()) return;
        const annotation: PhotoAnnotation = { ...newAnnotation, description: annotationText };
        setFormData(prev => ({
            ...prev,
            photoAnnotations: {
                ...prev.photoAnnotations,
                [selectedImage]: [...(prev.photoAnnotations[selectedImage] || []), annotation]
            }
        }));
        setNewAnnotation(null);
        setAnnotationText('');
    };
    
    const handleGenerateAiReport = async () => {
        if (!selectedEstimate) return;
        setIsAiLoading(true);
        try {
            const annotations = Object.values(formData.photoAnnotations).flat().map((a: PhotoAnnotation) => a.description);
            const report = await getAiDamageReport({
                parts: selectedEstimate.parts.map(p => p.name),
                labor: selectedEstimate.labor as Labor[],
                annotations
            });
            setFormData(prev => ({ ...prev, damageDescription: report }));
        } catch (error) {
            console.error(error);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: dossier?.id || `dossier-${Date.now()}` });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-6xl flex flex-col h-[95vh]" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="contents">
                    <header className="p-4 border-b border-primary-900/50 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">{dossier ? 'Editare Dosar Daună' : 'Dosar de Daună Nou'}</h3>
                    </header>
                    <main className="flex-grow p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column: Form Fields */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] items-center gap-2 sm:gap-4">
                                <label className="text-sm font-medium text-gray-300 sm:text-right" htmlFor="dossierNumber">Nr. Dosar</label>
                                <input id="dossierNumber" type="text" value={formData.dossierNumber} disabled className="w-full p-2 futuristic-input bg-gray-800" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] items-center gap-2 sm:gap-4">
                                <label className="text-sm font-medium text-gray-300 sm:text-right" htmlFor="estimateId">Deviz Asignat</label>
                                <select id="estimateId" name="estimateId" value={formData.estimateId} onChange={handleChange} required className="w-full p-2 futuristic-select"><option value="">Selectează Deviz</option>{availableEstimates.map(e => <option key={e.id} value={e.id}>{e.estimateNumber} - {e.customerName}</option>)}</select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] items-center gap-2 sm:gap-4">
                                <label className="text-sm font-medium text-gray-300 sm:text-right" htmlFor="insuranceCompany">Companie Asigurări</label>
                                <input id="insuranceCompany" type="text" name="insuranceCompany" value={formData.insuranceCompany} onChange={handleChange} required className="w-full p-2 futuristic-input" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] items-center gap-2 sm:gap-4">
                                <label className="text-sm font-medium text-gray-300 sm:text-right" htmlFor="claimNumber">Nr. Dosar Asigurare</label>
                                <input id="claimNumber" type="text" name="claimNumber" value={formData.claimNumber} onChange={handleChange} required className="w-full p-2 futuristic-input" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] items-center gap-2 sm:gap-4">
                                <label className="text-sm font-medium text-gray-300 sm:text-right" htmlFor="dateOfIncident">Data Incidentului</label>
                                <input id="dateOfIncident" type="date" name="dateOfIncident" value={formData.dateOfIncident} onChange={handleChange} required className="w-full p-2 futuristic-input" />
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] items-center gap-2 sm:gap-4">
                                <label className="text-sm font-medium text-gray-300 sm:text-right" htmlFor="status">Status</label>
                                <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full p-2 futuristic-select">{Object.values(DamageDossierStatus).map(s => <option key={s} value={s}>{t(`dossier.statusLabels.${s}`)}</option>)}</select>
                            </div>
                            <div className="pt-4">
                                <label htmlFor="damageDescription" className="block text-sm font-medium text-gray-300 mb-1">Descriere Daune (Raport)</label>
                                <textarea id="damageDescription" name="damageDescription" value={formData.damageDescription} onChange={handleChange} rows={10} className="w-full p-2 futuristic-input"></textarea>
                                <button type="button" onClick={handleGenerateAiReport} disabled={isAiLoading || !selectedEstimate} className="mt-2 bg-sky-600/50 text-sky-200 font-bold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center gap-2">
                                    {isAiLoading ? '...' : '🤖'} Generează Raport AI
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Photo Annotation */}
                        <div className="flex flex-col">
                            <div className="flex-shrink-0 flex gap-2 overflow-x-auto pb-2">
                                {images.map(img => <img key={img} src={img} onClick={() => setSelectedImage(img)} className={`w-20 h-20 object-cover rounded-md cursor-pointer border-2 ${selectedImage === img ? 'border-primary-500' : 'border-transparent'}`} />)}
                            </div>
                            <div className="flex-grow bg-gray-950/50 mt-2 rounded-lg relative">
                                {selectedImage && <img src={selectedImage} onClick={handleImageClick} className="w-full h-full object-contain cursor-crosshair" />}
                                {selectedImage && formData.photoAnnotations[selectedImage]?.map((note, i) => (
                                    <div key={i} className="absolute group" style={{ left: `${note.x}%`, top: `${note.y}%` }}>
                                        <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-white"></div>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 p-2 bg-black/80 text-white text-xs rounded-md w-max max-w-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{note.description}</div>
                                    </div>
                                ))}
                                {newAnnotation && (
                                    <div className="absolute p-2 bg-gray-800 border border-primary-500 rounded-lg shadow-lg" style={{ left: `${newAnnotation.x}%`, top: `${newAnnotation.y}%` }}>
                                        <input type="text" value={annotationText} onChange={e => setAnnotationText(e.target.value)} placeholder="Descrie dauna..." autoFocus className="p-1 futuristic-input text-sm" />
                                        <div className="flex gap-2 mt-1"><button type="button" onClick={() => setNewAnnotation(null)} className="text-xs">Anulează</button><button type="button" onClick={handleSaveAnnotation} className="text-xs text-primary-400">Salvează</button></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                    <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl"><button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">Anulează</button><button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">Salvează Dosarul</button></footer>
                </form>
            </div>
        </div>
    );
};

export default DamageDossierForm;
