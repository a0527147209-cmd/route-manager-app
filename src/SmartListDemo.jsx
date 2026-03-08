import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { WazeLogo, GoogleMapsLogo } from './BrandIcons';
import { useLocations } from './LocationsContext';

// ── Helpers ──────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function getRelativeDays(isoStr) {
  if (!isoStr) return null;
  const [y, m, d] = isoStr.slice(0, 10).split('-').map(Number);
  const visitDate = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now - visitDate) / (1000 * 60 * 60 * 24));
}

function extractType(name) {
  const match = name?.match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : null;
}

function cleanName(name) {
  return (name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function formatMoney(val) {
  const n = parseFloat(val);
  if (!n || isNaN(n)) return null;
  if (n >= 1000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  if (n === Math.floor(n)) return `$${n}`;
  const s = n.toFixed(2);
  return `$${s.replace(/0$/, '')}`;
}

// ── Fallback demo data (used when no real locations exist) ──

const DEMO_LOCATIONS = [
  { id: 'd1', name: '792 Courtlandt Ave (deli)', address: '792 Courtlandt Ave, Bronx, NY', city: 'Bronx', state: 'NY', region: 'Bronx', lastCollection: '0', lastVisited: daysAgo(175), commissionRate: 0.4, hasChangeMachine: false, changeMachineCount: 0, inactive: true, notes: 'closed for good 11/11/25 Still closed 1/4/26', logs: [{ user: 'Eli' }] },
  { id: 'd2', name: '859 Intervale Ave (laundromat)', address: '859 Intervale Ave, Bronx, NY', city: 'Bronx', state: 'NY', region: 'Bronx', lastCollection: '11.2', lastVisited: daysAgo(34), commissionRate: 0.5, hasChangeMachine: true, changeMachineCount: 1, notes: 'Close 9:15 · Changed alarm 11/3/25', logs: [{ user: 'pj' }] },
  { id: 'd3', name: '1263 Spofford Ave (put 50) (laundromat)', address: '1263 Spofford Ave, Bronx, NY', city: 'Bronx', state: 'NY', region: 'Bronx', lastCollection: '7.9', lastVisited: daysAgo(34), commissionRate: 0.5, hasChangeMachine: true, changeMachineCount: 2, notes: 'Call before visiting', logs: [{ user: 'pj' }] },
  { id: 'd4', name: '1430 Watson Ave', address: '1430 Watson Ave, Bronx, NY', city: 'Bronx', state: 'NY', region: 'Bronx', lastCollection: '10.3', lastVisited: daysAgo(34), commissionRate: 0.4, hasChangeMachine: true, changeMachineCount: 1, notes: '', logs: [{ user: 'pj' }] },
  { id: 'd5', name: '550 E 180th St (bodega)', address: '550 E 180th St, Bronx, NY', city: 'Bronx', state: 'NY', region: 'Bronx', lastCollection: '4.5', lastVisited: daysAgo(61), commissionRate: 0.4, hasChangeMachine: true, changeMachineCount: 1, notes: '', logs: [{ user: 'Eli' }] },
  { id: 'd6', name: '731 Morris Ave (laundromat)', address: '731 Morris Ave, Bronx, NY', city: 'Bronx', state: 'NY', region: 'Bronx', lastCollection: '15.8', lastVisited: daysAgo(107), commissionRate: 0.5, hasChangeMachine: true, changeMachineCount: 3, notes: '', logs: [{ user: 'pj' }] },
  { id: 'd7', name: '2090 Valentine Ave (laundromat)', address: '2090 Valentine Ave, Bronx, NY', city: 'Bronx', state: 'NY', region: 'Bronx', lastCollection: '9.2', lastVisited: daysAgo(96), commissionRate: 0.5, hasChangeMachine: true, changeMachineCount: 2, notes: '', logs: [{ user: 'Eli' }] },
  { id: 'd8', name: '2098 Amsterdam Ave (laundromat)', address: '2098 Amsterdam Ave, New York, NY', city: 'New York', state: 'NY', region: 'Harlem', lastCollection: '320.50', lastVisited: daysAgo(5), commissionRate: 0.5, hasChangeMachine: true, changeMachineCount: 4, notes: '', logs: [{ user: 'mardi' }] },
  { id: 'd9', name: '262 Newark Ave (deli)', address: '262 Newark Ave, Jersey City, NJ', city: 'Jersey City', state: 'NJ', region: 'New Jersey', lastCollection: '87.50', lastVisited: daysAgo(3), commissionRate: 0.4, hasChangeMachine: false, changeMachineCount: 0, notes: '', logs: [{ user: 'mardi' }] },
  { id: 'd10', name: '356 West Side Ave (grocery)', address: '356 West Side Ave, Jersey City, NJ', city: 'Jersey City', state: 'NJ', region: 'New Jersey', lastCollection: '42.75', lastVisited: daysAgo(7), commissionRate: 0.35, hasChangeMachine: true, changeMachineCount: 1, notes: '', logs: [{ user: 'mardi' }] },
];

// ── Components ───────────────────────────────────────────

function ChangeMachineIcons({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-slate-400 dark:text-slate-500">
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <svg key={i} width="8" height="8" viewBox="0 0 8 8" className="text-slate-400 dark:text-slate-500">
          <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ))}
      <span className="text-[10px] font-bold ml-0.5">{count}x</span>
    </span>
  );
}

