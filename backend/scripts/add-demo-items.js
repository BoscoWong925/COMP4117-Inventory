/**
 * Add 20 demo items covering diverse fields.
 * Owner = 'department', canBorrow = true.
 * 
 * Usage: node scripts/add-demo-items.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('../models/Item');
const Counter = require('../models/Counter');

const ITEMS = [
  {
    itemId: 'INV-0005', name: 'HP ProBook 450 G10 Laptop', universityID: 'UNI-LAP-002',
    type: 'Hardware', category: 'Computer', status: 'Available', location: 'Room 301',
    description: 'HP ProBook 450 G10, i5-1335U, 8GB RAM, 256GB SSD. General purpose laptop.',
    supplier: 'HP Inc.', vendor: 'HP', price: 6200,
    purchaseDate: '2025-03-10', warrantyEnd: '2028-03-10', warrantyStartDate: '2025-03-10',
    warrantyOnsite: false, warrantyVendor: 'HP Care Pack',
  },
  {
    itemId: 'INV-0006', name: 'Lenovo ThinkCentre M70q Gen 4', universityID: 'UNI-DT-001',
    type: 'Hardware', category: 'Desktop', status: 'Available', location: 'Lab A',
    description: 'Tiny desktop PC, i5-13400T, 16GB RAM, 512GB SSD. Lab workstation.',
    supplier: 'Lenovo HK', vendor: 'Lenovo', price: 5800,
    purchaseDate: '2025-01-20', warrantyEnd: '2028-01-20', warrantyStartDate: '2025-01-20',
    warrantyOnsite: true, warrantyVendor: 'Lenovo Premier Support',
  },
  {
    itemId: 'INV-0007', name: 'ASUS ProArt PA278CV 27" Monitor', universityID: 'UNI-MON-002',
    type: 'Hardware', category: 'Monitor', status: 'Available', location: 'Lab A',
    description: '27-inch 4K IPS monitor, factory calibrated, USB-C 65W PD. For design work.',
    supplier: 'ASUS HK', vendor: 'ASUS', price: 3200,
    purchaseDate: '2025-06-01', warrantyEnd: '2028-06-01',
  },
  {
    itemId: 'INV-0008', name: 'Cisco Catalyst 1000-24T Switch', universityID: 'UNI-NET-001',
    type: 'Hardware', category: 'Network', status: 'In-use', location: 'Server Room',
    description: '24-port Gigabit managed switch. Core network infrastructure.',
    supplier: 'Cisco Systems', vendor: 'Cisco', price: 12000,
    purchaseDate: '2024-08-15', warrantyEnd: '2027-08-15', warrantyStartDate: '2024-08-15',
    warrantyOnsite: true, warrantyVendor: 'Cisco SmartNet',
  },
  {
    itemId: 'INV-0009', name: 'Synology DS923+ NAS', universityID: 'UNI-STO-001',
    type: 'Hardware', category: 'Storage', status: 'In-use', location: 'Server Room',
    description: '4-bay NAS, AMD Ryzen R1600, 4GB RAM. Department file server and backup.',
    supplier: 'Synology Inc.', vendor: 'Synology', price: 4500,
    purchaseDate: '2024-11-01', warrantyEnd: '2027-11-01',
  },
  {
    itemId: 'INV-0010', name: 'HP LaserJet Pro M404dn Printer', universityID: 'UNI-PRT-001',
    type: 'Hardware', category: 'Printer', status: 'Available', location: 'Room 405',
    description: 'Mono laser printer, duplex, network. Shared office printer.',
    supplier: 'HP Inc.', vendor: 'HP', price: 2800,
    purchaseDate: '2025-02-10', warrantyEnd: '2026-02-10',
  },
  {
    itemId: 'INV-0011', name: 'Epson EB-W52 Projector', universityID: 'UNI-AV-001',
    type: 'Hardware', category: 'Audio/Video', status: 'Available', location: 'Room 301',
    description: '4000 lumens WXGA projector with wireless. For classroom presentations.',
    supplier: 'Epson HK', vendor: 'Epson', price: 5500,
    purchaseDate: '2025-04-20', warrantyEnd: '2028-04-20',
  },
  {
    itemId: 'INV-0012', name: 'Logitech Rally Bar Mini', universityID: 'UNI-AV-002',
    type: 'Hardware', category: 'Audio/Video', status: 'Available', location: 'Meeting Room B',
    description: 'All-in-one video conference bar with AI camera. For hybrid meetings.',
    supplier: 'Logitech HK', vendor: 'Logitech', price: 7800,
    purchaseDate: '2025-07-15', warrantyEnd: '2027-07-15',
  },
  {
    itemId: 'INV-0013', name: 'WD Elements 4TB External HDD', universityID: 'UNI-STO-002',
    type: 'Component', category: 'Storage', status: 'Available', location: 'Room 405',
    description: 'USB 3.0 portable external hard drive for data backup and transfer.',
    supplier: 'Western Digital', vendor: 'WD', price: 650,
    purchaseDate: '2025-05-01', warrantyEnd: '2027-05-01',
  },
  {
    itemId: 'INV-0014', name: 'Samsung 870 EVO 1TB SSD', universityID: 'UNI-STO-003',
    type: 'Component', category: 'Storage', status: 'Available', location: 'Lab A',
    description: 'SATA III SSD for desktop/laptop upgrades. Spare part.',
    supplier: 'Samsung Electronics', vendor: 'Samsung', price: 780,
    purchaseDate: '2025-08-10', warrantyEnd: '2030-08-10',
  },
  {
    itemId: 'INV-0015', name: 'TP-Link Archer AX73 Wi-Fi Router', universityID: 'UNI-NET-002',
    type: 'Hardware', category: 'Network', status: 'Available', location: 'Room 301',
    description: 'Wi-Fi 6 dual-band router, AX5400. Temporary backup AP for events.',
    supplier: 'TP-Link', vendor: 'TP-Link', price: 900,
    purchaseDate: '2025-02-28', warrantyEnd: '2027-02-28',
  },
  {
    itemId: 'INV-0016', name: 'iPad Air (M2) 11"', universityID: 'UNI-TAB-001',
    type: 'Hardware', category: 'Tablet', status: 'Available', location: 'Room 405',
    description: 'iPad Air M2, 256GB, Wi-Fi. For field research and presentations.',
    supplier: 'Apple HK', vendor: 'Apple', price: 5500,
    purchaseDate: '2025-10-01', warrantyEnd: '2026-10-01',
  },
  {
    itemId: 'INV-0017', name: 'Canon EOS R50 Camera Kit', universityID: 'UNI-AV-003',
    type: 'Hardware', category: 'Audio/Video', status: 'Available', location: 'Room 405',
    description: 'Mirrorless camera with RF-S 18-45mm lens. For event documentation.',
    supplier: 'Canon HK', vendor: 'Canon', price: 6800,
    purchaseDate: '2025-06-15', warrantyEnd: '2026-06-15',
  },
  {
    itemId: 'INV-0018', name: 'APC Smart-UPS 1500VA', universityID: 'UNI-PWR-001',
    type: 'Hardware', category: 'Power', status: 'In-use', location: 'Server Room',
    description: 'Rack-mount UPS for server room. Battery backup and surge protection.',
    supplier: 'APC by Schneider', vendor: 'APC', price: 8200,
    purchaseDate: '2024-06-01', warrantyEnd: '2027-06-01',
  },
  {
    itemId: 'INV-0019', name: 'Microsoft Surface Dock 2', universityID: 'UNI-ACC-001',
    type: 'Component', category: 'Accessory', status: 'Available', location: 'Room 301',
    description: 'USB-C docking station with dual 4K display output. For shared desks.',
    supplier: 'Microsoft HK', vendor: 'Microsoft', price: 1800,
    purchaseDate: '2025-03-20', warrantyEnd: '2026-03-20',
  },
  {
    itemId: 'INV-0020', name: 'Brother HL-L3270CDW Color Printer', universityID: 'UNI-PRT-002',
    type: 'Hardware', category: 'Printer', status: 'Dispose', location: 'Storage',
    description: 'Color laser printer. Drum unit failed, pending disposal approval.',
    supplier: 'Brother HK', vendor: 'Brother', price: 2200,
    purchaseDate: '2022-04-10', warrantyEnd: '2025-04-10',
  },
  {
    itemId: 'INV-0021', name: 'Jabra Evolve2 75 Headset', universityID: 'UNI-AV-004',
    type: 'Component', category: 'Audio/Video', status: 'Available', location: 'Room 405',
    description: 'Wireless ANC headset with charging stand. For online meetings.',
    supplier: 'Jabra GN', vendor: 'Jabra', price: 2400,
    purchaseDate: '2025-09-01', warrantyEnd: '2027-09-01',
  },
  {
    itemId: 'INV-0022', name: 'Raspberry Pi 5 (8GB) Kit', universityID: 'UNI-DEV-001',
    type: 'Hardware', category: 'Development', status: 'Available', location: 'Lab A',
    description: 'Raspberry Pi 5 with case, PSU, and 128GB SD card. For IoT teaching lab.',
    supplier: 'RS Components', vendor: 'Raspberry Pi', price: 850,
    purchaseDate: '2025-08-01', warrantyEnd: '2026-08-01',
  },
  {
    itemId: 'INV-0023', name: 'Seagate IronWolf 8TB NAS HDD', universityID: 'UNI-STO-004',
    type: 'Component', category: 'Storage', status: 'Available', location: 'Server Room',
    description: 'NAS-grade 3.5" HDD. Spare drive for Synology NAS expansion.',
    supplier: 'Seagate Technology', vendor: 'Seagate', price: 1600,
    purchaseDate: '2025-11-10', warrantyEnd: '2028-11-10',
  },
  {
    itemId: 'INV-0024', name: 'Microsoft 365 Education License (50-seat)', universityID: 'UNI-SW-001',
    type: 'Software', category: 'Software License', status: 'In-use', location: 'N/A',
    description: 'Annual subscription for Microsoft 365 A3 Education, 50 seats.',
    supplier: 'Microsoft HK', vendor: 'Microsoft', price: 45000,
    purchaseDate: '2025-01-01', warrantyEnd: '2026-01-01',
  },
];

async function retryCreate(fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (err) {
      if (err.code === 16500 && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set.'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const now = new Date().toISOString().split('T')[0];

  for (const data of ITEMS) {
    const doc = await retryCreate(() => Item.create({
      ...data,
      owner: 'department',
      canBorrow: true,
      lastUpdate: now,
    }));
    console.log(`  Created ${doc.itemId} - ${doc.name} (${doc.category})`);
    await new Promise(r => setTimeout(r, 300));
  }

  // Update counter to 24

  await retryCreate(() => Counter.findByIdAndUpdate(
    { _id: 'itemId' },
    { $set: { seq: 24 } },
    { upsert: true }
  ));

  console.log(`\nDone! Added ${ITEMS.length} items. Counter set to 24 (next: INV-0025).`);
  await mongoose.disconnect();
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
