import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { useConfirmation } from './ConfirmationContext';
import { ArrowLeft, Moon, Sun, Github, Globe, Menu, Type } from 'lucide-react';
import MenuDrawer from './MenuDrawer';
import { useTextSize } from './TextSizeContext';

import { useAuth } from './AuthContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export default function SettingsView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme, theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { confirm } = useConfirmation();
  const { textSize, setTextSize } = useTextSize();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (await confirm({
      title: t('logout') || 'Log Out',
      message: t('confirmLogout') || 'Are you sure you want to log out?',
      confirmText: t('logout') || 'Log Out',
      cancelText: t('cancel') || 'Cancel'
    })) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden transition-colors duration-300">

      {/* Header – compact for mobile */}
      <div className="shrink-0 bg-white dark:bg-slate-800 p-3 min-h-[50px] shadow-sm flex items-center justify-between max-w-[380px] mx-auto w-full" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between w-full gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ms-1 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-95 shrink-0"
            title={t('home')}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex-1 text-center min-w-0 truncate">{t('settings')}</h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-95 shrink-0"
            title="Menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 overflow-y-auto p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-4 max-w-[380px] mx-auto w-full">
        {/* Appearance – smaller box for mobile */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('appearance')}</h2>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-500 active:scale-[0.98]"
            title={isDarkMode ? t('nightMode') : t('lightMode')}
          >
            <span className="text-slate-800 dark:text-white font-medium text-sm">
              {isDarkMode ? t('lightMode') : t('nightMode')}
            </span>
            <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-slate-200/80 dark:bg-slate-600/80 transition-colors duration-500">
              <Moon
                size={22}
                className={`absolute text-indigo-400 transition-all duration-500 ease-in-out ${isDarkMode ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
                  }`}
              />
              <Sun
                size={22}
                className={`absolute text-amber-500 transition-all duration-500 ease-in-out ${isDarkMode ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                  }`}
              />
            </div>
          </button>
        </div>


        {/* Visual Theme */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t('visualTheme')}
          </h2>
          <div className="flex gap-2">
            {['classic', 'modern'].map((th) => {
              const isActive = theme === th;
              return (
                <button
                  key={th}
                  onClick={() => setTheme(th)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 border ${isActive
                    ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary' // Active state
                    : 'bg-card border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                >
                  {th === 'classic' ? 'Classic' : 'Modern'}
                </button>
              );
            })}
          </div>
        </div>



        {/* Text Size */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('textSize')}</h2>
          <div className="flex gap-2">
            {['small', 'regular', 'large'].map((size) => {
              const isActive = textSize === size;
              return (
                <button
                  key={size}
                  onClick={() => setTextSize(size)}
                  className={`flex-1 py-2.5 px-2 rounded-lg font-semibold transition-all duration-200 border flex flex-col items-center gap-1 ${isActive
                    ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary'
                    : 'bg-card border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                >
                  <span className={size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm'}>A</span>
                  <span className="text-[10px]">{t(`textSize${size.charAt(0).toUpperCase() + size.slice(1)}`)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-red-100 dark:border-red-900/30">
          <h2 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">{t('dangerZone') || 'Danger Zone'}</h2>
          <button
            onClick={async () => {
              if (confirm("Reset ALL data? This cannot be undone.")) {
                const { getDocs, writeBatch, collection } = await import('firebase/firestore');
                const col = collection(db, 'customers');
                const snap = await getDocs(col);
                const batch = writeBatch(db);
                snap.forEach(d => batch.delete(d.ref));
                await batch.commit();
                window.location.reload();
              }
            }}
            className="w-full py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-bold border border-red-200 hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            {t('resetData') || 'Reset All Data'}
          </button>
        </div>

        {/* App Info */}
        <div className="text-center mt-6 space-y-1.5">
          <p className="text-slate-400 text-xs">{t('appVersion')}</p>
          <div className="flex justify-center gap-3">
            <Globe size={14} className="text-slate-400" />
            <Github size={14} className="text-slate-400" />
          </div>
        </div>



      </div>
    </div>
  );
}