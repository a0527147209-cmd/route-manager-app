/**
 * Migration script: Import Brooklyn CSV data into Firebase Firestore
 * 
 * Usage: node migrate-brooklyn.mjs
 * 
 * Brooklyn CSV columns (same as Queens):
 *   0: Address, 1: Name (business), 2: City, 3: State, 4: Machine/%
 *   5: Date, 6: Total weight, 7: Half weight, 8: (user), 9: 20$, 10: 10$, 11: 5$, 12: 1$
 * 
 * ADDS to existing data (does NOT delete other zones).
 * Cleans up previous Brooklyn entries before uploading.
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

const CSV_PATH = '/Users/libi/Downloads/Vending Book - Brooklyn.csv';
const raw = readFileSync(CSV_PATH, 'utf-8');
const lines = raw.split('\n').map(l => l.replace(/\r$/, ''));
const dataLines = lines.slice(1);

// ── Helpers ──

function isUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

function isStreetAddress(str) {
    const s = str.trim();
    if (!s) return false;
    if (isUUID(s)) return false;
    if (/^\?+/.test(s)) return false;
    if (/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(s)) return false;
    if (/^\d{7,}/.test(s)) return false;
    if (/^\d+\s+(machines?|toys?|pounds?|dollars?|months?|years?|days?|weeks?|bills?|⌚)/i.test(s)) return false;
    if (!/^\d/.test(s)) return false;
    if (/\b(st|street|ave?|avenue|blvd|boulevard|rd|road|ln|lane|dr|drive|pl|place|way|ct|court|hwy|pike|pkwy|parkway|broadway)\b/i.test(s)) return true;
    // Ordinal street numbers (e.g. "107st", "86th", "52nd", "3rd")
    if (/\d+(st|nd|rd|th)\b/i.test(s)) return true;
    if (/\d+[-\s]+\d*\s*(coney|mcdonald|bath|putnam|myrtle|atlantic|flatbush|utica|fulton|rockaway|dumont|georgia|bushwick|bedford|nostrand|church|ocean|brighton|bay|surf|mermaid|new\s*lots|covert|knickerbocker|melrose|irving|new\s*utrecht)\b/i.test(s)) return true;
    return false;
}

function parseCommission(str) {
    if (!str || !str.trim()) return 0;
    const s = str.trim().toLowerCase();
    if (s.includes('take all') || s === 'take all') return 0;
    if (s.includes('rent')) return 0;
    if (s.includes('ask dan')) return 0;
    if (s === 'tokens') return 0;
    const match = s.match(/(\d+)\s*%/);
    if (match) return parseInt(match[1]) / 100;
    const match2 = s.match(/%\s*(\d+)/);
    if (match2) return parseInt(match2[1]) / 100;
    return 0;
}

function isTakeAll(commissionStr) {
    if (!commissionStr) return false;
    return /take\s*all/i.test(commissionStr.trim());
}

function isRentDeal(commissionStr) {
    if (!commissionStr) return false;
    return /\$?\d+\s*rent/i.test(commissionStr.trim());
}

function parseDate(str) {
    if (!str || !str.trim()) return null;
    const s = str.trim().replace(/\.$/, '').replace(/\s+/g, '');
    const parts = s.split('/');
    if (parts.length < 2) return null;
    let m, d, y;
    if (parts.length === 2) {
        [m, d] = parts;
        y = '2025';
    } else {
        [m, d, y] = parts;
    }
    if (!m || !d) return null;
    let year = (y || '2025').trim();
    if (year.length === 2) year = `20${year}`;
    const mi = parseInt(m);
    const di = parseInt(d);
    const yi = parseInt(year);
    if (isNaN(mi) || isNaN(di) || isNaN(yi)) return null;
    return `${yi}-${mi.toString().padStart(2, '0')}-${di.toString().padStart(2, '0')}T12:00:00`;
}

function parseWeight(str) {
    if (!str || !str.trim()) return '0';
    let s = str.trim().replace(/\$/g, '').replace(/\s/g, '');
    // European-style commas → dots
    s = s.replace(/,/g, '.');
    // Remove trailing dots
    s = s.replace(/\.+$/, '');
    if (/no\s*money|no\s*mony|closed|installed|install|machine|took\s*all|broken|empty|off/i.test(s)) return '0';
    const num = parseFloat(s);
    return isNaN(num) ? '0' : num.toString();
}

function isNoMoney(totalWeight, halfWeight) {
    const tw = (totalWeight || '').trim().toLowerCase();
    const hw = (halfWeight || '').trim().toLowerCase();
    if (/no\s*money/i.test(tw) || /no\s*money/i.test(hw)) return true;
    if (/^closed$/i.test(tw)) return true;
    if (/new\s*install/i.test(tw)) return true;
    return false;
}

function isTookAll(halfWeight) {
    return /took\s*all/i.test((halfWeight || '').trim());
}

function parseBills(cols, userCol) {
    // cols = [20$, 10$, 5$, 1$]
    // Sometimes $50 appears in the 20$ column as "1-$50" or in user column as "Eli * 1 $50"
    let bill50 = 0;
    let raw20 = (cols[0] || '').trim();

    // Detect "1-$50" style in the 20$ column
    if (/\$50/i.test(raw20) || /^\d+-?\$50$/i.test(raw20)) {
        const match50 = raw20.match(/^(\d+)/);
        bill50 = match50 ? parseInt(match50[1]) : 1;
        raw20 = '0';
    }

    // Detect "$50" in user column (e.g. "Eli * 1 $50")
    const userStr = (userCol || '').trim();
    if (/\$\s*50/i.test(userStr) && !bill50) {
        const match50 = userStr.match(/(\d+)\s*\$\s*50/);
        bill50 = match50 ? parseInt(match50[1]) : 1;
    }

    const clean = (v) => {
        const s = (v || '').trim().replace(/\$/g, '').replace(/\./g, '').replace(/\s/g, '');
        return parseInt(s) || 0;
    };

    return {
        50: bill50,
        20: clean(raw20),
        10: clean(cols[1]),
        5: clean(cols[2]),
        1: clean(cols[3]),
    };
}

function parseUser(str) {
    if (!str) return '';
    let s = str.trim();
    // Remove $50 notes from user field
    s = s.replace(/\*?\s*\d+\s*\$\s*50/i, '').trim();
    // Remove leading/trailing special chars
    s = s.replace(/^\*+/, '').replace(/\*+$/, '').trim();
    return s;
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
        if (lower.includes('change machine') || lower.includes('change mechine') ||
            lower.includes('change mashine') || lower.includes('change mashin')) {
            hasChange = true;
            const match = lower.match(/(\d+)\s*x?\s*change/);
            if (match) count = Math.max(count, parseInt(match[1]));
            else if (lower.includes('double hopper') || lower.includes('dubble hopper')) count = Math.max(count, 2);
            else count = Math.max(count, 1);
        }
        if (lower.includes('has change')) {
            hasChange = true;
            count = Math.max(count, 1);
        }
    }
    return { hasChange, count: count || (hasChange ? 1 : 0) };
}

function parseFullAddress(str) {
    const s = str.trim();
    const match = s.match(/^(.+?),\s*(.+?),\s*([A-Z]{2})\s*(\d{5})?$/i);
    if (match) {
        return { address: match[1].trim(), city: match[2].trim(), state: match[3].trim(), zip: (match[4] || '').trim() };
    }
    return null;
}

function isInactiveLocation(notes) {
    for (const n of notes) {
        const lower = n.toLowerCase();
        if (/machine\s*picked\s*up/i.test(lower)) return true;
        if (/^picked up$/i.test(lower.trim())) return true;
    }
    return false;
}

// ── Main parsing loop ──
const locationGroups = [];
let currentLocation = null;

for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) continue;

    const cols = parseCSVLine(line);
    const address = (cols[0] || '').trim();
    const name = (cols[1] || '').trim();
    const city = (cols[2] || '').trim();
    const state = (cols[3] || '').trim();
    const commission = (cols[4] || '').trim();
    const date = (cols[5] || '').trim();
    const totalWeight = (cols[6] || '').trim();
    const halfWeight = (cols[7] || '').trim();
    const user = (cols[8] || '').trim();
    const bill20 = (cols[9] || '').trim();
    const bill10 = (cols[10] || '').trim();
    const bill5 = (cols[11] || '').trim();
    const bill1 = (cols[12] || '').trim();

    // ── Handle the ??? placeholder entry (lines ~314+) ──
    if (/^\?{3,}/.test(address)) {
        if (currentLocation) locationGroups.push(currentLocation);
        currentLocation = {
            address: '',
            businessName: name || '',
            city: city || 'Brooklyn',
            state: state || 'NY',
            commission: commission || '50%',
            commissionRate: parseCommission(commission || '50%'),
            notes: [],
            logs: [],
            _isPlaceholder: true,
        };
        if (date) {
            currentLocation.logs.push({
                date: parseDate(date),
                totalWeight,
                halfWeight,
                user: parseUser(user),
                bills: parseBills([bill20, bill10, bill5, bill1], user),
                notes: '',
                noMoney: isNoMoney(totalWeight, halfWeight),
                tookAll: isTookAll(halfWeight),
            });
        }
        continue;
    }

    // ── Case: New location (address + name/city present) ──
    if (isStreetAddress(address) && (city || name)) {
        if (currentLocation) locationGroups.push(currentLocation);
        currentLocation = {
            address: address.replace(/\s+/g, ' ').trim(),
            businessName: name || '',
            city: (city || 'Brooklyn').trim(),
            state: (state || 'NY').trim(),
            commission,
            commissionRate: parseCommission(commission),
            takeAll: isTakeAll(commission),
            rentDeal: isRentDeal(commission),
            notes: [],
            logs: [],
        };
        if (date) {
            currentLocation.logs.push({
                date: parseDate(date),
                totalWeight,
                halfWeight,
                user: parseUser(user),
                bills: parseBills([bill20, bill10, bill5, bill1], user),
                notes: '',
                noMoney: isNoMoney(totalWeight, halfWeight),
                tookAll: isTookAll(halfWeight),
            });
        }
        continue;
    }

    // ── Case: Full address line for placeholder (e.g. "1890 Flatbush Ave, Brooklyn, NY 11210") ──
    const fullAddr = parseFullAddress(address);
    if (fullAddr && currentLocation?._isPlaceholder && !currentLocation.address) {
        currentLocation.address = fullAddr.address;
        currentLocation.city = fullAddr.city || currentLocation.city;
        currentLocation.state = fullAddr.state || currentLocation.state;
        continue;
    }

    // ── Case: Business name with commission (e.g. "The Laundry Station %40") ──
    if (/[%]\d+/.test(address) && currentLocation && !isStreetAddress(address)) {
        const commMatch = address.match(/%(\d+)/);
        if (commMatch) {
            currentLocation.commissionRate = parseInt(commMatch[1]) / 100;
            currentLocation.commission = `${commMatch[1]}%`;
        }
        const bizName = address.replace(/%\d+/, '').trim();
        if (bizName && (!currentLocation.businessName || /^\?+$/.test(currentLocation.businessName))) {
            currentLocation.businessName = bizName;
        }
        currentLocation.notes.push(address);
        if (date) {
            currentLocation.logs.push({
                date: parseDate(date),
                totalWeight,
                halfWeight,
                user: parseUser(user),
                bills: parseBills([bill20, bill10, bill5, bill1], user),
                notes: address,
                noMoney: isNoMoney(totalWeight, halfWeight),
                tookAll: isTookAll(halfWeight),
            });
        }
        continue;
    }

    // ── Case: Continuation row ──
    if (currentLocation) {
        const isEmptyRow = !address && !date && !totalWeight;
        if (isEmptyRow) continue;

        // UUID rows → continuation, skip the address but keep logs
        const isUUIDRow = isUUID(address);

        // Note lines (address column has text, not a street address and not UUID)
        if (address && !isUUIDRow && !date) {
            currentLocation.notes.push(address);
            continue;
        }

        // If address has text that's not a UUID and not a street (it's a note), save it
        if (address && !isUUIDRow && !isStreetAddress(address) && date) {
            currentLocation.notes.push(address);
        }

        // Log entry (has date)
        if (date) {
            const logNote = (address && !isStreetAddress(address) && !isUUIDRow) ? address : '';
            currentLocation.logs.push({
                date: parseDate(date),
                totalWeight,
                halfWeight,
                user: parseUser(user),
                bills: parseBills([bill20, bill10, bill5, bill1], user),
                notes: logNote,
                noMoney: isNoMoney(totalWeight, halfWeight),
                tookAll: isTookAll(halfWeight),
            });
        }
    }
}

if (currentLocation) locationGroups.push(currentLocation);

console.log(`\n📊 Parsed ${locationGroups.length} locations from Brooklyn CSV\n`);

// ── Preview ──
for (const loc of locationGroups) {
    const displayName = loc.businessName ? `${loc.address} (${loc.businessName})` : loc.address;
    const flags = [];
    if (loc.takeAll) flags.push('TAKE ALL');
    if (loc.rentDeal) flags.push('RENT DEAL');
    console.log(`📍 ${displayName}, ${loc.city} — ${loc.commission || 'N/A'} ${flags.join(' ')} — ${loc.logs.length} logs`);
    for (const log of loc.logs) {
        const nm = log.noMoney ? ' [NO MONEY]' : '';
        const ta = log.tookAll ? ' [TOOK ALL]' : '';
        console.log(`   📅 ${log.date} | ${log.totalWeight || '0'} | by ${log.user || '?'} | $50×${log.bills[50]} $20×${log.bills[20]} $10×${log.bills[10]} $5×${log.bills[5]} $1×${log.bills[1]}${nm}${ta}`);
    }
    if (loc.notes.length > 0) {
        console.log(`   📝 Notes: ${loc.notes.join(' | ')}`);
    }
    console.log('');
}

// ── Clean up previous Brooklyn uploads ──
console.log('🗑️  Removing existing Brooklyn entries...');
const allDocs = await getDocs(collection(db, COLLECTION));
let deleted = 0;
for (const docSnap of allDocs.docs) {
    const data = docSnap.data();
    if (data.zone === 'Brooklyn' || data.region === 'Brooklyn') {
        await deleteDoc(doc(db, COLLECTION, docSnap.id));
        deleted++;
    }
}
console.log(`   Deleted ${deleted} existing Brooklyn documents.\n`);

// ── Upload ──
console.log('🚀 Starting Firestore upload (ADDING to existing data)...\n');

let uploaded = 0;
const existingCount = (await getDocs(collection(db, COLLECTION))).size;
console.log(`   📦 Existing documents in collection: ${existingCount}\n`);

for (let i = 0; i < locationGroups.length; i++) {
    const loc = locationGroups[i];

    // Sort logs newest first
    loc.logs.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
    });

    const latestLog = loc.logs[0];
    const { hasChange, count: changeMachineCount } = parseChangeMachine(loc.notes);
    const inactive = isInactiveLocation(loc.notes);

    // Build subtitle from important notes
    const subtitleParts = loc.notes.filter(n => {
        const lower = n.toLowerCase();
        return (
            /\d{3}.*\d{4}/.test(n) ||
            /call\s/i.test(n) ||
            /text\s/i.test(n) ||
            /close[sd]?\s/i.test(n) ||
            /no\s(bills?|\$20|\$10|money|cash)/i.test(n) ||
            /pick\s?(it\s)?up/i.test(n) ||
            /don.t\s/i.test(n) ||
            /put\s(a\s)?\$?\d+/i.test(n) ||
            /fill\s?up/i.test(n) ||
            /change\s?(machine|mechine|mashine)/i.test(n) ||
            /has\schange/i.test(n) ||
            /dubble\s?hopper|double\s?hopper/i.test(n) ||
            /toy\s?rack/i.test(n) ||
            /gumball/i.test(n) ||
            /scale/i.test(n) ||
            /drill/i.test(n) ||
            /machine\s*(picked|was\s*off|off|broken|unplugged|shaking)/i.test(n) ||
            /fixed/i.test(n) ||
            /stole|stealing/i.test(n) ||
            /hole/i.test(n) ||
            /flap/i.test(n) ||
            /motor/i.test(n) ||
            /missing/i.test(n) ||
            /extension\s*cord/i.test(n) ||
            /come\s*every/i.test(n) ||
            /quarters/i.test(n) ||
            /rent/i.test(n) ||
            /\$400/i.test(n) ||
            /bring/i.test(n) ||
            /only\s*\(/i.test(n) ||
            /owner/i.test(n) ||
            /location\s*is\s*active/i.test(n) ||
            /want\s*to\s*remove/i.test(n) ||
            /exceed/i.test(n) ||
            /new\s*install/i.test(n) ||
            /poker/i.test(n) ||
            /bondo/i.test(n) ||
            /spring/i.test(n) ||
            /tray/i.test(n) ||
            /removed/i.test(n) ||
            /paid\sin\squarters/i.test(n)
        );
    });

    const subtitle = subtitleParts.join(' | ');
    const displayName = loc.businessName || loc.address;

    const customerDoc = {
        name: displayName,
        address: loc.address,
        city: (loc.city || 'Brooklyn').replace(/\s+$/, ''),
        state: (loc.state || 'NY').trim(),
        zone: 'Brooklyn',
        region: 'Brooklyn',
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
        // Special flags
        ...(loc.takeAll ? { takeAll: true } : {}),
        ...(loc.rentDeal ? { rentDeal: true, rentAmount: '$400' } : {}),
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
            ...(log.tookAll ? { tookAll: true } : {}),
        })),
    };

    try {
        const docRef = await addDoc(collection(db, COLLECTION), customerDoc);
        const flags = [];
        if (loc.takeAll) flags.push('💰 TAKE ALL');
        if (loc.rentDeal) flags.push('🏠 RENT');
        if (hasChange) flags.push(`🔄 CH×${changeMachineCount}`);
        if (inactive) flags.push('⛔ INACTIVE');
        console.log(`✅ [${i + 1}/${locationGroups.length}] ${displayName}, ${loc.city || '?'} → ${docRef.id} (${loc.logs.length} logs) ${flags.join(' ')}${subtitle ? '\n   🔴 ' + subtitle.slice(0, 80) : ''}`);
        uploaded++;
    } catch (err) {
        console.error(`❌ Failed to upload ${displayName}:`, err.message);
    }
}

console.log(`\n🎉 Done! Uploaded ${uploaded}/${locationGroups.length} Brooklyn locations to Firestore.`);
console.log('   All locations are under zone: "Brooklyn"');
console.log(`   Collection: "${COLLECTION}" (now has ${existingCount + uploaded} total documents)\n`);

process.exit(0);
