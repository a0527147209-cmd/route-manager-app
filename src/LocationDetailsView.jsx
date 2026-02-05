import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLocations } from './LocationsContext';
import { useLanguage } from './LanguageContext';
import {
  ArrowLeft,
  Navigation,
  Map as MapLucideIcon,
  Save,
  Menu,
  Check,
  Calendar,
  Clock,
  Plus,
  Minus,
} from 'lucide-react';
import MenuDrawer from './MenuDrawer';

export default function LocationDetailsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const backPath = navState?.fromPath ?? '/locations';
  const { locations, updateLocation } = useLocations();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const [location, setLocation] = useState(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [hasChangeMachine, setHasChangeMachine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [bills, setBills] = useState({ 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 });
  const [animatingBill, setAnimatingBill] = useState(null);

  useEffect(() => {
    setLoading(true);
    const locs = Array.isArray(locations) ? locations : [];
    if (!id || locs.length === 0) {
      setLoading(false);
      return;
    }
    const found = locs.find((l) => l != null && String(l.id) === String(id));
    if (found) {
      setLocation(found);
      setAmount(found.lastCollection ?? '');
      setNotes(found.notes ?? '');
      const rate = found.commissionRate ?? 0.4;
      setCommissionRate(rate != null ? String(rate) : '0.4');
      setHasChangeMachine(!!found.hasChangeMachine);
      setBills(found.bills || { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 });
    }
    setLoading(false);
  }, [id, locations]);

  const getTodayISO = () => new Date().toISOString().slice(0, 10);
  const getTodayFormatted = () => formatVisitDateShort(getTodayISO());

  const handleSave = () => {
    if (!location) return;
    updateLocation(location.id, {
      lastCollection: amount,
      status: location.status ?? 'pending',
      notes,
      commissionRate: location.commissionRate ?? 0.4,
      hasChangeMachine: !!location.hasChangeMachine,
      lastVisited: getTodayISO(),
      bills,
    });
    setShowBackConfirm(false);
    navigate(backPath);
  };

  const hasUnsavedChanges = location && (
    String(amount ?? '').trim() !== String(location.lastCollection ?? '').trim() ||
    String(notes ?? '').trim() !== String(location.notes ?? '').trim() ||
    JSON.stringify(bills) !== JSON.stringify(location.bills || { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 })
  );

  const handleBackClick = () => {
    if (hasUnsavedChanges) setShowBackConfirm(true);
    else navigate(backPath);
  };

  const handleDiscardAndBack = () => {
    setShowBackConfirm(false);
    navigate(backPath);
  };

  const updateBillCount = (billValue, delta) => {
    setAnimatingBill(billValue);
    setBills((prev) => ({
      ...prev,
      [billValue]: Math.max(0, (prev[billValue] || 0) + delta),
    }));
    setTimeout(() => setAnimatingBill(null), 300);
  };

  const openWaze = () => {
    if (!location?.address) return;
    window.open(
      `https://waze.com/ul?q=${encodeURIComponent(location.address)}&navigate=yes`,
      '_blank'
    );
  };

  const openGoogleMaps = () => {
    if (!location?.address) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`,
      '_blank'
    );
  };

  const formatVisitDateShort = (isoStr) => {
    if (!isoStr) return null;
    try {
      const d = new Date(isoStr);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    } catch {
      return null;
    }
  };

  // rate = חלק הלקוח מתוך 100 (למשל 0.4 = 40% ללקוח, 60% אליי)
  const rate = Math.min(0.99, Math.max(0, parseFloat(commissionRate) || 0.4));
  const totalAmount = parseFloat(amount) || 0;
  const giveToCustomerAmount = totalAmount > 0 ? totalAmount * rate : 0;
  const iReceiveAmount = totalAmount > 0 ? totalAmount * (1 - rate) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">{t('loading')}</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
          {t('customerNotFound')}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {t('locationRemovedOrInvalid')}
        </p>
        <button
          onClick={() => navigate(backPath)}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl active:scale-95 transition-all"
        >
          {t('backToLocations')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-10">
      <header className="bg-white dark:bg-slate-800 p-3 min-h-[50px] shadow-sm flex items-center justify-between gap-2 sticky top-0 z-10 shrink-0 max-w-[380px] mx-auto w-full">
        <button
          onClick={handleBackClick}
          className="p-2 -ms-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 shrink-0"
          title={t('backToLocations')}
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0 flex items-center justify-center gap-3 text-center px-2">
          <h1 className="font-bold text-base text-slate-800 dark:text-white truncate">
            Location Log
          </h1>
          <span className="text-slate-400 dark:text-slate-500 shrink-0">·</span>
          <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
            {location.name}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-95"
            title={t('menu')}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {showBackConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowBackConfirm(false)} aria-hidden="true" />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90%] max-w-[320px] bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 border border-slate-200 dark:border-slate-600">
            <p className="text-base font-semibold text-slate-800 dark:text-white mb-4 text-center">
              {t('saveChangesConfirm')}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm active:scale-[0.98]"
              >
                {t('yes')}
              </button>
              <button
                type="button"
                onClick={handleDiscardAndBack}
                className="flex-1 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold text-sm active:scale-[0.98]"
              >
                {t('discardChanges')}
              </button>
              <button
                type="button"
                onClick={() => setShowBackConfirm(false)}
                className="flex-1 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm active:scale-[0.98]"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="p-4 space-y-4 max-w-[380px] mx-auto w-full flex-1">
        <div className="flex items-stretch gap-2 w-full min-h-14">
          <button
            onClick={openWaze}
            className="flex-1 min-w-0 flex flex-col items-center justify-center p-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700 shadow-md shadow-blue-200/50 dark:shadow-blue-900/30 hover:shadow-lg hover:shadow-blue-300/60 dark:hover:shadow-blue-800/40 hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-600 active:scale-[0.98] active:shadow-sm transition-all duration-200 cursor-pointer"
            title={t('waze')}
          >
            <Navigation size={18} className="shrink-0" />
            <span className="text-[9px] font-semibold mt-0.5 truncate w-full text-center">{t('waze')}</span>
          </button>
          <button
            onClick={openGoogleMaps}
            className="flex-1 min-w-0 flex flex-col items-center justify-center p-1.5 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-300 dark:border-green-700 shadow-md shadow-green-200/50 dark:shadow-green-900/30 hover:shadow-lg hover:shadow-green-300/60 dark:hover:shadow-green-800/40 hover:scale-[1.02] hover:border-green-400 dark:hover:border-green-600 active:scale-[0.98] active:shadow-sm transition-all duration-200 cursor-pointer"
            title={t('maps')}
          >
            <MapLucideIcon size={18} className="shrink-0" />
            <span className="text-[9px] font-semibold mt-0.5 truncate w-full text-center">{t('maps')}</span>
          </button>
          <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-500">
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 leading-tight">{t('commission')}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {Number.isFinite(parseFloat(commissionRate)) ? `${Math.round(parseFloat(commissionRate) * 100)}%` : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-stretch gap-2 w-full min-h-12">
          <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-500" title={t('logDate')}>
            <div className="flex items-center justify-center gap-1 shrink-0">
              <Calendar size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-tight">
                {t('logDate')}
              </p>
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 text-center leading-tight select-none mt-0.5">
              {getTodayFormatted()}
            </p>
          </div>
          <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-500">
            <div className="flex items-center justify-center gap-1 shrink-0">
              <Clock size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-tight">
                {t('lastVisit')}
              </p>
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 text-center leading-tight mt-0.5">
              {location.lastVisited ? formatVisitDateShort(location.lastVisited) : '—'}
            </p>
          </div>
        </div>

        {location.hasChangeMachine && (
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
            <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700">
              <Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                {t('hasChangeMachine')}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-3">
          <label htmlFor="collectionAmount" className="text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-wide">
            {t('collectionAmount')}
          </label>
          <input
            id="collectionAmount"
            name="collectionAmount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2.5 text-lg font-semibold rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 placeholder:text-amber-400 dark:placeholder:text-amber-500 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="grid grid-cols-1 gap-2.5 pt-1.5">
            <div>
              <label className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wide block mb-1">
                {t('giveToCustomer')} ({Math.round(rate * 100)}%)
              </label>
              <div className="px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 font-semibold text-sm">
                {totalAmount > 0 ? giveToCustomerAmount.toFixed(2) : '—'}
              </div>
            </div>
            <div>
              <label className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wide block mb-1">
                {t('iReceive')} ({Math.round((1 - rate) * 100)}%)
              </label>
              <div className="px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 font-semibold text-sm">
                {totalAmount > 0 ? iReceiveAmount.toFixed(2) : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
          <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-3">
            {t('bills')}
          </label>
          <div className="flex flex-wrap gap-2.5">
            {[50, 20, 10, 5, 1].map((billValue) => (
              <div
                key={billValue}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/60 dark:to-slate-800/60 border-2 border-slate-300 dark:border-slate-500 shadow-md hover:shadow-lg transition-all duration-200 ${
                  animatingBill === billValue ? 'animate-pulse scale-105 ring-2 ring-indigo-400 dark:ring-indigo-500' : ''
                }`}
              >
                <button
                  onClick={() => updateBillCount(billValue, -1)}
                  disabled={bills[billValue] <= 0}
                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all duration-150 flex items-center justify-center group"
                  aria-label={`Decrease ${billValue}`}
                >
                  <Minus size={18} className="text-slate-700 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                </button>
                <div className="flex flex-col items-center min-w-[40px] px-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t(`bill${billValue}`)}
                  </span>
                  <span className={`text-lg font-bold text-slate-900 dark:text-slate-100 transition-all duration-200 ${
                    animatingBill === billValue ? 'scale-125 text-indigo-600 dark:text-indigo-400' : ''
                  }`}>
                    {bills[billValue] || 0}
                  </span>
                </div>
                <button
                  onClick={() => updateBillCount(billValue, 1)}
                  className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-90 transition-all duration-150 flex items-center justify-center group"
                  aria-label={`Increase ${billValue}`}
                >
                  <Plus size={18} className="text-slate-700 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-2">
          <label htmlFor="notes" className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">
            {t('notes')}
          </label>
          <textarea
            id="notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            rows={3}
            className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all text-sm"
        >
          <Save size={18} />
          <span>{t('saveWord')}</span>
          <span className="ms-1.5">{t('logWord')}</span>
        </button>
      </div>
    </div>
  );
}