function TypeTag({ type }) {
  if (!type) return null;
  return (
    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-1.5">
      {type.toLowerCase()}
    </span>
  );
}

function SmartRow({ loc, index, onTap }) {
  const isInactive = !!loc.inactive;
  const locType = extractType(loc.name);
  const displayName = cleanName(loc.name);
  const noMoney = !loc.lastCollection || loc.lastCollection === '0' || loc.lastCollection === '0.00';
  const money = formatMoney(loc.lastCollection);
  const commPct = `${Math.round((loc.commissionRate ?? 0.4) * 100)}%`;
  const hasCM = (loc.changeMachineCount > 0) || loc.hasChangeMachine;
  const cmCount = loc.changeMachineCount || (loc.hasChangeMachine ? 1 : 0);
  const lastUser = loc.logs?.[0]?.user || loc.lastUser || null;
  const notes = loc.subtitle || loc.notes || '';
  const days = getRelativeDays(loc.lastVisited);

  const stripe = isInactive ? 'border-l-slate-300 dark:border-l-slate-600'
    : days === null || days > 40 ? 'border-l-red-400'
    : days <= 10 ? 'border-l-emerald-400'
    : days <= 30 ? 'border-l-amber-300'
    : 'border-l-red-400';

  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(loc.fullAddress || loc.address || '')}&navigate=yes`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.fullAddress || loc.address || '')}`;

  let timeLabel, timeColor;
  if (days === null) {
    timeLabel = '—';
    timeColor = 'text-slate-400';
  } else if (days === 0) {
    timeLabel = 'Today';
    timeColor = 'text-emerald-500';
  } else if (days === 1) {
    timeLabel = '1d ago';
    timeColor = 'text-emerald-500';
  } else if (days <= 10) {
    timeLabel = `${days}d ago`;
    timeColor = 'text-emerald-500';
  } else if (days <= 30) {
    timeLabel = `${days}d ago`;
    timeColor = 'text-amber-500';
  } else {
    timeLabel = `${days}d ago`;
    timeColor = 'text-red-500';
  }

  return (
    <div
      className={`w-full bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/50 border-l-4 ${stripe} rounded-xl transition-all active:scale-[0.995] cursor-pointer ${isInactive ? 'opacity-50' : ''}`}
      onClick={() => onTap?.(loc)}
    >
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        {/* Index */}
        <span className="shrink-0 w-5 text-center text-[11px] font-bold text-slate-300 dark:text-slate-600 tabular-nums pt-0.5">
          {index + 1}
        </span>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Name + type */}
          <div className="flex items-baseline min-w-0">
            <h3
              className="text-[14px] font-bold text-slate-800 dark:text-slate-100 leading-snug truncate"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {displayName}
            </h3>
            <TypeTag type={locType} />
          </div>

          {/* Row 2: Metadata pills */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            {hasCM && <ChangeMachineIcons count={cmCount} />}
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {commPct}
            </span>
            {lastUser && (
              <span className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
                {lastUser}
              </span>
            )}
            {isInactive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-px rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Closed
              </span>
            )}
            {notes && !isInactive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-px rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-medium max-w-[200px] truncate">
                <AlertTriangle size={9} strokeWidth={2.5} className="shrink-0" />
                {notes}
              </span>
            )}
          </div>
        </div>

        {/* Right side: Money + Time */}
        <div className="shrink-0 flex flex-col items-end gap-0.5 pt-0.5">
          {isInactive ? (
            <span className="text-[13px] font-semibold text-slate-400 dark:text-slate-600">Closed</span>
          ) : noMoney ? (
            <span className="text-lg font-extrabold text-slate-300 dark:text-slate-600 tabular-nums leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>—</span>
          ) : (
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {money}
            </span>
          )}
          <span className={`text-[11px] font-semibold tabular-nums ${timeColor}`}>
            {timeLabel}
          </span>
        </div>
      </div>

      {/* Swipe action buttons — visible row */}
      <div className="flex items-center justify-end gap-1.5 px-3 pb-2 -mt-0.5" onClick={(e) => e.stopPropagation()}>
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all active:scale-90"
          title="Waze"
        >
          <WazeLogo size={14} />
        </a>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 transition-all active:scale-90"
          title="Google Maps"
        >
          <GoogleMapsLogo size={14} />
        </a>
      </div>
    </div>
  );
}

