import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLocations } from './LocationsContext';
import { useLanguage } from './LanguageContext';
import {
  ArrowLeft,
  Navigation,
  Map as MapLucideIcon,
  Menu,
  Building,
  MapPin,
  Check,
  Pencil,
  Plus,
} from 'lucide-react';
import MenuDrawer from './MenuDrawer';
import LogFormModal from './LogFormModal';

export default function CustomerDetailsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const backPath = navState?.fromPath ?? '/customers';
  const { locations, updateLocation } = useLocations();
  const { t, isRtl } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  const [location, setLocation] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

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
      setNotes(found.notes ?? '');
    }
    setLoading(false);
  }, [id, locations]);

  const handleSaveNotes = () => {
    if (!location) return;
    updateLocation(location.id, {
      notes,
    });
    setIsEditingNotes(false);
  };

  const handleCancelEdit = () => {
    setNotes(location?.notes ?? '');
    setIsEditingNotes(false);
  };

  const hasUnsavedChanges = location && isEditingNotes && (
    String(notes ?? '').trim() !== String(location.notes ?? '').trim()
  );

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      if (window.confirm(t('saveChangesConfirm'))) {
        handleSaveNotes();
      } else {
        handleCancelEdit();
      }
    }
    navigate(backPath);
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

  const formatLogDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const formatBillsSummary = (billsObj) => {
    if (!billsObj || typeof billsObj !== 'object') return '—';
    const parts = [50, 20, 10, 5, 1]
      .filter((v) => billsObj[v] > 0)
      .map((v) => `${v}×${billsObj[v]}`);
    return parts.length ? parts.join(', ') : '—';
  };

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
          {t('backToCustomers')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-10">
      <header className="bg-white dark:bg-slate-800 p-3 min-h-[50px] shadow-sm flex items-center justify-between gap-2 sticky top-0 z-10 shrink-0 max-w-[380px] mx-auto w-full">
        <button
          onClick={handleBackClick}
          className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 shrink-0 ${isRtl ? '-me-1' : '-ms-1'}`}
          title={t('backToCustomers')}
        >
          <ArrowLeft size={22} className={isRtl ? 'rotate-180' : ''} />
        </button>
        <div className="flex-1 min-w-0 flex items-center justify-center gap-3 text-center px-2">
          <h1 className="font-bold text-base text-slate-800 dark:text-white truncate">
            {location.name}
          </h1>
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

      {showLogModal && (
        <LogFormModal
          location={location}
          onClose={() => setShowLogModal(false)}
          onSaved={() => setShowLogModal(false)}
        />
      )}

      {/* Floating Add Log popup-style button */}
      <button
        onClick={() => setShowLogModal(true)}
        className={`fixed bottom-6 z-50 px-5 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/40 flex items-center justify-center gap-2 active:scale-95 transition-all ${isRtl ? 'left-6' : 'right-6'} ${isRtl ? 'flex-row-reverse' : ''}`}
        style={{ marginLeft: 'max(env(safe-area-inset-left), 0.5rem)', marginRight: 'max(env(safe-area-inset-right), 0.5rem)' }}
        title={t('addLog')}
        aria-label={t('addLog')}
      >
        <Plus size={22} className="shrink-0" />
        <span className="font-semibold text-sm whitespace-nowrap">{t('addLog')}</span>
      </button>

      <div className="p-4 space-y-4 max-w-[380px] mx-auto w-full flex-1 pb-20">
        {/* Customer Info Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 shrink-0">
              <Building size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                {location.name}
              </h2>
              {location.address && (
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <MapPin size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                  <span className="break-words">{location.address}</span>
                </div>
              )}
              {(location.city || location.state) && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {[location.city, location.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions Row */}
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
              {location.commissionRate ? `${Math.round((location.commissionRate || 0.4) * 100)}%` : '—'}
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

        {/* Customer Notes */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="notes" className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">
              {t('notes')}
            </label>
            {!isEditingNotes && (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors active:scale-95"
                title={t('edit')}
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
          {isEditingNotes ? (
            <>
              <textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                rows={4}
                className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"
                >
                  <span>{t('saveWord')}</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 rounded-lg shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"
                >
                  {t('cancel')}
                </button>
              </div>
            </>
          ) : (
            <div
              onClick={() => setIsEditingNotes(true)}
              className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-500 min-h-[80px] cursor-text"
            >
              {location?.notes ? (
                <p className="text-slate-800 dark:text-white whitespace-pre-wrap">{location.notes}</p>
              ) : (
                <p className="text-slate-400 dark:text-slate-500 italic">{t('notesPlaceholder')}</p>
              )}
            </div>
          )}
        </div>

        {/* Log History - open table by default */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-600 overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-600/30">
          <h2 className="px-4 py-3.5 text-base font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-600 bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-950/30 dark:to-slate-800/80">
            {t('logHistory')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-700/50">
                  <th className={`px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-600 ${isRtl ? 'text-right' : 'text-left'} `}>
                    {t('lastVisit')}
                  </th>
                  <th className={`px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-600 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('commission')}
                  </th>
                  <th className={`px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-600 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('collectionAmount')}
                  </th>
                  <th className={`px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-600 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('bills')}
                  </th>
                  <th className={`px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-600 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('notes')}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors">
                  <td className={`px-4 py-3.5 text-slate-800 dark:text-slate-200 font-medium border-b border-slate-100 dark:border-slate-700/80 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {formatLogDate(location?.lastVisited)}
                  </td>
                  <td className={`px-4 py-3.5 text-slate-800 dark:text-slate-200 font-medium border-b border-slate-100 dark:border-slate-700/80 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {location?.commissionRate != null ? `${Math.round(Number(location.commissionRate) * 100)}%` : '—'}
                  </td>
                  <td className={`px-4 py-3.5 text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-100 dark:border-slate-700/80 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {location?.lastCollection != null && String(location.lastCollection).trim() !== '' ? Number(location.lastCollection).toFixed(2) : '—'}
                  </td>
                  <td className={`px-4 py-3.5 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/80 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {formatBillsSummary(location?.bills)}
                  </td>
                  <td className={`px-4 py-3.5 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/80 max-w-[140px] truncate ${isRtl ? 'text-right' : 'text-left'}`} title={location?.notes ?? ''}>
                    {location?.notes ? (location.notes.length > 24 ? `${location.notes.slice(0, 24)}…` : location.notes) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
