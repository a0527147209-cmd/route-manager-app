/**
 * Migration script: Import Lakewood NJ CSV data into Firebase Firestore
 * 
 * Usage: node migrate-lakewood.mjs
 * 
 * Lakewood CSV columns (Staten Island format):
 *   0: Address, 1: City, 2: State, 3: Machine/%
 *   4: Date, 5: Total weight, 6: Half weight, 7: User (labeled 50$ in header)
 *   8-12: Bills (50$, 20$, 10$, 5$, 1$/watches)
 * 
 * ADDS to existing data. Cleans up previous Lakewood NJ entries first.
 */

import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

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
const ZONE = 'Lakewood NJ';

const CSV_PATH = '/Users/libi/Downloads/Vending Book - Lakewood _ NJ (1).csv';
const raw = readFileSync(CSV_PATH, 'utf-8');
const lines = raw.split('\n').map(l => l.replace(/\r$/, ''));
const dataLines = lines.slice(1);

// ── Helpers ──

function isStreetAddress(str) {
    const s = str.trim();
    if (!s) return false;
    if (/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(s)) return false;
    if (/^\d{7,}$/.test(s.replace(/\D/g, ''))) return false;
    if (/^new\s/i.test(s)) return false;
    if (/^(put|make|text|call|change|mechine|machine|the\s)/i.test(s)) return false;
    if (!/^\d/.test(s)) return false;
    if (/\b(st|street|ave?|avenue|blvd|boulevard|rd|road|ln|lane|dr|drive|pl|place|way|ct|court|hwy|pike|pkwy|parkway|broadway|route|rute|rt)\b/i.test(s)) return true;
    if (/\bNJ-?\d+/i.test(s)) return true;
    if (/\bUS-?\d+/i.test(s)) return true;
    if (/\d+\s+\w+\s+(ave|st|rd|blvd|road|street)/i.test(s)) return true;
    return false;
}

function isFullAddressLine(str) {
    const s = str.trim();
    return /^\d+\.?\s+.+\b(nj|ny|pa|ct|md|de)\b\s+\d{5}/i.test(s);
}

function parseFullAddressLine(str) {
    const s = str.trim();
    const match = s.match(/^(\d+\.?\s+.+?)\s+([\w\s]+?)\s+(nj|ny|pa|ct|md|de)\s+(\d{5})\s*(\(.*\))?$/i);
    if (match) {
        let addr = match[1].trim();
        const notes = match[5] ? match[5].replace(/[()]/g, '').trim() : '';
        return { address: addr, city: match[2].trim(), state: match[3].toUpperCase(), zip: match[4], notes };
    }
    return null;
}

function parseCommission(str) {
    if (!str || !str.trim()) return 0;
    const s = str.trim().toLowerCase();
    const match = s.match(/(\d+)\s*%/);
    if (match) return parseInt(match[1]) / 100;
    return 0;
}

function parseDate(str) {
    if (!str || !str.trim()) return null;
    const s = str.trim().replace(/\.$/, '').replace(/\s+/g, '');
    const parts = s.split('/');
    if (parts.length < 2) return null;
    let m, d, y;
    if (parts.length === 2) { [m, d] = parts; y = '2025'; }
    else { [m, d, y] = parts; }
    if (!m || !d) return null;
    let year = (y || '2025').trim();
    if (year.length === 2) year = `20${year}`;
    const mi = parseInt(m), di = parseInt(d), yi = parseInt(year);
    if (isNaN(mi) || isNaN(di) || isNaN(yi)) return null;
    return `${yi}-${mi.toString().padStart(2, '0')}-${di.toString().padStart(2, '0')}T12:00:00`;
}

function parseWeight(str) {
    if (!str || !str.trim()) return '0';
    let s = str.trim().replace(/\$/g, '').replace(/lb/gi, '').replace(/,/g, '.').replace(/\.+$/, '').replace(/\s/g, '');
    if (/no\s*money|closed|installed|install|took\s*all|broken|off/i.test(s)) return '0';
    if (/new\s*motor/i.test(s)) return '0';
    const num = parseFloat(s);
    return isNaN(num) ? '0' : num.toString();
}

function isNoMoney(totalWeight) {
    const tw = (totalWeight || '').trim().toLowerCase();
    return /no\s*money/i.test(tw) || /^closed$/i.test(tw) || /new\s*install/i.test(tw) || /new\s*motor/i.test(tw);
}

