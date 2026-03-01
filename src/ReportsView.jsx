import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  FileDown,
  TrendingUp,
  TrendingDown,
  Users,
  Weight,
  Eye,
  Search,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import jsPDF from 'jspdf';
import { useLocations } from './LocationsContext';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import BackButton from './BackButton';
import MenuDrawer from './MenuDrawer';

const ZONES = ['Staten Island', 'Brooklyn', 'Bronx', 'New Jersey'];

const COLORS = {
  totalWeight: '#2563eb',
  halfWeight: '#16a34a',
  customerCut: '#ea580c',
  pie: ['#2563eb', '#16a34a', '#ea580c', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#64748b'],
  previousPeriod: '#94a3b8',
};

function getAllLogs(locations) {
  const logs = [];
  for (const loc of locations) {
    for (const log of (loc.logs || [])) {
      if (!log.date) continue;
      const zone = loc.zone || loc.region || loc.city || loc.state || 'Other';
      logs.push({ ...log, locationId: loc.id, locationName: loc.name, zone });
    }
  }
  logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return logs;
}

function getDateRangeForPreset(preset) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let from;
  if (preset === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  } else if (preset === '3mo') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    from = d.toISOString().slice(0, 10);
  } else if (preset === '6mo') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 6);
    from = d.toISOString().slice(0, 10);
  } else if (preset === 'year') {
    from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  } else {
    from = '1970-01-01';
  }
  return { from, to };
}

function getPreviousPeriod(from, to) {
  const f = new Date(from);
  const t = new Date(to);
  const diff = t.getTime() - f.getTime();
  const prevTo = new Date(f.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - diff);
  return {
    from: prevFrom.toISOString().slice(0, 10),
    to: prevTo.toISOString().slice(0, 10),
  };
}

function groupByTime(logs, granularity) {
  const groups = {};
  for (const log of logs) {
    let key;
    const d = new Date(log.date);
    if (granularity === 'daily') {
      key = log.date.slice(0, 10);
    } else if (granularity === 'weekly') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }
  return groups;
}

