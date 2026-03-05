import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useLocations } from './LocationsContext';

const COLLECTION_NAME = 'customers';

function fmt(dateStr) {
  if (!dateStr) return null;
  const s = dateStr.trim().replace('.', '');
  const parts = s.split('/');
  if (parts.length !== 3) return null;
  let [m, d, y] = parts.map(Number);
  if (y < 100) y += 2000;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseCollection(val) {
  if (!val) return '0';
  const s = val.toString().trim().toLowerCase();
  if (s.includes('closed') || s.includes('no money') || s === '') return '0';
  const cleaned = s.replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n.toFixed(2) : '0';
}

const LONG_ISLAND_DATA = [
  {
    name: '4 Smith Ave',
    address: '4 Smith Ave',
    city: 'Bay Shore',
    state: 'NY',
    region: 'Long Island',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'gumball machine - 10.8/7.2lb, 11.4/7.41lb (11/24/24), 12.8/8.32lb (9/30/25)',
    rawLogs: [
      { date: '1/22/2026', total: '', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/30/2025', total: '12', user: 'Eli', b50: '', b20: '1', b10: '', b5: '', b1: '3' },
      { date: '5/15/2025', total: '10.1', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '521 Oak Street (Car Wash)',
    address: '521 Oak Street',
    city: 'Copiague',
    state: 'NY',
    region: 'Long Island',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'added a $50 just to see if it brings more business',
    rawLogs: [
      { date: '1/22/2026', total: '10.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '5' },
      { date: '9/30/2025', total: '10.9', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '3' },
      { date: '3/27/2025', total: '8.8', user: 'oded', b50: '', b20: '', b10: '', b5: '', b1: '5' },
      { date: '11/29/2023', total: '24.5', user: '', b50: '', b20: '', b10: '1', b5: '', b1: '10' },
    ],
  },
  {
    name: '1211 Jericho Tpke',
    address: '1211 Jericho Tpke',
    city: 'New Hyde Park',
    state: 'NY',
    region: 'Long Island',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '1/22/2026', total: '13.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '2', b1: '6' },
      { date: '5/15/2025', total: '5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '3/27/2025', total: '4.1', user: 'oded', b50: '', b20: '', b10: '', b5: '1', b1: '5' },
      { date: '1/23/2024', total: '3.8', user: '', b50: '', b20: '3', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '343 Smithtown Blvd (Smoke Shop)',
    address: '343 Smithtown Blvd',
    city: 'Ronkonkoma',
    state: 'NY',
    region: 'Long Island',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'closed temporarily 1/21/26',
    rawLogs: [
      { date: '1/22/2026', total: 'closed', user: 'mardi', b50: '', b20: '1', b10: '', b5: '1', b1: '', notes: 'closed' },
      { date: '1/21/2026', total: '', user: 'Eli', b50: '3', b20: '', b10: '2', b5: '', b1: '6', notes: 'closed temporarily' },
    ],
  },
  {
    name: '519 Middle Country Rd (Gas Station)',
    address: '519 Middle Country Rd',
    city: 'Coram',
    state: 'NY',
    region: 'Long Island',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Phone: 212-763-0872. Was closed 1/22/26',
    rawLogs: [],
  },
];

export default function ImportLongIsland() {
  const { locations } = useLocations();
  const [status, setStatus] = useState('ready');
  const [log, setLog] = useState([]);

  const addLine = (msg) => setLog((prev) => [...prev, msg]);

  const runImport = async () => {
    setStatus('running');
    addLine('Starting Long Island import...');

    const existingNames = new Set((locations || []).map((l) => l.name?.trim().toLowerCase()));
    const maxOrder = (locations || []).reduce((max, loc) => Math.max(max, loc.order || 0), -1);
    let order = maxOrder + 1;

    for (const loc of LONG_ISLAND_DATA) {
      if (existingNames.has(loc.name.trim().toLowerCase())) {
        addLine(`⏭ Skipping "${loc.name}" — already exists`);
        continue;
      }

      const logs = loc.rawLogs
        .map((r) => {
          const date = fmt(r.date);
          if (!date) return null;
          const col = parseCollection(r.total);
          const bills = {};
          const b50 = parseInt(r.b50); if (b50 > 0) bills[50] = b50;
          const b20 = parseInt(r.b20); if (b20 > 0) bills[20] = b20;
          const b10 = parseInt(r.b10); if (b10 > 0) bills[10] = b10;
          const b5 = parseInt(r.b5); if (b5 > 0) bills[5] = b5;
          const b1 = parseInt(r.b1); if (b1 > 0) bills[1] = b1;
          return {
            date,
            collection: col,
            commissionRate: loc.commissionRate,
            bills,
            user: (r.user || '').trim(),
            notes: r.notes || '',
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.date.localeCompare(a.date));

      const latest = logs[0];

      const docData = {
        name: loc.name,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        region: loc.region,
        commissionRate: loc.commissionRate,
        hasChangeMachine: loc.hasChangeMachine,
        notes: loc.notes,
        subtitle: loc.notes,
        logs,
        lastVisited: latest?.date || null,
        lastCollection: latest?.collection || '',
        bills: latest?.bills || {},
        logNotes: latest?.notes || '',
        order: order++,
        createdAt: new Date().toISOString(),
      };

      try {
        const colRef = collection(db, COLLECTION_NAME);
        const docRef = await addDoc(colRef, docData);
        addLine(`✅ Added "${loc.name}" (${logs.length} logs) — ID: ${docRef.id}`);
      } catch (e) {
        addLine(`❌ Error adding "${loc.name}": ${e.message}`);
      }
    }

    addLine('🎉 Import complete!');
    setStatus('done');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Import Long Island Data</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {LONG_ISLAND_DATA.length} locations, {LONG_ISLAND_DATA.reduce((s, l) => s + l.rawLogs.length, 0)} total log entries
        </p>

        <button
          onClick={runImport}
          disabled={status !== 'ready'}
          className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-all ${
            status === 'ready'
              ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
              : 'bg-slate-400 cursor-not-allowed'
          }`}
        >
          {status === 'ready' ? 'Run Import' : status === 'running' ? 'Importing...' : 'Done'}
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-1 max-h-[400px] overflow-y-auto">
          {log.length === 0 ? (
            <p className="text-xs text-slate-400">Waiting to start...</p>
          ) : (
            log.map((line, i) => (
              <p key={i} className="text-xs text-slate-700 dark:text-slate-300 font-mono">{line}</p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
