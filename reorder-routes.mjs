/**
 * Reorder all locations in Firestore by optimal driving route per zone.
 * 
 * Usage: node reorder-routes.mjs
 * 
 * Steps:
 *   1. Load all locations from Firestore
 *   2. Group by zone/region
 *   3. Geocode each location via Google Maps API
 *   4. Sort each zone using nearest-neighbor (shortest distance route)
 *   5. Update the `order` field in Firestore
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const GOOGLE_MAPS_KEY = 'AIzaSyC_a59N6ddV6m3gc46R57SYBaVFpVEpHJM';

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

// ── Haversine distance (km) ──
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Nearest Neighbor route optimization ──
function sortByNearestNeighbor(locations, startLoc) {
    if (locations.length <= 1) return locations;

    const unvisited = [...locations];

    // Find the best starting point: closest to depot or northernmost
    let startIdx = 0;
    if (startLoc) {
        let minDist = Infinity;
        for (let i = 0; i < unvisited.length; i++) {
            const d = getDistance(startLoc.lat, startLoc.lng, unvisited[i].lat, unvisited[i].lng);
            if (d < minDist) { minDist = d; startIdx = i; }
        }
    }

    const route = [unvisited.splice(startIdx, 1)[0]];

    while (unvisited.length > 0) {
        const current = route[route.length - 1];
        let nearestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < unvisited.length; i++) {
            const d = getDistance(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
            if (d < minDist) { minDist = d; nearestIdx = i; }
        }
        route.push(unvisited.splice(nearestIdx, 1)[0]);
    }

    return route;
}

// ── Geocode an address using Google Maps API ──
async function geocode(address, city, state) {
    const query = [address, city, state].filter(Boolean).join(', ');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_KEY}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng };
        }
        return null;
    } catch (err) {
        console.error(`   ❌ Geocode failed for "${query}":`, err.message);
        return null;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ── Main ──
console.log('📍 Loading all locations from Firestore...\n');
const allDocs = await getDocs(collection(db, 'customers'));
const locations = allDocs.docs.map(d => ({ id: d.id, ...d.data() }));
console.log(`   Found ${locations.length} locations total.\n`);

// Group by zone
const zones = {};
for (const loc of locations) {
    const zone = (loc.zone || loc.region || 'Other').trim();
    if (!zones[zone]) zones[zone] = [];
    zones[zone].push(loc);
}

console.log('📊 Zones found:');
for (const [zone, locs] of Object.entries(zones)) {
    console.log(`   ${zone}: ${locs.length} locations`);
}
console.log('');

// Process each zone
let globalOrder = 0;
const updates = []; // { id, order }

for (const [zone, locs] of Object.entries(zones)) {
    console.log(`\n🗺️  Processing zone: ${zone} (${locs.length} locations)`);
    console.log('   Geocoding...');

    const geocoded = [];
    const noCoords = [];
    let geocodedCount = 0;

    for (const loc of locs) {
        const addr = loc.address || loc.name || '';
        const city = loc.city || '';
        const state = loc.state || 'NY';

        if (!addr || addr.length < 5) {
            noCoords.push(loc);
            continue;
        }

        const coords = await geocode(addr, city, state);
        await sleep(60); // rate limit: ~16 req/sec

        if (coords) {
            geocoded.push({ ...loc, lat: coords.lat, lng: coords.lng });
            geocodedCount++;
        } else {
            console.log(`   ⚠️  No coords for: ${addr}, ${city}`);
            noCoords.push(loc);
        }
    }

    console.log(`   ✅ Geocoded ${geocodedCount}/${locs.length} locations`);

    // Sort by nearest neighbor
    if (geocoded.length > 1) {
        // Determine a good starting depot per zone
        let depot;
        const zl = zone.toLowerCase();
        if (zl.includes('staten')) {
            depot = { lat: 40.5795, lng: -74.1502 }; // Staten Island Ferry Terminal
        } else if (zl.includes('brooklyn')) {
            depot = { lat: 40.6214, lng: -73.9676 }; // Midwood
        } else if (zl.includes('queens')) {
            depot = { lat: 40.6413, lng: -73.7781 }; // JFK area - south Queens
        } else if (zl.includes('bronx')) {
            depot = { lat: 40.8176, lng: -73.9209 }; // South Bronx
        } else if (zl.includes('manhattan')) {
            depot = { lat: 40.7128, lng: -74.0060 }; // Lower Manhattan
        } else if (zl.includes('jersey') || zl.includes('nj')) {
            depot = { lat: 40.7178, lng: -74.0431 }; // Jersey City waterfront
        } else {
            depot = { lat: 40.6214, lng: -73.9676 }; // Midwood default
        }

        const sorted = sortByNearestNeighbor(geocoded, depot);

        console.log(`   📋 Optimized route order:`);
        for (let i = 0; i < sorted.length; i++) {
            const loc = sorted[i];
            const nextLoc = sorted[i + 1];
            const dist = nextLoc ? getDistance(loc.lat, loc.lng, nextLoc.lat, nextLoc.lng).toFixed(1) : '—';
            updates.push({ id: loc.id, order: globalOrder });
            console.log(`      ${globalOrder + 1}. ${loc.name || loc.address} (${loc.city || '?'}) → ${dist} km`);
            globalOrder++;
        }
    } else {
        for (const loc of geocoded) {
            updates.push({ id: loc.id, order: globalOrder });
            globalOrder++;
        }
    }

    // Append locations without coordinates at end of zone
    for (const loc of noCoords) {
        updates.push({ id: loc.id, order: globalOrder });
        console.log(`      ${globalOrder + 1}. [no coords] ${loc.name || loc.address}`);
        globalOrder++;
    }
}

// ── Update Firestore ──
console.log(`\n🚀 Updating ${updates.length} locations in Firestore...`);

let updated = 0;
for (const { id, order } of updates) {
    try {
        await updateDoc(doc(db, 'customers', id), { order });
        updated++;
    } catch (err) {
        console.error(`   ❌ Failed to update ${id}:`, err.message);
    }
}

console.log(`\n🎉 Done! Updated order for ${updated}/${updates.length} locations.`);
console.log('   Each zone is now sorted by optimal driving distance route.\n');

process.exit(0);
