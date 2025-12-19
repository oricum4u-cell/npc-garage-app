
import React, { useState, useMemo } from 'react';
import { Estimate, EstimateStatus, Promotion, ChecklistItemStatus, Mechanic, Payment, RepairLogEntry } from '../types.ts';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getStatusKey, getChecklistItemStatusKey } from '../utils/translationHelpers.ts';
import { STATUS_COLORS } from '../constants.ts';
import { getAiClientSummary, getAiReadyForPickupSms, getAiFollowUpSms } from '../services/geminiService.ts';
import QRCodeGenerator from './QRCodeGenerator.tsx';
import Logo from './Logo.tsx';
import MarkdownRenderer from './MarkdownRenderer.tsx';
import MessageModal from './MessageModal.tsx';
import LiveRepairLogModal from './LiveRepairLogModal.tsx';
import ClientBadge from './ClientBadge.tsx';
import TimeTrackingModal from './TimeTrackingModal.tsx';

declare const html2canvas: any;
declare const jspdf: any;

interface EstimateDetailViewProps {
    estimate: Estimate;
    onBack: () => void;
    onEdit: (id: string) => void;
    onUpdateEstimate: (estimate: Estimate) => void;
    promotions: Promotion[];
    setView: (view: any) => void;
    mechanics: Mechanic[];
    showNotification?: (message: string, type?: string) => void;
}


