import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Menu,
  Calendar,
  FileDown,
  TrendingUp,
  TrendingDown,
  Users,
  Weight,
  Eye,
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
import MenuDrawer from './MenuDrawer';

const COLORS = {
  totalWeight: '#2563eb',
  halfWeight: '#16a34a',
  customerCut: '#ea580c',
  pie: ['#2563eb', '#16a34a', '#ea580c', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#64748b'],
  previousPeriod: '#94a3b8',
};

function getDateRange(granularity) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  let from;
  if (granularity === 'daily') {
    from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  } else if (granularity === 'weekly') {
    from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);
  } else {
    from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
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

function filterLogs(locations, from, to) {
  const logs = [];
  for (const loc of locations) {
    for (const log of (loc.logs || [])) {
      if (!log.date) continue;
      const d = log.date.slice(0, 10);
      if (d >= from && d <= to) {
        logs.push({ ...log, locationId: loc.id, locationName: loc.name, zone: loc.state || loc.city || 'Other' });
      }
    }
  }
  return logs;
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

export default function ReportsView() {
  const navigate = useNavigate();
  const { locations } = useLocations();
  const { t, isRtl } = useLanguage();
  const { isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [granularity, setGranularity] = useState('monthly');
  const [filterBy, setFilterBy] = useState('zone'); // 'zone' | 'location'

  const defaultRange = useMemo(() => getDateRange('monthly'), []);
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);

  const handleGranularityChange = (g) => {
    setGranularity(g);
    const range = getDateRange(g);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const currentLogs = useMemo(() => filterLogs(locations, dateFrom, dateTo), [locations, dateFrom, dateTo]);
  const prevPeriod = useMemo(() => getPreviousPeriod(dateFrom, dateTo), [dateFrom, dateTo]);
  const previousLogs = useMemo(() => filterLogs(locations, prevPeriod.from, prevPeriod.to), [locations, prevPeriod]);

  const summaryData = useMemo(() => {
    let totalW = 0, halfW = 0, custCut = 0, visitCount = currentLogs.length;
    const customerSet = new Set();
    for (const log of currentLogs) {
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
  }, [currentLogs, previousLogs]);

  const lineChartData = useMemo(() => {
    const currentGroups = groupByTime(currentLogs, granularity);
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
  }, [currentLogs, previousLogs, granularity]);

  const topCustomersData = useMemo(() => {
    const map = {};
    for (const log of currentLogs) {
      if (!map[log.locationId]) map[log.locationId] = { name: log.locationName, totalWeight: 0 };
      map[log.locationId].totalWeight += parseFloat(log.collection) || 0;
    }
    return Object.values(map)
      .sort((a, b) => b.totalWeight - a.totalWeight)
      .slice(0, 10)
      .map(c => ({ ...c, totalWeight: +c.totalWeight.toFixed(2) }));
  }, [currentLogs]);

  const pieData = useMemo(() => {
    const map = {};
    for (const log of currentLogs) {
      const key = filterBy === 'zone' ? (log.zone || 'Other') : (log.locationName || 'Other');
      if (!map[key]) map[key] = 0;
      map[key] += parseFloat(log.collection) || 0;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
      .sort((a, b) => b.value - a.value);
  }, [currentLogs, filterBy]);

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
    pdf.text(`${t('period')}: ${dateFrom} - ${dateTo}`, pageWidth / 2, y, { align: 'center' });
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

    pdf.save(`report_${dateFrom}_${dateTo}.pdf`);
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
        <button
          onClick={() => navigate(-1)}
          className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 shrink-0 ${isRtl ? '-me-1' : '-ms-1'}`}
        >
          <ArrowLeft size={22} className={isRtl ? 'rotate-180' : ''} />
        </button>
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

        {/* Granularity + Date Range */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-3">
          <div className="flex gap-1">
            {['daily', 'weekly', 'monthly'].map(g => (
              <button
                key={g}
                onClick={() => handleGranularityChange(g)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  granularity === g
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {t(g)}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {['zone', 'location'].map(f => (
              <button
                key={f}
                onClick={() => setFilterBy(f)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  filterBy === f
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {f === 'zone' ? t('byZone') : t('byLocation')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5 block">{t('from')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-0.5 block">{t('to')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <SummaryCard icon={Weight} label={t('totalWeight')} value={summaryData.totalW.toFixed(2)} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/40" />
          <SummaryCard icon={TrendingUp} label={t('halfWeight')} value={summaryData.halfW.toFixed(2)} color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-950/40" />
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
                <Line type="monotone" dataKey="halfWeight" name={t('halfWeight')} stroke={COLORS.halfWeight} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="customerCut" name={t('customerCut')} stroke={COLORS.customerCut} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="prevTotalWeight" name={t('previousPeriod')} stroke={COLORS.previousPeriod} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                {lineChartData.every(d => d.totalWeight === 0) && <ReferenceLine y={0} stroke="#94a3b8" />}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message={t('noDataAvailable')} />
          )}
        </div>

        {/* Bar Chart - Top 10 Customers */}
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">{t('topCustomers')}</h3>
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
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3">
            {filterBy === 'zone' ? t('distributionByZone') : t('distributionByLocation')}
          </h3>
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

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className={`${bg} p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
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
