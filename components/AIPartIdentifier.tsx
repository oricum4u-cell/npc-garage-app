import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { AIPartSuggestionFromImage } from '../types.ts';
import { getAiPartFromImage } from '../services/geminiService.ts';

interface AIPartIdentifierProps {
    onSelectPart: (suggestion: AIPartSuggestionFromImage) => void;
    onClose: () => void;
}

const AIPartIdentifier: React.FC<AIPartIdentifierProps> = ({ onSelectPart, onClose }) => {
    const [image, setImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState<AIPartSuggestionFromImage[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(reader.result as string);
                setError('');
                setSuggestions([]);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: false
    });

    const handleIdentify = async () => {
        if (!image) return;
        setIsLoading(true);
        setError('');
        setSuggestions([]);
        try {
            const results = await getAiPartFromImage(image);
            if (results.length === 0) {
                setError('Nu am putut identifica piesa. Încearcă o fotografie mai clară.');
            } else {
                setSuggestions(results);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'A apărut o eroare necunoscută.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setImage(null);
        setSuggestions([]);
        setError('');
        setIsLoading(false);
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50">
                    <h3 className="text-xl font-bold text-white">Identifică Piesă cu Camera</h3>
                </header>

                <main className="flex-grow p-6 overflow-y-auto">
                    {isLoading ? (
                         <div className="text-center py-16"><div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="mt-4 text-gray-300">AI-ul analizează imaginea...</p></div>
                    ) : suggestions.length > 0 ? (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-primary-300">Sugestii Găsite:</h4>
                             {suggestions.map((s, i) => (
                                <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-grow">
                                            <p className="font-bold text-white">{s.partName}</p>
                                            <p className="text-xs text-gray-400 italic mt-1">"{s.reasoning}"</p>
                                            <p className="text-sm font-semibold text-primary-400 mt-2">Preț Est: {s.estimatedPrice} RON</p>
                                        </div>
                                        <button onClick={() => onSelectPart(s)} className="bg-green-500/30 text-green-200 font-semibold py-1 px-3 text-sm rounded-lg border border-green-500/50 hover:bg-green-500/40 flex-shrink-0">
                                            Adaugă la Stoc
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:border-primary-500 transition-colors ${isDragActive ? 'border-primary-500 bg-primary-900/20' : 'border-gray-600'}`}>
                            <input {...getInputProps()} />
                            {image ? (
                                <img src={image} alt="Previzualizare piesă" className="max-h-64 mx-auto rounded-md" />
                            ) : (
                                <div className="text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <p className="mt-2">Trage o poză a piesei aici sau fă clic pentru a selecta</p>
                                    <p className="text-xs mt-1">Pentru rezultate optime, folosește o poză clară, pe un fundal neutru.</p>
                                </div>
                            )}
                        </div>
                    )}
                     {error && <p className="text-center text-red-400 mt-4">{error}</p>}
                </main>

                <footer className="p-4 bg-gray-950/50 flex justify-between items-center rounded-b-xl">
                    <button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">Închide</button>
                    {(image || suggestions.length > 0 || error) && (
                        <button onClick={handleReset} className="text-sm text-amber-400 hover:text-amber-300 underline">Încearcă din Nou</button>
                    )}
                    {image && !isLoading && suggestions.length === 0 && (
                        <button onClick={handleIdentify} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">Identifică Piesa</button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default AIPartIdentifier;