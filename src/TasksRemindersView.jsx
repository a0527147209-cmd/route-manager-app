import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, CheckCircle2, Circle, Clock3, Trash2 } from 'lucide-react';
import BackButton from './BackButton';
import { useLocations } from './LocationsContext';
import { useLanguage } from './LanguageContext';
import MenuDrawer from './MenuDrawer';

const MANUAL_TASKS_KEY = 'vrm_manual_tasks_v1';
const AUTO_TASK_STATE_KEY = 'vrm_auto_task_state_v1';
const NO_VISIT_DAYS = 35;
const NO_VISIT_HIGH_DAYS = 65;
const NO_MONEY_STREAK = 2;

function toIsoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function daysSince(isoDate) {
  if (!isoDate) return null;
  const ms = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function isNoMoney(value) {
  const n = parseFloat(value);
  return !value || Number.isNaN(n) || n <= 0;
}

function formatUsDate(isoDate) {
  if (!isoDate) return '-';
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export default function TasksRemindersView() {
  const navigate = useNavigate();
  const { locations } = useLocations();
  const { t, isRtl } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [manualTasks, setManualTasks] = useState([]);
  const [autoTaskState, setAutoTaskState] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerOptions, setShowCustomerOptions] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    locationId: '',
    priority: 'medium',
    dueDate: toIsoDate(Date.now()),
    notes: '',
  });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MANUAL_TASKS_KEY) || '[]');
      if (Array.isArray(saved)) setManualTasks(saved);
    } catch {
      setManualTasks([]);
    }
    try {
      const savedState = JSON.parse(localStorage.getItem(AUTO_TASK_STATE_KEY) || '{}');
      if (savedState && typeof savedState === 'object') setAutoTaskState(savedState);
    } catch {
      setAutoTaskState({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(MANUAL_TASKS_KEY, JSON.stringify(manualTasks));
  }, [manualTasks]);

  useEffect(() => {
    localStorage.setItem(AUTO_TASK_STATE_KEY, JSON.stringify(autoTaskState));
  }, [autoTaskState]);

  const autoTasks = useMemo(() => {
    const items = [];
    for (const loc of locations || []) {
      const since = daysSince(loc?.lastVisited);
      if (since != null && since >= NO_VISIT_DAYS) {
        items.push({
          id: `auto-no-visit-${loc.id}`,
          source: 'auto',
          locationId: loc.id,
          locationName: loc?.name || 'Unknown',
          title: t('autoTaskNoVisitTitle'),
          subtitle: (t('autoTaskNoVisitBody') || '').replace('{days}', String(NO_VISIT_DAYS)) || `No visit in the last ${NO_VISIT_DAYS} days`,
          priority: since >= NO_VISIT_HIGH_DAYS ? 'high' : 'medium',
          dueDate: toIsoDate(Date.now()),
          status: 'open',
        });
      }

      const recentLogs = Array.isArray(loc?.logs) ? loc.logs.slice(0, NO_MONEY_STREAK) : [];
      if (recentLogs.length === NO_MONEY_STREAK && recentLogs.every((l) => isNoMoney(l?.collection))) {
        items.push({
          id: `auto-no-money-${loc.id}`,
          source: 'auto',
          locationId: loc.id,
          locationName: loc?.name || 'Unknown',
          title: t('autoTaskNoMoneyTitle'),
          subtitle: (t('autoTaskNoMoneyBody') || '').replace('{count}', String(NO_MONEY_STREAK)) || `${NO_MONEY_STREAK} visits in a row with no collection`,
          priority: 'high',
          dueDate: toIsoDate(Date.now()),
          status: 'open',
        });
      }
    }
    return items;
  }, [locations, t]);

  const mergedTasks = useMemo(() => {
    const now = Date.now();
    const autoVisible = autoTasks
      .filter((task) => {
        const state = autoTaskState[task.id];
        if (!state) return true;
        if (state.status === 'done') return false;
        if (state.status === 'snoozed' && state.snoozeUntil && new Date(state.snoozeUntil).getTime() > now) return false;
        return true;
      })
      .map((task) => ({ ...task, ...(autoTaskState[task.id] || {}) }));

    return [...manualTasks, ...autoVisible].sort((a, b) => {
      const aDone = a.status === 'done' ? 1 : 0;
      const bDone = b.status === 'done' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });
  }, [manualTasks, autoTasks, autoTaskState]);

  const filteredTasks = useMemo(() => {
    const today = toIsoDate(Date.now());
    if (filter === 'done') return mergedTasks.filter((x) => x.status === 'done');
    if (filter === 'today') return mergedTasks.filter((x) => x.status !== 'done' && x.dueDate === today);
    if (filter === 'overdue') return mergedTasks.filter((x) => x.status !== 'done' && x.dueDate && x.dueDate < today);
    return mergedTasks;
  }, [mergedTasks, filter]);

  const counts = useMemo(() => {
    const today = toIsoDate(Date.now());
    return {
      all: mergedTasks.length,
      overdue: mergedTasks.filter((x) => x.status !== 'done' && x.dueDate && x.dueDate < today).length,
      today: mergedTasks.filter((x) => x.status !== 'done' && x.dueDate === today).length,
      done: mergedTasks.filter((x) => x.status === 'done').length,
    };
  }, [mergedTasks]);

  const customerOptions = useMemo(
    () => [...(locations || [])].sort((a, b) => (a?.name || '').localeCompare(b?.name || '')),
    [locations]
  );

  const filteredCustomerOptions = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customerOptions.slice(0, 30);
    return customerOptions
      .filter((loc) => [loc?.name, loc?.address, loc?.city].filter(Boolean).join(' ').toLowerCase().includes(q))
      .slice(0, 30);
  }, [customerOptions, customerQuery]);

  function upsertTaskStatus(task, status, extra = {}) {
    if (task.source === 'auto') {
      setAutoTaskState((prev) => ({
        ...prev,
        [task.id]: { ...(prev[task.id] || {}), status, ...extra },
      }));
      return;
    }
    setManualTasks((prev) => prev.map((x) => (x.id === task.id ? { ...x, status, ...extra } : x)));
  }

  function removeTask(taskId) {
    setManualTasks((prev) => prev.filter((x) => x.id !== taskId));
  }

  function submitTask(e) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    let loc = locations.find((x) => x.id === draft.locationId);
    if (!loc && customerQuery.trim()) {
      loc = locations.find((x) => (x?.name || '').toLowerCase() === customerQuery.trim().toLowerCase());
    }
    const newTask = {
      id: `manual-${Date.now()}`,
      source: 'manual',
      title: draft.title.trim(),
      subtitle: draft.notes.trim(),
      locationId: loc?.id || '',
      locationName: loc?.name || '',
      priority: draft.priority,
      dueDate: draft.dueDate,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setManualTasks((prev) => [newTask, ...prev]);
    setIsCreating(false);
    setDraft({
      title: '',
      locationId: '',
      priority: 'medium',
      dueDate: toIsoDate(Date.now()),
      notes: '',
    });
    setCustomerQuery('');
    setShowCustomerOptions(false);
  }

  return (
    <div className="h-full flex flex-col bg-[#F5F6F8] dark:bg-slate-950 overflow-hidden">
      <header className="shrink-0 sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-[520px] mx-auto w-full px-4 py-2.5 flex items-center justify-between gap-2">
          <BackButton onClick={() => navigate(-1)} />
          <h1 className="text-base font-bold text-slate-800 dark:text-white">{t('tasksReminders')}</h1>
          <button onClick={() => setMenuOpen(true)} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Menu size={20} />
          </button>
        </div>
        <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <div className="max-w-[520px] mx-auto w-full px-4 pb-2 flex gap-2 overflow-x-auto">
          {[
            { key: 'all', label: t('taskFilterAll'), count: counts.all },
            { key: 'overdue', label: t('taskFilterOverdue'), count: counts.overdue },
            { key: 'today', label: t('taskFilterToday'), count: counts.today },
            { key: 'done', label: t('taskFilterDone'), count: counts.done },
          ].map((chip) => (
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
          <button
            type="button"
            onClick={() => setIsCreating((v) => !v)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 transition-colors"
          >
            <Plus size={16} />
            {t('addTask')}
          </button>

          {isCreating && (
            <form onSubmit={submitTask} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 space-y-2">
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={t('taskTitle')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={customerQuery}
                    onFocus={() => setShowCustomerOptions(true)}
                    onBlur={() => setTimeout(() => setShowCustomerOptions(false), 120)}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      setShowCustomerOptions(true);
                      setDraft((prev) => ({ ...prev, locationId: '' }));
                    }}
                    placeholder={t('taskSearchCustomer')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {showCustomerOptions && filteredCustomerOptions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-44 overflow-auto">
                      {filteredCustomerOptions.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setDraft((prev) => ({ ...prev, locationId: loc.id }));
                            setCustomerQuery(loc.name || '');
                            setShowCustomerOptions(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {loc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={draft.priority}
                  onChange={(e) => setDraft((prev) => ({ ...prev, priority: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => setDraft((prev) => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white outline-none"
              />
              <input
                type="text"
                value={draft.notes}
                onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder={t('taskNotes')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm dark:text-white outline-none"
              />
              <button type="submit" className="w-full py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm">
                {t('saveTask')}
              </button>
            </form>
          )}

          {filteredTasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
              <p className="font-semibold text-slate-700 dark:text-slate-200">{t('noTasksYet')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('noTasksHint')}</p>
            </div>
          ) : filteredTasks.map((task) => {
            const overdue = task.status !== 'done' && task.dueDate && task.dueDate < toIsoDate(Date.now());
            return (
              <div key={task.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{task.locationName || t('other')}</p>
                    {task.subtitle ? (
                      <p
                        className={`mt-1 ${
                          task.id?.startsWith('auto-no-money-')
                            ? 'text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md inline-block'
                            : 'text-xs font-medium text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {task.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    task.priority === 'high'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                      : task.priority === 'medium'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {task.priority}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Clock3 size={13} />
                  <span dir="ltr" className={`inline-block ${overdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>
                    {formatUsDate(task.dueDate)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {task.status === 'done' ? (
                    <button type="button" onClick={() => upsertTaskStatus(task, 'open')} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                      {t('reopen')}
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => upsertTaskStatus(task, 'done')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white">
                        <CheckCircle2 size={14} />
                        {t('markDone')}
                      </button>
                      <button
                        type="button"
                        onClick={() => upsertTaskStatus(task, 'snoozed', { snoozeUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        <Circle size={14} />
                        {t('snooze24h')}
                      </button>
                    </>
                  )}
                  {task.source === 'manual' && (
                    <button type="button" onClick={() => removeTask(task.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                      <Trash2 size={13} />
                      {t('remove')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
