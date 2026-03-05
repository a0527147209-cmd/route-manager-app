import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useLocations } from './LocationsContext';
import { Users, Menu, Search, ChevronRight, X, MoreVertical, EyeOff, MapPin } from 'lucide-react';
import useScrollRestore from './useScrollRestore';
import { WazeLogo, GoogleMapsLogo } from './BrandIcons';
import DraggableCard from './DraggableCard';
import { LinkifyText } from './utils/textUtils';
import { optimizeRoute } from './utils/routeOptimizer';
import MenuDrawer from './MenuDrawer';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { useSearch } from './SearchContext';
import { Reorder } from 'framer-motion';
import BackButton from './BackButton';

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
    const [y, m, d] = isoStr.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
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
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 ring-1 ring-black/[0.04] dark:ring-white/[0.06] active:scale-90 transition-all"
      >
        <MoreVertical size={14} className="text-slate-400 dark:text-slate-500" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[50]" onClick={() => setOpen(false)} />
          <div className={`absolute top-full mt-1.5 z-[51] bg-white dark:bg-slate-800 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-slate-200/60 dark:border-slate-700 overflow-hidden min-w-[130px] ${isRtl ? 'left-0' : 'right-0'}`}>
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <WazeLogo size={16} />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{t('waze')}</span>
            </a>
            <div className="border-t border-slate-100 dark:border-slate-700/50" />
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <GoogleMapsLogo size={16} />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{t('maps')}</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ loc, t }) {
  return (
    <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 min-w-[135px] ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">LAST VISIT</span>
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{loc?.lastVisited ? formatDate(loc.lastVisited) : '—'}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">COLLECTION</span>
        <span className={`text-[11px] font-semibold whitespace-nowrap ${(!loc?.lastCollection || loc.lastCollection === '0') ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>{(!loc?.lastCollection || loc.lastCollection === '0') ? 'No Money' : loc.lastCollection}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">USER</span>
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{loc?.logs?.[0]?.user || '—'}</span>
      </div>
    </div>
  );
}

function CustomerRow({ loc, index, navigate, routeLocation, t, isRtl, getWazeUrl, getMapsUrl, visitStatus = 'normal', showIndex, isFocused }) {
  const isInactive = !!loc?.inactive;
  const statusBg = isInactive ? '' : visitStatus === 'recent' ? 'bg-slate-200/60 dark:bg-slate-700/40' : visitStatus === 'overdue' ? 'bg-red-100/80 dark:bg-red-900/30' : '';
  return (
    <div
      data-customer-id={loc?.id}
      className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer transition-colors duration-150 ${isInactive ? 'opacity-50' : ''} ${statusBg || 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'} ${isFocused ? 'ring-2 ring-indigo-400/60 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/15' : ''}`}
      onClick={() => loc?.id != null && navigate(`/customer/${loc.id}`, { state: { fromPath: routeLocation.pathname } })}
    >
      {showIndex && (
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tabular-nums w-5 text-center shrink-0">
          {index + 1}
        </span>
      )}

      <div className={`flex-1 min-w-0 ${isInactive ? 'line-through decoration-slate-400 dark:decoration-slate-500' : ''}`}>
        <div className="flex items-center gap-1.5">
          <span className={`text-[13px] font-semibold truncate ${isInactive ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
            {loc?.name ?? '—'}
          </span>
          {isInactive && (
            <span className="px-1.5 py-px rounded-md text-[9px] font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-200/50 dark:ring-amber-800/30 shrink-0 no-underline">
              {t('inactive')}
            </span>
          )}
          {!isInactive && (
            <span className="px-1.5 py-px rounded-md text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-black/[0.04] dark:ring-white/[0.06] shrink-0">
              {Math.round((loc?.commissionRate ?? 0.4) * 100)}%
            </span>
          )}
          {(loc?.changeMachineCount > 0 || loc?.hasChangeMachine) && (
            <span className="px-1.5 py-px rounded-md text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30 shrink-0">
              x{loc.changeMachineCount || 1}
            </span>
          )}
        </div>

        {loc?.address && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-tight">
            {loc.address}
          </p>
        )}

        {loc?.subtitle && (
          <LinkifyText text={loc.subtitle} className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-0.5 block truncate" />
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <StatBox loc={loc} t={t} />
        <NavMenuButton wazeUrl={getWazeUrl(loc)} mapsUrl={getMapsUrl(loc)} t={t} isRtl={isRtl} />
      </div>
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
  const [showInactive, setShowInactive] = useState(false);
  const scrollRef = useRef(null);
  useScrollRestore(scrollRef);

  

  const isInnerPage = Boolean(urlAreaKey);
  const areaKeyDecoded = urlAreaKey ? decodeURIComponent(urlAreaKey) : null;
  const focusCustomerId = routeLocation.state?.focusCustomerId || null;
  const [focusedCustomerId, setFocusedCustomerId] = useState(focusCustomerId);

  useEffect(() => {
    if (!focusCustomerId) return;
    setFocusedCustomerId(focusCustomerId);
    const scrollTimer = setTimeout(() => {
      const rows = Array.from(document.querySelectorAll('[data-customer-id]'));
      const target = rows.find((el) => el.getAttribute('data-customer-id') === focusCustomerId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    const clearTimer = setTimeout(() => setFocusedCustomerId(null), 2800);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [focusCustomerId, areaKeyDecoded]);

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

  const inactiveCount = useMemo(() => validLocations.filter(loc => loc.inactive).length, [validLocations]);
  const filteredLocations = useMemo(() => validLocations.filter(loc => {
    if (!showInactive && loc.inactive) return false;
    return matchesSearch(loc);
  }), [validLocations, searchWords, showInactive]);

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

  const getVisitStatus = (loc) => {
    if (!loc?.lastVisited) return 'overdue';
    const [y, m, d] = loc.lastVisited.slice(0, 10).split('-').map(Number);
    const daysSince = (Date.now() - new Date(y, m - 1, d).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince <= 10) return 'recent';
    if (daysSince >= 40) return 'overdue';
    return 'normal';
  };

  const handleBack = () => {
    if (isInnerPage) navigate('/customers', { replace: true });
    else navigate('/');
  };

  const openArea = (compositeOrGroupKey) => {
    navigate(`/customers/area/${encodeURIComponent(compositeOrGroupKey)}`);
  };

  const areaLocationsRaw = isInnerPage && areaKeyDecoded ? getLocationsByCompositeKey(areaKeyDecoded) : [];
  const areaLocations = useMemo(() => {
    if (!isInnerPage) return areaLocationsRaw;
    return optimizeRoute(areaLocationsRaw);
  }, [areaLocationsRaw, isInnerPage]);
  const areaDisplayLabel =
    areaLocations.length > 0
      ? norm(areaLocations[0]?.region ?? areaLocations[0]?.zone ?? areaLocations[0]?.city ?? areaLocations[0]?.state)
      : (areaKeyDecoded?.includes(COMPOSITE_SEP) ? areaKeyDecoded.split(COMPOSITE_SEP)[1] : areaKeyDecoded) ?? '';
  const getAreaCount = (area) => (sortBy === 'all' ? getLocationsByCompositeKey(area.key).length : getLocationsInGroup(area.key).length);

  const rowProps = { navigate, routeLocation, t, isRtl, getWazeUrl, getMapsUrl };

  return (
    <div className="h-full flex flex-col bg-slate-50/80 dark:bg-slate-950 overflow-hidden">

      <header
        className="shrink-0 sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[520px] mx-auto w-full px-4 pt-2.5 pb-2.5">
          <div className="flex justify-between items-center gap-2 w-full">
            <BackButton onClick={handleBack} title={isInnerPage ? t('backToCustomers') : t('backToHome')} />
            <h1 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100 truncate flex-1 text-center min-w-0 tracking-tight">
              {isInnerPage ? areaDisplayLabel : t('customers')}
            </h1>
            <div className="flex items-center gap-1.5 shrink-0">
              {isInnerPage && areaLocations.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate(`/map-overview?zone=${encodeURIComponent(areaDisplayLabel)}`)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all active:scale-95"
                  title={t('mapOverview')}
                >
                  <MapPin size={16} strokeWidth={2} />
                </button>
              )}
              <button
                onClick={() => setMenuOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 shrink-0"
                title={t('menu')}
              >
                <Menu size={20} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="mt-2.5">
          <div className="flex items-center gap-2.5 pb-0.5">
            <div className="relative flex-1">
              <Search size={15} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none ${isRtl ? 'right-3' : 'left-3'}`} strokeWidth={1.8} />
              <input
                type="text"
                placeholder={t('searchCustomer')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full py-2 text-[13px] rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-600 outline-none transition-all ring-1 ring-black/[0.04] dark:ring-white/[0.06] ${isRtl ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8 text-left'}`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors ${isRtl ? 'left-2.5' : 'right-2.5'}`}
                  type="button"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {inactiveCount > 0 && (
              <button
                onClick={() => setShowInactive(v => !v)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-95 shrink-0 relative ${
                  showInactive
                    ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                    : 'border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
                }`}
                title={showInactive ? t('hideInactive') : t('showInactive')}
              >
                <EyeOff size={15} strokeWidth={1.8} />
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {inactiveCount}
                </span>
              </button>
            )}
            {!isInnerPage && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`py-2 text-[12px] rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/30 outline-none cursor-pointer shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06] transition-all ${isRtl ? 'pr-2.5 pl-7 text-right' : 'pl-2.5 pr-7 text-left'}`}
                title={t('sortBy')}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
            )}
          </div>
          </div>
        </div>
      </header>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <main ref={scrollRef} className="flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="max-w-[520px] mx-auto w-full">
          {validLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                <Users className="w-7 h-7 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('noLocationsYet')}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{t('openMenuAddCustomer')}</p>
            </div>
          ) : isInnerPage ? (
            <>
            {areaLocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <p className="text-slate-500 font-medium">{t('noResultsFor')} &quot;{areaDisplayLabel}&quot;</p>
                <p className="text-slate-400 text-sm mt-1">{t('tryDifferentKeywords')}</p>
                <button onClick={handleBack} className="mt-4 px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium ring-1 ring-black/[0.04] dark:ring-white/[0.06] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  {t('back')}
                </button>
              </div>
            ) : isAdmin ? (
              <div className="bg-white dark:bg-slate-900 overflow-hidden border-y border-slate-200/40 dark:border-slate-800/60">
                <Reorder.Group
                  axis="y"
                  values={areaLocations}
                  onReorder={(newOrder) => reorderLocations(newOrder.map(loc => loc.id))}
                >
                  {areaLocations.map((loc, index) => (
                    <DraggableCard key={loc?.id} loc={loc} index={index} visitStatus={getVisitStatus(loc)}>
                      <div
                        data-customer-id={loc?.id}
                        className={`flex-1 min-w-0 flex items-center gap-2.5 ${loc?.inactive ? 'opacity-50' : ''} ${focusedCustomerId === loc?.id ? 'ring-2 ring-indigo-400/60 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/15' : ''}`}
                        onClick={() => loc?.id != null && navigate(`/customer/${loc.id}`, { state: { fromPath: routeLocation.pathname } })}
                      >
                        <div className={`flex-1 min-w-0 cursor-pointer ${loc?.inactive ? 'line-through decoration-slate-400 dark:decoration-slate-500' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[13px] font-semibold truncate ${loc?.inactive ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>{loc?.name ?? '—'}</span>
                            {loc?.inactive ? (
                              <span className="px-1.5 py-px rounded-md text-[9px] font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-200/50 dark:ring-amber-800/30 shrink-0 no-underline">
                                {t('inactive')}
                              </span>
                            ) : (
                              <span className="px-1.5 py-px rounded-md text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-black/[0.04] dark:ring-white/[0.06] shrink-0">
                                {Math.round((loc?.commissionRate ?? 0.4) * 100)}%
                              </span>
                            )}
                            {(loc?.changeMachineCount > 0 || loc?.hasChangeMachine) && (
                              <span className="px-1.5 py-px rounded-md text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30 shrink-0">
                                x{loc.changeMachineCount || 1}
                              </span>
                            )}
                          </div>
                          {loc?.address && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{loc.address}</p>}
                          {loc?.city && <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate mt-1">{loc.city}</p>}
                          {loc?.subtitle && <LinkifyText text={loc.subtitle} className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-0.5 block truncate" />}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <StatBox loc={loc} t={t} />
                          <NavMenuButton wazeUrl={getWazeUrl(loc)} mapsUrl={getMapsUrl(loc)} t={t} isRtl={isRtl} />
                        </div>
                      </div>
                    </DraggableCard>
                  ))}
                </Reorder.Group>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 overflow-hidden border-y border-slate-200/40 dark:border-slate-800/60">
                {areaLocations.map((loc, index) => (
                    <div key={loc?.id} className="border-b border-slate-100 dark:border-slate-800/60 last:border-b-0">
                    <CustomerRow loc={loc} index={index} visitStatus={getVisitStatus(loc)} showIndex isFocused={focusedCustomerId === loc?.id} {...rowProps} />
                  </div>
                ))}
              </div>
            )}
            </>
          ) : searchTerm && searchTerm.trim() ? (
            filteredLocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                <p className="text-slate-500 font-medium">{t('noResultsFor')} &quot;{searchTerm}&quot;</p>
                <p className="text-slate-400 text-sm mt-1">{t('tryDifferentKeywords')}</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 overflow-hidden border-y border-slate-200/40 dark:border-slate-800/60">
                {filteredLocations.map((loc, index) => (
                  <div key={loc?.id ?? index} className="border-b border-slate-100 dark:border-slate-800/60 last:border-b-0">
                    <CustomerRow loc={loc} index={index} visitStatus={getVisitStatus(loc)} showIndex={false} isFocused={focusedCustomerId === loc?.id} {...rowProps} />
                  </div>
                ))}
              </div>
            )
          ) : displayGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <p className="text-slate-500 font-medium">{t('noResultsFor')} &quot;{searchTerm}&quot;</p>
              <p className="text-slate-400 text-sm mt-1">{t('tryDifferentKeywords')}</p>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-2">
              {displayGroups.map((area) => {
                const openKey = sortBy === 'all' ? area.key : `${sortBy}${COMPOSITE_SEP}${area.key}`;
                return (
                  <button
                    key={area.key}
                    type="button"
                    onClick={() => openArea(openKey)}
                    className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)] active:scale-[0.99] transition-all duration-200 text-left ring-1 ring-black/[0.02] dark:ring-white/[0.04]"
                  >
                    <ChevronRight size={16} className={`text-slate-400 dark:text-slate-500 shrink-0 ${isRtl ? 'rotate-180' : ''}`} strokeWidth={1.8} />
                    <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 flex-1 truncate">{label(area.label, t)}</span>
                    <span className="inline-flex items-center justify-center min-w-[32px] h-7 px-2.5 rounded-lg text-[12px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
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
