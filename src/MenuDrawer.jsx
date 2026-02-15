import { useNavigate } from 'react-router-dom';
import { Settings, X, Search, UserPlus, Users, LogOut, LogIn } from 'lucide-react';
import { useSearch } from './SearchContext';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { useConfirmation } from './ConfirmationContext';

export default function MenuDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { searchTerm, setSearchTerm } = useSearch();
  const { t, isRtl } = useLanguage();
  const { user, logout } = useAuth();
  const { confirm } = useConfirmation();

  const goTo = (path) => {
    onClose();
    navigate(path, { state: { fromMenu: true } });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-out"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />
      <div
        className={`fixed top-0 h-full w-56 bg-card shadow-xl z-50 flex flex-col ${isRtl ? 'left-0' : 'right-0'
          }`}
        style={{
          animation: isRtl
            ? 'slideInFromLeft 0.3s ease-out'
            : 'slideInFromRight 0.3s ease-out',
        }}
      >
        <div className="p-3 flex items-center justify-between border-b border-border">
          <h2 className="text-lg font-bold text-foreground">{t('menu')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground active:scale-95"
          >
            <X size={22} />
          </button>
        </div>
        <div className="p-2 flex flex-col gap-0.5">
          <div className="px-2 pb-2 border-b border-border mb-2">
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
                className="w-full bg-muted/50 text-foreground rounded-lg py-2 ps-8 pe-8 text-sm outline-none focus:ring-2 focus:ring-primary"
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
          <button
            onClick={() => goTo('/add')}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-primary hover:bg-primary/10 transition-colors w-full text-start text-sm font-semibold active:scale-[0.98]"
          >
            <UserPlus size={20} />
            <span>{t('addCustomer')}</span>
          </button>
          <button
            onClick={() => goTo('/customers')}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-foreground hover:bg-muted transition-colors w-full text-start text-sm font-semibold active:scale-[0.98]"
          >
            <Users size={20} />
            <span>{t('customers')}</span>
          </button>
          <button
            onClick={() => goTo('/settings')}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-foreground hover:bg-muted transition-colors w-full text-start text-sm font-semibold active:scale-[0.98]"
          >
            <Settings size={20} />
            <span>{t('settings')}</span>
          </button>



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
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-start text-sm font-semibold active:scale-[0.98]"
            >
              <LogOut size={20} />
              <span>{t('logout') || 'Log Out'} ({user.username})</span>
            </button>
          ) : (
            <button
              onClick={() => goTo('/login')}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-primary hover:bg-primary/10 transition-colors w-full text-start text-sm font-semibold active:scale-[0.98]"
            >
              <LogIn size={20} />
              <span>{t('login') || 'Log In'}</span>
            </button>
          )}

          <div className="mt-auto p-4 text-center">
            <p className="text-[10px] text-muted-foreground/50 font-mono">v2.5 (Latest)</p>
          </div>
        </div>
      </div >
    </>
  );
}