// ── Main Demo Page ───────────────────────────────────────

export default function SmartListDemo() {
  const navigate = useNavigate();
  const { locations } = useLocations();
  const [filter, setFilter] = useState('all');
  const [useDemoData, setUseDemoData] = useState(false);

  const realLocations = useMemo(() => {
    const locs = Array.isArray(locations) ? locations.filter(l => l != null) : [];
    return locs;
  }, [locations]);

  const hasRealData = realLocations.length > 0;
  const sourceData = (hasRealData && !useDemoData) ? realLocations : DEMO_LOCATIONS;

  const counts = useMemo(() => ({
    all: sourceData.length,
    recent: sourceData.filter(l => !l.inactive && getRelativeDays(l.lastVisited) !== null && getRelativeDays(l.lastVisited) <= 10).length,
    overdue: sourceData.filter(l => !l.inactive && (getRelativeDays(l.lastVisited) === null || getRelativeDays(l.lastVisited) > 30)).length,
    inactive: sourceData.filter(l => l.inactive).length,
  }), [sourceData]);

  const filtered = useMemo(() => {
    if (filter === 'all') return sourceData.filter(l => !l.inactive);
    if (filter === 'recent') return sourceData.filter(l => !l.inactive && getRelativeDays(l.lastVisited) !== null && getRelativeDays(l.lastVisited) <= 10);
    if (filter === 'overdue') return sourceData.filter(l => !l.inactive && (getRelativeDays(l.lastVisited) === null || getRelativeDays(l.lastVisited) > 30));
    if (filter === 'closed') return sourceData.filter(l => l.inactive);
    return sourceData;
  }, [sourceData, filter]);

  const handleTap = (loc) => {
    if (loc.id && !loc.id.startsWith('d')) {
      navigate(`/customer/${loc.id}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/80 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
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
            <div className="flex-1 text-center min-w-0">
              <h1
                className="text-[16px] font-bold text-slate-800 dark:text-slate-100 tracking-tight"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                Smart List v2
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {hasRealData && !useDemoData ? `${sourceData.length} locations · Live data` : `${sourceData.length} locations · Demo data`}
              </p>
            </div>
            {hasRealData && (
              <button
                onClick={() => setUseDemoData(v => !v)}
                className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 shrink-0 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                {useDemoData ? 'Live' : 'Demo'}
              </button>
            )}
            {!hasRealData && <div className="w-9 shrink-0" />}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-2 px-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] text-slate-500">≤10d</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[9px] text-slate-500">10–30d</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[9px] text-slate-500">40d+</span>
            </span>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-none">
            {[
              { key: 'all', label: 'All', count: counts.all - counts.inactive },
              { key: 'recent', label: 'Recent', count: counts.recent },
              { key: 'overdue', label: 'Overdue', count: counts.overdue },
              ...(counts.inactive > 0 ? [{ key: 'closed', label: 'Closed', count: counts.inactive }] : []),
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                  filter === f.key
                    ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {f.label}
                <span className={`min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  filter === f.key
                    ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Column header */}
          <div className="flex items-center justify-between mt-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-5 text-center">#</span>
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Name</span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">$ · Status</span>
          </div>
        </div>
      </header>

      {/* List */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[520px] mx-auto w-full px-2 py-2 space-y-1.5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {filtered.map((loc, i) => (
            <SmartRow key={loc.id ?? i} loc={loc} index={i} onTap={handleTap} />
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">No locations match this filter</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
