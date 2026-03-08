/**
 * Quick fix: Update the ??? / The Laundry Station entry at 1890 Flatbush Ave
 * to be a clean new install (2/10/26) with correct data.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBUvIArE56nvLDmtaIJfz88XqdOzXqO44o",
    authDomain: "vending-book.firebaseapp.com",
    projectId: "vending-book",
    storageBucket: "vending-book.firebasestorage.app",
    messagingSenderId: "622650100879",
    appId: "1:622650100879:web:cae923c3c6590fc0d974fa",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const allDocs = await getDocs(collection(db, 'customers'));
let found = null;

for (const docSnap of allDocs.docs) {
    const data = docSnap.data();
    if (data.address === '1890 Flatbush Ave' || (data.zone === 'Brooklyn' && /laundry station/i.test(data.name))) {
        found = { id: docSnap.id, ...data };
        break;
    }
}

if (found) {
    console.log(`Found existing entry: ${found.name} (${found.id})`);
    console.log(`  Address: ${found.address}, Commission: ${found.commissionRate}`);
    console.log(`  Logs: ${found.logs?.length || 0}`);
    console.log('\nUpdating to clean new install...');

    await updateDoc(doc(db, 'customers', found.id), {
        name: 'The Laundry Station',
        address: '1890 Flatbush Ave',
        city: 'Brooklyn',
        state: 'NY',
        zone: 'Brooklyn',
        region: 'Brooklyn',
        commissionRate: 0.40,
        hasChangeMachine: true,
        changeMachineCount: 1,
        notes: 'Has change machine\nNew install 2/10/26',
        subtitle: 'Has change machine | New install 2/10/26',
        status: 'pending',
        lastVisited: '2026-02-10T12:00:00',
        lastCollection: '0',
        logNotes: 'New install',
        bills: { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
        logs: [
            {
                date: '2026-02-10T12:00:00',
                collection: '0',
                commissionRate: 0.40,
                bills: { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
                notes: 'New install',
                user: '',
                totalWeight: '0',
                halfWeight: '0',
                noMoney: true,
            }
        ],
    });

    console.log('✅ Updated: The Laundry Station @ 1890 Flatbush Ave, Brooklyn — 40% — Has Change Machine — New install 2/10/26');
} else {
    console.log('❌ Entry not found. It may not have been uploaded yet.');
}

process.exit(0);
