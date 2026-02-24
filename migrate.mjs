/**
 * One-time migration script: Import CSV data into Firebase Firestore
 * 
 * Usage: node migrate.mjs
 * 
 * This reads the CSV file, parses locations + logs, and writes them
 * to the 'customers' collection in Firestore.
 */

import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, writeBatch, doc, getDocs, deleteDoc } from 'firebase/firestore';

// ── Firebase config (same as src/firebase.js) ──
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
const COLLECTION = 'customers';

// ── Parse CSV ──
const raw = readFileSync('./גיליון ללא שם - Staten island.csv', 'utf-8');
const lines = raw.split('\n').map(l => l.replace(/\r$/, ''));

// Skip header line
const dataLines = lines.slice(1);

// ── Parse the CSV into location groups ──
// A new location starts when the Address column has a street address (contains a number + letters)
// Continuation rows have empty address (just notes or log entries)

function isStreetAddress(str) {
    // A real address starts with a number or has "St", "Ave", "Blvd", "Rd", "Ln", "Lane", "Broadway"
    const s = str.trim();
    if (!s) return false;
    if (/^\d+\s/.test(s)) return true; // starts with a number + space
    if (/\d+\s+(bay|broad|jersey|castleton|grove|port|main|amboy|dorp|hylan|broadway)/i.test(s)) return true;
    return false;
}

function parseCommission(str) {
    // "45%" -> 0.45, "50% / 35%" -> 0.50 (take first), "40%" -> 0.40
    if (!str || !str.trim()) return 0;
    const match = str.match(/(\d+)%/);
    if (match) return parseInt(match[1]) / 100;
    return 0;
}

