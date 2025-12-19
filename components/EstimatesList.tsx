
import React, { useState, useMemo } from 'react';
import { Estimate, EstimateStatus } from '../types.ts';
import { STATUS_COLORS } from '../constants.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getStatusKey } from '../utils/translationHelpers.ts';
import ClientBadge from './ClientBadge.tsx';

interface EstimatesListProps {
    estimates: Estimate[];
    onViewEstimate: (id: string) => void;
    onEditEstimate: (id: string) => void;
    onDeleteEstimate: (id: string) => void;
    setView: (view: any) => void;
    onUpdateStatus: (estimateId: string, newStatus: EstimateStatus) => void;
}

const EstimatesList: React.FC<EstimatesListProps> = ({ estimates, onViewEstimate, onEditEstimate, onDeleteEstimate, setView, onUpdateStatus }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Estimate; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const { t } = useLanguage();
    const [statusFilter, setStatusFilter] = useState<'ALL' | EstimateStatus>('ALL');
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

    const getTitle = () => {
        if (viewMode === 'board') return t('estimatesList.title');
        switch (statusFilter) {
            case EstimateStatus.DRAFT: return t('estimatesList.titleInProgress');
            case EstimateStatus.AWAITING_PAYMENT: return t('estimatesList.titleAwaitingPayment');
            case EstimateStatus.COMPLETED: return t('estimatesList.titleCompleted');
            default: return t('estimatesList.title');
        }
    };

    const sortedEstimates = useMemo(() => {
        let sortableItems = [...estimates];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key]; const bValue = b[sortConfig.key];
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [estimates, sortConfig]);

    const filteredEstimates = useMemo(() => {
        let items = sortedEstimates;
        if (viewMode === 'list' && statusFilter !== 'ALL') {
            items = items.filter(e => e.status === statusFilter);
        }
        return items.filter(e =>
            e.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.motorcycleMake.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.motorcycleModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sortedEstimates, searchTerm, statusFilter, viewMode]);

    const requestSort = (key: keyof Estimate) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const handleConfirmDelete = (id: string) => {
        if (window.confirm(t('estimatesList.confirmDelete'))) onDeleteEstimate(id);
    };

    const getSortIndicator = (key: keyof Estimate) => {
        if (sortConfig.key !== key) return '↕';
        if (sortConfig.direction === 'asc') return '↑';
        return '↓';
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, estimateId: string) => {
        e.dataTransfer.setData("estimateId", estimateId);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: EstimateStatus) => {
        e.preventDefault();
        const estimateId = e.dataTransfer.getData("estimateId");
        if (estimateId) {
            const estimate = estimates.find(e => e.id === estimateId);
            if (estimate && estimate.status !== newStatus) {
                onUpdateStatus(estimateId, newStatus);
            }
        }
        e.currentTarget.classList.remove('bg-primary-900/40');
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-primary-900/40');
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('bg-primary-900/40');
    };


    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{getTitle()}</h2>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="p-1 bg-gray-200 dark:bg-gray-900 rounded-lg flex items-center">
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'}`}>{t('estimatesList.listView')}</button>
                        <button onClick={() => setViewMode('board')} className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${viewMode === 'board' ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'}`}>{t('estimatesList.boardView')}</button>
                    </div>
                    <input type="text" placeholder={t('estimatesList.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-48 px-4 py-2 futuristic-input" />
                    <button onClick={() => setView('ESTIMATE_NEW')} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg flex-shrink-0">{t('estimatesList.newEstimate')}</button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <>
                    <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700 mb-4">
                        {(['ALL', ...Object.values(EstimateStatus)] as const).map(status => (
                            <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${statusFilter === status ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                                {t(status === 'ALL' ? 'estimatesList.filterAll' : getStatusKey(status))}
                            </button>
                        ))}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left futuristic-table">
                            <thead className="hidden md:table-header-group"><tr><th className="p-3 cursor-pointer" onClick={() => requestSort('estimateNumber')}>{t('estimatesList.headerNumber')} <span className="text-gray-400">{getSortIndicator('estimateNumber')}</span></th><th className="p-3 cursor-pointer" onClick={() => requestSort('customerName')}>{t('estimatesList.headerClient')} <span className="text-gray-400">{getSortIndicator('customerName')}</span></th><th className="p-3">{t('estimatesList.headerMotorcycle')}</th><th className="p-3 cursor-pointer" onClick={() => requestSort('date')}>{t('estimatesList.headerDate')} <span className="text-gray-400">{getSortIndicator('date')}</span></th><th className="p-3 cursor-pointer" onClick={() => requestSort('status')}>{t('estimatesList.headerStatus')} <span className="text-gray-400">{getSortIndicator('status')}</span></th><th className="p-3 text-right">{t('estimatesList.headerActions')}</th></tr></thead>
                            <tbody className="block md:table-row-group">
                                {filteredEstimates.map((estimate, index) => (
                                    <tr key={estimate.id} className="block mb-4 p-4 md:p-0 md:table-row rounded-lg md:rounded-none bg-gray-900 md:bg-transparent shadow-md md:shadow-none animate-fade-in border-b-2 md:border-b border-gray-700">
                                        <td className="block md:table-cell text-right md:text-left border-b md:border-none border-gray-700 p-2 md:p-3"><span className="font-bold text-gray-400 md:hidden float-left">{t('estimatesList.headerNumber')}: </span>{estimate.estimateNumber}</td>
                                        <td className="block md:table-cell text-right md:text-left border-b md:border-none border-gray-700 p-2 md:p-3">
                                            <span className="font-bold text-gray-400 md:hidden float-left">{t('estimatesList.headerClient')}: </span>
                                            <div className="flex items-center gap-2 justify-end md:justify-start">
                                                {estimate.customerName}
                                                <ClientBadge clientPhone={estimate.customerPhone} />
                                            </div>
                                        </td>
                                        <td className="block md:table-cell text-right md:text-left border-b md:border-none border-gray-700 p-2 md:p-3"><span className="font-bold text-gray-400 md:hidden float-left">{t('estimatesList.headerMotorcycle')}: </span>{`${estimate.motorcycleMake} ${estimate.motorcycleModel}`}</td>
                                        <td className="block md:table-cell text-right md:text-left border-b md:border-none border-gray-700 p-2 md:p-3"><span className="font-bold text-gray-400 md:hidden float-left">{t('estimatesList.headerDate')}: </span>{new Date(estimate.date).toLocaleDateString('ro-RO')}</td>
                                        <td className="block md:table-cell text-right md:text-left border-b md:border-none border-gray-700 p-2 md:p-3"><span className="font-bold text-gray-400 md:hidden float-left">{t('estimatesList.headerStatus')}: </span><span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${STATUS_COLORS[estimate.status]}`}>{t(getStatusKey(estimate.status))}</span></td>
                                        <td className="block md:table-cell text-right md:text-left p-2 md:p-3"><span className="font-bold text-gray-400 md:hidden float-left">{t('estimatesList.headerActions')}: </span><div className="flex justify-end gap-1"><button onClick={() => onViewEstimate(estimate.id)} className="p-2 rounded-full text-gray-400 hover:bg-primary-500/20 hover:text-primary-300 transition-colors" title={t('estimatesList.view')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.064 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg></button><button onClick={() => onEditEstimate(estimate.id)} className="p-2 rounded-full text-gray-400 hover:bg-amber-500/20 hover:text-amber-300 transition-colors" title={t('estimatesList.edit')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button><button onClick={() => handleConfirmDelete(estimate.id)} className="p-2 rounded-full text-gray-400 hover:bg-red-500/20 hover:text-red-300 transition-colors" title={t('estimatesList.delete')}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredEstimates.length === 0 && (<div className="text-center py-10 text-gray-500 dark:text-gray-400"><p>{t('estimatesList.noEstimatesFound')}</p></div>)}
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[60vh]">
                    {Object.values(EstimateStatus).map(status => (
                        <div key={status} onDrop={(e) => handleDrop(e, status)} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className="bg-gray-100 dark:bg-gray-900/50 rounded-xl p-4 flex flex-col transition-colors duration-300">
                            <h3 className={`font-bold text-lg mb-4 text-center p-2 rounded-lg ${STATUS_COLORS[status]}`}>{t(getStatusKey(status))}</h3>
                            <div className="space-y-4 overflow-y-auto flex-grow pr-2">
                                {filteredEstimates.filter(e => e.status === status).map((estimate, index) => (
                                    <div key={estimate.id} draggable onDragStart={(e) => handleDragStart(e, estimate.id)} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:scale-105 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                        <p className="font-bold text-gray-800 dark:text-white truncate">{estimate.motorcycleMake} {estimate.motorcycleModel}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{estimate.customerName}</p>
                                            <ClientBadge clientPhone={estimate.customerPhone} />
                                        </div>
                                        <p className="text-xs text-primary-600 dark:text-primary-400 font-mono truncate mt-1">{estimate.estimateNumber}</p>
                                        <div className="mt-2 flex justify-end gap-2">
                                             <button onClick={() => onViewEstimate(estimate.id)} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" title={t('estimatesList.view')}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.064 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg></button>
                                             <button onClick={() => onEditEstimate(estimate.id)} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" title={t('estimatesList.edit')}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EstimatesList;