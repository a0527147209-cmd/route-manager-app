/**
 * Migration script: Import New Jersey CSV data into Firebase Firestore
 * 
 * Usage: node migrate-nj.mjs
 * 
 * This reads the NJ CSV file, parses locations + logs, and ADDS them
 * to the existing 'customers' collection in Firestore (does NOT delete existing data).
 */

import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

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

const CSV_PATH = '/Users/libi/Downloads/Vending Book - New Jersey .csv';
const raw = readFileSync(CSV_PATH, 'utf-8');
const lines = raw.split('\n').map(l => l.replace(/\r$/, ''));
const dataLines = lines.slice(1);

function isStreetAddress(str) {
    const s = str.trim();
    if (!s) return false;
    if (/^\d+\s/.test(s)) return true;
    if (/\d+\s+(main|ocean|broadway|communipaw|bergenline|bergen|mallory|duncan|tonnelle|kerrigan|summit|park|ridge|washington|franklin|belleville|freeman|central|newark|springfield|cordier|stuyvesant|elizabeth|elmora|westfield|george|amboy|fayette|smith|market|state|new brunswick|lincoln|townsley|woodbridge|schuyler|french|remsen|bordentown|easton|morris|howard|van houten|lexington|dayton|jackson|grand|union|main)/i.test(s)) return true;
    if (/^\d+\s/.test(s)) return true;
    if (/\d+\s+\w+\s+(st|ave|blvd|rd|ln|lane|dr|pl|way|ct|hwy|pike|turnpike)/i.test(s)) return true;
    return false;
}

function parseCommission(str) {
    if (!str || !str.trim()) return 0;
    const s = str.trim().toLowerCase();
    if (s === 'tokens') return 0;
    const cleaned = s.replace(/[%$]/g, '');
    const match = cleaned.match(/(\d+)/);
    if (match) return parseInt(match[1]) / 100;
    return 0;
}

function getCommissionDisplay(str) {
    if (!str || !str.trim()) return '';
    const s = str.trim().toLowerCase();
    if (s === 'tokens') return 'tokens';
    return str.trim();
}

function parseDate(str) {
    if (!str || !str.trim()) return null;
    const s = str.trim().replace(/\.$/, '');
    const parts = s.split('/');
    if (parts.length !== 3) return null;
    const [m, d, y] = parts;
    if (!m || !d || !y) return null;
    let year = y.trim();
    if (year.length === 2) year = `20${year}`;
    const mi = parseInt(m);
    const di = parseInt(d);
    const yi = parseInt(year);
    if (isNaN(mi) || isNaN(di) || isNaN(yi)) return null;
    return `${yi}-${mi.toString().padStart(2, '0')}-${di.toString().padStart(2, '0')}T12:00:00`;
}

function parseWeight(str) {
    if (!str || !str.trim()) return '0';
    const s = str.trim().replace(/\$/g, '').replace(/,/g, '.').replace(/\.$/, '');
    if (/no money|closed|installed|machine|took all|store closed|storage/i.test(s)) return '0';
    const num = parseFloat(s);
    return isNaN(num) ? '0' : num.toString();
}

function parseBills(cols) {
    return {
        50: parseInt(cols[0]) || 0,
        20: parseInt(cols[1]) || 0,
        10: parseInt(cols[2]) || 0,
        5: parseInt(cols[3]) || 0,
        1: parseInt(cols[4]) || 0,
    };
}

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

function parseChangeMachine(notes) {
    let count = 0;
    let hasChange = false;
    for (const n of notes) {
        const lower = n.toLowerCase();
        if (lower.includes('change machine') || lower.includes('change mashin') || lower.includes('change mechine')) {
            hasChange = true;
            const match = lower.match(/(\d+)\s*x?\s*change/);
            if (match) count = Math.max(count, parseInt(match[1]));
            else if (lower.includes('double hopper')) count = Math.max(count, 2);
            else count = Math.max(count, 1);
        }
        if (lower.includes('token mech') || lower.includes('token machine')) {
            hasChange = true;
            const tokenMatches = lower.match(/(\d+)\s*x?\s*token/g);
            if (tokenMatches) {
                let total = 0;
                for (const tm of tokenMatches) {
                    const num = tm.match(/(\d+)/);
                    total += num ? parseInt(num[1]) : 1;
                }
                count = Math.max(count, total);
            } else {
                count = Math.max(count, 1);
            }
        }
    }
    return { hasChange, count: count || (hasChange ? 1 : 0) };
}

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
            address,
            city,
            state: state || 'NJ',
            commission,
            commissionRate: parseCommission(commission),
            isTokenMachine: commission.toLowerCase().trim() === 'tokens',
            notes: [],
            logs: [],
        };

        if (date) {
            currentLocation.logs.push({
                date: parseDate(date),
                totalWeight,
                halfWeight,
                user,
                bills: parseBills([bill50, bill20, bill10, bill5, bill1]),
                notes: '',
            });
        }
    } else if (currentLocation) {
        const isEmptyRow = !address && !date && !totalWeight;
        if (isEmptyRow) continue;

        if (address) {
            currentLocation.notes.push(address);
        }

        if (date) {
            const logNote = (address && !isStreetAddress(address)) ? address : '';
            currentLocation.logs.push({
                date: parseDate(date),
                totalWeight,
                halfWeight,
                user,
                bills: parseBills([bill50, bill20, bill10, bill5, bill1]),
                notes: logNote,
            });
        }
    }
}

