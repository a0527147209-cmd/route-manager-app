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
 * Pure Nearest Neighbor route solver.
 * Starts from the location closest to the depot, then always picks the
 * closest unvisited location. This naturally stays in one geographic area
 * before moving to the next, matching the original manual route ordering.
 */
export function solveTSP(locations, depot = MIDWOOD_DEPOT) {
  const n = locations.length;
  if (n <= 1) return locations || [];
  if (n === 2) {
    const d0 = getDistance(depot.lat, depot.lng, locations[0].lat, locations[0].lng);
    const d1 = getDistance(depot.lat, depot.lng, locations[1].lat, locations[1].lng);
    return d0 <= d1 ? [locations[0], locations[1]] : [locations[1], locations[0]];
  }

  // Find starting location: closest to depot
  let startIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < n; i++) {
    const d = getDistance(depot.lat, depot.lng, locations[i].lat, locations[i].lng);
    if (d < minDist) { minDist = d; startIdx = i; }
  }

  const unvisited = locations.map((loc, i) => ({ loc, i }));
  const start = unvisited.splice(startIdx, 1)[0];
  const route = [start.loc];

  while (unvisited.length > 0) {
    const cur = route[route.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = getDistance(cur.lat, cur.lng, unvisited[i].loc.lat, unvisited[i].loc.lng);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    route.push(unvisited.splice(nearestIdx, 1)[0].loc);
  }

  // Rotate so both start and end are closest to Midwood
  if (route.length > 2) {
    const m = route.length;
    let bestCut = 0;
    let bestCost = getDistance(depot.lat, depot.lng, route[0].lat, route[0].lng)
                 + getDistance(depot.lat, depot.lng, route[m - 1].lat, route[m - 1].lng);
    for (let k = 1; k < m; k++) {
      const cost = getDistance(depot.lat, depot.lng, route[k].lat, route[k].lng)
                 + getDistance(depot.lat, depot.lng, route[k - 1].lat, route[k - 1].lng);
      if (cost < bestCost) { bestCost = cost; bestCut = k; }
    }
    if (bestCut > 0) {
      return [...route.slice(bestCut), ...route.slice(0, bestCut)];
    }
  }

  return route;
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
