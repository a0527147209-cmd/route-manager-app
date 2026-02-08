import { createContext, useContext, useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'myRouteLocations';

const LocationsContext = createContext();

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load locations:', err);
    return [];
  }
}

function seedFictionalLocations() {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  return [
    { id: `seed-${now}-1`, name: 'Cafe Central', address: '123 Main St', city: 'Tel Aviv', state: 'Israel', region: 'Center', status: 'visited', commissionRate: 0.4, hasChangeMachine: true, lastVisited: today, lastCollection: '245.00', notes: '', logNotes: 'מילוי מכונה הושלם. מנגנון מטבעות עובד תקין.', bills: { 50: 4, 20: 2, 10: 0, 5: 1, 1: 0 } },
    { id: `seed-${now}-2`, name: 'Mini Market North', address: '45 Dizengoff St', city: 'Tel Aviv', state: 'Israel', region: 'Center', status: 'visited', commissionRate: 0.35, hasChangeMachine: false, lastVisited: today, lastCollection: '180.50', notes: '', logNotes: 'ביקור שגרתי. אין בעיות.', bills: { 50: 3, 20: 1, 10: 1, 5: 1, 1: 0 } },
    { id: `seed-${now}-3`, name: 'Kiosk Beach', address: '78 Hayarkon St', city: 'Tel Aviv', state: 'Israel', region: 'North', status: 'visited', commissionRate: 0.5, hasChangeMachine: true, lastVisited: yesterday, lastCollection: '312.00', notes: '', logNotes: 'עומס גבוה בסוף השבוע. מטבעות חסרים – להביא בפעם הבאה.', bills: { 50: 6, 20: 0, 10: 1, 5: 0, 1: 2 } },
    { id: `seed-${now}-4`, name: 'Restaurant Downtown', address: '22 Allenby St', city: 'Tel Aviv', state: 'Israel', region: 'Center', status: 'visited', commissionRate: 0.38, hasChangeMachine: false, lastVisited: lastWeek, lastCollection: '95.00', notes: '', logNotes: '', bills: { 50: 1, 20: 2, 10: 0, 5: 1, 1: 0 } },
    { id: `seed-${now}-5`, name: 'Super Express', address: '5 Ibn Gabirol St', city: 'Tel Aviv', state: 'Israel', region: 'Center', status: 'visited', commissionRate: 0.42, hasChangeMachine: true, lastVisited: today, lastCollection: '428.00', notes: '', logNotes: 'מכונה מלאה. הלקוח ביקש להעלות מחיר למוצרים מסוימים – לבדוק.', bills: { 50: 8, 20: 1, 10: 0, 5: 1, 1: 3 } },
    { id: `seed-${now}-6`, name: 'Brooklyn Deli', address: '100 Flatbush Ave', city: 'New York', state: 'NY', region: 'Brooklyn', status: 'visited', commissionRate: 0.4, hasChangeMachine: true, lastVisited: today, lastCollection: '156.00', notes: '', logNotes: 'Machine refilled. Coin mech jammed once – reset OK.', bills: { 50: 2, 20: 2, 10: 1, 5: 2, 1: 1 } },
    { id: `seed-${now}-7`, name: 'Brooklyn Bodega', address: '55 Atlantic Ave', city: 'New York', state: 'NY', region: 'Brooklyn', status: 'visited', commissionRate: 0.35, hasChangeMachine: false, lastVisited: yesterday, lastCollection: '89.50', notes: '', logNotes: 'Product restocked. All good.', bills: { 50: 1, 20: 1, 10: 2, 5: 0, 1: 4 } },
    { id: `seed-${now}-8`, name: 'Queens Mini Mart', address: '45 Queens Blvd', city: 'New York', state: 'NY', region: 'Queens', status: 'pending', commissionRate: 0.35, hasChangeMachine: false, lastVisited: null, lastCollection: '', notes: '', logNotes: 'עדיין לא ביקור ראשון', bills: { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 } },
    { id: `seed-${now}-9`, name: 'Queens Express', address: '120 Roosevelt Ave', city: 'New York', state: 'NY', region: 'Queens', status: 'visited', commissionRate: 0.42, hasChangeMachine: true, lastVisited: today, lastCollection: '267.00', notes: '', logNotes: 'הכל תקין. תשלום מלא.', bills: { 50: 5, 20: 0, 10: 1, 5: 3, 1: 2 } },
    { id: `seed-${now}-10`, name: 'Staten Island Kiosk', address: '22 Victory Blvd', city: 'New York', state: 'NY', region: 'Staten Island', status: 'visited', commissionRate: 0.42, hasChangeMachine: true, lastVisited: yesterday, lastCollection: '198.00', notes: '', logNotes: 'ביקור קצר. סכום איסוף בינוני.', bills: { 50: 3, 20: 2, 10: 0, 5: 1, 1: 3 } },
    { id: `seed-${now}-11`, name: 'Bronx Express', address: '88 Grand Concourse', city: 'New York', state: 'NY', region: 'Bronx', status: 'visited', commissionRate: 0.38, hasChangeMachine: false, lastVisited: today, lastCollection: '334.50', notes: '', logNotes: 'מכונה דורשת תחזוקה קלה – דלת לא נסגרת חלק. לתאם עם טכנאי.', bills: { 50: 6, 20: 1, 10: 2, 5: 1, 1: 0 } },
    { id: `seed-${now}-12`, name: 'Bronx Mini Mart', address: '200 Fordham Rd', city: 'New York', state: 'NY', region: 'Bronx', status: 'pending', commissionRate: 0.4, hasChangeMachine: true, lastVisited: null, lastCollection: '', notes: '', logNotes: '', bills: { 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 } },
    { id: `seed-${now}-13`, name: 'Manhattan Central', address: '200 Broadway', city: 'New York', state: 'NY', region: 'Manhattan', status: 'visited', commissionRate: 0.45, hasChangeMachine: true, lastVisited: today, lastCollection: '512.00', notes: '', logNotes: 'High traffic location. Full collection. Request for extra snacks next delivery.', bills: { 50: 10, 20: 0, 10: 1, 5: 0, 1: 2 } },
    { id: `seed-${now}-14`, name: 'Manhattan Deli', address: '350 5th Ave', city: 'New York', state: 'NY', region: 'Manhattan', status: 'visited', commissionRate: 0.38, hasChangeMachine: false, lastVisited: lastWeek, lastCollection: '72.00', notes: '', logNotes: 'סכום נמוך – שבוע חלש.', bills: { 50: 1, 20: 1, 10: 0, 5: 0, 1: 2 } },
    { id: `seed-${now}-15`, name: 'New Jersey Mart', address: '100 Newark Ave', city: 'Jersey City', state: 'NJ', region: 'New Jersey', status: 'visited', commissionRate: 0.4, hasChangeMachine: true, lastVisited: yesterday, lastCollection: '221.00', notes: '', logNotes: 'מכונת מטבעות עובדת מעולה. אין הערות.', bills: { 50: 4, 20: 0, 10: 2, 5: 0, 1: 1 } },
  ];
}

