
import { GoogleGenAI, Type, Blob as GenAIBlob, Modality } from "@google/genai";
import { AIPartSuggestion, AIPromotionSuggestion, Estimate, PromotionType, AIPriceSuggestion, AITechnicalData, AIPrediction, PredefinedLabor, AILaborSuggestion, AIReorderSuggestion, StockItem, Supplier, EstimateStatus, Appointment, AIPartSuggestionFromImage, Client, AIMarketingCampaign, AIDamageAnnotationResponseItem, RepairLogEntry, Promotion, LoyaltyTier, JobKit, JobKitLabor } from "../types.ts";

// Helper to remove diacritics from text to prevent header errors.
function normalizeText(text: string): string {
    if (!text) return "";
    // Replaces diacritics with their base characters (e.g., ă -> a).
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// FIX: Updated API error handling to provide more generic messages not tied to local settings.
const handleApiError = (error: unknown): never => {
    console.error("Eroare la apelul Gemini API:", error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID') || error.message.includes('API key is invalid'))) {
        throw new Error("Cheia API pentru serviciul AI nu este validă sau a expirat. Asigurați-vă că este configurată corect în mediul de rulare.");
    }
    throw new Error("Serviciul AI nu este disponibil momentan. Vă rugăm verificați conexiunea la internet.");
};

// Helper function to encode raw audio data to base64
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to create a GenAIBlob object for the API
// FIX: Renamed helper and using GenAIBlob to avoid shadowing global browser Blob type
function createGenAIBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    // The supported audio MIME type is 'audio/pcm'. Do not use other types.
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helper to get API key safely
const getApiKey = (): string | undefined => {
    // Check environment variable first
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        return process.env.API_KEY;
    }
    // Fallback to local storage (manual entry)
    try {
        if (typeof window !== 'undefined') {
            const storedKey = window.localStorage.getItem('gemini-api-key');
            // useLocalStorage stores JSON stringified values
            if (storedKey) {
                return JSON.parse(storedKey);
            }
        }
    } catch (e) {
        console.warn("Failed to retrieve API key from local storage", e);
    }
    return undefined;
};


/**
 * Trimite o descriere a problemei către API-ul Gemini și returnează un diagnostic potențial.
 * @param {string} problemDescription - Descrierea problemei motocicletei.
 * @returns {Promise<string>} - Textul de diagnosticare generat de AI.
 */
export async function getAiDiagnostic(problemDescription: string): Promise<string> {
    if (!problemDescription.trim()) {
        throw new Error("Vă rugăm să introduceți o descriere a problemei.");
    }
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    
    const ai = new GoogleGenAI({ apiKey });

    try {
        const prompt = normalizeText(`Ești un mecanic moto expert cu zeci de ani de experiență. Un client vine cu următoarea problemă la motocicleta sa: "${problemDescription}".
        
        Analizează problema și oferă un diagnostic preliminar. Răspunsul tău trebuie să fie structurat astfel:
        
        **1. Cauze Posibile:**
        - Listează 3-4 cele mai probabile cauze, de la cea mai comună la cea mai rară.
        
        **2. Pași de Diagnosticare Recomandați:**
        - Enumeră pașii pe care un mecanic ar trebui să îi urmeze pentru a confirma cauza. Fii specific (ex: "Măsoară tensiunea bateriei în repaus și în timpul pornirii", "Verifică jocul la cablul de ambreiaj").
        
        **3. Piese Potențial Necesare:**
        - Listează piesele care ar putea fi necesare pentru reparație, în funcție de cauzele posibile.
        
        Fii concis, profesionist și folosește termeni tehnici corecți, dar explică-i pe înțelesul unui alt mecanic. Nu oferi prețuri sau estimări de timp.`);
        
        // FIX: Updated model to gemini-3-flash-preview for standard text analysis
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        // FIX: Handle potentially undefined response.text
        return response.text ?? '';
    } catch (error) {
        handleApiError(error);
    }
}


