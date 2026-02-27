import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Camera, User, Mail, Phone, Save, CheckCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import MenuDrawer from './MenuDrawer';
import BackButton from './BackButton';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';

const AVATAR_KEY = 'vrm_avatar_v1';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function AccountView() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, updateProfile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [avatar, setAvatar] = useState(() => {
    try { return localStorage.getItem(AVATAR_KEY) || ''; } catch { return ''; }
  });

  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(t('accAvatarTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatar(dataUrl);
      localStorage.setItem(AVATAR_KEY, dataUrl);
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    if (!form.name.trim()) { setError(t('accNameRequired')); return; }
    setSaving(true);
    const result = await updateProfile({
      name: form.name.trim(),
      phone: form.phone.trim(),
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error || t('accSaveError'));
    }
  };

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] dark:bg-slate-950 overflow-hidden">
      <header
        className="shrink-0 sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[520px] mx-auto w-full px-4 py-2.5 flex items-center justify-between gap-2">
          <BackButton onClick={() => navigate(-1)} />
          <h1 className="text-base font-bold text-slate-800 dark:text-white">{t('accTitle')}</h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[520px] mx-auto w-full px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-5">

          {/* Avatar Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className="relative group">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg relative group-hover:shadow-xl transition-shadow"
              >
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{getInitials(user?.name)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={22} className="text-white" />
                </div>
              </button>
              <div className="absolute -bottom-1 -end-1 w-8 h-8 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-md">
                <Camera size={14} className="text-white" />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="mt-3 text-lg font-bold text-slate-800 dark:text-white">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'employee'}</p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSave}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-4"
          >
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('accPersonalInfo')}</h2>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">{t('accName')}</label>
              <div className="relative">
                <User size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder={t('accNamePlaceholder')}
                  className="w-full ps-10 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">{t('accEmail')}</label>
              <div className="relative">
                <Mail size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={form.email}
                  readOnly
                  className="w-full ps-10 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-sm text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{t('accEmailHint')}</p>
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">{t('accPhone')}</label>
              <div className="relative">
                <Phone size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder={t('accPhonePlaceholder')}
                  className="w-full ps-10 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            {saved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg"
              >
                <CheckCircle size={14} />
                {t('accSaved')}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              <Save size={16} />
              {saving ? t('accSaving') : t('accSaveChanges')}
            </button>
          </motion.form>

          {/* Account Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2"
          >
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('accAccountInfo')}</h2>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{t('accRole')}</span>
              <span className="font-semibold text-slate-800 dark:text-white capitalize">{user?.role || 'employee'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{t('accUsername')}</span>
              <span className="font-semibold text-slate-800 dark:text-white">{user?.username || '-'}</span>
            </div>
            {user?.createdAt && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('accMemberSince')}</span>
                <span className="font-semibold text-slate-800 dark:text-white">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
