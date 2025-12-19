
import React, { useState, useMemo } from 'react';
import { Estimate } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import ClientBadge from './ClientBadge.tsx';

interface CommunicationsHubProps {
    estimates: Estimate[];
}

interface ClientInfo {
    name: string;
    phone: string;
    email: string;
    lastEstimate: Estimate | null;
    totalEstimates: number;
}

const CommunicationsHub: React.FC<CommunicationsHubProps> = ({ estimates }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);

    const uniqueClients = useMemo(() => {
        const clientsMap = new Map<string, ClientInfo>();

        estimates.forEach(est => {
            if (!est.customerPhone) return;
            
            if (!clientsMap.has(est.customerPhone)) {
                clientsMap.set(est.customerPhone, {
                    name: est.customerName,
                    phone: est.customerPhone,
                    email: est.customerEmail,
                    lastEstimate: est,
                    totalEstimates: 1
                });
            } else {
                const current = clientsMap.get(est.customerPhone)!;
                current.totalEstimates += 1;
                if (new Date(est.date) > new Date(current.lastEstimate?.date || 0)) {
                    current.lastEstimate = est;
                }
            }
        });

        return Array.from(clientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [estimates]);

    const filteredClients = useMemo(() => {
        return uniqueClients.filter(client => 
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.phone.includes(searchTerm)
        );
    }, [uniqueClients, searchTerm]);

    const formatPhoneNumberForWhatsapp = (phone: string) => {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Simple logic for RO numbers: replace leading 0 with 40
        if (cleaned.startsWith('07') && cleaned.length === 10) {
            return '40' + cleaned.substring(1);
        }
        
        // If it already starts with 40 (RO country code)
        if (cleaned.startsWith('40') && cleaned.length === 11) {
            return cleaned;
        }

        // Default: return cleaned number, assuming user might have entered international format
        return cleaned;
    };

    const handleOpenWhatsappWeb = () => {
        window.open('https://web.whatsapp.com', '_blank');
    };

    const handleStartChat = () => {
        if (!selectedClient) return;
        const formattedPhone = formatPhoneNumberForWhatsapp(selectedClient.phone);
        window.open(`https://wa.me/${formattedPhone}`, '_blank');
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-fade-in">
            {/* Left Sidebar: Client List */}
            <div className="w-full lg:w-1/3 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white mb-4">{t('communications.title')}</h2>
                    <input 
                        type="text" 
                        placeholder={t('communications.searchPlaceholder')} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 futuristic-input"
                    />
                </div>
                <div className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {filteredClients.map(client => (
                        <div 
                            key={client.phone}
                            onClick={() => setSelectedClient(client)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors flex justify-between items-center ${selectedClient?.phone === client.phone ? 'bg-primary-900/40 border border-primary-500/50' : 'bg-gray-800/30 hover:bg-gray-800'}`}
                        >
                            <div>
                                <p className="font-bold text-gray-200 text-sm">{client.name}</p>
                                <p className="text-xs text-gray-500">{client.phone}</p>
                            </div>
                            <ClientBadge clientPhone={client.phone} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Action Area */}
            <div className="w-full lg:w-2/3 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl p-6 flex flex-col">
                <div className="mb-8 flex justify-end">
                    <button 
                        onClick={handleOpenWhatsappWeb}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        {t('communications.openWhatsappWeb')}
                    </button>
                </div>

                {selectedClient ? (
                    <div className="flex-grow flex flex-col justify-center items-center text-center animate-fade-in-up">
                        <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center text-4xl mb-4 border-2 border-primary-500">
                            {selectedClient.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">{selectedClient.name}</h2>
                        <p className="text-xl text-primary-400 font-mono mb-6">{selectedClient.phone}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                <p className="text-gray-400 text-sm">{t('communications.email')}</p>
                                <p className="text-white font-semibold">{selectedClient.email || '-'}</p>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                <p className="text-gray-400 text-sm">{t('communications.lastEstimate')}</p>
                                <p className="text-white font-semibold">
                                    {selectedClient.lastEstimate 
                                        ? `${selectedClient.lastEstimate.estimateNumber} (${new Date(selectedClient.lastEstimate.date).toLocaleDateString()})` 
                                        : '-'}
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={handleStartChat}
                            className="bg-green-500 hover:bg-green-600 text-white text-lg font-bold py-4 px-12 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-105 flex items-center gap-3"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                            </svg>
                            {t('communications.startChat')}
                        </button>
                        <p className="mt-4 text-xs text-gray-500 max-w-md">{t('communications.selectClientDesc')}</p>
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col justify-center items-center text-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-lg">{t('communications.selectClient')}</p>
                        <p className="text-sm mt-2">{t('communications.selectClientDesc')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunicationsHub;