/**
 * Caută sugestii de piese folosind AI pe baza detaliilor motocicletei și a unei descrieri.
 * @param partDescription Descrierea piesei căutate.
 * @returns O listă de sugestii de piese.
 */
export async function getAiPartSuggestions(
    partDescription: string,
    findAlternatives: boolean = false
): Promise<AIPartSuggestion[]> {
    if (!partDescription.trim()) {
        return [];
    }
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    
    let prompt: string;
    if (findAlternatives) {
        prompt = normalizeText(`Ești un expert în cross-reference pentru piese moto. Găsește alternative compatibile pentru piesa cu codul "${partDescription}". Listează 3-5 alternative de la producători diferiți (ex: EBC, Ferodo, Brembo), cu codurile de produs (SKU) corespunzătoare, un furnizor popular în România și un preț estimativ în RON.`);
    } else {
        prompt = normalizeText(`Ești un expert în piese de motociclete. Un mecanic caută următoarea piesă: "${partDescription}". Sugerează 3-5 piese specifice care se potrivesc acestei descrieri. Pentru fiecare piesă, furnizează un nume complet (inclusiv brand, dacă e relevant), un cod de produs (SKU) comun, un furnizor popular în România și un preț estimativ în RON.`);
    }

    try {
        // FIX: Updated model to gemini-3-flash-preview for structured JSON data task
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            partName: {
                                type: Type.STRING,
                                description: normalizeText("Numele complet si specific al piesei (ex: 'Kit lant DID 525 ZVM-X')."),
                            },
                             sku: {
                                type: Type.STRING,
                                description: normalizeText("Codul de produs (SKU) comun pentru piesa (ex: 'HF204' sau 'FA296HH')."),
                            },
                            supplier: {
                                type: Type.STRING,
                                description: normalizeText("Un furnizor cunoscut din Romania pentru acest tip de piesa (ex: 'Motodis', 'Bardi Auto')."),
                            },
                            estimatedPrice: {
                                type: Type.NUMBER,
                                description: normalizeText("Un pret mediu estimativ in RON pentru piata din Romania."),
                            },
                        },
                        required: ["partName", "sku", "supplier", "estimatedPrice"],
                    },
                },
            },
        });
        
        const text = response.text;
        if (text) {
            const jsonText = text.trim();
            if (jsonText) {
                return JSON.parse(jsonText) as AIPartSuggestion[];
            }
        }
        return [];
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * Identifică o piesă de motocicletă dintr-o imagine.
 * @param base64Image Imaginea codificată în base64.
 * @returns O listă de sugestii de piese.
 */
export async function getAiPartFromImage(base64Image: string): Promise<AIPartSuggestionFromImage[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1],
        },
    };

    const textPart = {
        text: normalizeText(`Analizează această imagine a unei piese de motocicletă. Identifică tipul piesei (ex: filtru de ulei, plăcuță de frână, bujie). Extrage orice marcaj vizibil (brand, cod de produs). Pe baza caracteristicilor vizuale, sugerează 1-3 piese de schimb potențiale, cu nume complet (brand și cod). Oferă o justificare scurtă pentru fiecare sugestie și un preț estimativ în RON. Formatează răspunsul ca un array JSON de obiecte cu cheile "partName", "reasoning" și "estimatedPrice".`),
    };

    try {
        // FIX: Updated model to gemini-3-flash-preview for multimodal image analysis task
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [textPart, imagePart] },
        });

        const text = response.text;
        if (text) {
            const jsonText = text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
            if (jsonText) {
                return JSON.parse(jsonText) as AIPartSuggestionFromImage[];
            }
        }
        return [];
    } catch (error) {
        handleApiError(error);
    }
}


/**
 * Generează un plan de service AI.
 */
