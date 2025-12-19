import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { LoyaltyConfig } from '../types.ts';
import { INITIAL_LOYALTY_CONFIG } from '../constants.ts';

interface LoyaltyContextType {
    loyaltyConfig: LoyaltyConfig;
    setLoyaltyConfig: React.Dispatch<React.SetStateAction<LoyaltyConfig>>;
}

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined);

export const LoyaltyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [storedConfig, setLoyaltyConfig] = useLocalStorage<LoyaltyConfig>('garage-loyalty-config', INITIAL_LOYALTY_CONFIG);

    // This ensures that if the stored config is partial or malformed, we fall back to the initial defaults for missing keys.
    const loyaltyConfig = useMemo(() => {
        return {
            ...INITIAL_LOYALTY_CONFIG,
            ...storedConfig,
            TIERS: {
                ...INITIAL_LOYALTY_CONFIG.TIERS,
                ...(storedConfig?.TIERS || {}),
            }
        };
    }, [storedConfig]);

    return (
        <LoyaltyContext.Provider value={{ loyaltyConfig, setLoyaltyConfig }}>
            {children}
        </LoyaltyContext.Provider>
    );
};

export const useLoyalty = () => {
    const context = useContext(LoyaltyContext);
    if (context === undefined) {
        throw new Error('useLoyalty must be used within a LoyaltyProvider');
    }
    return context;
};