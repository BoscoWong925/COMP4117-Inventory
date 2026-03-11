/**
 * Comprehensive Seed Script — 500 records per collection
 * Generates realistic, cross-referenced inventory data with full coverage
 * of all schema fields, statuses, and edge cases.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const User = require('../models/User');
const Item = require('../models/Item');
const BorrowRequest = require('../models/BorrowRequest');
const AuditLog = require('../models/AuditLog');
const Counter = require('../models/Counter');

// ========== CONFIGURATION ==========
const TOTAL_USERS = 500;
const TOTAL_ITEMS = 500;
const TOTAL_REQUESTS = 500;
const TOTAL_LOGS = 500;

// User distribution
const NUM_ADMINS = 2;
const NUM_OPERATORS = 3;
const NUM_TEACHERS = 95;
const NUM_STUDENTS = TOTAL_USERS - NUM_ADMINS - NUM_OPERATORS - NUM_TEACHERS; // 400

// Item status distribution
const ITEM_STATUS_DIST = {
  'Available': 300,
  'In-use': 80,
  'Missing': 30,
  'Dispose': 30,
  'Not Available': 30,
  'Transferred': 30,
};

// Request status distribution
const REQ_STATUS_DIST = {
  'Pending': 80,
  'Pending Check-Out': 70,
  'Approved': 100,
  'Rejected': 100,
  'Returned': 150,
};

// ========== HELPER DATA ==========
const departments = ['COMP', 'EE', 'ME', 'PHYS', 'MATH', 'BIO', 'CHEM', 'CIVL'];
const locations = ['Lab A', 'Lab B', 'Lab C', 'Lab D', 'Lab E', 'Office 101', 'Office 202', 'Storage Room', 'Network Room', 'Media Lab', 'Classroom A', 'Classroom B', 'Workshop'];
const categories = ['Computer', 'Display', 'Peripherals', 'Storage', 'Networking', 'Audio', 'Camera', 'Measurement', 'Furniture', 'Other'];
const itemTypes = ['Hardware', 'Software', 'Component'];
const suppliers = ['TechCorp', 'Dell', 'HP', 'Apple', 'Logitech', 'Samsung', 'Canon', 'Cisco', 'Sony', 'Bose', 'LG', 'Lenovo', 'Epson', 'NVIDIA', 'Western Digital', 'Corsair', 'ASUS', 'Microsoft', 'Xiaomi', 'Acer'];
const supplierStatuses = ['Delivered', 'Pending', 'In Transit', 'Backordered', 'Cancelled'];
const fundingSources = ['Department Budget', 'Research Fund', 'Miscellaneous', 'Grant A', 'Grant B', 'Equipment Fund'];

const firstNames = ['John','Jane','Alex','Sarah','Mike','Emma','David','Lisa','James','Rachel','Robert','Maria','Chris','Amy','Kevin','Laura','Brian','Nicole','Steven','Karen','Andrew','Emily','Daniel','Jessica','Matthew','Jennifer','Thomas','Linda','William','Michelle','Ryan','Ashley','Eric','Megan','Jason','Samantha','Timothy','Olivia','Patrick','Sophia','Mark','Anna','Tony','Grace','Peter','Chloe','Alan','Hannah','George','Isabella','Charles','Natalie','Frank','Rebecca','Henry','Diana','Paul','Susan','Scott','Carol','Raymond','Victoria','Kenneth','Monica',
'Wai','Hoi','Lok','Chi','Yat','Ming','Ho','Ka','Wing','Ling','Sze','Kit','Yuk','Fai','Man','Tsz','Yan','Sum','Hei','On'];
const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Anderson','Taylor','Thomas','Jackson','White','Harris','Martin','Thompson','Lee','Wong','Chan','Cheung','Lam','Ho','Ng','Chow','Tang','Fung','Liu','Chen','Wang','Kwok','Yip','Mak','Tam','Poon','Tse','Yu','Yeung','Chung','Lau','Lo','Hung','Woo','Siu','Kong','So','Tong','Leung','Fan'];

const itemNamePrefixes = {
  'Computer': ['MacBook Pro', 'Dell XPS', 'HP EliteBook', 'Lenovo ThinkPad', 'ASUS ZenBook', 'Acer Swift', 'Microsoft Surface', 'Desktop PC', 'Workstation', 'Raspberry Pi'],
  'Display': ['Dell Monitor 27"', 'LG UltraWide 34"', 'Samsung 4K Monitor', 'Epson Projector', 'BenQ Display', 'ViewSonic Monitor', 'ASUS ProArt Display'],
  'Peripherals': ['Logitech Mouse', 'Corsair Keyboard', 'HP LaserJet Printer', 'Canon Scanner', 'Logitech Webcam', 'USB Hub', 'Docking Station', 'Drawing Tablet'],
  'Storage': ['Samsung SSD 1TB', 'WD External Drive', 'Seagate HDD 2TB', 'Kingston USB Drive', 'NAS Storage', 'SD Card 256GB'],
  'Networking': ['Cisco Router', 'TP-Link Switch', 'Ubiquiti AP', 'Network Cable Tester', 'WiFi Adapter', 'Ethernet Switch'],
  'Audio': ['Sony Headphones', 'Bose Speaker', 'Blue Yeti Microphone', 'JBL Monitor Speaker', 'Audio Interface', 'Wireless Mic Set'],
  'Camera': ['Canon EOS R5', 'Sony Alpha A7', 'GoPro Hero', 'Nikon D850', 'Webcam 4K', 'Video Camera'],
  'Measurement': ['Digital Multimeter', 'Oscilloscope', 'Logic Analyzer', 'Power Supply Unit', 'Signal Generator', 'Thermal Camera'],
  'Furniture': ['Standing Desk', 'Ergonomic Chair', 'Monitor Arm', 'Cable Management Kit', 'Whiteboard', 'Lab Bench'],
  'Other': ['3D Printer', 'Soldering Station', 'Tool Kit', 'Safety Equipment', 'VR Headset', 'Drone']
};

const auditActions = [
  'LOGIN', 'LOGOUT', 'CREATE_ITEM', 'UPDATE_ITEM', 'DELETE_ITEM',
  'CREATE_REQUEST', 'APPROVE_REQUEST', 'REJECT_REQUEST', 'CHECKOUT_REQUEST',
  'RETURN_REQUEST', 'CREATE_USER', 'UPDATE_USER', 'DEACTIVATE_USER',
  'REACTIVATE_USER', 'IMPORT_ITEMS', 'EXPORT_ITEMS', 'STATUS_CHANGE',
  'TRANSFER_ITEM', 'BULK_UPDATE'
];

const returnConditions = ['Good', 'Minor Damage', 'Major Damage', 'Lost'];

// ========== UTILITY FUNCTIONS ==========
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function dateStr(d) {
  return d.toISOString().split('T')[0];
}

function pad4(n) {
  return String(n).padStart(4, '0');
}

// ========== GENERATE USERS ==========
function generateUsers() {
  const users = [];
  let idx = 1;

  // Admins
  for (let i = 0; i < NUM_ADMINS; i++) {
    users.push({
      userId: `U${pad4(idx)}`,
      username: i === 0 ? 'admin' : `admin${i + 1}`,
      password: 'admin123',
      name: i === 0 ? 'Admin User' : `Admin ${pick(lastNames)}`,
      email: i === 0 ? 'admin@university.edu' : `admin${i + 1}@university.edu`,
      role: 'admin',
      department: 'COMP',
      isActive: true,
    });
    idx++;
  }

  // Operators
  for (let i = 0; i < NUM_OPERATORS; i++) {
    users.push({
      userId: `U${pad4(idx)}`,
      username: i === 0 ? 'operator' : `operator${i + 1}`,
      password: 'operator123',
      name: i === 0 ? 'Operator User' : `Operator ${pick(lastNames)}`,
      email: i === 0 ? 'operator@university.edu' : `operator${i + 1}@university.edu`,
      role: 'operator',
      department: pick(departments),
      isActive: true,
    });
    idx++;
  }

  // Teachers
  for (let i = 0; i < NUM_TEACHERS; i++) {
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    users.push({
      userId: `U${pad4(idx)}`,
      username: `teacher${i + 1}`,
      password: 'teacher123',
      name: `Prof. ${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${idx}@university.edu`,
      role: 'user',
      subRole: 'teacher',
      department: pick(departments),
      isActive: i < NUM_TEACHERS - 3, // last 3 teachers are inactive
    });
    idx++;
  }

  // Students
  for (let i = 0; i < NUM_STUDENTS; i++) {
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    const studentNum = String(100000 + i).padStart(8, '0');
    users.push({
      userId: `S${studentNum}`,
      username: `student${i + 1}`,
      password: 'student123',
      name: `${fn} ${ln}`,
      email: `s${studentNum}@student.university.edu`,
      role: 'user',
      subRole: 'student',
      department: pick(departments),
      isActive: i < NUM_STUDENTS - 5, // last 5 students are inactive
    });
    idx++;
  }

  return users;
}

// ========== GENERATE ITEMS ==========
function generateItems(users) {
  const items = [];
  const teacherIds = users.filter(u => u.subRole === 'teacher' && u.isActive).map(u => u.userId);

  // Build status queue
  const statusQueue = [];
  for (const [status, count] of Object.entries(ITEM_STATUS_DIST)) {
    for (let i = 0; i < count; i++) statusQueue.push(status);
  }
  // Shuffle
  statusQueue.sort(() => 0.5 - Math.random());

  // Generate 40 mother items first (items with components)
  const motherCount = 40;
  const motherItemIds = [];

  for (let i = 1; i <= TOTAL_ITEMS; i++) {
    const itemId = `INV-${pad4(i)}`;
    const cat = pick(categories);
    const namePrefixes = itemNamePrefixes[cat] || itemNamePrefixes['Other'];
    const status = statusQueue[i - 1] || 'Available';

    const purchaseDate = randomDate(new Date('2022-01-01'), new Date('2025-06-01'));
    const warrantyStart = new Date(purchaseDate);
    const warrantyEnd = new Date(purchaseDate);
    warrantyEnd.setFullYear(warrantyEnd.getFullYear() + randomInt(1, 3));

    const dept = pick(departments);
    const sup = pick(suppliers);
    // owner: ~60% department, ~40% teacher
    const owner = Math.random() < 0.6 ? 'department' : pick(teacherIds);

    let motherID = null;
    let fixedComponents = [];
    let isMother = false;

    // First 40 items are mother items
    if (i <= motherCount) {
      isMother = true;
      motherItemIds.push(itemId);
      // Components will be assigned after iteration
    }

    // Items 41-120 are children of mother items (2 children each on average)
    if (i > motherCount && i <= motherCount + motherCount * 2) {
      const motherIdx = Math.floor((i - motherCount - 1) / 2);
      if (motherIdx < motherItemIds.length) {
        motherID = motherItemIds[motherIdx];
      }
    }

    const item = {
      itemId,
      name: `${pick(namePrefixes)} #${i}`,
      universityID: `UNI-${dept}-${pad4(i)}`,
      type: motherID ? 'Component' : pick(itemTypes),
      category: cat,
      status,
      location: pick(locations),
      currentBorrower: null, // set later for In-use items
      description: `${cat} equipment for ${dept} department, unit ${i}`,
      motherID,
      fixedComponents,
      foRequestID: Math.random() < 0.7 ? `FO-${2023 + randomInt(0, 2)}-${pad4(randomInt(1, 999))}` : '',
      orderID: Math.random() < 0.8 ? `ORD-${2023 + randomInt(0, 2)}-${pad4(randomInt(1, 999))}` : '',
      supplier: sup,
      invoiceNumber: `INV-${randomInt(1000, 9999)}`,
      supplierStatus: pick(supplierStatuses),
      projectLinked: Math.random() < 0.4 ? `${dept}-Project-${String.fromCharCode(65 + randomInt(0, 7))}` : null,
      fundingSource: pick(fundingSources),
      purchaseDate: dateStr(purchaseDate),
      warrantyEnd: dateStr(warrantyEnd),
      warrantyStartDate: dateStr(warrantyStart),
      warrantyOnsite: Math.random() < 0.4,
      warrantyVendor: `${sup} Support`,
      vendor: sup,
      price: randomInt(10, 5000),
      departmentID: dept,
      owner,
      canBorrow: Math.random() < 0.75,
      lastUpdate: dateStr(randomDate(new Date('2025-01-01'), new Date('2025-12-31'))),
    };

    items.push(item);
  }

  // Assign fixedComponents to mother items
  for (let i = 0; i < motherCount; i++) {
    const motherId = motherItemIds[i];
    const children = items.filter(it => it.motherID === motherId).map(it => it.itemId);
    items[i].fixedComponents = children;
  }

  return items;
}

// ========== GENERATE BORROW REQUESTS ==========
function generateRequests(users, items) {
  const requests = [];

  // Get active borrowable students & teachers
  const studentIds = users.filter(u => u.subRole === 'student' && u.isActive).map(u => u.userId);
  const teacherIds = users.filter(u => u.subRole === 'teacher' && u.isActive).map(u => u.userId);
  const borrowerIds = [...studentIds, ...teacherIds];

  const adminOperatorIds = users.filter(u => u.role === 'admin' || u.role === 'operator').map(u => u.userId);

  // Get items that can be borrowed
  const borrowableItemIds = items.filter(it => it.canBorrow).map(it => it.itemId);

  // Build status queue
  const statusQueue = [];
  for (const [status, count] of Object.entries(REQ_STATUS_DIST)) {
    for (let i = 0; i < count; i++) statusQueue.push(status);
  }
  statusQueue.sort(() => 0.5 - Math.random());

  // Track which items are "In-use" so we can create matching requests
  const inUseItems = items.filter(it => it.status === 'In-use');
  const inUseItemIds = new Set(inUseItems.map(it => it.itemId));

  // We need to ensure In-use items have corresponding Approved/Pending Check-Out requests
  // First 80 requests will be for In-use items with Approved status
  let inUseIdx = 0;

  const reasons = [
    'Course project - Computer Architecture',
    'Lab assignment - Data Visualization',
    'Software development project',
    'Research experiment setup',
    'Final year project',
    'Thesis research equipment',
    'Workshop preparation',
    'Student competition',
    'Guest lecture setup',
    'Hardware testing and benchmarking',
    'Networking lab exercise',
    'Database systems lab',
    'Machine learning experiment',
    'IoT project development',
    'Mobile app development',
    'Cloud computing assignment',
    'Cybersecurity workshop',
    'Digital media production',
    'Robotics competition',
    'Seminar equipment setup',
  ];

  const groupParents = []; // for parent-child request relationships

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const requestId = `REQ-${pad4(i)}`;
    let status, itemID, borrowerID;

    // First 80 requests correspond to In-use items (Approved status)
    if (inUseIdx < inUseItems.length && i <= inUseItems.length) {
      const inUseItem = inUseItems[inUseIdx];
      status = 'Approved';
      itemID = inUseItem.itemId;
      borrowerID = pick(borrowerIds);
      // Set currentBorrower on the item
      inUseItem.currentBorrower = borrowerID;
      inUseIdx++;
    } else {
      status = statusQueue[i - 1 - inUseItems.length] || pick(Object.keys(REQ_STATUS_DIST));
      itemID = pick(borrowableItemIds);
      borrowerID = pick(borrowerIds);
    }

    const requestDate = randomDate(new Date('2024-06-01'), new Date('2025-11-01'));
    let approvalDate = null;
    let approvedBy = null;
    let returnDate = null;
    let returnedDate = null;
    let declaredReturnDate = null;
    let condition = null;
    let returnNotes = '';
    let parentRequestId = null;

    if (['Approved', 'Pending Check-Out', 'Returned', 'Rejected'].includes(status)) {
      approvalDate = new Date(requestDate.getTime() + randomInt(1, 48) * 60 * 60 * 1000); // 1-48 hours later
      approvedBy = pick(adminOperatorIds);
    }

    if (['Approved', 'Pending Check-Out'].includes(status)) {
      returnDate = new Date(requestDate.getTime() + randomInt(7, 90) * 24 * 60 * 60 * 1000);
      declaredReturnDate = new Date(requestDate.getTime() + randomInt(3, 30) * 24 * 60 * 60 * 1000);
    }

    if (status === 'Returned') {
      returnDate = new Date(requestDate.getTime() + randomInt(7, 60) * 24 * 60 * 60 * 1000);
      returnedDate = new Date(returnDate.getTime() - randomInt(0, 5) * 24 * 60 * 60 * 1000);
      declaredReturnDate = new Date(requestDate.getTime() + randomInt(3, 30) * 24 * 60 * 60 * 1000);
      condition = pick(returnConditions);
      if (condition !== 'Good') {
        returnNotes = `Item returned with ${condition.toLowerCase()}. Inspection needed.`;
      } else {
        returnNotes = 'Item returned in good condition.';
      }
    }

    // Every 25th request is a parent; the next 1-2 are children
    if (i % 25 === 0) {
      groupParents.push(requestId);
    }
    if (i % 25 === 1 && groupParents.length > 0) {
      parentRequestId = groupParents[groupParents.length - 1];
    }
    if (i % 25 === 2 && groupParents.length > 0) {
      parentRequestId = groupParents[groupParents.length - 1];
    }

    requests.push({
      requestId,
      itemID,
      borrowerID,
      status,
      requestDate,
      approvalDate,
      approvedBy,
      returnDate,
      returnedDate,
      declaredReturnDate,
      reason: pick(reasons),
      notes: Math.random() < 0.3 ? 'Handle with care' : '',
      condition,
      returnNotes,
      parentRequestId,
    });
  }

  return requests;
}

// ========== GENERATE AUDIT LOGS ==========
function generateAuditLogs(users, items) {
  const logs = [];
  const allUserIds = users.map(u => u.userId);
  const allItemIds = items.map(it => it.itemId);

  for (let i = 1; i <= TOTAL_LOGS; i++) {
    const action = pick(auditActions);
    const userId = pick(allUserIds);
    const timestamp = randomDate(new Date('2024-06-01'), new Date('2025-12-01'));

    let details = '';
    let affectedItemID = null;
    let oldValue = null;
    let newValue = null;

    switch (action) {
      case 'LOGIN':
        details = `User ${userId} logged in`;
        break;
      case 'LOGOUT':
        details = `User ${userId} logged out`;
        break;
      case 'CREATE_ITEM':
        affectedItemID = pick(allItemIds);
        details = `Created item ${affectedItemID}`;
        newValue = 'Available';
        break;
      case 'UPDATE_ITEM':
        affectedItemID = pick(allItemIds);
        details = `Updated item ${affectedItemID}`;
        oldValue = pick(['Available', 'In-use', 'Missing']);
        newValue = pick(['Available', 'In-use', 'Missing', 'Dispose']);
        break;
      case 'DELETE_ITEM':
        affectedItemID = pick(allItemIds);
        details = `Deleted item ${affectedItemID}`;
        break;
      case 'STATUS_CHANGE':
        affectedItemID = pick(allItemIds);
        oldValue = pick(['Available', 'In-use']);
        newValue = pick(['Missing', 'Dispose', 'Transferred']);
        details = `Item ${affectedItemID} status changed from ${oldValue} to ${newValue}`;
        break;
      case 'CREATE_REQUEST':
        details = `Borrow request created by ${userId}`;
        affectedItemID = pick(allItemIds);
        break;
      case 'APPROVE_REQUEST':
        details = `Borrow request approved by ${userId}`;
        affectedItemID = pick(allItemIds);
        break;
      case 'REJECT_REQUEST':
        details = `Borrow request rejected by ${userId}`;
        affectedItemID = pick(allItemIds);
        break;
      case 'CHECKOUT_REQUEST':
        details = `Item checked out by ${userId}`;
        affectedItemID = pick(allItemIds);
        break;
      case 'RETURN_REQUEST':
        details = `Item returned by ${userId}`;
        affectedItemID = pick(allItemIds);
        break;
      case 'CREATE_USER':
        details = `New user account created: ${pick(allUserIds)}`;
        break;
      case 'UPDATE_USER':
        details = `User account updated: ${pick(allUserIds)}`;
        break;
      case 'DEACTIVATE_USER':
        details = `User account deactivated: ${pick(allUserIds)}`;
        break;
      case 'REACTIVATE_USER':
        details = `User account reactivated: ${pick(allUserIds)}`;
        break;
      case 'IMPORT_ITEMS':
        details = `Bulk import: ${randomInt(5, 50)} items imported`;
        break;
      case 'EXPORT_ITEMS':
        details = `Exported ${randomInt(10, 200)} items to spreadsheet`;
        break;
      case 'TRANSFER_ITEM':
        affectedItemID = pick(allItemIds);
        oldValue = pick(departments);
        newValue = pick(departments);
        details = `Item ${affectedItemID} transferred from ${oldValue} to ${newValue}`;
        break;
      case 'BULK_UPDATE':
        details = `Bulk update: ${randomInt(3, 20)} items updated`;
        break;
      default:
        details = `Action ${action} performed by ${userId}`;
    }

    logs.push({
      logId: `LOG-${pad4(i)}`,
      timestamp,
      userID: userId,
      action,
      details,
      affectedItemID,
      oldValue,
      newValue,
    });
  }

  return logs;
}

// ========== COSMOS DB HELPERS ==========
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryOp(fn, label, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.code === 16500 && attempt < maxRetries) {
        const wait = attempt * 2000;
        console.log(`  Rate limited on ${label}, retry ${attempt}/${maxRetries} in ${wait}ms...`);
        await sleep(wait);
      } else {
        throw err;
      }
    }
  }
}

async function clearCollection(Model, name) {
  // Delete in small batches to avoid Cosmos rate limits
  let deleted = 0;
  while (true) {
    const docs = await Model.find({}).select('_id').limit(50);
    if (docs.length === 0) break;
    const ids = docs.map(d => d._id);
    await retryOp(() => Model.deleteMany({ _id: { $in: ids } }), `delete ${name}`);
    deleted += docs.length;
    process.stdout.write(`  Clearing ${name}: ${deleted} deleted\r`);
    await sleep(500);
  }
  console.log(`  Cleared ${name}: ${deleted} total`);
}

async function insertBatch(Model, docs, name, batchSize = 20) {
  let inserted = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    await retryOp(() => Model.insertMany(batch), `insert ${name}`);
    inserted += batch.length;
    process.stdout.write(`  ${name}: ${inserted}/${docs.length}\r`);
    await sleep(300);
  }
  console.log(`  ${name}: ${inserted}/${docs.length} inserted`);
}

// ========== MAIN SEED FUNCTION ==========
async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding.');

    // Clear all collections (with rate-limit handling)
    console.log('\n--- Clearing existing data ---');
    await clearCollection(BorrowRequest, 'BorrowRequests');
    await clearCollection(AuditLog, 'AuditLogs');
    await clearCollection(Item, 'Items');
    await clearCollection(User, 'Users');
    await clearCollection(Counter, 'Counters');
    console.log('All collections cleared.');

    // Generate data
    console.log('\n--- Generating data ---');
    const users = generateUsers();
    console.log(`Generated ${users.length} users`);

    const items = generateItems(users);
    console.log(`Generated ${items.length} items`);

    const requests = generateRequests(users, items);
    console.log(`Generated ${requests.length} borrow requests`);

    const logs = generateAuditLogs(users, items);
    console.log(`Generated ${logs.length} audit logs`);

    // Insert users in small batches (bcrypt pre-save hook needs .create())
    console.log('\n--- Inserting users (with password hashing) ---');
    let userCount = 0;
    const USER_BATCH = 10;
    for (let b = 0; b < users.length; b += USER_BATCH) {
      const batch = users.slice(b, b + USER_BATCH);
      await retryOp(() => Promise.all(batch.map(u => User.create(u))), 'create users');
      userCount += batch.length;
      process.stdout.write(`  Users: ${userCount}/${users.length}\r`);
      await sleep(500);
    }
    console.log(`  Users: ${userCount}/${users.length} inserted`);

    // Insert items
    console.log('\n--- Inserting items ---');
    await insertBatch(Item, items, 'Items');

    // Insert requests
    console.log('\n--- Inserting borrow requests ---');
    await insertBatch(BorrowRequest, requests, 'BorrowRequests');

    // Insert logs
    console.log('\n--- Inserting audit logs ---');
    await insertBatch(AuditLog, logs, 'AuditLogs');

    // Set counters
    console.log('\n--- Setting counters ---');
    await retryOp(() => Counter.create({ _id: 'itemId', seq: TOTAL_ITEMS }), 'counter-item');
    await sleep(300);
    await retryOp(() => Counter.create({ _id: 'requestId', seq: TOTAL_REQUESTS }), 'counter-req');
    await sleep(300);
    await retryOp(() => Counter.create({ _id: 'logId', seq: TOTAL_LOGS }), 'counter-log');
    console.log('  Counters set.');

    // ========== VALIDATION ==========
    console.log('\n=== VALIDATION ===');
    const userCountDB = await User.countDocuments();
    const itemCountDB = await Item.countDocuments();
    const reqCountDB = await BorrowRequest.countDocuments();
    const logCountDB = await AuditLog.countDocuments();

    console.log(`Users:          ${userCountDB}/${TOTAL_USERS}`);
    console.log(`Items:          ${itemCountDB}/${TOTAL_ITEMS}`);
    console.log(`BorrowRequests: ${reqCountDB}/${TOTAL_REQUESTS}`);
    console.log(`AuditLogs:      ${logCountDB}/${TOTAL_LOGS}`);

    // Check role distribution
    const admins = await User.countDocuments({ role: 'admin' });
    const operators = await User.countDocuments({ role: 'operator' });
    const teachers = await User.countDocuments({ subRole: 'teacher' });
    const students = await User.countDocuments({ subRole: 'student' });
    console.log(`\nUser roles — Admins: ${admins}, Operators: ${operators}, Teachers: ${teachers}, Students: ${students}`);

    // Check item statuses
    const statusCounts = {};
    for (const s of ['Available', 'In-use', 'Missing', 'Dispose', 'Not Available', 'Transferred']) {
      statusCounts[s] = await Item.countDocuments({ status: s });
    }
    console.log(`Item statuses:`, statusCounts);

    // Check request statuses
    const reqStatusCounts = {};
    for (const s of ['Pending', 'Pending Check-Out', 'Approved', 'Rejected', 'Returned']) {
      reqStatusCounts[s] = await BorrowRequest.countDocuments({ status: s });
    }
    console.log(`Request statuses:`, reqStatusCounts);

    // In-use items should have currentBorrower
    const inUseWithBorrower = await Item.countDocuments({ status: 'In-use', currentBorrower: { $ne: null } });
    const inUseTotal = statusCounts['In-use'];
    console.log(`\nIn-use items with currentBorrower: ${inUseWithBorrower}/${inUseTotal}`);

    // Mother-child relationships
    const motherItems = await Item.countDocuments({ fixedComponents: { $exists: true, $ne: [] } });
    const childItems = await Item.countDocuments({ motherID: { $ne: null } });
    console.log(`Mother items: ${motherItems}, Child items: ${childItems}`);

    // Counters
    const counters = await Counter.find({});
    console.log(`Counters:`, counters.map(c => `${c._id}=${c.seq}`).join(', '));

    // Inactive users
    const inactiveUsers = await User.countDocuments({ isActive: false });
    console.log(`Inactive users: ${inactiveUsers}`);

    // Login credentials
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Admin:    username=admin     password=admin123');
    console.log('Operator: username=operator  password=operator123');
    console.log('Teacher:  username=teacher1  password=teacher123');
    console.log('Student:  username=student1  password=student123');

    console.log('\n✅ Seed completed successfully!');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
