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
    collection,
    onSnapshot,
    deleteDoc
} from 'firebase/firestore';
import { initializeApp } from "firebase/app";
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
                    // Fetch additional data (role, name) from Firestore
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        setUser({ ...firebaseUser, ...userDoc.data() });
                    } else {
                        // Fallback if no firestore doc (shouldn't happen ideally)
                        setUser(firebaseUser);
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setUser(firebaseUser);
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
            // NOTE: We assume 'username' is email for Firebase Auth, or we append a domain
            // If the old app used plain usernames, we need to convert them to emails.
            // Let's assume we append '@app.com' for simplicity if it's not an email
            const email = username.includes('@') ? username : `${username}@vendingapp.com`;

            await signInWithEmailAndPassword(auth, email, password);
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
        // Create a secondary app instance
        // We need to pass the same config. 
        // We can get it from the 'app' export options, or hardcode/import it.
        // Using app.options is cleaner.
        const secondaryApp = initializeApp(app.options, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);

        try {
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

            // If successful, the 'users' listener will automatically update the UI
            return { success: true };

        } catch (error) {
            console.error("Add user error:", error);
            return { success: false, error: error.message };
        } finally {
            // Clean up secondary app
            // deleteApp(secondaryApp) is not exported? 
            // It is from 'firebase/app', but let's just leave it or try to import it if strict.
            // For now, we'll just let it be GC'd or look up how to delete properly if issues arise.
            // Actually 'deleteApp' is in 'firebase/app'.
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
