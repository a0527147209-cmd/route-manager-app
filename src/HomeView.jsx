import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, MapPin, Users } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 p-3 min-h-[50px] flex items-center sticky top-0 z-10 shadow-sm shrink-0 max-w-[380px] mx-auto w-full">
        <div className="flex justify-between items-center w-full gap-2">
          <div className="w-10 h-10 flex-shrink-0" aria-hidden="true" />
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex-1 text-center min-w-0 truncate">{t('appTitle')}</h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 active:scale-95"
            title={t('menu')}
          >
            <Menu size={22} />
          </button>
        </div>
        <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      </header>

      <main className="flex-1 overflow-auto p-3 max-w-[380px] mx-auto w-full">
        <div className="flex flex-wrap items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/locations')}
            className="p-4 flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 shadow-md border-2 border-emerald-300 dark:border-emerald-700 hover:shadow-lg hover:border-emerald-400 dark:hover:border-emerald-600 active:scale-[0.98] transition-all shrink-0"
            title={t('locations')}
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-200 dark:bg-emerald-800/50 flex items-center justify-center shrink-0 shadow-sm">
              <MapPin size={26} className="text-emerald-700 dark:text-emerald-300" />
            </div>
            <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{t('locations')}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="p-4 flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 shadow-md border-2 border-indigo-300 dark:border-indigo-700 hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-600 active:scale-[0.98] transition-all shrink-0"
            title={t('customers')}
          >
            <div className="w-14 h-14 rounded-xl bg-indigo-200 dark:bg-indigo-800/50 flex items-center justify-center shrink-0 shadow-sm">
              <Users size={26} className="text-indigo-700 dark:text-indigo-300" />
            </div>
            <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">{t('customers')}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
