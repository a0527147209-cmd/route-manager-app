import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocations } from "./LocationsContext";
import { useLanguage } from './LanguageContext';
import { ArrowLeft, Save, MapPin, Building, Menu, Percent } from 'lucide-react';
import MenuDrawer from './MenuDrawer';
import AddressAutocomplete from './AddressAutocomplete';

export default function AddLocationView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addLocation } = useLocations();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    zone: 'Brooklyn',
    state: 'NY',
    zipCode: '',
    type: 'Deli',
    fullAddress: '',
    commissionRate: '0.40',
    hasChangeMachine: false,
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newLocation = {
      name: formData.name,
      region: formData.zone,
      commissionRate: parseFloat(formData.commissionRate) || 0.4,
      hasChangeMachine: formData.hasChangeMachine,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      type: formData.type,
      fullAddress: formData.fullAddress || '',
      notes: formData.notes || '',
      lastVisited: null,
      status: 'pending'
    };

    try {
      const newId = await addLocation(newLocation);
      console.log("Customer added with Firestore ID:", newId);
      navigate('/customers');
    } catch (error) {
      console.error("Failed to add customer:", error);
      alert("Error adding customer: " + error.message);
    }
  };

  const inputStyle = "w-full px-3.5 py-2.5 text-[13px] rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-600 outline-none transition-all ring-1 ring-black/[0.04] dark:ring-white/[0.06]";
  const labelStyle = "block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider";

  return (
    <div className="h-full flex flex-col bg-slate-50/80 dark:bg-slate-950 overflow-hidden">
      <header
        className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 z-10"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-[520px] mx-auto w-full px-4 py-3 flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 shrink-0"
            title={t('home')}
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
          </button>
          <h1 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100 flex-1 text-center min-w-0 truncate tracking-tight">{t('addNewCustomer')}</h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 shrink-0"
            title={t('menu')}
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
        </div>
      </header>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[520px] mx-auto w-full px-4 py-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Business Details */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] border border-slate-200/50 dark:border-slate-800/60 ring-1 ring-black/[0.02] dark:ring-white/[0.04] p-5 space-y-4">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                  <Building size={16} className="text-indigo-600 dark:text-indigo-400" strokeWidth={1.8} />
                </div>
                <h2 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{t('businessDetails')}</h2>
              </div>

              <div>
                <label className={labelStyle}>{t('customerName')}</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Joe's Pizza"
                  className={inputStyle}
                />
              </div>

              <div>
                <label className={labelStyle}>{t('address')}</label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(val) => setFormData(prev => ({ ...prev, address: val }))}
                  onPlaceSelect={(place) => {
                    setFormData(prev => ({
                      ...prev,
                      address: place.address,
                      city: place.city || prev.city,
                      state: place.state || prev.state,
                      zipCode: place.zipCode || prev.zipCode,
                      fullAddress: place.fullAddress || prev.fullAddress,
                    }));
                  }}
                  placeholder="Start typing an address..."
                  className={inputStyle}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>{t('city')}</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>{t('state')}</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>{t('zone')}</label>
                  <select
                    name="zone"
                    value={formData.zone}
                    onChange={handleChange}
                    className={inputStyle}
                  >
                    <option value="Brooklyn">Brooklyn</option>
                    <option value="Bronx">Bronx</option>
                    <option value="Queens">Queens</option>
                    <option value="Manhattan">Manhattan</option>
                    <option value="Staten Island">Staten Island</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>{t('zipCode')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    className={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label className={labelStyle}>{t('locationType')}</label>
                <input
                  type="text"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="e.g. Deli, Laundromat"
                  className={inputStyle}
                />
              </div>
            </div>

            {/* Commission */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] border border-slate-200/50 dark:border-slate-800/60 ring-1 ring-black/[0.02] dark:ring-white/[0.04] p-5 space-y-3">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                  <Percent size={16} className="text-amber-600 dark:text-amber-400" strokeWidth={1.8} />
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{t('commissionRate')}</h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{t('enterDecimal')}</p>
                </div>
              </div>

              <div className="flex gap-2.5 items-center">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  name="commissionRate"
                  value={formData.commissionRate}
                  onChange={handleChange}
                  placeholder="0.40"
                  className={`flex-1 ${inputStyle}`}
                />
                <span className="px-3 py-2 rounded-xl text-[13px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200/50 dark:ring-amber-800/30 shrink-0 tabular-nums">
                  {Number.isFinite(parseFloat(formData.commissionRate)) ? `${Math.round(parseFloat(formData.commissionRate) * 100)}%` : '—'}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] border border-slate-200/50 dark:border-slate-800/60 ring-1 ring-black/[0.02] dark:ring-white/[0.04] p-5">
              <label className={labelStyle}>{t('initialNotes')}</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder={t('optionalNotes')}
                rows={3}
                className={`${inputStyle} resize-none`}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold py-3.5 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_3px_rgba(255,255,255,0.1)] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-[14px]"
            >
              <Save size={18} strokeWidth={1.8} />
              {t('saveCustomer')}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
