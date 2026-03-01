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
 * Angular sweep circular route: sorts stops by angle around their centroid,
 * producing a clean non-crossing loop. The route starts from the stop whose
 * angle from the centroid is closest to the depot's angle, so the loop
 * naturally departs from and returns toward the depot.
 */
export function sortRouteCircular(locations, depot = MIDWOOD_DEPOT) {
  if (!locations || locations.length <= 1) return locations || [];
  if (locations.length === 2) {
    const d0 = getDistance(depot.lat, depot.lng, locations[0].lat, locations[0].lng);
    const d1 = getDistance(depot.lat, depot.lng, locations[1].lat, locations[1].lng);
    return d0 <= d1 ? [locations[1], locations[0]] : [locations[0], locations[1]];
  }

  const cLat = locations.reduce((s, l) => s + l.lat, 0) / locations.length;
  const cLng = locations.reduce((s, l) => s + l.lng, 0) / locations.length;

  const withAngle = locations.map(loc => ({
    ...loc,
    _angle: Math.atan2(loc.lng - cLng, loc.lat - cLat),
  }));
  withAngle.sort((a, b) => a._angle - b._angle);

  const depotAngle = Math.atan2(depot.lng - cLng, depot.lat - cLat);
  let startIdx = 0;
  let minAngleDiff = Infinity;
  for (let i = 0; i < withAngle.length; i++) {
    let diff = Math.abs(withAngle[i]._angle - depotAngle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff < minAngleDiff) { minAngleDiff = diff; startIdx = i; }
  }

  const rotated = [...withAngle.slice(startIdx), ...withAngle.slice(0, startIdx)];
  return rotated;
}

/**
 * High-level helper: takes an array of app location objects, resolves
 * their coordinates, runs the circular route sort, and returns the
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

  const optimized = sortRouteCircular(withCoords);
  return [...optimized, ...withoutCoords];
}