function parseDate(str) {
    // "12/18/2025" -> "2025-12-18T12:00:00" (noon to avoid timezone shifts)
    if (!str || !str.trim()) return null;
    const parts = str.trim().split('/');
    if (parts.length !== 3) return null;
    const [m, d, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00`;
}

function parseWeight(str) {
    // "22.8" -> "22.8", "No money" -> "0", "$14" -> "14", "13.85." -> "13.85"
    if (!str || !str.trim()) return '0';
    const s = str.trim().replace(/\$/g, '').replace(/\.$/, '');
    if (/no money|closed|installed|machine was off/i.test(s)) return '0';
    const num = parseFloat(s);
    return isNaN(num) ? '0' : num.toString();
}

function parseBills(cols) {
    // cols = [50$, 20, 10, 5, 1] — might be user name in 50$ column
    // The CSV header is: 50$,20,10,5,1 but col index 7 is actually the user name
    return {
        50: parseInt(cols[0]) || 0,
        20: parseInt(cols[1]) || 0,
        10: parseInt(cols[2]) || 0,
        5: parseInt(cols[3]) || 0,
        1: parseInt(cols[4]) || 0,
    };
}

// ── Parse CSV with proper quoting ──
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

// ── Group lines into locations ──
const locationGroups = [];
let currentLocation = null;

for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) continue;

    const cols = parseCSVLine(line);
    const address = (cols[0] || '').trim();
    const city = (cols[1] || '').trim();
    const state = (cols[2] || '').trim();
    const commission = (cols[3] || '').trim();
    const date = (cols[4] || '').trim();
    const totalWeight = (cols[5] || '').trim();
    const halfWeight = (cols[6] || '').trim();
    const user = (cols[7] || '').trim();
    const bill50 = (cols[8] || '').trim();
    const bill20 = (cols[9] || '').trim();
    const bill10 = (cols[10] || '').trim();
    const bill5 = (cols[11] || '').trim();
    // Note: bill1 may not always exist

    // Check if this is a new location
    if (isStreetAddress(address) && city) {
        // Save previous location
        if (currentLocation) {
            locationGroups.push(currentLocation);
        }

        // Determine hasChangeMachine from notes
        let hasChange = false;
        let notes = [];

        currentLocation = {
            address: address,
            city: city,
            state: state || 'NY',
            commission: commission,
            commissionRate: parseCommission(commission),
            hasChangeMachine: false,
            notes: [],
            logs: [],
        };

        // This row also has the first log entry
        if (date) {
            currentLocation.logs.push({
                date: parseDate(date),
                totalWeight: totalWeight,
                halfWeight: halfWeight,
                user: user,
                bills: parseBills([bill50, bill20, bill10, bill5, cols[12] || '']),
                notes: '',
            });
        }
    } else if (currentLocation) {
        // Continuation row — could be a note or a log entry

        // Check if it's a note line (has text in address column, no meaningful date/weight)
        const isNoteLine = address && !date;
        const isEmptyRow = !address && !date && !totalWeight;

        if (isEmptyRow) {
            continue;
        }

        // Check for special notes
        if (address) {
            const lowerAddr = address.toLowerCase();
            if (lowerAddr.includes('change machine') || lowerAddr.includes('has change machine')) {
                currentLocation.hasChangeMachine = true;
            }
            if (lowerAddr.includes('text amount') || lowerAddr.includes('with picture')) {
                // Phone number / notification preference note
                currentLocation.notes.push(address);
            } else if (lowerAddr.includes('change machine') || lowerAddr.includes('has change machine')) {
                currentLocation.notes.push(address);
            } else if (!date && address) {
                // Pure note line
                currentLocation.notes.push(address);
            }
        }

        // If it has a date, it's a log entry (even if it also has a note in address)
        if (date) {
            const logNote = (address && !isStreetAddress(address)) ? address : '';
            currentLocation.logs.push({
                date: parseDate(date),
                totalWeight: totalWeight,
                halfWeight: halfWeight,
                user: user,
                bills: parseBills([bill50, bill20, bill10, bill5, cols[12] || '']),
                notes: logNote,
            });
        }
    }
}

// Don't forget the last location
if (currentLocation) {
    locationGroups.push(currentLocation);
}

console.log(`\n📊 Parsed ${locationGroups.length} locations from CSV\n`);

// ── Preview ──
for (const loc of locationGroups) {
    console.log(`📍 ${loc.address}, ${loc.city} — ${loc.commission || 'N/A'} — ${loc.logs.length} logs — Change: ${loc.hasChangeMachine ? 'Yes' : 'No'}`);
    for (const log of loc.logs) {
        console.log(`   📅 ${log.date} | ${log.totalWeight || '0'} lbs | by ${log.user || '?'} | Bills: $50×${log.bills[50]} $20×${log.bills[20]} $10×${log.bills[10]} $5×${log.bills[5]} $1×${log.bills[1]}`);
    }
    if (loc.notes.length > 0) {
        console.log(`   📝 Notes: ${loc.notes.join(' | ')}`);
    }
    console.log('');
}

// ── Delete existing data first ──
console.log('🗑️  Cleaning up existing data...');
const colRef = collection(db, COLLECTION);
const existingDocs = await getDocs(colRef);
let deleted = 0;
for (const docSnap of existingDocs.docs) {
    await deleteDoc(doc(db, COLLECTION, docSnap.id));
    deleted++;
}
console.log(`   Deleted ${deleted} existing documents.\n`);

// ── Upload to Firestore ──
console.log('🚀 Starting Firestore upload...\n');

let uploaded = 0;

for (let i = 0; i < locationGroups.length; i++) {
    const loc = locationGroups[i];

    // Sort logs by date (newest first)
    loc.logs.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
    });

    const latestLog = loc.logs[0];

    // Build the customer document (matching the app's data model)
    const customerDoc = {
        name: loc.address, // Use address as the name/title
        address: loc.address,
        city: loc.city,
        state: loc.state,
        zone: 'Staten Island',
        region: 'Staten Island',
        status: 'pending',
        commissionRate: loc.commissionRate,
        hasChangeMachine: loc.hasChangeMachine,
        notes: loc.notes.join('\n'),
        order: i,
        createdAt: new Date().toISOString(),
        // Latest log data
        lastVisited: latestLog?.date || null,
        lastCollection: parseWeight(latestLog?.totalWeight),
        logNotes: latestLog?.notes || '',
        bills: latestLog?.bills || { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
        // Full log history
        logs: loc.logs.map(log => ({
            date: log.date,
            collection: parseWeight(log.totalWeight),
            commissionRate: loc.commissionRate,
            bills: log.bills,
            notes: log.notes || '',
            user: log.user || '',
            totalWeight: parseWeight(log.totalWeight),
            halfWeight: parseWeight(log.halfWeight),
        })),
    };

    try {
        const docRef = await addDoc(collection(db, COLLECTION), customerDoc);
        console.log(`✅ [${i + 1}/${locationGroups.length}] ${loc.address} → ${docRef.id} (${loc.logs.length} logs)`);
        uploaded++;
    } catch (err) {
        console.error(`❌ Failed to upload ${loc.address}:`, err.message);
    }
}

console.log(`\n🎉 Done! Uploaded ${uploaded}/${locationGroups.length} locations to Firestore.`);
console.log('   All locations are under zone: "Staten Island"');
console.log('   Collection: "customers"\n');

process.exit(0);
