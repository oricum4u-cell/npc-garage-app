import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { GarageInfo } from '../types.ts';

const initialGarageInfo: GarageInfo = {
    name: 'NPC Garage',
    address: 'Str. Jupiter, nr. 39, Ploieștiori',
    phone: '0736 446 078',
    email: 'npc-garage@gmail.com',
    schedule: {
        'luni': { isOpen: true, start: '16:30', end: '23:00' },
        'marti': { isOpen: true, start: '16:30', end: '23:00' },
        'miercuri': { isOpen: true, start: '16:30', end: '23:00' },
        'joi': { isOpen: true, start: '16:30', end: '23:00' },
        'vineri': { isOpen: true, start: '16:30', end: '23:00' },
        'sambata': { isOpen: true, start: '09:00', end: '19:00' },
        'duminica': { isOpen: false, start: '09:00', end: '17:00' },
    },
    termsAndConditions: '1. Garanția pentru manoperă este de 90 de zile de la data finalizării lucrărilor.\n2. Garanția pentru piese este conform politicii producătorului și se acordă doar pentru piesele achiziționate prin service-ul nostru.\n3. Nu ne asumăm responsabilitatea pentru obiectele personale (acte, accesorii, echipamente) lăsate în motocicletă sau în bagaje.\n4. Devizele sunt valabile 30 de zile. Prețurile pieselor se pot modifica în funcție de stocul furnizorului.\n5. Plata integrală a devizului trebuie efectuată la finalizarea lucrărilor, înainte de ridicarea motocicletei.\n6. Pentru motocicletele neridicate în termen de 3 zile lucrătoare de la notificarea finalizării, se va percepe o taxă de depozitare de 25 RON/zi.\n7. Motocicletele lăsate în service mai mult de 90 de zile de la notificare vor fi considerate abandonate și pot fi valorificate conform legii pentru acoperirea costurilor.\n8. Clientul autorizează personalul service-ului să efectueze teste de drum în scopul diagnosticării și verificării calității reparațiilor.\n9. Orice lucrare suplimentară față de devizul inițial se va efectua doar cu acordul prealabil al clientului.\n10. Piesele vechi înlocuite vor fi reciclate de către service, cu excepția cazului în care clientul solicită în mod expres păstrarea acestora la predarea vehiculului.',
    currency: 'RON',
    customLogo: undefined,
    logoVariant: 'default',
    currencyPosition: 'after',
    estimateNumberPrefix: 'NPC-',
    estimateNumberStart: 1,
    defaultLaborRate: 180,
    defaultPartsMarkup: 30, // Default 30% markup
};

interface GarageContextType {
    garageInfo: GarageInfo;
    setGarageInfo: React.Dispatch<React.SetStateAction<GarageInfo>>;
}

const GarageContext = createContext<GarageContextType | undefined>(undefined);

export const GarageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [garageInfo, setGarageInfo] = useLocalStorage<GarageInfo>('garage-info', initialGarageInfo);

    return (
        <GarageContext.Provider value={{ garageInfo, setGarageInfo }}>
            {children}
        </GarageContext.Provider>
    );
};

export const useGarage = () => {
    const context = useContext(GarageContext);
    if (context === undefined) {
        throw new Error('useGarage must be used within a GarageProvider');
    }
    return context;
};