function saveToStorage(locations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
  } catch (err) {
    console.error('Failed to persist locations:', err);
  }
}

const MIN_LOCATIONS_FOR_FULL_LIST = 10;

// Check if locations look like old seed (no log history: missing bills or lastCollection on all)
function hasNoLogHistory(stored) {
  if (!Array.isArray(stored) || stored.length === 0) return true;
  const withLog = stored.some(
    (loc) =>
      (loc.bills && Object.keys(loc.bills).length > 0) ||
      (loc.lastCollection != null && String(loc.lastCollection).trim() !== '')
  );
  return !withLog;
}

export function LocationsProvider({ children }) {
  const [locations, setLocations] = useState(() => loadFromStorage());
  const hasEnsuredDemo = useRef(false);

  // Once on app load: load full demo with log history when storage is empty, too few locations, or existing data has no log history (old seed)
  useEffect(() => {
    if (hasEnsuredDemo.current) return;
    hasEnsuredDemo.current = true;
    const stored = loadFromStorage();
    const tooFew = !Array.isArray(stored) || stored.length < MIN_LOCATIONS_FOR_FULL_LIST;
    const existingWithoutLog = Array.isArray(stored) && stored.length >= MIN_LOCATIONS_FOR_FULL_LIST && hasNoLogHistory(stored);
    if (tooFew || existingWithoutLog) {
      const seed = seedFictionalLocations();
      setLocations(seed);
      saveToStorage(seed);
    }
  }, []);

  useEffect(() => {
    if (!Array.isArray(locations) || locations.length === 0) return;
    saveToStorage(locations);
  }, [locations]);

  const addLocation = (location) => {
    setLocations((prev) => [location, ...prev]);
  };

  const updateLocation = (id, updatedFields) => {
    const idStr = String(id);
    setLocations((prev) => {
      const updated = prev.map((loc) =>
        String(loc.id) === idStr ? { ...loc, ...updatedFields } : loc
      );
      saveToStorage(updated);
      return updated;
    });
  };

  const removeLocation = (id) => {
    const idStr = String(id);
    setLocations((prev) => {
      const updated = prev.filter((loc) => String(loc.id) !== idStr);
      saveToStorage(updated);
      return updated;
    });
  };

  const clearAllLocations = () => {
    setLocations([]);
  };

  const loadDemoData = () => {
    const seed = seedFictionalLocations();
    setLocations((prev) => [...(prev || []), ...seed]);
  };

  const resetAndLoadDemo = () => {
    const seed = seedFictionalLocations();
    setLocations(seed);
    saveToStorage(seed);
  };

  return (
    <LocationsContext.Provider
      value={{
        locations,
        addLocation,
        updateLocation,
        removeLocation,
        clearAllLocations,
        loadDemoData,
        resetAndLoadDemo,
      }}
    >
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const context = useContext(LocationsContext);
  if (!context) {
    throw new Error('useLocations must be used within a LocationsProvider');
  }
  return context;
}
