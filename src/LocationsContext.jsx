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
  return [
    { id: `seed-${now}-1`, name: 'Cafe Central', address: '123 Main St', city: 'Tel Aviv', state: 'Israel', region: 'Center', status: 'pending', commissionRate: 0.4, hasChangeMachine: true },
    { id: `seed-${now}-2`, name: 'Mini Market North', address: '45 Dizengoff St', city: 'Tel Aviv', state: 'Israel', region: 'Center', status: 'visited', lastVisited: new Date().toISOString().slice(0, 10), commissionRate: 0.35, hasChangeMachine: false },
    { id: `seed-${now}-3`, name: 'Kiosk Beach', address: '78 Hayarkon St', city: 'Tel Aviv', state: 'Israel', region: 'North', status: 'pending', commissionRate: 0.5, hasChangeMachine: true },
    { id: `seed-${now}-4`, name: 'Restaurant Downtown', address: '22 Allenby St', city: 'Tel Aviv', state: 'Israel', region: 'Center', status: 'pending', commissionRate: 0.38, hasChangeMachine: false },
    { id: `seed-${now}-5`, name: 'Super Express', address: '5 Ibn Gabirol St', city: 'Tel Aviv', state: 'Israel', region: 'Center', status: 'visited', lastVisited: new Date(Date.now() - 86400000).toISOString().slice(0, 10), commissionRate: 0.42, hasChangeMachine: true },
    { id: `seed-${now}-6`, name: 'Brooklyn Deli', address: '100 Flatbush Ave', city: 'New York', state: 'NY', region: 'Brooklyn', status: 'pending', commissionRate: 0.4, hasChangeMachine: true },
    { id: `seed-${now}-7`, name: 'Brooklyn Bodega', address: '55 Atlantic Ave', city: 'New York', state: 'NY', region: 'Brooklyn', status: 'visited', lastVisited: new Date().toISOString().slice(0, 10), commissionRate: 0.35, hasChangeMachine: false },
    { id: `seed-${now}-8`, name: 'Queens Mini Mart', address: '45 Queens Blvd', city: 'New York', state: 'NY', region: 'Queens', status: 'pending', commissionRate: 0.35, hasChangeMachine: false },
    { id: `seed-${now}-9`, name: 'Queens Express', address: '120 Roosevelt Ave', city: 'New York', state: 'NY', region: 'Queens', status: 'pending', commissionRate: 0.42, hasChangeMachine: true },
    { id: `seed-${now}-10`, name: 'Staten Island Kiosk', address: '22 Victory Blvd', city: 'New York', state: 'NY', region: 'Staten Island', status: 'pending', commissionRate: 0.42, hasChangeMachine: true },
    { id: `seed-${now}-11`, name: 'Bronx Express', address: '88 Grand Concourse', city: 'New York', state: 'NY', region: 'Bronx', status: 'visited', lastVisited: new Date().toISOString().slice(0, 10), commissionRate: 0.38, hasChangeMachine: false },
    { id: `seed-${now}-12`, name: 'Bronx Mini Mart', address: '200 Fordham Rd', city: 'New York', state: 'NY', region: 'Bronx', status: 'pending', commissionRate: 0.4, hasChangeMachine: true },
    { id: `seed-${now}-13`, name: 'Manhattan Central', address: '200 Broadway', city: 'New York', state: 'NY', region: 'Manhattan', status: 'pending', commissionRate: 0.45, hasChangeMachine: true },
    { id: `seed-${now}-14`, name: 'Manhattan Deli', address: '350 5th Ave', city: 'New York', state: 'NY', region: 'Manhattan', status: 'pending', commissionRate: 0.38, hasChangeMachine: false },
    { id: `seed-${now}-15`, name: 'New Jersey Mart', address: '100 Newark Ave', city: 'Jersey City', state: 'NJ', region: 'New Jersey', status: 'pending', commissionRate: 0.4, hasChangeMachine: true },
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

export function LocationsProvider({ children }) {
  const [locations, setLocations] = useState(() => loadFromStorage());
  const hasEnsuredDemo = useRef(false);

  // Once on app load: if storage has fewer than 10 locations, replace with full demo (so user always sees full list)
  useEffect(() => {
    if (hasEnsuredDemo.current) return;
    hasEnsuredDemo.current = true;
    const stored = loadFromStorage();
    if (!Array.isArray(stored) || stored.length < MIN_LOCATIONS_FOR_FULL_LIST) {
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
