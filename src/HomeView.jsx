
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Users, BarChart3, Plus, Settings,
  CalendarCheck, UserCog, Clock, DollarSign, ChevronRight,
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
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const totalCustomers = locations.length;
  const visitedToday = locations.filter(l => l.lastVisited === todayStr).length;

  const totalEarnings = useMemo(() => {
    let sum = 0;
    locations.forEach(loc => {
      (loc.logs || []).forEach(log => {
        const val = parseFloat(log.collection);
        if (!isNaN(val)) sum += val;
      });
    });
    return Math.round(sum * 20);
  }, [locations]);

  const recentVisits = useMemo(() => {
    const all = [];
    locations.forEach(loc => {
      (loc.logs || []).forEach(log => {
        if (log.date) {
          all.push({
            id: loc.id,
            name: loc.name || loc.address || 'Unknown',
            date: log.date,
            collection: log.collection,
          });
        }
      });
    });
    all.sort((a, b) => b.date.localeCompare(a.date));
    return all.slice(0, 5);
  }, [locations]);

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  const tiles = [
    {
      label: t('customers'),
      sub: t('customersSub'),
      icon: Users,
      gradient: 'from-indigo-500 to-violet-500',
      shadow: 'shadow-indigo-500/20',
      badge: totalCustomers,
      route: '/customers',
    },
    {
      label: t('reports'),
      sub: t('reportsSub'),
      icon: BarChart3,
      gradient: 'from-violet-500 to-purple-500',
      shadow: 'shadow-violet-500/20',
      route: '/reports',
    },
    {
      label: t('addCustomer'),
      sub: t('addCustomerSub'),
      icon: Plus,
      gradient: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/20',
      route: '/add',
    },
    {
      label: t('settings'),
      sub: t('settingsSub'),
      icon: Settings,
      gradient: 'from-slate-500 to-slate-600',
      shadow: 'shadow-slate-500/20',
      route: '/settings',
    },
    {
      label: t('todaysRoute'),
      sub: t('todaysRouteSub'),
      icon: CalendarCheck,
      gradient: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20',
      badge: visitedToday,
      route: '/customers',
    },
    {
      label: t('manageUsers'),
      sub: t('manageUsersSub'),
      icon: UserCog,
      gradient: 'from-rose-500 to-pink-500',
      shadow: 'shadow-rose-500/20',
      route: '/manage-users',
    },
    {
      label: t('recentActivity'),
      sub: t('recentActivitySub'),
      icon: Clock,
      gradient: 'from-cyan-500 to-blue-500',
      shadow: 'shadow-cyan-500/20',
      action: 'scroll-recent',
    },
    {
      label: t('totalEarnings'),
      sub: t('totalEarningsSub'),
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-600',
      shadow: 'shadow-green-500/20',
      badge: `$${totalEarnings.toLocaleString()}`,
      route: '/reports',
    },
  ];

  const handleTileClick = (tile) => {
    if (tile.route) {
      navigate(tile.route);
    } else if (tile.action === 'scroll-recent') {
      document.getElementById('recent-activity')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 mb-6">
            {tiles.map((tile, i) => (
              <motion.button
                key={i}
                variants={fadeUp}
                type="button"
                onClick={() => handleTileClick(tile)}
                className="relative flex flex-col items-center text-center bg-white dark:bg-slate-900 rounded-2xl p-4 pt-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-none border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-[0.97] group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tile.gradient} flex items-center justify-center mb-3 shadow-md ${tile.shadow} group-hover:scale-105 transition-transform`}>
                  <tile.icon size={22} className="text-white" strokeWidth={2} />
                </div>
                <span className="text-[13px] font-semibold text-slate-800 dark:text-white leading-tight">
                  {tile.label}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                  {tile.sub}
                </span>
                {tile.badge !== undefined && (
                  <span className="absolute top-2.5 right-2.5 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-slate-900 dark:bg-white text-[11px] font-bold text-white dark:text-slate-900 tabular-nums">
                    {tile.badge}
                  </span>
                )}
              </motion.button>
            ))}
          </motion.div>

          <motion.section variants={fadeUp} id="recent-activity" className="px-1">
            <h3 className="text-[15px] font-semibold text-slate-800 dark:text-white mb-3">
              {t('recentActivity')}
            </h3>
            {recentVisits.length === 0 ? (
              <p className="text-[13px] text-slate-400 dark:text-slate-500 py-4 text-center">
                {t('noRecentActivity')}
              </p>
            ) : (
              <div className="space-y-2">
                {recentVisits.map((visit, i) => (
                  <motion.button
                    key={`${visit.id}-${visit.date}-${i}`}
                    variants={fadeUp}
                    type="button"
                    onClick={() => navigate(`/customer/${visit.id}`)}
                    className="w-full flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-[0.99] group text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                      <Clock size={16} className="text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
                      <p className="text-[13px] font-medium text-slate-800 dark:text-white truncate">
                        {visit.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {visit.date}
                        {visit.collection && ` · ${visit.collection} lbs`}
                      </p>
                    </div>
                    <ChevronRight size={16} className={`text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-cyan-500 transition-colors ${isRtl ? 'rotate-180' : ''}`} />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.section>

        </div>
      </motion.main>
    </div>
  );
}
