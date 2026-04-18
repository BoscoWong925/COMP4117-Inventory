/**
 * Reset & Seed Demo Data Script
 * 
 * Clears all items, borrow requests, audit logs, notifications, and counters.
 * Keeps user accounts intact.
 * Seeds a demo computer set: laptop + monitor + keyboard + mouse (linked).
 * 
 * Usage: node scripts/reset-seed-demo.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Item = require('../models/Item');
const BorrowRequest = require('../models/BorrowRequest');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Counter = require('../models/Counter');

// Cosmos DB rate-limit safe batch delete
async function safeClear(Model, label) {
  let total = 0;
  while (true) {
    const docs = await Model.find({}).limit(50).select('_id');
    if (docs.length === 0) break;
    const ids = docs.map(d => d._id);
    try {
      const res = await Model.deleteMany({ _id: { $in: ids } });
      total += res.deletedCount;
    } catch (err) {
      if (err.code === 16500) {
        // Rate limited — wait and retry
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`  Cleared ${total} ${label}`);
  return total;
}

// Retry wrapper for creates
async function retryCreate(fn, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
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
  if (!uri) {
    console.error('MONGODB_URI not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // --- Clear collections (keep Users) ---
  console.log('Clearing collections...');
  await safeClear(Item, 'items');
  await safeClear(BorrowRequest, 'requests');
  await safeClear(AuditLog, 'audit logs');
  await safeClear(Notification, 'notifications');
  await safeClear(Counter, 'counters');

  // --- Reset counters ---
  await retryCreate(() => Counter.create({ _id: 'itemId', seq: 4 })); // next will be INV-0005

  // --- Seed demo items: a computer set ---
  const now = new Date().toISOString().split('T')[0];

  const laptop = await retryCreate(() => Item.create({
    itemId: 'INV-0001',
    name: 'Dell Latitude 5540 Laptop',
    universityID: 'UNI-LAP-001',
    type: 'Hardware',
    category: 'Computer',
    status: 'Available',
    location: 'Room 405',
    description: 'Dell Latitude 5540, i7-1365U, 16GB RAM, 512GB SSD. For teaching and research use.',
    supplier: 'Dell Technologies',
    vendor: 'Dell',
    price: 8500,
    purchaseDate: '2025-09-15',
    warrantyEnd: '2028-09-15',
    warrantyStartDate: '2025-09-15',
    warrantyOnsite: true,
    warrantyVendor: 'Dell ProSupport',
    owner: 'department',
    canBorrow: true,
    fixedComponents: ['INV-0002', 'INV-0003', 'INV-0004'],
    lastUpdate: now,
  }));
  await new Promise(r => setTimeout(r, 500));

  const monitor = await retryCreate(() => Item.create({
    itemId: 'INV-0002',
    name: 'Dell P2422H 24" Monitor',
    universityID: 'UNI-MON-001',
    type: 'Hardware',
    category: 'Monitor',
    status: 'Available',
    location: 'Room 405',
    description: '24-inch FHD IPS monitor with USB-C hub. Paired with Dell Latitude 5540.',
    supplier: 'Dell Technologies',
    vendor: 'Dell',
    price: 1800,
    purchaseDate: '2025-09-15',
    warrantyEnd: '2028-09-15',
    warrantyStartDate: '2025-09-15',
    warrantyVendor: 'Dell ProSupport',
    motherID: 'INV-0001',
    owner: 'department',
    canBorrow: true,
    lastUpdate: now,
  }));
  await new Promise(r => setTimeout(r, 500));

  const keyboard = await retryCreate(() => Item.create({
    itemId: 'INV-0003',
    name: 'Logitech MK270 Wireless Keyboard',
    universityID: 'UNI-KB-001',
    type: 'Component',
    category: 'Peripheral',
    status: 'Available',
    location: 'Room 405',
    description: 'Wireless keyboard included with Dell Latitude 5540 workstation set.',
    supplier: 'Logitech HK',
    vendor: 'Logitech',
    price: 250,
    purchaseDate: '2025-09-15',
    warrantyEnd: '2026-09-15',
    motherID: 'INV-0001',
    owner: 'department',
    canBorrow: true,
    lastUpdate: now,
  }));
  await new Promise(r => setTimeout(r, 500));

  const mouse = await retryCreate(() => Item.create({
    itemId: 'INV-0004',
    name: 'Logitech M185 Wireless Mouse',
    universityID: 'UNI-MS-001',
    type: 'Component',
    category: 'Peripheral',
    status: 'Available',
    location: 'Room 405',
    description: 'Wireless mouse included with Dell Latitude 5540 workstation set.',
    supplier: 'Logitech HK',
    vendor: 'Logitech',
    price: 100,
    purchaseDate: '2025-09-15',
    warrantyEnd: '2026-09-15',
    motherID: 'INV-0001',
    owner: 'department',
    canBorrow: true,
    lastUpdate: now,
  }));

  console.log('\nDemo items created:');
  console.log(`  1. ${laptop.itemId} - ${laptop.name} (mother, 3 linked components)`);
  console.log(`  2. ${monitor.itemId} - ${monitor.name} (child of ${laptop.itemId})`);
  console.log(`  3. ${keyboard.itemId} - ${keyboard.name} (child of ${laptop.itemId})`);
  console.log(`  4. ${mouse.itemId} - ${mouse.name} (child of ${laptop.itemId})`);
  console.log('\nDone! User accounts were preserved.');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
