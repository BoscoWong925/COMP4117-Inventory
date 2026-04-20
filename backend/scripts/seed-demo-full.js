/**
 * Complete Demo Seed Script
 *
 * Clears ALL collections (including users) and seeds comprehensive demo data
 * covering every feature of the inventory management system.
 *
 * Creates:
 *   8 users  – admin, operator, 2 teachers, 3 students, 1 inactive
 *  55 items  – all statuses/types, parent-child, multi-owner, canBorrow variants
 *  28 borrow requests – every status, group request, varied return conditions
 *  15 notifications – multiple types across users
 *  10 audit logs – item/request lifecycle events
 *
 * All demo passwords: demo1234
 *
 * Usage:  cd backend && node scripts/seed-demo-full.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User          = require('../models/User');
const Item          = require('../models/Item');
const BorrowRequest = require('../models/BorrowRequest');
const AuditLog      = require('../models/AuditLog');
const Notification  = require('../models/Notification');
const Counter       = require('../models/Counter');

// ── Cosmos DB helpers ──────────────────────────────────────────────
async function safeClear(Model, label) {
  let total = 0;
  while (true) {
    const docs = await Model.find({}).limit(50).select('_id');
    if (docs.length === 0) break;
    try {
      const res = await Model.deleteMany({ _id: { $in: docs.map(d => d._id) } });
      total += res.deletedCount;
    } catch (err) {
      if (err.code === 16500) { await delay(1000); continue; }
      throw err;
    }
    await delay(200);
  }
  console.log(`  Cleared ${total} ${label}`);
}

async function retryCreate(fn, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (err) {
      if (err.code === 16500 && i < retries - 1) { await delay(1000); continue; }
      throw err;
    }
  }
}
const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Date helpers ───────────────────────────────────────────────────
const TODAY = '2026-04-20';
const d = (str) => new Date(str + 'T00:00:00Z');

// ===================================================================
//  DATA
// ===================================================================

// ── 1. USERS (8) ──────────────────────────────────────────────────
const USERS = [
  { userId: 'U001', username: 'admin',    password: 'demo1234', name: 'Admin Wong',      email: 'admin@demo.edu.hk',    role: 'admin',    subRole: 'teacher', department: 'IT Services' },
  { userId: 'U002', username: 'operator1',password: 'demo1234', name: 'Operator Chan',   email: 'operator@demo.edu.hk', role: 'operator', subRole: 'teacher', department: 'Computer Science' },
  { userId: 'U003', username: 'teacher1', password: 'demo1234', name: 'Dr. Lam Ka Ming', email: 'lam.km@demo.edu.hk',   role: 'user',     subRole: 'teacher', department: 'Computer Science' },
  { userId: 'U004', username: 'teacher2', password: 'demo1234', name: 'Dr. Yip Mei Ling',email: 'yip.ml@demo.edu.hk',   role: 'user',     subRole: 'teacher', department: 'Electronic Engineering' },
  { userId: 'U005', username: 'student1', password: 'demo1234', name: 'Alice Lee',       email: 'alice.lee@demo.edu.hk',role: 'user',     subRole: 'student', department: 'Computer Science' },
  { userId: 'U006', username: 'student2', password: 'demo1234', name: 'Bob Chen',        email: 'bob.chen@demo.edu.hk', role: 'user',     subRole: 'student', department: 'Computer Science' },
  { userId: 'U007', username: 'student3', password: 'demo1234', name: 'Charlie Ng',      email: 'charlie.ng@demo.edu.hk',role:'user',     subRole: 'student', department: 'Electronic Engineering' },
  { userId: 'U008', username: 'inactive1',password: 'demo1234', name: 'David Ho',        email: 'david.ho@demo.edu.hk', role: 'user',     subRole: 'student', department: 'Computer Science', isActive: false },
];

// ── 2. ITEMS (55) ─────────────────────────────────────────────────
const ITEMS = [
  // ---- Computer set (parent + 3 children) ----
  { itemId:'INV-0001', name:'Dell Latitude 5540 Laptop',       universityID:'UNI-LAP-001', type:'Hardware',  category:'Computer',   status:'Available', location:'Room 405',
    description:'Dell Latitude 5540, i7-1365U, 16GB RAM, 512GB SSD. Teaching & research.',
    supplier:'Dell Technologies', vendor:'Dell', price:8500, purchaseDate:'2025-09-15', warrantyEnd:'2028-09-15', warrantyStartDate:'2025-09-15', warrantyOnsite:true, warrantyVendor:'Dell ProSupport',
    owner:'department', canBorrow:true, fixedComponents:['INV-0002','INV-0003','INV-0004'] },

  { itemId:'INV-0002', name:'Dell P2422H 24" Monitor',         universityID:'UNI-MON-001', type:'Hardware',  category:'Monitor',    status:'Available', location:'Room 405',
    description:'24-inch FHD IPS monitor. Paired with Dell Latitude 5540.',
    supplier:'Dell Technologies', vendor:'Dell', price:1800, purchaseDate:'2025-09-15', warrantyEnd:'2028-09-15', warrantyStartDate:'2025-09-15', warrantyVendor:'Dell ProSupport',
    motherID:'INV-0001', owner:'department', canBorrow:true },

  { itemId:'INV-0003', name:'Logitech MK270 Wireless Keyboard',universityID:'UNI-KB-001',  type:'Component', category:'Peripheral', status:'Available', location:'Room 405',
    description:'Wireless keyboard for Dell workstation set.',
    supplier:'Logitech HK', vendor:'Logitech', price:250, purchaseDate:'2025-09-15', warrantyEnd:'2026-09-15',
    motherID:'INV-0001', owner:'department', canBorrow:true },

  { itemId:'INV-0004', name:'Logitech M185 Wireless Mouse',    universityID:'UNI-MS-001',  type:'Component', category:'Peripheral', status:'Available', location:'Room 405',
    description:'Wireless mouse for Dell workstation set.',
    supplier:'Logitech HK', vendor:'Logitech', price:100, purchaseDate:'2025-09-15', warrantyEnd:'2026-09-15',
    motherID:'INV-0001', owner:'department', canBorrow:true },

  // ---- General department items ----
  { itemId:'INV-0005', name:'HP ProBook 450 G10 Laptop',       universityID:'UNI-LAP-002', type:'Hardware',  category:'Computer',   status:'Available', location:'Room 301',
    description:'HP ProBook 450 G10, i5-1335U, 8GB RAM, 256GB SSD.',
    supplier:'HP Inc.', vendor:'HP', price:6200, purchaseDate:'2025-03-10', warrantyEnd:'2028-03-10', warrantyStartDate:'2025-03-10', warrantyOnsite:false, warrantyVendor:'HP Care Pack',
    owner:'department', canBorrow:true },

  { itemId:'INV-0006', name:'Lenovo ThinkCentre M70q Gen 4',   universityID:'UNI-DT-001',  type:'Hardware',  category:'Desktop',    status:'Available', location:'Lab A',
    description:'Tiny desktop, i5-13400T, 16GB RAM, 512GB SSD. Lab workstation.',
    supplier:'Lenovo HK', vendor:'Lenovo', price:5800, purchaseDate:'2025-01-20', warrantyEnd:'2028-01-20', warrantyStartDate:'2025-01-20', warrantyOnsite:true, warrantyVendor:'Lenovo Premier Support',
    owner:'department', canBorrow:true },

  { itemId:'INV-0007', name:'ASUS ProArt PA278CV 27" Monitor',  universityID:'UNI-MON-002', type:'Hardware',  category:'Monitor',    status:'Available', location:'Lab A',
    description:'27-inch 4K IPS monitor, factory calibrated, USB-C 65W.',
    supplier:'ASUS HK', vendor:'ASUS', price:3200, purchaseDate:'2025-06-01', warrantyEnd:'2028-06-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0008', name:'Cisco Catalyst 1000-24T Switch',   universityID:'UNI-NET-001', type:'Hardware',  category:'Network',    status:'In-use', location:'Server Room',
    description:'24-port Gigabit managed switch. Core network infrastructure.',
    supplier:'Cisco Systems', vendor:'Cisco', price:12000, purchaseDate:'2024-08-15', warrantyEnd:'2027-08-15', warrantyStartDate:'2024-08-15', warrantyOnsite:true, warrantyVendor:'Cisco SmartNet',
    owner:'department', canBorrow:false },

  { itemId:'INV-0009', name:'Synology DS923+ NAS',              universityID:'UNI-STO-001', type:'Hardware',  category:'Storage',    status:'In-use', location:'Server Room',
    description:'4-bay NAS, AMD Ryzen R1600, 4GB RAM. Department file server.',
    supplier:'Synology Inc.', vendor:'Synology', price:4500, purchaseDate:'2024-11-01', warrantyEnd:'2027-11-01',
    owner:'department', canBorrow:false },

  { itemId:'INV-0010', name:'HP LaserJet Pro M404dn Printer',   universityID:'UNI-PRT-001', type:'Hardware',  category:'Printer',    status:'Available', location:'Room 405',
    description:'Mono laser printer, duplex, network. Shared office printer.',
    supplier:'HP Inc.', vendor:'HP', price:2800, purchaseDate:'2025-02-10', warrantyEnd:'2026-02-10',
    owner:'department', canBorrow:true },

  { itemId:'INV-0011', name:'Epson EB-W52 Projector',           universityID:'UNI-AV-001',  type:'Hardware',  category:'Audio/Video',status:'Available', location:'Room 301',
    description:'4000 lumens WXGA projector with wireless. Classroom presentations.',
    supplier:'Epson HK', vendor:'Epson', price:5500, purchaseDate:'2025-04-20', warrantyEnd:'2028-04-20',
    owner:'department', canBorrow:true },

  { itemId:'INV-0012', name:'Logitech Rally Bar Mini',          universityID:'UNI-AV-002',  type:'Hardware',  category:'Audio/Video',status:'Available', location:'Meeting Room B',
    description:'All-in-one video conference bar with AI camera.',
    supplier:'Logitech HK', vendor:'Logitech', price:7800, purchaseDate:'2025-07-15', warrantyEnd:'2027-07-15',
    owner:'department', canBorrow:true },

  { itemId:'INV-0013', name:'WD Elements 4TB External HDD',     universityID:'UNI-STO-002', type:'Component', category:'Storage',    status:'Available', location:'Room 405',
    description:'USB 3.0 portable hard drive for backup and transfer.',
    supplier:'Western Digital', vendor:'WD', price:650, purchaseDate:'2025-05-01', warrantyEnd:'2027-05-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0014', name:'Samsung 870 EVO 1TB SSD',          universityID:'UNI-STO-003', type:'Component', category:'Storage',    status:'Available', location:'Lab A',
    description:'SATA III SSD for desktop/laptop upgrades. Spare part.',
    supplier:'Samsung Electronics', vendor:'Samsung', price:780, purchaseDate:'2025-08-10', warrantyEnd:'2030-08-10',
    owner:'department', canBorrow:true },

  { itemId:'INV-0015', name:'TP-Link Archer AX73 Wi-Fi Router', universityID:'UNI-NET-002', type:'Hardware',  category:'Network',    status:'Available', location:'Room 301',
    description:'Wi-Fi 6 dual-band router. Backup AP for events.',
    supplier:'TP-Link', vendor:'TP-Link', price:900, purchaseDate:'2025-02-28', warrantyEnd:'2027-02-28',
    owner:'department', canBorrow:true },

  { itemId:'INV-0016', name:'iPad Air (M2) 11"',                universityID:'UNI-TAB-001', type:'Hardware',  category:'Tablet',     status:'Available', location:'Room 405',
    description:'iPad Air M2, 256GB, Wi-Fi. Field research & presentations.',
    supplier:'Apple HK', vendor:'Apple', price:5500, purchaseDate:'2025-10-01', warrantyEnd:'2026-10-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0017', name:'Canon EOS R50 Camera Kit',         universityID:'UNI-AV-003',  type:'Hardware',  category:'Audio/Video',status:'Available', location:'Room 405',
    description:'Mirrorless camera with RF-S 18-45mm lens. Event documentation.',
    supplier:'Canon HK', vendor:'Canon', price:6800, purchaseDate:'2025-06-15', warrantyEnd:'2026-06-15',
    owner:'department', canBorrow:true },

  { itemId:'INV-0018', name:'APC Smart-UPS 1500VA',             universityID:'UNI-PWR-001', type:'Hardware',  category:'Power',      status:'In-use', location:'Server Room',
    description:'Rack-mount UPS. Battery backup and surge protection.',
    supplier:'APC by Schneider', vendor:'APC', price:8200, purchaseDate:'2024-06-01', warrantyEnd:'2027-06-01',
    owner:'department', canBorrow:false },

  { itemId:'INV-0019', name:'Microsoft Surface Dock 2',         universityID:'UNI-ACC-001', type:'Component', category:'Accessory',  status:'Available', location:'Room 301',
    description:'USB-C docking station with dual 4K display output.',
    supplier:'Microsoft HK', vendor:'Microsoft', price:1800, purchaseDate:'2025-03-20', warrantyEnd:'2026-03-20',
    owner:'department', canBorrow:true },

  { itemId:'INV-0020', name:'Brother HL-L3270CDW Color Printer',universityID:'UNI-PRT-002', type:'Hardware',  category:'Printer',    status:'Dispose', location:'Storage',
    description:'Color laser printer. Drum unit failed, pending disposal.',
    supplier:'Brother HK', vendor:'Brother', price:2200, purchaseDate:'2022-04-10', warrantyEnd:'2025-04-10',
    owner:'department', canBorrow:false },

  { itemId:'INV-0021', name:'Jabra Evolve2 75 Headset',         universityID:'UNI-AV-004',  type:'Component', category:'Audio/Video',status:'Available', location:'Room 405',
    description:'Wireless ANC headset with charging stand.',
    supplier:'Jabra GN', vendor:'Jabra', price:2400, purchaseDate:'2025-09-01', warrantyEnd:'2027-09-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0022', name:'Raspberry Pi 5 (8GB) Kit',         universityID:'UNI-DEV-001', type:'Hardware',  category:'Development',status:'Available', location:'Lab A',
    description:'Raspberry Pi 5 with case, PSU, 128GB SD card. IoT teaching.',
    supplier:'RS Components', vendor:'Raspberry Pi', price:850, purchaseDate:'2025-08-01', warrantyEnd:'2026-08-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0023', name:'Seagate IronWolf 8TB NAS HDD',     universityID:'UNI-STO-004', type:'Component', category:'Storage',    status:'Available', location:'Server Room',
    description:'NAS-grade 3.5" HDD. Spare for Synology NAS expansion.',
    supplier:'Seagate Technology', vendor:'Seagate', price:1600, purchaseDate:'2025-11-10', warrantyEnd:'2028-11-10',
    owner:'department', canBorrow:true },

  { itemId:'INV-0024', name:'Microsoft 365 Education License (50-seat)', universityID:'UNI-SW-001', type:'Software', category:'Software License', status:'In-use', location:'N/A',
    description:'Annual subscription for Microsoft 365 A3 Education, 50 seats.',
    supplier:'Microsoft HK', vendor:'Microsoft', price:45000, purchaseDate:'2025-01-01', warrantyEnd:'2026-01-01',
    owner:'department', canBorrow:false },

  // ---- Borrowed / In-use items (with currentBorrower) ----
  { itemId:'INV-0025', name:'Dell XPS 15 9530 Laptop',          universityID:'UNI-LAP-003', type:'Hardware',  category:'Computer',   status:'In-use', location:'Room 301',
    description:'Dell XPS 15, i7-13700H, 32GB RAM, 1TB SSD. High-performance laptop.',
    supplier:'Dell Technologies', vendor:'Dell', price:14500, purchaseDate:'2025-06-01', warrantyEnd:'2028-06-01', warrantyStartDate:'2025-06-01', warrantyOnsite:true, warrantyVendor:'Dell ProSupport Plus',
    owner:'department', canBorrow:true, currentBorrower:'U005' },

  { itemId:'INV-0026', name:'MacBook Pro 14" M3 Pro',           universityID:'UNI-LAP-004', type:'Hardware',  category:'Computer',   status:'In-use', location:'Lab A',
    description:'MacBook Pro 14", M3 Pro, 18GB RAM, 512GB SSD.',
    supplier:'Apple HK', vendor:'Apple', price:16800, purchaseDate:'2025-08-01', warrantyEnd:'2026-08-01',
    owner:'department', canBorrow:true, currentBorrower:'U006' },

  // ---- Special statuses ----
  { itemId:'INV-0027', name:'HP EliteBook 840 G9',              universityID:'UNI-LAP-005', type:'Hardware',  category:'Computer',   status:'Missing', location:'Room 301',
    description:'Laptop reported missing since March 2026. Last seen in Room 301.',
    supplier:'HP Inc.', vendor:'HP', price:9200, purchaseDate:'2025-02-15', warrantyEnd:'2028-02-15',
    owner:'department', canBorrow:true },

  { itemId:'INV-0028', name:'ThinkPad X1 Carbon Gen 11',        universityID:'UNI-LAP-006', type:'Hardware',  category:'Computer',   status:'Not Available', location:'IT Workshop',
    description:'Under repair – motherboard replacement. Expected back May 2026.',
    supplier:'Lenovo HK', vendor:'Lenovo', price:12000, purchaseDate:'2025-05-01', warrantyEnd:'2028-05-01', warrantyOnsite:true, warrantyVendor:'Lenovo Premier Support',
    owner:'department', canBorrow:true },

  { itemId:'INV-0029', name:'Surface Pro 9',                    universityID:'UNI-TAB-002', type:'Hardware',  category:'Tablet',     status:'Transferred', location:'N/A',
    description:'Transferred to EE Department on 2026-03-01.',
    supplier:'Microsoft HK', vendor:'Microsoft', price:9800, purchaseDate:'2024-09-01', warrantyEnd:'2026-09-01',
    owner:'department', canBorrow:false },

  // ---- Software items ----
  { itemId:'INV-0030', name:'Adobe Creative Cloud (10-seat)',    universityID:'UNI-SW-002', type:'Software', category:'Software License', status:'In-use', location:'N/A',
    description:'Annual subscription: Photoshop, Illustrator, Premiere Pro, etc.',
    supplier:'Adobe Systems', vendor:'Adobe', price:38000, purchaseDate:'2025-09-01', warrantyEnd:'2026-09-01',
    owner:'department', canBorrow:false },

  { itemId:'INV-0031', name:'AutoCAD 2025 License (5-seat)',    universityID:'UNI-SW-003', type:'Software', category:'Software License', status:'Available', location:'N/A',
    description:'5-seat network license for AutoCAD 2025. Available for teaching.',
    supplier:'Autodesk', vendor:'Autodesk', price:22000, purchaseDate:'2025-07-01', warrantyEnd:'2026-07-01',
    owner:'department', canBorrow:false },

  { itemId:'INV-0032', name:'MATLAB R2025a License (20-seat)',   universityID:'UNI-SW-004', type:'Software', category:'Software License', status:'In-use', location:'N/A',
    description:'Campus network license – 20 concurrent users. Engineering labs.',
    supplier:'MathWorks', vendor:'MathWorks', price:55000, purchaseDate:'2025-01-15', warrantyEnd:'2026-01-15',
    owner:'department', canBorrow:false },

  // ---- Teacher-owned items (teacher1 = Dr. Lam) ----
  { itemId:'INV-0033', name:'Logitech C920 HD Webcam',          universityID:'UNI-AV-005', type:'Component', category:'Audio/Video', status:'Available', location:'Room 405',
    description:'HD webcam for online lectures. Personal teaching equipment.',
    supplier:'Logitech HK', vendor:'Logitech', price:580, purchaseDate:'2025-04-01', warrantyEnd:'2027-04-01',
    owner:'U003', canBorrow:true },

  { itemId:'INV-0034', name:'Anker PowerExpand 13-in-1 USB-C Hub', universityID:'UNI-ACC-002', type:'Component', category:'Accessory', status:'Available', location:'Room 405',
    description:'USB-C docking station with dual HDMI, SD card reader, Ethernet.',
    supplier:'Anker HK', vendor:'Anker', price:680, purchaseDate:'2025-06-10', warrantyEnd:'2027-06-10',
    owner:'U003', canBorrow:true },

  { itemId:'INV-0035', name:'Wacom Intuos Pro M Tablet',        universityID:'UNI-ACC-003', type:'Hardware',  category:'Accessory',  status:'Available', location:'Room 405',
    description:'Professional pen tablet for digital annotation and design.',
    supplier:'Wacom HK', vendor:'Wacom', price:2800, purchaseDate:'2025-01-15', warrantyEnd:'2027-01-15',
    owner:'U003', canBorrow:true },

  // ---- Teacher-owned items (teacher2 = Dr. Yip) ----
  { itemId:'INV-0036', name:'Arduino Mega 2560 Starter Kit',     universityID:'UNI-DEV-002', type:'Hardware', category:'Development', status:'Available', location:'EE Lab',
    description:'Arduino Mega with sensors, breadboard, jumper wires. Lab teaching.',
    supplier:'RS Components', vendor:'Arduino', price:450, purchaseDate:'2025-03-01', warrantyEnd:'2026-03-01',
    owner:'U004', canBorrow:true },

  { itemId:'INV-0037', name:'Keysight DSOX1204G Oscilloscope',  universityID:'UNI-LAB-001', type:'Hardware',  category:'Lab Equipment', status:'In-use', location:'EE Lab',
    description:'4-channel 200 MHz oscilloscope. Currently lent to student.',
    supplier:'Keysight Technologies', vendor:'Keysight', price:8500, purchaseDate:'2024-08-01', warrantyEnd:'2027-08-01', warrantyOnsite:true,
    owner:'U004', canBorrow:true, currentBorrower:'U007' },

  { itemId:'INV-0038', name:'Signal Generator Rigol DG1022Z',   universityID:'UNI-LAB-002', type:'Hardware',  category:'Lab Equipment', status:'Available', location:'EE Lab',
    description:'25 MHz dual-channel arbitrary waveform generator.',
    supplier:'Rigol Technologies', vendor:'Rigol', price:3200, purchaseDate:'2025-02-01', warrantyEnd:'2028-02-01',
    owner:'U004', canBorrow:true },

  // ---- More department items for demo variety ----
  { itemId:'INV-0039', name:'Bambu Lab A1 3D Printer',          universityID:'UNI-DEV-003', type:'Hardware',  category:'Development',status:'Available', location:'Lab A',
    description:'Multi-color FDM 3D printer with AMS. Prototyping.',
    supplier:'Bambu Lab', vendor:'Bambu Lab', price:4200, purchaseDate:'2025-11-01', warrantyEnd:'2026-11-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0040', name:'DJI Mini 3 Pro Drone',             universityID:'UNI-AV-006', type:'Hardware',  category:'Audio/Video',status:'Available', location:'Room 405',
    description:'Sub-249g drone with 4K camera. Campus aerial photography.',
    supplier:'DJI HK', vendor:'DJI', price:6200, purchaseDate:'2025-07-01', warrantyEnd:'2026-07-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0041', name:'Meta Quest 3 VR Headset',          universityID:'UNI-AV-007', type:'Hardware',  category:'Audio/Video',status:'In-use', location:'Lab A',
    description:'Mixed reality headset, 128GB. VR/AR research.',
    supplier:'Meta HK', vendor:'Meta', price:4200, purchaseDate:'2025-10-15', warrantyEnd:'2026-10-15',
    owner:'department', canBorrow:true, currentBorrower:'U007' },

  { itemId:'INV-0042', name:'Dell PowerEdge R760 Server',       universityID:'UNI-SRV-001', type:'Hardware',  category:'Server',     status:'In-use', location:'Server Room',
    description:'Rack server, Xeon 4410Y, 64GB, 4×1.2TB SAS. Department compute.',
    supplier:'Dell Technologies', vendor:'Dell', price:85000, purchaseDate:'2025-01-10', warrantyEnd:'2030-01-10', warrantyOnsite:true, warrantyVendor:'Dell ProSupport Plus',
    owner:'department', canBorrow:false },

  { itemId:'INV-0043', name:'Fortinet FortiGate 60F Firewall',  universityID:'UNI-NET-003', type:'Hardware',  category:'Network',    status:'In-use', location:'Server Room',
    description:'Next-gen firewall with UTM. Perimeter security.',
    supplier:'Fortinet', vendor:'Fortinet', price:9500, purchaseDate:'2024-12-01', warrantyEnd:'2027-12-01',
    owner:'department', canBorrow:false },

  { itemId:'INV-0044', name:'Lenovo ThinkVision P27h-30 Monitor',universityID:'UNI-MON-003',type:'Hardware',  category:'Monitor',    status:'Available', location:'Room 301',
    description:'27" QHD IPS monitor with USB-C PD and daisy-chain.',
    supplier:'Lenovo HK', vendor:'Lenovo', price:3600, purchaseDate:'2025-12-01', warrantyEnd:'2028-12-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0045', name:'Logitech Spotlight Presenter',     universityID:'UNI-ACC-004', type:'Component', category:'Accessory',  status:'Available', location:'Room 301',
    description:'Advanced wireless presenter with spotlight and magnifier.',
    supplier:'Logitech HK', vendor:'Logitech', price:850, purchaseDate:'2025-05-01', warrantyEnd:'2027-05-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0046', name:'HDMI Cable Set (10-pack)',          universityID:'UNI-CBL-001', type:'Component', category:'Cable',      status:'In-use', location:'Room 301',
    description:'2m HDMI 2.1 cables, 10-pack. Partially lent out.',
    supplier:'Belkin', vendor:'Belkin', price:480, purchaseDate:'2025-03-01', warrantyEnd:'2027-03-01',
    owner:'department', canBorrow:true, currentBorrower:'U006' },

  { itemId:'INV-0047', name:'USB Flash Drive 256GB (5-pack)',    universityID:'UNI-STO-005', type:'Component', category:'Storage',    status:'Available', location:'Room 405',
    description:'SanDisk Ultra Fit 256GB USB 3.2 flash drives, 5-pack.',
    supplier:'SanDisk', vendor:'SanDisk', price:350, purchaseDate:'2025-09-01', warrantyEnd:'2030-09-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0048', name:'Old Laser Pointer (Red)',           universityID:'UNI-ACC-005', type:'Component', category:'Accessory',  status:'Dispose', location:'Storage',
    description:'Battery leaked, no longer functional. Pending disposal.',
    supplier:'Generic', vendor:'N/A', price:50, purchaseDate:'2021-06-01', warrantyEnd:'2022-06-01',
    owner:'department', canBorrow:false },

  { itemId:'INV-0049', name:'HP ScanJet Pro 2600 f1',           universityID:'UNI-PRT-003', type:'Hardware',  category:'Scanner',    status:'Dispose', location:'Storage',
    description:'Flatbed scanner, ADF jammed beyond repair. Pending disposal.',
    supplier:'HP Inc.', vendor:'HP', price:1500, purchaseDate:'2022-01-15', warrantyEnd:'2025-01-15',
    owner:'department', canBorrow:false },

  { itemId:'INV-0050', name:'Broken Mechanical Keyboard',       universityID:'UNI-KB-002',  type:'Component', category:'Peripheral', status:'Missing', location:'Lab A',
    description:'Cherry MX keyboard, reported missing since Feb 2026.',
    supplier:'Cherry', vendor:'Cherry', price:650, purchaseDate:'2024-03-01', warrantyEnd:'2026-03-01',
    owner:'department', canBorrow:false },

  { itemId:'INV-0051', name:'Fluke Networks Cable Tester',      universityID:'UNI-NET-004', type:'Hardware',  category:'Network',    status:'Available', location:'Server Room',
    description:'LinkIQ Cable+Network tester. Ethernet troubleshooting.',
    supplier:'Fluke Networks', vendor:'Fluke', price:2200, purchaseDate:'2025-04-01', warrantyEnd:'2028-04-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0052', name:'Brother P-Touch PT-P910BT Label Printer', universityID:'UNI-PRT-004', type:'Hardware', category:'Printer', status:'Available', location:'Room 405',
    description:'Bluetooth label printer for asset tagging.',
    supplier:'Brother HK', vendor:'Brother', price:1200, purchaseDate:'2025-08-01', warrantyEnd:'2027-08-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0053', name:'Thunderbolt 4 Cable (2m)',         universityID:'UNI-CBL-002', type:'Component', category:'Cable',      status:'Available', location:'Lab A',
    description:'Active Thunderbolt 4 cable for high-speed data transfer.',
    supplier:'Apple HK', vendor:'Apple', price:420, purchaseDate:'2025-10-01', warrantyEnd:'2026-10-01',
    owner:'department', canBorrow:true },

  { itemId:'INV-0054', name:'APC Surge Protector PDU',          universityID:'UNI-PWR-002', type:'Component', category:'Power',      status:'In-use', location:'Server Room',
    description:'Rack-mount power distribution unit with surge protection.',
    supplier:'APC by Schneider', vendor:'APC', price:1500, purchaseDate:'2024-06-01', warrantyEnd:'2029-06-01',
    owner:'department', canBorrow:false },

  { itemId:'INV-0055', name:'IPEVO VZ-X Document Camera',       universityID:'UNI-AV-008', type:'Hardware',  category:'Audio/Video',status:'Available', location:'Room 301',
    description:'Wireless/USB document camera for classroom presentations.',
    supplier:'IPEVO', vendor:'IPEVO', price:2400, purchaseDate:'2025-05-15', warrantyEnd:'2027-05-15',
    owner:'department', canBorrow:true },
];

// ── 3. BORROW REQUESTS (28) ──────────────────────────────────────
const REQUESTS = [
  // --- Pending (5) ---
  { requestId:'REQ-0001', itemID:'INV-0011', borrowerID:'U005',
    status:'Pending', historyStatus:'Pending', requestStatus:'Pending Approval',
    requestDate: d('2026-04-18'), reason:'Need projector for FYP presentation on May 5th.',
    declaredReturnDate: d('2026-05-06') },

  { requestId:'REQ-0002', itemID:'INV-0016', borrowerID:'U006',
    status:'Pending', historyStatus:'Pending', requestStatus:'Pending Approval',
    requestDate: d('2026-04-19'), reason:'Field survey data collection for research project.' },

  { requestId:'REQ-0003', itemID:'INV-0017', borrowerID:'U007',
    status:'Pending', historyStatus:'Pending', requestStatus:'Pending Approval',
    requestDate: d('2026-04-17'), reason:'Photography for department newsletter.' },

  { requestId:'REQ-0004', itemID:'INV-0040', borrowerID:'U003',
    status:'Pending', historyStatus:'Pending', requestStatus:'Pending Approval',
    requestDate: d('2026-04-20'), reason:'Aerial photography for campus mapping project.' },

  { requestId:'REQ-0005', itemID:'INV-0007', borrowerID:'U005',
    status:'Pending', historyStatus:'Pending', requestStatus:'Pending Approval',
    requestDate: d('2026-04-19'), reason:'Need second display for design coursework.' },

  // --- Pending Check-Out (4) ---
  { requestId:'REQ-0006', itemID:'INV-0005', borrowerID:'U005',
    status:'Pending Check-Out', historyStatus:'Approved', requestStatus:'Pending Check-Out',
    requestDate: d('2026-04-14'), approvalDate: d('2026-04-16'), approvedBy:'U001',
    reason:'Laptop for database course project.', declaredReturnDate: d('2026-05-15') },

  { requestId:'REQ-0007', itemID:'INV-0022', borrowerID:'U007',
    status:'Pending Check-Out', historyStatus:'Approved', requestStatus:'Pending Check-Out',
    requestDate: d('2026-04-12'), approvalDate: d('2026-04-14'), approvedBy:'U002',
    reason:'Raspberry Pi for IoT assignment.' },

  { requestId:'REQ-0008', itemID:'INV-0039', borrowerID:'U006',
    status:'Pending Check-Out', historyStatus:'Approved', requestStatus:'Pending Check-Out',
    requestDate: d('2026-04-15'), approvalDate: d('2026-04-17'), approvedBy:'U001',
    reason:'3D print prototype for capstone project.' },

  { requestId:'REQ-0009', itemID:'INV-0052', borrowerID:'U005',
    status:'Pending Check-Out', historyStatus:'Approved', requestStatus:'Pending Check-Out',
    requestDate: d('2026-04-10'), approvalDate: d('2026-04-12'), approvedBy:'U002',
    reason:'Label printer for asset inventory audit.' },

  // --- Approved / Checked Out (5) ---
  { requestId:'REQ-0010', itemID:'INV-0025', borrowerID:'U005',
    status:'Approved', historyStatus:'Approved', requestStatus: null,
    requestDate: d('2026-03-20'), approvalDate: d('2026-03-22'), approvedBy:'U001',
    reason:'High-performance laptop for machine learning FYP.',
    declaredReturnDate: d('2026-06-30') },

  { requestId:'REQ-0011', itemID:'INV-0026', borrowerID:'U006',
    status:'Approved', historyStatus:'Approved', requestStatus: null,
    requestDate: d('2026-03-25'), approvalDate: d('2026-03-27'), approvedBy:'U001',
    reason:'MacBook for iOS app development course.' },

  { requestId:'REQ-0012', itemID:'INV-0041', borrowerID:'U007',
    status:'Approved', historyStatus:'Approved', requestStatus: null,
    requestDate: d('2026-04-01'), approvalDate: d('2026-04-03'), approvedBy:'U002',
    reason:'VR headset for immersive computing research.' },

  { requestId:'REQ-0013', itemID:'INV-0046', borrowerID:'U006',
    status:'Approved', historyStatus:'Approved', requestStatus: null,
    requestDate: d('2026-04-05'), approvalDate: d('2026-04-06'), approvedBy:'U002',
    reason:'HDMI cables for lab demo setup.' },

  { requestId:'REQ-0014', itemID:'INV-0037', borrowerID:'U007',
    status:'Approved', historyStatus:'Approved', requestStatus: null,
    requestDate: d('2026-03-01'), approvalDate: d('2026-03-03'), approvedBy:'U004',
    reason:'Oscilloscope for EE final year project.',
    notes:'Approved by equipment owner Dr. Yip.' },

  // --- Rejected (3) ---
  { requestId:'REQ-0015', itemID:'INV-0042', borrowerID:'U005',
    status:'Rejected', historyStatus:'Rejected', requestStatus: null,
    requestDate: d('2026-03-10'), approvalDate: d('2026-03-11'), approvedBy:'U001',
    reason:'Need server access for GPU training.',
    notes:'Server is critical infrastructure. Use the shared GPU cluster instead.' },

  { requestId:'REQ-0016', itemID:'INV-0021', borrowerID:'U006',
    status:'Rejected', historyStatus:'Rejected', requestStatus: null,
    requestDate: d('2026-03-15'), approvalDate: d('2026-03-16'), approvedBy:'U002',
    reason:'Headset for online group meetings.',
    notes:'Item reserved for conference room use only.' },

  { requestId:'REQ-0017', itemID:'INV-0012', borrowerID:'U007',
    status:'Rejected', historyStatus:'Rejected', requestStatus: null,
    requestDate: d('2026-02-20'), approvalDate: d('2026-02-21'), approvedBy:'U001',
    reason:'Video bar for student club event.',
    notes:'Equipment is permanently installed in Meeting Room B.' },

  // --- Returned (8 – varied conditions) ---
  { requestId:'REQ-0018', itemID:'INV-0015', borrowerID:'U005',
    status:'Returned', historyStatus:'Returned', requestStatus: null,
    requestDate: d('2026-02-01'), approvalDate: d('2026-02-02'), approvedBy:'U001',
    returnDate: d('2026-02-15'), returnedDate: d('2026-02-14'),
    reason:'Temporary Wi-Fi for hackathon event.',
    condition:'Good', returnNotes:'Returned in original packaging.' },

  { requestId:'REQ-0019', itemID:'INV-0019', borrowerID:'U006',
    status:'Returned', historyStatus:'Returned', requestStatus: null,
    requestDate: d('2026-01-20'), approvalDate: d('2026-01-21'), approvedBy:'U002',
    returnDate: d('2026-02-20'), returnedDate: d('2026-02-18'),
    reason:'Docking station for semester project.',
    condition:'Minor Damage', returnNotes:'Small scratch on surface, still fully functional.' },

  { requestId:'REQ-0020', itemID:'INV-0013', borrowerID:'U007',
    status:'Returned', historyStatus:'Returned', requestStatus: null,
    requestDate: d('2026-03-01'), approvalDate: d('2026-03-02'), approvedBy:'U001',
    returnDate: d('2026-03-15'), returnedDate: d('2026-03-14'),
    reason:'Backup drive for research data transfer.',
    condition:'Good', returnNotes:'All data wiped before return.' },

  { requestId:'REQ-0021', itemID:'INV-0014', borrowerID:'U005',
    status:'Returned', historyStatus:'Returned', requestStatus: null,
    requestDate: d('2026-02-10'), approvalDate: d('2026-02-11'), approvedBy:'U002',
    returnDate: d('2026-02-28'), returnedDate: d('2026-02-28'),
    reason:'SSD for laptop upgrade test.',
    condition:'Good' },

  { requestId:'REQ-0022', itemID:'INV-0044', borrowerID:'U005',
    status:'Returned', historyStatus:'Returned', requestStatus: null,
    requestDate: d('2026-01-10'), approvalDate: d('2026-01-11'), approvedBy:'U001',
    returnDate: d('2026-01-25'), returnedDate: d('2026-01-24'),
    reason:'Monitor for temporary desk setup.',
    condition:'Good' },

  { requestId:'REQ-0023', itemID:'INV-0045', borrowerID:'U007',
    status:'Returned', historyStatus:'Returned', requestStatus: null,
    requestDate: d('2026-03-05'), approvalDate: d('2026-03-06'), approvedBy:'U002',
    returnDate: d('2026-03-20'), returnedDate: d('2026-04-02'),
    reason:'Presenter for seminar.',
    condition:'Lost', returnNotes:'Borrower reported item lost during campus event. Replacement ordered.' },

  { requestId:'REQ-0024', itemID:'INV-0051', borrowerID:'U005',
    status:'Returned', historyStatus:'Returned', requestStatus: null,
    requestDate: d('2026-02-15'), approvalDate: d('2026-02-16'), approvedBy:'U001',
    returnDate: d('2026-03-01'), returnedDate: d('2026-03-01'),
    reason:'Cable tester for network lab assignment.',
    condition:'Good' },

  { requestId:'REQ-0025', itemID:'INV-0055', borrowerID:'U006',
    status:'Returned', historyStatus:'Returned', requestStatus: null,
    requestDate: d('2026-03-10'), approvalDate: d('2026-03-11'), approvedBy:'U002',
    returnDate: d('2026-03-25'), returnedDate: d('2026-03-24'),
    reason:'Document camera for micro-teaching exercise.',
    condition:'Major Damage', returnNotes:'Dropped during transport, lens housing cracked. Sent for repair.' },

  // --- Group request (3 linked – computer set) ---
  { requestId:'REQ-0026', itemID:'INV-0001', borrowerID:'U006',
    status:'Pending', historyStatus:'Pending', requestStatus:'Pending Approval',
    requestDate: d('2026-04-20'), reason:'Need complete workstation for FYP lab work.',
    parentRequestId:'REQ-0026' },

  { requestId:'REQ-0027', itemID:'INV-0002', borrowerID:'U006',
    status:'Pending', historyStatus:'Pending', requestStatus:'Pending Approval',
    requestDate: d('2026-04-20'), reason:'Monitor – part of workstation request.',
    parentRequestId:'REQ-0026' },

  { requestId:'REQ-0028', itemID:'INV-0003', borrowerID:'U006',
    status:'Pending', historyStatus:'Pending', requestStatus:'Pending Approval',
    requestDate: d('2026-04-20'), reason:'Keyboard – part of workstation request.',
    parentRequestId:'REQ-0026' },
];

// ── 4. NOTIFICATIONS (15) ────────────────────────────────────────
const NOTIFICATIONS = [
  // Welcome
  { recipientId:'U005', type:'welcome', subject:'Welcome to Inventory System', message:'Hi Alice, your account has been created. You can now browse and request equipment.', senderName:'System' },
  { recipientId:'U006', type:'welcome', subject:'Welcome to Inventory System', message:'Hi Bob, your account has been created. You can now browse and request equipment.', senderName:'System' },
  // Request approved
  { recipientId:'U005', type:'request_approved', subject:'Request REQ-0006 Approved', message:'Your request for HP ProBook 450 G10 Laptop has been approved. Please collect from Room 301.', relatedRequestId:'REQ-0006', relatedItemId:'INV-0005', senderName:'Admin Wong' },
  { recipientId:'U005', type:'request_approved', subject:'Request REQ-0010 Approved', message:'Your request for Dell XPS 15 9530 Laptop has been approved.', relatedRequestId:'REQ-0010', relatedItemId:'INV-0025', senderName:'Admin Wong' },
  { recipientId:'U007', type:'request_approved', subject:'Request REQ-0007 Approved', message:'Your request for Raspberry Pi 5 Kit has been approved. Please collect from Lab A.', relatedRequestId:'REQ-0007', relatedItemId:'INV-0022', senderName:'Operator Chan' },
  // Request rejected
  { recipientId:'U005', type:'request_rejected', subject:'Request REQ-0015 Rejected', message:'Your request for Dell PowerEdge R760 Server has been rejected. Reason: Server is critical infrastructure.', relatedRequestId:'REQ-0015', relatedItemId:'INV-0042', senderName:'Admin Wong' },
  { recipientId:'U006', type:'request_rejected', subject:'Request REQ-0016 Rejected', message:'Your request for Jabra Evolve2 75 Headset has been rejected. Item reserved for conference room use.', relatedRequestId:'REQ-0016', relatedItemId:'INV-0021', senderName:'Operator Chan' },
  // Checkout
  { recipientId:'U005', type:'checkout', subject:'Item Checked Out – INV-0025', message:'You have checked out Dell XPS 15 9530 Laptop. Please return by 2026-06-30.', relatedRequestId:'REQ-0010', relatedItemId:'INV-0025', senderName:'Admin Wong' },
  { recipientId:'U006', type:'checkout', subject:'Item Checked Out – INV-0026', message:'You have checked out MacBook Pro 14" M3 Pro.', relatedRequestId:'REQ-0011', relatedItemId:'INV-0026', senderName:'Admin Wong' },
  // New request (admin/operator sees this)
  { recipientId:'U001', type:'new_request', subject:'New Borrow Request REQ-0001', message:'Alice Lee has requested Epson EB-W52 Projector (INV-0011).', relatedRequestId:'REQ-0001', relatedItemId:'INV-0011', senderName:'Alice Lee' },
  { recipientId:'U001', type:'new_request', subject:'New Borrow Request REQ-0002', message:'Bob Chen has requested iPad Air (M2) 11" (INV-0016).', relatedRequestId:'REQ-0002', relatedItemId:'INV-0016', senderName:'Bob Chen' },
  // Item returned
  { recipientId:'U001', type:'item_returned', subject:'Item Returned – INV-0015', message:'Alice Lee has returned TP-Link Archer AX73 Wi-Fi Router. Condition: Good.', relatedRequestId:'REQ-0018', relatedItemId:'INV-0015', senderName:'System' },
  { recipientId:'U002', type:'item_returned', subject:'Item Returned – INV-0055', message:'Bob Chen returned IPEVO VZ-X Document Camera with Major Damage. Lens housing cracked.', relatedRequestId:'REQ-0025', relatedItemId:'INV-0055', senderName:'System' },
  // Item status change
  { recipientId:'U001', type:'item_status_change', subject:'Item Status Changed – INV-0027', message:'HP EliteBook 840 G9 status changed from Available to Missing.', relatedItemId:'INV-0027', senderName:'System' },
  // Account deactivated
  { recipientId:'U008', type:'account_deactivated', subject:'Account Deactivated', message:'Your account has been deactivated by the administrator. Contact IT Services for assistance.', senderName:'Admin Wong' },
];

// ── 5. AUDIT LOGS (10) ──────────────────────────────────────────
let logSeq = 0;
const nextLogId = () => `LOG-${String(++logSeq).padStart(4, '0')}`;

const AUDIT_LOGS = [
  { logId: nextLogId(), userID:'U001', action:'Item Created',   details:'Created Dell XPS 15 9530 Laptop', affectedItemID:'INV-0025', timestamp: d('2025-06-01') },
  { logId: nextLogId(), userID:'U001', action:'Item Created',   details:'Created MacBook Pro 14" M3 Pro',  affectedItemID:'INV-0026', timestamp: d('2025-08-01') },
  { logId: nextLogId(), userID:'U001', action:'Request Approved',details:'Approved borrow request REQ-0010 for Alice Lee', affectedItemID:'INV-0025', timestamp: d('2026-03-22') },
  { logId: nextLogId(), userID:'U001', action:'Item Checked Out',details:'Alice Lee checked out Dell XPS 15', affectedItemID:'INV-0025', timestamp: d('2026-03-22') },
  { logId: nextLogId(), userID:'U001', action:'Request Rejected',details:'Rejected REQ-0015: server is infrastructure', affectedItemID:'INV-0042', timestamp: d('2026-03-11') },
  { logId: nextLogId(), userID:'U002', action:'Status Change',  details:'HP EliteBook 840 G9 marked as Missing', affectedItemID:'INV-0027', oldValue:'Available', newValue:'Missing', timestamp: d('2026-03-05') },
  { logId: nextLogId(), userID:'U001', action:'Status Change',  details:'Brother Color Printer marked as Dispose', affectedItemID:'INV-0020', oldValue:'Available', newValue:'Dispose', timestamp: d('2026-01-15') },
  { logId: nextLogId(), userID:'U001', action:'User Deactivated',details:'Deactivated account for David Ho (U008)', timestamp: d('2026-02-01') },
  { logId: nextLogId(), userID:'U005', action:'Item Returned',  details:'Alice Lee returned TP-Link router (Good)', affectedItemID:'INV-0015', timestamp: d('2026-02-14') },
  { logId: nextLogId(), userID:'U006', action:'Item Returned',  details:'Bob Chen returned Document Camera (Major Damage)', affectedItemID:'INV-0055', oldValue:'Good', newValue:'Major Damage', timestamp: d('2026-03-24') },
];

// ===================================================================
//  MAIN
// ===================================================================
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set. Aborting.'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n');

  // ── Clear all collections ──
  console.log('Clearing all collections...');
  await safeClear(Item, 'items');
  await safeClear(BorrowRequest, 'requests');
  await safeClear(AuditLog, 'audit logs');
  await safeClear(Notification, 'notifications');
  await safeClear(Counter, 'counters');
  await safeClear(User, 'users');
  console.log();

  // ── Seed Users ──
  console.log('Creating users...');
  for (const u of USERS) {
    await retryCreate(() => User.create(u));
    console.log(`  ${u.userId} ${u.username.padEnd(12)} (${u.role}${u.subRole ? '/' + u.subRole : ''}${u.isActive === false ? ', INACTIVE' : ''})`);
    await delay(300);
  }
  console.log();

  // ── Seed Items ──
  console.log('Creating items...');
  for (const item of ITEMS) {
    await retryCreate(() => Item.create({ ...item, lastUpdate: TODAY }));
    const tag = item.motherID ? `  child of ${item.motherID}` :
                item.fixedComponents ? `  parent [${item.fixedComponents.length} children]` : '';
    console.log(`  ${item.itemId} ${item.name.substring(0, 40).padEnd(42)} ${item.status.padEnd(14)} ${item.type.padEnd(10)} owner=${(item.owner || 'department').padEnd(12)}${tag}`);
    await delay(200);
  }
  console.log();

  // ── Seed Borrow Requests ──
  console.log('Creating borrow requests...');
  for (const req of REQUESTS) {
    await retryCreate(() => BorrowRequest.create(req));
    const cond = req.condition ? ` [${req.condition}]` : '';
    const grp  = req.parentRequestId ? ` (group: ${req.parentRequestId})` : '';
    console.log(`  ${req.requestId} ${req.itemID} by ${req.borrowerID}  ${req.status.padEnd(18)}${cond}${grp}`);
    await delay(200);
  }
  console.log();

  // ── Seed Notifications ──
  console.log('Creating notifications...');
  for (let i = 0; i < NOTIFICATIONS.length; i++) {
    const n = NOTIFICATIONS[i];
    // Mark first 3 as read so we have a mix
    await retryCreate(() => Notification.create({ ...n, isRead: i < 3 }));
    console.log(`  → ${n.recipientId} ${n.type} ${n.isRead || i < 3 ? '(read)' : ''}`);
    await delay(200);
  }
  console.log();

  // ── Seed Audit Logs ──
  console.log('Creating audit logs...');
  for (const log of AUDIT_LOGS) {
    await retryCreate(() => AuditLog.create(log));
    console.log(`  ${log.logId} ${log.action.padEnd(18)} ${log.details.substring(0, 50)}`);
    await delay(200);
  }
  console.log();

  // ── Set counters ──
  await retryCreate(() => Counter.create({ _id: 'itemId', seq: ITEMS.length }));
  await retryCreate(() => Counter.create({ _id: 'requestId', seq: REQUESTS.length }));
  console.log(`Counters set: itemId=${ITEMS.length} (next INV-${String(ITEMS.length + 1).padStart(4, '0')}), requestId=${REQUESTS.length} (next REQ-${String(REQUESTS.length + 1).padStart(4, '0')})`);

  // ── Summary ──
  console.log('\n========================================');
  console.log(' DEMO SEED COMPLETE');
  console.log('========================================');
  console.log(` Users:          ${USERS.length}`);
  console.log(` Items:          ${ITEMS.length}`);
  console.log(` Borrow Requests:${REQUESTS.length}`);
  console.log(` Notifications:  ${NOTIFICATIONS.length}`);
  console.log(` Audit Logs:     ${AUDIT_LOGS.length}`);
  console.log('----------------------------------------');
  console.log(' Item status breakdown:');
  const statusCount = {};
  ITEMS.forEach(i => { statusCount[i.status] = (statusCount[i.status] || 0) + 1; });
  Object.entries(statusCount).sort().forEach(([s, c]) => console.log(`   ${s.padEnd(16)} ${c}`));
  console.log(' Request status breakdown:');
  const reqCount = {};
  REQUESTS.forEach(r => { reqCount[r.status] = (reqCount[r.status] || 0) + 1; });
  Object.entries(reqCount).sort().forEach(([s, c]) => console.log(`   ${s.padEnd(18)} ${c}`));
  console.log('----------------------------------------');
  console.log(' Login credentials (all passwords: demo1234):');
  USERS.forEach(u => console.log(`   ${u.username.padEnd(12)} → ${u.name} (${u.role}${u.subRole ? '/' + u.subRole : ''})`));
  console.log('========================================\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
