import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, FileDown, TrendingUp, TrendingDown,
  DollarSign, CalendarDays, MapPin, ChevronDown,
  ChevronRight, AlertTriangle, Crown, BarChart3,
  Sparkles, Download, SlidersHorizontal,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line,
} from 'recharts';
import jsPDF from 'jspdf';
import { useLocations } from './LocationsContext';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import BackButton from './BackButton';
import MenuDrawer from './MenuDrawer';

const COLORS = {
  primary: '#3b82f6',
  green: '#10b981',
  orange: '#f59e0b',
  violet: '#8b5cf6',
  gray: '#94a3b8',
  pie: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#64748b', '#14b8a6', '#a855f7'],
};

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeUser(raw) {
  if (!raw) return '';
  let s = raw.trim()
    .replace(/\s+\d+\s*$/, '')     // "eli 50" -> "eli"
    .replace(/\d+\s*\$?\s*$/i, '') // "eli50$" -> "eli"
    .replace(/[⌚️*]+/g, '')
    .trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function getAllLogs(locations) {
  const logs = [];
  for (const loc of locations) {
    for (const log of (loc.logs || [])) {
      if (!log.date) continue;
      const zone = loc.zone || loc.region || loc.city || loc.state || 'Other';
      logs.push({ ...log, user: normalizeUser(log.user), locationId: loc.id, locationName: loc.name, zone });
    }
  }
  logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return logs;
}

function getDateRange(preset, dateFrom, dateTo) {
  const now = new Date();
  const to = localISO(now);
  const presets = {
    '7d': () => localISO(new Date(now.getTime() - 7 * 86400000)),
    '30d': () => localISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)),
    '3mo': () => localISO(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())),
    '6mo': () => localISO(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())),
    'year': () => localISO(new Date(now.getFullYear(), 0, 1)),
    'all': () => '1970-01-01',
  };
  if (preset === 'custom') return { from: dateFrom, to: dateTo };
  return { from: (presets[preset] || presets['30d'])(), to };
}

function getPreviousPeriod(from, to) {
  const f = new Date(from), t = new Date(to);
  const diff = t.getTime() - f.getTime();
  const prevTo = new Date(f.getTime() - 86400000);
  const prevFrom = new Date(prevTo.getTime() - diff);
  return { from: localISO(prevFrom), to: localISO(prevTo) };
}

function autoGranularity(logs) {
  if (!logs.length) return 'monthly';
  const dates = logs.map(l => new Date(l.date).getTime()).filter(Boolean);
  const days = (Math.max(...dates) - Math.min(...dates)) / 86400000;
  if (days <= 14) return 'daily';
  if (days <= 90) return 'weekly';
  return 'monthly';
}

function groupByTime(logs, gran) {
  const groups = {};
  for (const log of logs) {
    const d = new Date(log.date);
    let key;
    if (gran === 'daily') key = log.date.slice(0, 10);
    else if (gran === 'weekly') {
      const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
      key = localISO(ws);
    } else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }
  return groups;
}

