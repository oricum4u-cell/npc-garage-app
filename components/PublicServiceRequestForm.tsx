import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { ServiceRequest, ServiceRequestStatus, PredefinedLabor } from '../types.ts';
import { PREDEFINED_LABOR_ITEMS_MOCK } from '../data/motorcycleData.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';
import Logo from './Logo.tsx';

const PublicServiceRequestForm: React.FC = () => {
    const { t } = useLanguage();
    const { garageInfo } = useGarage();
    const [serviceRequests, setServiceRequests] = useLocalStorage<ServiceRequest[]>('garage-service-requests', []);
    const [predefinedServices] = useLocalStorage<PredefinedLabor[]>('garage-labor', PREDEFINED_LABOR_ITEMS_MOCK);
    
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        clientName: '',
        clientPhone: '',
        motorcycleMake: '',
        motorcycleModel: '',
        motorcycleYear: new Date().getFullYear(),
        motorcycleVin: '',
        selectedServices: [] as string[],
        clientObservations: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleServiceToggle = (serviceName: string) => {
        setFormData(prev => {
            const selected = prev.selectedServices;
            if (selected.includes(serviceName)) {
                return { ...prev, selectedServices: selected.filter(s => s !== serviceName) };
            } else {
                return { ...prev, selectedServices: [...selected, serviceName] };
            }
        });
    };

    const handleNavigate = (path: string) => {
        const newUrl = new URL(window.location.href);
        newUrl.search = path;
        window.location.href = newUrl.toString();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newRequest: ServiceRequest = {
            id: `sr-${Date.now()}`,
            ...formData,
            motorcycleYear: Number(formData.motorcycleYear),
            status: ServiceRequestStatus.PENDING,
            requestDate: new Date().toISOString()
        };
        setServiceRequests(prev => [...prev, newRequest]);
        setIsSubmitted(true);
        
        setTimeout(() => {
            handleNavigate('?portal=true');
        }, 3000);
    };

    const renderStep = () => {
        switch (step) {
            case 1: // Client Info
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-white text-center">{t('clientPortal.step1Title')}</h3>
                        <div><label className="block text-sm text-gray-400 mb-1">{t('clientPortal.name')}</label><input type="text" name="clientName" value={formData.clientName} onChange={handleChange} required className="w-full client-portal-input" /></div>
                        <div><label className="block text-sm text-gray-400 mb-1">{t('clientPortal.phone')}</label><input type="tel" name="clientPhone" value={formData.clientPhone} onChange={handleChange} required className="w-full client-portal-input" /></div>
                    </div>
                );
            case 2: // Motorcycle Info
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-white text-center">{t('clientPortal.step2Title')}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm text-gray-400 mb-1">{t('clientPortal.make')}</label><input type="text" name="motorcycleMake" value={formData.motorcycleMake} onChange={handleChange} required className="w-full client-portal-input" /></div>
                            <div><label className="block text-sm text-gray-400 mb-1">{t('clientPortal.model')}</label><input type="text" name="motorcycleModel" value={formData.motorcycleModel} onChange={handleChange} required className="w-full client-portal-input" /></div>
                        </div>
                        <div><label className="block text-sm text-gray-400 mb-1">{t('clientPortal.year')}</label><input type="number" name="motorcycleYear" value={formData.motorcycleYear} onChange={handleChange} required className="w-full client-portal-input" /></div>
                        <div><label className="block text-sm text-gray-400 mb-1">{t('clientPortal.vin')}</label><input type="text" name="motorcycleVin" value={formData.motorcycleVin} onChange={handleChange} className="w-full client-portal-input" /></div>
                    </div>
                );
            case 3: // Services
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-white text-center">{t('clientPortal.step3Title')}</h3>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">{t('clientPortal.predefinedServices')}</label>
                            <div className="grid grid-cols-2 gap-2">
                                {predefinedServices.map(service => (
                                    <button key={service.id} type="button" onClick={() => handleServiceToggle(service.description)} className={`p-3 text-sm rounded-lg border text-left transition-colors ${formData.selectedServices.includes(service.description) ? 'bg-primary-600 text-white border-primary-500' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                                        {service.description}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div><label className="block text-sm text-gray-400 mb-1">{t('clientPortal.otherObservations')}</label><textarea name="clientObservations" value={formData.clientObservations} onChange={handleChange} rows={3} className="w-full client-portal-input"></textarea></div>
                    </div>
                );
            case 4: // Review
                return (
                     <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-white text-center">{t('clientPortal.reviewTitle')}</h3>
                        <div className="p-4 bg-gray-50 text-gray-800 rounded-lg space-y-3 text-sm">
                            <div><strong className="text-gray-500">{t('clientPortal.contactInfo')}:</strong><p>{formData.clientName}, {formData.clientPhone}</p></div>
                            <div><strong className="text-gray-500">{t('clientPortal.motorcycleInfo')}:</strong><p>{formData.motorcycleMake} {formData.motorcycleModel} ({formData.motorcycleYear})</p></div>
                            <div><strong className="text-gray-500">{t('clientPortal.servicesInfo')}:</strong><ul className="list-disc pl-5">{formData.selectedServices.map(s => <li key={s}>{s}</li>)}</ul>{formData.clientObservations && <p className="mt-1 italic">"{formData.clientObservations}"</p>}</div>
                        </div>
                    </div>
                );
        }
    };
    
    if (isSubmitted) {
        return (
             <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
                 <div className="w-full max-w-lg text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl animate-fade-in">
                    <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-4">{t('clientPortal.successTitle')}</h1>
                    <p className="text-lg text-gray-700 dark:text-gray-200">{t('clientPortal.successMessage')}</p>
                    <p className="text-sm text-gray-500 mt-4">Veți fi redirecționat automat înapoi la portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
                <header className="text-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-t-lg">
                    <Logo className="w-16 h-16 mx-auto mb-2" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('clientPortal.title')}</h1>
                    <p className="text-gray-600 dark:text-gray-400">{t('clientPortal.subtitle')}</p>
                </header>
                
                <form onSubmit={handleSubmit} className="p-8">
                    {renderStep()}
                    <div className="mt-8 flex justify-between items-center">
                        {step > 1 ? (
                            <button type="button" onClick={() => setStep(s => s - 1)} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-bold py-2 px-6 rounded-lg">{t('clientPortal.back')}</button>
                        ) : (
                            <button type="button" onClick={() => handleNavigate('?portal=true')} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white">Anulează</button>
                        )}
                        
                        {step < 4 ? (
                            <button type="button" onClick={() => setStep(s => s + 1)} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-6 rounded-lg">{t('clientPortal.next')}</button>
                        ) : (
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">{t('clientPortal.submit')}</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PublicServiceRequestForm;