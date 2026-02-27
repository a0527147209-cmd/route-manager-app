import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, X, LogOut, LogIn, Shield, BarChart3, Bell, ChevronRight, UserCircle } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { useConfirmation } from './ConfirmationContext';

const MENU_ICON_STYLES = {
  Bell: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
  Settings: 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400',
  BarChart3: 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400',
  Shield: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400',
};

export default function MenuDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();
  const { user, logout, isAdmin } = useAuth();
  const { confirm } = useConfirmation();

  useEffect(() => {
    if (!isOpen) return;
    const root = document.getElementById('root');
    if (root) root.style.overflow = 'hidden';
    return () => { if (root) root.style.overflow = ''; };
  }, [isOpen]);

  const goTo = (path) => {
    onClose();
    navigate(path, { state: { fromMenu: true } });
  };

  const menuItems = [
    { icon: Bell, label: t('notifications'), path: '/notifications', iconKey: 'Bell' },
    { icon: Settings, label: t('settings'), path: '/settings', iconKey: 'Settings' },
    ...(isAdmin ? [
      { icon: BarChart3, label: t('reports'), path: '/reports', iconKey: 'BarChart3' },
      { icon: Shield, label: t('manageUsers') || 'Manage Users', path: '/manage-users', iconKey: 'Shield' },
    ] : []),
  ];

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />

      <div
        className={`fixed top-0 h-full w-[272px] bg-white dark:bg-slate-900 shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] z-50 flex flex-col border-slate-200/60 dark:border-slate-800 ${isRtl ? 'left-0 border-r' : 'right-0 border-l'}`}
      >
        {/* Header */}
        <div
          className="px-5 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">{t('menu')}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 active:scale-95 transition-all"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="px-4 pt-4 pb-3 flex flex-col gap-1.5 flex-1">

          {/* Profile Card */}
          {user && (
            <button
              type="button"
              onClick={() => goTo('/account')}
              className="w-full text-start px-3.5 py-3.5 mb-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all duration-200 active:scale-[0.98] group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-900">
                  <UserCircle size={20} className="text-white" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 capitalize mt-0.5">{user.role}</p>
                </div>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </button>
          )}

          {/* Menu Items */}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const iconStyle = MENU_ICON_STYLES[item.iconKey] || MENU_ICON_STYLES.Settings;
              return (
                <button
                  key={item.path}
                  onClick={() => goTo(item.path)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 w-full text-start active:scale-[0.98] hover:bg-slate-50 dark:hover:bg-slate-800/60 group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconStyle.split(' ').slice(0, 2).join(' ')} ring-1 ring-black/[0.04] dark:ring-white/[0.06]`}>
                    <item.icon size={16} className={iconStyle.split(' ').slice(2).join(' ')} strokeWidth={1.8} />
                  </div>
                  <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          <div className="border-t border-slate-100 dark:border-slate-800 my-2" />

          {user ? (
            <button
              onClick={async () => {
                if (await confirm({
                  title: t('logout') || 'Log Out',
                  message: t('confirmLogout') || 'Are you sure you want to log out?',
                  confirmText: t('logout') || 'Log Out',
                  cancelText: t('cancel') || 'Cancel'
                })) {
                  logout();
                  onClose();
                  navigate('/login');
                }
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all w-full text-start active:scale-[0.98] group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                <LogOut size={16} className="text-red-500 dark:text-red-400" strokeWidth={1.8} />
              </div>
              <span className="text-[13px] font-medium">{t('logout') || 'Log Out'}</span>
            </button>
          ) : (
            <button
              onClick={() => goTo('/login')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all w-full text-start active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                <LogIn size={16} className="text-indigo-600 dark:text-indigo-400" strokeWidth={1.8} />
              </div>
              <span className="text-[13px] font-medium">{t('login') || 'Log In'}</span>
            </button>
          )}

          <div className="mt-2 mb-1 text-center">
            <p className="text-[10px] text-slate-300 dark:text-slate-700 font-mono tracking-wide">v2.8.0</p>
          </div>
        </div>
      </div>
    </>
  );
}