const EstimateDetailView: React.FC<EstimateDetailViewProps> = ({ estimate, onBack, onEdit, onUpdateEstimate, promotions, setView, mechanics, showNotification }) => {
    const { garageInfo } = useGarage();
    const { t, language } = useLanguage();
    const [isPrinting, setIsPrinting] = useState(false);
    const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageContent, setMessageContent] = useState('');
    const [messageTitle, setMessageTitle] = useState('');
    const [isMessageLoading, setIsMessageLoading] = useState(false);
    const [isLiveLogOpen, setIsLiveLogOpen] = useState(false);
    const [isTimeTrackingOpen, setIsTimeTrackingOpen] = useState(false);

    const mechanicMap = useMemo(() => new Map(mechanics.map(m => [m.id, m.name])), [mechanics]);
    const promotion = useMemo(() => promotions.find(p => p.id === estimate.promotionId), [promotions, estimate.promotionId]);

    const { subtotalParts, subtotalLabor, partsDiscountAmount, laborDiscountAmount, total, totalPaid, remainingToPay } = useMemo(() => {
        const sp = estimate.parts.reduce((sum, part) => sum + (part.price * part.quantity), 0);
        const sl = estimate.labor.reduce((sum, l) => sum + (l.rate * l.hours), 0);
        const pda = sp * (estimate.partsDiscount || 0) / 100;
        const lda = sl * (estimate.laborDiscount || 0) / 100;
        const t = (sp - pda) + (sl - lda);
        const tp = estimate.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        const rtp = t - tp;
        return { subtotalParts: sp, subtotalLabor: sl, partsDiscountAmount: pda, laborDiscountAmount: lda, total: t, totalPaid: tp, remainingToPay: rtp };
    }, [estimate]);
    
    const formatCurrency = (value: number) => {
        const locale = language === 'en' ? 'en-US' : 'ro-RO';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: garageInfo.currency }).format(value);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('printable-content');
        if (!printContent) return;
    
        setIsPrinting(true);
        const { jsPDF } = jspdf;
    
        const isDarkMode = document.body.classList.contains('dark');
        if (isDarkMode) {
            document.body.classList.remove('dark');
        }
    
        setTimeout(() => {
            html2canvas(printContent, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
            .then((canvas: any) => {
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
                
                pdf.save(`deviz-${estimate.estimateNumber}.pdf`);
            })
            .catch(err => {
                console.error("PDF generation failed:", err);
                showNotification?.('A apărut o eroare la generarea PDF-ului.', 'error');
            })
            .finally(() => {
                setIsPrinting(false);
                if (isDarkMode) {
                    document.body.classList.add('dark');
                }
            });
        }, 100);
    };

    const handleCreateJobKit = () => {
        localStorage.setItem('kit-from-estimate', estimate.id);
        setView('PRICING');
    };

    const handleGenerateAiSummary = async () => {
        setIsAiSummaryLoading(true);
        setAiSummary('');
        try {
            const summary = await getAiClientSummary(estimate, garageInfo.name);
            setAiSummary(summary);
        } catch (error) {
            setAiSummary(error instanceof Error ? error.message : "A apărut o eroare.");
        } finally {
            setIsAiSummaryLoading(false);
        }
    };
    
    const publicStatusUrl = `${window.location.origin}${window.location.pathname}?view=public&id=${estimate.id}`;


    const ChecklistStatus: React.FC<{status: ChecklistItemStatus}> = ({status}) => {
        const styles = {
            OK: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
            ATTENTION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
            NA: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };
        return <span className={`px-2 py-1 text-xs font-bold rounded-full ${styles[status]}`}>{t(getChecklistItemStatusKey(status))}</span>
    };
    
    const mechanicNames = useMemo(() => {
        if (!estimate.mechanicIds || estimate.mechanicIds.length === 0) return t('history.unassigned');
        return estimate.mechanicIds.map(id => mechanicMap.get(id) || 'Necunoscut').join(', ');
    }, [estimate.mechanicIds, mechanicMap, t]);

    const handleGenerateMessage = async (type: 'pickup' | 'followup') => {
        setIsMessageLoading(true);
        setMessageContent('');
        let title = '';
        let content = '';
        try {
            if (type === 'pickup') {
                title = "Notificare 'Gata de Ridicare'";
                content = await getAiReadyForPickupSms(estimate, garageInfo.name);
            } else {
                title = "Mesaj Follow-up";
                content = await getAiFollowUpSms(estimate);
            }
            setMessageTitle(title);
            setMessageContent(content);
            setIsMessageModalOpen(true);
        } catch (error) {
            showNotification?.(error instanceof Error ? error.message : "A apărut o eroare", 'error');
        } finally {
            setIsMessageLoading(false);
        }
    };

    const handleSaveLog = (log: RepairLogEntry[]) => {
        const updatedEstimate = { ...estimate, repairLog: log };
        onUpdateEstimate(updatedEstimate);
        showNotification?.("Jurnalul de reparații a fost salvat!", 'success');
    }

    const hasPhotos = (estimate.beforePhotos && estimate.beforePhotos.length > 0) || (estimate.afterPhotos && estimate.afterPhotos.length > 0);

    return (
        <div className="animate-fade-in">
            {isTimeTrackingOpen && <TimeTrackingModal estimate={estimate} mechanics={mechanics} onClose={() => setIsTimeTrackingOpen(false)} />}
            {isLiveLogOpen && <LiveRepairLogModal estimate={estimate} onSave={handleSaveLog} onClose={() => setIsLiveLogOpen(false)} />}
            {isMessageModalOpen && <MessageModal title={messageTitle} content={messageContent} phoneNumber={estimate.customerPhone} onClose={() => setIsMessageModalOpen(false)} />}
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('estimateDetail.title')} <span className="text-primary-500">{estimate.estimateNumber}</span></h1>
                    <p className="text-gray-500 dark:text-gray-400">{new Date(estimate.date).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={onBack} className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-lg">&larr; {t('estimateDetail.back')}</button>
                    <button onClick={() => onEdit(estimate.id)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg">{t('estimateDetail.edit')}</button>
                    <button onClick={handlePrint} disabled={isPrinting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">{isPrinting ? t('history.printing') : t('estimateDetail.print')}</button>
                </div>
            </div>

            <div id="printable-content" className="p-4 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg space-y-8 print:shadow-none print:p-0">
                <header className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-gray-200 dark:border-gray-700">
                     <div className="flex items-center gap-4">
                        <Logo className="w-20 h-20 hidden sm:block print:block" />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{garageInfo.name}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{garageInfo.address}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Tel: {garageInfo.phone} | Email: {garageInfo.email}</p>
                        </div>
                    </div>
                    <div className="text-left sm:text-right mt-4 sm:mt-0">
                        <h2 className="text-3xl font-bold text-gray-700 dark:text-gray-300">{t('estimateDetail.title')}</h2>
                        <p className="font-mono text-lg">{estimate.estimateNumber}</p>
                        <p className="text-sm">{new Date(estimate.date).toLocaleDateString(language)}</p>
                    </div>
                </header>
                
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('estimateForm.customerDetails')}</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-gray-600 dark:text-gray-300">{estimate.customerName}</p>
                            <ClientBadge clientPhone={estimate.customerPhone} />
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">{estimate.customerPhone}</p>
                        <p className="text-gray-600 dark:text-gray-300">{estimate.customerEmail}</p>
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('estimateForm.motorcycleDetails')}</h3>
                        <p className="text-gray-600 dark:text-gray-300">{estimate.motorcycleMake} {estimate.motorcycleModel} ({estimate.motorcycleYear})</p>
                        <p className="font-mono text-sm text-gray-500 dark:text-gray-400">{estimate.motorcycleVin}</p>
                        <p className="text-gray-600 dark:text-gray-300">{t('history.mileage')} {estimate.mileageIn?.toLocaleString(language) ?? 'N/A'}</p>
                    </div>
                </section>
                
                {estimate.inspection && (
                    <section>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b-2 border-primary-500/30">{t('estimateDetail.checkinInspection')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div><h4 className="font-semibold text-gray-700 dark:text-gray-200">{t('estimateForm.clientObservations')}</h4><p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">{estimate.inspection.clientObservations || 'N/A'}</p></div>
                                <div><h4 className="font-semibold text-gray-700 dark:text-gray-200">{t('estimateForm.estheticState')}</h4><p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">{estimate.inspection.estheticStateNotes || 'N/A'}</p></div>
                                {estimate.inspection.images && estimate.inspection.images.length > 0 && <div><h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{t('estimateForm.uploadPhotos')}</h4><div className="flex flex-wrap gap-2">{estimate.inspection.images.map((img, i) => <img key={i} src={img} className="w-24 h-24 object-cover rounded-md border-2 border-gray-200 dark:border-gray-700"/>)}</div></div>}
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-gray-700 dark:text-gray-200">{t('estimateForm.technicalChecklist')}</h4>
                                {Object.entries(estimate.inspection.checklist).map(([key, value]) => <div key={key} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md"><span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{t(`estimateForm.checklist.${key}`)}</span><ChecklistStatus status={value} /></div>)}
                            </div>
                        </div>
                    </section>
                )}

                 <section>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">{t('estimateForm.servicesDescription')}</h3>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{estimate.services}</p>
                    </div>
                </section>

                {/* Before & After Photos Section */}
                {hasPhotos && (
                    <section className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b-2 border-primary-500/30">{t('estimateDetail.beforeAfterPhotos')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Before */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-gray-600 dark:text-gray-400 uppercase text-xs tracking-widest">{t('estimateForm.beforePhotos')}</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {estimate.beforePhotos?.map((img, i) => (
                                        <img key={i} src={img} className="w-full aspect-square object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm" />
                                    ))}
                                    {(!estimate.beforePhotos || estimate.beforePhotos.length === 0) && <p className="text-xs text-gray-400 italic">Fără poze.</p>}
                                </div>
                            </div>
                            {/* After */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-gray-600 dark:text-gray-400 uppercase text-xs tracking-widest">{t('estimateForm.afterPhotos')}</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {estimate.afterPhotos?.map((img, i) => (
                                        <img key={i} src={img} className="w-full aspect-square object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm" />
                                    ))}
                                    {(!estimate.afterPhotos || estimate.afterPhotos.length === 0) && <p className="text-xs text-gray-400 italic">Fără poze.</p>}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <section>
                    <table className="w-full text-left futuristic-table">
                        <thead>
                            <tr>
                                <th className="p-3">{t('estimateDetail.table.item')}</th>
                                <th className="p-3 text-center">{t('estimateDetail.table.qtyHours')}</th>
                                <th className="p-3 text-right">{t('estimateDetail.table.unitPrice')}</th>
                                <th className="p-3 text-right">{t('estimateDetail.table.total')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            <tr className="bg-gray-50 dark:bg-gray-700/50"><td colSpan={4} className="p-2 font-bold text-gray-700 dark:text-gray-200">{t('estimateForm.parts')}</td></tr>
                            {estimate.parts.map(p => <tr key={p.id}><td className="p-3">{p.name}{p.description && <p className="text-xs text-gray-500 dark:text-gray-400 italic">{p.description}</p>}</td><td className="p-3 text-center">{p.quantity}</td><td className="p-3 text-right">{formatCurrency(p.price)}</td><td className="p-3 text-right">{formatCurrency(p.price * p.quantity)}</td></tr>)}
                            <tr className="bg-gray-50 dark:bg-gray-700/50"><td colSpan={4} className="p-2 font-bold text-gray-700 dark:text-gray-200">{t('estimateForm.labor')}</td></tr>
                            {estimate.labor.map(l => <tr key={l.id}><td className="p-3">{l.description}{l.observations && <p className="text-xs text-gray-500 dark:text-gray-400 italic">{l.observations}</p>}</td><td className="p-3 text-center">{l.hours}</td><td className="p-3 text-right">{formatCurrency(l.rate)}</td><td className="p-3 text-right">{formatCurrency(l.rate * l.hours)}</td></tr>)}
                        </tbody>
                    </table>
                </section>

                {estimate.payments && estimate.payments.length > 0 && (
                    <section>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b-2 border-primary-500/30">{t('estimateForm.paymentsAndAdvance')}</h3>
                        <div className="space-y-2">
                            {estimate.payments.map(payment => (
                                <div key={payment.id} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-white">{formatCurrency(payment.amount)} - <span className="text-gray-600 dark:text-gray-300">{t(`estimateForm.paymentMethods.${payment.method}`)}</span></p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(payment.date).toLocaleDateString(language)} {payment.notes && `- ${payment.notes}`}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="flex flex-col md:flex-row justify-between items-start gap-8">
                    <div className="flex-grow w-full md:w-1/2 space-y-2 text-sm">
                        {promotion && <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-200"><strong>{t('promotions.title')}:</strong> {promotion.name}</div>}
                        {estimate.discountReason && !promotion && <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-200"><strong>{t('estimateForm.discountReason')}:</strong> {estimate.discountReason}</div>}
                    </div>
                    <div className="w-full md:w-1/2 space-y-1 text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between"><span>{t('estimateDetail.subtotalParts')}</span><span>{formatCurrency(subtotalParts)}</span></div>
                         {partsDiscountAmount > 0 && <div className="flex justify-between text-red-600 dark:text-red-400"><span>{t('estimateDetail.discount')} ({estimate.partsDiscount}%)</span><span>-{formatCurrency(partsDiscountAmount)}</span></div>}
                        <div className="flex justify-between"><span>{t('estimateDetail.subtotalLabor')}</span><span>{formatCurrency(subtotalLabor)}</span></div>
                        {laborDiscountAmount > 0 && <div className="flex justify-between text-red-600 dark:text-red-400"><span>{t('estimateDetail.discount')} ({estimate.laborDiscount}%)</span><span>-{formatCurrency(laborDiscountAmount)}</span></div>}
                        <div className="flex justify-between font-bold border-t border-gray-300 dark:border-gray-600 pt-1 mt-1"><span>Total Lucrare</span><span>{formatCurrency(total)}</span></div>
                        <div className="flex justify-between text-green-600 dark:text-green-400"><span>{t('estimateDetail.totalPaid')}</span><span>-{formatCurrency(totalPaid)}</span></div>
                        <div className="flex justify-between font-extrabold text-2xl text-gray-900 dark:text-white border-t-2 border-gray-400 dark:border-gray-500 pt-2 mt-2"><span>{t('estimateDetail.remainingToPay')}</span><span>{formatCurrency(remainingToPay)}</span></div>
                    </div>
                </section>
                
                <footer className="pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 print:block">
                     <p className="font-bold">{t('settings.defaultTerms')}</p>
                    <p className="whitespace-pre-wrap">{garageInfo.termsAndConditions}</p>
                    <div className="mt-4">
                        <strong>{t('history.mechanic')}: </strong>{mechanicNames}
                    </div>
                </footer>
                
                <div className="hidden print:flex justify-center pt-8">
                    <QRCodeGenerator value={publicStatusUrl} size={80} />
                </div>
            </div>
             
             {estimate.repairLog && estimate.repairLog.length > 0 && (
                <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg space-y-4">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Jurnal de Reparații</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {estimate.repairLog.map((entry, index) => (
                            <div key={index} className="flex gap-4 items-start">
                                <div className="text-xs text-center text-gray-500 dark:text-gray-400 flex-shrink-0 w-20">
                                    <p>{new Date(entry.timestamp).toLocaleDateString()}</p>
                                    <p className="font-bold">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                                </div>
                                <div className="flex-grow bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
                                    {entry.type === 'text' ? (
                                        <p className="text-sm text-gray-800 dark:text-gray-200 italic">"{entry.content}"</p>
                                    ) : (
                                        <img src={entry.content} alt="Repair log" className="max-w-xs rounded-md" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             )}


             <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg space-y-4 non-printable">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{t('estimateDetail.tools')}</h3>
                <div className="flex flex-wrap gap-4">
                    {estimate.status === 'DRAFT' && (
                        <>
                            <button onClick={() => setIsTimeTrackingOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                ⏱️ Pontaj
                            </button>
                            <button onClick={() => setIsLiveLogOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                🔴 Pornește Jurnal Live
                            </button>
                        </>
                    )}
                    <button onClick={handleGenerateAiSummary} disabled={isAiSummaryLoading} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">{isAiSummaryLoading ? '...' : '🤖'} {t('estimateDetail.aiSummary')}</button>
                    <button onClick={handleCreateJobKit} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">🛠️ {t('estimateDetail.createJobKit')}</button>
                    {estimate.status === EstimateStatus.AWAITING_PAYMENT && (
                        <button onClick={() => handleGenerateMessage('pickup')} disabled={isMessageLoading} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                            {isMessageLoading ? '...' : '💬'} Notificare Ridicare
                        </button>
                    )}
                    {estimate.status === EstimateStatus.COMPLETED && (
                        <button onClick={() => handleGenerateMessage('followup')} disabled={isMessageLoading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                            {isMessageLoading ? '...' : '💬'} Mesaj Follow-up
                        </button>
                    )}
                </div>
                {aiSummary && <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mt-4"><MarkdownRenderer content={aiSummary} /></div>}
            </div>
        </div>
    );
};

export default EstimateDetailView;