if (currentLocation) locationGroups.push(currentLocation);

console.log(`\n📊 Parsed ${locationGroups.length} locations from NJ CSV\n`);

for (const loc of locationGroups) {
    console.log(`📍 ${loc.address}, ${loc.city} — ${loc.commission || 'N/A'} — ${loc.logs.length} logs`);
    for (const log of loc.logs) {
        console.log(`   📅 ${log.date} | ${log.totalWeight || '0'} lbs | by ${log.user || '?'} | $50×${log.bills[50]} $20×${log.bills[20]} $10×${log.bills[10]} $5×${log.bills[5]} $1×${log.bills[1]}`);
    }
    if (loc.notes.length > 0) {
        console.log(`   📝 Notes: ${loc.notes.join(' | ')}`);
    }
    console.log('');
}

console.log('🚀 Starting Firestore upload (ADDING to existing data)...\n');

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

    const subtitleParts = loc.notes.filter(n => {
        const lower = n.toLowerCase();
        return (
            /\d{3}.*\d{4}/.test(n) ||
            /call\s/i.test(n) ||
            /text\s/i.test(n) ||
            /close[sd]?\s/i.test(n) ||
            /no\s(bills|20|money)/i.test(n) ||
            /pick\s?it\s?up/i.test(n) ||
            /recommend/i.test(n) ||
            /double hopper/i.test(n) ||
            /put\s(a\s)?\$?\d+/i.test(n) ||
            /fill\sup/i.test(n) ||
            /don.t\s/i.test(n) ||
            /receipt/i.test(n) ||
            /envelope/i.test(n) ||
            /change machine/i.test(n) ||
            /change mashin/i.test(n) ||
            /change mechine/i.test(n) ||
            /has\schange/i.test(n) ||
            /token/i.test(n) ||
            /toy\srack/i.test(n) ||
            /gumball/i.test(n) ||
            /not\sour/i.test(n) ||
            /scale/i.test(n) ||
            /drill/i.test(n) ||
            /store\sclosed/i.test(n) ||
            /machine\s(picked|ripped|out)/i.test(n) ||
            /re-?installed/i.test(n) ||
            /replaced/i.test(n) ||
            /fixed/i.test(n) ||
            /stuck/i.test(n) ||
            /broken/i.test(n) ||
            /jammed/i.test(n) ||
            /power\sissue/i.test(n) ||
            /wensday|wednesday|sunday|monday|tuesday|thursday|friday|saturday/i.test(n) ||
            /quarters/i.test(n) ||
            /use\slink/i.test(n) ||
            /singles/i.test(n) ||
            /poker/i.test(n) ||
            /owner/i.test(n) ||
            /new\s(install|location)/i.test(n) ||
            /for\srent/i.test(n) ||
            /not\sin\sthe\sshopping/i.test(n) ||
            /1\s*pound/i.test(n) ||
            /always\sask/i.test(n) ||
            /suggest/i.test(n) ||
            /hole\sin/i.test(n) ||
            /stealing/i.test(n) ||
            /plexiglass/i.test(n) ||
            /afternoon/i.test(n)
        );
    });

    const subtitle = subtitleParts.join(' | ');

    const customerDoc = {
        name: loc.address,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        zone: 'New Jersey',
        region: 'New Jersey',
        status: 'pending',
        commissionRate: loc.commissionRate,
        hasChangeMachine: hasChange,
        changeMachineCount: changeMachineCount,
        notes: loc.notes.join('\n'),
        subtitle: subtitle,
        order: existingCount + i,
        createdAt: new Date().toISOString(),
        lastVisited: latestLog?.date || null,
        lastCollection: parseWeight(latestLog?.totalWeight),
        logNotes: latestLog?.notes || '',
        bills: latestLog?.bills || { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
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

    if (loc.isTokenMachine) {
        customerDoc.isTokenMachine = true;
    }

    try {
        const docRef = await addDoc(collection(db, COLLECTION), customerDoc);
        console.log(`✅ [${i + 1}/${locationGroups.length}] ${loc.address}, ${loc.city} → ${docRef.id} (${loc.logs.length} logs)${subtitle ? ' 🔴 ' + subtitle.slice(0, 60) : ''}`);
        uploaded++;
    } catch (err) {
        console.error(`❌ Failed to upload ${loc.address}:`, err.message);
    }
}

console.log(`\n🎉 Done! Uploaded ${uploaded}/${locationGroups.length} NJ locations to Firestore.`);
console.log('   All locations are under zone: "New Jersey"');
console.log(`   Collection: "${COLLECTION}" (now has ${existingCount + uploaded} total documents)\n`);

process.exit(0);
