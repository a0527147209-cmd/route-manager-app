import { useState, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useLocations } from './LocationsContext';
import { Users, Menu, ArrowLeft, Search, ChevronRight, X, MoreVertical } from 'lucide-react';
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

function formatDate(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return null;
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return null;
  }
}

function NavMenuButton({ wazeUrl, mapsUrl, t, isRtl }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all"
      >
        <MoreVertical size={16} className="text-slate-500 dark:text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[50]" onClick={() => setOpen(false)} />
          <div className={`absolute top-full mt-1 z-[51] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden min-w-[130px] ${isRtl ? 'left-0' : 'right-0'}`}>
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <WazeLogo size={18} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('waze')}</span>
            </a>
            <div className="border-t border-slate-100 dark:border-slate-700" />
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <GoogleMapsLogo size={18} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('maps')}</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function CustomerRow({ loc, index, navigate, routeLocation, t, isRtl, getWazeUrl, getMapsUrl, visited, showIndex }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/60 transition-colors ${visited ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}
      onClick={() => loc?.id != null && navigate(`/customer/${loc.id}`, { state: { fromPath: routeLocation.pathname } })}
    >
      {showIndex && (
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums w-5 text-center shrink-0">
          {index + 1}
        </span>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Name + badges */}
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
            {loc?.name ?? '—'}
          </span>
          <span className="px-1.5 py-px rounded-full text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
            {Math.round((loc?.commissionRate ?? 0.4) * 100)}%
          </span>
          {(loc?.changeMachineCount > 0 || loc?.hasChangeMachine) && (
            <span className="px-1.5 py-px rounded-full text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
              x{loc.changeMachineCount || 1}
            </span>
          )}
        </div>

        {/* Row 2: Address */}
        {loc?.address && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
            {loc.address}
          </p>
        )}

        {/* Row 3: Meta info - stretched across full width */}
        <div className="flex items-center mt-1 w-full">
          {loc?.lastVisited && (
            <div className="flex-1 min-w-0">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">{t('lastVisit')}</span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block leading-tight">{formatDate(loc.lastVisited)}</span>
            </div>
          )}
          {loc?.lastCollection && (
            <div className="flex-1 min-w-0">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">{t('lastCollection')}</span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block leading-tight">{loc.lastCollection}</span>
            </div>
          )}
          {loc?.logs?.[0]?.user && (
            <div className="flex-1 min-w-0">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">{t('logUser')}</span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block leading-tight">{loc.logs[0].user}</span>
            </div>
          )}
        </div>

        {loc?.subtitle && (
          <LinkifyText text={loc.subtitle} className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-0.5 block truncate" />
        )}
      </div>

      <NavMenuButton wazeUrl={getWazeUrl(loc)} mapsUrl={getMapsUrl(loc)} t={t} isRtl={isRtl} />
    </div>
  );
}

