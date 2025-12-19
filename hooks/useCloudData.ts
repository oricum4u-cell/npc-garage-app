
import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:3001/api';

// Map endpoints to legacy localStorage keys to maintain compatibility with other components
const LEGACY_KEYS: Record<string, string> = {
    'estimates': 'garage-estimates',
    'mechanics': 'garage-mechanics',
    'stock': 'garage-stock',
    'appointments': 'garage-appointments',
    'users': 'garage-users',
    'promotions': 'garage-promotions',
    'suppliers': 'garage-suppliers',
    'orders': 'garage-orders',
    'labor': 'garage-labor',
    'kits': 'garage-kits',
    'bays': 'garage-bays',
    'garage-info': 'garage-info',
    'loyalty-config': 'garage-loyalty-config'
};

export function useCloudData<T>(endpoint: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, boolean] {
    const storageKey = LEGACY_KEYS[endpoint] || `garage-cloud-cache-${endpoint}`;

    // Initialize state from local storage if available to prevent flickering or for offline support
    const [data, setData] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(storageKey);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading ${storageKey} from localStorage`, error);
            return initialValue;
        }
    });

    const [isLoading, setIsLoading] = useState(true);

    // Fetch data on mount
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                // Short timeout to fail fast if server is not running (Offline Mode)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);

                const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

                if (response.ok) {
                    const result = await response.json();
                    if (isMounted) {
                        // Use server data. If server returns null (e.g. singleton not init), fallback to initial
                        const finalData = result === null ? initialValue : result;
                        setData(finalData);
                        
                        // Update local cache
                        window.localStorage.setItem(storageKey, JSON.stringify(finalData));
                    }
                } else {
                    throw new Error(`Server returned ${response.status}`);
                }
            } catch (error) {
                if (isMounted) {
                    // In offline mode or error, we stick with the data loaded from localStorage
                    // console.debug(`[Offline Mode] Using local cache for ${endpoint}`);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchData();

        return () => { isMounted = false; };
    }, [endpoint, initialValue, storageKey]);

    // Wrapper for setData that updates local state, localStorage, and attempts to sync with Cloud
    const setCloudData: Dispatch<SetStateAction<T>> = useCallback((value) => {
        setData((prevData) => {
            const newValue = value instanceof Function ? value(prevData) : value;
            
            // 1. Update Local Storage immediately (Optimistic UI & Offline Support)
            try {
                window.localStorage.setItem(storageKey, JSON.stringify(newValue));
            } catch (error) {
                console.error("Error saving to localStorage", error);
            }

            // 2. Fire and forget save to server
            fetch(`${API_BASE_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newValue),
            }).catch(err => {
                // Silent fail for network errors - changes are saved locally
                // console.warn(`Failed to save ${endpoint} to server:`, err);
            });

            return newValue;
        });
    }, [endpoint, storageKey]);

    return [data, setCloudData, isLoading];
}
