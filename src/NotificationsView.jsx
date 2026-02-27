import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Menu, Bell, BellOff, Check, CheckCheck, Trash2,
  AlertTriangle, DollarSign, MapPin, Users, Clock, Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MenuDrawer from './MenuDrawer';
import { useLanguage } from './LanguageContext';
import { useLocations } from './LocationsContext';
import { useAuth } from './AuthContext';

const NOTIF_KEY = 'vrm_notifications_v2';
const NOTIF_READ_KEY = 'vrm_notifications_read_v2';
const NO_VISIT_WARN_DAYS = 30;
const NO_VISIT_URGENT_DAYS = 60;
const NO_MONEY_STREAK = 3;

function daysSince(isoDate) {
  if (!isoDate) return null;
  const ms = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function timeAgo(isoDate, t) {
  const days = daysSince(isoDate);
  if (days === null) return '';
  if (days === 0) return t('notifJustNow');
  if (days === 1) return t('notifYesterday');
  if (days < 7) return `${days} ${t('notifDaysAgo')}`;
  if (days < 30) return `${Math.floor(days / 7)} ${t('notifWeeksAgo')}`;
  return `${Math.floor(days / 30)} ${t('notifMonthsAgo')}`;
}

const CATEGORY_CONFIG = {
  visit: { icon: MapPin, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  revenue: { icon: DollarSign, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  alert: { icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  team: { icon: Users, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  system: { icon: Info, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
};

function generateAutoNotifications(locations, t) {
  const notifs = [];
  const now = new Date().toISOString();

  for (const loc of locations || []) {
    const since = daysSince(loc?.lastVisited);

    if (since != null && since >= NO_VISIT_URGENT_DAYS) {
      notifs.push({
        id: `auto-urgent-visit-${loc.id}`,
        category: 'alert',
        title: t('notifUrgentNoVisit'),
        body: `${loc.name} — ${since} ${t('notifDaysNoVisit')}`,
        locationId: loc.id,
        createdAt: now,
        priority: 'high',
      });
    } else if (since != null && since >= NO_VISIT_WARN_DAYS) {
      notifs.push({
        id: `auto-warn-visit-${loc.id}`,
        category: 'visit',
        title: t('notifVisitReminder'),
        body: `${loc.name} — ${since} ${t('notifDaysNoVisit')}`,
        locationId: loc.id,
        createdAt: now,
        priority: 'medium',
      });
    }

    const recentLogs = Array.isArray(loc?.logs) ? loc.logs.slice(0, NO_MONEY_STREAK) : [];
    if (
      recentLogs.length === NO_MONEY_STREAK &&
      recentLogs.every((l) => {
        const n = parseFloat(l?.collection);
        return !l?.collection || Number.isNaN(n) || n <= 0;
      })
    ) {
      notifs.push({
        id: `auto-no-money-${loc.id}`,
        category: 'revenue',
        title: t('notifNoRevenue'),
        body: `${loc.name} — ${NO_MONEY_STREAK} ${t('notifConsecutiveEmpty')}`,
        locationId: loc.id,
        createdAt: now,
        priority: 'high',
      });
    }

    if (loc?.logs?.length > 0) {
      const latestLog = loc.logs[0];
      const val = parseFloat(latestLog?.collection);
      if (!Number.isNaN(val) && val > 0) {
        const logDays = daysSince(latestLog.date);
        if (logDays != null && logDays <= 1) {
          notifs.push({
            id: `auto-collection-${loc.id}-${latestLog.date}`,
            category: 'revenue',
            title: t('notifCollectionRecorded'),
            body: `${loc.name} — $${(val * 20).toLocaleString()}`,
            locationId: loc.id,
            createdAt: latestLog.date ? `${latestLog.date}T12:00:00` : now,
            priority: 'low',
          });
        }
      }
    }
  }

  return notifs;
}

export default function NotificationsView() {
  const navigate = useNavigate();
  const { t, isRtl } = useLanguage();
  const { locations } = useLocations();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [readIds, setReadIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(NOTIF_READ_KEY) || '[]');
      if (Array.isArray(saved)) setReadIds(new Set(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTIF_READ_KEY, JSON.stringify([...readIds]));
  }, [readIds]);

  const autoNotifs = useMemo(() => generateAutoNotifications(locations, t), [locations, t]);

  const allNotifs = useMemo(() => {
    return autoNotifs
      .filter((n) => !dismissedIds.has(n.id))
      .sort((a, b) => {
        const aRead = readIds.has(a.id) ? 1 : 0;
        const bRead = readIds.has(b.id) ? 1 : 0;
        if (aRead !== bRead) return aRead - bRead;
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPri = priorityOrder[a.priority] ?? 1;
        const bPri = priorityOrder[b.priority] ?? 1;
        if (aPri !== bPri) return aPri - bPri;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [autoNotifs, readIds, dismissedIds]);

  const filteredNotifs = useMemo(() => {
    if (filter === 'unread') return allNotifs.filter((n) => !readIds.has(n.id));
    if (filter === 'alert') return allNotifs.filter((n) => n.category === 'alert');
    if (filter === 'visit') return allNotifs.filter((n) => n.category === 'visit');
    if (filter === 'revenue') return allNotifs.filter((n) => n.category === 'revenue');
    return allNotifs;
  }, [allNotifs, filter, readIds]);

  const unreadCount = useMemo(() => allNotifs.filter((n) => !readIds.has(n.id)).length, [allNotifs, readIds]);

  const markRead = useCallback((id) => {
    setReadIds((prev) => new Set([...prev, id]));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => new Set([...prev, ...allNotifs.map((n) => n.id)]));
  }, [allNotifs]);

  const dismiss = useCallback((id) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    setReadIds((prev) => new Set([...prev, id]));
  }, []);

  const handleNotifClick = useCallback((notif) => {
    markRead(notif.id);
    if (notif.locationId) {
      navigate(`/customer/${notif.locationId}`);
    }
  }, [markRead, navigate]);

  const filters = [
    { key: 'all', label: t('notifAll'), count: allNotifs.length },
    { key: 'unread', label: t('notifUnread'), count: unreadCount },
    { key: 'alert', label: t('notifAlerts'), count: allNotifs.filter((n) => n.category === 'alert').length },
    { key: 'revenue', label: t('notifRevenue'), count: allNotifs.filter((n) => n.category === 'revenue').length },
    { key: 'visit', label: t('notifVisits'), count: allNotifs.filter((n) => n.category === 'visit').length },
  ];

  const fadeUp = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.2 },
  };

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] dark:bg-slate-950 overflow-hidden">
      <header
        className="shrink-0 sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[520px] mx-auto w-full px-4 py-2.5 flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(-1)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ${isRtl ? '-me-1' : '-ms-1'}`}
          >
            <ArrowLeft size={22} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <h1 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Bell size={18} />
            {t('notifications')}
          </h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu size={20} />
          </button>
        </div>
        <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <div className="max-w-[520px] mx-auto w-full px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
          {filters.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === chip.key
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {chip.label} ({chip.count})
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[520px] mx-auto w-full px-4 py-4 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-3">

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 font-semibold py-2.5 text-sm transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-950/50 active:scale-[0.98]"
            >
              <CheckCheck size={16} />
              {t('notifMarkAllRead')}
            </button>
          )}

          <AnimatePresence mode="popLayout">
            {filteredNotifs.length === 0 ? (
              <motion.div
                key="empty"
                {...fadeUp}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <BellOff size={24} className="text-slate-400 dark:text-slate-500" />
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{t('notifEmpty')}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('notifEmptyHint')}</p>
              </motion.div>
            ) : (
              filteredNotifs.map((notif) => {
                const isRead = readIds.has(notif.id);
                const catConfig = CATEGORY_CONFIG[notif.category] || CATEGORY_CONFIG.system;
                const CatIcon = catConfig.icon;

                return (
                  <motion.div
                    key={notif.id}
                    layout
                    {...fadeUp}
                    className={`relative bg-white dark:bg-slate-900 border rounded-2xl p-3.5 transition-all active:scale-[0.98] ${
                      isRead
                        ? 'border-slate-200 dark:border-slate-700 opacity-70'
                        : 'border-indigo-200 dark:border-indigo-800/50 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]'
                    }`}
                  >
                    {!isRead && (
                      <div className="absolute top-3.5 end-3.5 w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm" />
                    )}

                    <button
                      type="button"
                      onClick={() => handleNotifClick(notif)}
                      className="w-full text-start"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl ${catConfig.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <CatIcon size={18} className={catConfig.color} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-[13px] font-bold leading-tight ${isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                              {notif.title}
                            </p>
                            {notif.priority === 'high' && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                                {t('notifHigh')}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 leading-relaxed ${isRead ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                            {notif.body}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Clock size={11} className="text-slate-400 dark:text-slate-500" />
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {timeAgo(notif.createdAt, t)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      {!isRead && (
                        <button
                          type="button"
                          onClick={() => markRead(notif.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                        >
                          <Check size={13} />
                          {t('notifMarkRead')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => dismiss(notif.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 size={13} />
                        {t('notifDismiss')}
                      </button>
                      {notif.locationId && (
                        <button
                          type="button"
                          onClick={() => {
                            markRead(notif.id);
                            navigate(`/customer/${notif.locationId}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors ms-auto"
                        >
                          <MapPin size={13} />
                          {t('notifViewCustomer')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
