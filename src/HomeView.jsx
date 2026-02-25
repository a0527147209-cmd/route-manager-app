
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Users, Clock, MapPin, ChevronRight, Plus } from 'lucide-react';
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
  const location = useLocation();
  const { t, isRtl } = useLanguage();
  const { locations } = useLocations();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const totalCustomers = locations.length;
  const visitedToday = locations.filter(l => l.lastVisited === new Date().toISOString().slice(0, 10)).length;
  const pendingCount = locations.filter(l => l.status === 'pending').length;

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } }
  };

  const stats = [
    { label: t('total') || 'Total', value: totalCustomers, icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    { label: t('today') || 'Today', value: visitedToday, icon: Clock, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { label: t('pending') || 'Pending', value: pendingCount, icon: MapPin, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] dark:bg-slate-950 overflow-hidden">

      {/* Clean header */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-[420px] mx-auto w-full px-5 py-3 flex justify-between items-center">
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

      {/* Scrollable content */}
      <motion.main
        className="flex-1 overflow-y-auto"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <div className="max-w-[420px] mx-auto w-full px-5 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">

          {/* Greeting */}
          <motion.div variants={fadeUp} className="mb-6">
            <h2 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {getGreeting(t)}, {user?.name || 'Guest'}
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              {t('homeSubtitle') || "Here's your overview"}
            </p>
          </motion.div>

          {/* Stats - slim horizontal cards */}
          <motion.div variants={fadeUp} className="space-y-2.5 mb-6">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 bg-white dark:bg-slate-900 rounded-xl px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800"
              >
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon size={17} className={stat.color} />
                </div>
                <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium flex-1">
                  {stat.label}
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {stat.value}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Customers - slim elegant banner */}
          <motion.div variants={fadeUp} className="mb-4">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="w-full flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl px-4 py-4 shadow-[0_2px_8px_rgba(99,102,241,0.08)] dark:shadow-none border border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all active:scale-[0.99] group"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-sm">
                <Users size={20} className="text-white" />
              </div>
              <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white leading-tight">
                  {t('customers')}
                </h3>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('viewAccounts') || 'View & manage all accounts'}
                </p>
              </div>
              <ChevronRight size={18} className={`text-slate-400 dark:text-slate-500 shrink-0 group-hover:text-indigo-500 transition-colors ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </motion.div>

          {/* Locations - matching slim card */}
          <motion.div variants={fadeUp}>
            <button
              type="button"
              onClick={() => navigate('/locations')}
              className="w-full flex items-center gap-4 bg-white dark:bg-slate-900 rounded-xl px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-[0.99] group"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-sm">
                <MapPin size={20} className="text-white" />
              </div>
              <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white leading-tight">
                  {t('locations') || 'Locations'}
                </h3>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('viewLocations') || 'Browse all locations'}
                </p>
              </div>
              <ChevronRight size={18} className={`text-slate-400 dark:text-slate-500 shrink-0 group-hover:text-emerald-500 transition-colors ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </motion.div>

        </div>
      </motion.main>

      {/* FAB - Add Customer */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
        onClick={() => navigate('/add')}
        className="fixed z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center active:scale-90 transition-transform hover:shadow-xl"
        style={{
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          right: isRtl ? 'auto' : '1.5rem',
          left: isRtl ? '1.5rem' : 'auto',
        }}
        title={t('addNewCustomer')}
      >
        <Plus size={26} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}
