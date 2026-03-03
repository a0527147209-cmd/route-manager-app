import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useLocations } from './LocationsContext';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { useSearch } from './SearchContext';
import {
  Users, Search, ChevronRight, X, EyeOff, Menu, MapPin, FileText,
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import MenuDrawer from './MenuDrawer';
import BackButton from './BackButton';
import DraggableCard from './DraggableCard';
import { LinkifyText } from './utils/textUtils';
import { optimizeRoute } from './utils/routeOptimizer';
import SlidingPanelLayout from './components/SlidingPanelLayout';
import Panel from './components/Panel';
import { CustomerDetailContent } from './CustomerDetailsView';
import { LogFormContent } from './LogFormModal';
import {
  EMPTY, norm, zoneKey, label, SORT_OPTIONS, formatDate,
  NavMenuButton, StatBox, CustomerRow,
  COMPOSITE_SEP, getVisitStatus, getWazeUrl, getMapsUrl,
  buildGroups, getLocationsByCompositeKey, matchesSearchTerms,
} from './CustomersView';

export default function CustomersExplorer() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [searchParams] = useSearchParams();

  const { locations, reorderLocations } = useLocations();
  const { t, isRtl } = useLanguage();
  const { isAdmin } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();

  const [menuOpen, setMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState('zone');
  const [showInactive, setShowInactive] = useState(false);

  const [selectedRegionKey, setSelectedRegionKey] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [logAction, setLogAction] = useState(null);

  const safeLocations = Array.isArray(locations) ? locations : [];
  const validLocations = safeLocations.filter((loc) => loc != null && typeof loc === 'object');

  const searchWords = useMemo(() => {
    const term = (searchTerm ?? '').toString().trim().toLowerCase();
    if (!term) return null;
    return term.split(/\s+/).filter(Boolean);
  }, [searchTerm]);

  const inactiveCount = useMemo(() => validLocations.filter(loc => loc.inactive).length, [validLocations]);
  const filteredLocations = useMemo(() => validLocations.filter(loc => {
    if (!showInactive && loc.inactive) return false;
    return matchesSearchTerms(loc, searchWords);
  }), [validLocations, searchWords, showInactive]);

  const displayGroups = useMemo(
    () => buildGroups(filteredLocations, sortBy),
    [filteredLocations, sortBy]
  );

  const getAreaCount = useCallback((area) => {
    return getLocationsByCompositeKey(filteredLocations, area.key).length;
  }, [filteredLocations]);

  const areaLocations = useMemo(() => {
    if (!selectedRegionKey) return [];
    const raw = getLocationsByCompositeKey(filteredLocations, selectedRegionKey);
    return optimizeRoute(raw);
  }, [filteredLocations, selectedRegionKey]);

  const areaDisplayLabel = useMemo(() => {
    if (areaLocations.length > 0) {
      return norm(areaLocations[0]?.region ?? areaLocations[0]?.zone ?? areaLocations[0]?.city ?? areaLocations[0]?.state);
    }
    if (!selectedRegionKey) return '';
    return selectedRegionKey.includes(COMPOSITE_SEP)
      ? selectedRegionKey.split(COMPOSITE_SEP)[1]
      : selectedRegionKey;
  }, [areaLocations, selectedRegionKey]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return validLocations.find(l => String(l.id) === String(selectedCustomerId)) ?? null;
  }, [selectedCustomerId, validLocations]);

  useEffect(() => {
    const deepLinkId = searchParams.get('customerId');
    if (!deepLinkId || validLocations.length === 0) return;

    const customer = validLocations.find(l => String(l.id) === String(deepLinkId));
    if (!customer) return;

    const regionKey = zoneKey(customer.region ?? customer.zone ?? customer.city);
    if (regionKey && regionKey !== EMPTY) {
      setSelectedRegionKey(`zone${COMPOSITE_SEP}${regionKey}`);
    }
    setSelectedCustomerId(deepLinkId);
  }, [searchParams, validLocations]);

  useEffect(() => {
    if (selectedCustomerId && !selectedCustomer) {
      setSelectedCustomerId(null);
      setLogAction(null);
    }
  }, [selectedCustomer, selectedCustomerId]);

  const handleSelectRegion = useCallback((compositeKey) => {
    setSelectedRegionKey(compositeKey);
    setSelectedCustomerId(null);
    setLogAction(null);
  }, []);

  const handleSelectCustomer = useCallback((loc) => {
    setSelectedCustomerId(loc.id);
    setLogAction(null);
  }, []);

  const handleCloseCustomerList = useCallback(() => {
    setSelectedRegionKey(null);
    setSelectedCustomerId(null);
    setLogAction(null);
  }, []);

  const handleCloseCustomerDetail = useCallback(() => {
    setSelectedCustomerId(null);
    setLogAction(null);
  }, []);

  const handleOpenLog = useCallback((action) => {
    setLogAction(action);
  }, []);

  const handleCloseLog = useCallback(() => {
    setLogAction(null);
  }, []);

  const rowProps = { navigate, routeLocation, t, isRtl, getWazeUrl, getMapsUrl };

  const searchResultsActive = searchTerm && searchTerm.trim();
  const searchFilteredAll = searchResultsActive ? filteredLocations : [];

  return (
    <div className="h-full flex flex-col bg-slate-50/80 dark:bg-slate-950 overflow-hidden">
      <header
        className="shrink-0 sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="w-full px-4 pt-2.5 pb-2.5">
          <div className="flex justify-between items-center gap-2 w-full">
            <BackButton onClick={() => navigate('/')} title={t('backToHome')} />
            <h1 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100 truncate flex-1 text-center min-w-0 tracking-tight">
              {t('customers')}
            </h1>
            <button
              onClick={() => setMenuOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 shrink-0"
              title={t('menu')}
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>
          </div>

          <div className="mt-2.5 flex items-center gap-2.5">
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
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setSelectedRegionKey(null); setSelectedCustomerId(null); setLogAction(null); }}
              className={`py-2 text-[12px] rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/30 outline-none cursor-pointer shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.06] transition-all ${isRtl ? 'pr-2.5 pl-7 text-right' : 'pl-2.5 pr-7 text-left'}`}
              title={t('sortBy')}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
              ))}
            </select>
          </div>
        </div>
      </header>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="flex-1 overflow-hidden">
        {validLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6 h-full">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
              <Users className="w-7 h-7 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('noLocationsYet')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('openMenuAddCustomer')}</p>
          </div>
        ) : (
          <SlidingPanelLayout>
            {/* Panel 1: Regions */}
            <Panel id="regions" title={t('customers')} icon={Users} isFirst>
              <div className="h-full overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {searchResultsActive ? (
                  searchFilteredAll.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                      <p className="text-slate-500 font-medium">{t('noResultsFor')} &quot;{searchTerm}&quot;</p>
                      <p className="text-slate-400 text-sm mt-1">{t('tryDifferentKeywords')}</p>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 overflow-hidden border-b border-slate-200/40 dark:border-slate-800/60">
                      {searchFilteredAll.map((loc, index) => (
                        <div key={loc?.id ?? index} className="border-b border-slate-100 dark:border-slate-800/60 last:border-b-0">
                          <CustomerRow
                            loc={loc} index={index}
                            visitStatus={getVisitStatus(loc)}
                            showIndex={false}
                            isFocused={selectedCustomerId === loc?.id}
                            onClick={handleSelectCustomer}
                            {...rowProps}
                          />
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
                  <div className="px-3 py-3 space-y-1.5">
                    {displayGroups.map((area) => {
                      const openKey = sortBy === 'all' ? area.key : `${sortBy}${COMPOSITE_SEP}${area.key}`;
                      const isActive = selectedRegionKey === openKey;
                      return (
                        <button
                          key={area.key}
                          type="button"
                          onClick={() => handleSelectRegion(openKey)}
                          className={`w-full flex items-center gap-3 py-3 px-3.5 rounded-xl border transition-all duration-200 text-left ring-1 active:scale-[0.99] ${
                            isActive
                              ? 'bg-primary/10 dark:bg-primary/20 border-primary/30 dark:border-primary/40 ring-primary/10 shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)] ring-black/[0.02] dark:ring-white/[0.04]'
                          }`}
                        >
                          <ChevronRight size={14} className={`shrink-0 transition-transform duration-200 ${isActive ? 'text-primary rotate-90' : 'text-slate-400 dark:text-slate-500'} ${isRtl && !isActive ? 'rotate-180' : ''}`} strokeWidth={1.8} />
                          <span className={`text-[13px] font-semibold flex-1 truncate ${isActive ? 'text-primary' : 'text-slate-800 dark:text-slate-100'}`}>
                            {label(area.label, t)}
                          </span>
                          <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-md text-[11px] font-semibold tabular-nums shrink-0 ${
                            isActive
                              ? 'bg-primary/20 text-primary ring-1 ring-primary/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
                          }`}>
                            {getAreaCount(area)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>

            {/* Panel 2: Customer List */}
            {selectedRegionKey && (
              <Panel
                id="customerList"
                title={areaDisplayLabel}
                icon={MapPin}
                onClose={handleCloseCustomerList}
              >
                <div className="h-full overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  {areaLocations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                      <p className="text-slate-500 font-medium">{t('noResultsFor')} &quot;{areaDisplayLabel}&quot;</p>
                      <p className="text-slate-400 text-sm mt-1">{t('tryDifferentKeywords')}</p>
                    </div>
                  ) : isAdmin ? (
                    <div className="bg-white dark:bg-slate-900 overflow-hidden border-b border-slate-200/40 dark:border-slate-800/60">
                      <Reorder.Group
                        axis="y"
                        values={areaLocations}
                        onReorder={(newOrder) => reorderLocations(newOrder.map(loc => loc.id))}
                      >
                        {areaLocations.map((loc, index) => (
                          <DraggableCard key={loc?.id} loc={loc} index={index} visitStatus={getVisitStatus(loc)}>
                            <div
                              data-customer-id={loc?.id}
                              className={`flex-1 min-w-0 flex items-center gap-2.5 cursor-pointer ${loc?.inactive ? 'opacity-50' : ''} ${selectedCustomerId === loc?.id ? 'ring-2 ring-indigo-400/60 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/15' : ''}`}
                              onClick={() => handleSelectCustomer(loc)}
                            >
                              <div className={`flex-1 min-w-0 ${loc?.inactive ? 'line-through decoration-slate-400 dark:decoration-slate-500' : ''}`}>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[13px] font-semibold truncate ${loc?.inactive ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>{loc?.name ?? '—'}</span>
                                  {loc?.inactive ? (
                                    <span className="px-1.5 py-px rounded-md text-[9px] font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-200/50 dark:ring-amber-800/30 shrink-0 no-underline">{t('inactive')}</span>
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
                                {loc?.subtitle && <LinkifyText text={loc.subtitle} className="text-[11px] font-medium text-red-500 dark:text-red-400 mt-0.5 block truncate" />}
                              </div>
                            </div>
                          </DraggableCard>
                        ))}
                      </Reorder.Group>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 overflow-hidden border-b border-slate-200/40 dark:border-slate-800/60">
                      {areaLocations.map((loc, index) => (
                        <div key={loc?.id} className="border-b border-slate-100 dark:border-slate-800/60 last:border-b-0">
                          <CustomerRow
                            loc={loc} index={index}
                            visitStatus={getVisitStatus(loc)}
                            showIndex
                            isFocused={selectedCustomerId === loc?.id}
                            onClick={handleSelectCustomer}
                            {...rowProps}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            )}

            {/* Panel 3: Customer Detail */}
            {selectedCustomerId && (
              <Panel
                id="customerDetail"
                title={selectedCustomer?.name || t('customerNotFound')}
                icon={Users}
                onClose={handleCloseCustomerDetail}
              >
                <CustomerDetailContent
                  customerId={selectedCustomerId}
                  onOpenLog={handleOpenLog}
                  onBack={handleCloseCustomerDetail}
                  isPanel
                />
              </Panel>
            )}

            {/* Panel 4: Log Form */}
            {logAction && selectedCustomer && (
              <Panel
                id="logForm"
                title={`${t('locationLog')} · ${selectedCustomer.name}`}
                icon={FileText}
                onClose={handleCloseLog}
              >
                <LogFormContent
                  location={selectedCustomer}
                  onClose={handleCloseLog}
                  onSaved={handleCloseLog}
                  initialLog={typeof logAction === 'object' ? logAction.edit : null}
                  logIndex={typeof logAction === 'object' ? logAction.index : -1}
                />
              </Panel>
            )}
          </SlidingPanelLayout>
        )}
      </main>
    </div>
  );
}
