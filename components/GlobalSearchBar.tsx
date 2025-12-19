
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Estimate } from '../types.ts';
import { STATUS_COLORS } from '../constants.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getStatusKey } from '../utils/translationHelpers.ts';

interface GlobalSearchBarProps {
    estimates: Estimate[];
    onResultClick: (estimateId: string) => void;
}

const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ estimates, onResultClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const { t } = useLanguage();

    // Debounce the search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    const searchResults = useMemo(() => {
        if (!debouncedTerm.trim()) {
            return [];
        }

        const lowercasedTerm = debouncedTerm.toLowerCase();
        return estimates.filter(e =>
            e.customerName.toLowerCase().includes(lowercasedTerm) ||
            e.motorcycleModel.toLowerCase().includes(lowercasedTerm) ||
            e.motorcycleMake.toLowerCase().includes(lowercasedTerm) ||
            e.estimateNumber.toLowerCase().includes(lowercasedTerm)
        ).slice(0, 5); // Limit to top 5 results for performance and UI
    }, [debouncedTerm, estimates]);
    
    // Handle clicks outside the component to close the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsDropdownVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        if (e.target.value.trim()) {
            setIsDropdownVisible(true);
        } else {
            setIsDropdownVisible(false);
        }
    };
    
    const handleResultItemClick = (estimateId: string) => {
        onResultClick(estimateId);
        setSearchTerm('');
        setIsDropdownVisible(false);
    };

    return (
        <div className="relative w-full max-w-sm" ref={searchRef}>
            <div className="relative">
                 <svg xmlns="http://www.w3.org/2000/svg" className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-primary-400/60" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                    id="global-search-bar"
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => searchTerm.trim() && setIsDropdownVisible(true)}
                    placeholder={t('global.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 rounded-lg futuristic-input"
                />
            </div>

            {isDropdownVisible && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-gray-900/90 backdrop-blur-md rounded-lg shadow-xl border border-primary-500/20 z-40 overflow-hidden animate-fade-in">
                    <ul>
                        {searchResults.map(estimate => (
                            <li key={estimate.id}>
                                <button
                                    onClick={() => handleResultItemClick(estimate.id)}
                                    className="w-full text-left px-4 py-3 hover:bg-primary-900/50 transition-colors"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-200">{estimate.estimateNumber}</p>
                                            <p className="text-sm text-gray-300">{estimate.customerName}</p>
                                            <p className="text-xs text-gray-400">{estimate.motorcycleMake} {estimate.motorcycleModel}</p>
                                        </div>
                                         <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[estimate.status]}`}>
                                            {t(getStatusKey(estimate.status))}
                                        </span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
             {isDropdownVisible && debouncedTerm && searchResults.length === 0 && (
                 <div className="absolute top-full mt-2 w-full bg-gray-900/90 backdrop-blur-md rounded-lg shadow-xl border border-primary-500/20 z-40 p-4 text-center text-gray-400 animate-fade-in">
                    Niciun rezultat găsit.
                </div>
            )}
        </div>
    );
};

export default GlobalSearchBar;