export async function getAiServicePlan(motorcycleInfo: { make: string; model: string; year: number; mileage?: number }): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = normalizeText(`Ești un șef de service moto. Generează un plan de service detaliat pentru o motocicletă ${motorcycleInfo.make} ${motorcycleInfo.model} din ${motorcycleInfo.year} cu ${motorcycleInfo.mileage || 'un kilometraj necunoscut'} km. Include operațiunile standard de revizie (schimb ulei, filtre), verificări esențiale (frâne, anvelope, transmisie, lichide, sistem electric) și orice recomandări specifice bazate pe kilometraj, dacă este disponibil. Formatează răspunsul ca o listă clară de operațiuni.`);
    try {
        // FIX: Updated model to gemini-3-flash-preview for text generation
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // FIX: Handle potentially undefined response.text
        return response.text ?? '';
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * Analizează imagini ale unei motociclete pentru a detecta daune.
 */
export async function getAiImageAnalysis(base64Images: string[]): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = base64Images.map(base64String => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64String.split(',')[1],
        },
    }));

    const textPart = {
        text: normalizeText("Analizează aceste imagini ale unei motociclete și listează punctual orice daună estetică vizibilă (zgârieturi, lovituri, rugină, carene crăpate, etc.). Fii specific în legătură cu locația fiecărei daune. Dacă nu sunt daune vizibile, menționează acest lucru.")
    };

    try {
        // FIX: Updated model to gemini-3-flash-preview for vision task
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [textPart, ...imageParts] },
        });
        // FIX: Handle potentially undefined response.text
        return response.text ?? '';
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * Extrage textul unui VIN dintr-o imagine.
 * @param base64Image Imaginea codificată în base64.
 * @returns O promisiune care se rezolvă cu string-ul VIN.
 */
