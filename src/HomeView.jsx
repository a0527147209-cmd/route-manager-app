
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Users, BarChart3, Plus,
  Clock, Wallet, ListTodo, Map,
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
  const { t, isRtl } = useLanguage();
  const { locations } = useLocations();
  const { user, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const totalCustomers = locations.length;
  const todayStr = new Date().toISOString().slice(0, 10);

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
    show: { transition: { staggerChildren: 0.05 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  const allTiles = [
    {
      label: t('customers'),
      sub: t('customersSub'),
      icon: Users,
      gradient: 'from-indigo-500 to-violet-500',
      badge: totalCustomers,
      route: '/customers',
    },
    {
      label: t('reports'),
      sub: t('reportsSub'),
      icon: BarChart3,
      gradient: 'from-violet-500 to-purple-500',
      route: '/reports',
      adminOnly: true,
    },
    {
      label: t('addCustomer'),
      sub: t('addCustomerSub'),
      icon: Plus,
      gradient: 'from-emerald-500 to-teal-500',
      route: '/add',
    },
    {
      label: t('todaysEarnings') || "Today's $",
      sub: `$${todayEarnings.toLocaleString()}`,
      icon: Wallet,
      gradient: 'from-amber-500 to-orange-500',
      isValue: true,
      adminOnly: true,
    },
    {
      label: t('recentActivity'),
      sub: t('recentActivitySub'),
      icon: Clock,
      gradient: 'from-cyan-500 to-blue-500',
      route: '/recent-activity',
    },
    {
      label: t('tasksReminders'),
      sub: t('tasksRemindersSub'),
      icon: ListTodo,
      gradient: 'from-fuchsia-500 to-pink-500',
      route: '/tasks',
    },
    {
      label: t('mapOverview'),
      sub: t('mapOverviewSub'),
      icon: Map,
      gradient: 'from-sky-500 to-indigo-500',
      route: '/map-overview',
    },
  ];

  const tiles = allTiles.filter(tile => !tile.adminOnly || isAdmin);

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] dark:bg-slate-950 overflow-hidden">

      <header
        className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[520px] mx-auto w-full px-5 py-3 flex justify-between items-center">
          <div className="w-9 shrink-0" aria-hidden="true" />
          <h1 className="text-[17px] font-semibold text-slate-800 dark:text-white tracking-tight">
            {t('appTitle')}
          </h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
            title={t('menu')}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <motion.main
        className="flex-1 overflow-y-auto"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <div className="max-w-[520px] mx-auto w-full px-4 pt-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">

          <motion.div variants={fadeUp} className="mb-5 px-1">
            <h2 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {getGreeting(t)}, {user?.name || 'Guest'}
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t('homeSubtitle')}
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            {tiles.map((tile, i) => (
              <motion.button
                key={i}
                variants={fadeUp}
                type="button"
                onClick={() => tile.route && navigate(tile.route)}
                className="relative flex flex-col items-center text-center bg-white dark:bg-slate-900 rounded-2xl p-4 pt-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-[0.97] group"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tile.gradient} flex items-center justify-center mb-2.5 shadow-md group-hover:scale-105 transition-transform`}>
                  <tile.icon size={20} className="text-white" strokeWidth={2} />
                </div>
                <span className="text-[13px] font-semibold text-slate-800 dark:text-white leading-tight">
                  {tile.label}
                </span>
                <span className={`text-[11px] mt-0.5 leading-tight ${tile.isValue ? 'font-bold text-green-600 dark:text-green-400 tabular-nums' : 'text-slate-400 dark:text-slate-500'}`}>
                  {tile.sub}
                </span>
                {tile.badge !== undefined && (
                  <span className="absolute top-2.5 right-2.5 min-w-[20px] h-[20px] px-1 flex items-center justify-center rounded-full bg-slate-800 dark:bg-white text-[10px] font-bold text-white dark:text-slate-900 tabular-nums shadow-sm">
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
