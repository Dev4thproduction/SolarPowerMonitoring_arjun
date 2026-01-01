import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Mock user for bypass
    const [user, setUser] = useState({
        id: 'mock-123',
        username: 'admin',
        role: 'ADMIN',
        name: 'Default Admin'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // No-op for bypass
    }, []);

    const login = async (username, password) => {
        // Mock login
        const userData = {
            id: 'mock-123',
            username: username || 'admin',
            role: 'ADMIN',
            name: 'Default Admin'
        };
        setUser(userData);
    };

    const logout = () => {
        // Mock logout
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
