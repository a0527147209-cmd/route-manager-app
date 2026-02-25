import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, X, Search, UserPlus, Users, LogOut, LogIn, Shield, BarChart3 } from 'lucide-react';
import { useSearch } from './SearchContext';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { useConfirmation } from './ConfirmationContext';

export default function MenuDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { searchTerm, setSearchTerm } = useSearch();
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
    { icon: UserPlus, label: t('addCustomer'), path: '/add', accent: true },
    { icon: Users, label: t('customers'), path: '/customers' },
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
            <div className="px-3 py-3 mb-2 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-200/60 dark:border-indigo-800/40">
              <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200">{t('hi') || 'Hi'}, {user.name} 👋</p>
              <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 capitalize mt-0.5">{user.role}</p>
            </div>
          )}

          <div className="px-1 pb-3 border-b border-border/40 mb-2">
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              <input
                type="text"
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onClose();
                    const currentPath = window.location.pathname;
                    if (currentPath.includes('/locations')) {
                      navigate('/locations', { state: { fromMenu: true } });
                    } else {
                      navigate('/customers', { state: { fromMenu: true } });
                    }
                  }
                }}
                className="w-full bg-muted/50 text-foreground rounded-xl py-2.5 ps-9 pe-8 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

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
