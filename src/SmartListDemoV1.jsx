import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Map as MapIcon, AlertTriangle, ArrowLeft, Clock, User, Percent, Cpu } from 'lucide-react';
import { WazeLogo, GoogleMapsLogo } from './BrandIcons';

const DEMO_LOCATIONS = [
  {
    id: '1',
    name: '859 Intervale Ave (Laundromat)',
    address: '859 Intervale Ave, Bronx, NY',
    lastCollection: '11.20',
    lastVisited: daysAgo(34),
    commissionRate: 0.5,
    hasChangeMachine: true,
    changeMachineCount: 1,
    lastUser: 'pj',
    notes: 'Close 9:15 Changed alarm code',
  },
  {
    id: '2',
    name: '262 Newark Ave (Deli)',
    address: '262 Newark Ave, Jersey City, NJ',
    lastCollection: '87.50',
    lastVisited: daysAgo(3),
    commissionRate: 0.4,
    hasChangeMachine: false,
    changeMachineCount: 0,
    lastUser: 'mardi',
    notes: '',
  },
  {
    id: '3',
    name: '706 Communipaw Ave',
    address: '706 Communipaw Ave, Jersey City, NJ',
    lastCollection: '156.00',
    lastVisited: daysAgo(12),
    commissionRate: 0.45,
    hasChangeMachine: true,
    changeMachineCount: 2,
    lastUser: 'pj',
    notes: '',
  },
  {
    id: '4',
    name: '1520 Grand Concourse (Barbershop)',
    address: '1520 Grand Concourse, Bronx, NY',
    lastCollection: '0',
    lastVisited: daysAgo(62),
    commissionRate: 0.4,
    hasChangeMachine: false,
    changeMachineCount: 0,
    lastUser: 'alex',
    notes: 'Owner/9178159292 — recommend removing. Put 50 every other collection',
  },
  {
    id: '5',
    name: '356 West Side Ave (Grocery)',
    address: '356 West Side Ave, Jersey City, NJ',
    lastCollection: '42.75',
    lastVisited: daysAgo(7),
    commissionRate: 0.35,
    hasChangeMachine: true,
    changeMachineCount: 1,
    lastUser: 'mardi',
    notes: '',
  },
  {
    id: '6',
    name: '237 Martin Luther King Dr',
    address: '237 MLK Dr, Jersey City, NJ',
    lastCollection: '210.00',
    lastVisited: daysAgo(1),
    commissionRate: 0.5,
    hasChangeMachine: true,
    changeMachineCount: 3,
    lastUser: 'pj',
    notes: '',
  },
  {
    id: '7',
    name: '493 E 169th St (Bodega)',
    address: '493 E 169th St, Bronx, NY',
    lastCollection: '18.00',
    lastVisited: daysAgo(45),
    commissionRate: 0.4,
    hasChangeMachine: false,
    changeMachineCount: 0,
    lastUser: 'alex',
    notes: 'Door code: 4589# Ring bell twice',
  },
  {
    id: '8',
    name: '2098 Amsterdam Ave (Laundromat)',
    address: '2098 Amsterdam Ave, New York, NY',
    lastCollection: '320.50',
    lastVisited: daysAgo(5),
    commissionRate: 0.5,
    hasChangeMachine: true,
    changeMachineCount: 4,
    lastUser: 'mardi',
    notes: '',
  },
];

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

function RelativeTimeBadge({ isoDate }) {
  const days = getRelativeDays(isoDate);
  if (days === null) return <span className="text-xs text-slate-400">—</span>;

  let label, bgClass;
  if (days === 0) {
    label = 'Today';
    bgClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  } else if (days === 1) {
    label = 'Yesterday';
    bgClass = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
  } else if (days <= 14) {
    label = `${days}d ago`;
    bgClass = 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300';
  } else if (days <= 30) {
    label = `${days}d ago`;
    bgClass = 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  } else {
    label = `${days}d ago`;
    bgClass = 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${bgClass}`}>
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
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${colorMap[color] || colorMap.slate}`}>
      {Icon && <Icon size={10} strokeWidth={2.5} />}
      {label}
    </span>
  );
}

function SmartCard({ loc }) {
  const noMoney = !loc.lastCollection || loc.lastCollection === '0';
  const collection = noMoney ? '$0' : `$${parseFloat(loc.lastCollection).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const commPct = `${Math.round((loc.commissionRate ?? 0.4) * 100)}%`;
  const hasCM = loc.changeMachineCount > 0 || loc.hasChangeMachine;
  const cmLabel = hasCM ? `${loc.changeMachineCount || 1}x Machine` : null;
  const days = getRelativeDays(loc.lastVisited);

  const stripe = days === null || days > 30
    ? 'border-l-red-400'
    : days <= 10
      ? 'border-l-emerald-400'
      : 'border-l-slate-300 dark:border-l-slate-600';

  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(loc.address)}&navigate=yes`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;

  return (
    <div className={`w-full rounded-2xl border border-slate-200/70 dark:border-slate-700/50 border-l-4 ${stripe} bg-white dark:bg-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)] transition-all active:scale-[0.995] cursor-pointer`}>
      <div className="px-4 pt-3.5 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 leading-snug truncate" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {loc.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <PillBadge icon={Percent} label={commPct} color="indigo" />
              <PillBadge icon={User} label={loc.lastUser || '—'} color="violet" />
              {cmLabel && <PillBadge icon={Cpu} label={cmLabel} color="emerald" />}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <span className={`text-2xl font-extrabold tabular-nums leading-none ${noMoney ? 'text-slate-300 dark:text-slate-600' : 'text-emerald-600 dark:text-emerald-400'}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
              {collection}
            </span>
            <RelativeTimeBadge isoDate={loc.lastVisited} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-2.5 pb-0.5">
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-all active:scale-90"
            title="Open in Waze"
          >
            <WazeLogo size={16} />
          </a>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800 transition-all active:scale-90"
            title="Open in Google Maps"
          >
            <GoogleMapsLogo size={16} />
          </a>
        </div>
      </div>

      {loc.notes && (
        <div className="px-3 pb-3">
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40">
            <AlertTriangle size={14} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={2.5} />
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 leading-snug">
              {loc.notes}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SmartListDemoV1() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? DEMO_LOCATIONS
    : filter === 'overdue'
      ? DEMO_LOCATIONS.filter(l => getRelativeDays(l.lastVisited) > 30)
      : filter === 'recent'
        ? DEMO_LOCATIONS.filter(l => getRelativeDays(l.lastVisited) <= 10)
        : DEMO_LOCATIONS;

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
                Big cards · Pill badges · Bottom alerts
              </p>
            </div>
            <div className="w-9 shrink-0" />
          </div>

          <div className="flex items-center gap-2 mt-2.5">
            {[
              { key: 'all', label: 'All', count: DEMO_LOCATIONS.length },
              { key: 'recent', label: 'Recent', count: DEMO_LOCATIONS.filter(l => getRelativeDays(l.lastVisited) <= 10).length },
              { key: 'overdue', label: 'Overdue 30d+', count: DEMO_LOCATIONS.filter(l => getRelativeDays(l.lastVisited) > 30).length },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
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
        <div className="max-w-[520px] mx-auto w-full px-3 py-3 space-y-2.5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {filtered.map((loc, i) => (
            <div key={loc.id} className="flex items-start gap-2">
              <span className="shrink-0 w-6 pt-4 text-center text-[11px] font-bold text-slate-300 dark:text-slate-600 tabular-nums">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <SmartCard loc={loc} />
              </div>
            </div>
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
