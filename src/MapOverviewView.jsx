import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Navigation, ExternalLink, Route as RouteIcon, Maximize2, Minimize2 } from 'lucide-react';
import { useLocations } from './LocationsContext';
import { useLanguage } from './LanguageContext';
import { sortRouteNearestNeighbor } from './utils/routeOptimizer';
import MenuDrawer from './MenuDrawer';
import BackButton from './BackButton';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const GEO_CACHE_KEY = 'vrm_geo_cache_v2';
const ZONE_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#db2777', '#0891b2', '#dc2626', '#0f766e'];
const NO_VISIT_MEDIUM_DAYS = 35;
const NO_VISIT_HIGH_DAYS = 65;
const US_BOUNDS = {
  minLat: 24.3,
  maxLat: 49.5,
  minLng: -125.0,
  maxLng: -66.7,
};
const NORTHEAST_BOUNDS = {
  minLat: 39.0,
  maxLat: 43.8,
  minLng: -76.5,
  maxLng: -70.0,
};
const NYC_BOROUGH_BOUNDS = {
  'manhattan':      { minLat: 40.700, maxLat: 40.882, minLng: -74.020, maxLng: -73.907 },
  'brooklyn':       { minLat: 40.570, maxLat: 40.739, minLng: -74.042, maxLng: -73.833 },
  'queens':         { minLat: 40.541, maxLat: 40.812, minLng: -73.962, maxLng: -73.700 },
  'bronx':          { minLat: 40.785, maxLat: 40.917, minLng: -73.933, maxLng: -73.748 },
  'staten island':  { minLat: 40.496, maxLat: 40.651, minLng: -74.255, maxLng: -74.052 },
};
const MIDWOOD_DEPOT = { lat: 40.6214, lng: -73.9676 };
let mapsLoadPromise = null;

