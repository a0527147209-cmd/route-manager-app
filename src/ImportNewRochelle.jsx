import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useLocations } from './LocationsContext';

const COLLECTION_NAME = 'customers';

function fmt(dateStr) {
  if (!dateStr) return null;
  const s = dateStr.toString().trim().replace(/\./g, '').replace(/\s+/g, '');
  const parts = s.split('/');
  if (parts.length < 2) return null;
  let m = parseInt(parts[0]), d = parseInt(parts[1]), y = parts[2] ? parseInt(parts[2]) : 2025;
  if (!m || !d) return null;
  if (y < 100) y += 2000;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseNum(val) {
  if (!val) return '0';
  const s = val.toString().trim().toLowerCase().replace(/\$/g, '').replace(/,/g, '.');
  if (s.includes('no money') || s === '') return '0';
  const n = parseFloat(s);
  return Number.isFinite(n) ? n.toFixed(2) : '0';
}

function pb(val) {
  if (!val) return 0;
  const n = parseInt(val.toString().replace(/[^0-9]/g, ''));
  return n > 0 ? n : 0;
}

const NR_DATA = [
  {
    name: '526 Main Street',
    address: '526 Main Street',
    city: 'New Rochelle',
    state: 'NY',
    region: 'New Rochelle',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Bring drill',
    rawLogs: [
      { date: '2/18/2026', total: '7.9', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/20/2026', total: '13.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/18/2025', total: '18', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '8' },
    ],
  },
  {
    name: '369 North Ave',
    address: '369 North Ave',
    city: 'New Rochelle',
    state: 'NY',
    region: 'New Rochelle',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Changed tray 12/18/25',
    rawLogs: [
      { date: '2/18/2026', total: '7.1', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/20/2026', total: '7.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '1' },
      { date: '12/18/2025', total: 'no money', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '4 Mill Rd',
    address: '4 Mill Rd',
    city: 'Eastchester',
    state: 'NY',
    region: 'New Rochelle',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Ask if they need quarters. 9145884274',
    rawLogs: [
      { date: '2/18/2026', total: '8.1', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/20/2026', total: '4.7', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/18/2025', total: '6.8', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/11/2025', total: '13.4', user: 'Eli', b50: '', b20: '1', b10: '', b5: '', b1: '5' },
    ],
  },
  {
    name: '694 McLean Ave',
    address: '694 McLean Ave',
    city: 'Yonkers',
    state: 'NY',
    region: 'New Rochelle',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '646 709 3502 call before coming. Change the alarm',
    rawLogs: [
      { date: '2/18/2026', total: '15.9', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/20/2026', total: '19.8', user: 'mardi', b50: '', b20: '1', b10: '', b5: '', b1: '2' },
      { date: '12/18/2025', total: '14.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '4' },
      { date: '11/11/2025', total: '37.9', user: 'Eli', b50: '1', b20: '', b10: '1', b5: '1', b1: '6' },
      { date: '9/1/2025', total: '42.15', user: '', b50: '1', b20: '1', b10: '', b5: '', b1: '9' },
      { date: '7/28/2025', total: '24.8', user: 'oded', b50: '', b20: '1', b10: '', b5: '', b1: '' },
      { date: '6/27/2025', total: '26.9', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
];

export default function ImportNewRochelle() {
  const { locations } = useLocations();
  const [status, setStatus] = useState('ready');
  const [log, setLog] = useState([]);

  const addLine = (msg) => setLog((prev) => [...prev, msg]);

  const runImport = async () => {
    setStatus('running');
    addLine(`Starting New Rochelle import — ${NR_DATA.length} locations...`);

    const existingNames = new Set((locations || []).map((l) => l.name?.trim().toLowerCase()));
    const maxOrder = (locations || []).reduce((max, loc) => Math.max(max, loc.order || 0), -1);
    let order = maxOrder + 1;

    for (const loc of NR_DATA) {
      if (existingNames.has(loc.name.trim().toLowerCase())) {
        addLine(`⏭ Skipping "${loc.name}" — already exists`);
        continue;
      }

      const logs = loc.rawLogs
        .map((r) => {
          const date = fmt(r.date);
          if (!date) return null;
          const col = parseNum(r.total);
          const bills = {};
          const b50 = pb(r.b50); if (b50 > 0) bills[50] = b50;
          const b20 = pb(r.b20); if (b20 > 0) bills[20] = b20;
          const b10 = pb(r.b10); if (b10 > 0) bills[10] = b10;
          const b5 = pb(r.b5); if (b5 > 0) bills[5] = b5;
          const b1 = pb(r.b1); if (b1 > 0) bills[1] = b1;
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
        addLine(`✅ Added "${loc.name}", ${loc.city} (${logs.length} logs) — ID: ${docRef.id}`);
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
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Import New Rochelle Data</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {NR_DATA.length} locations, {NR_DATA.reduce((s, l) => s + l.rawLogs.length, 0)} total log entries
        </p>
        <button
          onClick={runImport}
          disabled={status !== 'ready'}
          className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-all ${
            status === 'ready' ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]' : 'bg-slate-400 cursor-not-allowed'
          }`}
        >
          {status === 'ready' ? 'Run Import' : status === 'running' ? 'Importing...' : 'Done'}
        </button>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-1 max-h-[400px] overflow-y-auto">
          {log.length === 0 ? (
            <p className="text-xs text-slate-400">Waiting to start...</p>
          ) : log.map((line, i) => (
            <p key={i} className="text-xs text-slate-700 dark:text-slate-300 font-mono">{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
