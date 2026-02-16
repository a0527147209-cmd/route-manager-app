import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLocations } from './LocationsContext';
import { useLanguage } from './LanguageContext';
import {
  ArrowLeft,
  Menu,
  Building,
  MapPin,
  Check,
  Pencil,
  Plus,
  ChevronDown,
  X,
  Trash2,
  Save,
} from 'lucide-react';
import { WazeLogo, GoogleMapsLogo } from './BrandIcons';
import MenuDrawer from './MenuDrawer';
import LogFormModal from './LogFormModal';

import { useAuth } from './AuthContext';
import { useConfirmation } from './ConfirmationContext';

export default function CustomerDetailsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const backPath = navState?.fromPath ?? '/customers';
  const { locations, updateLocation, removeLocation, removeLog } = useLocations();
  const { t, isRtl } = useLanguage();
  const { isAdmin, user } = useAuth();
  const { confirm } = useConfirmation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [viewingLogNote, setViewingLogNote] = useState(null);

  // Edit Log State
  const [editingLog, setEditingLog] = useState(null);
  const [editingLogIndex, setEditingLogIndex] = useState(-1);

  const [location, setLocation] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Customer Edit Mode
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editForm, setEditForm] = useState({});

  const startEditingCustomer = () => {
    setEditForm({
      name: location?.name ?? '',
      address: location?.address ?? '',
      locationType: location?.locationType ?? '',
      city: location?.city ?? '',
      state: location?.state ?? '',
      zipCode: location?.zipCode ?? '',
      subtitle: location?.subtitle ?? '',
      commissionRate: location?.commissionRate ? Math.round(location.commissionRate * 100) : 40,
      changeMachineCount: location?.changeMachineCount ?? (location?.hasChangeMachine ? 1 : 0),
    });
    setIsEditingCustomer(true);
  };

  const handleSaveCustomer = () => {
    if (!location || !editForm.name?.trim()) return;
    updateLocation(location.id, {
      name: editForm.name.trim(),
      address: editForm.address.trim(),
      locationType: (editForm.locationType || '').trim(),
      city: editForm.city.trim(),
      state: editForm.state.trim(),
      zipCode: (editForm.zipCode || '').trim(),
      subtitle: (editForm.subtitle || '').trim(),
      commissionRate: (parseFloat(editForm.commissionRate) || 40) / 100,
      changeMachineCount: parseInt(editForm.changeMachineCount) || 0,
      hasChangeMachine: false,
    });
    setIsEditingCustomer(false);
  };

  const handleCancelCustomerEdit = () => {
    setIsEditingCustomer(false);
    setEditForm({});
  };

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

  const handleBackClick = async () => {
    if (hasUnsavedChanges) {
      if (await confirm({
        title: t('saveChanges') || 'Save Changes?',
        message: t('saveChangesConfirm') || 'Do you want to save your changes before leaving?',
        confirmText: t('saveWord') || 'Save',
        cancelText: t('discard') || 'Discard'
      })) {
        handleSaveNotes();
      } else {
        handleCancelEdit();
      }
    }
    navigate(backPath);
  };

  const handleEditLog = async (log, index) => {
    // "Hard to edit" - confirmation dialog
    if (await confirm({
      title: t('editLog') || 'Edit Log',
      message: t('confirmEditLog') || 'Editing historical logs will change financial data. Are you sure?',
      confirmText: t('continue') || 'Continue',
      cancelText: t('cancel') || 'Cancel'
    })) {
      setEditingLog(log);
      setEditingLogIndex(index);
      setShowLogModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowLogModal(false);
    setEditingLog(null);
    setEditingLogIndex(-1);
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

  const formatLogDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (Number.isNaN(d.getTime())) return '—';
      // Requested format: Month Day Year (MM/DD/YYYY numeric)
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const calculateIReceive = (log) => {
    const collection = parseFloat(log.collection) || 0;
    const rate = parseFloat(log.commissionRate) || 0;
    return (collection * (1 - rate)).toFixed(2);
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
          <h1 className="font-bold text-base text-slate-800 dark:text-white break-words leading-tight">
            {location.name}
          </h1>
        </div>
        <div className={`flex items-center gap-1.5 shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setShowLogModal(true)}
            className="p-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            title={t('addLog')}
            aria-label={t('addLog')}
          >
            <Plus size={20} className="shrink-0" />
            <span className="font-semibold text-xs whitespace-nowrap">{t('addLog')}</span>
          </button>
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
          onClose={handleCloseModal}
          onSaved={handleCloseModal}
          initialLog={editingLog}
          logIndex={editingLogIndex}
        />
      )}



      <div className="p-4 space-y-4 max-w-[380px] mx-auto w-full flex-1">
        {/* Customer Info Card */}
        {isEditingCustomer ? (
          <div className="bg-card p-4 rounded-xl shadow-sm border-2 border-primary/40 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Pencil size={16} className="text-primary" />
                <span className="text-sm font-bold text-primary">{t('edit') || 'עריכה'}</span>
              </div>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5 block">{t('name') || 'שם'}</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:text-white transition-all"
                  placeholder={t('name') || 'שם'}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5 block">{t('address') || 'כתובת'}</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:text-white transition-all"
                  placeholder={t('address') || 'כתובת'}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5 block">{t('locationType') || 'סוג מיקום'}</label>
                <input
                  type="text"
                  value={editForm.locationType}
                  onChange={(e) => setEditForm(f => ({ ...f, locationType: e.target.value }))}
                  className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:text-white transition-all"
                  placeholder={t('locationTypePlaceholder') || 'למשל: מסעדה, חנות, מרכול...'}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5 block">{t('city') || 'עיר'}</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:text-white transition-all"
                    placeholder={t('city') || 'עיר'}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5 block">{t('state') || 'מדינה'}</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm(f => ({ ...f, state: e.target.value }))}
                    className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:text-white transition-all"
                    placeholder={t('state') || 'מדינה'}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5 block">{t('zipCode') || 'מיקוד'}</label>
                <input
                  type="text"
                  value={editForm.zipCode}
                  onChange={(e) => setEditForm(f => ({ ...f, zipCode: e.target.value }))}
                  className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:text-white transition-all"
                  placeholder={t('zipCode') || 'מיקוד'}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5 block">{t('subtitle') || 'תיאור קצר'}</label>
                <input
                  type="text"
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm(f => ({ ...f, subtitle: e.target.value }))}
                  className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:text-white transition-all"
                  placeholder={t('subtitlePlaceholder') || 'טקסט שיוצג בתצוגה הראשית'}
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5 block">{t('commission') || 'עמלה'} (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.commissionRate}
                    onChange={(e) => setEditForm(f => ({ ...f, commissionRate: e.target.value }))}
                    className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:text-white transition-all"
                  />
                </div>
              )}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5 block">{t('changeMachine') || 'מכונת עודף'}</label>
                <select
                  value={editForm.changeMachineCount}
                  onChange={(e) => setEditForm(f => ({ ...f, changeMachineCount: e.target.value }))}
                  className="w-full p-2.5 text-sm bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary dark:text-white transition-all"
                >
                  <option value={0}>{t('none') || 'ללא'}</option>
                  <option value={1}>x1 Change Machine</option>
                  <option value={2}>x2 Change Machine</option>
                  <option value={3}>x3 Change Machine</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveCustomer}
                disabled={!editForm.name?.trim()}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"
              >
                <Save size={16} />
                <span>{t('saveWord') || 'שמור'}</span>
              </button>
              <button
                onClick={handleCancelCustomerEdit}
                className="flex-1 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm"
              >
                <X size={16} />
                <span>{t('cancel') || 'ביטול'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Building size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-foreground mb-1">
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
              <button
                onClick={startEditingCustomer}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors active:scale-95 shrink-0"
                title={t('edit') || 'ערוך'}
              >
                <Pencil size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-stretch gap-2 w-full min-h-14">
          <button
            onClick={openWaze}
            className="flex-1 min-w-0 flex flex-col items-center justify-center p-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-700 shadow-md shadow-blue-200/50 dark:shadow-blue-900/30 hover:shadow-lg hover:shadow-blue-300/60 dark:hover:shadow-blue-800/40 hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-600 active:scale-[0.98] active:shadow-sm transition-all duration-200 cursor-pointer"
            title={t('waze')}
          >
            <WazeLogo size={24} />
            <span className="text-[9px] font-semibold mt-0.5 truncate w-full text-center">{t('waze')}</span>
          </button>
          <button
            onClick={openGoogleMaps}
            className="flex-1 min-w-0 flex flex-col items-center justify-center p-1.5 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-300 dark:border-green-700 shadow-md shadow-green-200/50 dark:shadow-green-900/30 hover:shadow-lg hover:shadow-green-300/60 dark:hover:shadow-green-800/40 hover:scale-[1.02] hover:border-green-400 dark:hover:border-green-600 active:scale-[0.98] active:shadow-sm transition-all duration-200 cursor-pointer"
            title={t('maps')}
          >
            <GoogleMapsLogo size={24} />
            <span className="text-[9px] font-semibold mt-0.5 truncate w-full text-center">{t('maps')}</span>
          </button>
          <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-500">
            <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 leading-tight">{t('commission')}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {location.commissionRate ? `${Math.round((location.commissionRate || 0.4) * 100)}%` : '—'}
            </p>
          </div>
        </div>

        {(location.changeMachineCount > 0 || location.hasChangeMachine) && (
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600">
            <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700">
              <Check size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                x{location.changeMachineCount || 1} {t('changeMachine') || 'Change Machine'}
              </span>
            </div>
          </div>
        )}

        {/* Customer Notes - separate from log notes */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-600 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="notes" className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">
              {t('customerNotes')}
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

        {/* Log History - Google Sheets Style */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-300 dark:border-slate-600 overflow-hidden">
          <h2 className="px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
            {t('logHistory')}
          </h2>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs border-collapse text-left bg-white dark:bg-slate-800">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  <th className={`px-2 py-2 border border-slate-300 dark:border-slate-600 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('logDate')}
                  </th>
                  <th className={`px-2 py-2 border border-slate-300 dark:border-slate-600 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('logUser') || 'User'}
                  </th>
                  {isAdmin && (
                    <>
                      <th className={`px-2 py-2 border border-slate-300 dark:border-slate-600 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
                        {t('collectionAmount')}
                      </th>
                      <th className={`px-2 py-2 border border-slate-300 dark:border-slate-600 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
                        {t('iReceive')}
                      </th>
                    </>
                  )}
                  <th className="px-1 py-1 border border-slate-300 dark:border-slate-600 font-semibold text-center w-[40px]">
                    $50
                  </th>
                  <th className="px-1 py-1 border border-slate-300 dark:border-slate-600 font-semibold text-center w-[40px]">
                    $20
                  </th>
                  <th className="px-1 py-1 border border-slate-300 dark:border-slate-600 font-semibold text-center w-[40px]">
                    $10
                  </th>
                  <th className="px-1 py-1 border border-slate-300 dark:border-slate-600 font-semibold text-center w-[40px]">
                    $5
                  </th>
                  <th className="px-1 py-1 border border-slate-300 dark:border-slate-600 font-semibold text-center w-[40px]">
                    $1
                  </th>
                  <th className={`px-2 py-2 border border-slate-300 dark:border-slate-600 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('logNotes')}
                  </th>
                  <th className="px-2 py-2 border border-slate-300 dark:border-slate-600 font-semibold text-center w-[40px]">
                    {/* Edit */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(location.logs && location.logs.length > 0) ? (
                  location.logs.map((log, index) => (
                    <tr key={log.id || index} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
                      <td className={`px-2 py-1 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                        {formatLogDate(log.date)}
                      </td>
                      <td className={`px-2 py-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                        {log.user || '—'}
                      </td>
                      {/* Financials - Admin Only */}
                      {isAdmin && (
                        <>
                          <td className={`px-2 py-1 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold ${isRtl ? 'text-right' : 'text-left'}`}>
                            {log.collection != null && String(log.collection).trim() !== '' ? Number(log.collection).toFixed(2) : ''}
                          </td>
                          <td className={`px-2 py-1 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium ${isRtl ? 'text-right' : 'text-left'}`}>
                            {calculateIReceive(log)}
                          </td>
                        </>
                      )}
                      {/* Bill Columns */}
                      <td className="px-1 py-1 border border-slate-300 dark:border-slate-600 text-center text-slate-700 dark:text-slate-300 font-medium">
                        {log.bills?.[50] > 0 ? log.bills[50] : ''}
                      </td>
                      <td className="px-1 py-1 border border-slate-300 dark:border-slate-600 text-center text-slate-700 dark:text-slate-300 font-medium">
                        {log.bills?.[20] > 0 ? log.bills[20] : ''}
                      </td>
                      <td className="px-1 py-1 border border-slate-300 dark:border-slate-600 text-center text-slate-700 dark:text-slate-300 font-medium">
                        {log.bills?.[10] > 0 ? log.bills[10] : ''}
                      </td>
                      <td className="px-1 py-1 border border-slate-300 dark:border-slate-600 text-center text-slate-700 dark:text-slate-300 font-medium">
                        {log.bills?.[5] > 0 ? log.bills[5] : ''}
                      </td>
                      <td className="px-1 py-1 border border-slate-300 dark:border-slate-600 text-center text-slate-700 dark:text-slate-300 font-medium">
                        {log.bills?.[1] > 0 ? log.bills[1] : ''}
                      </td>
                      {/* Notes and Edit */}
                      <td className={`px-2 py-0 border border-slate-300 dark:border-slate-600 ${isRtl ? 'text-right' : 'text-left'} align-middle`} style={{ minWidth: '120px' }}>
                        <div
                          className="flex items-center justify-between gap-1 h-full cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 p-1 rounded transition-colors"
                          onClick={() => setViewingLogNote(log.notes)}
                        >
                          <span className="truncate max-w-[100px] text-slate-500 italic block">
                            {(log.notes || '')?.slice(0, 15)}
                          </span>
                          <div className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            <ChevronDown size={14} />
                          </div>
                        </div>
                      </td>
                      <td className="px-1 py-1 border border-slate-300 dark:border-slate-600 text-center">
                        {(() => {
                          // Admin can always edit/delete; employee can only edit/delete their own last log within 24h
                          const canEdit = isAdmin || (
                            index === 0 &&
                            log.user === user?.name &&
                            log.date &&
                            (Date.now() - new Date(log.date).getTime()) < 24 * 60 * 60 * 1000
                          );
                          if (!canEdit) return null;
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditLog(log, index)}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title={t('editLog') || 'Edit Log'}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (await confirm({
                                    title: t('deleteLog') || 'Delete Log',
                                    message: t('confirmDeleteLog') || 'Are you sure you want to delete this log?',
                                    confirmText: t('delete') || 'Delete',
                                    cancelText: t('cancel') || 'Cancel',
                                    isDelete: true
                                  })) {
                                    removeLog(location.id, index);
                                  }
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title={t('deleteLog') || 'Delete Log'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                    <td colSpan={isAdmin ? "12" : "10"} className="px-4 py-4 text-center text-slate-500 italic">
                      {t('noHistory') || 'No history available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summaries - Admin Only */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-3">
            {/* Last Visit Summary */}
            <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {t('lastVisitSummary') || 'Last Visit Summary'}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                    {t('collectionAmount')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg font-bold text-foreground">
                      {(() => {
                        const latestLog = location.logs?.[0];
                        if (!latestLog) return '0.00';
                        return (parseFloat(latestLog.collection) || 0).toFixed(2);
                      })()}
                    </p>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                      {(() => {
                        const latestLog = location.logs?.[0];
                        if (!latestLog) return '$0';
                        const val = parseFloat(latestLog.collection) || 0;
                        return `$${(val * 20).toLocaleString()}`;
                      })()}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                    {t('iReceive')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg font-bold text-primary">
                      {(() => {
                        const latestLog = location.logs?.[0];
                        if (!latestLog) return '0.00';
                        const collection = parseFloat(latestLog.collection) || 0;
                        const rate = parseFloat(latestLog.commissionRate) || 0;
                        return (collection * (1 - rate)).toFixed(2);
                      })()}
                    </p>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                      {(() => {
                        const latestLog = location.logs?.[0];
                        if (!latestLog) return '$0';
                        const collection = parseFloat(latestLog.collection) || 0;
                        const rate = parseFloat(latestLog.commissionRate) || 0;
                        const val = collection * (1 - rate);
                        return `$${(val * 20).toLocaleString()}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Yearly Summary */}
            <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {t('yearlySummary') || 'Yearly Summary'}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                    {t('collectionAmount')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg font-bold text-foreground">
                      {(() => {
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const total = (location.logs || []).reduce((sum, log) => {
                          const d = new Date(log.date);
                          if (d.getFullYear() === currentYear) {
                            return sum + (parseFloat(log.collection) || 0);
                          }
                          return sum;
                        }, 0);
                        return total.toFixed(2);
                      })()}
                    </p>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                      {(() => {
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const total = (location.logs || []).reduce((sum, log) => {
                          const d = new Date(log.date);
                          if (d.getFullYear() === currentYear) {
                            return sum + (parseFloat(log.collection) || 0);
                          }
                          return sum;
                        }, 0);
                        return `$${(total * 20).toLocaleString()}`;
                      })()}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
                    {t('iReceive')}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg font-bold text-primary">
                      {(() => {
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const total = (location.logs || []).reduce((sum, log) => {
                          const d = new Date(log.date);
                          if (d.getFullYear() === currentYear) {
                            const collection = parseFloat(log.collection) || 0;
                            const rate = parseFloat(log.commissionRate) || 0;
                            return sum + (collection * (1 - rate));
                          }
                          return sum;
                        }, 0);
                        return total.toFixed(2);
                      })()}
                    </p>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                      {(() => {
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const total = (location.logs || []).reduce((sum, log) => {
                          const d = new Date(log.date);
                          if (d.getFullYear() === currentYear) {
                            const collection = parseFloat(log.collection) || 0;
                            const rate = parseFloat(log.commissionRate) || 0;
                            return sum + (collection * (1 - rate));
                          }
                          return sum;
                        }, 0);
                        return `$${(total * 20).toLocaleString()}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating overlay for full log notes - does not affect table layout */}
        {viewingLogNote && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-[55]"
              onClick={() => setViewingLogNote(null)}
              aria-hidden="true"
            />
            <div
              className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-[calc(100%-2rem)] max-w-[340px] max-h-[70vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 flex flex-col ${isRtl ? 'text-right' : 'text-left'}`}
              role="dialog"
              aria-label={t('logNotes')}
            >
              <div className="p-3 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between shrink-0">
                <span className="font-bold text-sm text-slate-800 dark:text-white">{t('logNotes')}</span>
                <button
                  type="button"
                  onClick={() => setViewingLogNote(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  aria-label={t('close')}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 min-h-0">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {viewingLogNote || '—'}
                </p>
              </div>
            </div>
          </>
        )}
        {/* Admin Actions */}
        {isAdmin && (
          <div className="mt-8 px-4">
            <button
              onClick={async () => {
                if (await confirm({
                  title: t('deleteCustomer') || 'Delete Customer',
                  message: t('deleteThisCustomer') || 'Are you sure you want to delete this customer?',
                  confirmText: t('delete') || 'Delete',
                  cancelText: t('cancel') || 'Cancel',
                  isDelete: true
                })) {
                  removeLocation(id);
                  navigate('/customers', { replace: true });
                }
              }}
              className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>{t('deleteThisCustomer')}</span>
            </button>
          </div>
        )}
      </div>


    </div>
  );
}
