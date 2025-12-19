import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

const initialUsers: User[] = [
    { id: 'user-1', username: 'admin', email: 'admin@npcgarage.com', password: 'password', role: UserRole.ADMIN, lastLogin: new Date().toISOString(), failedLoginAttempts: 0, lockoutUntil: null },
];

type UserCreationData = Omit<User, 'id' | 'lastLogin' | 'failedLoginAttempts' | 'lockoutUntil'>;

interface LoginResult {
    success: boolean;
    message?: string;
}

interface AuthContextType {
    user: Omit<User, 'password'> | null;
    users: User[];
    login: (usernameOrEmail: string, password: string) => LoginResult;
    logout: () => void;
    addUser: (userData: UserCreationData) => void;
    updateUser: (userId: string, updatedData: { username: string; email?: string; role: UserRole; profilePicture?: string }) => void;
    deleteUser: (userId: string) => void;
    resetUserPassword: (userId: string, newPassword: string) => void;
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useLocalStorage<Omit<User, 'password'> | null>('garage-user', null);
    const [users, setUsers] = useLocalStorage<User[]>('garage-users', initialUsers);

    const login = (usernameOrEmail: string, password: string): LoginResult => {
        const foundUser = users.find(
            u => (u.username.toLowerCase() === usernameOrEmail.toLowerCase() || u.email?.toLowerCase() === usernameOrEmail.toLowerCase())
        );

        if (!foundUser) {
            return { success: false, message: "Utilizator inexistent." };
        }

        if (foundUser.lockoutUntil && new Date(foundUser.lockoutUntil).getTime() > Date.now()) {
            const remainingMinutes = Math.ceil((new Date(foundUser.lockoutUntil).getTime() - Date.now()) / 60000);
            return { success: false, message: `Cont blocat temporar. Încercați din nou în ${remainingMinutes} minute.` };
        }

        if (foundUser.password === password) {
            const { password: _, ...userToStore } = foundUser;
            setUser(userToStore);
            setUsers(prev => prev.map(u => u.id === foundUser.id ? { ...u, lastLogin: new Date().toISOString(), failedLoginAttempts: 0, lockoutUntil: null } : u));
            return { success: true };
        } else {
            const attempts = (foundUser.failedLoginAttempts || 0) + 1;
            let lockoutUntil = foundUser.lockoutUntil;
            let message = "Parolă incorectă.";

            if (attempts >= 3) {
                const lockDate = new Date();
                lockDate.setMinutes(lockDate.getMinutes() + 5);
                lockoutUntil = lockDate.toISOString();
                message = "Prea multe încercări eșuate. Contul a fost blocat pentru 5 minute.";
            } else {
                message = `Parolă incorectă. Mai aveți ${3 - attempts} încercări.`;
            }

            setUsers(prev => prev.map(u => u.id === foundUser.id ? { ...u, failedLoginAttempts: attempts, lockoutUntil } : u));
            return { success: false, message };
        }
    };

    const logout = () => {
        setUser(null);
    };

    const addUser = (userData: UserCreationData) => {
        const newUser: User = {
            id: `user-${Date.now()}`,
            ...userData,
            lastLogin: new Date().toISOString(),
            failedLoginAttempts: 0,
            lockoutUntil: null
        };
        setUsers(prevUsers => [...prevUsers, newUser]);
    };

    const updateUser = (userId: string, updatedData: { username: string; email?: string; role: UserRole; profilePicture?: string }) => {
        setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, ...updatedData } : u));
        if (user && user.id === userId) {
            setUser(prev => prev ? { ...prev, ...updatedData } : null);
        }
    };

    const deleteUser = (userId: string) => {
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    };

    const resetUserPassword = (userId: string, newPassword: string) => {
        const updates = { password: newPassword, failedLoginAttempts: 0, lockoutUntil: null };
        setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, ...updates } : u));
    };

    return (
        <AuthContext.Provider value={{ user, users, login, logout, addUser, updateUser, deleteUser, resetUserPassword, setUsers }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};