export async function getVinFromImage(base64Image: string): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1],
        },
    };

    const textPart = {
        text: normalizeText("Extract the 17-character vehicle identification number (VIN) from this image. Respond with only the VIN, nothing else."),
    };

    try {
        // FIX: Updated model to gemini-3-flash-preview for vision-to-text task
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [textPart, imagePart] },
        });
        
        // FIX: Handle potentially undefined response.text to prevent crash on .replace()
        // Clean up the response to get only the VIN
        return response.text?.replace(/[^A-Z0-9]/g, '').trim() ?? '';
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiPriceSuggestion(
    laborDescription: string,
    motorcycleInfo: { make: string; model: string; year: number },
    workshopWorkloadPercent: number
): Promise<AIPriceSuggestion> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = normalizeText(`Ești un consultant de prețuri pentru un service moto.
    Operațiune: "${laborDescription}"
    Motocicletă: ${motorcycleInfo.make} ${motorcycleInfo.model} ${motorcycleInfo.year}
    Grad de ocupare service: ${workshopWorkloadPercent.toFixed(0)}%

    Sugerează un tarif orar (RON/oră) pentru această operațiune. Ia în considerare complexitatea, tipul motocicletei și gradul de ocupare (un grad mai mare poate justifica un preț ușor mai mare).
    Oferă și o scurtă justificare pentru prețul sugerat.`);

    try {
        // FIX: Updated model to gemini-3-flash-preview for pricing advisory task
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestedRate: {
                            type: Type.NUMBER,
                            description: normalizeText("Tariful orar sugerat in RON."),
                        },
                        reasoning: {
                            type: Type.STRING,
                            description: normalizeText("Justificarea pentru tariful sugerat."),
                        },
                    },
                    required: ["suggestedRate", "reasoning"],
                },
            },
        });

        // FIX: Handle potentially undefined response.text to prevent crash on .trim() and JSON.parse()
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("AI returned an empty response.");
        }
        return JSON.parse(jsonText) as AIPriceSuggestion;
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiClientSummary(estimate: Estimate, garageName: string): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = normalizeText(`Ești un consultant de service auto. Rezumă următorul deviz pentru client într-un limbaj simplu, prietenos și profesionist.
    Nume Service: ${garageName}
    Client: ${estimate.customerName}
    Motocicletă: ${estimate.motorcycleYear} ${estimate.motorcycleMake} ${estimate.motorcycleModel}
    Servicii efectuate: ${estimate.services}
    Piese folosite: ${estimate.parts.map(p => `${p.name} (x${p.quantity})`).join(', ')}
    
    Explică pe scurt ce s-a făcut și de ce a fost important. Menționează starea actuală a motocicletei. Folosește formatare Markdown (ex: **titluri**).`);

    try {
        // FIX: Updated model to gemini-3-flash-preview for summarization task
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // FIX: Handle potentially undefined response.text
        return response.text ?? '';
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiReadyForPickupSms(estimate: Estimate, garageName: string): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = normalizeText(`Generează un SMS scurt și profesionist pentru a-l informa pe ${estimate.customerName} că motocicleta sa (${estimate.motorcycleMake} ${estimate.motorcycleModel}) este gata de ridicare de la service-ul ${garageName}. Include numărul devizului (${estimate.estimateNumber}).`);
    try {
        // FIX: Updated model to gemini-3-flash-preview for short text generation
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // FIX: Handle potentially undefined response.text
        return response.text ?? '';
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiFollowUpSms(estimate: Estimate): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = normalizeText(`Generează un SMS de follow-up prietenos pentru ${estimate.customerName}, la o săptămână după ce și-a ridicat motocicleta (${estimate.motorcycleMake} ${estimate.motorcycleModel}). Întreabă dacă totul este în regulă cu motocicleta și încurajează-l să lase un review dacă este mulțumit.`);
    try {
        // FIX: Updated model to gemini-3-flash-preview for marketing text generation
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // FIX: Handle potentially undefined response.text
        return response.text ?? '';
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiLaborIdeas(existingLabor: PredefinedLabor[]): Promise<AILaborSuggestion[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const existingDescriptions = existingLabor.map(l => l.description).join(', ');
    const prompt = normalizeText(`Ești managerul unui service moto. Vreau să extind lista de operațiuni predefinite.
    Operațiuni existente: ${existingDescriptions}.
    Sugerează 5 operațiuni comune de manoperă care lipsesc din listă, împreună cu un tarif orar mediu (RON/oră) pentru fiecare, pentru piața din România.`);

    try {
        // FIX: Updated model to gemini-3-flash-preview for creative listing task
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING, description: "Descrierea operațiunii." },
                            rate: { type: Type.NUMBER, description: "Tariful orar sugerat în RON." },
                        },
                        required: ["description", "rate"],
                    },
                },
            },
        });

        // FIX: Handle potentially undefined response.text to prevent crash on .trim() and JSON.parse()
        const jsonText = response.text?.trim();
        if (!jsonText) {
            return [];
        }
        return JSON.parse(jsonText) as AILaborSuggestion[];
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiAppointmentReminderSms(appointment: Appointment): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = normalizeText(`Generează un SMS de reamintire pentru o programare.
    Client: ${appointment.customerName}
    Data: ${appointment.date}
    Ora: ${appointment.time}
    Motocicletă: ${appointment.motorcycle}
    Motiv: ${appointment.description}
    Mesajul trebuie să fie scurt, prietenos și să confirme detaliile.`);
    try {
        // FIX: Updated model to gemini-3-flash-preview for text generation
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // FIX: Handle potentially undefined response.text
        return response.text ?? '';
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiReportSummary(reportData: any): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = normalizeText(`Ești un consultant de business pentru un service moto. Analizează următoarele date de performanță și generează un raport sumar cu observații cheie și recomandări. Fii concis și la obiect. Folosește formatare Markdown.
    Date: ${JSON.stringify(reportData, null, 2)}`);
    try {
        // FIX: Updated model to gemini-3-pro-preview for complex data analysis
        const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
        // FIX: Handle potentially undefined response.text
        return response.text ?? '';
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiDamageReport(data: { parts: string[], labor: JobKitLabor[], annotations: string[] }): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = normalizeText(`Generează un raport de daune pentru o companie de asigurări.
    Piese necesare: ${data.parts.join(', ') || 'Niciuna'}.
    Manopere necesare: ${data.labor.map(l => l.description).join(', ') || 'Niciuna'}.
    Adnotări foto: ${data.annotations.join('; ') || 'Niciuna'}.
    Descrie daunele și justifică necesitatea reparațiilor într-un limbaj tehnic și formal.`);
    try {
        // FIX: Updated model to gemini-3-flash-preview for structured text generation
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // FIX: Handle potentially undefined response.text
        return response.text ?? '';
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiManualSearch(query: string): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = normalizeText(`Ești un asistent tehnic expert în manuale de service pentru motociclete. Răspunde la următoarea întrebare tehnică: "${query}". Fii precis, oferă date exacte (valori, coduri piese, pași) și specifică sursa (modelul manualului, dacă e posibil). Dacă nu ești sigur, menționează acest lucru.`);
    try {
        // FIX: Updated model to gemini-3-pro-preview for advanced technical reasoning
        const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
        // FIX: Handle potentially undefined response.text
        return response.text ?? '';
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiTechnicalData(motorcycleInfo: { make: string; model: string; year: number }): Promise<AITechnicalData> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = normalizeText(`Furnizează datele tehnice esențiale pentru revizia unei motociclete: ${motorcycleInfo.year} ${motorcycleInfo.make} ${motorcycleInfo.model}.
    Caută următoarele informații și returnează-le în format JSON: tip ulei motor, cantitate ulei cu filtru, cantitate ulei fără filtru, cod bujii, cod filtru aer, cod filtru ulei, tip antigel, cantitate antigel.`);

    try {
        // FIX: Updated model to gemini-3-flash-preview for structured data extraction
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        oilType: { type: Type.STRING },
                        oilQuantityWithFilter: { type: Type.STRING },
                        oilQuantityWithoutFilter: { type: Type.STRING },
                        sparkPlugs: { type: Type.STRING },
                        airFilter: { type: Type.STRING },
                        oilFilter: { type: Type.STRING },
                        coolantType: { type: Type.STRING },
                        coolantQuantity: { type: Type.STRING }
                    },
                    required: ["oilType", "oilQuantityWithFilter", "oilFilter"]
                },
            },
        });

        // FIX: Handle potentially undefined response.text to prevent crash on .trim() and JSON.parse()
        const jsonText = response.text?.trim();
        if (!jsonText) {
            throw new Error("AI returned an empty response.");
        }
        return JSON.parse(jsonText) as AITechnicalData;
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiMaintenancePrediction(motorcycleInfo: { make: string; model: string; year: number }, history: Estimate[]): Promise<AIPrediction[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = normalizeText(`Ești un AI de mentenanță predictivă pentru motociclete.
    Motocicletă: ${motorcycleInfo.year} ${motorcycleInfo.make} ${motorcycleInfo.model}.
    Istoric Service: ${JSON.stringify(history.map(e => ({ date: e.date, mileage: e.mileageIn, services: e.services })))}.
    
    Pe baza acestor date, anticipează 3-5 operațiuni de mentenanță viitoare. Pentru fiecare, specifică componenta, recomandarea (ex: 'Înlocuire'), o justificare bazată pe istoric sau intervale standard și un nivel de urgență (LOW, MEDIUM, HIGH).`);

    try {
        // FIX: Updated model to gemini-3-pro-preview for predictive analysis
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            componentName: { type: Type.STRING },
                            recommendation: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
                            urgency: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] }
                        },
                        required: ["componentName", "recommendation", "reasoning", "urgency"]
                    }
                }
            }
        });
        // FIX: Handle potentially undefined response.text to prevent crash on .trim() and JSON.parse()
        const jsonText = response.text?.trim();
        if (!jsonText) {
            return [];
        }
        return JSON.parse(jsonText) as AIPrediction[];
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiPromotionIdeas(existingPromotions: Promotion[]): Promise<AIPromotionSuggestion[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = normalizeText(`Ești un consultant de marketing pentru un service moto.
    Promoții existente: ${existingPromotions.map(p => p.name).join(', ')}.
    Sugerează 3 campanii promoționale noi, creative. Pentru fiecare, oferă un nume, o descriere, tipul (LABOR_PERCENTAGE sau PARTS_PERCENTAGE) și o valoare (procent).`);

    try {
        // FIX: Updated model to gemini-3-flash-preview for creative ideation task
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            type: { type: Type.STRING, enum: [PromotionType.LABOR_PERCENTAGE, PromotionType.PARTS_PERCENTAGE] },
                            value: { type: Type.NUMBER }
                        },
                        required: ["name", "description", "type", "value"]
                    }
                }
            }
        });
        // FIX: Handle potentially undefined response.text to prevent crash on .trim() and JSON.parse()
        const jsonText = response.text?.trim();
        if (!jsonText) {
            return [];
        }
        return JSON.parse(jsonText) as AIPromotionSuggestion[];
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiMarketingCampaigns(clients: Client[]): Promise<AIMarketingCampaign[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = normalizeText(`Ești un strateg de marketing pentru un service moto.
    Analizează această listă de clienți (nume, telefon, nivel loialitate, istoric cheltuieli): ${JSON.stringify(clients.map(c => ({ name: c.name, phone: c.phone, tier: c.loyaltyTier, spent: c.totalSpent })))}.
    Identifică 2-3 segmente de clienți (ex: clienți noi, clienți VIP, clienți inactivi) și propune o campanie SMS personalizată pentru fiecare. Pentru fiecare campanie, oferă un titlu, o descriere a publicului țintă, raționamentul AI, o listă cu numerele de telefon țintă și un text propus pentru SMS.`);

    try {
        // FIX: Updated model to gemini-3-pro-preview for marketing strategy task
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            targetAudienceDescription: { type: Type.STRING },
                            targetClientPhones: { type: Type.ARRAY, items: { type: Type.STRING } },
                            aiRationale: { type: Type.STRING },
                            proposedSms: { type: Type.STRING }
                        },
                        required: ["title", "targetAudienceDescription", "targetClientPhones", "aiRationale", "proposedSms"]
                    }
                }
            }
        });
        // FIX: Handle potentially undefined response.text to prevent crash on .trim() and JSON.parse()
        const jsonText = response.text?.trim();
        if (!jsonText) {
            return [];
        }
        return JSON.parse(jsonText) as AIMarketingCampaign[];
    } catch (error) {
        handleApiError(error);
    }
}

