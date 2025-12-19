import React from 'react';
import { Estimate, EstimateStatus, Part, Labor, StockItem } from '../types.ts';
import { STOCK_ITEMS_MOCK } from '../data/motorcycleData.ts';

// Acest fișier conține teste unitare și de integrare pentru logica de business a aplicației.
// Într-un proiect real, acest fișier ar fi `*.test.tsx` și ar fi rulat cu un test runner precum Jest sau Vitest.
// Din cauza limitărilor mediului, este prezentat ca un component neutilizat.

// --- Mock Test Runner ---
const testResults: { description: string; status: 'PASS' | 'FAIL'; error?: any }[] = [];
const describe = (description: string, fn: () => void) => {
    console.group(`-- DESCRIE: ${description} --`);
    fn();
    console.groupEnd();
};
const it = (description: string, fn: () => void) => {
  try {
    fn();
    testResults.push({ description, status: 'PASS' });
    console.log(`  ✅ PASSED: ${description}`);
  } catch (error) {
    testResults.push({ description, status: 'FAIL', error: (error as Error).message });
    console.error(`  ❌ FAILED: ${description}`);
    console.error(error);
  }
};
const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Așteptat: ${expected}, Primit: ${actual}`);
    }
  },
  toEqual: (expected: any) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Așteptat (obiect): ${JSON.stringify(expected)}, Primit: ${JSON.stringify(actual)}`);
    }
  },
  toBeCloseTo: (expected: number, precision: number = 2) => {
    const pass = Math.abs(expected - actual) < (Math.pow(10, -precision) / 2);
    if(!pass) {
        throw new Error(`Așteptat: ${expected}, Primit: ${actual} (cu o precizie de ${precision} zecimale)`);
    }
  }
});

// --- Logic to be Tested ---

// Unit Test: Calcul Total Deviz
const calculateEstimateTotal = (estimate: Pick<Estimate, 'parts' | 'labor' | 'partsDiscount' | 'laborDiscount'>): number => {
    const subtotalParts = estimate.parts.reduce((sum, part) => sum + (part.price * part.quantity), 0);
    const subtotalLabor = estimate.labor.reduce((sum, l) => sum + (l.rate * l.hours), 0);
    const partsDiscountAmount = subtotalParts * (estimate.partsDiscount || 0) / 100;
    const laborDiscountAmount = subtotalLabor * (estimate.laborDiscount || 0) / 100;
    return (subtotalParts - partsDiscountAmount) + (subtotalLabor - laborDiscountAmount);
};

// Unit Test: Logică Stoc
const addStockItem = (items: StockItem[], newItemData: Omit<StockItem, 'id'>): StockItem[] => {
    const newItem: StockItem = { id: `si-${Date.now()}`, ...newItemData };
    return [...items, newItem].sort((a, b) => a.name.localeCompare(b.name));
};
const deleteStockItem = (items: StockItem[], idToDelete: string): StockItem[] => {
    return items.filter(item => item.id !== idToDelete);
};
const filterStockItems = (items: StockItem[], searchTerm: string): StockItem[] => {
    const lowercasedTerm = searchTerm.toLowerCase();
    return items.filter(item => 
        item.name.toLowerCase().includes(lowercasedTerm) ||
        item.sku.toLowerCase().includes(lowercasedTerm) ||
        item.supplier.toLowerCase().includes(lowercasedTerm)
    );
};

// Integration Test: Procesare Deviz și Actualizare Stoc
const processCompletedEstimate = (estimate: Estimate, currentStock: StockItem[]): StockItem[] => {
    if (estimate.status !== EstimateStatus.COMPLETED) {
        return currentStock; // Nu se modifică stocul dacă devizul nu e finalizat
    }
    
    let updatedStock = [...currentStock];
    
    estimate.parts.forEach(partUsed => {
        if (partUsed.stockId) {
            updatedStock = updatedStock.map(stockItem => {
                if (stockItem.id === partUsed.stockId) {
                    return { ...stockItem, quantity: stockItem.quantity - partUsed.quantity };
                }
                return stockItem;
            });
        }
    });

    return updatedStock;
};


// --- Running Tests ---

