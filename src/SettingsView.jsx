import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { useConfirmation } from './ConfirmationContext';
import { ArrowLeft, Moon, Sun, Github, Globe, Menu, Languages } from 'lucide-react';
import MenuDrawer from './MenuDrawer';

import { useAuth } from './AuthContext';

export default function SettingsView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme, theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { t, isRtl } = useLanguage();
  const { confirm } = useConfirmation();
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
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300">

      {/* Header – compact for mobile */}
      <div className="bg-white dark:bg-slate-800 p-3 min-h-[50px] shadow-sm flex items-center justify-between max-w-[380px] mx-auto w-full">
        <div className="flex items-center justify-between w-full gap-2">
          <button
            onClick={() => navigate('/', location.state?.fromMenu ? { state: { openMenu: true } } : {})}
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

      <div className="p-4 space-y-4 max-w-[380px] mx-auto w-full">
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
            {t('visualTheme') || (language === 'he' ? 'ערכת נושא' : 'Visual Theme')}
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
                  {th === 'classic' ? (language === 'he' ? 'קלאסי' : 'Classic') : (language === 'he' ? 'מודרני' : 'Modern')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Language – smaller box for mobile */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Languages size={16} />
            {t('language')}
          </h2>
          <div dir="ltr" className="flex rounded-lg bg-slate-100 dark:bg-slate-700/50 p-1 gap-0.5 min-w-[180px] w-full max-w-[240px]">
            <button
              type="button"
              onClick={() => setLanguage('he')}
              title={language === 'he' ? undefined : t('hebrew')}
              className={`flex-1 min-w-0 py-2 px-2.5 rounded-md font-semibold text-sm transition-all duration-200 ${language === 'he'
                ? 'bg-card text-primary shadow-sm ring-1 ring-primary/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              עברית
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              title={language === 'en' ? undefined : t('english')}
              className={`flex-1 min-w-0 py-2 px-2.5 rounded-md font-semibold text-sm transition-all duration-200 ${language === 'en'
                ? 'bg-card text-primary shadow-sm ring-1 ring-primary/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              English
            </button>
          </div>
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