export async function getAiReorderSuggestions(stockItems: StockItem[], estimates: Estimate[], suppliers: Supplier[]): Promise<AIReorderSuggestion[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = normalizeText(`Ești un AI de management al stocurilor.
    Stoc Curent: ${JSON.stringify(stockItems.map(i => ({ sku: i.sku, name: i.name, qty: i.quantity, threshold: i.lowStockThreshold, supplier: i.supplier })))}.
    Istoric Utilizare (piese din devize finalizate): ${JSON.stringify(estimates.filter(e => e.status === EstimateStatus.COMPLETED).flatMap(e => e.parts.map(p => ({ name: p.name, qty: p.quantity }))))}.
    Furnizori: ${JSON.stringify(suppliers.map(s => ({ id: s.id, name: s.name })))}.

    Analizează datele și propune comenzi de reaprovizionare. Grupează produsele pe furnizor. Sugerează o cantitate de comandat pentru fiecare produs pe baza stocului redus și a popularității. Oferă un motiv scurt pentru fiecare sugestie.`);
    
    try {
        // FIX: Updated model to gemini-3-pro-preview for inventory data analysis
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            supplierId: { type: Type.STRING },
                            items: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        sku: { type: Type.STRING },
                                        name: { type: Type.STRING },
                                        quantity: { type: Type.NUMBER },
                                        reason: { type: Type.STRING }
                                    },
                                    required: ["sku", "name", "quantity", "reason"]
                                }
                            }
                        },
                        required: ["supplierId", "items"]
                    }
                }
            }
        });
        // FIX: Handle potentially undefined response.text to prevent crash on .trim() and JSON.parse()
        const jsonText = response.text?.trim();
        if (!jsonText) {
            return [];
        }
        return JSON.parse(jsonText) as AIReorderSuggestion[];
    } catch (error) {
        handleApiError(error);
    }
}