function cleanBillValue(str) {
    if (!str) return 0;
    const s = str.trim().replace(/\$/g, '').replace(/⌚️?/g, '').replace(/⌚/g, '').trim();
    return parseInt(s) || 0;
}

function parseBills(cols) {
    return {
        50: cleanBillValue(cols[0]),
        20: cleanBillValue(cols[1]),
        10: cleanBillValue(cols[2]),
        5: cleanBillValue(cols[3]),
        1: cleanBillValue(cols[4]),
    };
}

function parseUser(str) {
    if (!str) return '';
    return str.trim().replace(/⌚️?/g, '').replace(/⌚/g, '').trim();
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
        else current += ch;
    }
    result.push(current);
    return result;
}

function parseChangeMachine(notes) {
    let count = 0, hasChange = false;
    for (const n of notes) {
        const lower = n.toLowerCase();
        if (/change\s*machine|change\s*mechine|change\s*mashine|has\s*change/i.test(lower)) {
            hasChange = true;
            const match = lower.match(/(\d+)\s*x?\s*change/);
            count = match ? Math.max(count, parseInt(match[1])) : Math.max(count, 1);
        }
    }
    return { hasChange, count: count || (hasChange ? 1 : 0) };
}

function isInactiveLocation(notes) {
    for (const n of notes) {
        if (/machine?\s*picked\s*up|mechine\s*picked\s*up/i.test(n)) return true;
    }
    return false;
}

// ── Main parsing ──
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
    const bill1 = (cols[12] || '').trim();

    // Skip header-like notes (not actual locations)
    if (/^new location/i.test(address) && !date) continue;
    if (/^\d+\s+\w+\s+st\s+pittsburgh/i.test(address) && !date) continue;

    // Full address line (e.g. "2940. Rute 9 south Howell nj 07731 (no bills)")
    if (isFullAddressLine(address) && !date) {
        if (currentLocation) locationGroups.push(currentLocation);
        const parsed = parseFullAddressLine(address);
        currentLocation = {
            address: parsed ? parsed.address.replace(/\.\s/, ' ').replace(/Rute/i, 'Route') : address,
            city: parsed ? parsed.city : '',
            state: parsed ? parsed.state : 'NJ',
            commission: '',
            commissionRate: 0,
            notes: parsed?.notes ? [parsed.notes] : [],
            logs: [],
        };
        continue;
    }

    // New location (has street address + city)
    if (isStreetAddress(address) && city) {
        if (currentLocation) locationGroups.push(currentLocation);
        currentLocation = {
            address: address.replace(/\s+/g, ' ').trim(),
            city: city.trim(),
            state: (state || 'NJ').trim(),
            commission,
            commissionRate: parseCommission(commission),
            notes: [],
            logs: [],
        };
        if (date) {
            currentLocation.logs.push({
                date: parseDate(date),
                totalWeight, halfWeight,
                user: parseUser(user),
                bills: parseBills([bill50, bill20, bill10, bill5, bill1]),
                notes: '',
                noMoney: isNoMoney(totalWeight),
            });
        }
        continue;
    }

    // Continuation row
    if (currentLocation) {
        const isEmptyRow = !address && !date && !totalWeight;
        if (isEmptyRow) continue;

        // "new install" line with commission (for the full-address location)
        if (/^new\s*install/i.test(address) && commission) {
            currentLocation.commissionRate = parseCommission(commission);
            currentLocation.commission = commission;
            currentLocation.notes.push(address);
        }

        // Note lines
        if (address && !date) {
            currentLocation.notes.push(address);
            continue;
        }

        // Note + log (has both text in address and a date)
        if (address && date) {
            currentLocation.notes.push(address);
        }

        // Log entry
        if (date) {
            const logNote = (address && !/^\d/.test(address)) ? address : '';
            currentLocation.logs.push({
                date: parseDate(date),
                totalWeight, halfWeight,
                user: parseUser(user),
                bills: parseBills([bill50, bill20, bill10, bill5, bill1]),
                notes: logNote,
                noMoney: isNoMoney(totalWeight),
            });
        }
    }
}

if (currentLocation) locationGroups.push(currentLocation);

console.log(`\n📊 Parsed ${locationGroups.length} locations from Lakewood NJ CSV\n`);

