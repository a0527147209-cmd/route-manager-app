import { initializeApp } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBUvIArE56nvLDmtaIJfz88XqdOzXqO44o",
    authDomain: "vending-book.firebaseapp.com",
    projectId: "vending-book",
    storageBucket: "vending-book.firebasestorage.app",
    messagingSenderId: "622650100879",
    appId: "1:622650100879:web:cae923c3c6590fc0d974fa",
    measurementId: "G-J7ZXJHT76X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Use initializeAuth instead of getAuth to avoid loading gapi/iframes
// which crashes under Capacitor's capacitor://localhost origin
export const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});

export const db = getFirestore(app);

export default app;
