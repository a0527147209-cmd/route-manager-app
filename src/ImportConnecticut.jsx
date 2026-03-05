import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useLocations } from './LocationsContext';

const COLLECTION_NAME = 'customers';

function fmt(dateStr) {
  if (!dateStr) return null;
  const s = dateStr.toString().trim().replace(/\./g, '').replace(/\s+/g, '');
  const parts = s.split('/');
  if (parts.length !== 3) {
    if (parts.length === 2) {
      let [m, d] = parts.map(Number);
      if (m && d) return `2025-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }
  let [m, d, y] = parts.map(Number);
  if (!m || !d || !y) return null;
  if (y < 100) y += 2000;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseNum(val) {
  if (!val) return '0';
  const s = val.toString().trim().toLowerCase().replace(/\$/g, '').replace(/,/g, '.');
  if (s.includes('no money') || s.includes('closed') || s === '' || s === '0') return '0';
  const n = parseFloat(s);
  return Number.isFinite(n) ? n.toFixed(2) : '0';
}

function parseBill(val) {
  if (!val) return 0;
  const s = val.toString().trim().replace(/\$/g, '').replace(/[^0-9]/g, '');
  const n = parseInt(s);
  return n > 0 ? n : 0;
}

const CT_DATA = [
  {
    name: '67 New Town Rd',
    address: '67 New Town Rd',
    city: 'Danbury',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.3,
    hasChangeMachine: false,
    notes: 'must call before +1 (203) 217-7122. No game machine only toy rack',
    rawLogs: [
      { date: '1/15/2025', total: '62.6', user: 'mardi', b50: '', b20: '1', b10: '1', b5: '1', b1: '9' },
      { date: '2/20/2025', total: '42', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '5/8/2025', total: '28', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '7/24/2025', total: '24.6', user: 'toy collect', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '1153 S Main St (Gas Station)',
    address: '1153 S Main St',
    city: 'Waterbury',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/9/2026', total: '13.3', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/13/2026', total: '16.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/8/2025', total: '7.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '19 Waterbury Rd (Laundromat)',
    address: '19 Waterbury Rd',
    city: 'Thomaston',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Has change machine. Paid with quarters. Closes at 7pm. Put $50',
    rawLogs: [
      { date: '2/9/2026', total: '22.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '4' },
      { date: '1/14/2026', total: '30', user: 'mardi', b50: '', b20: '1', b10: '', b5: '1', b1: '6' },
      { date: '12/8/2025', total: '28', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '4' },
      { date: '11/12/2025', total: '23', user: 'Eli', b50: '1', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '45 N Main St',
    address: '45 N Main St',
    city: 'Bristol',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Has change machine. Shaking/change machine jammed/added L bracket 2/9/26',
    rawLogs: [
      { date: '2/9/2026', total: '11.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/14/2026', total: '25', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '6' },
      { date: '12/8/2025', total: '24.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '146 Shield Street',
    address: '146 Shield Street',
    city: 'West Hartford',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/10/2026', total: '17.3', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '2' },
      { date: '1/14/2026', total: '22', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/8/2025', total: '12.8', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '314 Farmington Ave (Check Cashing)',
    address: '314 Farmington Ave',
    city: 'Hartford',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '8pm closed, call before coming 860 247 6429. Put a $50. Machine needs minor fix, must do after 8pm (too busy)',
    rawLogs: [
      { date: '2/10/2026', total: '42.5', user: 'mardi', b50: '', b20: '2', b10: '', b5: '3', b1: '12' },
      { date: '1/14/2026', total: '68', user: 'mardi', b50: '', b20: '2', b10: '1', b5: '3', b1: '13' },
      { date: '12/9/2025', total: '60.8', user: 'pj', b50: '3', b20: '3', b10: '3', b5: '19', b1: '' },
    ],
  },
  {
    name: '577 Burnside Ave',
    address: '577 Burnside Ave',
    city: 'East Hartford',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'They buy extra quarters 2k. Boss number 7862808645, call before',
    rawLogs: [
      { date: '2/10/2026', total: '25.8', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/14/2026', total: '30.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '10' },
      { date: '10/21/2025', total: '43.9', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/8/2025', total: '33.2', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '886 Hartford Rd (Gas Station)',
    address: '886 Hartford Rd',
    city: 'Manchester',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Machine was off/wants it out 2/10/26',
    rawLogs: [
      { date: '2/10/2026', total: 'no money', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/14/2026', total: '22.5', user: 'mardi', b50: '', b20: '1', b10: '1', b5: '', b1: '7' },
      { date: '12/8/2025', total: '10.6', user: 'pj', b50: '', b20: '', b10: '1', b5: '1', b1: '8' },
    ],
  },
  {
    name: '88 Bridge St',
    address: '88 Bridge St',
    city: 'East Windsor',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '11pm doors closed. Call one hour before (860) 944-8146. GO TO SPRINGFIELD',
    rawLogs: [
      { date: '2/10/2026', total: '58.1', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/14/2026', total: '91.4', user: 'mardi', b50: '', b20: '1', b10: '1', b5: '2', b1: '' },
      { date: '12/8/2025', total: '59.4', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/21/2025', total: '145.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '8/27/2025', total: '72.4', user: 'pj', b50: '', b20: '', b10: '1', b5: '2', b1: '8' },
    ],
  },
  {
    name: '141 S Main Street',
    address: '141 S Main Street',
    city: 'Brooklyn',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Call before going (at least a day before) 8609423404. Machine needs to be picked up asap',
    rawLogs: [
      { date: '12/9/2025', total: '20.4', user: 'pj', b50: '', b20: '', b10: '1', b5: '2', b1: '8' },
      { date: '11/13/2025', total: '17.8', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/5/2025', total: '41.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '37 Westcott Rd',
    address: '37 Westcott Rd',
    city: 'Danielson',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Call before going 8609423404. Put $50 10/23/25. Machine fully fixed 2/9/2026',
    rawLogs: [
      { date: '2/9/2026', total: '21.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/14/2026', total: '53.3', user: 'mardi', b50: '', b20: '3', b10: '1', b5: '', b1: '11' },
      { date: '12/9/2025', total: '38.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/13/2025', total: '45.7', user: 'Eli', b50: '', b20: '', b10: '1', b5: '1', b1: '5' },
    ],
  },
  {
    name: '591 RT-12',
    address: '591 RT-12',
    city: 'Groton',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '2 Machines, 1 in the back',
    rawLogs: [
      { date: '2/10/2026', total: '23.7', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/14/2026', total: '10', user: 'mardi', b50: '', b20: '1', b10: '', b5: '', b1: '4' },
      { date: '12/9/2025', total: '20.2', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/13/2025', total: '10', user: 'Eli', b50: '', b20: '1', b10: '', b5: '1', b1: '1' },
    ],
  },
  {
    name: '712 Long Hill Rd (Laundromat)',
    address: '712 Long Hill Rd',
    city: 'Groton',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Has change machine',
    rawLogs: [
      { date: '2/10/2026', total: '17.3', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/15/2026', total: '30.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/9/2025', total: '11.9', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '117 Boston Post Rd (Laundromat)',
    address: '117 Boston Post Rd',
    city: 'Waterford',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Has change machine (bill acceptor needs change 12/9/25). Has gums. Put $50',
    rawLogs: [
      { date: '2/10/2026', total: 'no money', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/15/2026', total: '6.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/9/2025', total: '7.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/21/2025', total: '11.1', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '159 Norwich Ave',
    address: '159 Norwich Ave',
    city: 'Colchester',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Call before (No cash). Phone: 1-646-203-7024',
    rawLogs: [
      { date: '2/10/2026', total: '8.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/15/2026', total: '22.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '', notes: 'no cash' },
      { date: '12/9/2025', total: '16', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/13/2025', total: '14.2', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '', notes: 'no cash' },
    ],
  },
  {
    name: '749 Saybrook Rd (Laundromat)',
    address: '749 Saybrook Rd',
    city: 'Middletown',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'No $20s. Call Luis (203 393 6039)(860 343 9286). 38.55 lbs owed 2/10/2026',
    rawLogs: [
      { date: '2/10/2026', total: '21.9', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '' },
      { date: '1/15/2026', total: '28.9', user: 'mardi', b50: '', b20: '', b10: '2', b5: '1', b1: '8' },
      { date: '12/9/2025', total: '25', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/13/2025', total: '19.4', user: 'Eli', b50: '', b20: '', b10: '', b5: '1', b1: '' },
      { date: '10/22/2025', total: '20.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '280 E Main Street (Laundromat)',
    address: '280 E Main Street',
    city: 'Middletown',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Toy rack 35%. 860 575 9719, call before, text picture',
    rawLogs: [
      { date: '1/15/2026', total: '36.3', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/9/2025', total: '40.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '34 Shunpike Rd (Laundromat)',
    address: '34 Shunpike Rd',
    city: 'Cromwell',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Closed due to electrical issues 2/10/26',
    rawLogs: [
      { date: '1/15/2026', total: 'no money', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/9/2025', total: '5.1', user: 'pj', b50: '1', b20: '', b10: '1', b5: '1', b1: '' },
      { date: '11/13/2025', total: '4.5', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/3/2025', total: '4.3', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '7/30/2025', total: '15.5', user: 'mardi', b50: '1', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '920 Foxon Rd (Laundromat)',
    address: '920 Foxon Rd',
    city: 'East Haven',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/10/2026', total: '8.7', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/15/2026', total: '17', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/10/2025', total: '17', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '556 Ferry St (Laundromat)',
    address: '556 Ferry St',
    city: 'New Haven',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/10/2026', total: '36', user: 'mardi', b50: '', b20: '2', b10: '', b5: '5', b1: '10' },
      { date: '1/15/2026', total: '37.3', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/10/2025', total: '39.8', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '4 Brushy Plain Rd (Laundromat)',
    address: '4 Brushy Plain Rd',
    city: 'Branford',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/11/2026', total: '21.8', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '8' },
      { date: '1/15/2026', total: '27.3', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/10/2025', total: '40.8', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '244 Main St (Quick Wash)',
    address: '244 Main St',
    city: 'Branford',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'koli 2032177122',
    rawLogs: [
      { date: '2/11/2026', total: '35', user: 'mardi', b50: '', b20: '1', b10: '', b5: '1', b1: '9' },
      { date: '1/15/2026', total: '38.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/10/2025', total: '57.8', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '485 W Main St (Billiards)',
    address: '485 W Main St',
    city: 'Branford',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: true,
    notes: '203 996 6001 (Rosa), Dave 203 627 0527. Has change machine',
    rawLogs: [
      { date: '2/10/2026', total: '12.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/15/2026', total: '22.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/10/2025', total: '24.4', user: 'pj', b50: '', b20: '1', b10: '1', b5: '7', b1: '11' },
    ],
  },
  {
    name: '1372 Whalley Ave (Deli)',
    address: '1372 Whalley Ave',
    city: 'New Haven',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Has change machine',
    rawLogs: [
      { date: '2/11/2026', total: '5.1', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/15/2026', total: '12', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/10/2025', total: '9.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '249 Naugatuck Ave (Laundromat)',
    address: '249 Naugatuck Ave',
    city: 'Milford',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Every 2 months',
    rawLogs: [
      { date: '2/11/2026', total: '40.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/10/2025', total: '39.3', user: 'pj', b50: '2', b20: '', b10: '2', b5: '', b1: '' },
      { date: '10/22/2025', total: '47.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '418 Garfield Ave (Laundromat)',
    address: '418 Garfield Ave',
    city: 'Bridgeport',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/11/2026', total: '14.7', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/15/2026', total: '52', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '7' },
      { date: '12/10/2025', total: '44.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '7' },
    ],
  },
  {
    name: '1342 Park Ave (Laundromat)',
    address: '1342 Park Ave',
    city: 'Bridgeport',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/11/2026', total: '32.7', user: 'mardi', b50: '', b20: '1', b10: '', b5: '', b1: '3' },
      { date: '1/15/2026', total: '33.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '10' },
      { date: '12/10/2025', total: '60.4', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '316 Wood Ave (Laundromat)',
    address: '316 Wood Ave',
    city: 'Bridgeport',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'x2 machines. Put extra 20s, 5s, and 10s',
    rawLogs: [
      { date: '2/11/2026', total: '76.5', user: 'mardi', b50: '', b20: '1', b10: '1', b5: '2', b1: '16' },
      { date: '1/15/2026', total: '66.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/10/2025', total: '115.7', user: 'pj', b50: '', b20: '2', b10: '', b5: '', b1: '10' },
      { date: '10/22/2025', total: '119.3', user: 'mardi', b50: '2', b20: '4', b10: '16', b5: '', b1: '' },
    ],
  },
  {
    name: '2615 Fairfield Ave',
    address: '2615 Fairfield Ave',
    city: 'Bridgeport',
    state: 'CT',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/11/2026', total: '5.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/15/2026', total: 'no money', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/10/2025', total: '5.8', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '179 Westchester Ave',
    address: '179 Westchester Ave',
    city: 'Port Chester',
    state: 'NY',
    region: 'Connecticut',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Call before',
    rawLogs: [
      { date: '2/11/2026', total: '30.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/12/2026', total: '65.7', user: 'mardi', b50: '1', b20: '1', b10: '2', b5: '11', b1: '7' },
      { date: '12/4/2025', total: '66.3', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '6' },
      { date: '10/20/2025', total: '97.9', user: 'mardi', b50: '', b20: '2', b10: '1', b5: '2', b1: '12' },
      { date: '9/2/2025', total: '30.3', user: 'mardi', b50: '', b20: '', b10: '1', b5: '1', b1: '8' },
    ],
  },
];

export default function ImportConnecticut() {
  const { locations } = useLocations();
  const [status, setStatus] = useState('ready');
  const [log, setLog] = useState([]);

  const addLine = (msg) => setLog((prev) => [...prev, msg]);

  const runImport = async () => {
    setStatus('running');
    addLine(`Starting Connecticut import — ${CT_DATA.length} locations...`);

    const existingNames = new Set((locations || []).map((l) => l.name?.trim().toLowerCase()));
    const maxOrder = (locations || []).reduce((max, loc) => Math.max(max, loc.order || 0), -1);
    let order = maxOrder + 1;

    for (const loc of CT_DATA) {
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
          const b50 = parseBill(r.b50); if (b50 > 0) bills[50] = b50;
          const b20 = parseBill(r.b20); if (b20 > 0) bills[20] = b20;
          const b10 = parseBill(r.b10); if (b10 > 0) bills[10] = b10;
          const b5 = parseBill(r.b5); if (b5 > 0) bills[5] = b5;
          const b1 = parseBill(r.b1); if (b1 > 0) bills[1] = b1;
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
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Import Connecticut Data</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {CT_DATA.length} locations, {CT_DATA.reduce((s, l) => s + l.rawLogs.length, 0)} total log entries
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
