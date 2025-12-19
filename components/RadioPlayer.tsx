import React from 'react';
import { useMusic } from '../contexts/MusicContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';

const RadioPlayer: React.FC = () => {
    const { currentStation, isPlaying, togglePlay, playNext, playPrev } = useMusic();
    const { t } = useLanguage();

    const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>;
    const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
    const PrevIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.447 14.832A1 1 0 0010 14V6a1 1 0 00-1.555-.832l-3 4a1 1 0 000 1.664l3 4z" /><path d="M13.447 14.832A1 1 0 0015 14V6a1 1 0 00-1.555-.832l-3 4a1 1 0 000 1.664l3 4z" /></svg>;
    const NextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.553 5.168A1 1 0 005 6v8a1 1 0 001.555.832l3-4a1 1 0 000-1.664l-3-4z" /><path d="M11.553 5.168A1 1 0 0010 6v8a1 1 0 001.555.832l3-4a1 1 0 000-1.664l-3-4z" /></svg>;

    return (
        <div className="flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm border border-primary-500/10 p-1.5 rounded-lg shadow-inner">
             <button onClick={playPrev} title={t('radio.previousStation')} className="p-1 rounded-full text-gray-300 hover:bg-gray-700/50 transition-colors">
                <PrevIcon />
            </button>
            <button onClick={togglePlay} title={isPlaying ? t('radio.pause') : t('radio.play')} className="p-1 rounded-full text-primary-400 hover:bg-primary-900/50 transition-colors">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
             <button onClick={playNext} title={t('radio.nextStation')} className="p-1 rounded-full text-gray-300 hover:bg-gray-700/50 transition-colors">
                <NextIcon />
            </button>
            <div className="w-28 text-center text-xs text-gray-200 font-semibold truncate px-1" title={currentStation?.name || t('radio.stopped')}>
                {currentStation?.name || t('radio.stopped')}
            </div>
        </div>
    );
};

export default RadioPlayer;