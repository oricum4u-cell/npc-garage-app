import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getAiPartSuggestions } from '../services/geminiService.ts';
import { AIPartSuggestion } from '../types.ts';

interface AIPartsFinderProps {
    onSelectPart: (suggestion: AIPartSuggestion) => void;
    onClose: () => void;
}

const AIPartsFinder: React.FC<AIPartsFinderProps> = ({ onSelectPart, onClose }) => {
    const { t } = useLanguage();
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState<AIPartSuggestion[]>([]);
    const [findAlternatives, setFindAlternatives] = useState(false);

    const handleSearch = async () => {
        if (!description.trim()) {
            setError('Vă rugăm introduceți o descriere.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSuggestions([]);
        try {
            const results = await getAiPartSuggestions(description, findAlternatives);
            setSuggestions(results);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'A apărut o eroare necunoscută.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50">
                    <h3 className="text-xl font-bold text-white">Asistent AI Găsire Piesă</h3>
                </header>
                
                <div className="p-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="ex: 'filtru ulei Honda CBR' sau cod piesă 'HF204'"
                            className="flex-grow futuristic-input p-2"
                            autoFocus
                        />
                        <button onClick={handleSearch} disabled={isLoading} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">
                            {isLoading ? '...' : 'Caută'}
                        </button>
                    </div>
                    <div className="mt-2 flex items-center">
                        <input
                            type="checkbox"
                            id="find-alternatives"
                            checked={findAlternatives}
                            onChange={(e) => setFindAlternatives(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="find-alternatives" className="ml-2 text-sm text-gray-300">
                            Găsește alternative pentru codul de piesă de mai sus
                        </label>
                    </div>
                </div>

                <div className="flex-grow p-4 overflow-y-auto">
                    {isLoading && <div className="text-center text-gray-400">AI-ul caută piese...</div>}
                    {error && <div className="text-center text-red-400">{error}</div>}
                    {suggestions.length > 0 && (
                        <div className="space-y-3">
                            {suggestions.map((s, i) => (
                                <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-primary-300">{s.partName}</p>
                                            <p className="text-sm text-gray-300">SKU: <span className="font-mono">{s.sku}</span></p>
                                            <p className="text-xs text-gray-400">Furnizor: {s.supplier} | Preț Est: {s.estimatedPrice} RON</p>
                                        </div>
                                        <button onClick={() => onSelectPart(s)} className="bg-green-500/30 text-green-200 font-semibold py-1 px-3 text-sm rounded-lg transition-colors border border-green-500/50 hover:bg-green-500/40">
                                            Folosește
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl">
                    <button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors border border-gray-600 hover:bg-gray-500/40">
                        Închide
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AIPartsFinder;