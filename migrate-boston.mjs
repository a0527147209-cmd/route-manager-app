/**
 * Migration script: Import Boston CSV data into Firebase Firestore
 * 
 * Usage: node migrate-boston.mjs
 * 
 * CSV columns (same as Pittsburgh):
 *   0: Address, 1: City, 2: State, 3: Machine/%
 *   4: Date, 5: Total weight, 6: Half weight
 *   7: User (header says 50$), 8: $50, 9: $20, 10: $10, 11: $5, 12: $1
 * 
 * Cleans up previous "Boston" entries, then uploads fresh.
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
const ZONE = 'Boston';

const CSV_PATH = '/Users/libi/Downloads/Vending Book - Boston .csv';
const raw = readFileSync(CSV_PATH, 'utf-8');
const rawLines = raw.split('\n').map(l => l.replace(/\r$/, ''));

const mergedLines = [];
let buffer = '';
let inQuote = false;
for (const line of rawLines) {
    if (inQuote) {
        buffer += ' ' + line;
        if ((line.match(/"/g) || []).length % 2 === 1) { inQuote = false; mergedLines.push(buffer); buffer = ''; }
    } else {
        const qc = (line.match(/"/g) || []).length;
        if (qc % 2 === 1) { inQuote = true; buffer = line; }
        else mergedLines.push(line);
    }
}
if (buffer) mergedLines.push(buffer);
const dataLines = mergedLines.slice(1);

// ── Helpers ──

function isStreetAddress(str) {
    const s = str.trim();
    if (!s) return false;
    if (/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(s)) return false;
    if (/^(put|make|text|call|change|cheng|mechine|machine|the\s|every|close|told|somebody|building|picked|no\s|token|go\s|always|add\s|Mr\.|opening|changed|drop|assemble|in\s+storage|store|top\s|still|owner|reinstall|trying|new\s|missing|bring|has\s|with\s|show|do\s|ask|skip|Danny|Eddie|gumball|under|did|is\s|request|open|🎣|cheng|owed)/i.test(s)) return false;
    if (/^"?machine/i.test(s)) return false;
    if (!/^\d/.test(s)) return false;
    if (/\b(st|street|ave?|avenue|blvd|boulevard|rd|road|ln|lane|dr|drive|pl|place|way|ct|court|hwy|highway|pike|pkwy|parkway|broadway)\b/i.test(s)) return true;
    if (/^\d+\s+[NSEW]\s+\w+/i.test(s)) return true;
    if (/^\d+\s+\w+\s+\w+/i.test(s)) return true;
    return false;
}

function parseCommission(str) {
    if (!str || !str.trim()) return 0;
    const match = str.trim().match(/(\d+)\s*%/);
    return match ? parseInt(match[1]) / 100 : 0;
}

function parseDate(str) {
    if (!str || !str.trim()) return null;
    const s = str.trim().replace(/\.$/, '').replace(/\s+/g, '');
    const parts = s.split('/');
    if (parts.length < 2) return null;
    let m, d, y;
    if (parts.length === 2) { [m, d] = parts; y = '2026'; }
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
    if (/no\s*money|closed|installed|install|took\s*all|broken|off|still/i.test(s)) return '0';
    if (/^no\s*bill/i.test(s)) return '0';
    const num = parseFloat(s);
    return isNaN(num) ? '0' : num.toString();
}

function isNoMoney(totalWeight) {
    const tw = (totalWeight || '').trim().toLowerCase();
    return /no\s*money/i.test(tw) || /^closed$/i.test(tw) || /^installed$/i.test(tw) || /still\s*closed/i.test(tw);
}

function cleanBill(str) {
    if (!str) return 0;
    let s = str.trim().replace(/\$/g, '').replace(/⌚️?/g, '').replace(/⌚/g, '').replace(/watch/gi, '').replace(/no\s*bill/gi, '0').trim();
    if (/^\d+-\$?\d+/.test(s)) { return parseInt(s.match(/^(\d+)/)[1]); }
    return parseInt(s) || 0;
}

function parse50(str) {
    if (!str) return { bill50: 0, extra20: 0 };
    const s = str.trim();
    let bill50 = 0, extra20 = 0;
    if (/1-?\$?50.*1-?\$?20/i.test(s)) {
        const m50 = s.match(/(\d+)-?\$?50/); bill50 = m50 ? parseInt(m50[1]) : 0;
        const m20 = s.match(/(\d+)-?\$?20/); extra20 = m20 ? parseInt(m20[1]) : 0;
    } else if (/\d+-?\$?50/i.test(s)) {
        bill50 = parseInt(s.match(/(\d+)/)?.[1] || '0');
    } else {
        bill50 = cleanBill(s);
    }
    return { bill50, extra20 };
}

function parseBills(cols) {
    const { bill50, extra20 } = parse50(cols[0]);
    return {
        50: bill50,
        20: cleanBill(cols[1]) + extra20,
        10: cleanBill(cols[2]),
        5: cleanBill(cols[3]),
        1: cleanBill(cols[4]),
    };
}

function parseUser(str) {
    if (!str) return '';
    let s = str.trim().replace(/⌚️?/g, '').replace(/⌚/g, '').trim();
    if (s === 'p:j') return 'pj';
    return s;
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
        if (/change\s*machine|change\s*mechine|has\s*change|hopper/i.test(lower)) {
            hasChange = true;
            if (/x3|3\s*x|double/i.test(lower)) count = Math.max(count, 2);
            else count = Math.max(count, 1);
        }
        if (/2\s*change/i.test(lower)) { hasChange = true; count = Math.max(count, 2); }
    }
    return { hasChange, count: count || (hasChange ? 1 : 0) };
}

function isInactiveLocation(notes) {
    for (const n of notes) {
        const lower = n.toLowerCase();
        if (/machine?\s*picked\s*up|mechine\s*picked\s*up|mashin\s*picked/i.test(lower)) return true;
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

    if (isStreetAddress(address) && city) {
        if (currentLocation) locationGroups.push(currentLocation);
        currentLocation = {
            address: address.replace(/\s+/g, ' ').trim(),
            city: city.replace(/,\s*$/, '').trim(),
            state: (state || 'MA').replace(/\s/g, ''),
            commission, commissionRate: parseCommission(commission),
            notes: [], logs: [],
        };
        if (date) {
            currentLocation.logs.push({
                date: parseDate(date), totalWeight, halfWeight,
                user: parseUser(user),
                bills: parseBills([bill50, bill20, bill10, bill5, bill1]),
                notes: '', noMoney: isNoMoney(totalWeight),
            });
        }
        continue;
    }

    if (currentLocation) {
        const isEmptyRow = !address && !date && !totalWeight;
        if (isEmptyRow) continue;

        if (address && !date) { currentLocation.notes.push(address); continue; }
        if (address && date) currentLocation.notes.push(address);

        if (date) {
            const logNote = (address && !/^\d/.test(address)) ? address : '';
            currentLocation.logs.push({
                date: parseDate(date), totalWeight, halfWeight,
                user: parseUser(user),
                bills: parseBills([bill50, bill20, bill10, bill5, bill1]),
                notes: logNote, noMoney: isNoMoney(totalWeight),
            });
        }
    }
}
if (currentLocation) locationGroups.push(currentLocation);

console.log(`\n📊 Parsed ${locationGroups.length} locations from Boston CSV\n`);

let activeCount = 0, inactiveCount = 0;
for (const loc of locationGroups) {
    const inactive = isInactiveLocation(loc.notes);
    if (inactive) inactiveCount++; else activeCount++;
    console.log(`📍 ${loc.address}, ${loc.city} ${loc.state} — ${loc.commission || 'N/A'} ${inactive ? 'INACTIVE' : ''} — ${loc.logs.length} logs`);
}
console.log(`\n📊 ${activeCount} active + ${inactiveCount} inactive = ${locationGroups.length} total\n`);

// ── Clean up ──
console.log(`🗑️  Removing existing "${ZONE}" entries...`);
const allDocs = await getDocs(collection(db, COLLECTION));
let deleted = 0;
for (const docSnap of allDocs.docs) {
    const data = docSnap.data();
    if (data.zone === ZONE || data.region === ZONE) { await deleteDoc(doc(db, COLLECTION, docSnap.id)); deleted++; }
}
console.log(`   Deleted ${deleted} existing documents.\n`);

// ── Upload ──
console.log('🚀 Starting Firestore upload...\n');
let uploaded = 0;
const existingCount = (await getDocs(collection(db, COLLECTION))).size;
console.log(`   📦 Existing documents: ${existingCount}\n`);

for (let i = 0; i < locationGroups.length; i++) {
    const loc = locationGroups[i];
    loc.logs.sort((a, b) => { if (!a.date) return 1; if (!b.date) return -1; return b.date.localeCompare(a.date); });

    const latestLog = loc.logs[0];
    const { hasChange, count: changeMachineCount } = parseChangeMachine(loc.notes);
    const inactive = isInactiveLocation(loc.notes);

    const subtitleParts = loc.notes.filter(n => {
        const lower = n.toLowerCase();
        return /\d{3}.*\d{4}/.test(n) || /call|text|close|machine|mashin|mechine|change|cheng|token|install|picked|storage|motor|tray|hopper|receipt|fish|broken|fixed|quarters|🎣|construction|pipe|gumball|every\s*\d|owner/i.test(lower);
    });
    const subtitle = subtitleParts.join(' | ');

    const customerDoc = {
        name: loc.address, address: loc.address,
        city: loc.city, state: (loc.state || 'MA').trim(),
        zone: ZONE, region: ZONE, status: 'pending',
        commissionRate: loc.commissionRate,
        hasChangeMachine: hasChange, changeMachineCount,
        notes: loc.notes.join('\n'), subtitle,
        order: existingCount + i, createdAt: new Date().toISOString(),
        lastVisited: latestLog?.date || null,
        lastCollection: parseWeight(latestLog?.totalWeight),
        logNotes: latestLog?.notes || '',
        bills: latestLog?.bills || { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
        ...(inactive ? { inactive: true } : {}),
        logs: loc.logs.map(log => ({
            date: log.date, collection: parseWeight(log.totalWeight),
            commissionRate: loc.commissionRate, bills: log.bills,
            notes: log.notes || '', user: log.user || '',
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
        console.log(`✅ [${i + 1}/${locationGroups.length}] ${loc.address}, ${loc.city} → ${docRef.id} (${loc.logs.length} logs) ${flags.join(' ')}`);
        uploaded++;
    } catch (err) { console.error(`❌ Failed: ${loc.address}:`, err.message); }
}

console.log(`\n🎉 Done! Uploaded ${uploaded}/${locationGroups.length} locations.`);
console.log(`   Zone: "${ZONE}"`);
console.log(`   Collection: "${COLLECTION}" (now has ${existingCount + uploaded} total)\n`);
process.exit(0);
