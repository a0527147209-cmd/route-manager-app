import { useState } from 'react';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';
import { useLocations } from './LocationsContext';

const COLLECTION_NAME = 'customers';

function fmt(dateStr) {
  if (!dateStr) return null;
  const s = dateStr.trim();
  const parts = s.split('/');
  if (parts.length !== 3) return null;
  let [m, d, y] = parts.map(Number);
  if (y < 100) y += 2000;
  if (y === 2029) y = 2025;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseCollection(totalWeight) {
  if (!totalWeight) return '';
  const s = totalWeight.toString().trim().toLowerCase();
  if (s.includes('no money') || s === '' || s === '0') return '0';
  const cleaned = s.replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n.toFixed(2) : '0';
}

function parseBills(row) {
  const bills = {};
  const b50 = parseInt(row.b50); if (b50 > 0) bills[50] = b50;
  const b20 = parseInt(row.b20); if (b20 > 0) bills[20] = b20;
  const b10 = parseInt(row.b10); if (b10 > 0) bills[10] = b10;
  const b5 = parseInt(row.b5); if (b5 > 0) bills[5] = b5;
  const b1 = parseInt(row.b1); if (b1 > 0) bills[1] = b1;
  return bills;
}

const HARLEM_DATA = [
  {
    name: '600 West 173st',
    address: '600 West 173st',
    city: 'New York',
    state: 'NY',
    region: 'Harlem',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '1/20/2026', total: '11.4', half: '5.7', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '4' },
      { date: '12/18/2025', total: '16.2', half: '8.1', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '9' },
      { date: '10/29/2025', total: '9.5', half: '4.75', user: 'Eli', b50: '', b20: '', b10: '', b5: '1', b1: '5' },
      { date: '9/29/2025', total: '14.1', half: '7.05', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '8' },
    ],
  },
  {
    name: '3476 Broadway',
    address: '3476 Broadway',
    city: 'Harlem',
    state: 'NY',
    region: 'Harlem',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'needs change machine, changed tray 1/20/26',
    rawLogs: [
      { date: '1/20/2026', total: '', half: '', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/18/2025', total: 'no money', half: '', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/25/2025', total: 'no money', half: '', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/29/2025', total: 'no money', half: '', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '2037 7th Ave',
    address: '2037 7th Ave',
    city: 'Harlem',
    state: 'NY',
    region: 'Harlem',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '1/20/2026', total: '4.2', half: '2.1', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/29/2025', total: '5.2', half: '2.6', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/29/2025', total: 'no money', half: '', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '242 W 116th Street',
    address: '242 W 116th Street',
    city: 'Harlem',
    state: 'NY',
    region: 'Harlem',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Trying regular fill up',
    rawLogs: [
      { date: '1/20/2026', total: '6', half: '3', user: 'mardi', b50: '', b20: '', b10: '1', b5: '1', b1: '7' },
      { date: '10/29/2025', total: '5.3', half: '2.65', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/29/2025', total: 'no money', half: '', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/1/2025', total: '3.4', half: '1.7', user: 'oded', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '5/12/2025', total: 'no money', half: '', user: 'oded', b50: '', b20: '', b10: '', b5: '', b1: '', notes: 'machine was off' },
    ],
  },
  {
    name: '2156 2nd Ave',
    address: '2156 2nd Ave',
    city: 'Harlem',
    state: 'NY',
    region: 'Harlem',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '1/20/2026', total: '23.1', half: '11.55', user: 'mardi', b50: '', b20: '', b10: '1', b5: '1', b1: '6' },
      { date: '12/18/2025', total: '39', half: '19.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '4' },
      { date: '10/29/2025', total: '18.6', half: '9.3', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/29/2025', total: '28.9', half: '14.45', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '8' },
      { date: '9/1/2025', total: '19.3', half: '9.65', user: 'oded', b50: '1', b20: '', b10: '', b5: '', b1: '' },
      { date: '7/29/2025', total: '24', half: '12', user: 'oded', b50: '', b20: '', b10: '', b5: '', b1: '4' },
      { date: '3/18/2025', total: '32', half: '16', user: 'hershey', b50: '2', b20: '', b10: '', b5: '1', b1: '10' },
    ],
  },
];

export default function ImportHarlem() {
  const { locations } = useLocations();
  const [status, setStatus] = useState('ready');
  const [log, setLog] = useState([]);

  const addLine = (msg) => setLog((prev) => [...prev, msg]);

  const runImport = async () => {
    setStatus('running');
    addLine('Starting Harlem import...');

    const existingNames = new Set((locations || []).map((l) => l.name?.trim().toLowerCase()));
    const maxOrder = (locations || []).reduce((max, loc) => Math.max(max, loc.order || 0), -1);
    let order = maxOrder + 1;

    for (const loc of HARLEM_DATA) {
      if (existingNames.has(loc.name.trim().toLowerCase())) {
        addLine(`⏭ Skipping "${loc.name}" — already exists`);
        continue;
      }

      const logs = loc.rawLogs
        .map((r) => {
          const date = fmt(r.date);
          if (!date) return null;
          const col = parseCollection(r.total);
          const bills = parseBills(r);
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
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Import Harlem Data</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          5 locations, {HARLEM_DATA.reduce((s, l) => s + l.rawLogs.length, 0)} total log entries
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
