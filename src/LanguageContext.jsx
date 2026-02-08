import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'myRouteLanguage';

const translations = {
  en: {
    appTitle: 'My Route',
    menu: 'Menu',
    back: 'Back',
    routes: 'Routes',
    locations: 'Locations',
    customers: 'Customers',
    settings: 'Settings',
    addCustomer: 'Add Customer',
    searchCustomer: 'Search customer...',
    searchLocation: 'Search location...',
    week: 'Week',
    month: 'Month',
    locationsOnThisDay: 'Locations on this day (edit below)',
    addLocation: 'Add location...',
    close: 'Close',
    open: 'Open',
    removeFromDay: 'Remove from day',
    selected: 'Selected',
    noResultsFor: 'No results for',
    tryDifferentKeywords: 'Try different keywords (name, address, city, type)',
    noLocationsYet: 'No locations yet',
    openMenuAddCustomer: 'Open the menu and tap Add Customer',
    visited: 'Visited',
    pending: 'Pending',
    machine: 'Machine',
    lastVisit: 'Last visit',
    backToHome: 'Back to Home',
    defaultOrder: 'Default',
    visitedAtBottom: 'Visited ↓',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    lightMode: 'Light mode',
    nightMode: 'Night mode',
    language: 'Language',
    hebrew: 'Hebrew',
    english: 'English',
    addNewCustomer: 'Add New Customer',
    backToLocations: 'Back to Locations',
    backToCustomers: 'Back to Customers',
    addLog: 'Add Log',
    loading: 'Loading...',
    customerNotFound: 'Customer Not Found',
    locationRemovedOrInvalid: 'This location may have been removed or the link is invalid.',
    businessDetails: 'Business Details',
    businessName: 'Business Name',
    customerName: 'Customer Name',
    fullAddress: 'Full Address',
    locationType: 'Location Type',
    type: 'Type',
    commission: 'Commission',
    commissionRate: 'Commission Rate',
    enterDecimal: 'Enter as decimal (0.40 = 40%)',
    hasChangeMachine: 'Has Change Machine',
    visitDateOptional: 'Visit Date (optional)',
    initialNotes: 'Initial Notes',
    addressZone: 'Address & Zone',
    address: 'Address',
    city: 'City',
    zone: 'Zone',
    state: 'State',
    neighborhood: 'Neighborhood',
    other: 'Other',
    yes: 'Yes',
    no: 'No',
    zipCode: 'Zip Code',
    saveCustomer: 'Save Customer',
    commissionRateHelp: 'Commission this customer pays (e.g. 0.40 = 40%)',
    status: 'Status',
    collectionAmount: 'Collection Amount',
    coinWeightConverter: 'Coin Weight Converter',
    coinType: 'Coin Type',
    weight: 'Weight',
    giveToCustomer: 'Give to customer',
    iReceive: 'I receive',
    value: 'Value',
    applyToCollection: 'Apply to Collection',
    notes: 'Notes',
    notesPlaceholder: 'Machine refilled. Coin mech jammed. Product restocked...',
    saveComplete: 'Save & Complete',
    locationLog: 'Location Log',
    saveLog: 'Save Log',
    logDate: 'Log date',
    saveWord: 'Save',
    logWord: 'Log',
    deleteThisCustomer: 'Delete this customer?',
    saveChangesConfirm: 'Save changes?',
    cancel: 'Cancel',
    discardChanges: "Don't save",
    maps: 'Maps',
    waze: 'Waze',
    optionalNotes: 'Optional notes...',
    quartersLabel: 'Quarters (Standard)',
    dimesLabel: 'Dimes',
    nickelsLabel: 'Nickels',
    appVersion: 'Vending Route Manager v1.0',
    home: 'Home',
    loadDemoData: 'Load demo data',
    resetAndLoadDemo: 'Reset & load demo',
    sortBy: 'Sort by',
    sortByCity: 'Cities',
    sortByState: 'States',
    sortByZone: 'Zone',
    sortByAll: 'All',
    bills: 'Bills',
    edit: 'Edit',
    bill50: '50',
    bill20: '20',
    bill10: '10',
    bill5: '5',
    bill1: '1',
  },
  he: {
    appTitle: 'המסלול שלי',
    menu: 'תפריט',
    back: 'חזרה',
    routes: 'מסלולים',
    locations: 'מיקומים',
    customers: 'לקוחות',
    settings: 'הגדרות',
    addCustomer: 'הוסף לקוח',
    searchCustomer: 'חיפוש לקוח...',
    searchLocation: 'חיפוש מיקום...',
    week: 'שבוע',
    month: 'חודש',
    locationsOnThisDay: 'מיקומים ביום זה (עריכה למטה)',
    addLocation: 'הוסף מיקום...',
    close: 'סגור',
    open: 'פתח',
    removeFromDay: 'הסר מהיום',
    selected: 'נבחר',
    noResultsFor: 'אין תוצאות עבור',
    tryDifferentKeywords: 'נסה מילות מפתח אחרות (שם, כתובת, עיר, סוג)',
    noLocationsYet: 'אין עדיין מיקומים',
    openMenuAddCustomer: 'פתח את התפריט ולחץ על הוסף לקוח',
    visited: 'ביקור',
    pending: 'ממתין',
    machine: 'מכונה',
    lastVisit: 'ביקור אחרון',
    backToHome: 'חזרה לדף הבית',
    defaultOrder: 'ברירת מחדל',
    visitedAtBottom: 'ביקור ↓',
    appearance: 'מראה',
    darkMode: 'מצב כהה',
    lightMode: 'מצב יום',
    nightMode: 'מצב לילה',
    language: 'שפה',
    hebrew: 'עברית',
    english: 'English',
    addNewCustomer: 'הוסף לקוח חדש',
    backToLocations: 'חזרה למיקומים',
    backToCustomers: 'חזרה ללקוחות',
    addLog: 'הוסף לוג',
    loading: 'טוען...',
    customerNotFound: 'הלקוח לא נמצא',
    locationRemovedOrInvalid: 'ייתכן שהמיקום הוסר או שהקישור לא תקף.',
    businessDetails: 'פרטי העסק',
    businessName: 'שם העסק',
    customerName: 'שם לקוח',
    fullAddress: 'כתובת מלאה',
    locationType: 'סוג מיקום',
    type: 'סוג',
    commission: 'עמלה',
    commissionRate: 'אחוז עמלה',
    enterDecimal: 'הזן כמספר עשרוני (0.40 = 40%)',
    hasChangeMachine: 'יש מכונת מטבעות',
    visitDateOptional: 'תאריך ביקור (אופציונלי)',
    initialNotes: 'הערות ראשוניות',
    addressZone: 'כתובת ואזור',
    address: 'כתובת',
    city: 'עיר',
    zone: 'אזור',
    state: 'מדינה',
    neighborhood: 'שכונה',
    other: 'אחר',
    yes: 'כן',
    no: 'לא',
    zipCode: 'מיקוד',
    saveCustomer: 'שמור לקוח',
    commissionRateHelp: 'אחוז העמלה שהלקוח משלם (למשל 0.40 = 40%)',
    status: 'סטטוס',
    collectionAmount: 'סכום איסוף',
    coinWeightConverter: 'ממיר משקל מטבעות',
    coinType: 'סוג מטבע',
    weight: 'משקל',
    giveToCustomer: 'תן ללקוח',
    iReceive: 'אני מקבל',
    value: 'ערך',
    applyToCollection: 'החל על האיסוף',
    notes: 'הערות',
    notesPlaceholder: 'מילוי מכונה. מנגנון מטבעות תקוע. מילוי מוצרים...',
    saveComplete: 'שמור וסיים',
    locationLog: 'Location Log',
    saveLog: 'שמור לוג',
    logDate: 'תאריך הלוג',
    saveWord: 'שמור',
    logWord: 'לוג',
    deleteThisCustomer: 'למחוק את הלקוח?',
    saveChangesConfirm: 'לשמור שינויים?',
    cancel: 'ביטול',
    discardChanges: 'לא לשמור',
    maps: 'מפות',
    waze: 'ווייז',
    optionalNotes: 'הערות אופציונליות...',
    quartersLabel: 'רבעים (סטנדרט)',
    dimesLabel: 'דיימס',
    nickelsLabel: 'ניקלים',
    appVersion: 'מנהל מסלול אוטומטים v1.0',
    home: 'דף הבית',
    sortBy: 'מיון לפי',
    sortByCity: 'ערים',
    sortByState: 'מדינות',
    sortByZone: 'אזור',
    sortByAll: 'הכל',
    loadDemoData: 'טען נתוני דמו',
    resetAndLoadDemo: 'איפוס וטעינת דמו',
    bills: 'שטרות',
    edit: 'ערוך',
    bill50: '50',
    bill20: '20',
    bill10: '10',
    bill5: '5',
    bill1: '1',
  },
};

// Weekday labels for calendar (Sun–Sat)
const WEEKDAY_LABELS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  he: ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\'', 'ש\''],
};
const MONTH_NAMES = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  he: ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'],
};

const LanguageContext = createContext();

function loadLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'he' || saved === 'en') return saved;
    return 'en';
  } catch {
    return 'en';
  }
}

const FADE_DURATION_MS = 220;

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(loadLanguage);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.lang = language === 'he' ? 'he' : 'en';
      document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    } catch (err) {
      console.error('Failed to persist language:', err);
    }
  }, [language]);

  const setLanguage = (lang) => {
    if (lang !== 'he' && lang !== 'en') return;
    if (lang === language) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setLanguageState(lang);
      setIsTransitioning(false);
    }, FADE_DURATION_MS);
  };

  const t = (key) => {
    const dict = translations[language] || translations.en;
    return dict[key] ?? translations.en[key] ?? key;
  };

  const weekdayLabels = WEEKDAY_LABELS[language] || WEEKDAY_LABELS.en;
  const monthNames = MONTH_NAMES[language] || MONTH_NAMES.en;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRtl: language === 'he',
        isTransitioning,
        weekdayLabels,
        monthNames,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
