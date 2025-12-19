
import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useGarage } from '../contexts/GarageContext.tsx';
import { UserRole, NotificationPreferences } from '../types.ts';

const PREDEFINED_AVATARS = [
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzE1MTkzMSIvPjxwYXRoIGQ9Ik01MCAyNUMzNi4xOTMgMjUgMjUgMzYuMTkzIDI1IDUwQzI1IDYzLjgwNyAzNi4xOTMgNzUgNTAgNzVDNjMuODA3IDc1IDc1IDYzLjgwNyA3NSA1MEM3NSAzNi4xOTMgNjMuODA3IDI1IDUwIDI1WiIgZmlsbD0iIzA2YjZkNCIvPjxwYXRoIGQ9Ik01MCA1NUM0MyAxMDUgMjUgODUgMjUgODUgMjUgODUgNTcgMTA1IDUwIDU1WiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==",
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzI3MjcyYSIvPjxwYXRoIGQ9Ik0yNSAzNUg3NVY1MEg4MFY1NUg3NUM3NSA2OC44MDcgNjMuODA3IDgwIDUwIDgwQzM2LjE5MyA4MCAyNSA2OC44MDcgMjUgNTVWMzVaIiBmaWxsPSIjZjk3MzE2Ii8+PHJlY3QgeD0iMjAiIHk9IjMwIiB3aWR0aD0iNjAiIGhlaWdodD0iMTAiIHJ4PSI1IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTM1IDY1QzM1IDY1IDQwIDc1IDUwIDc1QzYwIDc1IDY1IDY1IDY1IDY1IiBzdHJva2U9IiMyNzI3MmEiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==",
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzc1MDUwNSIvPjxwYXRoIGQ9Ik01MCAxNUMzMC42NyAxNSAxNSAzMC42NyAxNSA1MFY3NUg4NVY1MEM4NSAzMC42NyA2OS4zMyAxNSA1MCAxNVoiIGZpbGw9IiNkYzI2MjYiLz48cGF0aCBkPSJNMjUgNTBINzVWNzBINjBZNzVMNTAgNjVMNDAgNzVIMjVWNTBaIiBmaWxsPSIjMTAxMDEwIi8+PHBhdGggZD0iTTIwIDQ1SDgwVjU1SDIwVjQ1WiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==",
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzAwNDQzMCIvPjxyZWN0IHg9IjI1IiB5PSIyNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjYwIiByeD0iMTAiIGZpbGw9IiMxMGI5ODEiLz48cmVjdCB4PSIzMCIgeT0iNDAiIHdpZHRoPSIxNSIgaGVpZ2h0PSIxMCIgZmlsbD0iIzAwNDQzMCIvPjxyZWN0IHg9IjU1IiB5PSI0MCIgd2lkdGg9IjE1IiBoZWlnaHQ9IjEwIiBmaWxsPSIjMDA0NDMwIi8+PHJlY3QgeD0iMzUiIHk9IjY1IiB3aWR0aD0iMzAiIGhlaWdodD0iNSIgZmlsbD0iIzAwNDQzMCIvPjxjaXJjbGUgY3g9IjI1IiBjeT0iNTUiIHI9IjUiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI3NSIgY3k9IjU1IiByPSI1IiBmaWxsPSIjZmZmIi8+PC9zdmc+",
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzMyMTA1MyIvPjxwYXRoIGQ9Ik01MCAyMEMzMCAyMCAyMCA0MCAyMCA2MEgyNUwzMCA1MEw1MCA4MEw3MCA1MEw3NSA2MEg4MEM4MCA0MCA3MCAyMCA1MCAyMFoiIGZpbGw9IiM5MzMzZWEiLz48Y2lyY2xlIGN4PSIzNSIgY3k9IjQ1IiByPSI1IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIwLjUiLz48Y2lyY2xlIGN4PSI2NSIgY3k9IjQ1IiByPSI1IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4="
];

const HudPanel: React.FC<{ title: string, children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`relative w-full p-6 bg-gray-900/80 backdrop-blur-sm border border-primary-500/20 rounded-xl shadow-2xl shadow-primary-900/50 ${className}`}>
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-primary-500/80 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary-500/80 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary-500/80 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-primary-500/80 rounded-br-xl"></div>
        <h2 className="text-xl font-bold text-white mb-6 border-b-2 border-primary-500/20 pb-4">{title}</h2>
        {children}
    </div>
);

const ToggleSwitch: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between p-3 bg-gray-950/40 rounded-lg border border-gray-700/50 hover:border-primary-500/30 transition-colors">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${checked ? 'bg-primary-600' : 'bg-gray-600'}`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`}
            />
        </button>
    </div>
);

