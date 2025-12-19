import { Recall } from '../types.ts';

export interface VinDetails {
    make: string;
    model: string;
    year: number;
}

/**
 * Fetches motorcycle details from the NHTSA VIN Decoder API.
 * This is a live service that makes an internet call.
 * @param vin The Vehicle Identification Number.
 * @returns A promise that resolves with the motorcycle details or null if not found.
 */
export const getMotorcycleDetailsByVin = async (vin: string): Promise<VinDetails | null> => {
    console.log(`Searching for VIN online: ${vin}`);
    
    // The NHTSA API is a free, public service.
    const apiUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`;

    try {
        // Use a timeout mechanism for the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

        const response = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`API request failed with status: ${response.status}`);
            return null;
        }

        const data = await response.json();
        
        // Check if the API returned valid results
        if (data.Results && data.Results.length > 0) {
            const details = data.Results[0];
            
            // Check for error code from the API itself
            if (details.ErrorCode && details.ErrorCode !== "0") {
                 console.warn(`VIN decoder API returned an error: ${details.ErrorText}`);
                 return null;
            }

            const make = details.Make;
            const model = details.Model;
            const year = parseInt(details.ModelYear, 10);

            if (make && model && year) {
                return { make, model, year };
            }
        }
        
        return null; // VIN not found or data is incomplete

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error("VIN details fetch timed out.");
        } else {
            console.error("Error fetching VIN details:", error);
        }
        // Could be a network error, CORS issue, timeout etc.
        return null;
    }
};

/**
 * Fetches vehicle recall information from the NHTSA API.
 * This is a live service that makes an internet call.
 * @param make The vehicle's make.
 * @param model The vehicle's model.
 * @param year The vehicle's model year.
 * @returns A promise that resolves with an array of recall information or null on error.
 */
export const getRecallsByVehicle = async (make: string, model: string, year: number): Promise<Recall[] | null> => {
    console.log(`Searching for recalls online for: ${year} ${make} ${model}`);
    
    const apiUrl = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

        const response = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`Recall API request failed with status: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (data && data.results && data.results.length > 0) {
            const recalls: Recall[] = data.results.map((item: any) => ({
                campaignNumber: item.NHTSACampaignNumber,
                date: item.ReportReceivedDate, // Return raw date string for component to format
                component: item.Component,
                summary: item.Summary,
            }));
            return recalls;
        }
        
        return []; // No recalls found is a valid response, return an empty array.

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error("Recalls fetch timed out.");
        } else {
            console.error("Error fetching recalls:", error);
        }
        return null; // Return null to indicate an error occurred.
    }
};