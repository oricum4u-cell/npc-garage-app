import React, { useState, useMemo } from 'react';
import { DamageDossier, Estimate, DamageDossierStatus } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import DamageDossierForm from './DamageDossierForm.tsx'; 

interface DamageDossierManagerProps {
    dossiers: DamageDossier[];
    setDossiers: React.Dispatch<React.SetStateAction<DamageDossier[]>>;
    estimates: Estimate[];
    showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
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

const DamageDossierManager: React.FC<DamageDossierManagerProps> = ({ dossiers, setDossiers, estimates, showNotification }) => {
    const { t } = useLanguage();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDossier, setEditingDossier] = useState<DamageDossier | null>(null);

    const handleOpenForm = (dossier: DamageDossier | null) => {
        setEditingDossier(dossier);
        setIsFormOpen(true);
    };

    const handleSaveDossier = (dossierToSave: DamageDossier) => {
        const exists = dossiers.some(d => d.id === dossierToSave.id);
        if (exists) {
            setDossiers(prev => prev.map(d => d.id === dossierToSave.id ? dossierToSave : d));
            showNotification(t('dossier.notificationUpdated'), 'success');
        } else {
            setDossiers(prev => [...prev, dossierToSave]);
            showNotification(t('dossier.notificationAdded'), 'success');
        }
        setIsFormOpen(false);
        setEditingDossier(null);
    };

    const handleDeleteDossier = (id: string) => {
        if (window.confirm(t('dossier.confirmDelete'))) {
            setDossiers(prev => prev.filter(d => d.id !== id));
            showNotification(t('dossier.notificationDeleted'), 'info');
        }
    };

    const statusColors: Record<DamageDossierStatus, string> = {
        [DamageDossierStatus.DRAFT]: 'bg-amber-900/50 text-amber-300',
        [DamageDossierStatus.SUBMITTED]: 'bg-blue-900/50 text-blue-300',
        [DamageDossierStatus.APPROVED]: 'bg-green-900/50 text-green-300',
        [DamageDossierStatus.REJECTED]: 'bg-red-900/50 text-red-300',
    };

    // FIX: Explicitly type the Map and use useMemo for performance.
    const estimateMap = useMemo(() => new Map<string, Estimate>(estimates.map(e => [e.id, e])), [estimates]);

    return (
        <div className="space-y-6">
            {isFormOpen ? (
                 <DamageDossierForm
                    dossier={editingDossier}
                    onSave={handleSaveDossier}
                    onClose={() => setIsFormOpen(false)}
                    estimates={estimates}
                 />
            ) : (
                <HudPanel title={t('dossier.title')}>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => handleOpenForm(null)} className="bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                            {t('dossier.newDossier')}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left futuristic-table">
                            <thead>
                                <tr>
                                    <th className="p-3">{t('dossier.dossierNumber')}</th>
                                    <th className="p-3">Deviz #</th>
                                    <th className="p-3">{t('dossier.insuranceCompany')}</th>
                                    <th className="p-3">{t('dossier.status')}</th>
                                    <th className="p-3 text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dossiers.map(dossier => {
                                    const estimate = estimateMap.get(dossier.estimateId);
                                    return (
                                        <tr key={dossier.id}>
                                            <td className="p-3 font-mono text-primary-400">{dossier.dossierNumber}</td>
                                            <td className="p-3">{estimate?.estimateNumber || 'N/A'}</td>
                                            <td className="p-3 text-gray-300">{dossier.insuranceCompany}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[dossier.status]}`}>
                                                    {t(`dossier.statusLabels.${dossier.status}`)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right space-x-2">
                                                <button onClick={() => handleOpenForm(dossier)} className="text-gray-400 hover:text-amber-400">✏️</button>
                                                <button onClick={() => handleDeleteDossier(dossier.id)} className="text-gray-400 hover:text-red-400">🗑️</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {dossiers.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <p>{t('dossier.noDossiers')}</p>
                            </div>
                        )}
                    </div>
                </HudPanel>
            )}
        </div>
    );
};

export default DamageDossierManager;