function formatDateLabel(key, granularity) {
  if (granularity === 'monthly') {
    const [y, m] = key.split('-');
    return `${m}/${y.slice(2)}`;
  }
  const d = new Date(key);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getGranularityFromLogs(logs) {
  if (!logs.length) return 'monthly';
  const dates = logs.map(l => l.date).filter(Boolean);
  if (!dates.length) return 'monthly';
  const min = Math.min(...dates.map(d => new Date(d).getTime()));
  const max = Math.max(...dates.map(d => new Date(d).getTime()));
  const days = (max - min) / (24 * 60 * 60 * 1000);
  if (days <= 14) return 'daily';
  if (days <= 90) return 'weekly';
  return 'monthly';
}

export default function ReportsView() {
  const navigate = useNavigate();
  const { locations } = useLocations();
  const { t, isRtl } = useLanguage();
  const { isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterMode, setFilterMode] = useState('visits'); // 'visits' | 'date'
  const [visitsPreset, setVisitsPreset] = useState(5); // 2 | 5 | 8 | 'custom'
  const [visitsCustom, setVisitsCustom] = useState(10);
  const [datePreset, setDatePreset] = useState('month'); // 'month'|'3mo'|'6mo'|'year'|'all'|'custom'
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterBy, setFilterBy] = useState('zone'); // 'zone' | 'location'
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const [top10Scope, setTop10Scope] = useState('overall');
  const [top10Zone, setTop10Zone] = useState('');
  const [distScope, setDistScope] = useState('overall');
  const [distZone, setDistZone] = useState('');

  const allLogs = useMemo(() => getAllLogs(locations), [locations]);

  const currentLogs = useMemo(() => {
    if (filterMode === 'visits') {
      const n = visitsPreset === 'custom' ? Math.max(1, parseInt(visitsCustom, 10) || 1) : visitsPreset;
      const countByLoc = {};
      return allLogs.filter(log => {
        const id = log.locationId;
        countByLoc[id] = (countByLoc[id] || 0) + 1;
        return countByLoc[id] <= n;
      });
    }
    const range = datePreset === 'custom' ? { from: dateFrom, to: dateTo } : getDateRangeForPreset(datePreset);
    return allLogs.filter(log => {
      const d = (log.date || '').slice(0, 10);
      return d >= range.from && d <= range.to;
    });
  }, [filterMode, visitsPreset, visitsCustom, datePreset, dateFrom, dateTo, allLogs]);

  const { from: effFrom, to: effTo } = useMemo(() => {
    if (filterMode === 'date' && datePreset !== 'custom') return getDateRangeForPreset(datePreset);
    return { from: dateFrom, to: dateTo };
  }, [filterMode, datePreset, dateFrom, dateTo]);

  const prevPeriod = useMemo(() => getPreviousPeriod(effFrom, effTo), [effFrom, effTo]);
  const previousLogs = useMemo(() => {
    if (filterMode === 'visits') {
      const n = visitsPreset === 'custom' ? Math.max(1, parseInt(visitsCustom, 10) || 1) : visitsPreset;
      const countByLoc = {};
      return allLogs.filter(log => {
        const id = log.locationId;
        countByLoc[id] = (countByLoc[id] || 0) + 1;
        return countByLoc[id] > n && countByLoc[id] <= n * 2;
      });
    }
    return allLogs.filter(log => {
      const d = (log.date || '').slice(0, 10);
      return d >= prevPeriod.from && d <= prevPeriod.to;
    });
  }, [filterMode, visitsPreset, visitsCustom, allLogs, prevPeriod.from, prevPeriod.to]);

  const granularity = useMemo(() => getGranularityFromLogs(currentLogs), [currentLogs]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return currentLogs;
    const q = searchQuery.trim().toLowerCase();
    return currentLogs.filter(log => {
      const val = filterBy === 'zone' ? (log.zone || '').toLowerCase() : (log.locationName || '').toLowerCase();
      return val.includes(q);
    });
  }, [currentLogs, searchQuery, filterBy]);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const zoneLocations = {}; // zone -> Set of locationIds (count of unique locations)
    const locVisits = {};     // locationId -> { name, visitCount }
    for (const log of currentLogs) {
      const z = log.zone || 'Other';
      if (!zoneLocations[z]) zoneLocations[z] = new Set();
      zoneLocations[z].add(log.locationId);
      const id = log.locationId;
      if (!locVisits[id]) locVisits[id] = { name: log.locationName || '', visits: 0 };
      locVisits[id].visits += 1;
    }
    const items = [];
    if (filterBy === 'zone') {
      for (const [name, locSet] of Object.entries(zoneLocations)) {
        if (!name || name === 'Other') continue;
        const lower = name.toLowerCase();
        if (lower.includes(q)) items.push({ type: 'zone', name, count: locSet.size });
      }
    } else {
      for (const { name, visits } of Object.values(locVisits)) {
        if (!name) continue;
        const lower = name.toLowerCase();
        if (lower.includes(q)) items.push({ type: 'location', name, count: visits });
      }
    }
    items.sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aStart = aLower.startsWith(q) ? 1 : 0;
      const bStart = bLower.startsWith(q) ? 1 : 0;
      if (bStart !== aStart) return bStart - aStart;
      return (b.count || 0) - (a.count || 0);
    });
    return items.slice(0, 8);
  }, [currentLogs, searchQuery, filterBy]);

  const zonesList = useMemo(() => {
    const set = new Set(ZONES);
    for (const log of currentLogs) {
      const z = log.zone || 'Other';
      if (z && z !== 'Other') set.add(z);
    }
    return Array.from(set).sort();
  }, [currentLogs]);

  const summaryData = useMemo(() => {
    let totalW = 0, halfW = 0, custCut = 0, visitCount = filteredLogs.length;
    const customerSet = new Set();
    for (const log of filteredLogs) {
      const coll = parseFloat(log.collection) || 0;
      const rate = parseFloat(log.commissionRate) || 0;
      totalW += coll;
      halfW += coll * (1 - rate);
      custCut += coll * rate;
      customerSet.add(log.locationId);
    }
    let prevTotalW = 0;
    for (const log of previousLogs) {
      prevTotalW += parseFloat(log.collection) || 0;
    }
    const changePct = prevTotalW > 0 ? ((totalW - prevTotalW) / prevTotalW * 100) : 0;
    return { totalW, halfW, custCut, visitCount, customerCount: customerSet.size, changePct, prevTotalW };
  }, [filteredLogs, previousLogs]);

  const lineChartData = useMemo(() => {
    const currentGroups = groupByTime(filteredLogs, granularity);
    const prevGroups = groupByTime(previousLogs, granularity);
    const allKeys = [...new Set([...Object.keys(currentGroups), ...Object.keys(prevGroups)])].sort();
    
    const currentKeys = Object.keys(currentGroups).sort();
    const prevKeys = Object.keys(prevGroups).sort();
    const maxLen = Math.max(currentKeys.length, prevKeys.length);
    
    const data = [];
    for (let i = 0; i < maxLen; i++) {
      const cKey = currentKeys[i];
      const pKey = prevKeys[i];
      const cLogs = cKey ? currentGroups[cKey] : [];
      const pLogs = pKey ? prevGroups[pKey] : [];
      
      let tw = 0, hw = 0, cc = 0, prevTw = 0;
      for (const log of (cLogs || [])) {
        const coll = parseFloat(log.collection) || 0;
        const rate = parseFloat(log.commissionRate) || 0;
        tw += coll; hw += coll * (1 - rate); cc += coll * rate;
      }
      for (const log of (pLogs || [])) {
        prevTw += parseFloat(log.collection) || 0;
      }
      
      data.push({
        label: cKey ? formatDateLabel(cKey, granularity) : formatDateLabel(pKey, granularity),
        totalWeight: +tw.toFixed(2),
        halfWeight: +hw.toFixed(2),
        customerCut: +cc.toFixed(2),
        prevTotalWeight: +prevTw.toFixed(2),
      });
    }
    return data;
  }, [filteredLogs, previousLogs, granularity]);

  const topCustomersData = useMemo(() => {
    let logs = filteredLogs;
    if (top10Scope === 'byZone' && top10Zone) {
      logs = filteredLogs.filter(log => (log.zone || 'Other') === top10Zone);
    }
    const map = {};
    for (const log of logs) {
      if (!map[log.locationId]) map[log.locationId] = { name: log.locationName, totalWeight: 0 };
      map[log.locationId].totalWeight += parseFloat(log.collection) || 0;
    }
    return Object.values(map)
      .sort((a, b) => b.totalWeight - a.totalWeight)
      .slice(0, 10)
      .map(c => ({ ...c, totalWeight: +c.totalWeight.toFixed(2) }));
  }, [filteredLogs, top10Scope, top10Zone]);

  const pieData = useMemo(() => {
    let logs = filteredLogs;
    if (distScope === 'byZone' && distZone) {
      logs = filteredLogs.filter(log => (log.zone || 'Other') === distZone);
    }
    const map = {};
    for (const log of logs) {
      const key = filterBy === 'zone' ? (log.zone || 'Other') : (log.locationName || 'Other');
      if (!map[key]) map[key] = 0;
      map[key] += parseFloat(log.collection) || 0;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredLogs, filterBy, distScope, distZone]);

  const decliningCustomers = useMemo(() => {
    const currentVisited = new Set(currentLogs.map(l => l.locationId));
    return locations.filter(loc => {
      if (!loc.logs || loc.logs.length === 0) return false;
      return !currentVisited.has(loc.id);
    }).map(loc => ({
      id: loc.id,
      name: loc.name,
      lastVisit: loc.lastVisited,
      zone: loc.state || loc.city || '',
    }));
  }, [locations, currentLogs]);

  const handleExportPdf = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 20;

    pdf.setFontSize(18);
    pdf.text(t('summaryReport'), pageWidth / 2, y, { align: 'center' });
    y += 10;

    pdf.setFontSize(10);
    pdf.text(`${t('generatedOn')}: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
    const periodLabel = filterMode === 'visits'
      ? `Last ${visitsPreset === 'custom' ? visitsCustom : visitsPreset} visits`
      : `${datePreset === 'custom' ? `${dateFrom} - ${dateTo}` : datePreset}`;
    pdf.text(`${t('period')}: ${periodLabel}`, pageWidth / 2, y, { align: 'center' });
    y += 14;

    pdf.setFontSize(12);
    const summaryLines = [
      `${t('totalWeight')}: ${summaryData.totalW.toFixed(2)}`,
      `${t('halfWeight')}: ${summaryData.halfW.toFixed(2)}`,
      `${t('customerCut')}: ${summaryData.custCut.toFixed(2)}`,
      `${t('totalVisits')}: ${summaryData.visitCount}`,
      `${t('totalCustomers')}: ${summaryData.customerCount}`,
      `${t('change')}: ${summaryData.changePct >= 0 ? '+' : ''}${summaryData.changePct.toFixed(1)}%`,
    ];
    for (const line of summaryLines) {
      pdf.text(line, 20, y);
      y += 8;
    }

    y += 10;
    pdf.setFontSize(14);
    pdf.text(t('topCustomers'), 20, y);
    y += 8;
    pdf.setFontSize(10);
    topCustomersData.forEach((c, i) => {
      if (y > 270) { pdf.addPage(); y = 20; }
      pdf.text(`${i + 1}. ${c.name} — ${c.totalWeight.toFixed(2)}`, 25, y);
      y += 6;
    });

    if (decliningCustomers.length > 0) {
      y += 10;
      if (y > 250) { pdf.addPage(); y = 20; }
      pdf.setFontSize(14);
      pdf.text(t('decliningCustomers'), 20, y);
      y += 8;
      pdf.setFontSize(10);
      decliningCustomers.forEach((c) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.text(`• ${c.name} (${c.zone})`, 25, y);
        y += 6;
      });
    }

    const fileLabel = filterMode === 'visits' ? `last${visitsPreset === 'custom' ? visitsCustom : visitsPreset}visits` : `${dateFrom}_${dateTo}`;
    pdf.save(`report_${fileLabel}.pdf`);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 text-xs">
        <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {entry.value?.toFixed(2)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <header className="shrink-0 bg-white dark:bg-slate-800 p-3 pt-4 min-h-[50px] shadow-sm flex items-center justify-between gap-2 z-10" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}>
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="flex-1 text-center font-bold text-base text-slate-800 dark:text-white">
          {t('reportsTitle')}
        </h1>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-95 shrink-0"
        >
          <Menu size={22} />
        </button>
      </header>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 overflow-y-auto p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-4 max-w-[420px] mx-auto w-full">

        {/* Zone/Location first, then Filter */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-2.5">
          {/* 1. Zone/Location */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5 block">{filterBy === 'zone' ? t('byZone') : t('byLocation')}</label>
            <div className="flex gap-1 items-center">
              {['zone', 'location'].map(f => (
                <button key={f} onClick={() => setFilterBy(f)}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${filterBy === f ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                >{f === 'zone' ? t('byZone') : t('byLocation')}</button>
              ))}
              <div className="relative flex-1 min-w-0" ref={suggestionsRef}>
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => searchQuery.trim() && setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder={filterBy === 'zone' ? t('reportSearchZone') : t('reportSearchLocation')}
                  className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white placeholder:text-slate-400"
                />
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-0.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-lg z-50 max-h-[160px] overflow-y-auto">
                    {searchSuggestions.map((s, i) => (
                      <button key={`${s.type}-${s.name}-${i}`} type="button" onMouseDown={(e) => { e.preventDefault(); setSearchQuery(s.name); setShowSuggestions(false); }}
                        className="w-full px-2.5 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between gap-2 text-slate-700 dark:text-slate-200">
                        <span className="truncate">{s.name}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">{s.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* 2. Filter - compact row */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5 block">{t('filterByLabel')}</label>
            <div className="flex gap-1 items-center flex-wrap">
              <select value={filterMode} onChange={e => setFilterMode(e.target.value)}
                className="py-1 px-2 text-xs rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
              >
                <option value="visits">{t('byVisits')}</option>
                <option value="date">{t('byDate')}</option>
              </select>
          {filterMode === 'visits' && (
            <>
              {[2, 5, 8].map(n => (
                  <button
                    key={n}
                    onClick={() => setVisitsPreset(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      visitsPreset === n
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >{n}</button>
                ))}
              <button
                  onClick={() => setVisitsPreset('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    visitsPreset === 'custom'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >{t('custom')}</button>
              {visitsPreset === 'custom' && (
                <span className="flex items-center gap-0.5">
                  <input type="number" min={1} max={500} value={visitsCustom}
                    onChange={e => setVisitsCustom(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-11 py-0.5 px-1 text-[10px] rounded border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-500">{t('visitsCount')}</span>
                </span>
              )}
            </>
          )}
          {filterMode === 'date' && (
            <>
              {[
                { v: 'month', l: t('presetMonth') },
                { v: '3mo', l: '3mo' },
                { v: '6mo', l: '6mo' },
                { v: 'year', l: t('year') },
                { v: 'all', l: t('allTime') },
                { v: 'custom', l: t('custom') },
              ].map(({ v, l }) => (
                <button key={v} onClick={() => setDatePreset(v)}
                  className={`py-1 px-1.5 rounded text-[10px] font-bold ${datePreset === v ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                >{l}</button>
              ))}
              {datePreset === 'custom' && (
                <span className="flex gap-1">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="py-0.5 px-1 text-[10px] rounded border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="py-0.5 px-1 text-[10px] rounded border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 dark:text-white"
                  />
                </span>
              )}
            </>
          )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <SummaryCard icon={Weight} label={t('totalWeight')} value={summaryData.totalW.toFixed(2)} subValue={`$${(summaryData.totalW * 20).toFixed(0)}`} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/40" />
          <SummaryCard icon={TrendingUp} label={t('halfWeight')} value={summaryData.halfW.toFixed(2)} subValue={`$${(summaryData.halfW * 20).toFixed(0)}`} color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-950/40" />
          <SummaryCard icon={Eye} label={t('totalVisits')} value={summaryData.visitCount} color="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-950/40" />
          <SummaryCard icon={Users} label={t('totalCustomers')} value={summaryData.customerCount} color="text-violet-600 dark:text-violet-400" bg="bg-violet-50 dark:bg-violet-950/40" />
        </div>

        {/* Period Comparison Banner */}
        <div className={`flex items-center justify-between p-3 rounded-xl border ${
          summaryData.changePct >= 0
            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {summaryData.changePct >= 0 ? (
              <TrendingUp size={18} className="text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
            )}
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('periodComparison')}</span>
          </div>
          <span className={`text-sm font-bold ${
            summaryData.changePct >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
          }`}>
            {summaryData.changePct >= 0 ? '+' : ''}{summaryData.changePct.toFixed(1)}%
          </span>
        </div>

        {/* Line Chart - Income Over Time */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">{t('incomeOverTime')}</h3>
          {lineChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="totalWeight" name={t('totalWeight')} stroke={COLORS.totalWeight} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                {lineChartData.every(d => d.totalWeight === 0) && <ReferenceLine y={0} stroke="#94a3b8" />}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message={t('noDataAvailable')} />
          )}
        </div>

        {/* Bar Chart - Top 10 Customers */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">{t('topCustomers')}</h3>
            <div className="flex gap-2 items-center">
              <select
                value={top10Scope}
                onChange={e => setTop10Scope(e.target.value)}
                className="text-[10px] py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="overall">{t('overall')}</option>
                <option value="byZone">{t('byZoneFilter')}</option>
              </select>
              {top10Scope === 'byZone' && zonesList.length > 0 && (
                <select
                  value={top10Zone}
                  onChange={e => setTop10Zone(e.target.value)}
                  className="text-[10px] py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 min-w-[80px]"
                >
                  <option value="">{t('zone')}</option>
                  {zonesList.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {topCustomersData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(180, topCustomersData.length * 28)}>
              <BarChart data={topCustomersData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalWeight" name={t('totalWeight')} fill={COLORS.totalWeight} radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message={t('noDataAvailable')} />
          )}
        </div>

        {/* Pie Chart - Distribution by Zone or Location */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {filterBy === 'zone' ? t('distributionByZone') : t('distributionByLocation')}
            </h3>
            <div className="flex gap-2 items-center">
              <select
                value={distScope}
                onChange={e => setDistScope(e.target.value)}
                className="text-[10px] py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="overall">{t('overall')}</option>
                <option value="byZone">{t('byZoneFilter')}</option>
              </select>
              {distScope === 'byZone' && zonesList.length > 0 && (
                <select
                  value={distZone}
                  onChange={e => setDistZone(e.target.value)}
                  className="text-[10px] py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 min-w-[80px]"
                >
                  <option value="">{t('zone')}</option>
                  {zonesList.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-2">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={35}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS.pie[i % COLORS.pie.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS.pie[i % COLORS.pie.length] }} />
                    <span className="text-slate-600 dark:text-slate-300 truncate flex-1">{entry.name}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{entry.value.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart message={t('noDataAvailable')} />
          )}
        </div>

        {/* Declining Customers */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
            <TrendingDown size={14} className="text-red-500" />
            {t('decliningCustomers')}
            {decliningCustomers.length > 0 && (
              <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {decliningCustomers.length}
              </span>
            )}
          </h3>
          {decliningCustomers.length > 0 ? (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {decliningCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/customer/${c.id}`)}
                  className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                    {c.zone && <p className="text-[10px] text-slate-500 dark:text-slate-400">{c.zone}</p>}
                  </div>
                  <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold whitespace-nowrap ms-2">
                    {t('noVisitsInPeriod')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-3">
              {currentLogs.length > 0 ? '✓ All customers visited' : t('noDataAvailable')}
            </p>
          )}
        </div>

        {/* Export PDF Button */}
        {isAdmin && (
          <button
            onClick={handleExportPdf}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <FileDown size={18} />
            {t('exportPdf')}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, subValue, color, bg }) {
  return (
    <div className={`${bg} p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {subValue && <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-0.5">{subValue}</p>}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="h-[180px] flex flex-col items-center justify-center">
      <div className="w-full h-px bg-slate-200 dark:bg-slate-600 mb-3" />
      <p className="text-xs text-slate-400 dark:text-slate-500 italic">{message}</p>
    </div>
  );
}
