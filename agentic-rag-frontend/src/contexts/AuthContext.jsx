import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('auth_token'));
    const [loading, setLoading] = useState(true);

    // Load user on mount if token exists
    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (googleCredential) => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: googleCredential })
            });

            if (res.ok) {
                const data = await res.json();
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem('auth_token', data.token);
                return { success: true };
            } else {
                const error = await res.json();
                return { success: false, error: error.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Login failed' };
        }
    };

    const loginAsGuest = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                const data = await res.json();
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem('auth_token', data.token);
                return { success: true };
            } else {
                const error = await res.json();
                return { success: false, error: error.message || 'Guest login failed' };
            }
        } catch (error) {
            console.error('Guest login error:', error);
            return { success: false, error: 'Guest login failed' };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('auth_token');
    };

    const value = {
        user,
        token,
        loading,
        login,
        loginAsGuest,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.isAdmin || false,
        API_BASE
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
