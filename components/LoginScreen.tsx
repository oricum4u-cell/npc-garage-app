import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { UserRole } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

const APP_VERSION = "2.3.0";

// --- Advanced Animations & Styles ---
const AnimationStyles = () => (
    <style>{`
        @keyframes grid-move {
            0% { transform: translateY(0); }
            100% { transform: translateY(40px); }
        }
        .perspective-grid {
            position: absolute;
            bottom: 0;
            left: -50%;
            width: 200%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px);
            background-size: 40px 40px;
            transform: perspective(500px) rotateX(60deg);
            animation: grid-move 3s linear infinite;
            opacity: 0.2;
            mask-image: linear-gradient(to bottom, transparent 0%, black 40%, black 100%);
        }
        @keyframes float-particle {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
        .particle {
            position: absolute;
            bottom: -10px;
            background: white;
            border-radius: 50%;
            animation: float-particle 10s linear infinite;
        }
        @keyframes scan-line {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(200%); }
        }
        .scanner-bar {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(to right, transparent, cyan, transparent);
            opacity: 0.5;
            animation: scan-line 3s linear infinite;
            filter: blur(4px);
        }
        @keyframes text-glitch {
            0% { text-shadow: 2px 2px 0px #ff00ff, -2px -2px 0px #00ffff; }
            2% { text-shadow: -2px 2px 0px #ff00ff, 2px -2px 0px #00ffff; }
            4% { text-shadow: 2px -2px 0px #ff00ff, -2px 2px 0px #00ffff; }
            6% { text-shadow: none; }
            100% { text-shadow: none; }
        }
        .glitch-text:hover {
            animation: text-glitch 0.3s linear infinite;
        }
    `}</style>
);

// --- Visual Components ---

const Background = () => {
    // Generate random particles
    const particles = Array.from({ length: 30 }).map((_, i) => ({
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 3 + 1}px`,
        duration: `${Math.random() * 10 + 5}s`,
        delay: `${Math.random() * 5}s`
    }));

    return (
        <div className="absolute inset-0 bg-[#050511] overflow-hidden z-0">
            <AnimationStyles />
            {/* Deep Space Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#020205] via-[#0f0c29] to-[#1a103c] opacity-90"></div>
            
            {/* Moving 3D Grid */}
            <div className="absolute inset-0 overflow-hidden flex items-end justify-center">
                <div className="perspective-grid"></div>
            </div>

            {/* Ambient Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/30 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '2s'}}></div>

            {/* Floating Particles */}
            {particles.map((p, i) => (
                <div 
                    key={i} 
                    className="particle"
                    style={{
                        left: p.left,
                        width: p.size,
                        height: p.size,
                        animationDuration: p.duration,
                        animationDelay: p.delay
                    }}
                />
            ))}
        </div>
    );
};

const LogoHeader = () => (
    <div className="text-center mb-8 relative group cursor-default">
        <div className="inline-block relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[360deg]">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 p-[3px] shadow-[0_0_30px_rgba(6,182,212,0.6)]">
                <div className="w-full h-full rounded-full bg-[#0f0c29] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 animate-spin-slow"></div>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-90 shadow-inner"></div>
                </div>
            </div>
        </div>
        <h1 className="text-4xl font-black tracking-wider text-white drop-shadow-lg glitch-text transition-all">
            NPC <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">GARAGE</span>
        </h1>
        <p className="text-[10px] font-bold tracking-[0.3em] text-cyan-500/80 mt-2 uppercase border-t border-cyan-900/50 pt-2 inline-block px-4">
            SYSTEM v{APP_VERSION}
        </p>
    </div>
);

const InputGroup = ({ label, children }: { label?: string, children?: React.ReactNode }) => (
    <div className="mb-6 relative group">
        {label && <label className="block text-[10px] font-bold text-cyan-500/70 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-cyan-400 transition-colors">{label}</label>}
        <div className="relative bg-[#0a0a16]/80 border border-white/5 rounded-lg backdrop-blur-sm transition-all duration-300 group-focus-within:border-cyan-500/50 group-focus-within:bg-[#13142b] group-focus-within:shadow-[0_0_20px_rgba(6,182,212,0.15)] overflow-hidden">
            {children}
            {/* Animated bottom border line */}
            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500 group-focus-within:w-full"></div>
        </div>
    </div>
);

const ConnectionSettingsModal = ({ onClose }: { onClose: () => void }) => {
    const [serverUrl, setServerUrl] = useLocalStorage<string>('garage-server-url', 'http://localhost:3001');
    const [localUrl, setLocalUrl] = useState(serverUrl);
    const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const { setUsers } = useAuth();

    useEffect(() => {
        if (window.location.hostname.includes('ngrok') && (localUrl.includes('localhost') || !localUrl)) {
            setLocalUrl(window.location.origin);
        }
    }, []);

    const handleSyncUsers = async () => {
        setStatus('syncing');
        setErrorMessage('');
        
        let urlToUse = localUrl.trim();
        if (!urlToUse.startsWith('http')) {
            urlToUse = `https://${urlToUse}`;
            setLocalUrl(urlToUse);
        }

        try {
            setServerUrl(urlToUse); 
            const baseUrl = urlToUse.replace(/\/$/, "");
            
            const response = await fetch(`${baseUrl}/sync`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    timestamp: new Date(0).toISOString(),
                    scope: 'users',
                    clientItemCount: 0,
                    isProbe: true,
                    syncSource: 'Mobile Login'
                })
            });

            if (!response.ok) throw new Error(`Eroare server: ${response.status}`);
            
            let result;
            try {
                result = await response.json();
            } catch {
                throw new Error("Răspuns invalid (posibil pagină HTML Ngrok).");
            }

            const incomingData = result.data || result;

            if (incomingData && Array.isArray(incomingData.users) && incomingData.users.length > 0) {
                setUsers(incomingData.users);
                setStatus('success');
                setTimeout(onClose, 1500);
            } else {
                throw new Error('Baza de date de utilizatori de pe server pare goală.');
            }
        } catch (e) {
            console.error("Sync error:", e);
            setStatus('error');
            setErrorMessage(e instanceof Error ? e.message : "Eroare necunoscută.");
        }
    };

    const handleEmergencyReset = () => {
        if(confirm("ATENȚIE: Aceasta va șterge datele locale corupte și va reîncărca aplicația. Continui?")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#0f0c29] border border-cyan-500/30 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.2)] w-full max-w-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white p-2 hover:rotate-90 transition-transform">✕</button>
                
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <span className="text-cyan-400">⚡</span> Configurare Server
                </h3>
                <p className="text-xs text-gray-500 mb-6">Conectare la baza de date centrală</p>
                
                <div className="mb-4">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">URL Server (Ngrok)</label>
                    <input 
                        type="text" 
                        value={localUrl} 
                        onChange={(e) => setLocalUrl(e.target.value)} 
                        className="w-full p-3 bg-[#0a0a16] border border-gray-700 rounded text-cyan-300 text-sm focus:border-cyan-500 outline-none font-mono"
                        placeholder="https://..."
                        autoCapitalize="none"
                    />
                </div>

                {status === 'error' && <div className="bg-red-950/50 border border-red-500/30 p-3 rounded mb-4 text-xs text-red-300 flex items-center gap-2">⚠️ {errorMessage}</div>}
                {status === 'success' && <div className="bg-green-950/50 border border-green-500/30 p-3 rounded mb-4 text-xs text-green-300 flex items-center gap-2">✅ Sincronizare reușită!</div>}

                <div className="space-y-3 mt-6">
                    <button 
                        onClick={handleSyncUsers} 
                        disabled={status === 'syncing'}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-sm flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all hover:scale-[1.02]"
                    >
                        {status === 'syncing' ? <span className="animate-pulse">Se conectează...</span> : 'Sincronizează Utilizatori'}
                    </button>
                    
                    <button 
                        onClick={handleEmergencyReset}
                        className="w-full py-2 bg-transparent border border-red-900/50 text-red-500/70 hover:text-red-400 hover:border-red-500/50 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                        Resetare Urgență
                    </button>
                </div>
            </div>
        </div>
    );
};