function formatLabel(key, gran) {
  if (gran === 'monthly') { const [y, m] = key.split('-'); return `${m}/${y.slice(2)}`; }
  const d = new Date(key);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ReportsView() {
  const navigate = useNavigate();
  const { locations } = useLocations();
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [period, setPeriod] = useState('30d');
  const [dateFrom, setDateFrom] = useState(() => localISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [dateTo, setDateTo] = useState(() => localISO(new Date()));
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [showDeclining, setShowDeclining] = useState(false);
  const [activeChart, setActiveChart] = useState('trend');
  const [granOverride, setGranOverride] = useState('auto');
  const [showFilters, setShowFilters] = useState(false);

  const allLogs = useMemo(() => getAllLogs(locations), [locations]);
  const range = useMemo(() => getDateRange(period, dateFrom, dateTo), [period, dateFrom, dateTo]);
  const prevRange = useMemo(() => getPreviousPeriod(range.from, range.to), [range]);

  const zones = useMemo(() => {
    const set = new Set();
    for (const log of allLogs) { const z = log.zone; if (z && z !== 'Other') set.add(z); }
    return Array.from(set).sort();
  }, [allLogs]);

  const collectors = useMemo(() => {
    const set = new Set();
    for (const log of allLogs) { const u = log.user; if (u) set.add(u); }
    return Array.from(set).sort();
  }, [allLogs]);

  const currentLogs = useMemo(() => {
    return allLogs.filter(log => {
      const d = (log.date || '').slice(0, 10);
      if (d < range.from || d > range.to) return false;
      if (selectedZone !== 'all' && log.zone !== selectedZone) return false;
      if (selectedCollector !== 'all' && log.user !== selectedCollector) return false;
      return true;
    });
  }, [allLogs, range, selectedZone, selectedCollector]);

  const previousLogs = useMemo(() => {
    return allLogs.filter(log => {
      const d = (log.date || '').slice(0, 10);
      if (d < prevRange.from || d > prevRange.to) return false;
      if (selectedZone !== 'all' && log.zone !== selectedZone) return false;
      if (selectedCollector !== 'all' && log.user !== selectedCollector) return false;
      return true;
    });
  }, [allLogs, prevRange, selectedZone, selectedCollector]);

  const granularity = useMemo(() => {
    if (granOverride !== 'auto') return granOverride;
    return autoGranularity(currentLogs);
  }, [currentLogs, granOverride]);

  const summary = useMemo(() => {
    let total = 0, half = 0, custCut = 0;
    const custSet = new Set();
    for (const log of currentLogs) {
      const c = parseFloat(log.collection) || 0;
      const r = parseFloat(log.commissionRate) || 0.4;
      total += c; half += c * (1 - r); custCut += c * r;
      custSet.add(log.locationId);
    }
    let prevTotal = 0, prevHalf = 0;
    for (const log of previousLogs) {
      const c = parseFloat(log.collection) || 0;
      const r = parseFloat(log.commissionRate) || 0.4;
      prevTotal += c; prevHalf += c * (1 - r);
    }
    const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal * 100) : 0;
    const halfChange = prevHalf > 0 ? ((half - prevHalf) / prevHalf * 100) : 0;
    const visitsChange = previousLogs.length > 0 ? ((currentLogs.length - previousLogs.length) / previousLogs.length * 100) : 0;
    return { total, half, custCut, visits: currentLogs.length, customers: custSet.size, change, prevTotal, halfChange, visitsChange };
  }, [currentLogs, previousLogs]);

  const sparkData = useMemo(() => {
    const groups = groupByTime(currentLogs, granularity);
    const keys = Object.keys(groups).sort();
    const points = keys.map(key => {
      let rev = 0, myShare = 0, vis = 0, custs = new Set();
      for (const log of groups[key]) {
        const c = parseFloat(log.collection) || 0;
        const r = parseFloat(log.commissionRate) || 0.4;
        rev += c; myShare += c * (1 - r); vis++;
        custs.add(log.locationId);
      }
      return { rev: +rev.toFixed(2), share: +myShare.toFixed(2), vis, custs: custs.size };
    });
    const last = points.slice(-8);
    return {
      total: last.map(p => ({ v: p.rev })),
      half: last.map(p => ({ v: p.share })),
      visits: last.map(p => ({ v: p.vis })),
      customers: last.map(p => ({ v: p.custs })),
    };
  }, [currentLogs, granularity]);

  const trendData = useMemo(() => {
    const curGroups = groupByTime(currentLogs, granularity);
    const prevGroups = groupByTime(previousLogs, granularity);
    const curKeys = Object.keys(curGroups).sort();
    const prevKeys = Object.keys(prevGroups).sort();
    const maxLen = Math.max(curKeys.length, prevKeys.length);
    const data = [];
    for (let i = 0; i < maxLen; i++) {
      const cKey = curKeys[i], pKey = prevKeys[i];
      let rev = 0, myShare = 0, prevRev = 0;
      for (const log of (cKey ? curGroups[cKey] : [])) {
        const c = parseFloat(log.collection) || 0;
        const r = parseFloat(log.commissionRate) || 0.4;
        rev += c; myShare += c * (1 - r);
      }
      for (const log of (pKey ? prevGroups[pKey] : [])) {
        prevRev += parseFloat(log.collection) || 0;
      }
      data.push({
        label: cKey ? formatLabel(cKey, granularity) : (pKey ? formatLabel(pKey, granularity) : ''),
        revenue: +rev.toFixed(2),
        myShare: +myShare.toFixed(2),
        prevRevenue: +prevRev.toFixed(2),
      });
    }
    return data;
  }, [currentLogs, previousLogs, granularity]);

  const topCustomers = useMemo(() => {
    const map = {};
    for (const log of currentLogs) {
      if (!map[log.locationId]) map[log.locationId] = { id: log.locationId, name: log.locationName, total: 0, visits: 0, zone: log.zone };
      map[log.locationId].total += parseFloat(log.collection) || 0;
      map[log.locationId].visits++;
    }
    const arr = Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
    const maxVal = arr[0]?.total || 1;
    return arr.map(c => ({ ...c, total: +c.total.toFixed(2), pct: (c.total / maxVal) * 100 }));
  }, [currentLogs]);

  const pieData = useMemo(() => {
    const map = {};
    for (const log of currentLogs) {
      const z = log.zone || 'Other';
      map[z] = (map[z] || 0) + (parseFloat(log.collection) || 0);
    }
    const arr = Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(2) })).sort((a, b) => b.value - a.value);
    const tot = arr.reduce((s, x) => s + x.value, 0) || 1;
    return arr.map(x => ({ ...x, pct: ((x.value / tot) * 100).toFixed(1) }));
  }, [currentLogs]);

  const declining = useMemo(() => {
    const visited = new Set(currentLogs.map(l => l.locationId));
    return locations.filter(loc => loc.logs?.length > 0 && !visited.has(loc.id)).map(loc => ({
      id: loc.id, name: loc.name, lastVisit: loc.lastVisited, zone: loc.zone || loc.region || loc.city || '',
    }));
  }, [locations, currentLogs]);

  const insights = useMemo(() => {
    if (currentLogs.length === 0) return null;
    const lines = [];
    if (summary.prevTotal > 0) {
      const dir = summary.change >= 0 ? 'up' : 'down';
      lines.push(`Revenue is ${dir} ${Math.abs(summary.change).toFixed(1)}% vs previous period.`);
    }
    if (pieData.length > 0) {
      lines.push(`Top zone: ${pieData[0].name} (${pieData[0].pct}%).`);
    }
    if (topCustomers.length > 0) {
      lines.push(`Top earner: ${topCustomers[0].name} (${topCustomers[0].total.toFixed(1)}).`);
    }
    if (declining.length > 0) {
      lines.push(`${declining.length} location${declining.length > 1 ? 's' : ''} with no visits.`);
    }
    return lines.length > 0 ? lines : null;
  }, [currentLogs, summary, pieData, topCustomers, declining]);

  const handleExportPdf = useCallback(() => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    let y = 20;
    pdf.setFontSize(18);
    pdf.text(t('summaryReport'), pw / 2, y, { align: 'center' });
    y += 8;
    pdf.setFontSize(10);
    pdf.text(`${t('generatedOn')}: ${new Date().toLocaleDateString()}`, pw / 2, y, { align: 'center' });
    y += 6;
    pdf.text(`${t('period')}: ${range.from} - ${range.to}`, pw / 2, y, { align: 'center' });
    y += 14;
    pdf.setFontSize(12);
    [`${t('totalWeight')}: ${summary.total.toFixed(2)}`, `${t('halfWeight')}: ${summary.half.toFixed(2)}`,
     `${t('customerCut')}: ${summary.custCut.toFixed(2)}`, `${t('totalVisits')}: ${summary.visits}`,
     `${t('totalCustomers')}: ${summary.customers}`, `Change: ${summary.change >= 0 ? '+' : ''}${summary.change.toFixed(1)}%`,
    ].forEach(line => { pdf.text(line, 20, y); y += 8; });
    y += 10;
    pdf.setFontSize(14);
    pdf.text(t('topCustomers'), 20, y); y += 8;
    pdf.setFontSize(10);
    topCustomers.forEach((c, i) => {
      if (y > 270) { pdf.addPage(); y = 20; }
      pdf.text(`${i + 1}. ${c.name} — ${c.total.toFixed(2)}`, 25, y); y += 6;
    });
    if (declining.length > 0) {
      y += 10; if (y > 250) { pdf.addPage(); y = 20; }
      pdf.setFontSize(14);
      pdf.text(t('decliningCustomers'), 20, y); y += 8;
      pdf.setFontSize(10);
      declining.forEach(c => { if (y > 270) { pdf.addPage(); y = 20; } pdf.text(`• ${c.name} (${c.zone})`, 25, y); y += 6; });
    }
    pdf.save(`report_${range.from}_${range.to}.pdf`);
  }, [t, range, summary, topCustomers, declining]);

  const handleExportCsv = useCallback(() => {
    const header = ['Date', 'Location', 'Zone', 'Collection', 'Commission Rate', 'Half Weight', 'Customer Cut', 'User'];
    const rows = currentLogs.map(log => {
      const c = parseFloat(log.collection) || 0;
      const r = parseFloat(log.commissionRate) || 0.4;
      return [
        (log.date || '').slice(0, 10),
        `"${(log.locationName || '').replace(/"/g, '""')}"`,
        `"${(log.zone || '').replace(/"/g, '""')}"`,
        c.toFixed(2), (r * 100).toFixed(0) + '%',
        (c * (1 - r)).toFixed(2), (c * r).toFixed(2),
        log.user || '',
      ].join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report_${range.from}_${range.to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [currentLogs, range]);

  const hasActiveFilters = selectedZone !== 'all' || selectedCollector !== 'all';
  const activeFilterCount = (selectedZone !== 'all' ? 1 : 0) + (selectedCollector !== 'all' ? 1 : 0);

  const selClass = 'py-1.5 px-2 text-[12px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/30';

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-xl border border-slate-200/80 dark:border-slate-600/80">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        {payload.map((e, i) => (
          <p key={i} className="text-[12px] font-bold" style={{ color: e.color }}>{e.name}: {e.value?.toFixed(2)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/80 dark:bg-slate-950 overflow-hidden">
      <header className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-[520px] mx-auto w-full px-4 py-3 flex items-center justify-between">
          <BackButton onClick={() => navigate(-1)} />
          <h1 className="text-[17px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight">{t('reportsTitle')}</h1>
          <button onClick={() => setMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">
            <Menu size={20} strokeWidth={1.8} />
          </button>
        </div>
      </header>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[520px] mx-auto w-full px-4 pt-3 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-3">

          {/* Period Tabs */}
          <div className="flex gap-0.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            {[
              { key: '7d', label: '7D' }, { key: '30d', label: '30D' }, { key: '3mo', label: '3M' },
              { key: '6mo', label: '6M' }, { key: 'year', label: '1Y' }, { key: 'all', label: t('allTime') },
            ].map(tab => (
              <button key={tab.key} onClick={() => setPeriod(tab.key)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  period === tab.key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date + Filters Toggle Row */}
          <div className="flex items-center gap-2">
            {period === 'custom' && (
              <div className="flex gap-2 flex-1">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 py-1.5 px-2 text-[12px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="flex-1 py-1.5 px-2 text-[12px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white" />
              </div>
            )}
            {(zones.length > 0 || collectors.length > 1) && (
              <button onClick={() => setShowFilters(!showFilters)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  showFilters || hasActiveFilters
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                } ${period !== 'custom' ? 'ml-auto' : ''}`}>
                <SlidersHorizontal size={13} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white/20 text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
            )}
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800/60 flex flex-wrap gap-2 items-end">
              {zones.length > 0 && (
                <label className="flex-1 min-w-[120px]">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1 block">{t('byZone')}</span>
                  <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className={selClass + ' w-full'}>
                    <option value="all">{t('overall')}</option>
                    {zones.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </label>
              )}
              {collectors.length > 1 && (
                <label className="flex-1 min-w-[120px]">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1 block">{t('collector')}</span>
                  <select value={selectedCollector} onChange={e => setSelectedCollector(e.target.value)} className={selClass + ' w-full'}>
                    <option value="all">{t('allCollectors')}</option>
                    {collectors.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
              )}
              {hasActiveFilters && (
                <button onClick={() => { setSelectedZone('all'); setSelectedCollector('all'); }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold py-1.5 px-2 hover:underline">
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <SummaryCard icon={DollarSign} label={t('totalWeight')} value={summary.total.toFixed(1)}
              dollar={summary.total * 20} color="blue" change={summary.change} sparkData={sparkData.total} />
            <SummaryCard icon={TrendingUp} label={t('halfWeight')} value={summary.half.toFixed(1)}
              dollar={summary.half * 20} color="green" change={summary.halfChange} sparkData={sparkData.half} />
            <SummaryCard icon={CalendarDays} label={t('totalVisits')} value={summary.visits}
              color="orange" change={summary.visitsChange} sparkData={sparkData.visits} />
            <SummaryCard icon={MapPin} label={t('totalCustomers')} value={summary.customers}
              color="violet" sparkData={sparkData.customers} />
          </div>

          {/* Insights */}
          {insights && (
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl px-3.5 py-3 border border-blue-200/30 dark:border-blue-800/20">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {insights.join(' ')}
                </p>
              </div>
            </div>
          )}

          {/* Chart Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Chart Header */}
            <div className="px-3.5 pt-3 pb-2 flex items-center gap-2">
              <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg flex-1">
                {[
                  { key: 'trend', label: t('incomeOverTime') },
                  { key: 'zones', label: t('distributionByZone') },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveChart(tab.key)}
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                      activeChart === tab.key
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              {activeChart === 'trend' && (
                <select value={granOverride} onChange={e => setGranOverride(e.target.value)}
                  className="py-1 px-1.5 text-[10px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <option value="auto">Auto</option>
                  <option value="daily">{t('daily')}</option>
                  <option value="weekly">{t('weekly')}</option>
                  <option value="monthly">{t('monthly')}</option>
                </select>
              )}
            </div>

            {/* Trend Chart */}
            {activeChart === 'trend' && (
              <div className="px-2 pb-3">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradShare" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.green} stopOpacity={0.15} />
                          <stop offset="100%" stopColor={COLORS.green} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" name={t('totalWeight')} stroke={COLORS.primary} strokeWidth={2.5} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                      <Area type="monotone" dataKey="myShare" name={t('halfWeight')} stroke={COLORS.green} strokeWidth={2} fill="url(#gradShare)" dot={false} activeDot={{ r: 3, strokeWidth: 2, fill: '#fff' }} />
                      <Line type="monotone" dataKey="prevRevenue" name={t('previousPeriod')} stroke={COLORS.gray} strokeWidth={1.5} strokeDasharray="6 3" dot={false} activeDot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyState message={t('noDataAvailable')} />}
              </div>
            )}

            {/* Pie Chart */}
            {activeChart === 'zones' && (
              <div className="px-3.5 pb-3">
                {pieData.length > 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2} stroke="none"
                          onClick={(_, idx) => {
                            const zone = pieData[idx]?.name;
                            if (zone && zone !== 'Other') navigate(`/customers/area/${encodeURIComponent(zone)}`);
                          }}
                          className="cursor-pointer">
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS.pie[i % COLORS.pie.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-1">
                      {pieData.map((entry, i) => (
                        <button key={entry.name} onClick={() => entry.name !== 'Other' && navigate(`/customers/area/${encodeURIComponent(entry.name)}`)}
                          className="w-full flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-1 py-0.5 -mx-1 transition-colors">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS.pie[i % COLORS.pie.length] }} />
                          <span className="flex-1 text-[11px] text-slate-700 dark:text-slate-300 truncate text-left">{entry.name}</span>
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 tabular-nums">{entry.value.toFixed(1)}</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 w-9 text-right tabular-nums">{entry.pct}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : <EmptyState message={t('noDataAvailable')} />}
              </div>
            )}
          </div>

          {/* Top Customers */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-3.5 pt-3 pb-1.5 flex items-center gap-2">
              <Crown size={15} className="text-amber-500" />
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{t('topCustomers')}</h3>
            </div>
            {topCustomers.length > 0 ? (
              <div className="px-3.5 pb-3 space-y-2">
                {topCustomers.map((c, i) => (
                  <button key={c.id} onClick={() => navigate(`/customer/${c.id}`)}
                    className="w-full flex items-center gap-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg p-1 -mx-1 transition-colors">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      i === 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                      i === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' :
                      i === 2 ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                        <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 tabular-nums shrink-0 ml-2">{c.total.toFixed(1)}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: i < 3 ? COLORS.primary : '#94a3b8' }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : <EmptyState message={t('noDataAvailable')} />}
          </div>

          {/* Declining Customers */}
          {declining.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <button onClick={() => setShowDeclining(!showDeclining)}
                className="w-full px-3.5 py-3 flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-500 shrink-0" />
                <span className="flex-1 text-left text-[13px] font-bold text-slate-800 dark:text-slate-100">{t('decliningCustomers')}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold">{declining.length}</span>
                {showDeclining ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
              </button>
              {showDeclining && (
                <div className="px-3.5 pb-2.5 space-y-1 max-h-[240px] overflow-y-auto">
                  {declining.map(c => (
                    <button key={c.id} onClick={() => navigate(`/customer/${c.id}`)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-100/40 dark:border-red-900/20 hover:bg-red-100/50 dark:hover:bg-red-950/40 transition-colors text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                        {c.zone && <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">{c.zone}</p>}
                      </div>
                      <span className="text-[9px] text-red-600 dark:text-red-400 font-semibold shrink-0 ml-2">{t('noVisitsInPeriod')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Export */}
          {isAdmin && (
            <div className="flex gap-2.5">
              <button onClick={handleExportPdf}
                className="flex-1 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-[12px] shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all">
                <FileDown size={15} /> {t('exportPdf')}
              </button>
              <button onClick={handleExportCsv}
                className="flex-1 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-semibold text-[12px] border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all">
                <Download size={15} /> {t('exportCsv')}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const SPARK_COLORS = { blue: '#3b82f6', green: '#10b981', orange: '#f59e0b', violet: '#8b5cf6' };
const colorMap = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', iconBg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-600 dark:text-blue-400', dollar: 'text-blue-700 dark:text-blue-300' },
  green: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400', dollar: 'text-emerald-700 dark:text-emerald-300' },
  orange: { bg: 'bg-amber-50 dark:bg-amber-950/30', iconBg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400', dollar: 'text-amber-700 dark:text-amber-300' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', iconBg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-600 dark:text-violet-400', dollar: 'text-violet-700 dark:text-violet-300' },
};

function SummaryCard({ icon: Icon, label, value, dollar, color, change, sparkData }) {
  const c = colorMap[color];
  const sparkColor = SPARK_COLORS[color];
  return (
    <div className={`${c.bg} p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 relative overflow-hidden`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className={`w-7 h-7 rounded-lg ${c.iconBg} flex items-center justify-center`}>
          <Icon size={14} className={c.text} />
        </div>
        {change !== undefined && change !== 0 && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            change >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
          }`}>
            {change >= 0 ? '+' : ''}{change.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${c.text} tabular-nums leading-tight`}>{value}</p>
      {dollar !== undefined && (
        <p className={`text-[11px] font-bold ${c.dollar} tabular-nums`}>${Math.round(dollar).toLocaleString()}</p>
      )}
      {sparkData && sparkData.length > 1 && (
        <div className="absolute bottom-0 right-0 w-[50%] h-[35px] opacity-30">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5} fill={`url(#spark-${color})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="h-[140px] flex flex-col items-center justify-center">
      <BarChart3 size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
      <p className="text-[11px] text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  );
}
