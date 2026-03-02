const GEO_CACHE_KEY = 'vrm_geo_cache_v2';
const MIDWOOD_DEPOT = { lat: 40.6214, lng: -73.9676 };

export { MIDWOOD_DEPOT };

/**
 * Haversine formula — accurate distance (km) between two GPS coordinates.
 */
export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Read the geocode cache that MapOverviewView writes to localStorage.
 */
export function getGeoCache() {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Resolve coordinates for a location from its own fields or the geo cache.
 */
export function getLocationCoords(loc, geoCache = {}) {
  const lat = Number(loc?.lat);
  const lng = Number(loc?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

  const cached = geoCache[loc?.id];
  if (cached?.lat && cached?.lng) return cached;

  return null;
}

/**
 * TSP solver: Nearest Neighbor heuristic + 2-Opt improvement.
 * Starts from a depot and visits all locations with minimal backtracking.
 * Each item must have numeric `lat` and `lng` properties.
 * Returns items reordered in optimized route order.
 */
export function solveTSP(locations, depot = MIDWOOD_DEPOT) {
  const n = locations.length;
  if (n <= 1) return locations || [];
  if (n === 2) {
    const d0 = getDistance(depot.lat, depot.lng, locations[0].lat, locations[0].lng);
    const d1 = getDistance(depot.lat, depot.lng, locations[1].lat, locations[1].lng);
    return d0 <= d1 ? [locations[1], locations[0]] : [locations[0], locations[1]];
  }

  const pts = [depot, ...locations.map(l => ({ lat: l.lat, lng: l.lng }))];
  const total = pts.length;

  const d = [];
  for (let i = 0; i < total; i++) {
    d[i] = [];
    for (let j = 0; j < total; j++) {
      d[i][j] = i === j ? 0 : getDistance(pts[i].lat, pts[i].lng, pts[j].lat, pts[j].lng);
    }
  }

  // Step 1: Nearest Neighbor starting from depot (index 0)
  const visited = new Set([0]);
  const route = [];
  let cur = 0;
  for (let s = 0; s < n; s++) {
    let best = -1, bestD = Infinity;
    for (let j = 1; j < total; j++) {
      if (!visited.has(j) && d[cur][j] < bestD) {
        bestD = d[cur][j];
        best = j;
      }
    }
    if (best === -1) break;
    visited.add(best);
    route.push(best);
    cur = best;
  }

  // Step 2: 2-Opt — reverse segments to eliminate crossing edges
  const m = route.length;
  let improved = true;
  let safety = 1000;
  while (improved && safety-- > 0) {
    improved = false;
    for (let i = 0; i < m - 1; i++) {
      for (let j = i + 1; j < m; j++) {
        const prevI = i === 0 ? 0 : route[i - 1];
        const nextJ = j === m - 1 ? 0 : route[j + 1];
        const gain = (d[prevI][route[i]] + d[route[j]][nextJ])
                   - (d[prevI][route[j]] + d[route[i]][nextJ]);
        if (gain > 1e-10) {
          for (let l = i, r = j; l < r; l++, r--) {
            [route[l], route[r]] = [route[r], route[l]];
          }
          improved = true;
        }
      }
    }
  }

  return route.map(idx => locations[idx - 1]);
}

/**
 * Wrapper for MapOverviewView: solves TSP for items with { point: {lat,lng}, ... }
 */
export function solveZoneTSP(items, depot = MIDWOOD_DEPOT) {
  if (!items || items.length <= 1) return items || [];
  const withCoords = items.map((item, i) => ({ ...item, lat: item.point.lat, lng: item.point.lng, _origIdx: i }));
  const sorted = solveTSP(withCoords, depot);
  return sorted.map(({ _origIdx, lat, lng, ...rest }) => rest);
}

/**
 * High-level helper: takes an array of app location objects, resolves
 * their coordinates, runs TSP optimization, and returns the
 * reordered list. Locations without coordinates are appended at the end.
 */
export function optimizeRoute(locations) {
  if (!locations || locations.length <= 1) return locations;

  const geoCache = getGeoCache();
  const withCoords = [];
  const withoutCoords = [];

  locations.forEach(loc => {
    const coords = getLocationCoords(loc, geoCache);
    if (coords) {
      withCoords.push({ ...loc, lat: coords.lat, lng: coords.lng });
    } else {
      withoutCoords.push(loc);
    }
  });

  if (withCoords.length <= 1) return [...withCoords, ...withoutCoords];

  const optimized = solveTSP(withCoords);
  return [...optimized, ...withoutCoords];
}