export async function startRepairLogSession(callbacks: {
    onTranscription: (text: string, isFinal: boolean) => void,
    onError: (e: Error) => void,
    onClose: () => void
}) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // FIX: Accumulate transcription text to provide a full sentence at the end.
    let currentTranscription = '';

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => console.log('Live session opened.'),
            onmessage: (message) => {
                if (message.serverContent?.inputTranscription) {
                    currentTranscription += message.serverContent.inputTranscription.text;
                }
            
                if (message.serverContent?.turnComplete) {
                    if (currentTranscription.trim()) {
                        callbacks.onTranscription(currentTranscription, true);
                    }
                    currentTranscription = ''; // Reset for the next utterance.
                }
            },
            // FIX: Live API callbacks pass standard Error objects for errors
            onerror: callbacks.onError,
            onclose: callbacks.onClose,
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {}, // Enable transcription for user audio input.
            systemInstruction: "You are an audio transcription service. Only transcribe what you hear. Do not add comments or try to answer questions. Simply output the transcribed text."
        }
    });

    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const source = inputAudioContext.createMediaStreamSource(stream);
    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        // FIX: Using renamed helper function to avoid shadowing global browser Blob
        const pcmGenAIBlob = createGenAIBlob(inputData);
        sessionPromise.then((session) => {
            session.sendRealtimeInput({ media: pcmGenAIBlob });
        });
    };
    source.connect(scriptProcessor);
    scriptProcessor.connect(inputAudioContext.destination);

    const stop = () => {
        stream.getTracks().forEach(track => track.stop());
        scriptProcessor.disconnect();
        source.disconnect();
        inputAudioContext.close();
        sessionPromise.then(session => session.close());
    };
    
    return { session: await sessionPromise, stop };
}

