import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { User, UserRole, UserSession } from '../types.ts';
import { useLanguage } from '../contexts/LanguageContext.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

// --- PREDEFINED AVATARS ---
const PREDEFINED_AVATARS = [
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzE1MTkzMSIvPjxwYXRoIGQ9Ik01MCAyNUMzNi4xOTMgMjUgMjUgMzYuMTkzIDI1IDUwQzI1IDYzLjgwNyAzNi4xOTMgNzUgNTAgNzVDNjMuODA3IDc1IDc1IDYzLjgwNyA3NSA1MEM3NSAzNi4xOTMgNjMuODA3IDI1IDUwIDI1WiIgZmlsbD0iIzA2YjZkNCIvPjxwYXRoIGQ9Ik01MCA1NUM0MyAxMDUgMjUgODUgMjUgODUgMjUgODUgNTcgMTA1IDUwIDU1WiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==",
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzI3MjcyYSIvPjxwYXRoIGQ9Ik0yNSAzNUg3NVY1MEg4MFY1NUg3NUM3NSA2OC44MDcgNjMuODA3IDgwIDUwIDgwQzM2LjE5MyA4MCAyNSA2OC44MDcgMjUgNTVWMzVaIiBmaWxsPSIjZjk3MzE2Ii8+PHJlY3QgeD0iMjAiIHk9IjMwIiB3aWR0aD0iNjAiIGhlaWdodD0iMTAiIHJ4PSI1IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTM1IDY1QzM1IDY1IDQwIDc1IDUwIDc1QzYwIDc1IDY1IDY1IDY1IDY1IiBzdHJva2U9IiMyNzI3MmEiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==",
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzc1MDUwNSIvPjxwYXRoIGQ9Ik01MCAxNUMzMC42NyAxNSAxNSAzMC42NyAxNSA1MFY3NUg4NVY1MEM4NSAzMC42NyA2OS4zMyAxNSA1MCAxNVoiIGZpbGw9IiNkYzI2MjYiLz48cGF0aCBkPSJNMjUgNTBINzVWNzBINjBZNzVMNTAgNjVMNDAgNzVIMjVWNTBaIiBmaWxsPSIjMTAxMDEwIi8+PHBhdGggZD0iTTIwIDQ1SDgwVjU1SDIwVjQ1WiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==",
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzAwNDQzMCIvPjxyZWN0IHg9IjI1IiB5PSIyNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjYwIiByeD0iMTAiIGZpbGw9IiMxMGI5ODEiLz48cmVjdCB4PSIzMCIgeT0iNDAiIHdpZHRoPSIxNSIgaGVpZ2h0PSIxMCIgZmlsbD0iIzAwNDQzMCIvPjxyZWN0IHg9IjU1IiB5PSI0MCIgd2lkdGg9IjE1IiBoZWlnaHQ9IjEwIiBmaWxsPSIjMDA0NDMwIi8+PHJlY3QgeD0iMzUiIHk9IjY1IiB3aWR0aD0iMzAiIGhlaWdodD0iNSIgZmlsbD0iIzAwNDQzMCIvPjxjaXJjbGUgY3g9IjI1IiBjeT0iNTUiIHI9IjUiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI3NSIgY3k9IjU1IiByPSI1IiBmaWxsPSIjZmZmIi8+PC9zdmc+",
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzMyMTA1MyIvPjxwYXRoIGQ9Ik01MCAyMEMzMCAyMCAyMCA0MCAyMCA2MEgyNUwzMCA1MEw1MCA4MEw3MCA1MEw3NSA2MEg4MEM4MCA0MCA3MCAyMCA1MCAyMFoiIGZpbGw9IiM5MzMzZWEiLz48Y2lyY2xlIGN4PSIzNSIgY3k9IjQ1IiByPSI1IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIwLjUiLz48Y2lyY2xlIGN4PSI2NSIgY3k9IjQ1IiByPSI1IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4="
];

// --- HELPER FUNCTIONS ---
const getInitials = (name: string) => (name || '').trim().split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

