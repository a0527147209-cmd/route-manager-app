import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocations } from "./LocationsContext";
import { useLanguage } from './LanguageContext';
import { ArrowLeft, Save, MapPin, Building, Menu, Percent, Banknote } from 'lucide-react';
import MenuDrawer from './MenuDrawer';

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Generate ID prefix based on Zone
    let prefix = 'BRK';
    if (formData.zone === 'Bronx') prefix = 'BNX';
    if (formData.zone === 'Queens') prefix = 'QNS';
    if (formData.zone === 'Manhattan') prefix = 'MAN';
    if (formData.zone === 'Staten Island') prefix = 'STI';
    
    const randomNum = Math.floor(100 + Math.random() * 900);
    const newId = `${prefix}-${randomNum}`;

    const newLocation = {
      id: newId,
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

    addLocation(newLocation);
    navigate('/locations');
  };

  // עיצוב ניגודיות גבוהה – קומפקטי למובייל
  const inputStyle = "w-full p-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-600 dark:text-white";
  const labelStyle = "block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header – compact for mobile */}
      <div className="bg-white dark:bg-slate-800 shadow-sm p-3 min-h-[50px] flex items-center sticky top-0 z-10 max-w-[380px] mx-auto w-full">
        <div className="flex items-center justify-between w-full gap-2">
          <button
            onClick={() => navigate('/', location.state?.fromMenu ? { state: { openMenu: true } } : {})}
            className="p-2 -ms-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors active:scale-95 shrink-0"
            title={t('home')}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex-1 text-center min-w-0 truncate">{t('addNewCustomer')}</h1>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-95 shrink-0"
            title={t('menu')}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="max-w-[380px] mx-auto p-3">
<form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-indigo-600 dark:text-indigo-400">
              <Building size={18} />
              {t('businessDetails')}
            </h2>

            {/* 1. שם לקוח */}
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

            {/* 2. כתובת */}
            <div>
              <label className={labelStyle}>{t('address')}</label>
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main St"
                className={inputStyle}
              />
            </div>

            {/* 3. עיר */}
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

            {/* 4. אזור */}
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

            {/* 5. מדינה */}
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

            {/* 6. מיקוד */}
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

            {/* 7. סוג מיקום */}
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

            {/* 8. כתובת מלאה */}
            <div>
              <label className={labelStyle}>{t('fullAddress')}</label>
              <input
                type="text"
                name="fullAddress"
                value={formData.fullAddress}
                onChange={handleChange}
                placeholder={t('fullAddress')}
                className={inputStyle}
              />
            </div>

            {/* עמלה, מכונה, הערות */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
                <Percent size={16} />
                {t('commissionRate')}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('enterDecimal')}</p>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  name="commissionRate"
                  value={formData.commissionRate}
                  onChange={handleChange}
                  placeholder="0.40"
                  className="flex-1 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
                <span className="px-2 py-1 rounded-lg text-sm font-bold bg-amber-400 text-amber-900 dark:bg-amber-500 dark:text-amber-950 shrink-0">
                  {Number.isFinite(parseFloat(formData.commissionRate)) ? `${Math.round(parseFloat(formData.commissionRate) * 100)}%` : '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                id="hasChangeMachine"
                name="hasChangeMachine"
                checked={formData.hasChangeMachine}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="hasChangeMachine" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                <Banknote size={18} />
                {t('hasChangeMachine')}
              </label>
            </div>

            <div>
              <label className={labelStyle}>{t('initialNotes')}</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder={t('optionalNotes')}
                rows={2}
                className={`${inputStyle} resize-none`}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 text-lg"
          >
            <Save size={24} />
            {t('saveCustomer')}
          </button>

        </form>
      </div>
    </div>
  );
}