const LoginScreen: React.FC = () => {
    const [selectedUsername, setSelectedUsername] = useState<string>('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const { login, users } = useAuth();
    const { t } = useLanguage();
    
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // FIX: The login function is async, so we need to await its result.
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUsername) return;
        
        const result = await login(selectedUsername, password);
        if (!result.success) {
            setError(result.message || t('login.incorrectPassword'));
            setPassword('');
        }
    };

    // Don't render until mounted to prevent flash
    if (!isMounted) return null;

    return (
        <div className="relative flex flex-col min-h-screen font-sans overflow-hidden items-center justify-center">
            {showSettings && <ConnectionSettingsModal onClose={() => setShowSettings(false)} />}
            <Background />
            
            <button 
                onClick={() => setShowSettings(true)} 
                className="absolute top-4 right-4 z-30 p-2 text-gray-500 hover:text-cyan-400 transition-colors opacity-50 hover:opacity-100"
                title="Setări Conexiune"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            <div className="w-full max-w-[380px] relative z-10 px-4 transform transition-all duration-700 ease-out translate-y-0 opacity-100">
                {/* Card Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-20 animate-pulse"></div>
                
                <div className="relative w-full bg-[#13142b]/80 backdrop-blur-xl rounded-xl border border-white/10 p-8 shadow-2xl overflow-hidden">
                    {/* Scanning Line Animation */}
                    <div className="scanner-bar"></div>

                    <LogoHeader />
                    
                    <form onSubmit={handleLogin} autoComplete="off" className="space-y-2">
                        <InputGroup label="Identificare">
                            <input 
                                list="users-list"
                                type="text"
                                value={selectedUsername} 
                                onChange={(e) => { setSelectedUsername(e.target.value); setError(''); }} 
                                required 
                                className="w-full bg-transparent border-none text-white text-sm font-medium px-4 py-3 outline-none focus:ring-0 placeholder-gray-600 font-mono"
                                placeholder="utilizator..."
                                autoComplete="off"
                            />
                            <datalist id="users-list">
                                 {Array.isArray(users) && users.map(user => (
                                    <option key={user.id} value={user.username} />
                                 ))}
                            </datalist>
                        </InputGroup>

                        <InputGroup label="Cod Acces">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                className="w-full bg-transparent border-none text-white text-sm font-medium px-4 py-3 outline-none focus:ring-0 placeholder-gray-600 font-mono tracking-widest" 
                                placeholder="••••••" 
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-cyan-400 transition-colors"
                            >
                                 {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </InputGroup>
                        
                        {error && (
                            <div className="animate-fade-in flex items-center gap-2 text-xs text-red-300 bg-red-900/30 py-2 px-3 rounded border border-red-500/30 mb-4">
                                <span className="text-lg">⚠️</span> {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="w-full py-4 mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg shadow-[0_0_20px_rgba(8,145,178,0.4)] text-white font-bold text-sm tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group"
                        >
                            <span className="relative z-10">Inițializare</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </button>
                    </form>
                </div>
                
                <div className="text-center mt-8 opacity-40">
                    <p className="text-[10px] text-cyan-200 uppercase tracking-[0.3em]">Secure Connection Established</p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
