import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [translations, setTranslations] = useState<Record<string, any>>({});
    const [language, setLanguage] = useLocalStorage<string>('app-language', 'ro');

    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                // Asigură că limba este una validă pentru a preveni încărcarea de fișiere arbitrare
                const langToLoad = ['en', 'ro'].includes(language) ? language : 'ro';
                const response = await fetch(`/locales/${langToLoad}.json`);
                if (!response.ok) {
                    throw new Error(`Could not load ${langToLoad}.json`);
                }
                const data = await response.json();
                setTranslations(data);
                document.documentElement.lang = langToLoad; // Actualizează atributul lang al tag-ului html
            } catch (error) {
                console.error("Failed to fetch translations:", error);
            }
        };

        fetchTranslations();
    }, [language]);

    const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
        const keys = key.split('.');
        let result = translations;
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                return key; // Returnează cheia dacă nu este găsită
            }
        }
        
        let translation = String(result);

        if (replacements) {
            Object.entries(replacements).forEach(([placeholder, value]) => {
                const regex = new RegExp(`{${placeholder}}`, 'g');
                translation = translation.replace(regex, String(value));
            });
        }
        return translation;
    }, [translations]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};