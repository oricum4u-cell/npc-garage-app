
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';

interface MessageModalProps {
    title: string;
    content: string;
    phoneNumber?: string;
    onClose: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ title, content, phoneNumber, onClose }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleOpenSmsApp = () => {
        if (!phoneNumber) return;
        // Encode the body for URL
        const encodedBody = encodeURIComponent(content);
        // Protocol for SMS. Note: iOS uses '&' for separator, Android '?', keeping it standard '?' here usually works or needs detection.
        // Standard modern browser approach:
        window.open(`sms:${phoneNumber}?body=${encodedBody}`, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-900/50">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                </header>
                <main className="p-6">
                    <p className="whitespace-pre-wrap bg-gray-950/50 p-4 rounded-md text-gray-200 border border-gray-800">{content}</p>
                    {phoneNumber && (
                        <p className="mt-2 text-xs text-gray-500">Către: <span className="font-mono text-gray-300">{phoneNumber}</span></p>
                    )}
                </main>
                <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl">
                    {phoneNumber && (
                        <button 
                            onClick={handleOpenSmsApp} 
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-green-900/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                            </svg>
                            Trimite SMS
                        </button>
                    )}
                    <button onClick={handleCopy} className="bg-blue-600/50 text-blue-200 font-bold py-2 px-4 rounded-lg border border-blue-500/80 hover:bg-blue-500/70">
                        {copied ? t('shareModal.copied') : t('shareModal.copyLink')}
                    </button>
                    <button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-600/30">
                        {t('recallsModal.close')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default MessageModal;
