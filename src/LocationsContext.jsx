import { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'customers';

const LocationsContext = createContext();

export function LocationsProvider({ children }) {
  const [locations, setLocations] = useState([]);

  // Real-time listener on the 'customers' collection
  useEffect(() => {
    const colRef = collection(db, COLLECTION_NAME);

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      // Sort by order field client-side
      loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
      setLocations(loaded);
      window.debugLocations = loaded;
      console.log(`[LocationsContext] Loaded ${loaded.length} customers from Firestore.`);
    }, (error) => {
      console.error("[LocationsContext] onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, []);

  // Add a new customer using addDoc (Firestore generates the ID)
  const addLocation = async (locationData) => {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const maxOrder = locations.reduce((max, loc) => Math.max(max, loc.order || 0), -1);
      const docRef = await addDoc(colRef, {
        ...locationData,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
      });
      console.log("[LocationsContext] Customer added with ID:", docRef.id);
      return docRef.id;
    } catch (e) {
      console.error("Error adding customer:", e);
      throw e;
    }
  };

  const updateLocation = async (id, updatedFields) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, updatedFields);
    } catch (e) {
      console.error("Error updating customer:", e);
    }
  };

  const updateLog = async (locationId, logIndex, updatedLog) => {
    try {
      const location = locations.find(l => l.id === locationId);
      if (!location) return;

      const newLogs = [...(location.logs || [])];
      if (logIndex >= 0 && logIndex < newLogs.length) {
        newLogs[logIndex] = { ...newLogs[logIndex], ...updatedLog };
        const docRef = doc(db, COLLECTION_NAME, locationId);
        await updateDoc(docRef, { logs: newLogs });
      }
    } catch (e) {
      console.error("Error updating log:", e);
    }
  };

  const removeLog = async (locationId, logIndex) => {
    try {
      const location = locations.find(l => l.id === locationId);
      if (!location) return;

      const newLogs = [...(location.logs || [])];
      if (logIndex >= 0 && logIndex < newLogs.length) {
        newLogs.splice(logIndex, 1);
      }

      let updates = { logs: newLogs };
      if (logIndex === 0) {
        const newLatest = newLogs[0];
        if (newLatest) {
          updates = {
            ...updates,
            lastVisited: newLatest.date,
            lastCollection: newLatest.collection,
            commissionRate: newLatest.commissionRate,
            bills: newLatest.bills,
            logNotes: newLatest.notes
          };
        } else {
          updates = {
            ...updates,
            lastVisited: null,
            lastCollection: '',
            bills: {},
            logNotes: ''
          };
        }
      }

      const docRef = doc(db, COLLECTION_NAME, locationId);
      await updateDoc(docRef, updates);
    } catch (e) {
      console.error("Error removing log:", e);
    }
  };

  const removeLocation = async (id) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (e) {
      console.error("Error removing customer:", e);
    }
  };

  const clearAllLocations = async () => {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach(d => batch.delete(d.ref));
    await batch.commit();
  };

  const loadDemoData = async () => {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) return;

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const seed = [
      { name: 'Cafe Central', address: '123 Main St', city: 'Tel Aviv', state: 'Israel', region: 'Center', status: 'visited', commissionRate: 0.4, hasChangeMachine: true, lastVisited: today, lastCollection: '245.00', notes: '', logNotes: 'מילוי מכונה הושלם.', bills: { 50: 4, 20: 2, 10: 0, 5: 1, 1: 0 }, logs: [{ date: today, commissionRate: 0.4, collection: '245.00', bills: { 50: 4, 20: 2, 10: 0, 5: 1, 1: 0 }, notes: 'מילוי מכונה הושלם.' }] },
      { name: 'Brooklyn Deli', address: '100 Flatbush Ave', city: 'New York', state: 'NY', region: 'Brooklyn', status: 'visited', commissionRate: 0.4, hasChangeMachine: true, lastVisited: today, lastCollection: '156.00', notes: '', logNotes: 'Machine refilled.', bills: { 50: 2, 20: 2, 10: 1, 5: 2, 1: 1 }, logs: [{ date: today, commissionRate: 0.4, collection: '156.00', bills: { 50: 2, 20: 2, 10: 1, 5: 2, 1: 1 }, notes: 'Machine refilled.' }] },
    ];

    const batch = writeBatch(db);
    seed.forEach((loc, index) => {
      const docRef = doc(colRef);
      batch.set(docRef, { ...loc, order: index });
    });
    await batch.commit();
  };

  const resetAndLoadDemo = async () => {
    await clearAllLocations();
  };

  const reorderLocations = async (reorderedIds) => {
    const batch = writeBatch(db);
    reorderedIds.forEach((id, index) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.update(docRef, { order: index });
    });
    await batch.commit();
  };

  return (
    <LocationsContext.Provider
      value={{
        locations,
        addLocation,
        updateLocation,
        updateLog,
        removeLog,
        removeLocation,
        clearAllLocations,
        loadDemoData,
        resetAndLoadDemo,
        reorderLocations,
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