const timeAgo = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "chiar acum";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ore`;
    return Math.floor(hours / 24) + " zile";
};

// --- SUB-COMPONENTS ---

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

const UserModal: React.FC<{
    user: User | null;
    onSave: (data: any, id?: string) => Promise<void>;
    onClose: () => void;
}> = ({ user, onSave, onClose }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        password: '',
        role: user?.role || UserRole.MECHANIC,
        profilePicture: user?.profilePicture || '',
    });
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500 * 1024) { 
                alert("Imaginea este prea mare. Te rugăm să încarci o imagine sub 500KB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({ ...prev, profilePicture: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handlePredefinedAvatarSelect = (avatarUrl: string) => {
        setFormData(prev => ({ ...prev, profilePicture: avatarUrl }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await onSave(formData, user?.id);
        } catch (err) {
            if (err instanceof Error) setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <header className="p-4 border-b border-primary-900/50"><h3 className="text-xl font-bold text-white">{user ? 'Editare Utilizator' : 'Adăugare Utilizator Nou'}</h3></header>
                    <main className="p-6 space-y-4">
                        <div className="flex flex-col items-center mb-4">
                             <div 
                                className="w-24 h-24 rounded-full bg-gray-800 border-2 border-primary-500/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary-400 transition-colors relative group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {formData.profilePicture ? (
                                    <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl text-gray-500">📷</span>
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs text-white font-bold">Schimbă</span>
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                onChange={handleImageChange} 
                            />
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, profilePicture: '' }))} className="text-xs text-red-400 hover:text-red-300 mt-2">Şterge Poza</button>
                            
                            <div className="mt-4 w-full">
                                <p className="text-xs text-gray-400 text-center mb-2 uppercase tracking-wide">Sau alege un avatar</p>
                                <div className="flex justify-center gap-3">
                                    {PREDEFINED_AVATARS.map((avatar, index) => (
                                        <button key={index} type="button" onClick={() => handlePredefinedAvatarSelect(avatar)} className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-200 ${formData.profilePicture === avatar ? 'border-primary-400 scale-110 ring-2 ring-primary-500/30' : 'border-gray-700 hover:border-gray-500 hover:scale-105'}`}>
                                            <img src={avatar} alt={`Predefined ${index}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && <div className="p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">{error}</div>}

                        <div><label className="block text-sm font-medium text-gray-300 mb-1">Nume Utilizator</label><input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full p-2 futuristic-input" /></div>
                        <div><label className="block text-sm font-medium text-gray-300 mb-1">Email (Opțional)</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 futuristic-input" placeholder="user@example.com" /></div>
                        {!user && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Parolă (min. 8 caractere, literă mare, cifră, simbol)</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full p-2 futuristic-input" />
                            </div>
                        )}
                        <div><label className="block text-sm font-medium text-gray-300 mb-1">Rol</label><select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 futuristic-select"><option value={UserRole.ADMIN}>Admin</option><option value={UserRole.MECHANIC}>Mecanic</option><option value={UserRole.USER}>Utilizator</option></select></div>
                    </main>
                    <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl"><button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">Anulează</button><button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">Salvează</button></footer>
                </form>
            </div>
        </div>
    );
};

const ResetPasswordModal: React.FC<{ user: User; onReset: (userId: string, newPass: string) => Promise<void>; onClose: () => void; }> = ({ user, onReset, onClose }) => {
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        setError('');
        try {
            await onReset(user.id, newPassword);
        } catch(err) {
            if (err instanceof Error) setError(err.message);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-primary-500/20 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <header className="p-4 border-b border-primary-900/50"><h3 className="text-xl font-bold text-white">Resetează Parola</h3></header>
                    <main className="p-6">
                        {error && <div className="mb-4 p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">{error}</div>}
                        <label className="block text-sm font-medium text-gray-300 mb-1">Parolă Nouă (min. 8 caractere, literă mare, cifră, simbol)</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoFocus className="w-full p-2 futuristic-input" />
                    </main>
                    <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl"><button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">Anulează</button><button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-lg">Setează</button></footer>
                </form>
            </div>
        </div>
    );
};

const DeleteUserModal: React.FC<{ user: User; onDelete: (userId: string) => Promise<void>; onClose: () => void; }> = ({ user, onDelete, onClose }) => {
    const [confirmation, setConfirmation] = useState('');
    
    const handleDelete = async () => {
        try {
            await onDelete(user.id);
        } catch(err) {
            alert((err as Error).message);
        }
    }
    
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border-2 border-red-500/50 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-red-900/50"><h3 className="text-xl font-bold text-red-400">Confirmare Ștergere</h3></header>
                <main className="p-6 space-y-4"><p className="text-red-300/80">Acțiune ireversibilă.</p><input type="text" value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder={user.username} className="w-full p-2 futuristic-input text-center"/></main>
                <footer className="p-4 bg-gray-950/50 flex justify-end gap-4 rounded-b-xl"><button type="button" onClick={onClose} className="bg-gray-500/20 text-gray-300 font-semibold py-2 px-4 rounded-lg">Anulează</button><button onClick={handleDelete} disabled={confirmation.toLowerCase() !== user.username.toLowerCase()} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">Șterge</button></footer>
            </div>
        </div>
    );
};

// --- ACTIVE SESSIONS PANEL ---
const ActiveSessionsPanel: React.FC = () => {
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [serverUrl] = useLocalStorage<string>('garage-server-url', 'http://localhost:3001');

    const fetchSessions = async () => {
        setLoading(true);
        try {
            let url = serverUrl.trim();
            if (!url.startsWith('http')) url = `https://${url}`;
            url = url.replace(/\/$/, "");

            const response = await fetch(`${url}/active-sessions`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
            }
        } catch (e) {
            console.error("Error fetching sessions", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [serverUrl]);

    return (
        <HudPanel title="Monitorizare Sesiuni Active (Live)" className="mt-6 border-cyan-500/30">
            <div className="flex justify-between items-center mb-4">
                <p className="text-xs text-cyan-300">Utilizatori conectați la server în ultimele 5 minute.</p>
                <button onClick={fetchSessions} className="text-xs bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 px-2 py-1 rounded border border-cyan-700">🔄 Refresh</button>
            </div>
            
            {loading && sessions.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Se încarcă...</p>
            ) : sessions.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Nicio sesiune activă detectată.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-300">
                        <thead className="bg-gray-950/50 text-gray-500 uppercase">
                            <tr>
                                <th className="p-2">Utilizator</th>
                                <th className="p-2">Rol</th>
                                <th className="p-2">Dispozitiv</th>
                                <th className="p-2">IP</th>
                                <th className="p-2">Ultima Activitate</th>
                                <th className="p-2 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {sessions.map((session) => (
                                <tr key={session.userId} className="hover:bg-gray-800/30">
                                    <td className="p-2 font-bold text-white">{session.username}</td>
                                    <td className="p-2">{session.role}</td>
                                    <td className="p-2 flex items-center gap-1">
                                        <span>{session.deviceType === 'Mobile' ? '📱' : '💻'}</span>
                                        <span>{session.deviceOS}</span>
                                    </td>
                                    <td className="p-2 font-mono text-gray-500">{session.ip}</td>
                                    <td className="p-2">{timeAgo(session.lastActive)}</td>
                                    <td className="p-2 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${session.status === 'ONLINE' ? 'bg-green-900/50 text-green-400 border border-green-600' : 'bg-gray-800 text-gray-500 border border-gray-600'}`}>
                                            {session.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </HudPanel>
    );
};

// --- MAIN COMPONENT ---

interface UserManagerProps { 
    setIsAppLoading: (isLoading: boolean) => void; 
    runSync?: () => void; 
}

const UserManager: React.FC<UserManagerProps> = ({ setIsAppLoading, runSync }) => {
    const { user: currentUser, users, addUser, updateUser, deleteUser, resetUserPassword } = useAuth();
    
    const [modalState, setModalState] = useState<'ADD_EDIT' | 'RESET' | 'DELETE' | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    
    const handleOpenModal = (type: 'ADD_EDIT' | 'RESET' | 'DELETE', user: User | null = null) => {
        setSelectedUser(user);
        setModalState(type);
    };

    const handleSaveUser = async (data: { username: string; email?: string; password?: string; role: UserRole; profilePicture?: string }, id?: string) => {
        setIsAppLoading(true);
        try {
            if (id) {
                await updateUser(id, { username: data.username, email: data.email, role: data.role, profilePicture: data.profilePicture });
            } else if (data.password) {
                await addUser({ username: data.username, email: data.email, password: data.password, role: data.role, profilePicture: data.profilePicture });
            }
            setModalState(null);
        } catch (err) {
            console.error("Save user failed:", err);
            // Re-throw to be caught by modal's handleSubmit and displayed
            throw err;
        } finally {
            setIsAppLoading(false);
        }
    };
    
    const handleResetPassword = async (userId: string, newPass: string) => {
        setIsAppLoading(true);
         try {
            await resetUserPassword(userId, newPass);
            setModalState(null);
        } catch(err) {
            console.error("Reset password failed:", err);
            throw err;
        } finally {
            setIsAppLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setIsAppLoading(true);
        try {
            await deleteUser(userId);
            setModalState(null);
        } catch(err) {
             console.error("Delete user failed:", err);
            throw err;
        } finally {
             setIsAppLoading(false);
        }
    };

    const roleColors: Record<UserRole, string> = {
        [UserRole.ADMIN]: 'bg-red-900/50 text-red-300',
        [UserRole.MECHANIC]: 'bg-blue-900/50 text-blue-300',
        [UserRole.USER]: 'bg-gray-700 text-gray-300',
    };

    return (
        <div className="space-y-6">
            {modalState === 'ADD_EDIT' && <UserModal user={selectedUser} onSave={handleSaveUser} onClose={() => setModalState(null)} />}
            {modalState === 'RESET' && selectedUser && <ResetPasswordModal user={selectedUser} onReset={handleResetPassword} onClose={() => setModalState(null)} />}
            {modalState === 'DELETE' && selectedUser && <DeleteUserModal user={selectedUser} onDelete={handleDeleteUser} onClose={() => setModalState(null)} />}
            
            <HudPanel title="Management Utilizatori">
                <div className="flex justify-end mb-6">
                    <button onClick={() => handleOpenModal('ADD_EDIT')} className="bg-primary-600/50 text-primary-200 font-bold py-2 px-4 rounded-lg flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>Adaugă Utilizator</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((user, index) => (
                        <div key={user.id} className="bg-gray-800/50 border border-primary-500/10 rounded-lg p-4 flex flex-col justify-between animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <div>
                                <div className="flex items-center gap-4">
                                    {user.profilePicture ? (
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-500/50 flex-shrink-0">
                                            <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center font-bold text-lg text-primary-300 border-2 border-transparent flex-shrink-0">
                                            {getInitials(user.username)}
                                        </div>
                                    )}
                                    <div className="flex-grow min-w-0">
                                        <h3 className="text-lg font-bold text-white capitalize truncate">{user.username}</h3>
                                        {user.email && <p className="text-xs text-gray-400 truncate">{user.email}</p>}
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${roleColors[user.role]} mt-1 inline-block`}>{user.role}</span>
                                        {user.lockoutUntil && new Date(user.lockoutUntil) > new Date() && (
                                            <span className="ml-2 text-xs text-red-400 font-bold border border-red-500/50 px-1 rounded">BLOCAT</span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-3">Ultima autentificare: {timeAgo(user.lastLogin)}</p>
                            </div>
                            <div className="flex justify-end gap-1 mt-4 pt-3 border-t border-primary-900/50">
                                <button onClick={() => handleOpenModal('ADD_EDIT', user)} className="p-2 rounded-full text-gray-400 hover:text-amber-400" title="Editează"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                <button onClick={() => handleOpenModal('RESET', user)} className="p-2 rounded-full text-gray-400 hover:text-cyan-400" title="Resetează Parola"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2a3 3 0 00-6 0v2h6V7z" clipRule="evenodd" /></svg></button>
                                <button onClick={() => handleOpenModal('DELETE', user)} disabled={user.id === currentUser?.id} className="p-2 rounded-full text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed" title="Șterge"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                            </div>
                        </div>
                    ))}
                </div>
            </HudPanel>

            {currentUser?.role === UserRole.ADMIN && <ActiveSessionsPanel />}
        </div>
    );
};

export default UserManager;