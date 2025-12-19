
import React, { useState, useEffect, useMemo } from 'react';
import { Estimate, Part, Labor, StockItem, EstimateStatus, Mechanic, PredefinedLabor, Promotion, Appointment, JobKit, Payment, InspectionData, PromotionType, LoyaltyTier } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';
import { useLoyalty } from '../contexts/LoyaltyContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getAiPriceSuggestion } from '../services/geminiService.ts';
import VINScanner from './VINScanner.tsx';
import AIPartsFinder from './AIPartsFinder.tsx';
import { getStatusKey, getLoyaltyTierNameKey } from '../utils/translationHelpers.ts';

interface EstimateFormProps {
    estimate?: Estimate;
    onSave: (estimate: Estimate) => void;
    onCancel: () => void;
    predefinedLabor: PredefinedLabor[];
    stockItems: StockItem[];
    mechanics: Mechanic[];
    estimates: Estimate[];
    promotions: Promotion[];
    appointments: Appointment[];
    jobKits: JobKit[];
}

const LaborSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    items: PredefinedLabor[];
    onSelect: (item: PredefinedLabor) => void;
    currency: string;
    title: string;
    searchPlaceholder: string;
}> = ({ isOpen, onClose, items, onSelect, currency, title, searchPlaceholder }) => {
    const [search, setSearch] = useState("");
    
    useEffect(() => {
        if (isOpen) setSearch("");
    }, [isOpen]);

    if (!isOpen) return null;
    
    const filtered = items.filter(i => i.description.toLowerCase().includes(search.toLowerCase()));
    
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-2xl bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1">✕</button>
                </div>
                <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar">
                    {filtered.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className="flex flex-col items-start p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-primary-900/20 hover:border-primary-500/50 transition-all text-left group"
                        >
                            <span className="font-bold text-white text-sm group-hover:text-primary-300">{item.description}</span>
                            <span className="text-xs text-primary-400 font-mono mt-1">{item.rate} {currency}</span>
                        </button>
                    ))}
                    {filtered.length === 0 && <p className="col-span-full text-center text-gray-500 py-8">Niciun rezultat găsit.</p>}
                </div>
            </div>
        </div>
    );
};

