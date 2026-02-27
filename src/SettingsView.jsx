import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import { useConfirmation } from './ConfirmationContext';
import {
  ArrowLeft, Moon, Sun, Github, Globe, Menu, Type,
  Shield, Lock, Eye, EyeOff, Download, ChevronDown, ChevronUp,
  Key, Smartphone, UserCheck, Users,
} from 'lucide-react';
import MenuDrawer from './MenuDrawer';
import { useTextSize } from './TextSizeContext';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationsContext';

const PRIVACY_KEY = 'vrm_privacy_settings_v1';
const SECURITY_KEY = 'vrm_security_settings_v1';

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export default function SettingsView() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme, theme, setTheme } = useTheme();
  const { user, logout, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { confirm } = useConfirmation();
  const { textSize, setTextSize } = useTextSize();
  const { locations } = useLocations();
  const [menuOpen, setMenuOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  const [privacy, setPrivacy] = useState(() =>
    loadJson(PRIVACY_KEY, { profileVisibility: 'team', showEmail: true, showActivity: true })
  );
  const [security, setSecurity] = useState(() =>
    loadJson(SECURITY_KEY, { twoFactor: false, sessionTimeout: '30' })
  );
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirmPw: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const updatePrivacy = useCallback((patch) => {
    setPrivacy((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(PRIVACY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateSecurity = useCallback((patch) => {
    setSecurity((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(SECURITY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.newPw.length < 6) { setPwError(t('secPwTooShort')); return; }
    if (pwForm.newPw !== pwForm.confirmPw) { setPwError(t('secPwMismatch')); return; }
    try {
      const { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      if (!currentUser) { setPwError(t('secPwError')); return; }
      const credential = EmailAuthProvider.credential(currentUser.email, pwForm.current);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, pwForm.newPw);
      setPwSuccess(t('secPwSuccess'));
      setPwForm({ current: '', newPw: '', confirmPw: '' });
      setChangingPassword(false);
    } catch (err) {
      setPwError(err.code === 'auth/wrong-password' ? t('secPwWrongCurrent') : (t('secPwError') + ': ' + err.message));
    }
  };

  const handleDownloadData = useCallback(() => {
    const data = {
      user: { name: user?.name, email: user?.email, role: user?.role },
      customers: (locations || []).map((loc) => ({
        name: loc.name, address: loc.address, city: loc.city, zone: loc.zone,
        type: loc.type, logs: loc.logs,
      })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-route-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [user, locations]);

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

        {/* Privacy */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setPrivacyOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Shield size={16} className="text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">{t('privacyTitle')}</h2>
            </div>
            {privacyOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>

          {privacyOpen && (
            <div className="px-3 pb-3 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">
              {/* Profile Visibility */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t('privacyProfileVisibility')}</label>
                <div className="flex gap-2">
                  {[
                    { key: 'everyone', label: t('privacyEveryone'), icon: Globe },
                    { key: 'team', label: t('privacyTeamOnly'), icon: Users },
                    { key: 'private', label: t('privacyPrivate'), icon: EyeOff },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => updatePrivacy({ profileVisibility: opt.key })}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold border transition-all ${
                        privacy.profileVisibility === opt.key
                          ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-400 dark:border-violet-600 text-violet-700 dark:text-violet-300 ring-1 ring-violet-400'
                          : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <opt.icon size={15} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle: Show email */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('privacyShowEmail')}</span>
                <button
                  type="button"
                  onClick={() => updatePrivacy({ showEmail: !privacy.showEmail })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${privacy.showEmail ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${privacy.showEmail ? 'start-[22px]' : 'start-0.5'}`} />
                </button>
              </div>

              {/* Toggle: Show activity */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t('privacyShowActivity')}</span>
                <button
                  type="button"
                  onClick={() => updatePrivacy({ showActivity: !privacy.showActivity })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${privacy.showActivity ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${privacy.showActivity ? 'start-[22px]' : 'start-0.5'}`} />
                </button>
              </div>

              {/* Admin-only: Permission management */}
              {isAdmin && (
                <div className="border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck size={15} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase">{t('privacyAdminOnly')}</span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">{t('privacyPermissionsDesc')}</p>
                  <div className="space-y-2">
                    {[
                      { key: 'viewCustomers', label: t('privacyPermViewCustomers') },
                      { key: 'viewReports', label: t('privacyPermViewReports') },
                      { key: 'editLogs', label: t('privacyPermEditLogs') },
                    ].map((perm) => {
                      const perms = privacy.permissions || { viewCustomers: true, viewReports: false, editLogs: true };
                      return (
                        <div key={perm.key} className="flex items-center justify-between">
                          <span className="text-xs text-slate-700 dark:text-slate-300">{perm.label}</span>
                          <button
                            type="button"
                            onClick={() => updatePrivacy({ permissions: { ...perms, [perm.key]: !perms[perm.key] } })}
                            className={`w-10 h-5.5 rounded-full relative transition-colors ${perms[perm.key] ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                          >
                            <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${perms[perm.key] ? 'start-[19px]' : 'start-0.5'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Download Data */}
              <button
                type="button"
                onClick={handleDownloadData}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors active:scale-[0.98]"
              >
                <Download size={16} />
                {t('privacyDownloadData')}
              </button>
            </div>
          )}
        </div>

        {/* Security & Passwords */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setSecurityOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Lock size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">{t('securityTitle')}</h2>
            </div>
            {securityOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>

          {securityOpen && (
            <div className="px-3 pb-3 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-3">

              {/* Change Password */}
              <div>
                <button
                  type="button"
                  onClick={() => { setChangingPassword((v) => !v); setPwError(''); setPwSuccess(''); }}
                  className="w-full flex items-center gap-2.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Key size={16} />
                  {t('secChangePassword')}
                  {changingPassword ? <ChevronUp size={15} className="ms-auto text-slate-400" /> : <ChevronDown size={15} className="ms-auto text-slate-400" />}
                </button>

                {changingPassword && (
                  <form onSubmit={handleChangePassword} className="mt-2 space-y-2">
                    <div className="relative">
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={pwForm.current}
                        onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                        placeholder={t('secCurrentPassword')}
                        className="w-full px-3 py-2 pe-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                      <button type="button" onClick={() => setShowCurrentPw((v) => !v)} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={pwForm.newPw}
                        onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))}
                        placeholder={t('secNewPassword')}
                        className="w-full px-3 py-2 pe-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                      <button type="button" onClick={() => setShowNewPw((v) => !v)} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <input
                      type="password"
                      value={pwForm.confirmPw}
                      onChange={(e) => setPwForm((p) => ({ ...p, confirmPw: e.target.value }))}
                      placeholder={t('secConfirmPassword')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    {pwError && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{pwError}</p>}
                    {pwSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{pwSuccess}</p>}
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors active:scale-[0.98]"
                    >
                      {t('secUpdatePassword')}
                    </button>
                  </form>
                )}
              </div>

              {/* Two-Factor */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <Smartphone size={16} className="text-slate-500 dark:text-slate-400" />
                  <div>
                    <span className="text-sm text-slate-700 dark:text-slate-300 block">{t('secTwoFactor')}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{t('secTwoFactorDesc')}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateSecurity({ twoFactor: !security.twoFactor })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${security.twoFactor ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${security.twoFactor ? 'start-[22px]' : 'start-0.5'}`} />
                </button>
              </div>

              {/* Session Timeout */}
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t('secSessionTimeout')}</label>
                <div className="flex gap-2">
                  {[
                    { key: '15', label: '15 min' },
                    { key: '30', label: '30 min' },
                    { key: '60', label: '1 hr' },
                    { key: 'never', label: t('secNever') },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => updateSecurity({ sessionTimeout: opt.key })}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        security.sessionTimeout === opt.key
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Sessions Info */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-1.5">
                  <Eye size={14} className="text-slate-500 dark:text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{t('secActiveSessions')}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('secCurrentDevice')}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t('secActiveNow')}</span>
                </div>
              </div>
            </div>
          )}
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