function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.maps) return Promise.resolve(true);
  if (mapsLoadPromise) return mapsLoadPromise;
  if (!GOOGLE_MAPS_KEY) return Promise.resolve(false);

  mapsLoadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&language=en`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
}

function zoneKey(raw) {
  return (raw ?? '').toString().trim().toLowerCase();
}

function isInUsBounds(point) {
  if (!point) return false;
  return (
    point.lat >= US_BOUNDS.minLat &&
    point.lat <= US_BOUNDS.maxLat &&
    point.lng >= US_BOUNDS.minLng &&
    point.lng <= US_BOUNDS.maxLng
  );
}

function isInNortheastBounds(point) {
  if (!point) return false;
  return (
    point.lat >= NORTHEAST_BOUNDS.minLat &&
    point.lat <= NORTHEAST_BOUNDS.maxLat &&
    point.lng >= NORTHEAST_BOUNDS.minLng &&
    point.lng <= NORTHEAST_BOUNDS.maxLng
  );
}

function buildGeocodeQuery(loc) {
  const address = (loc?.fullAddress || loc?.address || '').trim();
  const city = (loc?.city || '').trim();
  const state = (loc?.state || '').trim();
  const zip = (loc?.zipCode || '').trim();
  const zone = (loc?.region || loc?.zone || '').trim();
  const z = zoneKey(zone);

  const NYC_BOROUGHS = ['bronx', 'brooklyn', 'staten island', 'queens', 'manhattan'];
  if (NYC_BOROUGHS.includes(z)) {
    const parts = [address, zone, 'New York', state || 'NY', zip].filter(Boolean);
    return parts.join(', ') + ', USA';
  }
  const base = [address, city, state, zip].filter(Boolean).join(', ');
  if (!base) return '';
  return `${base}, USA`;
}

function isInBoroughBounds(point, boroughKey) {
  const b = NYC_BOROUGH_BOUNDS[boroughKey];
  if (!b || !point) return true;
  return point.lat >= b.minLat && point.lat <= b.maxLat && point.lng >= b.minLng && point.lng <= b.maxLng;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function daysSince(isoDate) {
  if (!isoDate) return null;
  const ms = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function noMoneyStreak(logs, count = 2) {
  const recent = Array.isArray(logs) ? logs.slice(0, count) : [];
  if (recent.length < count) return false;
  return recent.every((log) => {
    const n = parseFloat(log?.collection);
    return !log?.collection || Number.isNaN(n) || n <= 0;
  });
}

function getStatus(loc) {
  const since = daysSince(loc?.lastVisited);
  if (since === 0) return 'visitedToday';
  if (noMoneyStreak(loc?.logs, 2)) return 'urgent';
  if (since != null && since >= NO_VISIT_HIGH_DAYS) return 'urgent';
  if (since != null && since >= NO_VISIT_MEDIUM_DAYS) return 'medium';
  return 'pending';
}

function getStatusLabel(status, t) {
  if (status === 'visitedToday') return t('statusVisitedToday');
  if (status === 'medium') return t('statusMedium');
  if (status === 'urgent') return t('statusUrgent');
  return t('statusNoAction');
}

function getStatusClass(status) {
  if (status === 'visitedToday') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (status === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (status === 'urgent') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
}

export default function MapOverviewView() {
  const navigate = useNavigate();
  const { locations } = useLocations();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [mapsReady, setMapsReady] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [routeNumbers, setRouteNumbers] = useState({});
  const [mapFullscreen, setMapFullscreen] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const polylineRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const geocodeCacheRef = useRef({});

  const zones = useMemo(() => {
    const set = new Set();
    for (const loc of locations || []) {
      const z = (loc?.region || loc?.zone || loc?.city || '').trim();
      if (z) set.add(z);
    }
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [locations]);

  const zoneColorMap = useMemo(() => {
    const uniqueZones = Array.from(new Set((locations || []).map((loc) => (loc?.region || loc?.zone || loc?.city || t('other')).trim())));
    return uniqueZones.reduce((acc, zone, idx) => {
      acc[zone] = ZONE_COLORS[idx % ZONE_COLORS.length];
      return acc;
    }, {});
  }, [locations, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (locations || [])
      .filter((loc) => {
        const zone = (loc?.region || loc?.zone || loc?.city || '').trim();
        if (zoneFilter !== 'all' && zone !== zoneFilter) return false;
        const status = getStatus(loc);
        if (statusFilter !== 'all' && status !== statusFilter) return false;
        if (!q) return true;
        const text = [loc?.name, loc?.address, loc?.city, loc?.state, zone].filter(Boolean).join(' ').toLowerCase();
        return text.includes(q);
      })
      .map((loc) => ({ ...loc, computedStatus: getStatus(loc) }));
  }, [locations, zoneFilter, statusFilter, search]);

  const selected = useMemo(() => {
    if (!filtered.length) return null;
    const found = filtered.find((x) => x.id === selectedId);
    return found || filtered[0];
  }, [filtered, selectedId]);

  useEffect(() => {
    loadGoogleMaps().then((ok) => setMapsReady(ok));
    try {
      const cache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
      geocodeCacheRef.current = cache && typeof cache === 'object' ? cache : {};
    } catch {
      geocodeCacheRef.current = {};
    }
  }, []);

  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 40.7128, lng: -74.006 },
      zoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      restriction: {
        latLngBounds: {
          north: NORTHEAST_BOUNDS.maxLat,
          south: NORTHEAST_BOUNDS.minLat,
          east: NORTHEAST_BOUNDS.maxLng,
          west: NORTHEAST_BOUNDS.minLng,
        },
        strictBounds: false,
      },
    });
    infoWindowRef.current = new window.google.maps.InfoWindow();
  }, [mapsReady]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;
    let active = true;
    const geocoder = new window.google.maps.Geocoder();

    const clearMarkers = () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };

    const geocodeAddress = (query, boroughKey) => new Promise((resolve) => {
      const bBounds = NYC_BOROUGH_BOUNDS[boroughKey];
      const searchBounds = bBounds
        ? new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(bBounds.minLat, bBounds.minLng),
            new window.google.maps.LatLng(bBounds.maxLat, bBounds.maxLng)
          )
        : new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(NORTHEAST_BOUNDS.minLat, NORTHEAST_BOUNDS.minLng),
            new window.google.maps.LatLng(NORTHEAST_BOUNDS.maxLat, NORTHEAST_BOUNDS.maxLng)
          );

      geocoder.geocode({
        address: query,
        componentRestrictions: { country: 'US' },
        bounds: searchBounds,
      }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const first = results[0];
          const country = first.address_components?.find((c) => c.types?.includes('country'))?.short_name;
          if (country && country !== 'US') { resolve(null); return; }
          const loc = first.geometry.location;
          const pt = { lat: loc.lat(), lng: loc.lng() };
          if (bBounds && !isInBoroughBounds(pt, boroughKey)) {
            console.warn(`[Map] Geocode for "${query}" landed outside ${boroughKey} bounds – skipping`);
            resolve(null);
            return;
          }
          resolve(pt);
        } else {
          resolve(null);
        }
      });
    });

    const toNumber = (v) => {
      const n = typeof v === 'string' ? parseFloat(v) : v;
      return Number.isFinite(n) ? n : null;
    };

    const draw = async () => {
      clearMarkers();
      const bounds = new window.google.maps.LatLngBounds();
      const nextCache = { ...geocodeCacheRef.current };

      // Phase 1: Resolve coordinates for all locations
      const resolved = [];
      for (const loc of filtered) {
        const zone = (loc?.region || loc?.zone || loc?.city || t('other')).trim();
        const boroughKey = zoneKey(loc?.region || loc?.zone || '');
        const address = loc?.fullAddress || loc?.address || `${loc?.city || ''} ${loc?.state || ''}`.trim();
        const geocodeQuery = buildGeocodeQuery(loc);
        const cacheKey = loc?.id || address;
        const lat = toNumber(loc?.lat);
        const lng = toNumber(loc?.lng);

        let point = null;
        if (lat != null && lng != null) {
          const rawPoint = { lat, lng };
          if (isInUsBounds(rawPoint) && isInNortheastBounds(rawPoint) && isInBoroughBounds(rawPoint, boroughKey)) {
            point = rawPoint;
          }
        }
        if (!point && cacheKey && nextCache[cacheKey]) {
          const cached = nextCache[cacheKey];
          if (isInUsBounds(cached) && isInNortheastBounds(cached) && isInBoroughBounds(cached, boroughKey)) {
            point = cached;
          } else {
            delete nextCache[cacheKey];
          }
        }
        if (!point && geocodeQuery) {
          point = await geocodeAddress(geocodeQuery, boroughKey);
          if (point && isInUsBounds(point) && isInNortheastBounds(point) && cacheKey) {
            nextCache[cacheKey] = point;
          } else if (cacheKey) {
            delete nextCache[cacheKey];
            point = null;
          }
        }
        if (!active) return;
        if (!point) continue;

        resolved.push({ loc, point, zone, address });
      }

      // Phase 2: Group by zone, number within each zone, optimize per zone if route mode
      const zoneGroups = new Map();
      for (const r of resolved) {
        const list = zoneGroups.get(r.zone) || [];
        list.push(r);
        zoneGroups.set(r.zone, list);
      }

      const LINE_COLORS = ['#4A54E1', '#16a34a', '#ea580c', '#db2777', '#0891b2', '#7c3aed', '#dc2626', '#ca8a04', '#0f766e', '#6366f1'];
      const numMap = {};
      let colorIdx = 0;
      const allOrdered = [];

      for (const [zoneName, group] of zoneGroups) {
        let zoneItems = group;
        if (showRoute && group.length >= 2) {
          const depotEntry = { _isDepot: true, lat: MIDWOOD_DEPOT.lat, lng: MIDWOOD_DEPOT.lng, point: MIDWOOD_DEPOT };
          const withCoords = [depotEntry, ...group.map(r => ({ ...r, lat: r.point.lat, lng: r.point.lng }))];
          const sorted = sortRouteNearestNeighbor(withCoords);
          zoneItems = sorted.filter(r => !r._isDepot);
        }
        const zoneColor = zoneColorMap[zoneName] || LINE_COLORS[colorIdx % LINE_COLORS.length];
        zoneItems.forEach((r, idx) => {
          numMap[r.loc.id] = idx + 1;
          allOrdered.push({ ...r, stopNum: idx + 1, zoneColor });
        });
        colorIdx++;
      }
      setRouteNumbers(numMap);

      // Phase 3: Create pin markers — colored per zone with sequence number
      const makePinSvg = (num, color) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/><text x="14" y="19" text-anchor="middle" fill="#fff" font-size="${num > 99 ? 9 : num > 9 ? 11 : 12}px" font-weight="bold" font-family="Arial,Helvetica,sans-serif">${num}</text></svg>`;
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
      };

      for (const item of allOrdered) {
        const { loc, point, zone, address, stopNum, zoneColor } = item;

        const marker = new window.google.maps.Marker({
          map: mapRef.current,
          position: point,
          title: `#${stopNum} ${loc?.name || ''} (${zone})`,
          icon: {
            url: makePinSvg(stopNum, zoneColor),
            scaledSize: new window.google.maps.Size(28, 40),
            anchor: new window.google.maps.Point(14, 40),
          },
          zIndex: 1000 + stopNum,
        });

        marker.addListener('click', () => {
          setSelectedId(loc.id);
          const statusLabel = getStatusLabel(loc.computedStatus, t);
          const content = `
            <div style="min-width:200px;max-width:240px;padding:2px 0;">
              <div style="display:flex;align-items:center;font-size:14px;font-weight:700;color:#0f172a;line-height:1.2;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${zoneColor};color:#fff;font-size:10px;font-weight:700;margin-right:6px;flex-shrink:0;">${stopNum}</span>
                ${escapeHtml(loc?.name || '')}
              </div>
              <div style="margin-top:4px;font-size:12px;color:#475569;line-height:1.35;">${escapeHtml(address || '-')}</div>
              <div style="margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <span style="font-size:11px;font-weight:600;color:#fff;background:${zoneColor};padding:3px 8px;border-radius:999px;">${escapeHtml(zone || t('other'))}</span>
                <span style="font-size:11px;font-weight:700;color:#0f172a;">${escapeHtml(statusLabel)}</span>
              </div>
            </div>
          `;
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(content);
            infoWindowRef.current.open({ map: mapRef.current, anchor: marker });
          }
        });
        markersRef.current.push(marker);
        bounds.extend(point);
      }

      geocodeCacheRef.current = nextCache;
      localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(nextCache));

      // Draw one separate polyline per zone (no cross-zone connections)
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      if (polylineRef.current) {
        if (Array.isArray(polylineRef.current)) {
          polylineRef.current.forEach(l => l.setMap(null));
        } else {
          if (polylineRef.current._outline) polylineRef.current._outline.setMap(null);
          polylineRef.current.setMap(null);
        }
        polylineRef.current = null;
      }

      const allLines = [];
      colorIdx = 0;
      for (const [zoneName, group] of zoneGroups) {
        let zoneItems = group;
        if (showRoute && group.length >= 2) {
          const depotEntry = { _isDepot: true, lat: MIDWOOD_DEPOT.lat, lng: MIDWOOD_DEPOT.lng, point: MIDWOOD_DEPOT };
          const withCoords = [depotEntry, ...group.map(r => ({ ...r, lat: r.point.lat, lng: r.point.lng }))];
          const sorted = sortRouteNearestNeighbor(withCoords);
          zoneItems = sorted.filter(r => !r._isDepot);
        }
        if (zoneItems.length < 2) { colorIdx++; continue; }

        const lineColor = zoneColorMap[zoneName] || LINE_COLORS[colorIdx % LINE_COLORS.length];
        const path = zoneItems.map(r => r.point);

        allLines.push(new window.google.maps.Polyline({
          path,
          strokeColor: lineColor,
          strokeWeight: 5,
          strokeOpacity: 0.6,
          map: mapRef.current,
          geodesic: true,
          zIndex: 2,
        }));
        colorIdx++;
      }
      polylineRef.current = allLines;

      if (markersRef.current.length === 1) {
        mapRef.current.setCenter(bounds.getCenter());
        mapRef.current.setZoom(13);
      } else if (markersRef.current.length > 1) {
        mapRef.current.fitBounds(bounds, 40);
      }
    };

    draw();
    return () => {
      active = false;
      clearMarkers();
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      if (polylineRef.current) {
        if (Array.isArray(polylineRef.current)) {
          polylineRef.current.forEach(l => l.setMap(null));
        } else {
          if (polylineRef.current._outline) polylineRef.current._outline.setMap(null);
          polylineRef.current.setMap(null);
        }
        polylineRef.current = null;
      }
    };
  }, [filtered, mapsReady, t, zoneColorMap, showRoute]);

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !selected) return;
    const lat = Number.isFinite(Number(selected?.lat)) ? Number(selected.lat) : null;
    const lng = Number.isFinite(Number(selected?.lng)) ? Number(selected.lng) : null;
    if (lat != null && lng != null) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom() || 12, 12));
    }
  }, [mapsReady, selected]);

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] dark:bg-slate-950 overflow-hidden">
      <header className="shrink-0 sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-[520px] mx-auto w-full px-4 py-2.5 flex items-center justify-between gap-2">
          <BackButton onClick={() => navigate(-1)} />
          <h1 className="text-base font-bold text-slate-800 dark:text-white">{t('mapOverview')}</h1>
          <button onClick={() => setMenuOpen(true)} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Menu size={20} />
          </button>
        </div>
        <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[520px] mx-auto w-full px-4 py-4 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 overflow-hidden">
            <div className={mapFullscreen ? 'fixed inset-0 z-[9999] bg-white dark:bg-slate-900' : 'relative'}>
              <div
                ref={mapContainerRef}
                className={`bg-slate-100 dark:bg-slate-800 ${mapFullscreen ? 'w-full h-full' : 'w-full rounded-xl h-[220px]'}`}
              />
              <button
                onClick={() => {
                  setMapFullscreen(v => {
                    const next = !v;
                    setTimeout(() => { if (mapRef.current) window.google?.maps?.event?.trigger(mapRef.current, 'resize'); }, 100);
                    return next;
                  });
                }}
                className="absolute top-2 right-2 z-10 w-9 h-9 flex items-center justify-center rounded-lg bg-white/90 dark:bg-slate-800/90 shadow-md border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 active:scale-90 transition-all"
                title={mapFullscreen ? 'Minimize' : 'Fullscreen'}
              >
                {mapFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(zoneColorMap).map(([zone, color]) => (
                <span key={zone} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {zone}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 space-y-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('mapSearchPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white outline-none"
            />
            <div className="flex gap-2">
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white outline-none"
              >
                {zones.map((z) => <option key={z} value={z}>{z === 'all' ? t('allTime') : z}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white outline-none"
              >
                <option value="all">{t('taskFilterAll')}</option>
                <option value="urgent">{t('statusUrgent')}</option>
                <option value="medium">{t('statusMedium')}</option>
                <option value="pending">{t('statusNoAction')}</option>
                <option value="visitedToday">{t('statusVisitedToday')}</option>
              </select>
              <button
                onClick={() => setShowRoute(v => !v)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 ${showRoute
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-200'
                }`}
                title={t('optimizeRoute') || 'Route'}
              >
                <RouteIcon size={14} />
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
              <p className="font-semibold text-slate-700 dark:text-slate-200">{t('noMapResults')}</p>
            </div>
          ) : filtered.map((loc) => {
            const zone = loc?.region || loc?.zone || loc?.city || t('other');
            const address = loc?.fullAddress || loc?.address || `${loc?.city || ''} ${loc?.state || ''}`.trim();
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
            return (
              <div
                key={loc.id}
                onClick={() => setSelectedId(loc.id)}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-3 transition-colors cursor-pointer ${
                  selected?.id === loc.id
                    ? 'border-indigo-500 dark:border-indigo-400'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {routeNumbers[loc.id] && (
                      <span
                        className="shrink-0 w-6 h-6 rounded-full text-white flex items-center justify-center text-[11px] font-bold mt-0.5"
                        style={{ backgroundColor: zoneColorMap[zone] || '#64748b' }}
                      >
                        {routeNumbers[loc.id]}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 truncate">{loc.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{address || '-'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{zone}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${getStatusClass(loc.computedStatus)}`}>
                    {getStatusLabel(loc.computedStatus, t)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/customers/area/${encodeURIComponent(`zone|${zoneKey(zone)}`)}`, {
                        state: { focusCustomerId: loc.id },
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                  >
                    <Navigation size={13} />
                    {t('openInCustomers')}
                  </button>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <ExternalLink size={13} />
                    {t('openInMaps')}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
