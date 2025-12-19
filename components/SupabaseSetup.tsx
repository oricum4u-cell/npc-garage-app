import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';

interface SupabaseSetupProps {
    onConfigSaved: () => void;
}

const SupabaseSetup: React.FC<SupabaseSetupProps> = ({ onConfigSaved }) => {
    const [url, setUrl] = useState('');
    const [key, setKey] = useState('');
    const [error, setError] = useState('');

    const handleSave = () => {
        if (!url.trim() || !key.trim()) {
            setError('Te rugăm să completezi ambele câmpuri.');
            return;
        }
        
        // Basic validation
        if (!url.startsWith('https://')) {
            setError('URL-ul trebuie să înceapă cu https://');
            return;
        }

        try {
            localStorage.setItem('supabase-credentials', JSON.stringify({ url: url.trim(), key: key.trim() }));
            onConfigSaved();
        } catch (e) {
            setError('Eroare la salvarea datelor local.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 font-sans text-white">
            <div className="w-full max-w-md bg-gray-800 border border-primary-500/30 p-8 rounded-2xl shadow-2xl animate-fade-in">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black tracking-wider text-white mb-2">
                        NPC <span className="text-primary-500">GARAGE</span>
                    </h1>
                    <p className="text-gray-400 text-sm uppercase tracking-widest">Configurare Inițială Bază de Date</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg text-sm text-blue-200">
                        <p>Pentru a conecta aplicația la baza de date live, introdu datele din panoul tău Supabase:</p>
                        <p className="mt-2 font-mono text-xs">Project Settings -&gt; API</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Project URL</label>
                        <input 
                            type="text" 
                            value={url} 
                            onChange={(e) => setUrl(e.target.value)} 
                            placeholder="https://xyz.supabase.co"
                            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">API Key (anon public)</label>
                        <input 
                            type="password" 
                            value={key} 
                            onChange={(e) => setKey(e.target.value)} 
                            placeholder="eyJxh..."
                            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-primary-500 outline-none transition-colors"
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-500/20">{error}</p>}

                    <button 
                        onClick={handleSave}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-900/50 transition-all hover:scale-[1.02]"
                    >
                        Conectează și Pornește
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupabaseSetup;
