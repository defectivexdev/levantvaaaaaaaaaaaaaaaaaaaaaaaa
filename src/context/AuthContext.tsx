'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface AuthUser {
    id: string;
    pilotId: string;
    email: string;
    isAdmin: boolean;
    role: string;
    first_name?: string;
    last_name?: string;
    callsign?: string;
    rank?: string;
    [key: string]: any;
}

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isAdmin: boolean;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isAdmin: false,
    refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(data.user ?? null);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const value: AuthContextValue = {
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: !!user?.isAdmin || user?.role === 'Admin',
        refresh: fetchUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
