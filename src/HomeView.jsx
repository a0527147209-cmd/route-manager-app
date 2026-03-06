
import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Users, BarChart3, Plus,
  Clock, Wallet, ListTodo, Map, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import MenuDrawer from './MenuDrawer';
import { useLanguage } from './LanguageContext';
import { useLocations } from './LocationsContext';
import { useAuth } from './AuthContext';

function getGreeting(t) {
  const hour = new Date().getHours();
  if (hour < 12) return t('goodMorning') || 'Good Morning';
  if (hour < 18) return t('goodAfternoon') || 'Good Afternoon';
  return t('goodEvening') || 'Good Evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeView() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { t, isRtl } = useLanguage();
  const { locations } = useLocations();
  const { user, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isReturning = routeLocation.state?.fromMenu || routeLocation.key !== 'default';

  const totalCustomers = locations.length;
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const visitedToday = locations.filter(l => l.lastVisited === todayStr).length;

  const todayEarnings = useMemo(() => {
    let sum = 0;
    locations.forEach(loc => {
      (loc.logs || []).forEach(log => {
        if (log.date === todayStr) {
          const val = parseFloat(log.collection);
          if (!isNaN(val)) sum += val;
        }
      });
    });
    return Math.round(sum * 20);
  }, [locations, todayStr]);

  const recentVisits = useMemo(() => {
    return locations
      .filter(loc => loc.lastVisited)
      .map(loc => ({
        id: loc.id,
        name: loc.name || loc.address || 'Unknown',
        city: loc.city || loc.zone || '',
        date: loc.lastVisited,
        collection: loc.lastCollection,
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [locations]);

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  const stats = [
    { label: t('total') || 'Customers', value: totalCustomers, color: 'text-indigo-600 dark:text-indigo-400' },
    { label: t('today') || 'Visited', value: visitedToday, color: 'text-emerald-600 dark:text-emerald-400' },
  ];
  if (isAdmin) {
    stats.push({ label: t('todaysEarnings') || "Today's $", value: `$${todayEarnings.toLocaleString()}`, color: 'text-amber-600 dark:text-amber-400' });
  }

  const allTiles = [
    {
      label: t('customers'),
      sub: t('customersSub'),
      icon: Users,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      badge: totalCustomers,
      route: '/customers',
    },
    {
      label: t('reports'),
      sub: t('reportsSub'),
      icon: BarChart3,
      iconBg: 'bg-violet-50 dark:bg-violet-950/40',
      iconColor: 'text-violet-600 dark:text-violet-400',
      route: '/reports',
      adminOnly: true,
    },
    {
      label: t('addCustomer'),
      sub: t('addCustomerSub'),
      icon: Plus,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      route: '/add',
    },
    {
      label: t('recentActivity'),
      sub: t('recentActivitySub'),
      icon: Clock,
      iconBg: 'bg-sky-50 dark:bg-sky-950/40',
      iconColor: 'text-sky-600 dark:text-sky-400',
      route: '/recent-activity',
    },
    {
      label: t('tasksReminders'),
      sub: t('tasksRemindersSub'),
      icon: ListTodo,
      iconBg: 'bg-rose-50 dark:bg-rose-950/40',
      iconColor: 'text-rose-600 dark:text-rose-400',
      route: '/tasks',
    },
    {
      label: t('mapOverview'),
      sub: t('mapOverviewSub'),
      icon: Map,
      iconBg: 'bg-teal-50 dark:bg-teal-950/40',
      iconColor: 'text-teal-600 dark:text-teal-400',
      route: '/map-overview',
    },
  ];

  const tiles = allTiles.filter(tile => !tile.adminOnly || isAdmin);

  return (
    <div className="h-full flex flex-col bg-slate-50/80 dark:bg-[#0B0F1A] overflow-hidden">

      <header
        className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[520px] mx-auto w-full px-5 py-3.5 flex justify-between items-center">
          <div className="w-9 shrink-0" aria-hidden="true" />
          <h1 className="text-[17px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            {t('appTitle')}
          </h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
            title={t('menu')}
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
        </div>
      </header>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <motion.main
        className="flex-1 overflow-y-auto"
        variants={stagger}
        initial={isReturning ? false : 'hidden'}
        animate="show"
      >
        <div className="max-w-[520px] mx-auto w-full px-5 pt-6 pb-[calc(3rem+env(safe-area-inset-bottom))]">

          {/* Hero greeting */}
          <motion.div variants={fadeUp} className="mb-6 relative">
            <div className="absolute -top-4 -left-4 w-32 h-32 bg-indigo-100/50 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />
            <p className="text-[12px] font-medium text-slate-400 dark:text-slate-500 tracking-wide uppercase mb-1 relative">
              {formatDate()}
            </p>
            <h2 className="text-[26px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight relative">
              {getGreeting(t)},
            </h2>
            <h2 className="text-[26px] font-bold text-indigo-600 dark:text-indigo-400 tracking-tight leading-tight relative">
              {user?.name || 'Guest'}
            </h2>
          </motion.div>

          {/* Stats row */}
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 mb-7">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900/80 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] border border-slate-200/50 dark:border-slate-800/60"
              >
                <p className={`text-[22px] font-bold tabular-nums leading-none ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 leading-tight">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Quick Actions label */}
          <motion.div variants={fadeUp} className="mb-3">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-widest uppercase">
              Quick Actions
            </p>
          </motion.div>

          {/* Tile grid */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 mb-7">
            {tiles.map((tile, i) => (
              <motion.button
                key={i}
                variants={fadeUp}
                type="button"
                onClick={() => tile.route && navigate(tile.route)}
                className="relative flex flex-col items-start text-start bg-white dark:bg-slate-900/80 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] border border-slate-200/50 dark:border-slate-800/60 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:border-slate-300/60 dark:hover:border-slate-700 transition-all duration-200 active:scale-[0.97] group"
              >
                <div className={`w-10 h-10 rounded-xl ${tile.iconBg} flex items-center justify-center mb-3 ring-1 ring-black/[0.04] dark:ring-white/[0.06] group-hover:scale-[1.05] transition-transform duration-200`}>
                  <tile.icon size={19} className={tile.iconColor} strokeWidth={1.8} />
                </div>
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                  {tile.label}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">
                  {tile.sub}
                </span>
                {tile.badge !== undefined && (
                  <span className="absolute top-3 end-3 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-slate-900 dark:bg-slate-100 text-[10px] font-bold text-white dark:text-slate-900 tabular-nums ring-2 ring-white dark:ring-slate-900">
                    {tile.badge}
                  </span>
                )}
              </motion.button>
            ))}
          </motion.div>

          {/* Recent Activity mini-section */}
          {recentVisits.length > 0 && (
            <motion.div variants={fadeUp}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-widest uppercase">
                  Recent Activity
                </p>
                <button
                  onClick={() => navigate('/recent-activity')}
                  className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentVisits.map((visit, i) => (
                  <button
                    key={`${visit.id}-${i}`}
                    type="button"
                    onClick={() => navigate(`/customer/${visit.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-slate-400 dark:text-slate-500" strokeWidth={1.8} />
                    </div>
                    <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
                      <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200 truncate leading-tight">
                        {visit.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                        {visit.date}{visit.city && ` · ${visit.city}`}
                      </p>
                    </div>
                    <ChevronRight size={14} className={`text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-slate-400 transition-colors ${isRtl ? 'rotate-180' : ''}`} strokeWidth={1.8} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </motion.main>
    </div>
  );
}
