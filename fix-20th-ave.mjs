/**
 * Fix: Remove incorrect inactive flag from 6722 20th Ave (20Th Ave Deli Grocery)
 * "picked up" meant money was collected, NOT machine removed.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const app = initializeApp({
    apiKey: "AIzaSyBUvIArE56nvLDmtaIJfz88XqdOzXqO44o",
    authDomain: "vending-book.firebaseapp.com",
    projectId: "vending-book",
    storageBucket: "vending-book.firebasestorage.app",
    messagingSenderId: "622650100879",
    appId: "1:622650100879:web:cae923c3c6590fc0d974fa",
});
const db = getFirestore(app);

const snap = await getDocs(collection(db, 'customers'));
let fixed = 0;

for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.zone === 'Brooklyn' && data.address === '6722 20th Ave') {
        console.log(`Found: ${data.name} — ${data.address} — inactive: ${data.inactive}`);
        await updateDoc(doc(db, 'customers', docSnap.id), { inactive: false });
        console.log('✅ Removed inactive flag');
        fixed++;
    }
}

// Count Brooklyn active/inactive
let active = 0, inactive = 0;
for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.zone === 'Brooklyn' || data.region === 'Brooklyn') {
        if (data.inactive && data.address !== '6722 20th Ave') inactive++;
        else active++;
    }
}
console.log(`\nBrooklyn: ${active} active + ${inactive} inactive = ${active + inactive} total`);

process.exit(0);
