
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Users, UserPlus, TrendingUp, MapPin, Clock } from 'lucide-react';
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
  const { t } = useLanguage();
  const { locations } = useLocations();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (location.state?.openMenu) {
      setMenuOpen(true);
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state?.openMenu, navigate]);

  // Quick stats
  const totalCustomers = locations.length;
  const visitedToday = locations.filter(l => l.lastVisited === new Date().toISOString().slice(0, 10)).length;
  const pendingCount = locations.filter(l => l.status === 'pending').length;

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      {/* Glass Header */}
      <header className="fixed top-0 inset-x-0 z-10 glass">
        <div className="max-w-[380px] mx-auto w-full p-4 flex justify-between items-center gap-2">
          <div className="w-10 h-10 flex-shrink-0" aria-hidden="true" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex-1 text-center min-w-0 truncate font-display tracking-tight">
            {t('appTitle')}
          </h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors shrink-0 active:scale-95"
            title={t('menu')}
          >
            <Menu size={24} />
          </button>
        </div>
      </header>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <motion.main
        className="flex-1 p-4 max-w-[380px] mx-auto w-full mt-[72px] space-y-5"
        variants={stagger}
        initial="hidden"
        animate="show"
      >

        {/* Greeting */}
        <motion.div variants={fadeUp} className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground font-display tracking-tight">
            {getGreeting(t)}, {user?.name || 'Guest'} 👋
          </h2>
          <p className="text-sm text-muted-foreground">{t('homeSubtitle') || "Here's your overview"}</p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2.5">
          <div className="bg-card rounded-2xl p-3 shadow-sm border border-slate-200/60 dark:border-slate-700/50 text-center">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-1.5">
              <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-xl font-bold text-foreground font-display">{totalCustomers}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('total') || 'Total'}</p>
          </div>
          <div className="bg-card rounded-2xl p-3 shadow-sm border border-slate-200/60 dark:border-slate-700/50 text-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-1.5">
              <Clock size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-foreground font-display">{visitedToday}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('today') || 'Today'}</p>
          </div>
          <div className="bg-card rounded-2xl p-3 shadow-sm border border-slate-200/60 dark:border-slate-700/50 text-center">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-1.5">
              <MapPin size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xl font-bold text-foreground font-display">{pendingCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('pending') || 'Pending'}</p>
          </div>
        </motion.div>

        {/* Hero Card - Customers */}
        <motion.div variants={fadeUp}>
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="w-full relative overflow-hidden group rounded-3xl p-6 h-[180px] flex flex-col items-center justify-center text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
          >
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 dark:from-indigo-500 dark:via-violet-500 dark:to-purple-600 animate-gradient" />
            <div className="absolute inset-0 animate-shimmer" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner ring-1 ring-white/10 group-active:scale-95 transition-transform">
                <Users size={32} className="text-white drop-shadow-md" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white font-display tracking-tight mb-0.5">{t('customers')}</h2>
                <p className="text-white/70 text-xs font-medium">{t('viewAccounts') || 'View & manage all accounts'}</p>
              </div>
            </div>
          </button>
        </motion.div>

        {/* Add Customer Card */}
        <motion.div variants={fadeUp}>
          <button
            type="button"
            onClick={() => navigate('/add')}
            className="w-full relative overflow-hidden group rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] bg-card border border-slate-200/60 dark:border-slate-700/50"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserPlus size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-start flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-sm">{t('addNewCustomer')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t('addSubtitle') || 'Register a new location'}</p>
            </div>
            <TrendingUp size={18} className="text-muted-foreground/40 shrink-0" />
          </button>
        </motion.div>

      </motion.main>
    </div>
  );
}