for (const loc of locationGroups) {
    const flags = [];
    if (isInactiveLocation(loc.notes)) flags.push('INACTIVE');
    console.log(`📍 ${loc.address}, ${loc.city} ${loc.state} — ${loc.commission || 'N/A'} ${flags.join(' ')} — ${loc.logs.length} logs`);
    for (const log of loc.logs) {
        const nm = log.noMoney ? ' [NO MONEY]' : '';
        console.log(`   📅 ${log.date} | ${log.totalWeight || '0'} | by ${log.user || '?'} | $50×${log.bills[50]} $20×${log.bills[20]} $10×${log.bills[10]} $5×${log.bills[5]} $1×${log.bills[1]}${nm}`);
    }
    if (loc.notes.length > 0) {
        console.log(`   📝 Notes: ${loc.notes.join(' | ')}`);
    }
    console.log('');
}

// ── Clean up previous Lakewood NJ uploads ──
console.log(`🗑️  Removing existing "${ZONE}" entries...`);
const allDocs = await getDocs(collection(db, COLLECTION));
let deleted = 0;
for (const docSnap of allDocs.docs) {
    const data = docSnap.data();
    if (data.zone === ZONE || data.region === ZONE) {
        await deleteDoc(doc(db, COLLECTION, docSnap.id));
        deleted++;
    }
}
console.log(`   Deleted ${deleted} existing documents.\n`);

// ── Upload ──
console.log('🚀 Starting Firestore upload...\n');
let uploaded = 0;
const existingCount = (await getDocs(collection(db, COLLECTION))).size;
console.log(`   📦 Existing documents in collection: ${existingCount}\n`);

for (let i = 0; i < locationGroups.length; i++) {
    const loc = locationGroups[i];

    loc.logs.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
    });

    const latestLog = loc.logs[0];
    const { hasChange, count: changeMachineCount } = parseChangeMachine(loc.notes);
    const inactive = isInactiveLocation(loc.notes);

    const subtitleParts = loc.notes.filter(n => {
        const lower = n.toLowerCase();
        return (
            /\d{3}.*\d{4}/.test(n) || /call\s/i.test(n) || /text\s/i.test(n) ||
            /close[sd]?\s/i.test(n) || /no\s(bills?|money|cash)/i.test(n) ||
            /put\s/i.test(n) || /don.t\s/i.test(n) || /change\s/i.test(n) ||
            /machine|mechine/i.test(n) || /fishing/i.test(n) ||
            /motor/i.test(n) || /tray/i.test(n) || /coin\s*mac/i.test(n) ||
            /picked\s*up/i.test(n) || /new\s*install/i.test(n) ||
            /quarters/i.test(n) || /fixed/i.test(n) || /broken/i.test(n)
        );
    });
    const subtitle = subtitleParts.join(' | ');

    const customerDoc = {
        name: loc.address,
        address: loc.address,
        city: loc.city,
        state: (loc.state || 'NJ').trim(),
        zone: ZONE,
        region: ZONE,
        status: 'pending',
        commissionRate: loc.commissionRate,
        hasChangeMachine: hasChange,
        changeMachineCount,
        notes: loc.notes.join('\n'),
        subtitle,
        order: existingCount + i,
        createdAt: new Date().toISOString(),
        lastVisited: latestLog?.date || null,
        lastCollection: parseWeight(latestLog?.totalWeight),
        logNotes: latestLog?.notes || '',
        bills: latestLog?.bills || { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
        ...(inactive ? { inactive: true } : {}),
        logs: loc.logs.map(log => ({
            date: log.date,
            collection: parseWeight(log.totalWeight),
            commissionRate: loc.commissionRate,
            bills: log.bills,
            notes: log.notes || '',
            user: log.user || '',
            totalWeight: parseWeight(log.totalWeight),
            halfWeight: parseWeight(log.halfWeight),
            ...(log.noMoney ? { noMoney: true } : {}),
        })),
    };

    try {
        const docRef = await addDoc(collection(db, COLLECTION), customerDoc);
        const flags = [];
        if (hasChange) flags.push(`🔄 CH×${changeMachineCount}`);
        if (inactive) flags.push('⛔ INACTIVE');
        console.log(`✅ [${i + 1}/${locationGroups.length}] ${loc.address}, ${loc.city} → ${docRef.id} (${loc.logs.length} logs) ${flags.join(' ')}${subtitle ? '\n   🔴 ' + subtitle.slice(0, 80) : ''}`);
        uploaded++;
    } catch (err) {
        console.error(`❌ Failed: ${loc.address}:`, err.message);
    }
}

console.log(`\n🎉 Done! Uploaded ${uploaded}/${locationGroups.length} locations to Firestore.`);
console.log(`   Zone: "${ZONE}"`);
console.log(`   Collection: "${COLLECTION}" (now has ${existingCount + uploaded} total)\n`);

process.exit(0);
