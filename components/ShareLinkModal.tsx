import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import QRCodeGenerator from './QRCodeGenerator.tsx';

interface ShareLinkModalProps {
    title: string;
    url: string;
    onClose: () => void;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ title, url, onClose }) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    const handleEmail = () => {
        window.location.href = `mailto:?subject=${title}&body=Puteți accesa link-ul aici: ${url}`;
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-primary-900/50">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                </div>
                <div className="p-6 space-y-6 flex flex-col items-center">
                    <QRCodeGenerator value={url} size={160} />
                    <div className="w-full">
                         <label className="block text-sm font-medium text-gray-400 mb-1">{t('shareModal.link')}</label>
                        <input type="text" readOnly value={url} className="w-full p-2 futuristic-input text-center text-sm" />
                    </div>
                     <div className="flex gap-4">
                        <button onClick={handleCopy} className="bg-blue-600/50 text-blue-200 font-bold py-2 px-4 rounded-lg border border-blue-500/80 hover:bg-blue-500/70">
                            {copied ? t('shareModal.copied') : t('shareModal.copyLink')}
                        </button>
                         <button onClick={handleEmail} className="bg-gray-600/50 text-gray-200 font-bold py-2 px-4 rounded-lg border border-gray-500/80 hover:bg-gray-500/70">
                            {t('shareModal.emailLink')}
                        </button>
                    </div>
                </div>
                <div className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl">
                    <button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">
                        {t('recallsModal.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareLinkModal;
