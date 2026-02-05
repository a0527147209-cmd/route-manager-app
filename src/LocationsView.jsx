import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useLocations } from './LocationsContext';
import { MapPin, Map as MapIcon, Navigation, Menu, Banknote, Calendar, ArrowLeft, Search, ChevronRight, SlidersHorizontal } from 'lucide-react';
import MenuDrawer from './MenuDrawer';
import { useLanguage } from './LanguageContext';

const EMPTY = '__empty__';

function norm(v) {
  const s = (v ?? '').toString().trim();
  return s || EMPTY;
}

function zoneKey(raw) {
  const s = (raw ?? '').toString().replace(/\s+/g, ' ').trim().toLowerCase();
  return s || EMPTY;
}

function label(key, t) {
  return key === EMPTY ? t('other') : key;
}

const SORT_OPTIONS = [
  { value: 'all', labelKey: 'sortByAll' },
  { value: 'city', labelKey: 'sortByCity' },
  { value: 'state', labelKey: 'sortByState' },
  { value: 'zone', labelKey: 'sortByZone' },
];

export default function LocationsView() {
  const { locations, resetAndLoadDemo } = useLocations();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { areaKey: urlAreaKey } = useParams();
  const { t, isRtl } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchLocations, setSearchLocations] = useState('');
  const [sortBy, setSortBy] = useState('zone');
  const hasAutoLoadedDemo = useRef(false);

  const isInnerPage = Boolean(urlAreaKey);
  const areaKeyDecoded = urlAreaKey ? decodeURIComponent(urlAreaKey) : null;

  const safeLocations = Array.isArray(locations) ? locations : [];
  const validLocations = safeLocations.filter((loc) => loc != null && typeof loc === 'object');

  useEffect(() => {
    if (!resetAndLoadDemo || hasAutoLoadedDemo.current) return;
    if (validLocations.length < 10) {
      hasAutoLoadedDemo.current = true;
      resetAndLoadDemo();
    }
  }, [validLocations.length, resetAndLoadDemo]);

  const searchWords = useMemo(() => {
    const term = (searchLocations ?? '').toString().trim().toLowerCase();
    if (!term) return null;
    return term.split(/\s+/).filter(Boolean);
  }, [searchLocations]);

  const matchesSearch = (loc) => {
    if (!searchWords?.length) return true;
    const text = [
      loc?.name,
      loc?.address,
      loc?.city,
      loc?.region,
      loc?.zone,
      loc?.type,
      loc?.id,
    ]
      .filter(Boolean)
      .map((v) => String(v).toLowerCase())
      .join(' ');
    return searchWords.some((word) => text.includes(word));
  };

  const filteredLocations = useMemo(() => validLocations.filter(matchesSearch), [validLocations, searchWords]);

  function getGroupKey(loc) {
    if (sortBy === 'city') return zoneKey(loc?.city);
    if (sortBy === 'state') return zoneKey(loc?.state);
    return zoneKey(loc?.region ?? loc?.zone ?? loc?.city);
  }

  function getGroupLabel(loc) {
    if (sortBy === 'city') return norm(loc?.city);
    if (sortBy === 'state') return norm(loc?.state);
    return norm(loc?.region ?? loc?.zone ?? loc?.city);
  }

  const groups = useMemo(() => {
    const map = new Map();
    filteredLocations.forEach((loc) => {
      const key = getGroupKey(loc);
      const rawLabel = getGroupLabel(loc);
      if (!map.has(key)) map.set(key, rawLabel);
    });
    return [...map.entries()]
      .map(([key, labelVal]) => ({ key, label: labelVal }))
      .sort((a, b) => (a.key === EMPTY ? 1 : b.key === EMPTY ? -1 : a.label.localeCompare(b.label)));
  }, [filteredLocations, sortBy]);

  const getLocationsInGroup = (groupKey) => {
    return filteredLocations
      .filter((loc) => getGroupKey(loc) === groupKey)
      .sort((a, b) => {
        const aV = a?.status === 'visited' ? 1 : 0;
        const bV = b?.status === 'visited' ? 1 : 0;
        return aV - bV;
      });
  };

  const COMPOSITE_SEP = '|';
  function getLocationsByCompositeKey(compositeKey) {
    if (!compositeKey) return [];
    const keyNorm = (k) => (k ?? '').trim().toLowerCase();
    if (compositeKey.includes(COMPOSITE_SEP)) {
      const [dim, key] = compositeKey.split(COMPOSITE_SEP);
      const kn = keyNorm(key);
      return filteredLocations
        .filter((loc) => {
          if (dim === 'city') return zoneKey(loc?.city) === kn;
          if (dim === 'state') return zoneKey(loc?.state) === kn;
          return zoneKey(loc?.region ?? loc?.zone ?? loc?.city) === kn;
        })
        .sort((a, b) => {
          const aV = a?.status === 'visited' ? 1 : 0;
          const bV = b?.status === 'visited' ? 1 : 0;
          return aV - bV;
        });
    }
    const kn = keyNorm(compositeKey);
    return filteredLocations
      .filter((loc) => zoneKey(loc?.region ?? loc?.zone ?? loc?.city) === kn)
      .sort((a, b) => {
        const aV = a?.status === 'visited' ? 1 : 0;
        const bV = b?.status === 'visited' ? 1 : 0;
        return aV - bV;
      });
  }

  const groupsAll = useMemo(() => {
    const seen = new Map();
    filteredLocations.forEach((loc) => {
      for (const dim of ['city', 'state', 'zone']) {
        let k, lbl;
        if (dim === 'city') {
          k = zoneKey(loc?.city);
          lbl = norm(loc?.city);
        } else if (dim === 'state') {
          k = zoneKey(loc?.state);
          lbl = norm(loc?.state);
        } else {
          k = zoneKey(loc?.region ?? loc?.zone ?? loc?.city);
          lbl = norm(loc?.region ?? loc?.zone ?? loc?.city);
        }
        if (!k || k === EMPTY) continue;
        const composite = `${dim}${COMPOSITE_SEP}${k}`;
        if (!seen.has(composite)) seen.set(composite, lbl);
      }
    });
    return [...seen.entries()]
      .map(([key, labelVal]) => ({ key, label: labelVal }))
      .sort((a, b) => (a.label.localeCompare(b.label)));
  }, [filteredLocations]);

  const displayGroups = sortBy === 'all' ? groupsAll : groups;

  const formatVisitDate = (isoStr) => {
    if (!isoStr) return null;
    try {
      const d = new Date(isoStr);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return null;
    }
  };

  const getWazeUrl = (address) =>
    `https://waze.com/ul?q=${encodeURIComponent(address || '')}&navigate=yes`;
  const getMapsUrl = (address) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;

  const handleBack = () => {
    if (isInnerPage) {
      navigate('/locations', { replace: true });
    } else {
      navigate('/', routeLocation.state?.fromMenu ? { state: { openMenu: true } } : {});
    }
  };

  const openArea = (compositeOrGroupKey) => {
    navigate(`/locations/area/${encodeURIComponent(compositeOrGroupKey)}`);
  };

  const areaLocations = isInnerPage && areaKeyDecoded ? getLocationsByCompositeKey(areaKeyDecoded) : [];
  const areaDisplayLabel =
    areaLocations.length > 0
      ? norm(areaLocations[0]?.region ?? areaLocations[0]?.zone ?? areaLocations[0]?.city ?? areaLocations[0]?.state)
      : (areaKeyDecoded?.includes(COMPOSITE_SEP) ? areaKeyDecoded.split(COMPOSITE_SEP)[1] : areaKeyDecoded) ?? '';
  const getAreaCount = (area) => (sortBy === 'all' ? getLocationsByCompositeKey(area.key).length : getLocationsInGroup(area.key).length);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 p-2 min-h-[50px] flex flex-col justify-center sticky top-0 z-10 shadow-sm shrink-0 max-w-[380px] mx-auto w-full">
        <div className="flex justify-between items-center gap-1.5 w-full">
          <button
            onClick={handleBack}
            className="p-2 -ms-1 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 active:scale-95"
            title={isInnerPage ? t('backToLocations') : t('backToHome')}
          >
            <ArrowLeft size={22} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <h1 className="text-base font-bold text-slate-800 dark:text-white truncate flex-1 text-center min-w-0">
            {isInnerPage ? areaDisplayLabel : t('locations')}
          </h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 active:scale-95"
            title={t('menu')}
          >
            <Menu size={22} />
          </button>
        </div>
        <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* Search + Sort row - compact, narrow width */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="relative w-[120px] max-w-[35vw] shrink-0">
            <Search size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('searchLocation')}
              value={searchLocations}
              onChange={(e) => setSearchLocations(e.target.value)}
              className="w-full py-1 pl-5 pr-1 text-[11px] rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          {!isInnerPage && (
            <div className="flex items-center gap-0.5 shrink-0">
              <SlidersHorizontal size={12} className="text-slate-500 dark:text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="py-1 pl-1 pr-5 text-[11px] rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                title={t('sortBy')}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-3 max-w-[380px] mx-auto w-full">
        {validLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MapPin className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t('noLocationsYet')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{t('openMenuAddCustomer')}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => navigate('/add')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
              >
                {t('addLocation')}
              </button>
              <button
                onClick={() => resetAndLoadDemo?.()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
              >
                {t('resetAndLoadDemo')}
              </button>
            </div>
          </div>
        ) : isInnerPage ? (
          areaLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-slate-600 dark:text-slate-300 font-medium">{t('noResultsFor')} &quot;{areaDisplayLabel}&quot;</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('tryDifferentKeywords')}</p>
              <button
                onClick={handleBack}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-sm font-medium"
              >
                {t('back')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {areaLocations.map((loc, index) => (
                <div
                  key={loc?.id ?? index}
                  onClick={() => loc?.id != null && navigate(`/location/${loc.id}`, { state: { fromPath: routeLocation.pathname } })}
                  className="rounded-lg bg-white dark:bg-slate-800 p-3 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-[0.99] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">
                          {loc?.name ?? '—'}
                        </h3>
                        {loc?.status === 'visited' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-950 shrink-0">
                            {t('visited')}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-slate-200 shrink-0">
                          {Math.round((loc?.commissionRate ?? 0.4) * 100)}%
                        </span>
                        {loc?.hasChangeMachine && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-950 shrink-0">
                            {t('machine')}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 truncate flex items-center gap-0.5">
                        <MapPin size={12} className="shrink-0" />
                        {loc?.address ?? '—'}
                      </p>
                    </div>
                    {loc?.lastVisited && (
                      <div className="shrink-0 text-right flex flex-col items-end justify-center min-w-0 max-w-[40%] me-3">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap leading-tight">
                          {t('lastVisit')}
                        </p>
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap leading-tight mt-0.5">
                          {formatVisitDate(loc.lastVisited)}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-1 shrink-0 ms-4" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={getWazeUrl(loc?.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                        title="Waze"
                      >
                        <Navigation size={18} />
                      </a>
                      <a
                        href={getMapsUrl(loc?.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors"
                        title="Google Maps"
                      >
                        <MapIcon size={18} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : displayGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">{t('noResultsFor')} &quot;{searchLocations}&quot;</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('tryDifferentKeywords')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayGroups.map((area) => {
              const openKey = sortBy === 'all' ? area.key : `${sortBy}${COMPOSITE_SEP}${area.key}`;
              return (
                <button
                  key={area.key}
                  type="button"
                  onClick={() => openArea(openKey)}
                  className="w-full flex items-center gap-2 py-3 px-4 text-left rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-[0.995] transition-all"
                >
                  <ChevronRight size={20} className="text-slate-500 dark:text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-white">{label(area.label, t)}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                    {getAreaCount(area)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
