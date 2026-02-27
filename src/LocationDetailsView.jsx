import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLocations } from './LocationsContext';
import { useLanguage } from './LanguageContext';
import BackButton from './BackButton';
import {
  Navigation,
  Map as MapLucideIcon,
  Save,
  Menu,
  Check,
  Calendar,
  Clock,
  Plus,
  Minus,
  MoreVertical,
} from 'lucide-react';
import MenuDrawer from './MenuDrawer';

export default function LocationDetailsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const backPath = navState?.fromPath ?? '/locations';
  const { locations, updateLocation } = useLocations();
  const { t, isRtl } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);

  const [location, setLocation] = useState(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [bills, setBills] = useState({ 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 });
  const [animatingBill, setAnimatingBill] = useState(null);
  const [isManualAmountEdit, setIsManualAmountEdit] = useState(false);

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
      const savedBills = found.bills || { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 };
      setBills(savedBills);
      // Calculate total from bills if bills exist, otherwise use saved amount
      const billsTotal = Object.entries(savedBills).reduce((sum, [value, count]) => {
        return sum + (parseFloat(value) || 0) * (count || 0);
      }, 0);
      if (billsTotal > 0) {
        setAmount(billsTotal.toFixed(2));
        setIsManualAmountEdit(false);
      } else {
        setAmount(found.lastCollection ?? '');
        setIsManualAmountEdit(true);
      }
      setNotes(found.logNotes ?? found.notes ?? '');
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
      logNotes: notes,
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
    String(notes ?? '').trim() !== String(location.logNotes ?? location.notes ?? '').trim() ||
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
    setBills((prev) => {
      const updated = {
        ...prev,
        [billValue]: Math.max(0, (prev[billValue] || 0) + delta),
      };
      // Auto-calculate total from bills
      const billsTotal = Object.entries(updated).reduce((sum, [value, count]) => {
        return sum + (parseFloat(value) || 0) * (count || 0);
      }, 0);
      if (billsTotal > 0) {
        setAmount(billsTotal.toFixed(2));
        setIsManualAmountEdit(false);
      } else {
        setAmount('');
        setIsManualAmountEdit(true);
      }
      return updated;
    });
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
    navigate(`/maps?q=${encodeURIComponent(location.address)}`);
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
  const commissionRate = location?.commissionRate ?? 0.4;
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
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <header className="shrink-0 bg-white dark:bg-slate-800 p-3 min-h-[50px] shadow-sm flex items-center justify-between gap-2 z-10 max-w-[380px] mx-auto w-full" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <BackButton onClick={handleBackClick} title={t('backToLocations')} />
        <div className="flex-1 min-w-0 flex items-center justify-center gap-3 text-center px-2">
          <h1 className="font-bold text-base text-slate-800 dark:text-white truncate">
            {t('locationLog')}
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
          <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90%] max-w-[320px] bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 border border-slate-200 dark:border-slate-600 ${isRtl ? 'text-right' : 'text-left'}`}>
            <p className="text-base font-semibold text-slate-800 dark:text-white mb-4 text-center">
              {t('saveChangesConfirm')}
            </p>
            <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
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

      <div className="flex-1 overflow-y-auto p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-4 max-w-[380px] mx-auto w-full">
        <div className="flex items-stretch gap-2.5 w-full">
          <div className="relative shrink-0 flex">
            <button
              onClick={() => setShowNavMenu((v) => !v)}
              className="flex items-center justify-center px-2.5 py-3 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
              title={t('maps')}
            >
              <MoreVertical size={20} className="text-slate-600 dark:text-slate-300" />
            </button>
            {showNavMenu && (
              <>
                <div className="fixed inset-0 z-[50]" onClick={() => setShowNavMenu(false)} />
                <div className={`absolute top-full mt-1.5 z-[51] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden min-w-[150px] ${isRtl ? 'right-0' : 'left-0'}`}>
                  <button
                    onClick={() => { openWaze(); setShowNavMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <Navigation size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('waze')}</span>
                  </button>
                  <div className="border-t border-slate-100 dark:border-slate-700" />
                  <button
                    onClick={() => { openGoogleMaps(); setShowNavMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  >
                    <MapLucideIcon size={18} className="text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('maps')}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('lastVisit')}</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {location.lastVisited ? formatVisitDateShort(location.lastVisited) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('lastCollection')}</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {location.lastCollection || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('logUser')}</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {location.logs?.[0]?.user || '—'}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-500">
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 leading-tight">{t('commission')}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {Number.isFinite(rate) ? `${Math.round(rate * 100)}%` : '—'}
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

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-3.5">
          <label htmlFor="collectionAmount" className="text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-wide block">
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
            onChange={(e) => {
              setAmount(e.target.value);
              setIsManualAmountEdit(true);
            }}
            placeholder={isRtl ? '0.00' : '0.00'}
            className={`w-full px-3 py-2.5 text-lg font-semibold rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 placeholder:text-amber-400 dark:placeholder:text-amber-500 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isRtl ? 'text-right' : 'text-left'}`}
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

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
          <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-3.5">
            {t('bills')}
          </label>
          <div className="flex flex-wrap gap-2.5">
            {[50, 20, 10, 5, 1].map((billValue) => (
              <div
                key={billValue}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/60 dark:to-slate-800/60 border-2 border-slate-300 dark:border-slate-500 shadow-md hover:shadow-lg transition-all duration-200 ${animatingBill === billValue ? 'animate-pulse scale-105 ring-2 ring-indigo-400 dark:ring-indigo-500' : ''
                  } ${isRtl ? 'flex-row-reverse' : ''}`}
              >
                <button
                  onClick={() => updateBillCount(billValue, -1)}
                  disabled={bills[billValue] <= 0}
                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all duration-150 flex items-center justify-center group"
                  aria-label={t('bills')}
                >
                  <Minus size={18} className="text-slate-700 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                </button>
                <div className="flex flex-col items-center min-w-[40px] px-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t(`bill${billValue}`)}
                  </span>
                  <span className={`text-lg font-bold text-slate-900 dark:text-slate-100 transition-all duration-200 ${animatingBill === billValue ? 'scale-125 text-indigo-600 dark:text-indigo-400' : ''
                    }`}>
                    {bills[billValue] || 0}
                  </span>
                </div>
                <button
                  onClick={() => updateBillCount(billValue, 1)}
                  className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-90 transition-all duration-150 flex items-center justify-center group"
                  aria-label={t('bills')}
                >
                  <Plus size={18} className="text-slate-700 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-2">
          <label htmlFor="notes" className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">
            {t('logNotes')}
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
          className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all text-sm ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <Save size={18} />
          <span>{t('saveWord')}</span>
          <span className={isRtl ? 'me-0.5' : 'ms-0.5'}>{t('logWord')}</span>
        </button>
      </div>
    </div>
  );
}
