
import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Users, BarChart3, Plus,
  Clock, Wallet, ListTodo, Map, FlaskConical, Route,
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

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

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
      label: t('todaysEarnings') || "Today's $",
      sub: `$${todayEarnings.toLocaleString()}`,
      icon: Wallet,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      isValue: true,
      adminOnly: true,
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
    {
      label: 'Smart List Demo',
      sub: 'New card layout',
      icon: FlaskConical,
      iconBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
      iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
      route: '/smart-list-demo',
    },
    {
      label: 'Smart List v1',
      sub: 'Big cards · Pill badges',
      icon: Route,
      iconBg: 'bg-orange-50 dark:bg-orange-950/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
      route: '/smart-list-v1',
    },
  ];

  const tiles = allTiles.filter(tile => !tile.adminOnly || isAdmin);

  return (
    <div className="h-full flex flex-col bg-slate-50/80 dark:bg-slate-950 overflow-hidden">

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

          <motion.div variants={fadeUp} className="mb-6">
            <h2 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {getGreeting(t)}, {user?.name || 'Guest'}
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              {t('homeSubtitle')}
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3.5">
            {tiles.map((tile, i) => (
              <motion.button
                key={i}
                variants={fadeUp}
                type="button"
                onClick={() => tile.route && navigate(tile.route)}
                className="relative flex flex-col items-start text-start bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] border border-slate-200/50 dark:border-slate-800/80 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200 active:scale-[0.97] group"
              >
                <div className={`w-10 h-10 rounded-xl ${tile.iconBg} flex items-center justify-center mb-3 ring-1 ring-black/[0.04] dark:ring-white/[0.06] group-hover:scale-[1.04] transition-transform duration-200`}>
                  <tile.icon size={19} className={tile.iconColor} strokeWidth={1.8} />
                </div>
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                  {tile.label}
                </span>
                <span className={`text-[11px] mt-0.5 leading-snug ${tile.isValue ? 'font-bold text-emerald-600 dark:text-emerald-400 tabular-nums' : 'text-slate-400 dark:text-slate-500'}`}>
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

        </div>
      </motion.main>
    </div>
  );
}