export async function startAudioDiagnosticSession(callbacks: {
    onTranscription: (text: string, isFinal: boolean) => void;
    onError: (e: Error) => void;
    onClose: () => void;
}) {
    return startRepairLogSession(callbacks); // Re-use the same logic for now
}

export async function getAiImageDamageAnalysis(base64Images: string[]): Promise<AIDamageAnnotationResponseItem[]> {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });
    
    const imageParts = base64Images.map(base64String => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64String.split(',')[1],
        },
    }));

    const textPart = {
        text: normalizeText("Analizează aceste imagini ale unei motociclete avariate. Pentru fiecare imagine, identifică și localizează daunele vizibile. Returnează un array JSON de obiecte, unde fiecare obiect corespunde unei imagini (folosind `imageIndex`). Fiecare obiect trebuie să conțină o listă de adnotări (`annotations`), unde fiecare adnotare are coordonate `x`, `y` (procentual, 0-100) și o `description` a daunei.")
    };
    
    try {
        // FIX: Updated model to gemini-3-flash-preview for multimodal Vision analysis task
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [textPart, ...imageParts] },
        });
        // FIX: Handle potentially undefined response.text to prevent crash on .trim() and JSON.parse()
        const jsonText = response.text?.trim().replace(/^```json\n?/, '').replace(/```$/, '');
        if (!jsonText) {
            return [];
        }
        return JSON.parse(jsonText) as AIDamageAnnotationResponseItem[];
    } catch (error) {
        handleApiError(error);
    }
}
