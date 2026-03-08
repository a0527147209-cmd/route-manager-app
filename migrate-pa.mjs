/**
 * Migration script: Import PA CSV data into Firebase Firestore
 * 
 * Usage: node migrate-pa.mjs
 * 
 * PA CSV Format A (with Name column):
 *   0: Address, 1: (empty), 2: Name, 3: City, 4: State, 5: Machine/%
 *   6: Date, 7: Total weight, 8: Half weight, 9: User
 *   10: $50, 11: $20, 12: $10, 13: $5, 14: $1, 15: watches
 * 
 * Cleans up previous "PA" entries, then uploads fresh.
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
const ZONE = 'PA';

const CSV_PATH = '/Users/libi/Downloads/Vending Book - PA.csv';
const raw = readFileSync(CSV_PATH, 'utf-8');
const rawLines = raw.split('\n').map(l => l.replace(/\r$/, ''));

// Merge multi-line quoted fields
const mergedLines = [];
let buffer = '';
let inQuote = false;
for (const line of rawLines) {
    if (inQuote) {
        buffer += ' ' + line;
        if ((line.match(/"/g) || []).length % 2 === 1) {
            inQuote = false;
            mergedLines.push(buffer);
            buffer = '';
        }
    } else {
        const quoteCount = (line.match(/"/g) || []).length;
        if (quoteCount % 2 === 1) {
            inQuote = true;
            buffer = line;
        } else {
            mergedLines.push(line);
        }
    }
}
if (buffer) mergedLines.push(buffer);

const dataLines = mergedLines.slice(1);

// ── Helpers ──

function isStreetAddress(str) {
    const s = str.trim();
    if (!s) return false;
    if (/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(s)) return false;
    if (/^(put|make|text|call|change|cheng|mechine|machine|the[ay]\s|every|close|told|somebody|building|picked|no\s|token|go\s|always|add\s|Mr\.|Saif|opening|changed|drop|assemble|in\s+storage|store|top\s|still|owner|reinstall|trying|new\s|missing|bring|not\s|method|has\s|with\s|skill|insert|ryan|double|pay\s|first|he\s|open|Sunday|check|must|fold|coin|need|theay|comes|stop\s|don't|wants|we\s|definitely|Active|Owed|Or\s|mashin|sometime|cheang|paid|recommend|motor|🎣)/i.test(s)) return false;
    if (/^"?machine/i.test(s)) return false;
    if (/^"?top\s/i.test(s)) return false;
    if (/^closes?\s/i.test(s)) return false;
    if (/^is\s/i.test(s)) return false;
    if (!/^\d/.test(s)) return false;
    if (/\b(st|street|ave?|avenue|blvd|boulevard|rd|road|ln|lane|dr|drive|pl|place|way|ct|court|hwy|highway|pike|pkwy|parkway|broadway|tpke|turnpike|route|division)\b/i.test(s)) return true;
    if (/^\d+\s+[NSEW]\s+\w+/i.test(s)) return true;
    if (/^\d+\s+\w+\s+\w+/i.test(s)) return true;
    return false;
}

function parseCommission(str) {
    if (!str || !str.trim()) return 0;
    const s = str.trim().toLowerCase();
    if (s.includes('ask dan')) return 0;
    const match = s.match(/(\d+)\s*%/);
    return match ? parseInt(match[1]) / 100 : 0;
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
    if (/\//g.test(s)) s = s.split('/')[0];
    if (/no\s*money|closed|installed|install|took\s*all|broken|off|into|ed\s*up|customer/i.test(s)) return '0';
    if (/still\s*closed/i.test(s)) return '0';
    if (/^machine/i.test(s)) return '0';
    if (/^new/i.test(s)) return '0';
    if (/^reinstall/i.test(s)) return '0';
    const num = parseFloat(s);
    return isNaN(num) ? '0' : num.toString();
}

function isNoMoney(totalWeight) {
    const tw = (totalWeight || '').trim().toLowerCase();
    return /no\s*money/i.test(tw) || /^closed$/i.test(tw) || /^installed$/i.test(tw) || /^broken$/i.test(tw) || /machine\s*off/i.test(tw) || /still\s*closed/i.test(tw) || /^reinstall/i.test(tw) || /^ed\s*up/i.test(tw);
}

function cleanBill(str) {
    if (!str) return 0;
    let s = str.trim().replace(/\$/g, '').replace(/⌚️?/g, '').replace(/⌚/g, '').replace(/watch/gi, '').replace(/earbuds/gi, '').replace(/￼/g, '').trim();
    if (/^\d+-\$?\d+$/.test(s)) {
        const m = s.match(/^(\d+)/);
        return m ? parseInt(m[1]) : 0;
    }
    return parseInt(s) || 0;
}

function parseBillsFormatA(cols) {
    let bill50Col = (cols[0] || '').trim();
    let bill50 = 0, extraBill20 = 0;

    if (/1-?\$?50.*1-?\$?20/i.test(bill50Col)) {
        const m50 = bill50Col.match(/(\d+)-?\$?50/);
        const m20 = bill50Col.match(/(\d+)-?\$?20/);
        bill50 = m50 ? parseInt(m50[1]) : 0;
        extraBill20 = m20 ? parseInt(m20[1]) : 0;
    } else if (/\d+-?\$?50/i.test(bill50Col)) {
        const m = bill50Col.match(/(\d+)/);
        bill50 = m ? parseInt(m[1]) : 0;
    } else if (/\d+-?20/i.test(bill50Col)) {
        extraBill20 = parseInt(bill50Col.match(/(\d+)/)?.[1] || '0');
    } else {
        bill50 = cleanBill(bill50Col);
    }

    return {
        50: bill50,
        20: cleanBill(cols[1]) + extraBill20,
        10: cleanBill(cols[2]),
        5: cleanBill(cols[3]),
        1: cleanBill(cols[4]),
    };
}

function parseUser(str) {
    if (!str) return '';
    let s = str.trim();
    if (/^new\s*motor/i.test(s)) return '';
    s = s.replace(/⌚️?/g, '').replace(/⌚/g, '').replace(/\s*\d+-?\$?\d+/g, '').replace(/^\*+/, '').replace(/\*+$/, '').trim();
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
        if (/change\s*machine|change\s*mechine|change\s*mashine|has\s*change|cheng\s*mashin|token\s*mechine|token\s*machine|coin\s*mack|change\s*mashin/i.test(lower)) {
            hasChange = true;
            if (/x3|3\s*x/i.test(lower)) count = Math.max(count, 3);
            else if (/x2|2\s*x|double|dubble|2\s*hopper/i.test(lower)) count = Math.max(count, 2);
            else count = Math.max(count, 1);
        }
        if (/double\s*hopper/i.test(lower)) {
            hasChange = true;
            count = Math.max(count, 2);
        }
        if (/2x\s*change/i.test(lower)) { hasChange = true; count = Math.max(count, 2); }
        if (/3x\s*change/i.test(lower)) { hasChange = true; count = Math.max(count, 3); }
        if (/x2\s*hopper/i.test(lower)) { hasChange = true; count = Math.max(count, 2); }
    }
    return { hasChange, count: count || (hasChange ? 1 : 0) };
}

function isInactiveLocation(notes) {
    for (const n of notes) {
        const lower = n.toLowerCase();
        if (/machine?\s*picked\s*up|mechine\s*picked\s*up|mashin\s*picked/i.test(lower)) return true;
        if (/threw\s*out\s*the\s*machine/i.test(lower)) return true;
        if (/no\s*mashin\s*(picked\s*up|ed\s*up)/i.test(lower)) return true;
        if (/machine\s*ed\s*up/i.test(lower)) return true;
        if (/\bed\s*up\s*\d/i.test(lower)) return true;
        if (/no\s*machine\s*is\s*out/i.test(lower)) return true;
        if (/wants?\s*(it\s*)?picked\s*up/i.test(lower)) return true;
        if (/he\s*wants\s*picked\s*up/i.test(lower)) return true;
        if (/don.t\s*want\s*the\s*mashin/i.test(lower)) return true;
        if (/wants?\s*machine\s*out/i.test(lower)) return true;
    }
    return false;
}

function isLikeDate(str) {
    const s = (str || '').trim().replace(/\.$/, '');
    return /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(s);
}

// ── Main parsing ──
const locationGroups = [];
let currentLocation = null;
let skipUntilNextLocation = false;

for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) continue;

    const cols = parseCSVLine(line);
    const col0 = (cols[0] || '').trim();
    const col1 = (cols[1] || '').trim();
    const col2 = (cols[2] || '').trim();
    const col3 = (cols[3] || '').trim();
    const col4 = (cols[4] || '').trim();
    const col5 = (cols[5] || '').trim();

    // All empty row
    const isAllEmpty = cols.every(c => !c.trim());
    if (isAllEmpty) continue;

    // Detect "business name first" entries (Jacksonville Food Mart, Vape escape, etc.)
    if (!isStreetAddress(col0) && !isLikeDate(col5) && !isLikeDate(col6ForA()) && col0 && !currentLocation?.address) {
        // Could be a business-name-first entry, skip and continue
    }

    // Format A new location: Address,,Name,City,State,%,...
    if (isStreetAddress(col0) && col1 === '' && (col3 || col4)) {
        if (currentLocation) locationGroups.push(currentLocation);
        skipUntilNextLocation = false;

        const name = col2;
        const city = col3;
        const state = (col4 || 'PA').replace(/\s/g, '');
        const commission = col5;
        const date = (cols[6] || '').trim();
        const totalWeight = (cols[7] || '').trim();
        const halfWeight = (cols[8] || '').trim();
        let user = (cols[9] || '').trim();
        let billOffset = 10;

        // Handle "new motor" in user field (shifts bills by 1)
        if (/^new\s*motor/i.test(user)) {
            user = (cols[10] || '').trim();
            billOffset = 11;
        }

        currentLocation = {
            address: col0.replace(/\s+/g, ' ').trim(),
            businessName: name,
            city: city.replace(/,\s*$/, '').trim(),
            state: state,
            commission,
            commissionRate: parseCommission(commission),
            notes: [],
            logs: [],
            format: 'A',
        };

        if (date && isLikeDate(date)) {
            currentLocation.logs.push({
                date: parseDate(date), totalWeight, halfWeight,
                user: parseUser(user),
                bills: parseBillsFormatA([cols[billOffset], cols[billOffset + 1], cols[billOffset + 2], cols[billOffset + 3], cols[billOffset + 4]].map(c => (c || '').trim())),
                notes: '', noMoney: isNoMoney(totalWeight),
            });
        }
        continue;
    }

    // Format A without name but with 3 commas: Address,,,City,State,...
    if (isStreetAddress(col0) && col1 === '' && col2 === '' && col3) {
        if (currentLocation) locationGroups.push(currentLocation);
        skipUntilNextLocation = false;

        const city = col3;
        const state = (col4 || 'PA').replace(/\s/g, '');
        const commission = col5;
        const date = (cols[6] || '').trim();
        const totalWeight = (cols[7] || '').trim();
        const halfWeight = (cols[8] || '').trim();
        const user = (cols[9] || '').trim();

        currentLocation = {
            address: col0.replace(/\s+/g, ' ').trim(),
            businessName: '',
            city: city.replace(/,\s*$/, '').trim(),
            state: state,
            commission,
            commissionRate: parseCommission(commission),
            notes: [],
            logs: [],
            format: 'A',
        };

        if (date && isLikeDate(date)) {
            currentLocation.logs.push({
                date: parseDate(date), totalWeight, halfWeight,
                user: parseUser(user),
                bills: parseBillsFormatA([cols[10], cols[11], cols[12], cols[13], cols[14]].map(c => (c || '').trim())),
                notes: '', noMoney: isNoMoney(totalWeight),
            });
        }
        continue;
    }

    // Continuation row (Format A)
    if (currentLocation && !skipUntilNextLocation) {
        const date = (cols[6] || '').trim();
        const totalWeight = (cols[7] || '').trim();
        const halfWeight = (cols[8] || '').trim();
        let user = (cols[9] || '').trim();
        let billOffset = 10;

        if (/^new\s*motor/i.test(user)) {
            user = (cols[10] || '').trim();
            billOffset = 11;
        }

        const hasDate = isLikeDate(date);
        const isEmptyRow = !col0 && !hasDate && !totalWeight;
        if (isEmptyRow) continue;

        // Note-only line (has text in col0 but no date)
        if (col0 && !hasDate) {
            currentLocation.notes.push(col0);
            continue;
        }

        // Note + log
        if (col0 && hasDate) {
            currentLocation.notes.push(col0);
        }

        // Log entry
        if (hasDate) {
            const logNote = (col0 && !/^\d/.test(col0)) ? col0 : '';
            currentLocation.logs.push({
                date: parseDate(date), totalWeight, halfWeight,
                user: parseUser(user),
                bills: parseBillsFormatA([cols[billOffset], cols[billOffset + 1], cols[billOffset + 2], cols[billOffset + 3], cols[billOffset + 4]].map(c => (c || '').trim())),
                notes: logNote, noMoney: isNoMoney(totalWeight),
            });
        }
    }

    function col6ForA() { return (cols[6] || '').trim(); }
}

if (currentLocation) locationGroups.push(currentLocation);

// ── Handle special "name-first" entries at the bottom ──
// These were detected during parsing but need special handling
// Jacksonville Food Mart, Vape escape, Quick stop convenience, Pantry 1 Food Mart
const specialInstalls = [
    { name: 'Jacksonville Food Mart', address: '40 E Street Rd', city: 'Warminster', state: 'PA', commission: '40%', commissionRate: 0.40, installDate: '2026-01-19T12:00:00' },
    { name: 'Vape escape', address: '47 East bridge Street', city: 'Spring City', state: 'PA', commission: '', commissionRate: 0, installDate: '2026-01-19T12:00:00' },
    { name: 'Pantry 1 Food Mart', address: '207 N Henderson Rd', city: 'King of Prussia', state: 'PA', commission: '', commissionRate: 0, installDate: '2026-01-23T12:00:00' },
];

for (const si of specialInstalls) {
    locationGroups.push({
        address: si.address,
        businessName: si.name,
        city: si.city,
        state: si.state,
        commission: si.commission,
        commissionRate: si.commissionRate,
        notes: [`New install ${si.installDate.split('T')[0]}`],
        logs: [{ date: si.installDate, totalWeight: '0', halfWeight: '', user: '', bills: { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 }, notes: 'New install', noMoney: true }],
        format: 'A',
    });
}

console.log(`\n📊 Parsed ${locationGroups.length} locations from PA CSV\n`);

let activeCount = 0, inactiveCount = 0;
for (const loc of locationGroups) {
    const flags = [];
    if (isInactiveLocation(loc.notes)) { flags.push('INACTIVE'); inactiveCount++; }
    else activeCount++;
    const displayName = loc.businessName ? `${loc.address} (${loc.businessName})` : loc.address;
    console.log(`📍 ${displayName}, ${loc.city} ${loc.state} — ${loc.commission || 'N/A'} ${flags.join(' ')} — ${loc.logs.length} logs`);
    if (loc.notes.length > 0) {
        const importantNotes = loc.notes.filter(n => {
            const lower = n.toLowerCase();
            return /\d{3}.*\d{4}/.test(n) || /call|text|close|machine|mashin|mechine|change|cheng|token|install|picked|storage|motor|tray|hopper|receipt|fish|broken|fixed|quarters|scale|drill|missing|🎣|ed\s*up/i.test(lower);
        });
        if (importantNotes.length) console.log(`   📝 ${importantNotes.join(' | ').slice(0, 120)}`);
    }
}

console.log(`\n📊 Summary: ${activeCount} active + ${inactiveCount} inactive = ${locationGroups.length} total\n`);

// ── Clean up previous entries ──
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
console.log(`   📦 Existing documents: ${existingCount}\n`);

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
            /close[sd]?\s/i.test(n) || /no\s(bills?|money|cash|\$20)/i.test(n) ||
            /put\s/i.test(n) || /don.t\s/i.test(n) || /change|cheng/i.test(n) ||
            /machine|mechine|mashin/i.test(n) || /fishing|🎣/i.test(n) ||
            /motor/i.test(n) || /tray/i.test(n) || /picked\s*up/i.test(n) ||
            /storage/i.test(n) || /move/i.test(n) || /ripped/i.test(n) ||
            /reinstall/i.test(n) || /owner/i.test(n) || /receipt/i.test(n) ||
            /fixing/i.test(n) || /broken/i.test(n) || /quarter/i.test(n) ||
            /install/i.test(n) || /hopper/i.test(n) || /token/i.test(n) ||
            /scale/i.test(n) || /construction/i.test(n) || /ed\s*up/i.test(n) ||
            /zelle/i.test(n) || /bubble\s*gum/i.test(n) || /toy\s*rack/i.test(n) ||
            /every\s*\d/i.test(n) || /active/i.test(n) || /want/i.test(n)
        );
    });
    const subtitle = subtitleParts.join(' | ');
    const displayName = loc.businessName || loc.address;

    const customerDoc = {
        name: displayName,
        address: loc.address,
        city: loc.city || '',
        state: (loc.state || 'PA').trim(),
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
        console.log(`✅ [${i + 1}/${locationGroups.length}] ${displayName}, ${loc.city || '?'} → ${docRef.id} (${loc.logs.length} logs) ${flags.join(' ')}`);
        uploaded++;
    } catch (err) {
        console.error(`❌ Failed: ${displayName}:`, err.message);
    }
}

console.log(`\n🎉 Done! Uploaded ${uploaded}/${locationGroups.length} locations.`);
console.log(`   Zone: "${ZONE}"`);
console.log(`   Collection: "${COLLECTION}" (now has ${existingCount + uploaded} total)\n`);
process.exit(0);
