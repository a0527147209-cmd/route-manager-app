
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Users, BarChart3, Plus, Settings,
  Map, UserCog, Clock, DollarSign, ChevronRight,
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

  const totalCustomers = locations.length;

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
      .slice(0, 5);
  }, [locations]);

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  const tiles = [
    {
      label: t('customers'),
      icon: Users,
      gradient: 'from-indigo-500 to-violet-500',
      badge: totalCustomers,
      route: '/customers',
    },
    {
      label: t('reports'),
      icon: BarChart3,
      gradient: 'from-violet-500 to-purple-500',
      route: '/reports',
    },
    {
      label: t('addCustomer'),
      icon: Plus,
      gradient: 'from-emerald-500 to-teal-500',
      route: '/add',
    },
    {
      label: t('settings'),
      icon: Settings,
      gradient: 'from-slate-500 to-slate-600',
      route: '/settings',
    },
    {
      label: t('maps'),
      icon: Map,
      gradient: 'from-amber-500 to-orange-500',
      route: '/maps',
    },
    {
      label: t('manageUsers'),
      icon: UserCog,
      gradient: 'from-rose-500 to-pink-500',
      route: '/manage-users',
    },
    {
      label: t('recentActivity'),
      icon: Clock,
      gradient: 'from-cyan-500 to-blue-500',
      action: 'scroll-recent',
    },
    {
      label: t('totalEarnings'),
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-600',
      displayValue: `$${totalEarnings.toLocaleString()}`,
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

          <motion.div variants={fadeUp} className="mb-4 px-1">
            <h2 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {getGreeting(t)}, {user?.name || 'Guest'}
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t('homeSubtitle')}
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2.5 mb-6">
            {tiles.map((tile, i) => (
              <motion.button
                key={i}
                variants={fadeUp}
                type="button"
                onClick={() => handleTileClick(tile)}
                className="relative flex flex-col items-center text-center bg-white dark:bg-slate-900 rounded-xl p-2.5 pt-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-[0.96] group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tile.gradient} flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform`}>
                  <tile.icon size={18} className="text-white" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                  {tile.label}
                </span>
                {tile.displayValue && (
                  <span className="text-[10px] font-bold text-green-600 dark:text-green-400 mt-0.5 tabular-nums">
                    {tile.displayValue}
                  </span>
                )}
                {tile.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-slate-800 dark:bg-white text-[9px] font-bold text-white dark:text-slate-900 tabular-nums shadow-sm">
                    {tile.badge}
                  </span>
                )}
              </motion.button>
            ))}
          </motion.div>

          <motion.section variants={fadeUp} id="recent-activity" className="px-1">
            <h3 className="text-[14px] font-semibold text-slate-800 dark:text-white mb-2.5">
              {t('recentActivity')}
            </h3>
            {recentVisits.length === 0 ? (
              <p className="text-[12px] text-slate-400 dark:text-slate-500 py-4 text-center">
                {t('noRecentActivity')}
              </p>
            ) : (
              <div className="space-y-1.5">
                {recentVisits.map((visit, i) => (
                  <motion.button
                    key={`${visit.id}-${i}`}
                    variants={fadeUp}
                    type="button"
                    onClick={() => navigate(`/customer/${visit.id}`)}
                    className="w-full flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl px-3.5 py-2.5 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-[0.99] group text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
                      <p className="text-[12px] font-medium text-slate-800 dark:text-white truncate">
                        {visit.name}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {visit.date}
                        {visit.city && ` · ${visit.city}`}
                        {visit.collection && visit.collection !== '0' && ` · ${visit.collection} lbs`}
                      </p>
                    </div>
                    <ChevronRight size={14} className={`text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-cyan-500 transition-colors ${isRtl ? 'rotate-180' : ''}`} />
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
