
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import MenuDrawer from './MenuDrawer';
import { useLanguage } from './LanguageContext';

export default function HomeView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (location.state?.openMenu) {
      setMenuOpen(true);
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state?.openMenu, navigate]);

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

      <main className="flex-1 p-4 max-w-[380px] mx-auto w-full mt-[72px] space-y-6">

        {/* Hero Card - Customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="w-full relative overflow-hidden group rounded-3xl p-6 h-[220px] flex flex-col items-center justify-center text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            {/* Rich Gradient Background */}
            <div className="absolute inset-0 bg-primary opacity-100 group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner ring-1 ring-white/10 group-active:scale-95 transition-transform">
                <Users size={40} className="text-primary-foreground drop-shadow-md" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary-foreground font-display tracking-tight mb-1">{t('customers')}</h2>
                <p className="text-primary-foreground/80 text-sm font-medium">View active accounts</p>
              </div>
            </div>
          </button>
        </motion.div>

        {/* Secondary Cards Grid */}


      </main>
    </div>
  );
}
