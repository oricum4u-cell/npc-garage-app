
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// Hook-ul a fost actualizat la o versiune mai robustă care include sincronizare între tab-uri.
export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  // Starea pentru a stoca valoarea noastră
  // Trimitem o funcție de stare inițială către useState pentru ca logica să fie executată o singură dată
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
          const parsed = JSON.parse(item);
          // Safety check: If we expect an array but got null/object/etc, fallback to initial
          if (Array.isArray(initialValue) && !Array.isArray(parsed)) {
              return initialValue;
          }
          // If we expect an object/string but got null, fallback
          if (parsed === null && initialValue !== null) {
              return initialValue;
          }
          return parsed;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Funcție setter personalizată care persistă noua valoare în localStorage.
  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    try {
      // Permite ca `value` să fie o funcție pentru a avea aceeași API ca useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Salvează starea
      setStoredValue(valueToStore);
      // Salvează în local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Acest useEffect ascultă schimbările din alte tab-uri
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
            const newValueParsed = JSON.parse(e.newValue);
            setStoredValue(newValueParsed);
        } catch(error) {
            console.error("Eroare la parsarea datelor din storage event", error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);


  return [storedValue, setValue];
}
