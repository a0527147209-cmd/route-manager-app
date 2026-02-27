import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, X, LogOut, LogIn, Shield, BarChart3, Bell, ChevronRight, UserCircle } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { useConfirmation } from './ConfirmationContext';

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
    { icon: Bell, label: t('notifications'), path: '/notifications' },
    { icon: Settings, label: t('settings'), path: '/settings' },
    ...(isAdmin ? [
      { icon: BarChart3, label: t('reports'), path: '/reports' },
      { icon: Shield, label: t('manageUsers') || 'Manage Users', path: '/manage-users' },
    ] : []),
  ];

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      <div
        className={`fixed top-0 h-full w-64 bg-white dark:bg-slate-800 shadow-2xl z-50 flex flex-col border-slate-200 dark:border-slate-700 ${isRtl ? 'left-0 border-r' : 'right-0 border-l'}`}
      >
        <div className="p-4 flex items-center justify-between border-b border-border/50">
          <h2 className="text-lg font-bold text-foreground font-display">{t('menu')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground active:scale-95 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-1 flex-1">
          {user && (
            <button
              type="button"
              onClick={() => goTo('/account')}
              className="w-full text-start px-3 py-3 mb-2 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-700/30 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-sm">
                  <UserCircle size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize mt-0.5">{user.role}</p>
                </div>
                <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
            </button>
          )}

          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => goTo(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-start text-sm font-semibold active:scale-[0.98] ${item.accent
                    ? 'text-primary hover:bg-primary/10'
                    : 'text-foreground hover:bg-muted/70'
                  }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <div className="border-t border-border/40 my-2" />

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
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full text-start text-sm font-semibold active:scale-[0.98]"
            >
              <LogOut size={20} />
              <span>{t('logout') || 'Log Out'}</span>
            </button>
          ) : (
            <button
              onClick={() => goTo('/login')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-primary hover:bg-primary/10 transition-all w-full text-start text-sm font-semibold active:scale-[0.98]"
            >
              <LogIn size={20} />
              <span>{t('login') || 'Log In'}</span>
            </button>
          )}

          <div className="mt-3 text-center">
            <p className="text-[10px] text-muted-foreground/40 font-mono">v2.8.0</p>
          </div>
        </div>
      </div>
    </>
  );
}