export default function CustomersView() {
  const { locations, resetAndLoadDemo, reorderLocations } = useLocations();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { areaKey: urlAreaKey } = useParams();
  const { t, isRtl } = useLanguage();
  const { searchTerm, setSearchTerm } = useSearch();
  const { isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState('zone');

  const isInnerPage = Boolean(urlAreaKey);
  const areaKeyDecoded = urlAreaKey ? decodeURIComponent(urlAreaKey) : null;

  const safeLocations = Array.isArray(locations) ? locations : [];
  const validLocations = safeLocations.filter((loc) => loc != null && typeof loc === 'object');

  const searchWords = useMemo(() => {
    const term = (searchTerm ?? '').toString().trim().toLowerCase();
    if (!term) return null;
    return term.split(/\s+/).filter(Boolean);
  }, [searchTerm]);

  const matchesSearch = (loc) => {
    if (!searchWords?.length) return true;
    try {
      const baseText = [
        loc?.name, loc?.address, loc?.city, loc?.state, loc?.region, loc?.zone, loc?.type,
        loc?.id, loc?.notes, loc?.logNotes, loc?.status, loc?.lastCollection,
        loc?.commissionRate ? `${Math.round(loc.commissionRate * 100)}%` : null,
        loc?.bills ? Object.entries(loc.bills || {}).map(([k, v]) => `${k}x${v}`).join(' ') : ''
      ].filter(Boolean).map((v) => String(v).toLowerCase()).join(' ');

      if (searchWords.every((word) => baseText.includes(word))) return true;

      if (loc?.logs && Array.isArray(loc.logs)) {
        const allLogsText = loc.logs.map(log =>
          [log.date, log.collection, log.notes,
            log.bills ? Object.entries(log.bills || {}).map(([k, v]) => `${k}x${v}`).join(' ') : ''
          ].join(' ')
        ).join(' ').toLowerCase();
        return searchWords.every((word) => (baseText + ' ' + allLogsText).includes(word));
      }
      return searchWords.every((word) => baseText.includes(word));
    } catch (error) {
      console.error('Search error for loc:', loc, error);
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

  const getLocationsInGroup = (groupKey) => filteredLocations.filter((loc) => getGroupKey(loc) === groupKey);

  const COMPOSITE_SEP = '|';
  function getLocationsByCompositeKey(compositeKey) {
    if (!compositeKey) return [];
    const keyNorm = (k) => (k ?? '').trim().toLowerCase();
    if (compositeKey.includes(COMPOSITE_SEP)) {
      const [dim, key] = compositeKey.split(COMPOSITE_SEP);
      const kn = keyNorm(key);
      return filteredLocations.filter((loc) => {
        if (dim === 'city') return zoneKey(loc?.city) === kn;
        if (dim === 'state') return zoneKey(loc?.state) === kn;
        return zoneKey(loc?.region ?? loc?.zone ?? loc?.city) === kn;
      });
    }
    const kn = keyNorm(compositeKey);
    return filteredLocations.filter((loc) => zoneKey(loc?.region ?? loc?.zone ?? loc?.city) === kn);
  }

  const groupsAll = useMemo(() => {
    const seen = new Map();
    filteredLocations.forEach((loc) => {
      let addedToAtLeastOne = false;
      for (const dim of ['city', 'state', 'zone']) {
        let k, lbl;
        if (dim === 'city') { k = zoneKey(loc?.city); lbl = norm(loc?.city); }
        else if (dim === 'state') { k = zoneKey(loc?.state); lbl = norm(loc?.state); }
        else { k = zoneKey(loc?.region ?? loc?.zone ?? loc?.city); lbl = norm(loc?.region ?? loc?.zone ?? loc?.city); }
        if (!k || k === EMPTY) continue;
        const composite = `${dim}${COMPOSITE_SEP}${k}`;
        if (!seen.has(composite)) { seen.set(composite, lbl); addedToAtLeastOne = true; }
      }
      if (!addedToAtLeastOne) {
        const fallbackKey = `zone${COMPOSITE_SEP}other`;
        if (!seen.has(fallbackKey)) seen.set(fallbackKey, 'Other');
      }
    });
    return [...seen.entries()]
      .map(([key, labelVal]) => ({ key, label: labelVal }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredLocations]);

  const displayGroups = sortBy === 'all' ? groupsAll : groups;

  const getWazeUrl = (loc) =>
    `https://waze.com/ul?q=${encodeURIComponent(loc?.fullAddress || loc?.address || '')}&navigate=yes`;
  const getMapsUrl = (loc) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc?.fullAddress || loc?.address || '')}`;

  const isRecentlyVisited = (loc) => {
    if (loc?.status !== 'visited' || !loc?.lastVisited) return false;
    return (Date.now() - new Date(loc.lastVisited).getTime()) <= 10 * 24 * 60 * 60 * 1000;
  };

  const handleBack = () => {
    if (isInnerPage) navigate('/customers', { replace: true });
    else navigate('/');
  };

  const openArea = (compositeOrGroupKey) => {
    navigate(`/customers/area/${encodeURIComponent(compositeOrGroupKey)}`);
  };

  const areaLocations = isInnerPage && areaKeyDecoded ? getLocationsByCompositeKey(areaKeyDecoded) : [];
  const areaDisplayLabel =
    areaLocations.length > 0
      ? norm(areaLocations[0]?.region ?? areaLocations[0]?.zone ?? areaLocations[0]?.city ?? areaLocations[0]?.state)
      : (areaKeyDecoded?.includes(COMPOSITE_SEP) ? areaKeyDecoded.split(COMPOSITE_SEP)[1] : areaKeyDecoded) ?? '';
  const getAreaCount = (area) => (sortBy === 'all' ? getLocationsByCompositeKey(area.key).length : getLocationsInGroup(area.key).length);

  const rowProps = { navigate, routeLocation, t, isRtl, getWazeUrl, getMapsUrl };

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] dark:bg-slate-950 overflow-hidden">

      {/* Clean header */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-[420px] mx-auto w-full px-3 pt-2 pb-2">
          <div className="flex justify-between items-center gap-1.5 w-full">
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 shrink-0"
              title={isInnerPage ? t('backToCustomers') : t('backToHome')}
            >
              <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
            </button>
            <h1 className="text-[15px] font-semibold text-slate-800 dark:text-white truncate flex-1 text-center min-w-0">
              {isInnerPage ? areaDisplayLabel : t('customers')}
            </h1>
            <button
              onClick={() => setMenuOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 shrink-0"
              title={t('menu')}
            >
              <Menu size={20} />
            </button>
          </div>
          <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

          {/* Search + Sort */}
          <div className="mt-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${isRtl ? 'right-2.5' : 'left-2.5'}`} />
              <input
                type="text"
                placeholder={t('searchCustomer')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full py-1.5 text-[13px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none ${isRtl ? 'pr-8 pl-7 text-right' : 'pl-8 pr-7 text-left'}`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors ${isRtl ? 'left-2' : 'right-2'}`}
                  type="button"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {!isInnerPage && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`py-1.5 text-[12px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer shrink-0 ${isRtl ? 'pr-2 pl-6 text-right' : 'pl-2 pr-6 text-left'}`}
                title={t('sortBy')}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="max-w-[420px] mx-auto w-full">
          {validLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('noLocationsYet')}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{t('openMenuAddCustomer')}</p>
            </div>
          ) : isInnerPage ? (
            areaLocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <p className="text-slate-500 font-medium">{t('noResultsFor')} &quot;{areaDisplayLabel}&quot;</p>
                <p className="text-slate-400 text-sm mt-1">{t('tryDifferentKeywords')}</p>
                <button onClick={handleBack} className="mt-4 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium">
                  {t('back')}
                </button>
              </div>
            ) : isAdmin ? (
              <div className="bg-white dark:bg-slate-900 overflow-hidden border-y border-slate-100 dark:border-slate-800">
                <Reorder.Group
                  axis="y"
                  values={areaLocations}
                  onReorder={(newOrder) => reorderLocations(newOrder.map(loc => loc.id))}
                >
                  {areaLocations.map((loc, index) => (
                    <DraggableCard key={loc?.id} loc={loc} index={index} visited={isRecentlyVisited(loc)}>
                      <div className="flex-1 min-w-0 flex items-center gap-2"
                        onClick={() => loc?.id != null && navigate(`/customer/${loc.id}`, { state: { fromPath: routeLocation.pathname } })}
                      >
                        <div className="flex-1 min-w-0 cursor-pointer">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{loc?.name ?? '—'}</span>
                            <span className="px-1.5 py-px rounded-full text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                              {Math.round((loc?.commissionRate ?? 0.4) * 100)}%
                            </span>
                            {(loc?.changeMachineCount > 0 || loc?.hasChangeMachine) && (
                              <span className="px-1.5 py-px rounded-full text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                                x{loc.changeMachineCount || 1}
                              </span>
                            )}
                          </div>
                          {loc?.address && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{loc.address}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            {loc?.lastVisited && <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatDate(loc.lastVisited)}</span>}
                            {loc?.lastCollection && <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">${loc.lastCollection}</span>}
                            {loc?.logs?.[0]?.user && <span className="text-[10px] text-slate-400 dark:text-slate-500">{loc.logs[0].user}</span>}
                          </div>
                          {loc?.subtitle && <LinkifyText text={loc.subtitle} className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-0.5 block truncate" />}
                        </div>
                        <NavMenuButton wazeUrl={getWazeUrl(loc)} mapsUrl={getMapsUrl(loc)} t={t} isRtl={isRtl} />
                      </div>
                    </DraggableCard>
                  ))}
                </Reorder.Group>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 overflow-hidden border-y border-slate-100 dark:border-slate-800">
                {areaLocations.map((loc, index) => (
                  <div key={loc?.id} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                    <CustomerRow loc={loc} index={index} visited={isRecentlyVisited(loc)} showIndex {...rowProps} />
                  </div>
                ))}
              </div>
            )
          ) : searchTerm && searchTerm.trim() ? (
            filteredLocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <p className="text-slate-500 font-medium">{t('noResultsFor')} &quot;{searchTerm}&quot;</p>
                <p className="text-slate-400 text-sm mt-1">{t('tryDifferentKeywords')}</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 overflow-hidden border-y border-slate-100 dark:border-slate-800">
                {filteredLocations.map((loc, index) => (
                  <div key={loc?.id ?? index} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                    <CustomerRow loc={loc} index={index} visited={isRecentlyVisited(loc)} showIndex={false} {...rowProps} />
                  </div>
                ))}
              </div>
            )
          ) : displayGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <p className="text-slate-500 font-medium">{t('noResultsFor')} &quot;{searchTerm}&quot;</p>
              <p className="text-slate-400 text-sm mt-1">{t('tryDifferentKeywords')}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 overflow-hidden border-y border-slate-100 dark:border-slate-800">
              {displayGroups.map((area) => {
                const openKey = sortBy === 'all' ? area.key : `${sortBy}${COMPOSITE_SEP}${area.key}`;
                return (
                  <button
                    key={area.key}
                    type="button"
                    onClick={() => openArea(openKey)}
                    className="w-full flex items-center gap-3 py-3 px-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors text-left"
                  >
                    <ChevronRight size={16} className={`text-slate-400 dark:text-slate-500 shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
                    <span className="text-[14px] font-medium text-slate-800 dark:text-white flex-1 truncate">{label(area.label, t)}</span>
                    <span className="text-[12px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                      {getAreaCount(area)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
