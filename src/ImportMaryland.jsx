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
  if (s.includes('no money') || s === 'closed' || s.includes('machine off') || s.includes('installed') || s.includes('police') || s === '') return '0';
  const n = parseFloat(s);
  return Number.isFinite(n) ? n.toFixed(2) : '0';
}

function pb(val) {
  if (!val) return 0;
  const s = val.toString().replace(/[^0-9]/g, '');
  const n = parseInt(s);
  return n > 0 ? n : 0;
}

const MD_DATA = [
  {
    name: '709 Third St',
    address: '709 Third St',
    city: 'Hanover',
    state: 'PA',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'No 20s, replace cup door. Call 2 hours before, do not open machine without customer. 4433869072 tom grimm new owner. 1 (443) 340-4357 call before coming',
    rawLogs: [
      { date: '2/5/2026', total: '77.1', user: 'pj', b20: '1', b10: '', b5: '3', b1: '10' },
      { date: '12/30/2025', total: '27.8', user: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/1/2025', total: '68', user: 'yuda', b20: '', b10: '2', b5: '', b1: '15' },
      { date: '11/5/2025', total: '60.4', user: 'Hershey', b20: '1', b10: '', b5: '2', b1: '6' },
      { date: '10/20/2025', total: '63.9', user: 'Hershey', b20: '', b10: '1', b5: '1', b1: '6' },
    ],
  },
  {
    name: '1365 N Main St',
    address: '1365 N Main St',
    city: 'Hampstead',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'No 20s. (410) 984-3739 call one day before coming. Has change machine. Paid with quarters. Call 1 hour before, come before 8',
    rawLogs: [
      { date: '2/5/2026', total: '57', user: 'mardi', b20: '', b10: '', b5: '2', b1: '3' },
      { date: '12/31/2025', total: '44.7', user: 'pj', b20: '', b10: '1', b5: '', b1: '3' },
      { date: '12/1/2025', total: '37', user: 'yuda', b20: '', b10: '', b5: '3', b1: '8' },
      { date: '11/6/2025', total: '47.3', user: 'pj', b20: '', b10: '', b5: '1', b1: '7' },
      { date: '9/28/2025', total: '56', user: 'Hershey', b20: '', b10: '1', b5: '2', b1: '' },
    ],
  },
  {
    name: '2284 Baltimore Blvd',
    address: '2284 Baltimore Blvd',
    city: 'Finksburg',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Gas station. Every 2 months. Not a full reset. Secure machine to the wall',
    rawLogs: [
      { date: '11/6/2025', total: '5.3', user: '', b20: '', b10: '', b5: '1', b1: '7' },
      { date: '9/28/2025', total: '18.9', user: '', b20: '', b10: '1', b5: '', b1: '3' },
      { date: '7/22/2025', total: '19.7', user: 'Hershey', b20: '1', b10: '1', b5: '', b1: '3' },
      { date: '5/28/2025', total: '11.8', user: 'mardi', b20: '', b10: '', b5: '', b1: '' },
      { date: '2/10/2025', total: '8.2', user: 'yuda', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/30/2024', total: '17.9', user: '', b20: '', b10: '1', b5: '', b1: '' },
    ],
  },
  {
    name: '1631 West Liberty Rd',
    address: '1631 West Liberty Rd',
    city: 'Sykesville',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Gas Station. We have to come back to install the machine again. 2405432091 boby no answer 9/28/25',
    rawLogs: [
      { date: '5/28/2025', total: '0', user: 'mardi', b20: '', b10: '', b5: '', b1: '' },
      { date: '3/13/2025', total: '0', user: 'Hershey', b20: '2', b10: '', b5: '', b1: '' },
      { date: '2/7/2025', total: '17.2', user: 'mardi', b20: '', b10: '', b5: '', b1: '5' },
    ],
  },
  {
    name: '6 E Ridgeville Blvd',
    address: '6 E Ridgeville Blvd',
    city: 'Mount Airy',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Smoke shop. Every 2 months. Needs new tray',
    rawLogs: [
      { date: '3/4/2026', total: '5', user: 'yuda', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/20/2025', total: '0', user: 'Hershey', b20: '', b10: '', b5: '', b1: '5' },
      { date: '7/22/2025', total: '1.5', user: 'Hershey', b20: '', b10: '', b5: '', b1: '5' },
    ],
  },
  {
    name: '36 S Market St',
    address: '36 S Market St',
    city: 'Frederick',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Smoke Shop. No 20s. Every 2 months. Machine picked up 3/4/26',
    rawLogs: [
      { date: '3/4/2026', total: '3', user: 'yuda', b20: '', b10: '', b5: '', b1: '' },
      { date: '9/28/2025', total: '0', user: 'mardi', b20: '', b10: '', b5: '', b1: '' },
      { date: '7/22/2025', total: '11.9', user: 'Hershey', b20: '', b10: '', b5: '', b1: '9' },
    ],
  },
  {
    name: '4 S McCain Dr',
    address: '4 S McCain Dr',
    city: 'Frederick',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Smoke Shop. Every 2 months',
    rawLogs: [
      { date: '3/4/2026', total: '20', user: 'yuda', b20: '', b10: '1', b5: '3', b1: '8' },
      { date: '10/20/2025', total: '12.7', user: 'hershey', b20: '', b10: '', b5: '1', b1: '2' },
      { date: '7/22/2025', total: '8', user: 'Hershey', b20: '', b10: '', b5: '', b1: '2' },
    ],
  },
  {
    name: '718 Reisterstown Rd',
    address: '718 Reisterstown Rd',
    city: 'Pikesville',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Put only 1 time $50 11/6/25',
    rawLogs: [
      { date: '3/4/2026', total: '25.6', user: 'yuda', b20: '', b10: '1', b5: '3', b1: '8' },
      { date: '12/3/2025', total: '8.7', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/6/2025', total: '7.4', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '6703 York Rd',
    address: '6703 York Rd',
    city: 'Baltimore',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Bowling alley. Monday is closed 4pm to 9pm. Call me to confirm, in summer open everyday. 4103778115 call this number',
    rawLogs: [
      { date: '3/4/2026', total: '45', user: 'yuda', b20: '1', b10: '1', b5: '2', b1: '6' },
      { date: '12/31/2025', total: '29.7', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/6/2025', total: '25.5', user: 'pj', b20: '2', b10: '', b5: '', b1: '8' },
      { date: '10/20/2025', total: '0', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
      { date: '7/28/2025', total: '6.6', user: 'Hershey', b20: '3', b10: '1', b5: '3', b1: '13' },
    ],
  },
  {
    name: '2333 East Northern Parkway',
    address: '2333 East Northern Parkway',
    city: 'Baltimore',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.45,
    hasChangeMachine: false,
    notes: 'Do not put $20. Double hopper. Not full reset, they need permits. Needs replacement wire for double hopper',
    rawLogs: [
      { date: '2/26/2026', total: '0', user: 'yuda', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/31/2025', total: '5.3', user: 'pj', b20: '', b10: '1', b5: '1', b1: '8' },
      { date: '12/3/2025', total: '7.6', user: 'pj', b20: '', b10: '1', b5: '2', b1: '8' },
      { date: '11/6/2025', total: '7.1', user: 'pj', b20: '', b10: '', b5: '2', b1: '10' },
    ],
  },
  {
    name: '1601 E Joppa Rd',
    address: '1601 E Joppa Rd',
    city: 'Towson',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Machine picked up',
    rawLogs: [
      { date: '5/6/2025', total: '0', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/3/2024', total: '6', user: 'yuda', b20: '1', b10: '1', b5: '2', b1: '12' },
    ],
  },
  {
    name: '8870 Waltham Woods Rd',
    address: '8870 Waltham Woods Rd',
    city: 'Parkville',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Parkville Laundromat. Has G/T. Double hopper. Machine is off, dont want 9/29/25 - Danny need to talk to them. Dont go till Danny gets the license',
    rawLogs: [
      { date: '9/29/2025', total: '22.4', user: 'Hershey', b20: '2', b10: '', b5: '2', b1: '3' },
      { date: '8/20/2025', total: '20.3', user: 'pj', b20: '', b10: '', b5: '', b1: '4' },
      { date: '7/28/2025', total: '25.5', user: 'hershey', b20: '', b10: '', b5: '1', b1: '4' },
      { date: '7/2/2025', total: '27.5', user: 'mardi', b20: '', b10: '', b5: '', b1: '' },
      { date: '5/28/2025', total: '22.3', user: 'mardi', b20: '', b10: '', b5: '', b1: '' },
      { date: '3/12/2025', total: '5.7', user: 'hershey', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '2039 E Joppa Rd',
    address: '2039 E Joppa Rd',
    city: 'Parkville',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '8015565649 - they buy all coins',
    rawLogs: [
      { date: '2/26/2026', total: '81', user: 'yuda', b20: '3', b10: '1', b5: '3', b1: '15' },
      { date: '12/31/2025', total: '61.5', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/3/2025', total: '49.8', user: 'pj', b20: '2', b10: '1', b5: '', b1: '9' },
      { date: '11/6/2025', total: '50.9', user: 'pj', b20: '', b10: '', b5: '', b1: '3' },
    ],
  },
  {
    name: '4369 Ebenezer Rd',
    address: '4369 Ebenezer Rd',
    city: 'Nottingham',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Smoke Shop. 5713207420 - they buy all coins. Closes 8pm',
    rawLogs: [
      { date: '2/26/2026', total: '27.8', user: 'yuda', b20: '1', b10: '1', b5: '3', b1: '8' },
      { date: '12/3/2025', total: '11.8', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/21/2025', total: '9.6', user: 'Hershey', b20: '', b10: '', b5: '', b1: '5' },
    ],
  },
  {
    name: '4908 Hazelwood Ave',
    address: '4908 Hazelwood Ave',
    city: 'Baltimore',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Deli. Machine picked up 12/3/25',
    rawLogs: [
      { date: '10/21/2025', total: '18.2', user: 'Hershey', b20: '', b10: '', b5: '', b1: '4' },
      { date: '9/29/2025', total: '25.6', user: 'pj', b20: '', b10: '1', b5: '', b1: '' },
      { date: '8/20/2025', total: '21.8', user: 'pj', b20: '', b10: '1', b5: '', b1: '9' },
    ],
  },
  {
    name: '1727 Chesaco Ave',
    address: '1727 Chesaco Ave',
    city: 'Rosedale',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Tobacco stop. They buy all coins',
    rawLogs: [
      { date: '2/26/2026', total: '36.6', user: 'yuda', b20: '1', b10: '1', b5: '2', b1: '5' },
      { date: '12/31/2025', total: '18.8', user: 'pj', b20: '', b10: '', b5: '', b1: '2' },
      { date: '12/3/2025', total: '19.2', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '1320 Eastern Boulevard',
    address: '1320 Eastern Boulevard',
    city: 'Essex',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Tobacco and convenient. 4108124504. They buy all coins',
    rawLogs: [
      { date: '2/26/2026', total: '100', user: 'yuda', b20: '2', b10: '1', b5: '3', b1: '15' },
      { date: '12/31/2025', total: '42.7', user: 'pj', b20: '2', b10: '1', b5: '1', b1: '9' },
      { date: '12/3/2025', total: '46.6', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '724 Eastern Blvd',
    address: '724 Eastern Blvd',
    city: 'Essex',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Gas station. 4436527018. Machine picked up 2/26/26',
    rawLogs: [
      { date: '2/26/2026', total: '0', user: 'yuda', b20: '', b10: '', b5: '', b1: '' },
      { date: '12/3/2025', total: '14.9', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '77 Shipping Pl',
    address: '77 Shipping Pl',
    city: 'Dundalk',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Deli',
    rawLogs: [
      { date: '2/26/2026', total: '31.2', user: 'yuda', b20: '', b10: '1', b5: '5', b1: '3' },
      { date: '12/3/2025', total: '0', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/13/2025', total: '11.2', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '1000 Dundalk Ave',
    address: '1000 Dundalk Ave',
    city: 'Baltimore',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/26/2026', total: '6', user: 'yuda', b20: '', b10: '', b5: '', b1: '2' },
      { date: '11/13/2025', total: '7.5', user: 'pj', b20: '', b10: '', b5: '', b1: '5' },
      { date: '7/29/2025', total: '0', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '3827 Pulaski Hwy',
    address: '3827 Pulaski Hwy',
    city: 'Baltimore',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'US gas. Needs to be picked up temporarily. Picked up 7/29/2025',
    rawLogs: [
      { date: '5/29/2025', total: '0', user: 'mardi', b20: '', b10: '', b5: '', b1: '' },
      { date: '5/5/2025', total: '3.1', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
      { date: '4/8/2025', total: '17.3', user: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '3101 Pulaski Highway',
    address: '3101 Pulaski Highway',
    city: 'Baltimore',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'No 20s. 1 (410) 812-3889 call a day before coming, only in the morning. Has G/T, paid $657 for candy 8/20/25. Has change machine X2',
    rawLogs: [
      { date: '2/25/2026', total: '70', user: 'yuda', b20: '', b10: '1', b5: '1', b1: '6' },
      { date: '1/20/2026', total: '78.1', user: 'Hershey', b20: '', b10: '', b5: '2', b1: '7' },
      { date: '12/4/2025', total: '25.4', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/21/2025', total: '50.4', user: 'Hershey', b20: '', b10: '', b5: '1', b1: '3' },
    ],
  },
  {
    name: '501 St Paul Street',
    address: '501 St Paul Street',
    city: 'Baltimore',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Deli. 2408838058 merry new owner. 3013467221 murtaza',
    rawLogs: [
      { date: '2/25/2026', total: '3', user: 'yuda', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/20/2026', total: '7.9', user: 'Hershey', b20: '1', b10: '', b5: '', b1: '2' },
      { date: '12/3/2025', total: '5.1', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '7800 Parke W Dr',
    address: '7800 Parke W Dr',
    city: 'Glen Burnie',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Laundromat. No bills, machine not screwed down. Added L bracket 5/29/2025',
    rawLogs: [
      { date: '2/25/2026', total: '7.2', user: 'yuda', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/20/2026', total: '16.8', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/23/2025', total: '14.7', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '801 Crain Hwy S',
    address: '801 Crain Hwy S',
    city: 'Glen Burnie',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Laundromat. 667-383-6888 call before coming',
    rawLogs: [
      { date: '2/25/2026', total: '68.6', user: 'yuda', b20: '2', b10: '1', b5: '2', b1: '8' },
      { date: '1/20/2026', total: '141.8', user: 'Hershey', b20: '3', b10: '1', b5: '3', b1: '15' },
      { date: '11/13/2025', total: '71.6', user: 'pj', b20: '1', b10: '1', b5: '1', b1: '10' },
    ],
  },
  {
    name: '704 Crain Highway',
    address: '704 Crain Highway',
    city: 'Glen Burnie',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Laundromat',
    rawLogs: [
      { date: '2/25/2026', total: '30', user: 'yuda', b20: '1', b10: '1', b5: '', b1: '8' },
      { date: '1/20/2026', total: '55.2', user: 'Hershey', b20: '1', b10: '1', b5: '2', b1: '9' },
      { date: '12/4/2025', total: '22.6', user: 'pj', b20: '1', b10: '1', b5: '1', b1: '8' },
    ],
  },
  {
    name: '3013 C Mountain Road',
    address: '3013 C Mountain Road',
    city: 'Pasadena',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '5107343111 ali. 12/4/25 time 11:10 is closed',
    rawLogs: [
      { date: '2/25/2026', total: '7.6', user: 'yuda', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/20/2026', total: '3.3', user: 'Hershey', b20: '', b10: '', b5: '', b1: '5' },
      { date: '9/30/2025', total: '9.4', user: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '36742 Dupont Blvd',
    address: '36742 Dupont Blvd',
    city: 'Selbyville',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Call before coming 443-235-9557',
    rawLogs: [
      { date: '2/19/2026', total: '70', user: 'yuda', b20: '3', b10: '1', b5: '2', b1: '8' },
      { date: '1/19/2026', total: '86.7', user: 'hershey', b20: '3', b10: '1', b5: '3', b1: '12' },
      { date: '12/4/2025', total: '46.9', user: 'pj', b20: '', b10: '', b5: '2', b1: '9' },
      { date: '11/13/2025', total: '42.7', user: 'pj', b20: '2', b10: '1', b5: '2', b1: '8' },
    ],
  },
  {
    name: '272 S Dupont Hwy',
    address: '272 S Dupont Hwy',
    city: 'Dover',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: true,
    notes: 'Has change machine, pay with quarters. Call day before (302) 272-0005 (Michelle). Machine was picked up',
    rawLogs: [
      { date: '4/9/2025', total: '5.9', user: 'Hershey', b20: '3', b10: '', b5: '3', b1: '13' },
      { date: '3/10/2025', total: '28.7', user: 'Hershey', b20: '1', b10: '', b5: '2', b1: '7' },
      { date: '2/3/2025', total: '5.6', user: 'Hershey', b20: '3', b10: '1', b5: '2', b1: '7' },
      { date: '1/15/2025', total: '9.9', user: '', b20: '', b10: '2', b5: '1', b1: '9' },
    ],
  },
  {
    name: '720 Townsend Blvd',
    address: '720 Townsend Blvd',
    city: 'Dover',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Mexican store on the corner. Need a metal plate for coin falling down 8/21/25',
    rawLogs: [
      { date: '2/19/2026', total: '18', user: 'yuda', b20: '3', b10: '1', b5: '1', b1: '8' },
      { date: '1/19/2026', total: '20.1', user: 'Hershey', b20: '1', b10: '', b5: '', b1: '1' },
      { date: '11/19/2025', total: '10.9', user: 'pj', b20: '1', b10: '1', b5: '2', b1: '6' },
    ],
  },
  {
    name: '530 N Dupont Hwy',
    address: '530 N Dupont Hwy',
    city: 'Dover',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Fix the wire 8/21. Give a receipt. Police took the machine 10/23/2025',
    rawLogs: [
      { date: '10/23/2025', total: '0', user: 'hershey', b20: '', b10: '', b5: '', b1: '' },
      { date: '8/21/2025', total: '7.3', user: '', b20: '', b10: '', b5: '', b1: '' },
      { date: '7/21/2025', total: '9.8', user: 'Hershey', b20: '', b10: '1', b5: '1', b1: '3' },
    ],
  },
  {
    name: '610 S Main St',
    address: '610 S Main St',
    city: 'North East',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '4435537169 call 30 minutes before. Changed motor 6/30/25. Come before Christmas',
    rawLogs: [
      { date: '2/19/2026', total: '25', user: 'yuda', b20: '', b10: '1', b5: '2', b1: '10' },
      { date: '1/19/2026', total: '55.3', user: 'Hershey', b20: '3', b10: '', b5: '', b1: '11' },
      { date: '11/19/2025', total: '32.8', user: 'pj', b20: '2', b10: '1', b5: '', b1: '5' },
      { date: '10/22/2025', total: '68.4', user: 'Hershey', b20: '3', b10: '', b5: '2', b1: '12' },
    ],
  },
  {
    name: '229 S Bridge Street',
    address: '229 S Bridge Street',
    city: 'Elkton',
    state: 'MD',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/19/2026', total: '10.8', user: 'yuda', b20: '', b10: '1', b5: '2', b1: '8' },
      { date: '12/30/2025', total: '3.9', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
      { date: '7/9/2025', total: '0', user: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '1551 New London Rd',
    address: '1551 New London Rd',
    city: 'Landenberg',
    state: 'PA',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Gas Station. Dont tell employee the amount of money - text owner amount 631-456-3333. Replace the inside light',
    rawLogs: [
      { date: '2/19/2026', total: '15', user: 'yuda', b20: '1', b10: '', b5: '2', b1: '6' },
      { date: '12/30/2025', total: '0', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/19/2025', total: '5', user: 'pj', b20: '3', b10: '', b5: '1', b1: '10' },
    ],
  },
  {
    name: '287 Christina Rd',
    address: '287 Christina Rd',
    city: 'New Castle',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Mexican store',
    rawLogs: [
      { date: '2/19/2026', total: '20', user: 'yuda', b20: '', b10: '1', b5: '1', b1: '7' },
      { date: '1/19/2026', total: '17.9', user: 'Hershey', b20: '3', b10: '', b5: '1', b1: '8' },
      { date: '11/19/2025', total: '5.8', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '1 Jay Dr',
    address: '1 Jay Dr',
    city: 'Wilmington Manor',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Gas Station. Motor changed 1/16/25',
    rawLogs: [
      { date: '2/19/2026', total: '12', user: 'yuda', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/19/2026', total: '24.5', user: 'Hershey', b20: '', b10: '1', b5: '2', b1: '3' },
      { date: '11/19/2025', total: '10.6', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/22/2025', total: '10.6', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '2510 Kirkwood Hwy',
    address: '2510 Kirkwood Hwy',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Deli',
    rawLogs: [
      { date: '2/19/2026', total: '8', user: 'yuda', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/19/2026', total: '18.7', user: 'Hershey', b20: '', b10: '', b5: '1', b1: '3' },
      { date: '10/22/2025', total: '11.8', user: 'Hershey', b20: '', b10: '', b5: '', b1: '5' },
    ],
  },
  {
    name: '1716 W Gilpin Drive',
    address: '1716 W Gilpin Drive',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Ice cream store. 11/20/2025 time 9:30 am is closed. Picked up 12/29/2025',
    rawLogs: [
      { date: '12/29/2025', total: '0', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
      { date: '10/22/2025', total: '17.9', user: 'Hershey', b20: '', b10: '', b5: '2', b1: '8' },
      { date: '9/26/2025', total: '36.8', user: 'Hershey', b20: '2', b10: '', b5: '1', b1: '8' },
    ],
  },
  {
    name: '1721 West Gilpin Drive',
    address: '1721 West Gilpin Drive',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'They dont want it anymore. Picked up 11/29/2025',
    rawLogs: [
      { date: '9/26/2025', total: '12.8', user: 'Hershey', b20: '1', b10: '', b5: '', b1: '9' },
      { date: '7/9/2025', total: '0', user: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '707 S Union St',
    address: '707 S Union St',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '',
    rawLogs: [
      { date: '2/25/2026', total: '6.4', user: 'Hershey', b20: '1', b10: '', b5: '', b1: '4' },
      { date: '1/28/2026', total: '11.6', user: 'Hershey', b20: '', b10: '', b5: '', b1: '6' },
      { date: '12/29/2025', total: '9.9', user: 'Hershey', b20: '1', b10: '1', b5: '', b1: '5' },
    ],
  },
  {
    name: '1832 W Third St',
    address: '1832 W Third St',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Deli. 3025072664 Edward new owner',
    rawLogs: [
      { date: '2/25/2026', total: '16.6', user: 'Hershey', b20: '', b10: '1', b5: '2', b1: '6' },
      { date: '1/28/2026', total: '12', user: 'Hershey', b20: '3', b10: '1', b5: '2', b1: '12' },
      { date: '12/29/2025', total: '28', user: 'hershey', b20: '', b10: '', b5: '1', b1: '8' },
    ],
  },
  {
    name: '1201 W Fourth St',
    address: '1201 W Fourth St',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Deli. Wants picked up 3023459056. Picked up 9/26/2025',
    rawLogs: [
      { date: '8/27/2025', total: '0', user: 'mardi', b20: '', b10: '', b5: '', b1: '' },
      { date: '7/21/2025', total: '5.1', user: 'Hershey', b20: '', b10: '', b5: '', b1: '5' },
      { date: '6/24/2025', total: '0', user: 'Hershey', b20: '', b10: '', b5: '2', b1: '12' },
    ],
  },
  {
    name: '800 West 4th St',
    address: '800 West 4th St',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: 'Laundromat. Closed at 9pm. 10/6/24 put ($50)',
    rawLogs: [
      { date: '2/25/2026', total: '16.9', user: 'Hershey', b20: '1', b10: '', b5: '', b1: '2' },
      { date: '1/28/2026', total: '17', user: 'Hershey', b20: '1', b10: '', b5: '1', b1: '3' },
      { date: '12/29/2025', total: '18.3', user: 'Hershey', b20: '1', b10: '1', b5: '1', b1: '3' },
    ],
  },
  {
    name: '822 Maryland Ave',
    address: '822 Maryland Ave',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Deli. Cops took the machine 8/27/2025',
    rawLogs: [
      { date: '8/27/2025', total: '0', user: 'mardi', b20: '', b10: '', b5: '', b1: '' },
      { date: '7/21/2025', total: '9.8', user: 'Hershey', b20: '1', b10: '', b5: '1', b1: '7' },
      { date: '6/20/2025', total: '14.2', user: 'Hershey', b20: '', b10: '', b5: '2', b1: '2' },
    ],
  },
  {
    name: '1200 Northeast Blvd',
    address: '1200 Northeast Blvd',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Deli',
    rawLogs: [
      { date: '2/25/2026', total: '10.2', user: 'Hershey', b20: '', b10: '', b5: '', b1: '7' },
      { date: '1/28/2026', total: '14', user: 'Hershey', b20: '1', b10: '', b5: '1', b1: '' },
      { date: '12/29/2025', total: '14.9', user: 'hershey', b20: '', b10: '1', b5: '5', b1: '3' },
    ],
  },
  {
    name: '2715 Governor Printz Blvd',
    address: '2715 Governor Printz Blvd',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'Deli',
    rawLogs: [
      { date: '2/25/2026', total: '6.8', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
      { date: '1/28/2026', total: '10.8', user: 'Hershey', b20: '', b10: '', b5: '1', b1: '2' },
      { date: '12/29/2025', total: '11.5', user: 'Hershey', b20: '', b10: '', b5: '2', b1: '8' },
    ],
  },
  {
    name: '2807 North Market Street',
    address: '2807 North Market Street',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.4,
    hasChangeMachine: false,
    notes: '302-753-5345 call if closed. 5/7/2025 closed',
    rawLogs: [
      { date: '12/29/2025', total: '0', user: 'hershey', b20: '', b10: '', b5: '', b1: '5' },
      { date: '10/22/2025', total: '0', user: 'Hershey', b20: '', b10: '', b5: '', b1: '' },
      { date: '11/25/2024', total: '0', user: '', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
  {
    name: '2212 N Market St',
    address: '2212 N Market St',
    city: 'Wilmington',
    state: 'DE',
    region: 'Maryland',
    commissionRate: 0.5,
    hasChangeMachine: false,
    notes: 'x2 machines. Call 3024094449. Fix 2 machines',
    rawLogs: [
      { date: '2/25/2026', total: '38.5', user: 'Hershey', b20: '1', b10: '', b5: '', b1: '2' },
      { date: '12/29/2025', total: '48', user: 'Hershey', b20: '', b10: '', b5: '2', b1: '8' },
      { date: '1/28/2026', total: '48.6', user: 'Hershey', b20: '', b10: '', b5: '', b1: '2' },
      { date: '11/20/2025', total: '52', user: 'pj', b20: '', b10: '', b5: '', b1: '' },
    ],
  },
];

export default function ImportMaryland() {
  const { locations } = useLocations();
  const [status, setStatus] = useState('ready');
  const [log, setLog] = useState([]);

  const addLine = (msg) => setLog((prev) => [...prev, msg]);

  const runImport = async () => {
    setStatus('running');
    addLine(`Starting Maryland import — ${MD_DATA.length} locations...`);

    const existingNames = new Set((locations || []).map((l) => l.name?.trim().toLowerCase()));
    const maxOrder = (locations || []).reduce((max, loc) => Math.max(max, loc.order || 0), -1);
    let order = maxOrder + 1;

    for (const loc of MD_DATA) {
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
            notes: '',
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
        addLine(`✅ Added "${loc.name}", ${loc.city} ${loc.state} (${logs.length} logs) — ID: ${docRef.id}`);
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
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Import Maryland Data</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {MD_DATA.length} locations, {MD_DATA.reduce((s, l) => s + l.rawLogs.length, 0)} total log entries
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