describe('Logica de Business a Aplicației', () => {

    describe('Calcul Total Deviz', () => {
        it('calculează corect totalul doar cu piese', () => {
            const estimate = { parts: [{ price: 100, quantity: 2 }, { price: 50, quantity: 1 }], labor: [], partsDiscount: 0, laborDiscount: 0 };
            const total = calculateEstimateTotal(estimate as any);
            expect(total).toBe(250);
        });

        it('calculează corect totalul doar cu manoperă', () => {
            const estimate = { parts: [], labor: [{ rate: 150, hours: 2 }, { rate: 100, hours: 1.5 }], partsDiscount: 0, laborDiscount: 0 };
            const total = calculateEstimateTotal(estimate as any);
            expect(total).toBe(450);
        });

        it('calculează corect totalul cu piese și manoperă', () => {
            const estimate = { parts: [{ price: 100, quantity: 1 }], labor: [{ rate: 150, hours: 2 }], partsDiscount: 0, laborDiscount: 0 };
            const total = calculateEstimateTotal(estimate as any);
            expect(total).toBe(400);
        });

        it('aplică corect reducerile la piese și manoperă', () => {
            const estimate = { parts: [{ price: 200, quantity: 1 }], labor: [{ rate: 100, hours: 3 }], partsDiscount: 10, laborDiscount: 20 };
            // Piese: 200 - 10% = 180. Manoperă: 300 - 20% = 240. Total: 180 + 240 = 420.
            const total = calculateEstimateTotal(estimate as any);
            expect(total).toBe(420);
        });

        it('returnează 0 pentru un deviz gol', () => {
            const estimate = { parts: [], labor: [], partsDiscount: 0, laborDiscount: 0 };
            const total = calculateEstimateTotal(estimate as any);
            expect(total).toBe(0);
        });
    });

    describe('Gestiune Stoc', () => {
        const initialStock = [
            { id: '1', name: 'Filtru Ulei', sku: 'HF204', quantity: 10, price: 30, supplier: 'Motodis', lowStockThreshold: 3 },
            { id: '2', name: 'Ulei Motor', sku: 'MOTUL7100', quantity: 5, price: 50, supplier: 'Bardi', lowStockThreshold: 2 },
        ];

        it('adaugă o piesă nouă în stoc și sortează lista', () => {
            const newPartData = { name: 'Bujie', sku: 'NGK123', quantity: 20, price: 25, supplier: 'Motodis', lowStockThreshold: 5 };
            const newStock = addStockItem(initialStock, newPartData);
            expect(newStock.length).toBe(3);
            expect(newStock[0].name).toBe('Bujie'); // 'Bujie' vine prima alfabetic
        });

        it('șterge o piesă din stoc', () => {
            const newStock = deleteStockItem(initialStock, '1');
            expect(newStock.length).toBe(1);
            expect(newStock[0].id).toBe('2');
        });

        it('filtrează piesele după nume, indiferent de majuscule/minuscule', () => {
            const filtered = filterStockItems(initialStock, 'filtru');
            expect(filtered.length).toBe(1);
            expect(filtered[0].name).toBe('Filtru Ulei');
        });

        it('filtrează piesele după SKU', () => {
            const filtered = filterStockItems(initialStock, 'motul7100');
            expect(filtered.length).toBe(1);
            expect(filtered[0].sku).toBe('MOTUL7100');
        });
        
        it('returnează un rezultat gol dacă termenul de căutare nu se potrivește', () => {
            const filtered = filterStockItems(initialStock, 'inexistent');
            expect(filtered.length).toBe(0);
        });
    });

    describe('Test de Integrare: Finalizare Deviz și Impact Stoc', () => {
        it('scade corect cantitatea din stoc după finalizarea unui deviz', () => {
            const stockInitial = [...STOCK_ITEMS_MOCK]; // Folosim o copie a datelor mock
            const filtruUleiInitial = stockInitial.find(p => p.sku === 'HF204');
            const cantitateInitialaFiltru = filtruUleiInitial!.quantity;

            // Simulare deviz care folosește piese din stoc
            const devizFinalizat: Estimate = {
                id: 'est-test',
                estimateNumber: 'TEST-001',
                date: new Date().toISOString(),
                customerName: 'Client Test',
                motorcycleMake: 'Test', motorcycleModel: 'Model', motorcycleYear: 2024,
                motorcycleVin: 'TESTVIN123',
                services: 'Test',
                parts: [
                    { id: 'p-1', name: 'Filtru Ulei Hiflofiltro HF204', quantity: 2, price: 35, stockId: filtruUleiInitial!.id }
                ],
                labor: [],
                status: EstimateStatus.COMPLETED, // Crucial for the test
                customerPhone: '', customerEmail: '',
            };

            // Rulează funcția de procesare
            const stockActualizat = processCompletedEstimate(devizFinalizat, stockInitial);
            
            // Verifică rezultatul
            const filtruUleiActualizat = stockActualizat.find(p => p.sku === 'HF204');
            const cantitateActualizataFiltru = filtruUleiActualizat!.quantity;
            
            expect(cantitateActualizataFiltru).toBe(cantitateInitialaFiltru - 2);
        });
        
        it('nu modifică stocul pentru un deviz care nu este finalizat (status DRAFT)', () => {
            const stockInitial = [...STOCK_ITEMS_MOCK];
            const filtruUleiInitial = stockInitial.find(p => p.sku === 'HF204');

            const devizDraft: Estimate = {
                id: 'est-test-draft',
                estimateNumber: 'TEST-002',
                date: new Date().toISOString(),
                customerName: 'Client Test',
                motorcycleMake: 'Test', motorcycleModel: 'Model', motorcycleYear: 2024,
                motorcycleVin: 'TESTVIN456',
                services: 'Test Draft',
                parts: [
                    { id: 'p-1', name: 'Filtru Ulei Hiflofiltro HF204', quantity: 1, price: 35, stockId: filtruUleiInitial!.id }
                ],
                labor: [],
                status: EstimateStatus.DRAFT, // Status DRAFT
                 customerPhone: '', customerEmail: '',
            };

            const stockDupaProcesare = processCompletedEstimate(devizDraft, stockInitial);
            
            // Stocul ar trebui să fie identic cu cel inițial
            expect(stockDupaProcesare).toEqual(stockInitial);
        });
    });
});

// Într-un mediu real, nu ar fi nevoie de `export default`. Componenta este goală.
// Logica de mai sus s-ar executa automat la rularea suitei de teste.
const TestingSuite: React.FC = () => {
    return null;
};

export default TestingSuite;
