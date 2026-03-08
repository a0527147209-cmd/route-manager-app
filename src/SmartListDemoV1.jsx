import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Clock, User, Percent, Cpu, MapPin } from 'lucide-react';
import { useLocations } from './LocationsContext';
import { LinkifyText } from './utils/textUtils';

// ── Helpers ──────────────────────────────────────────────

function getRelativeDays(isoStr) {
  if (!isoStr) return null;
  const [y, m, d] = isoStr.slice(0, 10).split('-').map(Number);
  const visitDate = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now - visitDate) / (1000 * 60 * 60 * 24));
}

function formatDate(isoStr) {
  if (!isoStr) return null;
  try {
    const [y, m, d] = isoStr.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${String(y).slice(-2)}`;
  } catch { return null; }
}

function formatMoney(val) {
  const n = parseFloat(val);
  if (!n || isNaN(n)) return null;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getVisitStatus(loc) {
  if (!loc?.lastVisited) return 'overdue';
  const [y, m, d] = loc.lastVisited.slice(0, 10).split('-').map(Number);
  const daysSince = (Date.now() - new Date(y, m - 1, d).getTime()) / (24 * 60 * 60 * 1000);
  if (daysSince <= 10) return 'recent';
  if (daysSince >= 40) return 'overdue';
  return 'normal';
}

// ── Components ───────────────────────────────────────────

function RelativeTimeBadge({ isoDate }) {
  const days = getRelativeDays(isoDate);
  if (days === null) return <span className="text-[10px] text-slate-400">—</span>;

  let label, cls;
  if (days === 0) {
    label = 'Today'; cls = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  } else if (days === 1) {
    label = '1d ago'; cls = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
  } else if (days <= 14) {
    label = `${days}d ago`; cls = 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300';
  } else if (days <= 30) {
    label = `${days}d ago`; cls = 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  } else {
    label = `${days}d ago`; cls = 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${cls}`}>
      <Clock size={10} strokeWidth={2.5} />
      {label}
    </span>
  );
}

function PillBadge({ icon: Icon, label, color = 'slate' }) {
  const colorMap = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${colorMap[color] || colorMap.slate}`}>
      {Icon && <Icon size={10} strokeWidth={2.5} />}
      {label}
    </span>
  );
}

function SmartCard({ loc, index, navigate, routeLocation }) {
  const isInactive = !!loc?.inactive;
  const visitStatus = getVisitStatus(loc);
  const noMoney = !loc?.lastCollection || loc.lastCollection === '0' || loc.lastCollection === '0.00';
  const money = formatMoney(loc?.lastCollection);
  const commPct = `${Math.round((loc?.commissionRate ?? 0.4) * 100)}%`;
  const hasCM = (loc?.changeMachineCount > 0) || loc?.hasChangeMachine;
  const cmCount = loc?.changeMachineCount || (loc?.hasChangeMachine ? 1 : 0);
  const lastUser = loc?.logs?.[0]?.user || '';
  const notes = loc?.subtitle || loc?.notes || '';
  const lastVisitDate = formatDate(loc?.lastVisited);
  const cityState = [loc?.city, loc?.state].filter(Boolean).join(', ');

  const stripe = isInactive ? 'border-l-slate-300 dark:border-l-slate-600'
    : visitStatus === 'recent' ? 'border-l-emerald-500'
    : visitStatus === 'overdue' ? 'border-l-red-500'
    : 'border-l-slate-300 dark:border-l-slate-600';

  return (
    <div
      data-customer-id={loc?.id}
      className={`w-full rounded-2xl border border-slate-200/70 dark:border-slate-700/50 border-l-4 ${stripe} bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)] transition-all active:scale-[0.995] cursor-pointer ${isInactive ? 'opacity-50' : ''}`}
      onClick={() => loc?.id != null && navigate(`/customer/${loc.id}`, { state: { fromPath: routeLocation.pathname } })}
    >
      <div className="px-3.5 pt-3 pb-2.5">
        {/* Row 1: Index + Name + Money */}
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 w-5 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 tabular-nums pt-0.5">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-snug truncate" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {loc?.name ?? '—'}
            </h3>
            {(loc?.address || cityState) && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={10} className="text-slate-400 dark:text-slate-500 shrink-0" strokeWidth={2} />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {loc?.address}{cityState ? ` · ${cityState}` : ''}
                </span>
              </div>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-0.5">
            {isInactive ? (
              <span className="text-[13px] font-bold text-slate-400 dark:text-slate-600 uppercase">Closed</span>
            ) : noMoney ? (
              <span className="text-lg font-extrabold text-slate-300 dark:text-slate-600 tabular-nums leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
                No $
              </span>
            ) : (
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {money}
              </span>
            )}
            {lastUser && !isInactive && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                by <span className="font-semibold text-slate-500 dark:text-slate-400">{lastUser}</span>
              </span>
            )}
            <RelativeTimeBadge isoDate={loc?.lastVisited} />
          </div>
        </div>

        {/* Row 2: Pill badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-7">
          <PillBadge icon={Percent} label={commPct} color="indigo" />
          {hasCM && <PillBadge icon={Cpu} label={`${cmCount}x Machine`} color="emerald" />}
          {isInactive && <PillBadge label="Inactive" color="slate" />}
          {lastVisitDate && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
              {lastVisitDate}
            </span>
          )}
        </div>
      </div>

      {/* Warning note */}
      {notes && (
        <div className="px-3 pb-2.5">
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40">
            <AlertTriangle size={14} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={2.5} />
            <LinkifyText text={notes} className="text-[11px] font-medium text-amber-700 dark:text-amber-300 leading-snug" />
          </div>
        </div>
      )}
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
    const locs = Array.isArray(locations) ? locations.filter(l => l != null) : [];
    return locs;
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
    <div className="h-full flex flex-col bg-slate-50/80 dark:bg-slate-950 overflow-hidden">
      <header
        className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[520px] mx-auto w-full px-4 pt-2.5 pb-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 shrink-0"
            >
              <ArrowLeft size={20} strokeWidth={2} />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 tracking-tight" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Smart List v1
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {validLocations.length} locations · Live data
              </p>
            </div>
            <div className="w-9 shrink-0" />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-2 px-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] text-slate-500 dark:text-slate-400">≤10d</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="text-[9px] text-slate-500 dark:text-slate-400">10–40d</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[9px] text-slate-500 dark:text-slate-400">40d+</span>
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
                    ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  filter === f.key
                    ? 'bg-white/20 dark:bg-black/20 text-white dark:text-slate-900'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[520px] mx-auto w-full px-2.5 py-2.5 space-y-2 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                {validLocations.length === 0 ? 'No locations yet — add customers first' : 'No locations match this filter'}
              </p>
            </div>
          ) : (
            filtered.map((loc, i) => (
              <SmartCard
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
