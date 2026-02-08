import { useState, useEffect } from 'react';
import { useLocations } from './LocationsContext';
import { useLanguage } from './LanguageContext';
import {
  X,
  Save,
  Calendar,
  Check,
} from 'lucide-react';

export default function LogFormModal({ location, onClose, onSaved }) {
  const { updateLocation } = useLocations();
  const { t, isRtl } = useLanguage();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [bills, setBills] = useState({ 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 });
  const [animatingBill, setAnimatingBill] = useState(null);
  const [isManualAmountEdit, setIsManualAmountEdit] = useState(false);

  // New log form starts empty; previous log data is only shown in the table
  useEffect(() => {
    if (!location) return;
    setBills({ 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 });
    setAmount('');
    setIsManualAmountEdit(true);
    setNotes('');
  }, [location]);

  const getTodayISO = () => new Date().toISOString().slice(0, 10);
  const getTodayFormatted = () => {
    try {
      const d = new Date();
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    } catch {
      return '—';
    }
  };

  const updateBillCount = (billValue, delta) => {
    setAnimatingBill(billValue);
    setBills((prev) => {
      const updated = {
        ...prev,
        [billValue]: Math.max(0, (prev[billValue] || 0) + delta),
      };
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
    onSaved?.();
    onClose();
  };

  if (!location) return null;

  const commissionRate = location.commissionRate ?? 0.4;
  const rate = Math.min(0.99, Math.max(0, parseFloat(commissionRate) || 0.4));
  const totalAmount = parseFloat(amount) || 0;
  const giveToCustomerAmount = totalAmount > 0 ? totalAmount * rate : 0;
  const iReceiveAmount = totalAmount > 0 ? totalAmount * (1 - rate) : 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[95%] max-w-[380px] max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 flex flex-col ${isRtl ? 'text-right' : 'text-left'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-modal-title"
      >
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <h2 id="log-modal-title" className="text-lg font-bold text-slate-800 dark:text-white">
            {t('locationLog')} · {location.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95"
            aria-label={t('close')}
          >
            <X size={22} />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="flex items-stretch gap-2 w-full min-h-12">
            <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-500">
              <div className="flex items-center justify-center gap-1 shrink-0">
                <Calendar size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-tight">{t('logDate')}</p>
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 text-center leading-tight select-none mt-0.5">
                {getTodayFormatted()}
              </p>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-2 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-500">
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 leading-tight">{t('commission')}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {Number.isFinite(rate) ? `${Math.round(rate * 100)}%` : '—'}
            </p>
          </div>

          {location.hasChangeMachine && (
            <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700">
              <Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{t('hasChangeMachine')}</span>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-3.5">
            <label htmlFor="modal-collectionAmount" className="text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-wide block">
              {t('collectionAmount')}
            </label>
            <input
              id="modal-collectionAmount"
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
            <label className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-3.5">{t('bills')}</label>
            <div className="flex flex-wrap gap-2.5">
              {[50, 20, 10, 5, 1].map((billValue) => (
                <div
                  key={billValue}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/60 dark:to-slate-800/60 border-2 border-slate-300 dark:border-slate-500 shadow-md hover:shadow-lg transition-all duration-200 ${
                    animatingBill === billValue ? 'animate-pulse scale-105 ring-2 ring-indigo-400 dark:ring-indigo-500' : ''
                  } ${isRtl ? 'flex-row-reverse' : ''}`}
                >
                  <button
                    onClick={() => updateBillCount(billValue, -1)}
                    disabled={bills[billValue] <= 0}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all duration-150 flex items-center justify-center group text-lg font-bold text-slate-700 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400"
                    aria-label={t('bills')}
                  >
                    −
                  </button>
                  <div className="flex flex-col items-center min-w-[40px] px-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t(`bill${billValue}`)}
                    </span>
                    <span
                      className={`text-lg font-bold text-slate-900 dark:text-slate-100 transition-all duration-200 ${
                        animatingBill === billValue ? 'scale-125 text-indigo-600 dark:text-indigo-400' : ''
                      }`}
                    >
                      {bills[billValue] || 0}
                    </span>
                  </div>
                  <button
                    onClick={() => updateBillCount(billValue, 1)}
                    className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-90 transition-all duration-150 flex items-center justify-center group text-lg font-bold text-slate-700 dark:text-slate-300 group-hover:text-green-600 dark:group-hover:text-green-400"
                    aria-label={t('bills')}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-2">
            <label htmlFor="modal-notes" className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">
              {t('logNotes')}
            </label>
            <textarea
              id="modal-notes"
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
    </>
  );
}
