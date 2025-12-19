import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { getAiManualSearch } from '../services/geminiService.ts';
import MarkdownRenderer from './MarkdownRenderer.tsx';

interface ChatMessage {
    sender: 'user' | 'ai' | 'error';
    text: string;
}

const RepairManualFinder: React.FC = () => {
    const { t } = useLanguage();
    const [messages, setMessages] = useState<ChatMessage[]>([
        { sender: 'ai', text: "Salut! Sunt ManualBot, asistentul tău tehnic. Cere-mi o procedură de reparație (ex: 'pași pentru schimb simeringuri furcă Suzuki GSX-R 750 2012') sau o dată tehnică specifică ('cuplu strângere ax roată față Yamaha R6 2018')." }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = inputValue.trim();
        if (!query || isLoading) return;

        setMessages(prev => [...prev, { sender: 'user', text: query }]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await getAiManualSearch(query);
            setMessages(prev => [...prev, { sender: 'ai', text: response }]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t('manualFinder.genericError');
            setMessages(prev => [...prev, { sender: 'error', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
                 <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-full text-primary-600 dark:text-primary-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zM7 7a1 1 0 011-1h2a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 100 2h2a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                 </div>
                 <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Asistent Tehnic AI</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('manualFinder.subtitle')}</p>
                 </div>
            </header>

            <main className="flex-1 p-6 overflow-y-auto space-y-6">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex gap-3 animate-fade-in-up ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender !== 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                                <span className="text-lg">{msg.sender === 'ai' ? '🤖' : '⚠️'}</span>
                            </div>
                        )}
                        <div className={`max-w-xl p-3 rounded-lg ${
                            msg.sender === 'user' ? 'bg-primary-600 text-white' : 
                            msg.sender === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                           <MarkdownRenderer content={msg.text} />
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                            <span className="text-lg">🤖</span>
                        </div>
                        <div className="max-w-xl p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                           <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                <span>{t('manualFinder.loading')}</span>
                           </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={t('manualFinder.placeholder')}
                        className="flex-1 p-3 futuristic-input"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !inputValue.trim()} className="p-3 bg-primary-600/50 text-primary-200 rounded-lg transition-all duration-200 border-2 border-primary-500/80 hover:bg-primary-500/70 hover:border-primary-500/100 disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
                </form>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">{t('manualFinder.disclaimer')}</p>
            </footer>
        </div>
    );
};

export default RepairManualFinder;