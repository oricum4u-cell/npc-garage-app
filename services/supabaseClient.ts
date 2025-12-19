
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

/**
 * Gets the singleton Supabase client instance.
 * Initializes the client on first call by reading credentials from localStorage.
 * Returns null if credentials are not found or invalid, allowing the app to run in a "setup" mode.
 */
export const getSupabase = (): SupabaseClient | null => {
    // Return existing instance if already created
    if (supabase) {
        return supabase;
    }

    try {
        const credentialsString = localStorage.getItem('supabase-credentials');
        if (!credentialsString) {
            console.warn("Supabase credentials not found in localStorage.");
            return null;
        }

        const credentials = JSON.parse(credentialsString);
        const { url, key } = credentials;

        // Basic validation & SANITIZATION
        if (typeof url === 'string' && url && typeof key === 'string' && key) {
            // Remove trailing slash if it exists, as it can cause issues.
            const sanitizedUrl = url.trim().replace(/\/$/, '');
            
            // Create and cache the client instance
            supabase = createClient(sanitizedUrl, key);
            return supabase;
        }
        
        console.warn("Invalid Supabase credentials found in localStorage.");
        return null;

    } catch (error) {
        console.error("Failed to initialize Supabase client:", error);
        return null;
    }
};