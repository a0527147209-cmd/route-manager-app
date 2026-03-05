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
  if (y === 2028 || y === 2029) y = 2025;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseNum(val) {
  if (!val) return '0';
  const s = val.toString().trim().toLowerCase().replace(/\$/g, '').replace(/,/g, '.');
  if (s.includes('no money') || s.includes('closed') || s.includes('full reset') || s.includes('took all') || s.includes('mix') || s === '') return '0';
  const n = parseFloat(s);
  return Number.isFinite(n) ? n.toFixed(2) : '0';
}

function pb(val) {
  if (!val) return 0;
  const s = val.toString().trim().replace(/\$/g, '').replace(/[^0-9]/g, '');
  const n = parseInt(s);
  return n > 0 ? n : 0;
}

const PK_DATA = [
  {
    name: '200 S Main Street (Gas Station)',
    address: '200 S Main Street',
    city: 'Syracuse',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Go every 2 months. No money added due to no key 01/27-26',
    rawLogs: [
      { date: '1/27/2026', total: '45.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/18/2025', total: '52.7', user: 'pj', b50: '', b20: '', b10: '2', b5: '', b1: '4' },
      { date: '9/17/2025', total: '74.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '2', b1: '10' },
    ],
  },
  {
    name: '325 Broadway',
    address: '325 Broadway',
    city: 'Rensselaer',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'No cash, no watches. (518) 376-9884 call/text before coming. $179 owed 1/28/26',
    rawLogs: [
      { date: '1/28/2026', total: '22.7', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/17/2025', total: '16.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/18/2025', total: '13.7', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '6' },
      { date: '10/27/2025', total: '19.9', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '45 Lower Hudson Ave',
    address: '45 Lower Hudson Ave',
    city: 'Green Island',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '(518) 376-9884 call/text before coming. $250 owed 1/28/26. No cash, some watches',
    rawLogs: [
      { date: '1/28/2026', total: '31.3', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/17/2025', total: '27.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/18/2025', total: '16.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '10' },
      { date: '10/27/2025', total: '45.2', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/17/2025', total: '21.7', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '30 Saratoga Ave',
    address: '30 Saratoga Ave',
    city: 'Waterford',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '(518) 376-9884 call/text before coming. $378 owed 1/28/26',
    rawLogs: [
      { date: '1/28/2026', total: '47.3', user: 'mordi', b50: '', b20: '', b10: '', b5: '', b1: '14' },
      { date: '12/17/2025', total: '47.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/18/2025', total: '22.5', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '259 Main St (Gas Station)',
    address: '259 Main St',
    city: 'Williamstown',
    state: 'MA',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Put $100. Every 2 months',
    rawLogs: [
      { date: '12/17/2025', total: '10.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/28/2025', total: '13', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/27/2025', total: '18.1', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '1' },
      { date: '8/26/2025', total: '7.1', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '7' },
      { date: '7/22/2025', total: '58.2', user: 'pj', b50: '', b20: '2', b10: '1', b5: '2', b1: '13' },
      { date: '6/12/2025', total: '26.1', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '10' },
    ],
  },
  {
    name: '330 NY-212 (Laundromat)',
    address: '330 NY-212',
    city: 'Saugerties',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Has change machine. 9144003680',
    rawLogs: [
      { date: '1/27/2026', total: '20', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/28/2025', total: '58.4', user: 'Eli', b50: '', b20: '2', b10: '', b5: '1', b1: '8' },
      { date: '11/18/2025', total: '14', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/18/2025', total: '22.9', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '8/26/2025', total: '26.8', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '60 Leggs Mills Road (Gas Station)',
    address: '60 Leggs Mills Road',
    city: 'Lake Katrine',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '1/27/2026', total: '19.2', user: 'mardi', b50: '', b20: '', b10: '1', b5: '', b1: '3' },
      { date: '12/16/2025', total: '12.8', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/17/2025', total: '10', user: 'pj', b50: '', b20: '', b10: '', b5: '2', b1: '7' },
    ],
  },
  {
    name: '1693 Route 9W',
    address: '1693 Route 9W',
    city: 'Lake Katrine',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Take all the money and pay them at 743 Main Street. Has change machine. (845) 453-4122',
    rawLogs: [
      { date: '1/27/2026', total: '29.1', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/16/2025', total: '27.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '2' },
      { date: '11/17/2025', total: '39.8', user: 'pj', b50: '', b20: '1', b10: '', b5: '', b1: '4' },
      { date: '9/18/2025', total: '30.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '14 New Paltz Plaza (Laundromat)',
    address: '14 New Paltz Plaza',
    city: 'New Paltz',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: '(914) 223-9992 MUST call the day before (she leaves at 3pm). Has change machine. Bring a scale. Gumball 8.8lb 30%',
    rawLogs: [
      { date: '1/28/2026', total: '10.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/12/2026', total: '14.7', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/16/2025', total: '42.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/17/2025', total: '44.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/28/2025', total: '64.5', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '743 Main Street (Laundromat)',
    address: '743 Main Street',
    city: 'Arlington',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Linked to 1693 Route 9W. Double hopper. Owed $232 1/27/26',
    rawLogs: [
      { date: '1/27/2026', total: '31.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/16/2025', total: '32.9', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '8' },
      { date: '11/17/2025', total: '27.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/28/2025', total: '49.3', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '2' },
      { date: '9/18/2025', total: '41.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '347 Violet Ave (Laundromat)',
    address: '347 Violet Ave',
    city: 'Poughkeepsie',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Call before coming 1 (845) 518-4801',
    rawLogs: [
      { date: '1/27/2026', total: '19.4', user: 'mardi', b50: '', b20: '', b10: '1', b5: '', b1: '5' },
      { date: '12/16/2025', total: '17.9', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/17/2025', total: '23.4', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '2585 South Rd (Laundromat)',
    address: '2585 South Rd',
    city: 'Poughkeepsie',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'New motor/new tray 12/16/25',
    rawLogs: [
      { date: '1/27/2026', total: '39', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/16/2025', total: '24.7', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/28/2025', total: '40.9', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/17/2025', total: '22.2', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/18/2025', total: '24.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '440 Broadway',
    address: '440 Broadway',
    city: 'Monticello',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Text Ryan. 1x change machine — back to cash',
    rawLogs: [
      { date: '1/27/2026', total: '47.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/16/2025', total: '460', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/17/2025', total: '440', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '330 Route 211 E (Laundromat)',
    address: '330 Route 211 E',
    city: 'Middletown',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Has change machine. 7:00 AM',
    rawLogs: [
      { date: '1/27/2026', total: '41.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/16/2025', total: '25.3', user: 'mardi', b50: '', b20: '', b10: '', b5: '1', b1: '' },
      { date: '11/17/2025', total: '22.5', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '100 Cottage St',
    address: '100 Cottage St',
    city: 'Middletown',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '1/26/2026', total: '9.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/16/2025', total: '14.4', user: 'mardi', b50: '', b20: '3', b10: '1', b5: '1', b1: '12' },
      { date: '11/17/2025', total: '13.3', user: 'pj', b50: '3', b20: '', b10: '3', b5: '12', b1: '' },
    ],
  },
  {
    name: '167 West Main Street',
    address: '167 West Main Street',
    city: 'Middletown',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '1/26/2026', total: '43', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/16/2025', total: '37.8', user: 'mardi', b50: '', b20: '1', b10: '', b5: '1', b1: '5' },
      { date: '11/17/2025', total: '28.2', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '596 Broadway',
    address: '596 Broadway',
    city: 'Newburgh',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.5,
    hasChangeMachine: true,
    notes: 'Has change machine',
    rawLogs: [
      { date: '1/26/2026', total: '23.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '5' },
      { date: '12/15/2025', total: '19.6', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/17/2025', total: '5.8', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '488 Broadway (Laundromat)',
    address: '488 Broadway',
    city: 'Newburgh',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '8453130328',
    rawLogs: [
      { date: '1/26/2026', total: '24', user: 'mardi', b50: '', b20: '1', b10: '', b5: '2', b1: '5' },
      { date: '12/15/2025', total: '23.2', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/17/2025', total: '21.2', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '411 Broadway (Laundromat)',
    address: '411 Broadway',
    city: 'Newburgh',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '1/26/2026', total: '45.7', user: 'mardi', b50: '', b20: '', b10: '1', b5: '2', b1: '10' },
      { date: '12/15/2025', total: '58.4', user: 'mardi', b50: '', b20: '3', b10: '1', b5: '', b1: '10' },
      { date: '11/17/2025', total: '30.8', user: 'pj', b50: '2', b20: '1', b10: '2', b5: '10', b1: '11' },
    ],
  },
  {
    name: '160 S Robinson Ave (Car Wash)',
    address: '160 S Robinson Ave',
    city: 'Newburgh',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Has change machine. 8455613370, 8 to 5pm',
    rawLogs: [
      { date: '1/28/2026', total: '26.7', user: 'mardi', b50: '', b20: '', b10: '1', b5: '1', b1: '6' },
      { date: '11/17/2025', total: '19.3', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/19/2025', total: '13.1', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '6' },
      { date: '8/25/2025', total: '20', user: 'Hershey', b50: '', b20: '1', b10: '1', b5: '', b1: '4' },
    ],
  },
  {
    name: '2554 South Ave',
    address: '2554 South Ave',
    city: 'Wappingers Falls',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.45,
    hasChangeMachine: false,
    notes: '917 226 4411 Mario the owner. 845 476 6192. Come morning to 1pm. Owed 23.04 lbs 1/28/26',
    rawLogs: [
      { date: '1/28/2026', total: '51.2', user: 'mardi', b50: '', b20: '', b10: '1', b5: '1', b1: '5' },
      { date: '12/11/2025', total: '25.8', user: 'pj', b50: '', b20: '1', b10: '', b5: '', b1: '6' },
      { date: '11/16/2025', total: '26.2', user: 'pj', b50: '', b20: '', b10: '', b5: '2', b1: '6' },
      { date: '10/28/2025', total: '42', user: 'Eli', b50: '', b20: '2', b10: '1', b5: '', b1: '3' },
    ],
  },
  {
    name: '1565 NY-22 (Gas Station)',
    address: '1565 NY-22',
    city: 'Brewster',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.45,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '1/26/2026', total: '5.7', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/15/2025', total: '7.5', user: 'mardi', b50: '', b20: '', b10: '', b5: '4', b1: '' },
      { date: '11/16/2025', total: '9.8', user: 'pj', b50: '', b20: '', b10: '', b5: '1', b1: '8' },
    ],
  },
  {
    name: '20 Welcher Ave #2 (Laundromat)',
    address: '20 Welcher Ave #2',
    city: 'Peekskill',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Closing at 11 PM. Text Ryan. 1x change machine',
    rawLogs: [
      { date: '1/26/2026', total: '49.1', user: 'mardi', b50: '', b20: '3', b10: '', b5: '', b1: '4' },
      { date: '12/15/2025', total: '419', user: 'mardi', b50: '', b20: '1', b10: '', b5: '1', b1: '3' },
      { date: '11/16/2025', total: '11.1', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/28/2025', total: '187.5', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '37 New Main St',
    address: '37 New Main St',
    city: 'Haverstraw',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Text Ryan. 1x change machine 7.92. Need to change bill acceptor — only accepts $1 bill',
    rawLogs: [
      { date: '1/28/2026', total: '19.8', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/15/2025', total: '0', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '', notes: 'full reset' },
      { date: '11/16/2025', total: 'no money', user: '', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '37 S Main Street',
    address: '37 S Main Street',
    city: 'Spring Valley',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Text Ryan. No $20. 1x change machine',
    rawLogs: [
      { date: '1/26/2026', total: '13.4', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/16/2025', total: '11.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '3/26/2025', total: '11', user: 'Hershey', b50: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '6 Red Schoolhouse Rd',
    address: '6 Red Schoolhouse Rd',
    city: 'Spring Valley',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Text Ryan. No $20. 1x change machine needs a new stacker',
    rawLogs: [
      { date: '1/26/2026', total: '42.1', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/10/2025', total: '0', user: 'pj', b50: '', b20: '', b10: '1', b5: '', b1: '9', notes: 'no money' },
      { date: '11/16/2025', total: '26.6', user: '', b50: '', b20: '', b10: '1', b5: '1', b1: '5' },
    ],
  },
  {
    name: '46 South Franklin St (Laundromat)',
    address: '46 South Franklin St',
    city: 'Nyack',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Closed due to weather 1/26/26. Revisit',
    rawLogs: [
      { date: '1/28/2026', total: '21.2', user: 'pj', b50: '', b20: '', b10: '', b5: '1', b1: '1' },
      { date: '12/15/2025', total: '23.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/11/2025', total: '10.8', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '3' },
    ],
  },
  {
    name: '610 Central Park Ave (Gas Station)',
    address: '610 Central Park Ave',
    city: 'Scarsdale',
    state: 'NY',
    region: 'Poughkeepsie',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Every 2 months. Shiva 5513259404. Machine was off about a month/changed motor 11/11/25',
    rawLogs: [
      { date: '12/26/2025', total: '11.8', user: 'mardi', b50: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/11/2025', total: '11.7', user: 'Eli', b50: '', b20: '', b10: '', b5: '', b1: '1' },
      { date: '7/20/2025', total: '34.6', user: 'pj', b50: '', b20: '', b10: '', b5: '', b1: '11' },
      { date: '5/6/2025', total: '17.8', user: 'mardi', b50: '1', b20: '', b10: '1', b5: '', b1: '' },
    ],
  },
];

export default function ImportPoughkeepsie() {
  const { locations } = useLocations();
  const [status, setStatus] = useState('ready');
  const [log, setLog] = useState([]);

  const addLine = (msg) => setLog((prev) => [...prev, msg]);

  const runImport = async () => {
    setStatus('running');
    addLine(`Starting Poughkeepsie import — ${PK_DATA.length} locations...`);

    const existingNames = new Set((locations || []).map((l) => l.name?.trim().toLowerCase()));
    const maxOrder = (locations || []).reduce((max, loc) => Math.max(max, loc.order || 0), -1);
    let order = maxOrder + 1;

    for (const loc of PK_DATA) {
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
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Import Poughkeepsie Data</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {PK_DATA.length} locations, {PK_DATA.reduce((s, l) => s + l.rawLogs.length, 0)} total log entries
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
