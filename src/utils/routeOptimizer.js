const GEO_CACHE_KEY = 'vrm_geo_cache_v2';
const MIDWOOD_DEPOT = { lat: 40.6214, lng: -73.9676 };

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
 * Nearest Neighbor heuristic — builds a route starting from the first
 * location, always jumping to the closest unvisited stop.
 * Each item must have numeric `lat` and `lng` properties.
 */
export function sortRouteNearestNeighbor(locations) {
  if (!locations || locations.length === 0) return [];

  const unvisited = [...locations];
  const sortedRoute = [unvisited.shift()];

  while (unvisited.length > 0) {
    const current = sortedRoute[sortedRoute.length - 1];
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const distance = getDistance(
        current.lat, current.lng,
        unvisited[i].lat, unvisited[i].lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    sortedRoute.push(unvisited.splice(nearestIndex, 1)[0]);
  }

  return sortedRoute;
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
 * High-level helper: takes an array of app location objects, resolves
 * their coordinates, runs the Nearest Neighbor sort, and returns the
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

  const depotEntry = { _isDepot: true, lat: MIDWOOD_DEPOT.lat, lng: MIDWOOD_DEPOT.lng };
  const optimized = sortRouteNearestNeighbor([depotEntry, ...withCoords]);
  const realStops = optimized.filter(r => !r._isDepot);
  return [...realStops, ...withoutCoords];
}
