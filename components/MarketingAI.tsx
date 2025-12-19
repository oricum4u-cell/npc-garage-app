
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { Estimate, Client, AIMarketingCampaign, LoyaltyTier, LoyaltyConfig, EstimateStatus } from '../types.ts';
import { getAiMarketingCampaigns } from '../services/geminiService.ts';
import { useLoyalty } from '../contexts/LoyaltyContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

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

interface MarketingAIProps {
    estimates: Estimate[];
    showNotification: (message: string, type?: string) => void;
}

const MarketingAI: React.FC<MarketingAIProps> = ({ estimates, showNotification }) => {
    const { t } = useLanguage();
    const { loyaltyConfig } = useLoyalty();
    const [campaigns, setCampaigns] = useState<AIMarketingCampaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'suggestions' | 'automated'>('suggestions');

    // State for Automated Campaign
    const [isInactiveCampaignActive, setIsInactiveCampaignActive] = useLocalStorage('marketing-inactive-active', false);
    const [inactivityPeriodMonths, setInactivityPeriodMonths] = useLocalStorage('marketing-inactive-months', 6);
    const [inactiveSmsTemplate, setInactiveSmsTemplate] = useLocalStorage('marketing-inactive-sms', 'Salut, {clientName}! A trecut ceva timp de la ultima vizită. Ți-am pregătit o ofertă specială de 10% la manoperă pentru următoarea lucrare. Te așteptăm!');
    const [simulationResult, setSimulationResult] = useState<string | null>(null);

    const clients = useMemo((): Client[] => {
        const clientData: { [key: string]: Pick<Client, 'name' | 'phone' | 'email' | 'totalSpent' | 'estimates'> } = {};

        estimates.forEach(e => { // Use all estimates to build client list
            const clientKey = e.customerPhone;
            if (!clientKey) return;

            if (!clientData[clientKey]) {
                clientData[clientKey] = { name: e.customerName, phone: e.customerPhone, email: e.customerEmail, totalSpent: 0, estimates: [] };
            }
            if (e.status === EstimateStatus.COMPLETED) {
                const estimateTotal = (e.parts.reduce((s, p) => s + p.price * p.quantity, 0) * (1 - (e.partsDiscount || 0) / 100)) + (e.labor.reduce((s, l) => s + l.rate * l.hours, 0) * (1 - (e.laborDiscount || 0) / 100));
                clientData[clientKey].totalSpent += estimateTotal;
            }
            clientData[clientKey].estimates.push(e);
        });
        
        const loyaltyTiersSorted = (Object.entries(loyaltyConfig.TIERS) as [LoyaltyTier, LoyaltyConfig['TIERS'][LoyaltyTier]][]).sort(([, a], [, b]) => b.points - a.points);
        const getTier = (points: number): LoyaltyTier => {
            for (const [tier, config] of loyaltyTiersSorted) if (points >= config.points) return tier;
            return LoyaltyTier.BRONZE;
        };

        return Object.values(clientData).map(client => {
            const loyaltyPoints = Math.floor(client.totalSpent * loyaltyConfig.POINTS_PER_RON);
            const loyaltyTier = getTier(loyaltyPoints);
            return { ...client, loyaltyPoints, loyaltyTier };
        });
    }, [estimates, loyaltyConfig]);

    useEffect(() => {
        if (activeTab === 'suggestions') {
            const fetchCampaigns = async () => {
                setIsLoading(true);
                setError('');
                if (clients.length === 0) {
                    setIsLoading(false);
                    return;
                }
                try {
                    const results = await getAiMarketingCampaigns(clients);
                    setCampaigns(results);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'A apărut o eroare necunoscută.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchCampaigns();
        }
    }, [clients, activeTab]);

    const handleIgnore = (title: string) => {
        setCampaigns(prev => prev.filter(c => c.title !== title));
    };
    
    const handleSendSms = (campaign: AIMarketingCampaign) => {
        // This is a simulation. In a real app, it would integrate with an SMS gateway.
        console.log(`Simulating sending ${campaign.targetClientPhones.length} SMSs for campaign: ${campaign.title}`);
        showNotification(t('marketingAI.notificationSent'), 'success');
        handleIgnore(campaign.title); // Remove after sending
    };

    const runInactiveSimulation = () => {
        const now = new Date();
        const inactiveDateThreshold = new Date(now.setMonth(now.getMonth() - inactivityPeriodMonths));
        
        const inactiveClients = clients.filter(client => {
            const lastVisit = client.estimates.reduce((latest, est) => {
                const estDate = new Date(est.date);
                return estDate > latest ? estDate : latest;
            }, new Date(0));
            return lastVisit < inactiveDateThreshold;
        });

        setSimulationResult(t('marketingAI.simulationResult', { count: inactiveClients.length }));
    };
    
    const renderSuggestions = () => {
        if (isLoading) return <div className="text-center py-12 text-gray-400">{t('marketingAI.loading')}</div>;
        if (error) return <div className="text-center py-12 text-red-400">{error}</div>;
        if (campaigns.length === 0) return <div className="text-center py-12 text-gray-400">{t('marketingAI.noCampaigns')}</div>;

        return (
            <div className="space-y-6">
                {campaigns.map((campaign, index) => (
                    <div key={index} className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 animate-fade-in-up">
                        <h3 className="text-xl font-bold text-primary-400">{campaign.title}</h3>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-white mb-2">{t('marketingAI.targetAudience')} ({campaign.targetClientPhones.length})</h4>
                                <p className="text-sm text-gray-300">{campaign.targetAudienceDescription}</p>
                                <p className="text-xs text-gray-500 mt-2 font-mono truncate">{campaign.targetClientPhones.join(', ')}</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-white mb-2">{t('marketingAI.aiRationale')}</h4>
                                <p className="text-sm text-gray-300 italic">"{campaign.aiRationale}"</p>
                            </div>
                        </div>
                        <div className="mt-6 bg-gray-900/50 p-4 rounded-md border border-gray-700">
                            <h4 className="font-semibold text-white mb-2">{t('marketingAI.proposedSms')}</h4>
                            <p className="text-sm text-gray-200">{campaign.proposedSms}</p>
                        </div>
                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => handleIgnore(campaign.title)} className="bg-gray-600/50 text-gray-300 font-semibold py-2 px-4 rounded-lg">{t('marketingAI.ignore')}</button>
                            <button onClick={() => handleSendSms(campaign)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">{t('marketingAI.sendSms')}</button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderAutomated = () => (
        <div className="space-y-6">
             <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-primary-400">{t('marketingAI.inactiveClientsCampaign')}</h3>
                     <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isInactiveCampaignActive ? 'text-green-400' : 'text-red-400'}`}>
                            {isInactiveCampaignActive ? 'ACTIVĂ' : 'INACTIVĂ'}
                        </span>
                        <button 
                            onClick={() => setIsInactiveCampaignActive(prev => !prev)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isInactiveCampaignActive ? 'bg-primary-600' : 'bg-gray-600'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isInactiveCampaignActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">{t('marketingAI.inactivePeriod')}</label>
                        <select 
                            value={inactivityPeriodMonths} 
                            onChange={e => setInactivityPeriodMonths(Number(e.target.value))}
                            className="p-2 futuristic-select w-full md:w-1/3"
                        >
                            <option value={3}>3 Luni</option>
                            <option value={6}>6 Luni</option>
                            <option value={9}>9 Luni</option>
                            <option value={12}>12 Luni</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">{t('marketingAI.smsTemplate')}</label>
                        <textarea 
                            value={inactiveSmsTemplate}
                            onChange={e => setInactiveSmsTemplate(e.target.value)}
                            rows={3}
                            className="w-full p-2 futuristic-input"
                        />
                        <p className="text-xs text-gray-500 mt-1">Folosește `&#123;clientName&#125;` pentru a insera numele clientului.</p>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button onClick={runInactiveSimulation} className="bg-blue-600/50 text-blue-200 font-semibold py-2 px-4 rounded-lg">{t('marketingAI.runSimulation')}</button>
                    </div>
                    {simulationResult && <div className="text-center text-sm text-blue-300 bg-blue-900/30 p-3 rounded">{simulationResult}</div>}
                </div>
            </div>
        </div>
    );
    
    return (
        <HudPanel title={t('marketingAI.title')}>
            <p className="text-sm text-primary-300/80 -mt-4 mb-6">{t('marketingAI.description')}</p>
            
            <div className="mb-6 flex gap-2 bg-gray-950/50 p-1 rounded-lg w-full sm:w-auto self-start">
                <button onClick={() => setActiveTab('suggestions')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'suggestions' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>Sugestii AI</button>
                <button onClick={() => setActiveTab('automated')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'automated' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>{t('marketingAI.automatedCampaigns')}</button>
            </div>

            {activeTab === 'suggestions' ? renderSuggestions() : renderAutomated()}
        </HudPanel>
    );
};

export default MarketingAI;
