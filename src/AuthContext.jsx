import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY_AUTH = 'myRouteAuth';
const STORAGE_KEY_USERS = 'myRouteUsers';

const AuthContext = createContext();

// Initial mock users if none exist
const DEFAULT_USERS = [
    { id: 'user-1', username: 'Mardi', password: '123', role: 'admin', name: 'Mardi' },
    { id: 'user-2', username: 'Eli', password: '123', role: 'admin', name: 'Eli' },
    { id: 'user-3', username: 'Pj', password: '123', role: 'admin', name: 'Pj' },
    { id: 'user-4', username: 'Hershey', password: '123', role: 'admin', name: 'Hershey' },
    { id: 'user-5', username: 'Yuda', password: '123', role: 'admin', name: 'Yuda' },
    { id: 'user-6', username: 'admin', password: '123', role: 'admin', name: 'Admin' },
];

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // Current logged in user
    const [users, setUsers] = useState([]); // List of all registered users
    const [isLoading, setIsLoading] = useState(true);

    // Load users and session on mount
    useEffect(() => {
        try {
            // Load users list - always use DEFAULT_USERS to ensure updates take effect
            setUsers(DEFAULT_USERS);
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));

            // Load active session
            const storedSession = localStorage.getItem(STORAGE_KEY_AUTH);
            if (storedSession) {
                setUser(JSON.parse(storedSession));
            }
        } catch (err) {
            console.error('Auth load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = (username, password) => {
        const foundUser = users.find(u => u.username === username && u.password === password);
        if (foundUser) {
            // Don't store password in session
            const { password: _, ...safeUser } = foundUser;
            setUser(safeUser);
            localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(safeUser));
            return { success: true };
        }
        return { success: false, error: 'Invalid credentials' };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY_AUTH);
    };

    const addUser = (newUser) => {
        const updatedUsers = [...users, { ...newUser, id: Date.now().toString() }];
        setUsers(updatedUsers);
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
    };

    const removeUser = (userId) => {
        const updatedUsers = users.filter(u => u.id !== userId);
        setUsers(updatedUsers);
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
    };

    // Check if current user has admin privileges
    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{
            user,
            users,
            login,
            logout,
            addUser,
            removeUser,
            isAdmin,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
