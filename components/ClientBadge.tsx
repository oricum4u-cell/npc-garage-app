
import React, { useMemo } from 'react';
import { LoyaltyTier, Estimate, EstimateStatus, LoyaltyConfig } from '../types.ts';
import { useLoyalty } from '../contexts/LoyaltyContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { getLoyaltyTierNameKey } from '../utils/translationHelpers.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';

interface ClientBadgeProps {
    clientPhone: string;
    className?: string;
}

// Hook to calculate client tier on the fly
const useClientTier = (clientPhone: string): { tier: LoyaltyTier | null; isNew: boolean; isVip: boolean } => {
    const [estimates] = useLocalStorage<Estimate[]>('garage-estimates', []);
    const { loyaltyConfig } = useLoyalty();

    return useMemo(() => {
        if (!clientPhone) return { tier: null, isNew: true, isVip: false };

        const completedEstimates = estimates.filter(e => e.status === EstimateStatus.COMPLETED && e.customerPhone === clientPhone);
        
        let totalSpent = 0;
        completedEstimates.forEach(e => {
            const estimateTotal = (e.parts.reduce((s, p) => s + p.price * p.quantity, 0) * (1 - (e.partsDiscount || 0) / 100)) + (e.labor.reduce((s, l) => s + l.rate * l.hours, 0) * (1 - (e.laborDiscount || 0) / 100));
            totalSpent += estimateTotal;
        });

        const points = Math.floor(totalSpent * loyaltyConfig.POINTS_PER_RON);
        
        // Determine Tier
        let tier: LoyaltyTier | null = null; // Default to null (Standard)
        
        // Filter out STAFF tier from automatic calculation and sort by points descending
        const sortedTiers = (Object.entries(loyaltyConfig.TIERS) as [LoyaltyTier, any][])
            .filter(([t]) => t !== LoyaltyTier.STAFF) 
            .sort(([, a], [, b]) => b.points - a.points);
            
        for (const [t, config] of sortedTiers) {
            if (points >= config.points) {
                tier = t;
                break;
            }
        }

        const isNew = completedEstimates.length <= 1;
        const isVip = totalSpent > 10000; // Example threshold for VIP badge

        return { tier, isNew, isVip };
    }, [estimates, loyaltyConfig, clientPhone]);
};

const ClientBadge: React.FC<ClientBadgeProps> = ({ clientPhone, className = '' }) => {
    const { tier, isNew, isVip } = useClientTier(clientPhone);
    const { t } = useLanguage();

    const tierStyles: Record<LoyaltyTier, string> = {
        [LoyaltyTier.BRONZE]: 'bg-amber-900/40 text-amber-300 border-amber-700',
        [LoyaltyTier.SILVER]: 'bg-slate-700/40 text-slate-300 border-slate-500',
        [LoyaltyTier.GOLD]: 'bg-yellow-900/40 text-yellow-300 border-yellow-600',
        [LoyaltyTier.PLATINUM]: 'bg-violet-900/40 text-violet-300 border-violet-600',
        [LoyaltyTier.VETERAN]: 'bg-gray-800 text-white border-gray-500',
        [LoyaltyTier.STAFF]: 'bg-primary-900/40 text-primary-300 border-primary-600',
    };

    const standardStyle = 'bg-gray-700/40 text-gray-400 border-gray-600';

    return (
        <div className={`inline-flex gap-1 items-center ${className}`}>
            {isNew && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/40 text-blue-300 border border-blue-700 uppercase tracking-wider">
                    Nou
                </span>
            )}
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${tier ? tierStyles[tier] : standardStyle}`}>
                {tier ? t(getLoyaltyTierNameKey(tier)) : t('loyalty.tierName.STANDARD')}
            </span>
            {isVip && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-fuchsia-900/40 text-fuchsia-300 border border-fuchsia-600 uppercase tracking-wider animate-pulse">
                    VIP
                </span>
            )}
        </div>
    );
};

export default ClientBadge;
