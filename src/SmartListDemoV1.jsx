import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLocations } from './LocationsContext';
import { LinkifyText } from './utils/textUtils';

// ── Helpers ──────────────────────────────────────────────

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const [y, m, d] = isoStr.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return '—';
    return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${String(y).slice(-2)}`;
  } catch { return '—'; }
}

function getVisitStatus(loc) {
  if (!loc?.lastVisited) return 'overdue';
  const [y, m, d] = loc.lastVisited.slice(0, 10).split('-').map(Number);
  const daysSince = (Date.now() - new Date(y, m - 1, d).getTime()) / (24 * 60 * 60 * 1000);
  if (daysSince <= 10) return 'recent';
  if (daysSince >= 40) return 'overdue';
  return 'moderate';
}

// ── Card ─────────────────────────────────────────────────

const hCell = 'text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500';

function CustomerCard({ loc, index, navigate, routeLocation }) {
  const isInactive = !!loc?.inactive;
  const status = isInactive ? 'moderate' : getVisitStatus(loc);
  const noMoney = !loc?.lastCollection || loc.lastCollection === '0' || loc.lastCollection === '0.00';
  const collection = noMoney ? 'No Money' : loc.lastCollection;
  const commPct = `${Math.round((loc?.commissionRate ?? 0.4) * 100)}%`;
  const hasCM = (loc?.changeMachineCount > 0) || loc?.hasChangeMachine;
  const cmCount = loc?.changeMachineCount || (loc?.hasChangeMachine ? 1 : 0);
  const cmText = hasCM ? `Has ${cmCount}x machines` : '—';
  const lastUser = loc?.logs?.[0]?.user || '—';
  const notes = loc?.subtitle || loc?.notes || '';

  const statusColors = {
    recent: 'bg-emerald-500',
    overdue: 'bg-red-500',
    moderate: 'bg-gray-300 dark:bg-slate-600',
  };

  return (
    <div className="flex gap-3">
      {/* Left: index + status bar */}
      <div className="flex flex-col items-center gap-2 pt-5 shrink-0">
        <span className="text-sm font-medium text-gray-500 dark:text-slate-400 tabular-nums">{index + 1}</span>
        <div className={`w-1 flex-1 rounded-full ${statusColors[status]}`} />
      </div>

      {/* Card */}
      <div
        className={`flex-1 rounded-xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all active:scale-[0.995] cursor-pointer ${isInactive ? 'opacity-50' : ''}`}
        onClick={() => loc?.id != null && navigate(`/customer/${loc.id}`, { state: { fromPath: routeLocation.pathname } })}
      >
        {/* ── ROW 1: #, Name, Last Visit, Collection, User ── */}
        <div className="mb-4 grid grid-cols-12 items-start gap-2">
          <div className="col-span-1">
            <p className={hCell}>#</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 tabular-nums">{index + 1}</p>
          </div>
          <div className="col-span-5 min-w-0">
            <p className={hCell}>Name</p>
            <p className="text-base font-bold text-gray-900 dark:text-slate-100 truncate" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {loc?.name ?? '—'}
            </p>
          </div>
          <div className="col-span-2">
            <p className={hCell}>Last Visit</p>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200 tabular-nums">{formatDate(loc?.lastVisited)}</p>
          </div>
          <div className="col-span-2">
            <p className={hCell}>Collection</p>
            <p className={`text-sm font-semibold tabular-nums ${noMoney ? 'text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-200'}`}>
              {collection}
            </p>
          </div>
          <div className="col-span-2">
            <p className={hCell}>User</p>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{lastUser}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-4 border-t border-gray-100 dark:border-slate-700/40" />

        {/* ── ROW 2: Address, City, State, %, Change Machine ── */}
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-4 min-w-0">
            <p className={hCell}>Address</p>
            <p className="truncate text-sm text-gray-800 dark:text-slate-200">{loc?.address || '—'}</p>
          </div>
          <div className="col-span-2 min-w-0">
            <p className={hCell}>City</p>
            <p className="text-sm text-gray-800 dark:text-slate-200 truncate">{loc?.city || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className={hCell}>State</p>
            <p className="text-sm text-gray-800 dark:text-slate-200">{loc?.state || '—'}</p>
          </div>
          <div className="col-span-1">
            <p className={hCell}>%</p>
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{commPct}</p>
          </div>
          <div className="col-span-3 min-w-0">
            <p className={hCell}>Change Machine</p>
            <p className={`text-sm truncate ${hasCM ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400 dark:text-slate-500'}`}>
              {cmText}
            </p>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="mt-4 rounded-lg p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
            <LinkifyText text={notes} className="text-sm font-medium text-red-700 dark:text-red-400 leading-snug" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────

export default function SmartListDemoV1() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { locations } = useLocations();
  const [filter, setFilter] = useState('all');

  const validLocations = useMemo(() => {
    return (Array.isArray(locations) ? locations : []).filter(l => l != null);
  }, [locations]);

  const counts = useMemo(() => ({
    all: validLocations.filter(l => !l.inactive).length,
    recent: validLocations.filter(l => !l.inactive && getVisitStatus(l) === 'recent').length,
    overdue: validLocations.filter(l => !l.inactive && getVisitStatus(l) === 'overdue').length,
    inactive: validLocations.filter(l => l.inactive).length,
  }), [validLocations]);

  const filtered = useMemo(() => {
    if (filter === 'all') return validLocations.filter(l => !l.inactive);
    if (filter === 'recent') return validLocations.filter(l => !l.inactive && getVisitStatus(l) === 'recent');
    if (filter === 'overdue') return validLocations.filter(l => !l.inactive && getVisitStatus(l) === 'overdue');
    if (filter === 'closed') return validLocations.filter(l => l.inactive);
    return validLocations;
  }, [validLocations, filter]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-950 overflow-hidden">
      <header
        className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-slate-800/60"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[560px] mx-auto w-full px-4 pt-2.5 pb-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-[16px] font-bold text-gray-800 dark:text-slate-100 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Smart List v1
              </h1>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                {validLocations.length} locations · Live data
              </p>
            </div>
            <div className="w-9 shrink-0" />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-2 px-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] text-gray-500 dark:text-slate-400">≤10d</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600" />
              <span className="text-[9px] text-gray-500 dark:text-slate-400">10–40d</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[9px] text-gray-500 dark:text-slate-400">40d+</span>
            </span>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-none">
            {[
              { key: 'all', label: 'All', count: counts.all },
              { key: 'recent', label: 'Recent', count: counts.recent },
              { key: 'overdue', label: 'Overdue', count: counts.overdue },
              ...(counts.inactive > 0 ? [{ key: 'closed', label: 'Closed', count: counts.inactive }] : []),
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 shrink-0 ${
                  filter === f.key
                    ? 'bg-gray-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  filter === f.key
                    ? 'bg-white/20 dark:bg-black/20 text-white dark:text-slate-900'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[560px] mx-auto w-full px-3 py-3 space-y-3 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 dark:text-slate-500 text-sm font-medium">
                {validLocations.length === 0 ? 'No locations yet — add customers first' : 'No locations match this filter'}
              </p>
            </div>
          ) : (
            filtered.map((loc, i) => (
              <CustomerCard
                key={loc.id ?? i}
                loc={loc}
                index={i}
                navigate={navigate}
                routeLocation={routeLocation}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
