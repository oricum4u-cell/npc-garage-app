import React, { useState, useEffect } from 'react';

const WeatherWidget: React.FC = () => {
    const [weather, setWeather] = useState<{ temp: number, code: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchWeatherData = async (latitude: number, longitude: number) => {
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
                );
                if (!response.ok) throw new Error('Weather API request failed');
                const data = await response.json();
                if (data && data.current_weather) {
                    setWeather({
                        temp: Math.round(data.current_weather.temperature),
                        code: data.current_weather.weathercode
                    });
                    setError(null);
                } else {
                     throw new Error("Invalid API response");
                }
            } catch (e) {
                console.error("Weather data fetch failed", e);
                setError("API Error");
            } finally {
                setLoading(false);
            }
        };

        const fetchByIp = async () => {
            console.log("Falling back to IP-based geolocation.");
            try {
                // Using a more robust service that is less likely to be blocked and uses HTTPS
                const ipGeoResponse = await fetch(`https://ipinfo.io/json`);
                if (!ipGeoResponse.ok) throw new Error('IP Geolocation request failed');
                const ipGeoData = await ipGeoResponse.json();
                if (ipGeoData.loc) {
                    const [latitude, longitude] = ipGeoData.loc.split(',');
                    await fetchWeatherData(parseFloat(latitude), parseFloat(longitude));
                } else {
                    throw new Error('IP Geolocation failed: No location data in response.');
                }
            } catch (e) {
                console.error("IP-based weather fetch failed", e);
                setError("IP Location Failed");
                setLoading(false);
            }
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeatherData(position.coords.latitude, position.coords.longitude);
                },
                (geoError) => {
                    console.warn(`Geolocation failed: ${geoError.message}. Falling back to IP.`);
                    fetchByIp();
                }, 
                { timeout: 5000 } // 5-second timeout for geolocation
            );
        } else {
            console.warn("Geolocation not supported by this browser. Falling back to IP.");
            fetchByIp();
        }
    }, []);

    if (loading) {
        return <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50 text-gray-500 animate-pulse"><div className="h-5 w-5 bg-gray-700 rounded-full"></div><div className="h-4 w-10 bg-gray-700 rounded"></div></div>;
    }
    
    if (error || !weather) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50 text-gray-500" title={`Eroare la încărcarea vremii: ${error || 'Date indisponibile'}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                <span className="text-xs font-bold font-mono">--°C</span>
            </div>
        );
    }


    // Simple WMO code mapping
    const getWeatherIcon = (code: number) => {
        if (code <= 1) return ( // Clear/Mainly Clear
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
        );
        if (code <= 3) return ( // Partly Cloudy
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
            </svg>
        );
        if (code >= 51 && code <= 67) return ( // Rain
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414A4.002 4.002 0 0112 6.083 4.001 4.001 0 0114.707 12.293l.293.293a1 1 0 01-1.414 1.414L13.586 14l.707.707a1 1 0 01-1.414 1.414L12.586 16l-.293-.293a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707.293.293a1 1 0 01-1.414 1.414L11.586 18l-1.707-1.707a1 1 0 011.414-1.414l.293.293.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414L9.293 19.707a1 1 0 01-1.414-1.414l.293-.293-.707-.707a1 1 0 011.414-1.414l.707.707z" clipRule="evenodd" />
                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
            </svg>
        );
        if (code >= 71) return ( // Snow/Other
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 14a1 1 0 011-1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011 1zm-3-5a1 1 0 011-1h1a1 1 0 110 2H10v1a1 1 0 11-2 0V8H7a1 1 0 110-2h1V5a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
        );
        return ( // Default Cloud
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
            </svg>
        );
    };

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50 text-gray-300">
            {getWeatherIcon(weather.code)}
            <span className="text-xs font-bold font-mono">{weather.temp}°C</span>
        </div>
    );
};

export default WeatherWidget;