
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useLocations } from './LocationsContext';
import { Search, Filter, X, ArrowUpDown, GripVertical, Check, MapPin, Calendar, Clock, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react';
import { WazeLogo, GoogleMapsLogo } from './BrandIcons';
import DraggableCard from './DraggableCard';
import { LinkifyText } from './utils/textUtils';
import MenuDrawer from './MenuDrawer';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { useSearch } from './SearchContext';
import { Reorder } from 'framer-motion';

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
  const { locations, resetAndLoadDemo, reorderLocations } = useLocations();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { areaKey: urlAreaKey } = useParams();
  const { t, isRtl } = useLanguage();
  const { searchTerm, setSearchTerm } = useSearch();
  const { isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
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
    const term = (searchTerm ?? '').toString().trim().toLowerCase();
    if (!term) return null;
    return term.split(/\s+/).filter(Boolean);
  }, [searchTerm]);

  const matchesSearch = (loc) => {
    if (!searchWords?.length) return true;

    try {
      // Base fields
      const baseText = [
        loc?.name,
        loc?.address,
        loc?.city,
        loc?.state,
        loc?.region,
        loc?.zone,
        loc?.type,
        loc?.id,
        loc?.notes,     // Customer notes
        loc?.logNotes,  // Top-level log notes
        loc?.status,
        loc?.lastCollection,
        loc?.commissionRate ? `${Math.round(loc.commissionRate * 100)}% ` : null,
        loc?.bills ? Object.entries(loc.bills || {}).map(([k, v]) => `${k}x${v} `).join(' ') : ''
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(' ');

      // Check base fields first
      if (searchWords.every((word) => baseText.includes(word))) return true;

      // Check logs history
      if (loc?.logs && Array.isArray(loc.logs)) {
        const allLogsText = loc.logs.map(log =>
          [
            log.date,
            log.collection,
            log.notes,
            log.bills ? Object.entries(log.bills || {}).map(([k, v]) => `${k}x${v} `).join(' ') : ''
          ].join(' ')
        ).join(' ').toLowerCase();

        const fullText = baseText + ' ' + allLogsText;
        return searchWords.every((word) => fullText.includes(word));
      }

      return searchWords.every((word) => baseText.includes(word));
    } catch (error) {
      console.error('Search error for loc:', loc, error);
      // Fallback to name search in case of error
      return (loc?.name || '').toLowerCase().includes(searchWords[0]);
    }
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
      .filter((loc) => getGroupKey(loc) === groupKey);
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
        });
    }
    const kn = keyNorm(compositeKey);
    return filteredLocations
      .filter((loc) => zoneKey(loc?.region ?? loc?.zone ?? loc?.city) === kn);
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
        const composite = `${dim}${COMPOSITE_SEP}${k} `;
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

  const isRecentlyVisited = (loc) => {
    if (loc?.status !== 'visited' || !loc?.lastVisited) return false;
    const diff = Date.now() - new Date(loc.lastVisited).getTime();
    return diff <= 10 * 24 * 60 * 60 * 1000;
  };

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
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-card p-2 min-h-[50px] flex flex-col justify-center sticky top-0 z-10 shadow-sm shrink-0 max-w-[380px] mx-auto w-full border-b border-border">
        <div className="flex justify-between items-center gap-1.5 w-full">
          <button
            onClick={handleBack}
            className="p-2 -ms-1 rounded-full text-muted-foreground hover:bg-muted/50 transition-colors shrink-0 active:scale-95"
            title={isInnerPage ? t('backToLocations') : t('backToHome')}
          >
            <ArrowLeft size={22} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <h1 className="text-base font-bold text-foreground truncate flex-1 text-center min-w-0">
            {isInnerPage ? areaDisplayLabel : t('locations')}
          </h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors shrink-0 active:scale-95"
            title={t('menu')}
          >
            <Menu size={22} />
          </button>
        </div>
        <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* Search + Sort row - compact, narrow width */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="relative w-[120px] max-w-[35vw] shrink-0">
            <Search size={12} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${isRtl ? 'right-1.5' : 'left-1.5'}`} />
            <input
              type="text"
              placeholder={t('searchLocation')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full py-1 text-[11px] rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-transparent outline-none ${isRtl ? 'pr-5 pl-5 text-right' : 'pl-5 pr-5 text-left'}`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors ${isRtl ? 'left-1' : 'right-1'}`}
                type="button"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {!isInnerPage && (
            <div className="flex items-center gap-0.5 shrink-0">
              <SlidersHorizontal size={12} className="text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`py-1 text-[11px] rounded-md border border-input bg-background text-foreground focus:ring-1 focus:ring-primary outline-none cursor-pointer ${isRtl ? 'pr-1 pl-5 text-right' : 'pl-1 pr-5 text-left'}`}
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
            <MapPin className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t('noLocationsYet')}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">{t('openMenuAddCustomer')}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => navigate('/add')}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
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
              <p className="text-muted-foreground font-medium">{t('noResultsFor')} &quot;{areaDisplayLabel}&quot;</p>
              <p className="text-muted-foreground/80 text-sm mt-1">{t('tryDifferentKeywords')}</p>
              <button
                onClick={handleBack}
                className="mt-4 px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-medium"
              >
                {t('back')}
              </button>
            </div>
          ) : isAdmin ? (
            <Reorder.Group
              axis="y"
              values={areaLocations}
              onReorder={(newOrder) => {
                reorderLocations(newOrder.map(loc => loc.id));
              }}
              className="space-y-1"
            >
              {areaLocations.map((loc, index) => <DraggableCard key={loc?.id} loc={loc} index={index} visited={isRecentlyVisited(loc)}>
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex justify-between items-start gap-1.5">
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => loc?.id != null && navigate(`/location/${loc.id}`, { state: { fromPath: routeLocation.pathname } })}
                    >
                      <div className="flex justify-between items-start gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-foreground text-xs leading-tight">
                              {loc?.name ?? '—'}
                            </h3>
                            <span className="px-1 py-px rounded text-[9px] font-bold bg-muted/60 text-muted-foreground border border-border/30 shrink-0">
                              {Math.round((loc?.commissionRate ?? 0.4) * 100)}%
                            </span>
                            {(loc?.changeMachineCount > 0 || loc?.hasChangeMachine) && (
                              <span className="px-1 py-px rounded text-[9px] font-bold bg-emerald-400 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-950 shrink-0">
                                x{loc.changeMachineCount || 1} {t('machine')}
                              </span>
                            )}

                          </div>
                          {loc?.address && (
                            <p className="text-muted-foreground text-[10px] mt-0.5">{loc.address}</p>
                          )}
                          {loc?.locationType && (
                            <p className="text-muted-foreground text-xs mt-0.5">
                              {loc.locationType}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            {loc?.lastVisited && (
                              <div className={`flex flex-col ${isRtl ? 'items-start' : 'items-start'}`}>
                                <span className="text-[9px] text-muted-foreground font-medium mb-px whitespace-nowrap">
                                  {t('lastVisit')}
                                </span>
                                <span className="text-[11px] font-bold text-foreground whitespace-nowrap">
                                  {(() => {
                                    const d = new Date(loc.lastVisited);
                                    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
                                  })()}
                                </span>
                              </div>
                            )}
                            {(loc?.lastCollection || loc?.logs?.[0]?.user) && (
                              <div className={`flex flex-col ${isRtl ? 'items-start' : 'items-start'}`}>
                                <span className="text-[9px] text-muted-foreground font-medium mb-px whitespace-nowrap">
                                  {t('lastCollection')}
                                </span>
                                <span className="text-[11px] font-bold text-foreground whitespace-nowrap">
                                  {[loc?.lastCollection, loc?.logs?.[0]?.user].filter(Boolean).join(' · ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <a
                          href={getWazeUrl(loc?.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-[28px] h-[28px] rounded-md overflow-hidden hover:opacity-80 transition-opacity active:scale-95 shrink-0"
                          title={t('waze')}
                        >
                          <WazeLogo size={28} />
                        </a>
                        <a
                          href={getMapsUrl(loc?.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-[28px] h-[28px] rounded-md overflow-hidden hover:opacity-80 transition-opacity active:scale-95 shrink-0"
                          title={t('maps')}
                        >
                          <GoogleMapsLogo size={28} />
                        </a>
                      </div>
                    </div>
                  </div>
                  {loc?.subtitle && (
                    <LinkifyText text={loc.subtitle} className="text-xs font-bold text-red-600 dark:text-red-400 mt-1 block w-full" />
                  )}
                </div>
              </DraggableCard>
              )}
            </Reorder.Group>
          ) : (
            <div className="space-y-1">
              {areaLocations.map((loc, index) => (
                <div
                  key={loc?.id}
                  className="flex items-stretch gap-1.5 p-2 rounded-xl bg-card border border-border shadow-sm cursor-pointer"
                  onClick={() => loc?.id != null && navigate(`/location/${loc.id}`, { state: { fromPath: routeLocation.pathname } })}
                >
                  <div className="flex items-center justify-center w-4">
                    <span className="text-[9px] font-bold text-muted-foreground">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex justify-between items-start gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-foreground text-xs leading-tight">{loc?.name ?? '—'}</h3>
                          <span className="px-1 py-px rounded text-[9px] font-bold bg-muted/60 text-muted-foreground border border-border/30 shrink-0">
                            {Math.round((loc?.commissionRate ?? 0.4) * 100)}%
                          </span>
                          {(loc?.changeMachineCount > 0 || loc?.hasChangeMachine) && (
                            <span className="px-1 py-px rounded text-[9px] font-bold bg-emerald-400 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-950 shrink-0">
                              x{loc.changeMachineCount || 1} {t('machine')}
                            </span>
                          )}
                        </div>
                        {loc?.address && <p className="text-muted-foreground text-[10px] mt-0.5">{loc.address}</p>}
                        <div className="flex items-center gap-1.5 mt-1">
                          {loc?.lastVisited && (
                            <div className="flex flex-col items-start">
                              <span className="text-[9px] text-muted-foreground font-medium mb-px whitespace-nowrap">{t('lastVisit')}</span>
                              <span className="text-[11px] font-bold text-foreground whitespace-nowrap">
                                {(() => {
                                  const d = new Date(loc.lastVisited);
                                  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
                                })()}
                              </span>
                            </div>
                          )}
                          {(loc?.lastCollection || loc?.logs?.[0]?.user) && (
                            <div className="flex flex-col items-start">
                              <span className="text-[9px] text-muted-foreground font-medium mb-px whitespace-nowrap">{t('lastCollection')}</span>
                              <span className="text-[11px] font-bold text-foreground whitespace-nowrap">{[loc?.lastCollection, loc?.logs?.[0]?.user].filter(Boolean).join(' · ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {loc?.subtitle && (
                      <LinkifyText text={loc.subtitle} className="text-xs font-bold text-red-600 dark:text-red-400 mt-1 block w-full" />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <a href={getWazeUrl(loc?.address)} target="_blank" rel="noopener noreferrer" className="w-[28px] h-[28px] rounded-md overflow-hidden hover:opacity-80 transition-opacity active:scale-95 shrink-0" title={t('waze')}>
                        <WazeLogo size={28} />
                      </a>
                      <a href={getMapsUrl(loc?.address)} target="_blank" rel="noopener noreferrer" className="w-[28px] h-[28px] rounded-md overflow-hidden hover:opacity-80 transition-opacity active:scale-95 shrink-0" title={t('maps')}>
                        <GoogleMapsLogo size={28} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : searchTerm && searchTerm.trim() ? (
          filteredLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground font-medium mb-1">{t('noResultsFor')} &quot;{searchTerm}&quot;</p>
              <p className="text-muted-foreground/80 text-sm">{t('tryDifferentKeywords')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLocations.map((loc, index) => (
                <div
                  key={loc?.id ?? index}
                  onClick={() => loc?.id != null && navigate(`/location/${loc.id}`, { state: { fromPath: routeLocation.pathname } })}
                  className={`rounded-lg p-3 shadow-sm border border-border active:scale-[0.99] transition-transform cursor-pointer ${isRecentlyVisited(loc) ? 'bg-gray-200 dark:bg-gray-700/60' : 'bg-card'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-foreground text-sm">
                          {loc?.name ?? '—'}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground shrink-0">
                          {Math.round((loc?.commissionRate ?? 0.4) * 100)}%
                        </span>
                        {(loc?.changeMachineCount > 0 || loc?.hasChangeMachine) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-950 shrink-0">
                            x{loc.changeMachineCount || 1} {t('machine')}
                          </span>
                        )}
                      </div>
                      {loc?.locationType && (
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {loc.locationType}
                        </p>
                      )}
                    </div>
                    {loc?.lastVisited && (
                      <div className={`shrink-0 ${isRtl ? 'text-right' : 'text-left'} flex flex-col ${isRtl ? 'items-end' : 'items-start'} justify-center min-w-0 max-w-[40%] ${isRtl ? 'me-3' : 'ms-3'}`}>
                        <p className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap leading-tight">
                          {t('lastVisit')}
                        </p>
                        <p className="text-xs font-semibold text-primary whitespace-nowrap leading-tight mt-0.5">
                          {formatVisitDate(loc.lastVisited)}
                        </p>
                      </div>
                    )}
                    <div className={`flex gap-1.5 shrink-0 ${isRtl ? 'me-4' : 'ms-4'}`} onClick={(e) => e.stopPropagation()}>
                      <a
                        href={getWazeUrl(loc?.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-[38px] h-[38px] rounded-lg overflow-hidden hover:opacity-80 transition-opacity active:scale-95 shrink-0"
                        title={t('waze')}
                      >
                        <WazeLogo size={38} />
                      </a>
                      <a
                        href={getMapsUrl(loc?.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-[38px] h-[38px] rounded-lg overflow-hidden hover:opacity-80 transition-opacity active:scale-95 shrink-0"
                        title={t('googleMaps')}
                      >
                        <GoogleMapsLogo size={38} />
                      </a>
                    </div>
                  </div>
                  {loc?.subtitle && (
                    <LinkifyText text={loc.subtitle} className="text-xs font-bold text-red-600 dark:text-red-400 mt-1 block w-full" />
                  )}
                </div>
              ))}
            </div>
          )
        ) : displayGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground font-medium mb-1">{t('noResultsFor')} &quot;{searchTerm}&quot;</p>
            <p className="text-muted-foreground/80 text-sm">{t('tryDifferentKeywords')}</p>
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
                  className="w-full flex items-center gap-2 py-3 px-4 text-left rounded-xl border border-border bg-card shadow-sm hover:bg-muted/50 active:scale-[0.995] transition-all"
                >
                  <ChevronRight size={20} className={`text-muted-foreground shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
                  <span className="font-semibold text-foreground">{label(area.label, t)}</span>
                  <span className={`text-xs text-muted-foreground ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
                    {getAreaCount(area)}
                  </span>
                </button>
              );
            })}
          </div>
        )
        }
      </main >
    </div >
  );
}
