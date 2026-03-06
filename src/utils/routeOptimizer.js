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

function getCentroid(locs) {
  let sLat = 0, sLng = 0;
  for (const l of locs) { sLat += l.lat; sLng += l.lng; }
  return { lat: sLat / locs.length, lng: sLng / locs.length };
}

/**
 * Agglomerative (hierarchical) clustering. Starts with each location as its
 * own cluster, then repeatedly merges the two closest clusters (by centroid
 * distance) until reaching the target number. Produces natural geographic
 * groups regardless of shape or orientation.
 */
function clusterLocations(locations, targetPerCluster = 6) {
  const n = locations.length;
  const targetK = Math.max(2, Math.round(n / targetPerCluster));
  if (n <= targetPerCluster * 2 || targetK >= n) return [locations];

  let clusters = locations.map(loc => [loc]);
  let centroids = clusters.map(c => ({ lat: c[0].lat, lng: c[0].lng }));

  while (clusters.length > targetK) {
    let bestI = 0, bestJ = 1, bestDist = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dist = getDistance(centroids[i].lat, centroids[i].lng, centroids[j].lat, centroids[j].lng);
        if (dist < bestDist) { bestDist = dist; bestI = i; bestJ = j; }
      }
    }
    clusters[bestI] = [...clusters[bestI], ...clusters[bestJ]];
    centroids[bestI] = getCentroid(clusters[bestI]);
    clusters.splice(bestJ, 1);
    centroids.splice(bestJ, 1);
  }

  return clusters;
}

/**
 * Core NN + 2-Opt solver (no rotation). Returns ordered location indices.
 */
function solveTSPCore(locations, depot) {
  const n = locations.length;
  if (n <= 1) return [...locations];
  if (n === 2) {
    const d0 = getDistance(depot.lat, depot.lng, locations[0].lat, locations[0].lng);
    const d1 = getDistance(depot.lat, depot.lng, locations[1].lat, locations[1].lng);
    return d0 <= d1 ? [locations[0], locations[1]] : [locations[1], locations[0]];
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
 * TSP solver with geographic clustering.
 * For zones with 8+ stops, clusters locations by area, solves each cluster,
 * then chains them so the route finishes one area before moving to the next.
 * Start/end points are kept closest to Midwood depot.
 */
export function solveTSP(locations, depot = MIDWOOD_DEPOT) {
  const n = locations.length;
  if (n <= 1) return locations || [];
  if (n === 2) {
    const d0 = getDistance(depot.lat, depot.lng, locations[0].lat, locations[0].lng);
    const d1 = getDistance(depot.lat, depot.lng, locations[1].lat, locations[1].lng);
    return d0 <= d1 ? [locations[0], locations[1]] : [locations[1], locations[0]];
  }

  const clusters = n >= 8 ? clusterLocations(locations) : [locations];

  if (clusters.length <= 1) {
    const simple = solveTSPCore(locations, depot);
    return applyDepotRotation(simple, depot);
  }

  // Order clusters using mini-TSP on centroids for a good loop
  const centroidLocs = clusters.map((c, i) => ({ lat: getCentroid(c).lat, lng: getCentroid(c).lng, _ci: i }));
  const orderedCentroids = solveTSPCore(centroidLocs, depot);
  const ordered = orderedCentroids.map(c => clusters[c._ci]);

  // Solve TSP within each cluster
  const clusterRoutes = ordered.map(cl => cl.length <= 1 ? [...cl] : solveTSPCore(cl, depot));

  // Chain clusters, flipping direction when it shortens the inter-cluster gap
  const chained = [];
  const clusterBoundaries = [0];
  let lastPoint = depot;
  for (const route of clusterRoutes) {
    if (route.length === 0) continue;
    const first = route[0];
    const last = route[route.length - 1];
    const distNormal = getDistance(lastPoint.lat, lastPoint.lng, first.lat, first.lng);
    const distFlipped = getDistance(lastPoint.lat, lastPoint.lng, last.lat, last.lng);
    if (distFlipped < distNormal) route.reverse();
    chained.push(...route);
    clusterBoundaries.push(chained.length);
    lastPoint = chained[chained.length - 1];
  }

  // Rotate only at cluster boundaries to keep clusters intact
  const m = chained.length;
  if (m <= 2) return chained;
  let bestCut = 0;
  let bestCost = getDistance(depot.lat, depot.lng, chained[0].lat, chained[0].lng)
               + getDistance(depot.lat, depot.lng, chained[m - 1].lat, chained[m - 1].lng);
  for (const boundary of clusterBoundaries) {
    if (boundary === 0 || boundary >= m) continue;
    const cost = getDistance(depot.lat, depot.lng, chained[boundary].lat, chained[boundary].lng)
               + getDistance(depot.lat, depot.lng, chained[boundary - 1].lat, chained[boundary - 1].lng);
    if (cost < bestCost) {
      bestCost = cost;
      bestCut = boundary;
    }
  }
  if (bestCut > 0) {
    return [...chained.slice(bestCut), ...chained.slice(0, bestCut)];
  }
  return chained;
}

/**
 * Rotate the route so start and end are closest to depot.
 */
function applyDepotRotation(route, depot) {
  const m = route.length;
  if (m <= 2) return route;

  let bestCut = 0;
  let bestCost = getDistance(depot.lat, depot.lng, route[0].lat, route[0].lng)
               + getDistance(depot.lat, depot.lng, route[m - 1].lat, route[m - 1].lng);

  for (let k = 1; k < m; k++) {
    const cost = getDistance(depot.lat, depot.lng, route[k].lat, route[k].lng)
               + getDistance(depot.lat, depot.lng, route[k - 1].lat, route[k - 1].lng);
    if (cost < bestCost) {
      bestCost = cost;
      bestCut = k;
    }
  }

  if (bestCut > 0) {
    return [...route.slice(bestCut), ...route.slice(0, bestCut)];
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