const UserProfile: React.FC = () => {
    const { user, updateUser, resetUserPassword } = useAuth();
    const { t } = useLanguage();
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    
    // Edit States
    const [email, setEmail] = useState(user?.email || '');
    const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
    const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(user?.notificationPreferences || {
        email: true,
        sms: true,
        browser: true,
        marketing: false
    });
    
    // Password Reset States
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) { 
                setMessage({ text: "Imaginea este prea mare. Max 500KB.", type: 'error' });
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setProfilePicture(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = () => {
        if (!user) return;
        updateUser(user.id, {
            username: user.username,
            role: user.role,
            email: email,
            profilePicture: profilePicture,
            notificationPreferences: notifPrefs // Pass updated preferences
        } as any); // Cast to any to bypass strict type check for now if Context types aren't fully propagated yet in dev
        setMessage({ text: "Profil actualizat cu succes!", type: 'success' });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleChangePassword = () => {
        if (!user) return;
        if (newPassword.length < 4) {
             setMessage({ text: t('login.passwordTooShort'), type: 'error' });
             return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ text: t('login.passwordsDoNotMatch'), type: 'error' });
            return;
        }
        
        resetUserPassword(user.id, newPassword);
        setMessage({ text: t('login.passwordResetSuccess'), type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setMessage(null), 3000);
    };

    const handleNotifToggle = (key: keyof NotificationPreferences) => {
        setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!user) return null;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <h1 className="text-3xl font-bold text-white mb-4">{t('nav.profile')}</h1>
            
            {message && (
                <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-900/50 border-green-500 text-green-200' : 'bg-red-900/50 border-red-500 text-red-200'} mb-6 animate-fade-in`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Profile Card */}
                <div className="md:col-span-1 space-y-6">
                    <HudPanel title="Avatar & Identitate">
                         <div className="flex flex-col items-center">
                             <div 
                                className="w-32 h-32 rounded-full bg-gray-800 border-4 border-primary-500 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary-400 transition-colors relative group mb-4 shadow-[0_0_20px_rgba(var(--color-primary-500),0.3)]"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {profilePicture ? (
                                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-4xl font-bold text-primary-600">{user.username.substring(0,2).toUpperCase()}</div>
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs text-white font-bold">Schimbă</span>
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                            
                            <div className="flex justify-center gap-2 mb-6">
                                {PREDEFINED_AVATARS.map((avatar, index) => (
                                    <button key={index} type="button" onClick={() => setProfilePicture(avatar)} className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all duration-200 ${profilePicture === avatar ? 'border-primary-400 scale-110 ring-2 ring-primary-500/30' : 'border-gray-700 hover:border-gray-500 hover:scale-105'}`}>
                                        <img src={avatar} alt={`Avatar ${index}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-1">{user.username}</h2>
                            <span className="px-3 py-1 bg-primary-900/40 text-primary-300 rounded-full text-xs font-bold border border-primary-700 uppercase tracking-wider mb-4">
                                {user.role}
                            </span>
                            
                            <div className="w-full p-3 bg-gray-950/50 rounded-lg border border-gray-800 text-xs text-gray-500 font-mono text-center">
                                ID: {user.id}
                            </div>
                        </div>
                    </HudPanel>
                </div>

                {/* Details & Security */}
                <div className="md:col-span-2 space-y-6">
                    <HudPanel title="Informații Generale">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nume Utilizator</label>
                                <input type="text" value={user.username} disabled className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded text-gray-500 cursor-not-allowed" />
                                <p className="text-[10px] text-gray-600 mt-1">Numele de utilizator nu poate fi schimbat.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Adresă Email</label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="w-full p-2 futuristic-input"
                                    placeholder="email@exemplu.ro"
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button onClick={handleSaveProfile} className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-lg shadow-primary-900/30">
                                    Salvează Modificări
                                </button>
                            </div>
                        </div>
                    </HudPanel>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <HudPanel title={t('profile.notifications')}>
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500 mb-2">{t('profile.notificationsDesc')}</p>
                                <ToggleSwitch 
                                    label={t('profile.emailNotifications')} 
                                    checked={notifPrefs.email} 
                                    onChange={() => handleNotifToggle('email')} 
                                />
                                <ToggleSwitch 
                                    label={t('profile.smsNotifications')} 
                                    checked={notifPrefs.sms} 
                                    onChange={() => handleNotifToggle('sms')} 
                                />
                                <ToggleSwitch 
                                    label={t('profile.systemNotifications')} 
                                    checked={notifPrefs.browser} 
                                    onChange={() => handleNotifToggle('browser')} 
                                />
                                <ToggleSwitch 
                                    label={t('profile.marketingNotifications')} 
                                    checked={notifPrefs.marketing} 
                                    onChange={() => handleNotifToggle('marketing')} 
                                />
                            </div>
                        </HudPanel>

                        <HudPanel title={t('profile.security')}>
                            <p className="text-xs text-gray-500 mb-4">{t('profile.securityDesc')}</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('profile.newPassword')}</label>
                                    <input 
                                        type="password" 
                                        value={newPassword} 
                                        onChange={(e) => setNewPassword(e.target.value)} 
                                        className="w-full p-2 futuristic-input"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('profile.confirmPassword')}</label>
                                    <input 
                                        type="password" 
                                        value={confirmPassword} 
                                        onChange={(e) => setConfirmPassword(e.target.value)} 
                                        className="w-full p-2 futuristic-input"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button 
                                        onClick={handleChangePassword} 
                                        disabled={!newPassword || !confirmPassword}
                                        className="bg-red-600/80 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        {t('profile.changePassword')}
                                    </button>
                                </div>
                            </div>
                        </HudPanel>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
