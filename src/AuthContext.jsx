import { createContext, useContext, useState, useEffect } from 'react';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    onSnapshot,
    deleteDoc
} from 'firebase/firestore';
import { initializeApp, deleteApp } from "firebase/app";
import app, { auth, db } from './firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // Current logged in user object (combined Auth + Firestore data)
    const [users, setUsers] = useState([]); // List of all registered users (from Firestore)
    const [isLoading, setIsLoading] = useState(true);

    // Monitor Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        setUser({ ...firebaseUser, ...userDoc.data(), id: firebaseUser.uid });
                    } else {
                        setUser({ ...firebaseUser, id: firebaseUser.uid });
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setUser({ ...firebaseUser, id: firebaseUser.uid });
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Presence heartbeat — writes lastSeen every 60 seconds
    useEffect(() => {
        if (!user?.uid) return;

        const userDocRef = doc(db, 'users', user.uid);

        // Write immediately on mount
        const writeHeartbeat = () => {
            updateDoc(userDocRef, { lastSeen: new Date().toISOString() }).catch(() => { });
        };
        writeHeartbeat();

        // Then every 60 seconds
        const interval = setInterval(writeHeartbeat, 60_000);

        // On tab close / navigate away, mark offline
        const handleBeforeUnload = () => {
            // Use navigator.sendBeacon for reliability
            // But since Firestore doesn't support that, we just let lastSeen expire naturally
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [user?.uid]);

    // Load all users (for Admin view) - Real-time listener
    useEffect(() => {
        // In a real app, you might only want to subscribe if user.role === 'admin'
        // For simplicity, we'll subscribe always or check inside logic
        const q = collection(db, 'users');
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersList = [];
            querySnapshot.forEach((doc) => {
                usersList.push({ id: doc.id, ...doc.data() });
            });
            setUsers(usersList);
        }, (error) => {
            console.error("Error listening to users:", error);
        });

        return () => unsubscribe();
    }, []);

    const login = async (username, password) => {
        try {
            const email = username.includes('@') ? username : `${username}@vendingapp.com`;

            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Save last login timestamp to Firestore
            try {
                const userDocRef = doc(db, 'users', userCredential.user.uid);
                await updateDoc(userDocRef, {
                    lastLogin: new Date().toISOString()
                });
            } catch (e) {
                console.warn('Could not update lastLogin:', e);
            }

            return { success: true };
        } catch (error) {
            console.error("Login error:", error);
            return {
                success: false,
                error: error.message || 'Invalid credentials'
            };
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    // Add User (Register) using a secondary Firebase App to avoid logging out the current admin
    const addUser = async (newUser) => {
        const appName = `secondary_${Date.now()}`;
        let secondaryApp;
        try {
            secondaryApp = initializeApp(app.options, appName);
            const secondaryAuth = getAuth(secondaryApp);

            const email = newUser.username.includes('@')
                ? newUser.username
                : `${newUser.username}@vendingapp.com`;

            // 1. Create user in Auth
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newUser.password);
            const uid = userCredential.user.uid;

            // 2. Create user profile in Firestore
            await setDoc(doc(db, 'users', uid), {
                username: newUser.username,
                name: newUser.name || newUser.username,
                role: newUser.role || 'employee',
                createdAt: new Date().toISOString()
            });

            return { success: true };
        } catch (error) {
            console.error("Add user error:", error);
            return { success: false, error: error.message };
        } finally {
            if (secondaryApp) {
                try { await deleteApp(secondaryApp); } catch (e) { /* ignore */ }
            }
        }
    };

    const removeUser = async (userId) => {
        try {
            // We can delete from Firestore
            await deleteDoc(doc(db, 'users', userId));

            // NOTE: We cannot easily delete from Auth from the client SDK (requires Admin SDK).
            // The user will technically remain in Auth, but since their Firestore profile is gone,
            // they effectively have no role/data. You should add checks in Login to verify Firestore doc exists.

        } catch (error) {
            console.error("Remove user error:", error);
        }
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