const EstimateForm: React.FC<EstimateFormProps> = ({
    estimate,
    onSave,
    onCancel,
    predefinedLabor,
    stockItems,
    mechanics,
    estimates,
    promotions,
    jobKits
}) => {
    const { t } = useLanguage();
    const { garageInfo } = useGarage();
    const { loyaltyConfig } = useLoyalty();
    const { users } = useAuth();
    
    // --- State ---
    const [formData, setFormData] = useState<Estimate>(() => {
        if (estimate) return { ...estimate };
        
        let nextNumber = garageInfo.estimateNumberStart || 1;
        if (estimates.length > 0) {
            const existingNumbers = estimates.map(e => {
                const numStr = e.estimateNumber.replace(/\D/g, ''); 
                const parsed = parseInt(numStr, 10);
                return isNaN(parsed) ? 0 : parsed;
            });
            if (existingNumbers.length > 0) {
                nextNumber = Math.max(...existingNumbers) + 1;
            }
        }
        if (isNaN(nextNumber)) nextNumber = 1;

        const estimateNumber = `${garageInfo.estimateNumberPrefix}${nextNumber.toString().padStart(4, '0')}`;
        
        return {
            id: `est-${Date.now()}`,
            estimateNumber,
            date: new Date().toISOString().split('T')[0],
            customerName: '',
            customerPhone: '',
            customerEmail: '',
            motorcycleMake: '',
            motorcycleModel: '',
            motorcycleYear: undefined as any, 
            motorcycleVin: '',
            mileageIn: undefined as any, 
            services: '',
            parts: [],
            labor: [],
            status: EstimateStatus.DRAFT,
            payments: [],
            partsDiscount: 0,
            laborDiscount: 0,
            mechanicIds: [],
            beforePhotos: [],
            afterPhotos: []
        };
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isVinScannerOpen, setIsVinScannerOpen] = useState(false);
    const [isAiPartsFinderOpen, setIsAiPartsFinderOpen] = useState(false);
    const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);

    const [newPayment, setNewPayment] = useState<Partial<Payment>>({
        amount: 0,
        method: 'CASH',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const [aiPriceSuggestion, setAiPriceSuggestion] = useState<{ laborIndex: number, suggestion: any, error: string } | null>(null);
    const [isAiPriceLoading, setIsAiPriceLoading] = useState(false);
    const [isAiPriceModalOpen, setIsAiPriceModalOpen] = useState(false);

    const isStaffMember = useMemo(() => {
        if (!formData.customerName) return false;
        return users.some(u => u.username.toLowerCase().trim() === formData.customerName.toLowerCase().trim());
    }, [formData.customerName, users]);

    const validateField = (name: string, value: any) => {
        let error = '';
        
        switch (name) {
            case 'customerName':
                if (!value || (typeof value === 'string' && !value.trim())) error = t('validation.required');
                break;
            case 'customerPhone':
                if (!isStaffMember && (!value || (typeof value === 'string' && !value.trim()))) {
                    error = t('validation.required');
                } else if (value && !/^[\d\+\-\(\) ]{10,}$/.test(String(value))) {
                    error = t('validation.phoneInvalid');
                }
                break;
            case 'customerEmail':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
                    error = t('validation.emailInvalid');
                }
                break;
            case 'motorcycleMake':
            case 'motorcycleModel':
                if (!value || (typeof value === 'string' && !value.trim())) error = t('validation.required');
                break;
            case 'motorcycleYear':
                if (!value) {
                    error = t('validation.required');
                } else {
                    const year = Number(value);
                    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
                        error = t('validation.yearInvalid');
                    }
                }
                break;
            case 'mileageIn':
                if (value !== undefined && value !== '' && (isNaN(Number(value)) || Number(value) < 0)) {
                    error = t('validation.numberInvalid');
                }
                break;
            default:
                break;
        }
        
        setErrors(prev => {
            const newErrors = { ...prev };
            if (error) {
                newErrors[name] = error;
            } else {
                delete newErrors[name];
            }
            return newErrors;
        });
        
        return error;
    };

    useEffect(() => {
        if (isStaffMember) {
            const staffConfig = loyaltyConfig.TIERS[LoyaltyTier.STAFF];
            setFormData(prev => ({
                ...prev,
                partsDiscount: staffConfig.partsDiscount * 100,
                laborDiscount: 100,
                discountReason: 'STAFF - Fără Manoperă'
            }));
            return;
        }

        if (formData.promotionId) return;

        if (!formData.customerPhone || formData.customerPhone.length < 3) return;

        const clientPhone = formData.customerPhone;
        const completedEstimates = estimates.filter(e => 
            e.status === EstimateStatus.COMPLETED && 
            e.customerPhone === clientPhone &&
            e.id !== formData.id
        );
        
        let totalSpent = 0;
        completedEstimates.forEach(e => {
            const estimateTotal = (e.parts.reduce((s, p) => s + p.price * p.quantity, 0) * (1 - (e.partsDiscount || 0) / 100)) + 
                                  (e.labor.reduce((s, l) => s + l.rate * l.hours, 0) * (1 - (e.laborDiscount || 0) / 100));
            totalSpent += estimateTotal;
        });

        const points = Math.floor(totalSpent * loyaltyConfig.POINTS_PER_RON);
        
        let bestTier: LoyaltyTier | null = null;
        const sortedTiers = (Object.entries(loyaltyConfig.TIERS) as [LoyaltyTier, any][])
            .filter(([t]) => t !== LoyaltyTier.STAFF) 
            .sort(([, a], [, b]) => b.points - a.points);
            
        for (const [tier, config] of sortedTiers) {
            if (points >= config.points) {
                bestTier = tier;
                break;
            }
        }

        if (bestTier) {
            const tierConfig = loyaltyConfig.TIERS[bestTier];
            const targetPartsDiscount = tierConfig.partsDiscount * 100;
            const targetLaborDiscount = tierConfig.laborDiscount * 100;

            if (formData.partsDiscount !== targetPartsDiscount || formData.laborDiscount !== targetLaborDiscount) {
                setFormData(prev => ({
                    ...prev,
                    partsDiscount: targetPartsDiscount,
                    laborDiscount: targetLaborDiscount,
                    discountReason: `${t(getLoyaltyTierNameKey(bestTier))} (${points} pct)`
                }));
            }
        }

    }, [formData.customerPhone, isStaffMember, estimates, loyaltyConfig, formData.promotionId, formData.id, t]);


    const { partsTotal, laborTotal, discountTotal, grandTotal, totalPaid, remainingBalance } = useMemo(() => {
        const pTotal = formData.parts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const lTotal = formData.labor.reduce((sum, l) => sum + (l.rate * l.hours), 0);
        
        const pDiscount = pTotal * (formData.partsDiscount || 0) / 100;
        const lDiscount = lTotal * (formData.laborDiscount || 0) / 100;
        
        const gTotal = (pTotal - pDiscount) + (lTotal - lDiscount);
        const paid = formData.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        
        return {
            partsTotal: pTotal,
            laborTotal: lTotal,
            discountTotal: pDiscount + lDiscount,
            grandTotal: gTotal,
            totalPaid: paid,
            remainingBalance: gTotal - paid
        };
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const newValue = type === 'number' ? (value === '' ? '' : parseFloat(value)) : value;
        
        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));

        if (errors[name]) {
            validateField(name, newValue);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        validateField(name, value);
    };

    const handleAddPart = () => {
        setFormData(prev => ({
            ...prev,
            parts: [...prev.parts, { id: `part-${Date.now()}`, name: '', quantity: 1, price: 0 }]
        }));
    };

    const handlePartChange = (index: number, field: keyof Part, value: any) => {
        const newParts = [...formData.parts];
        (newParts[index] as any)[field] = value;
        setFormData(prev => ({ ...prev, parts: newParts }));
    };

    const handleRemovePart = (index: number) => {
        setFormData(prev => ({ ...prev, parts: prev.parts.filter((_, i) => i !== index) }));
    };

    const handleAddPartFromStock = (stockItem: StockItem) => {
        const markup = garageInfo.defaultPartsMarkup || 30;
        const sellPrice = stockItem.price * (1 + markup / 100);
        
        setFormData(prev => ({
            ...prev,
            parts: [...prev.parts, {
                id: `part-${Date.now()}`,
                name: stockItem.name,
                quantity: 1,
                price: parseFloat(sellPrice.toFixed(2)),
                stockId: stockItem.id,
                description: stockItem.sku
            }]
        }));
    };

    const handleAddLabor = () => {
        if (isStaffMember) return;
        setFormData(prev => ({
            ...prev,
            labor: [...prev.labor, { id: `labor-${Date.now()}`, description: '', hours: 1, rate: garageInfo.defaultLaborRate }]
        }));
    };

    const handleLaborChange = (index: number, field: keyof Labor, value: any) => {
        if (isStaffMember && field === 'rate') return;
        
        const newLabor = [...formData.labor];
        (newLabor[index] as any)[field] = value;
        setFormData(prev => ({ ...prev, labor: newLabor }));
    };

    const handleRemoveLabor = (index: number) => {
        setFormData(prev => ({ ...prev, labor: prev.labor.filter((_, i) => i !== index) }));
    };

    const handleAddPredefinedLabor = (item: PredefinedLabor) => {
        if (isStaffMember) return; 

        setFormData(prev => ({
            ...prev,
            labor: [...prev.labor, {
                id: `labor-${Date.now()}`,
                description: item.description,
                hours: 1,
                rate: item.rate
            }]
        }));
        setIsLaborModalOpen(false);
    };

    const handleApplyJobKit = (kitId: string) => {
        const kit = jobKits.find(k => k.id === kitId);
        if (!kit) return;

        const newParts = kit.parts.map(p => ({
            id: `part-${Date.now()}-${Math.random()}`,
            name: p.name,
            description: p.description,
            quantity: p.quantity,
            price: p.price
        }));

        const newLabor = kit.labor.map(l => ({
            id: `labor-${Date.now()}-${Math.random()}`,
            description: l.description,
            hours: l.hours,
            rate: isStaffMember ? 0 : l.rate,
            observations: l.observations
        }));

        setFormData(prev => ({
            ...prev,
            parts: [...prev.parts, ...newParts],
            labor: [...prev.labor, ...newLabor],
            services: prev.services ? `${prev.services}\n${kit.description}` : kit.description
        }));
    };
    
    const handleApplyPromotion = (promoId: string) => {
        if (isStaffMember) return;

        if (!promoId) {
            setFormData(prev => ({
                ...prev,
                promotionId: undefined,
                partsDiscount: 0, 
                laborDiscount: 0,
                discountReason: ''
            }));
            return;
        }

        const promo = promotions.find(p => p.id === promoId);
        if (!promo) return;

        setFormData(prev => ({
            ...prev,
            promotionId: promo.id,
            partsDiscount: promo.type === PromotionType.PARTS_PERCENTAGE ? promo.value : 0,
            laborDiscount: promo.type === PromotionType.LABOR_PERCENTAGE ? promo.value : 0,
            discountReason: `Promoție: ${promo.name}`
        }));
    };

    const handleGetAiPriceSuggestion = async (laborIndex: number) => {
        const laborItem = formData.labor[laborIndex];
        if (!laborItem || !laborItem.description) return;
        
        setIsAiPriceLoading(true);
        setIsAiPriceModalOpen(true);
        setAiPriceSuggestion({ laborIndex, suggestion: null, error: '' });
        
        const workload = (estimates.filter(e => e.status === EstimateStatus.DRAFT).length / (mechanics.length || 1)) * 100;
        
        try {
            const makeStr = `${formData.motorcycleMake || ''}`;
            const modelStr = `${formData.motorcycleModel || ''}`;
            const yearVal = Number(formData.motorcycleYear);
            const yearNum = isNaN(yearVal) ? new Date().getFullYear() : yearVal;
            
            const suggestion = await getAiPriceSuggestion(
                `${laborItem.description}`, 
                { 
                    make: makeStr, 
                    model: modelStr, 
                    year: yearNum 
                }, 
                Number(workload)
            );
            setAiPriceSuggestion({ laborIndex, suggestion, error: '' });
        } catch (e) {
            setAiPriceSuggestion({ laborIndex, suggestion: null, error: e instanceof Error ? e.message : 'Eroare necunoscută.' });
        } finally {
            setIsAiPriceLoading(false);
        }
    };

    const applyAiPriceSuggestion = () => {
        if (aiPriceSuggestion && aiPriceSuggestion.suggestion) {
            const newRate = isStaffMember ? 0 : aiPriceSuggestion.suggestion.suggestedRate;
            handleLaborChange(aiPriceSuggestion.laborIndex, 'rate', newRate);
            setIsAiPriceModalOpen(false);
        }
    };

    const handleAddPayment = () => {
        if (!newPayment.amount || newPayment.amount <= 0) return;
        
        const payment: Payment = {
            id: `pay-${Date.now()}`,
            date: newPayment.date || new Date().toISOString().split('T')[0],
            amount: Number(newPayment.amount),
            method: newPayment.method as 'CASH' | 'CARD' | 'TRANSFER',
            notes: newPayment.notes
        };

        setFormData(prev => ({
            ...prev,
            payments: [...(prev.payments || []), payment]
        }));

        setNewPayment({
            amount: 0,
            method: 'CASH',
            date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const handleRemovePayment = (id: string) => {
        setFormData(prev => ({
            ...prev,
            payments: prev.payments?.filter(p => p.id !== id) || []
        }));
    };

    // --- Photo Handling ---
    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                setFormData(prev => {
                    const photos = type === 'before' ? [...(prev.beforePhotos || [])] : [...(prev.afterPhotos || [])];
                    if (photos.length < 10) { // Limit to 10 photos per type
                        photos.push(base64);
                    }
                    return type === 'before' ? { ...prev, beforePhotos: photos } : { ...prev, afterPhotos: photos };
                });
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemovePhoto = (index: number, type: 'before' | 'after') => {
        setFormData(prev => {
            const photos = type === 'before' ? [...(prev.beforePhotos || [])] : [...(prev.afterPhotos || [])];
            photos.splice(index, 1);
            return type === 'before' ? { ...prev, beforePhotos: photos } : { ...prev, afterPhotos: photos };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const fieldsToValidate = ['customerName', 'customerPhone', 'customerEmail', 'motorcycleMake', 'motorcycleModel', 'motorcycleYear'];
        let hasErrors = false;
        
        fieldsToValidate.forEach(field => {
            if (isStaffMember && (field === 'customerPhone' || field === 'customerEmail')) return;
            const error = validateField(field, (formData as any)[field]);
            if (error) hasErrors = true;
        });

        if (hasErrors) return;
        onSave(formData);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl animate-fade-in">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider">{t('estimateForm.estimateNumberLabel')}</label>
                    <div className="flex items-center gap-2 relative group">
                        <input
                            type="text"
                            name="estimateNumber"
                            value={formData.estimateNumber}
                            onChange={handleChange}
                            className="bg-transparent border-b border-primary-500/50 focus:border-primary-500 text-primary-600 dark:text-primary-400 font-mono font-bold text-lg focus:outline-none w-40 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/30 px-1 rounded"
                            title="Click pentru a edita numărul"
                        />
                        <span className="text-gray-400 opacity-50 text-xs pointer-events-none absolute right-[-20px]">✏️</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {isStaffMember && (
                        <div className="px-3 py-1 bg-primary-900/50 text-primary-300 border border-primary-500/50 rounded-lg flex items-center gap-2 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            <span className="text-xs font-bold uppercase tracking-wider">STAFF - DOAR PIESE</span>
                        </div>
                    )}
                    <select 
                        name="status" 
                        value={formData.status} 
                        onChange={handleChange} 
                        className="futuristic-select p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
                    >
                        {Object.values(EstimateStatus).map(s => <option key={s} value={s}>{t(getStatusKey(s))}</option>)}
                    </select>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
                {/* Client & Moto Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300 border-b pb-2 border-gray-200 dark:border-gray-700">{t('estimateForm.customerDetails')}</h3>
                        <div className="relative">
                            <input 
                                type="text" 
                                name="customerName" 
                                value={formData.customerName} 
                                onChange={handleChange} 
                                onBlur={handleBlur}
                                placeholder={t('estimateForm.customerNameLabel')} 
                                className={`w-full p-2 futuristic-input ${errors.customerName ? '!border-red-500' : ''} ${isStaffMember ? 'border-primary-500' : ''}`} 
                            />
                            {isStaffMember && <span className="absolute right-0 top-2 text-xs text-primary-400 font-bold">STAFF</span>}
                            {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
                        </div>
                        <div>
                            <input 
                                type="tel" 
                                name="customerPhone" 
                                value={formData.customerPhone} 
                                onChange={handleChange} 
                                onBlur={handleBlur}
                                placeholder={t('estimateForm.phoneLabel')} 
                                className={`w-full p-2 futuristic-input ${errors.customerPhone ? '!border-red-500' : ''}`} 
                            />
                            {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone}</p>}
                        </div>
                        <div>
                            <input 
                                type="email" 
                                name="customerEmail" 
                                value={formData.customerEmail} 
                                onChange={handleChange} 
                                onBlur={handleBlur}
                                placeholder={t('estimateForm.emailLabel')} 
                                className={`w-full p-2 futuristic-input ${errors.customerEmail ? '!border-red-500' : ''}`} 
                            />
                            {errors.customerEmail && <p className="text-red-500 text-xs mt-1">{errors.customerEmail}</p>}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2 border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">{t('estimateForm.motorcycleDetails')}</h3>
                            <button type="button" onClick={() => setIsVinScannerOpen(true)} className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700">Scan VIN</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <input 
                                    type="text" 
                                    name="motorcycleMake" 
                                    value={formData.motorcycleMake} 
                                    onChange={handleChange} 
                                    onBlur={handleBlur}
                                    placeholder={t('estimateForm.makeLabel')} 
                                    className={`w-full p-2 futuristic-input ${errors.motorcycleMake ? '!border-red-500' : ''}`} 
                                />
                                {errors.motorcycleMake && <p className="text-red-500 text-xs mt-1">{errors.motorcycleMake}</p>}
                            </div>
                            <div>
                                <input 
                                    type="text" 
                                    name="motorcycleModel" 
                                    value={formData.motorcycleModel} 
                                    onChange={handleChange} 
                                    onBlur={handleBlur}
                                    placeholder={t('estimateForm.modelLabel')} 
                                    className={`w-full p-2 futuristic-input ${errors.motorcycleModel ? '!border-red-500' : ''}`} 
                                />
                                {errors.motorcycleModel && <p className="text-red-500 text-xs mt-1">{errors.motorcycleModel}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <input 
                                    type="number" 
                                    name="motorcycleYear" 
                                    value={formData.motorcycleYear ?? ''} 
                                    onChange={handleChange} 
                                    onBlur={handleBlur}
                                    placeholder="An" 
                                    className={`w-full p-2 futuristic-input no-spinner ${errors.motorcycleYear ? '!border-red-500' : ''}`} 
                                />
                                {errors.motorcycleYear && <p className="text-red-500 text-xs mt-1">{errors.motorcycleYear}</p>}
                            </div>
                            <div>
                                <input 
                                    type="number" 
                                    name="mileageIn" 
                                    value={formData.mileageIn ?? ''} 
                                    onChange={handleChange} 
                                    onBlur={handleBlur}
                                    placeholder="Km" 
                                    className={`w-full p-2 futuristic-input no-spinner ${errors.mileageIn ? '!border-red-500' : ''}`} 
                                />
                                {errors.mileageIn && <p className="text-red-500 text-xs mt-1">{errors.mileageIn}</p>}
                            </div>
                        </div>
                        <input type="text" name="motorcycleVin" value={formData.motorcycleVin} onChange={handleChange} placeholder={t('estimateForm.vinLabel')} className="w-full p-2 futuristic-input font-mono" />
                    </div>
                </div>

                {/* Service Description */}
                <div>
                    <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300 mb-2">{t('estimateForm.servicesDescription')}</h3>
                    <textarea name="services" value={formData.services} onChange={handleChange} rows={3} placeholder={t('estimateForm.servicesDescriptionPlaceholder')} className="w-full p-2 futuristic-input" />
                    
                    <div className="mt-2">
                        <label className="text-sm text-gray-400 mr-2">{t('estimateForm.selectJobKit')}:</label>
                        <select onChange={(e) => handleApplyJobKit(e.target.value)} className="p-1 futuristic-select text-sm">
                            <option value="">-- Select --</option>
                            {jobKits.map(kit => <option key={kit.id} value={kit.id}>{kit.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Before and After Photos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Before Photos */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300 border-b pb-2 border-gray-200 dark:border-gray-700">{t('estimateForm.beforePhotos')}</h3>
                        <div className="flex flex-wrap gap-2">
                            {(formData.beforePhotos || []).map((photo, idx) => (
                                <div key={idx} className="relative group">
                                    <img src={photo} alt="Before" className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600" />
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemovePhoto(idx, 'before')}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {(formData.beforePhotos || []).length < 10 && (
                                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                                    <span className="text-2xl text-gray-400">+</span>
                                    <span className="text-[10px] text-gray-500 uppercase">{t('estimateForm.addPhotos')}</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'before')} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* After Photos */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300 border-b pb-2 border-gray-200 dark:border-gray-700">{t('estimateForm.afterPhotos')}</h3>
                        <div className="flex flex-wrap gap-2">
                            {(formData.afterPhotos || []).map((photo, idx) => (
                                <div key={idx} className="relative group">
                                    <img src={photo} alt="After" className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600" />
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemovePhoto(idx, 'after')}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {(formData.afterPhotos || []).length < 10 && (
                                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                                    <span className="text-2xl text-gray-400">+</span>
                                    <span className="text-[10px] text-gray-500 uppercase">{t('estimateForm.addPhotos')}</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'after')} />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                {/* Parts */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">{t('estimateForm.parts')}</h3>
                        <div className="flex gap-2">
                             <button type="button" onClick={() => setIsAiPartsFinderOpen(true)} className="text-xs bg-sky-600 text-white px-3 py-1 rounded hover:bg-sky-700">AI Finder</button>
                             <div className="relative group">
                                <select 
                                    onChange={(e) => {
                                        const item = stockItems.find(s => s.id === e.target.value);
                                        if (item) handleAddPartFromStock(item);
                                        e.target.value = "";
                                    }} 
                                    className="text-xs bg-gray-700 text-white px-3 py-1 rounded border-none w-40"
                                >
                                    <option value="">{t('estimateForm.addPartFromStock')}</option>
                                    {stockItems.filter(s => s.quantity > 0).map(s => <option key={s.id} value={s.id}>{s.name} ({s.quantity})</option>)}
                                </select>
                             </div>
                            <button type="button" onClick={handleAddPart} className="text-xs bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700">{t('estimateForm.addPartManual')}</button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left futuristic-table text-sm">
                            <thead><tr><th className="p-2 w-1/2">Nume</th><th className="p-2 w-20">Cant.</th><th className="p-2 w-24">Preț</th><th className="p-2 w-24 text-right">Total</th><th className="p-2 w-10"></th></tr></thead>
                            <tbody>
                                {formData.parts.map((part, index) => (
                                    <tr key={part.id}>
                                        <td className="p-2"><input type="text" value={part.name} onChange={(e) => handlePartChange(index, 'name', e.target.value)} className="w-full bg-transparent border-b border-gray-600 focus:border-primary-500 outline-none" placeholder="Nume piesă" /></td>
                                        <td className="p-2"><input type="number" value={part.quantity} onChange={(e) => handlePartChange(index, 'quantity', parseFloat(e.target.value))} className="w-full bg-transparent border-b border-gray-600 focus:border-primary-500 outline-none text-center" /></td>
                                        <td className="p-2"><input type="number" value={part.price} onChange={(e) => handlePartChange(index, 'price', parseFloat(e.target.value))} className="w-full bg-transparent border-b border-gray-600 focus:border-primary-500 outline-none" /></td>
                                        <td className="p-2 text-right font-mono">{(part.quantity * part.price).toFixed(2)}</td>
                                        <td className="p-2"><button type="button" onClick={() => handleRemovePart(index)} className="text-red-400 hover:text-red-300">✕</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Labor */}
                <div>
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                             <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">{t('estimateForm.labor')}</h3>
                             {isStaffMember && (
                                 <span className="text-[10px] bg-amber-900/50 text-amber-400 px-2 py-0.5 rounded border border-amber-600/50 flex items-center gap-1">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                     Locked (Staff)
                                 </span>
                             )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsLaborModalOpen(true)}
                                disabled={isStaffMember}
                                className={`text-xs bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-600 hover:border-gray-500 transition-colors flex items-center gap-2 ${isStaffMember ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                {t('estimateForm.addPredefinedOperation')}
                            </button>
                            <button 
                                type="button" 
                                onClick={handleAddLabor} 
                                disabled={isStaffMember}
                                className={`text-xs bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-900/20 font-bold flex items-center gap-1 ${isStaffMember ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span>+</span> {t('estimateForm.addLaborManual')}
                            </button>
                        </div>
                    </div>

                     <div className="overflow-x-auto">
                        <table className="w-full text-left futuristic-table text-sm">
                            <thead><tr><th className="p-2 w-1/2">Descriere</th><th className="p-2 w-20">Ore</th><th className="p-2 w-24">Tarif/h</th><th className="p-2 w-24 text-right">Total</th><th className="p-2 w-10"></th></tr></thead>
                            <tbody>
                                {formData.labor.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="p-2 flex items-center gap-2">
                                            <input 
                                                type="text" 
                                                value={item.description} 
                                                onChange={(e) => handleLaborChange(index, 'description', e.target.value)} 
                                                className={`w-full bg-transparent border-b border-gray-600 focus:border-primary-500 outline-none ${isStaffMember ? 'opacity-70' : ''}`} 
                                                placeholder="Descriere manoperă" 
                                                readOnly={isStaffMember}
                                            />
                                            {!isStaffMember && <button type="button" onClick={() => handleGetAiPriceSuggestion(index)} className="text-sky-400 hover:text-sky-300" title={t('estimateForm.getAiPriceSuggestionTooltip')}>🤖</button>}
                                        </td>
                                        <td className="p-2"><input type="number" value={item.hours} onChange={(e) => handleLaborChange(index, 'hours', parseFloat(e.target.value))} className="w-full bg-transparent border-b border-gray-600 focus:border-primary-500 outline-none text-center" /></td>
                                        <td className="p-2">
                                            <input 
                                                type="number" 
                                                value={item.rate} 
                                                onChange={(e) => handleLaborChange(index, 'rate', parseFloat(e.target.value))} 
                                                disabled={isStaffMember}
                                                className={`w-full bg-transparent border-b border-gray-600 focus:border-primary-500 outline-none ${isStaffMember ? 'opacity-50 cursor-not-allowed text-gray-500' : ''}`} 
                                            />
                                        </td>
                                        <td className="p-2 text-right font-mono">{(item.hours * item.rate).toFixed(2)}</td>
                                        <td className="p-2"><button type="button" onClick={() => handleRemoveLabor(index)} className="text-red-400 hover:text-red-300">✕</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {isStaffMember && (
                            <p className="text-xs text-amber-400 mt-2 italic text-center border border-amber-500/30 bg-amber-900/20 p-2 rounded">
                                STAFF DETECTAT: Manopera este gratuită și adăugarea de noi operațiuni este restricționată. Doar piese.
                            </p>
                        )}
                    </div>
                </div>

                {/* Payments */}
                <div className="bg-gray-900/50 border border-primary-500/20 rounded-xl p-6">
                    <h3 className="font-bold text-lg text-white mb-4 border-b border-primary-500/30 pb-2">{t('estimateForm.paymentsAndAdvance')}</h3>
                    
                    <div className="space-y-4">
                        {formData.payments && formData.payments.length > 0 && (
                            <div className="space-y-2">
                                {formData.payments.map(payment => (
                                    <div key={payment.id} className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                        <div className="flex gap-4 items-center">
                                            <span className="font-mono text-green-400 font-bold">{payment.amount.toFixed(2)} {garageInfo.currency}</span>
                                            <span className="text-sm text-gray-300 px-2 py-0.5 bg-gray-700 rounded text-xs">{t(`estimateForm.paymentMethods.${payment.method}`)}</span>
                                            <span className="text-sm text-gray-400">{new Date(payment.date).toLocaleDateString()}</span>
                                            {payment.notes && <span className="text-sm text-gray-500 italic">- {payment.notes}</span>}
                                        </div>
                                        <button type="button" onClick={() => handleRemovePayment(payment.id)} className="text-red-400 hover:text-red-300 p-1">🗑️</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-3 items-end bg-gray-800/30 p-3 rounded-lg">
                            <div className="flex-grow">
                                <label className="block text-xs text-gray-400 mb-1">{t('estimateForm.paymentAmount')}</label>
                                <input type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: parseFloat(e.target.value)})} className="w-full p-2 futuristic-input" />
                            </div>
                            <div className="w-full md:w-40">
                                <label className="block text-xs text-gray-400 mb-1">Data</label>
                                <input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-full p-2 futuristic-input" />
                            </div>
                            <div className="w-full md:w-40">
                                <label className="block text-xs text-gray-400 mb-1">{t('estimateForm.paymentMethod')}</label>
                                <select value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value as any})} className="w-full p-2 futuristic-select">
                                    <option value="CASH">Numerar</option>
                                    <option value="CARD">Card</option>
                                    <option value="TRANSFER">Transfer</option>
                                </select>
                            </div>
                            <div className="flex-grow">
                                <label className="block text-xs text-gray-400 mb-1">{t('estimateForm.paymentNotes')}</label>
                                <input type="text" value={newPayment.notes} onChange={e => setNewPayment({...newPayment, notes: e.target.value})} placeholder="Ex: Avans piese" className="w-full p-2 futuristic-input" />
                            </div>
                            <button type="button" onClick={handleAddPayment} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg whitespace-nowrap">
                                + {t('estimateForm.addPayment')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-700">
                     <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('estimateForm.assignMechanic')}</label>
                             <div className="flex flex-wrap gap-2">
                                {mechanics.map(m => (
                                    <label key={m.id} className="inline-flex items-center cursor-pointer bg-gray-800 px-3 py-1 rounded-full hover:bg-gray-700">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.mechanicIds?.includes(m.id)} 
                                            onChange={(e) => {
                                                const current = formData.mechanicIds || [];
                                                const updated = e.target.checked ? [...current, m.id] : current.filter(id => id !== m.id);
                                                setFormData(prev => ({ ...prev, mechanicIds: updated }));
                                            }}
                                            className="form-checkbox h-4 w-4 text-primary-600 rounded border-gray-600 bg-gray-700 focus:ring-primary-500" 
                                        />
                                        <span className="ml-2 text-sm text-gray-200">{m.name}</span>
                                    </label>
                                ))}
                            </div>
                         </div>
                         
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('estimateForm.applyPromotion')}</label>
                             <select 
                                value={formData.promotionId || ''} 
                                onChange={(e) => handleApplyPromotion(e.target.value)}
                                disabled={isStaffMember}
                                className={`w-full p-2 futuristic-select ${isStaffMember ? 'opacity-50 cursor-not-allowed' : ''}`}
                             >
                                 <option value="">{t('estimateForm.noPromotion')}</option>
                                 {promotions.filter(p => p.isActive).map(promo => (
                                     <option key={promo.id} value={promo.id}>
                                         {promo.name} ({promo.value}%)
                                     </option>
                                 ))}
                             </select>
                         </div>
                        
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">{t('estimateForm.partsDiscount')}</label>
                                <input type="number" name="partsDiscount" value={formData.partsDiscount} onChange={handleChange} className="w-full p-2 futuristic-input" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">{t('estimateForm.laborDiscount')}</label>
                                <input 
                                    type="number" 
                                    name="laborDiscount" 
                                    value={formData.laborDiscount} 
                                    onChange={handleChange} 
                                    disabled={isStaffMember}
                                    className={`w-full p-2 futuristic-input ${isStaffMember ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                />
                            </div>
                         </div>
                         <input 
                            type="text" 
                            name="discountReason" 
                            value={formData.discountReason} 
                            onChange={handleChange} 
                            placeholder={t('estimateForm.discountReason')} 
                            disabled={isStaffMember}
                            className={`w-full p-2 futuristic-input ${isStaffMember ? 'opacity-50 cursor-not-allowed' : ''}`} 
                        />
                     </div>

                     <div className="bg-gray-900/50 p-4 rounded-lg space-y-2 text-right">
                        <div className="flex justify-between text-gray-400"><span>Total Piese:</span> <span>{partsTotal.toFixed(2)} {garageInfo.currency}</span></div>
                        <div className="flex justify-between text-gray-400"><span>Total Manoperă:</span> <span>{laborTotal.toFixed(2)} {garageInfo.currency}</span></div>
                        <div className="flex justify-between text-red-400"><span>Reduceri:</span> <span>-{discountTotal.toFixed(2)} {garageInfo.currency}</span></div>
                        <div className="flex justify-between text-xl font-bold text-white border-t border-gray-600 pt-2 mt-2"><span>Total Estimare:</span> <span>{grandTotal.toFixed(2)} {garageInfo.currency}</span></div>
                        
                        <div className="flex justify-between text-green-400 font-semibold border-t border-gray-700 pt-2 mt-2">
                            <span>Total Plătit:</span> <span>-{totalPaid.toFixed(2)} {garageInfo.currency}</span>
                        </div>
                        <div className={`flex justify-between text-2xl font-extrabold pt-2 ${remainingBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            <span>Rest de Plată:</span> <span>{remainingBalance.toFixed(2)} {garageInfo.currency}</span>
                        </div>
                     </div>
                </div>

                <div className="flex justify-end gap-4 pt-6">
                    <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg">{t('estimateForm.cancel')}</button>
                    <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-primary-900/50">{t('estimateForm.save')}</button>
                </div>
            </form>

            {isVinScannerOpen && <VINScanner onScanComplete={(vin) => { setFormData(prev => ({...prev, motorcycleVin: vin})); setIsVinScannerOpen(false); }} onClose={() => setIsVinScannerOpen(false)} />}
            {isAiPartsFinderOpen && <AIPartsFinder onSelectPart={(part) => { 
                setFormData(prev => ({...prev, parts: [...prev.parts, { id: `part-${Date.now()}`, name: part.partName, description: part.sku, quantity: 1, price: part.estimatedPrice }]})); 
                setIsAiPartsFinderOpen(false); 
            }} onClose={() => setIsAiPartsFinderOpen(false)} />}
            
            <LaborSelectionModal
                isOpen={isLaborModalOpen}
                onClose={() => setIsLaborModalOpen(false)}
                items={predefinedLabor}
                onSelect={handleAddPredefinedLabor}
                currency={garageInfo.currency}
                title={t('estimateForm.addPredefinedOperation')}
                searchPlaceholder={t('pricingManager.laborDescription')}
            />
            
            {isAiPriceModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-white mb-4">{t('estimateForm.aiPriceSuggestionTitle')}</h3>
                        {isAiPriceLoading ? (
                            <div className="text-center py-8"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-gray-300">{t('estimateForm.aiPriceSuggestionLoading')}</p></div>
                        ) : aiPriceSuggestion?.error ? (
                            <p className="text-red-400">{aiPriceSuggestion.error}</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-gray-800 p-4 rounded-lg">
                                    <p className="text-sm text-gray-400">{t('estimateForm.suggestedRate')}</p>
                                    <p className="text-2xl font-bold text-primary-400">{aiPriceSuggestion?.suggestion?.suggestedRate} {garageInfo.currency}/h</p>
                                </div>
                                <p className="text-gray-300 text-sm"><strong>{t('estimateForm.reasoning')}</strong> {aiPriceSuggestion?.suggestion?.reasoning}</p>
                                <div className="flex justify-end gap-2 pt-4">
                                    <button onClick={() => setIsAiPriceModalOpen(false)} className="bg-gray-600 text-white py-2 px-4 rounded-lg">{t('estimateForm.cancel')}</button>
                                    <button onClick={applyAiPriceSuggestion} className="bg-green-600 text-white py-2 px-4 rounded-lg">{t('estimateForm.applySuggestion')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EstimateForm;
