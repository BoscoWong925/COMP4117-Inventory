const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const User = require('../models/User');
const Item = require('../models/Item');
const BorrowRequest = require('../models/BorrowRequest');
const AuditLog = require('../models/AuditLog');
const Counter = require('../models/Counter');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Drop existing data
    await User.deleteMany({});
    await Item.deleteMany({});
    await BorrowRequest.deleteMany({});
    await AuditLog.deleteMany({});
    await Counter.deleteMany({});
    console.log('Cleared existing data.');

    // ===== USERS =====
    const users = [
      { userId: 'U001', username: 'admin', password: 'admin123', name: 'Admin User', email: 'admin@university.edu', role: 'admin', department: 'COMP', isActive: true },
      { userId: 'U002', username: 'operator', password: 'operator123', name: 'Operator User', email: 'operator@university.edu', role: 'operator', department: 'COMP', isActive: true },
      // Teachers
      { userId: 'U003', username: 'teacher1', password: 'teacher123', name: 'Prof. Lee', email: 'prof.lee@university.edu', role: 'user', subRole: 'teacher', department: 'COMP', isActive: true },
      { userId: 'U004', username: 'teacher2', password: 'teacher123', name: 'Prof. Smith', email: 'prof.smith@university.edu', role: 'user', subRole: 'teacher', department: 'COMP', isActive: true },
      { userId: 'U005', username: 'teacher3', password: 'teacher123', name: 'Prof. Johnson', email: 'prof.johnson@university.edu', role: 'user', subRole: 'teacher', department: 'COMP', isActive: true },
      { userId: 'U006', username: 'teacher4', password: 'teacher123', name: 'Prof. Williams', email: 'prof.williams@university.edu', role: 'user', subRole: 'teacher', department: 'COMP', isActive: true },
      { userId: 'U007', username: 'teacher5', password: 'teacher123', name: 'Prof. Brown', email: 'prof.brown@university.edu', role: 'user', subRole: 'teacher', department: 'COMP', isActive: true },
      { userId: 'U008', username: 'teacher6', password: 'teacher123', name: 'Prof. Martinez', email: 'prof.martinez@university.edu', role: 'user', subRole: 'teacher', department: 'COMP', isActive: true },
      { userId: 'U009', username: 'teacher7', password: 'teacher123', name: 'Prof. Garcia', email: 'prof.garcia@university.edu', role: 'user', subRole: 'teacher', department: 'COMP', isActive: true },
      { userId: 'U010', username: 'teacher8', password: 'teacher123', name: 'Prof. Rodriguez', email: 'prof.rodriguez@university.edu', role: 'user', subRole: 'teacher', department: 'COMP', isActive: true },
      { userId: 'U011', username: 'teacher9', password: 'teacher123', name: 'Prof. Anderson', email: 'prof.anderson@university.edu', role: 'user', subRole: 'teacher', department: 'COMP', isActive: true },
      { userId: 'U012', username: 'teacher10', password: 'teacher123', name: 'Prof. Taylor', email: 'prof.taylor@university.edu', role: 'user', subRole: 'teacher', department: 'COMP', isActive: true },
      // Students
      { userId: 'S00123456', username: 'student1', password: 'student123', name: 'John Smith', email: 'john.smith@student.university.edu', role: 'user', subRole: 'student', department: 'COMP', isActive: true },
      { userId: 'S00234567', username: 'student2', password: 'student123', name: 'Sarah Johnson', email: 'sarah.johnson@student.university.edu', role: 'user', subRole: 'student', department: 'COMP', isActive: true },
      { userId: 'S00345678', username: 'student3', password: 'student123', name: 'Mike Chen', email: 'mike.chen@student.university.edu', role: 'user', subRole: 'student', department: 'COMP', isActive: true },
      { userId: 'S00456789', username: 'student4', password: 'student123', name: 'Emma Davis', email: 'emma.davis@student.university.edu', role: 'user', subRole: 'student', department: 'COMP', isActive: true },
      { userId: 'S00567890', username: 'student5', password: 'student123', name: 'Alex Wilson', email: 'alex.wilson@student.university.edu', role: 'user', subRole: 'student', department: 'COMP', isActive: true },
      { userId: 'S00678901', username: 'student6', password: 'student123', name: 'Jessica Lee', email: 'jessica.lee@student.university.edu', role: 'user', subRole: 'student', department: 'COMP', isActive: true },
      { userId: 'S00789012', username: 'student7', password: 'student123', name: 'David Brown', email: 'david.brown@student.university.edu', role: 'user', subRole: 'student', department: 'COMP', isActive: true },
      { userId: 'S00890123', username: 'student8', password: 'student123', name: 'Lisa Wang', email: 'lisa.wang@student.university.edu', role: 'user', subRole: 'student', department: 'COMP', isActive: true },
      { userId: 'S00901234', username: 'student9', password: 'student123', name: 'James Park', email: 'james.park@student.university.edu', role: 'user', subRole: 'student', department: 'COMP', isActive: true },
      { userId: 'S01012345', username: 'student10', password: 'student123', name: 'Rachel Green', email: 'rachel.green@student.university.edu', role: 'user', subRole: 'student', department: 'COMP', isActive: true }
    ];

    // bcrypt hash is handled by the pre-save hook in the User model
    for (const userData of users) {
      await User.create(userData);
    }
    console.log(`Seeded ${users.length} users.`);

    // ===== INVENTORY ITEMS =====
    const items = [
      { itemId: 'INV-001', motherID: 'COMP-LAPTOP-001', universityID: 'UNI-LAPTOP-001', name: 'MacBook Pro 16 - CPU', type: 'Hardware', category: 'Computer', status: 'Available', location: 'Lab A', currentBorrower: null, lastUpdate: '2025-01-15', description: 'Main laptop unit', fixedComponents: ['INV-002', 'INV-003'], foRequestID: 'FO-2025-001', orderID: 'ORD-2025-001', supplier: 'TechCorp', invoiceNumber: 'INV-1001', supplierStatus: 'Delivered', projectLinked: 'COMP-Project-A', fundingSource: 'Department Budget', purchaseDate: '2025-01-01', warrantyEnd: '2026-01-01', warrantyOnsite: true, warrantyVendor: 'TechCorp Support', vendor: 'TechCorp', price: 2499, owner: 'department', canBorrow: true },
      { itemId: 'INV-002', motherID: 'COMP-LAPTOP-001', universityID: 'UNI-LAPTOP-001-RAM', name: 'MacBook Pro 16 - RAM Module', type: 'Component', category: 'Memory', status: 'Available', location: 'Lab A', currentBorrower: null, lastUpdate: '2025-01-15', description: '16GB RAM Module', fixedComponents: [], foRequestID: 'FO-2025-001', orderID: 'ORD-2025-001', supplier: 'TechCorp', invoiceNumber: 'INV-1001', supplierStatus: 'Delivered', projectLinked: 'COMP-Project-A', fundingSource: 'Department Budget', purchaseDate: '2025-01-01', warrantyEnd: '2026-01-01', warrantyOnsite: false, warrantyVendor: 'TechCorp Support', vendor: 'TechCorp', price: 400, owner: 'department', canBorrow: false },
      { itemId: 'INV-003', motherID: 'COMP-LAPTOP-001', universityID: 'UNI-LAPTOP-001-SSD', name: 'MacBook Pro 16 - SSD', type: 'Component', category: 'Storage', status: 'Available', location: 'Lab A', currentBorrower: null, lastUpdate: '2025-01-15', description: '512GB SSD', fixedComponents: [], foRequestID: 'FO-2025-001', orderID: 'ORD-2025-001', supplier: 'TechCorp', invoiceNumber: 'INV-1001', supplierStatus: 'Delivered', projectLinked: 'COMP-Project-A', fundingSource: 'Department Budget', purchaseDate: '2025-01-01', warrantyEnd: '2026-01-01', warrantyOnsite: true, warrantyVendor: 'TechCorp Support', vendor: 'TechCorp', price: 600, owner: 'department', canBorrow: false },
      { itemId: 'INV-004', motherID: null, universityID: 'UNI-MONITOR-001', name: 'Dell 4K Monitor 27"', type: 'Hardware', category: 'Display', status: 'In-use', location: 'Lab B', currentBorrower: 'S00123456', lastUpdate: '2025-01-20', description: '27-inch 4K display', fixedComponents: [], foRequestID: 'FO-2025-002', orderID: 'ORD-2025-002', supplier: 'Dell', invoiceNumber: 'INV-1002', supplierStatus: 'Delivered', projectLinked: 'COMP-Project-B', fundingSource: 'Research Fund', purchaseDate: '2024-06-15', warrantyEnd: '2027-06-15', warrantyOnsite: true, warrantyVendor: 'Dell Support', vendor: 'Dell', price: 799, owner: 'U003', canBorrow: true },
      { itemId: 'INV-005', motherID: null, universityID: 'UNI-MOUSE-001', name: 'Logitech Wireless Mouse', type: 'Component', category: 'Peripherals', status: 'Available', location: 'Lab C', currentBorrower: null, lastUpdate: '2025-01-10', description: 'Wireless mouse', fixedComponents: [], foRequestID: 'FO-2025-003', orderID: 'ORD-2025-003', supplier: 'Logitech', invoiceNumber: 'INV-1003', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Miscellaneous', purchaseDate: '2024-06-01', warrantyEnd: '2025-06-01', warrantyOnsite: false, warrantyVendor: 'Logitech', vendor: 'Logitech', price: 45, owner: 'department', canBorrow: true },
      { itemId: 'INV-006', motherID: null, universityID: 'UNI-KEYBOARD-001', name: 'Mechanical Keyboard RGB', type: 'Component', category: 'Peripherals', status: 'In-use', location: 'Lab A', currentBorrower: 'S00234567', lastUpdate: '2025-02-01', description: 'Mechanical keyboard with RGB lighting', fixedComponents: [], foRequestID: 'FO-2025-004', orderID: 'ORD-2025-004', supplier: 'Corsair', invoiceNumber: 'INV-1004', supplierStatus: 'Delivered', projectLinked: 'COMP-Project-C', fundingSource: 'Department Budget', purchaseDate: '2024-12-01', warrantyEnd: '2025-12-01', warrantyOnsite: true, warrantyVendor: 'Corsair', vendor: 'Corsair', price: 150, owner: 'department', canBorrow: true },
      { itemId: 'INV-007', motherID: null, universityID: 'UNI-LAPTOP-002', name: 'Dell XPS 13', type: 'Hardware', category: 'Computer', status: 'Available', location: 'Lab B', currentBorrower: null, lastUpdate: '2025-01-28', description: 'Ultrabook with Intel i7', fixedComponents: [], foRequestID: 'FO-2025-005', orderID: 'ORD-2025-005', supplier: 'Dell', invoiceNumber: 'INV-1005', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Research Fund', purchaseDate: '2024-09-01', warrantyEnd: '2025-09-01', warrantyOnsite: true, warrantyVendor: 'Dell Support', vendor: 'Dell', price: 1299, owner: 'U003', canBorrow: true },
      { itemId: 'INV-008', motherID: null, universityID: 'UNI-MONITOR-002', name: 'LG 32" UltraWide', type: 'Hardware', category: 'Display', status: 'In-use', location: 'Office', currentBorrower: 'S00345678', lastUpdate: '2025-01-15', description: '32-inch ultrawide curved monitor', fixedComponents: [], foRequestID: 'FO-2025-006', orderID: 'ORD-2025-006', supplier: 'LG', invoiceNumber: 'INV-1006', supplierStatus: 'Delivered', projectLinked: 'COMP-Project-D', fundingSource: 'Department Budget', purchaseDate: '2024-08-20', warrantyEnd: '2025-08-20', warrantyOnsite: false, warrantyVendor: 'LG Support', vendor: 'LG', price: 599, owner: 'department', canBorrow: true },
      { itemId: 'INV-009', motherID: null, universityID: 'UNI-GPU-001', name: 'NVIDIA RTX 4080', type: 'Component', category: 'Computer', status: 'Available', location: 'Storage Room', currentBorrower: null, lastUpdate: '2025-01-18', description: 'High-performance GPU for computing', fixedComponents: [], foRequestID: 'FO-2025-007', orderID: 'ORD-2025-007', supplier: 'TechCorp', invoiceNumber: 'INV-1007', supplierStatus: 'Delivered', projectLinked: 'ML-Research', fundingSource: 'Research Fund', purchaseDate: '2024-10-15', warrantyEnd: '2025-10-15', warrantyOnsite: true, warrantyVendor: 'NVIDIA', vendor: 'TechCorp', price: 1599, owner: 'U003', canBorrow: true },
      { itemId: 'INV-010', motherID: null, universityID: 'UNI-PRINTER-001', name: 'HP LaserJet Pro', type: 'Hardware', category: 'Peripherals', status: 'Available', location: 'Office', currentBorrower: null, lastUpdate: '2025-01-25', description: 'Network printer for lab use', fixedComponents: [], foRequestID: 'FO-2025-008', orderID: 'ORD-2025-008', supplier: 'HP', invoiceNumber: 'INV-1008', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Department Budget', purchaseDate: '2024-07-10', warrantyEnd: '2026-07-10', warrantyOnsite: true, warrantyVendor: 'HP Support', vendor: 'HP', price: 349, owner: 'department', canBorrow: true },
      { itemId: 'INV-011', motherID: null, universityID: 'UNI-SSD-001', name: 'Samsung 870 QVO 1TB', type: 'Component', category: 'Storage', status: 'In-use', location: 'Lab C', currentBorrower: 'S00456789', lastUpdate: '2025-02-01', description: '1TB SSD storage drive', fixedComponents: [], foRequestID: 'FO-2025-009', orderID: 'ORD-2025-009', supplier: 'Samsung', invoiceNumber: 'INV-1009', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Miscellaneous', purchaseDate: '2024-11-01', warrantyEnd: '2025-11-01', warrantyOnsite: false, warrantyVendor: 'Samsung', vendor: 'Samsung', price: 89, owner: 'department', canBorrow: true },
      { itemId: 'INV-012', motherID: null, universityID: 'UNI-HEADPHONES-001', name: 'Sony WH-1000XM5', type: 'Component', category: 'Peripherals', status: 'Available', location: 'Lab A', currentBorrower: null, lastUpdate: '2025-01-22', description: 'Noise-cancelling wireless headphones', fixedComponents: [], foRequestID: 'FO-2025-010', orderID: 'ORD-2025-010', supplier: 'Sony', invoiceNumber: 'INV-1010', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Miscellaneous', purchaseDate: '2024-12-15', warrantyEnd: '2025-12-15', warrantyOnsite: false, warrantyVendor: 'Sony', vendor: 'Sony', price: 398, owner: 'U003', canBorrow: false },
      { itemId: 'INV-013', motherID: null, universityID: 'UNI-CAMERA-001', name: 'Canon EOS R5', type: 'Hardware', category: 'Camera', status: 'Available', location: 'Media Lab', currentBorrower: null, lastUpdate: '2025-02-05', description: 'Professional digital camera for projects', fixedComponents: [], foRequestID: 'FO-2025-011', orderID: 'ORD-2025-011', supplier: 'Canon', invoiceNumber: 'INV-1011', supplierStatus: 'Delivered', projectLinked: 'Media-Project', fundingSource: 'Department Budget', purchaseDate: '2024-05-10', warrantyEnd: '2026-05-10', warrantyOnsite: true, warrantyVendor: 'Canon Support', vendor: 'Canon', price: 3999, owner: 'U004', canBorrow: true },
      { itemId: 'INV-014', motherID: null, universityID: 'UNI-PROJECTOR-001', name: 'Epson PowerLite Projector', type: 'Hardware', category: 'Display', status: 'Available', location: 'Classroom A', currentBorrower: null, lastUpdate: '2025-02-01', description: '4K laser projector for presentations', fixedComponents: [], foRequestID: 'FO-2025-012', orderID: 'ORD-2025-012', supplier: 'Epson', invoiceNumber: 'INV-1012', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Department Budget', purchaseDate: '2024-03-20', warrantyEnd: '2026-03-20', warrantyOnsite: true, warrantyVendor: 'Epson Support', vendor: 'Epson', price: 2499, owner: 'department', canBorrow: true },
      { itemId: 'INV-015', motherID: null, universityID: 'UNI-SCANNER-001', name: 'Canon Document Scanner', type: 'Hardware', category: 'Peripherals', status: 'Available', location: 'Office', currentBorrower: null, lastUpdate: '2025-01-30', description: 'High-speed document scanner', fixedComponents: [], foRequestID: 'FO-2025-013', orderID: 'ORD-2025-013', supplier: 'Canon', invoiceNumber: 'INV-1013', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Miscellaneous', purchaseDate: '2024-09-15', warrantyEnd: '2025-09-15', warrantyOnsite: false, warrantyVendor: 'Canon', vendor: 'Canon', price: 449, owner: 'U005', canBorrow: true },
      { itemId: 'INV-016', motherID: null, universityID: 'UNI-ROUTER-001', name: 'Cisco WiFi 6 Router', type: 'Hardware', category: 'Networking', status: 'Available', location: 'Network Room', currentBorrower: null, lastUpdate: '2025-02-02', description: 'Enterprise WiFi 6 router for labs', fixedComponents: [], foRequestID: 'FO-2025-014', orderID: 'ORD-2025-014', supplier: 'Cisco', invoiceNumber: 'INV-1014', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Research Fund', purchaseDate: '2024-10-01', warrantyEnd: '2027-10-01', warrantyOnsite: true, warrantyVendor: 'Cisco Support', vendor: 'Cisco', price: 799, owner: 'department', canBorrow: false },
      { itemId: 'INV-017', motherID: null, universityID: 'UNI-SPEAKER-001', name: 'Bose SoundLink Speakers', type: 'Component', category: 'Audio', status: 'In-use', location: 'Lab D', currentBorrower: 'S00234567', lastUpdate: '2025-02-03', description: 'Portable Bluetooth speakers', fixedComponents: [], foRequestID: 'FO-2025-015', orderID: 'ORD-2025-015', supplier: 'Bose', invoiceNumber: 'INV-1015', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Miscellaneous', purchaseDate: '2024-11-20', warrantyEnd: '2025-11-20', warrantyOnsite: false, warrantyVendor: 'Bose', vendor: 'Bose', price: 399, owner: 'U003', canBorrow: true },
      { itemId: 'INV-018', motherID: null, universityID: 'UNI-TABLET-001', name: 'iPad Pro 12.9"', type: 'Hardware', category: 'Computer', status: 'Available', location: 'Lab B', currentBorrower: null, lastUpdate: '2025-02-04', description: 'iPad with Apple Pencil for design work', fixedComponents: [], foRequestID: 'FO-2025-016', orderID: 'ORD-2025-016', supplier: 'Apple', invoiceNumber: 'INV-1016', supplierStatus: 'Delivered', projectLinked: 'Design-Project', fundingSource: 'Research Fund', purchaseDate: '2024-08-05', warrantyEnd: '2026-08-05', warrantyOnsite: true, warrantyVendor: 'Apple Support', vendor: 'Apple', price: 1299, owner: 'U004', canBorrow: true },
      { itemId: 'INV-019', motherID: null, universityID: 'UNI-BACKUP-001', name: 'Western Digital 8TB External Drive', type: 'Component', category: 'Storage', status: 'Available', location: 'Storage Room', currentBorrower: null, lastUpdate: '2025-02-01', description: 'External backup storage drive', fixedComponents: [], foRequestID: 'FO-2025-017', orderID: 'ORD-2025-017', supplier: 'Western Digital', invoiceNumber: 'INV-1017', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Miscellaneous', purchaseDate: '2024-12-10', warrantyEnd: '2026-12-10', warrantyOnsite: false, warrantyVendor: 'WD Support', vendor: 'WD', price: 129, owner: 'department', canBorrow: true },
      { itemId: 'INV-020', motherID: null, universityID: 'UNI-WEBCAM-001', name: 'Logitech 4K Webcam', type: 'Component', category: 'Peripherals', status: 'Available', location: 'Lab C', currentBorrower: null, lastUpdate: '2025-02-02', description: '4K webcam for video conferencing and recording', fixedComponents: [], foRequestID: 'FO-2025-018', orderID: 'ORD-2025-018', supplier: 'Logitech', invoiceNumber: 'INV-1018', supplierStatus: 'Delivered', projectLinked: null, fundingSource: 'Miscellaneous', purchaseDate: '2025-01-15', warrantyEnd: '2026-01-15', warrantyOnsite: false, warrantyVendor: 'Logitech', vendor: 'Logitech', price: 199, owner: 'U005', canBorrow: true }
    ];

    await Item.insertMany(items);
    console.log(`Seeded ${items.length} inventory items.`);

    // ===== BORROW REQUESTS =====
    const requests = [
      { requestId: 'REQ-001', itemID: 'INV-001', borrowerID: 'S00123456', status: 'Pending', requestDate: new Date('2025-02-01T09:30:00Z'), approvalDate: null, approvedBy: null, returnDate: null, returnedDate: null, reason: 'Course project - Computer Architecture', notes: '', parentRequestId: null },
      { requestId: 'REQ-002', itemID: 'INV-004', borrowerID: 'S00123456', status: 'Approved', requestDate: new Date('2025-01-20T10:15:00Z'), approvalDate: new Date('2025-01-20T11:45:00Z'), approvedBy: 'U001', returnDate: new Date('2025-02-20T17:00:00Z'), returnedDate: null, reason: 'Lab assignment - Data Visualization', notes: 'Return by end of semester', parentRequestId: null },
      { requestId: 'REQ-003', itemID: 'INV-006', borrowerID: 'S00234567', status: 'Approved', requestDate: new Date('2025-01-25T14:20:00Z'), approvalDate: new Date('2025-01-25T15:05:00Z'), approvedBy: 'U002', returnDate: new Date('2025-02-25T16:30:00Z'), returnedDate: null, reason: 'Software development project', notes: '', parentRequestId: null },
      { requestId: 'REQ-004', itemID: 'INV-008', borrowerID: 'S00345678', status: 'Approved', requestDate: new Date('2025-01-18T13:45:00Z'), approvalDate: new Date('2025-01-18T14:30:00Z'), approvedBy: 'U001', returnDate: new Date('2025-02-18T18:00:00Z'), returnedDate: null, reason: 'Game development lab', notes: 'High-performance needed', parentRequestId: null },
      { requestId: 'REQ-005', itemID: 'INV-011', borrowerID: 'S00456789', status: 'Approved', requestDate: new Date('2025-01-28T11:20:00Z'), approvalDate: new Date('2025-01-28T12:10:00Z'), approvedBy: 'U002', returnDate: new Date('2025-02-28T17:15:00Z'), returnedDate: null, reason: 'Data storage for research', notes: '', parentRequestId: null },
      { requestId: 'REQ-006', itemID: 'INV-007', borrowerID: 'S00567890', status: 'Pending', requestDate: new Date('2025-02-01T08:50:00Z'), approvalDate: null, approvedBy: null, returnDate: null, returnedDate: null, reason: 'Mobile app development', notes: '', parentRequestId: null },
      { requestId: 'REQ-007', itemID: 'INV-009', borrowerID: 'S00234567', status: 'Rejected', requestDate: new Date('2025-01-31T16:30:00Z'), approvalDate: new Date('2025-02-01T09:00:00Z'), approvedBy: 'U001', returnDate: null, returnedDate: null, reason: 'Machine learning experiments', notes: 'Item reserved for research lab', parentRequestId: null },
      { requestId: 'REQ-008', itemID: 'INV-002', borrowerID: 'S00345678', status: 'Returned', requestDate: new Date('2025-01-10T09:45:00Z'), approvalDate: new Date('2025-01-10T10:30:00Z'), approvedBy: 'U001', returnDate: new Date('2025-01-31T17:30:00Z'), returnedDate: new Date('2025-01-29T15:20:00Z'), reason: 'Testing and benchmarking', notes: 'Returned in good condition', parentRequestId: null },
      { requestId: 'REQ-009', itemID: 'INV-012', borrowerID: 'S00123456', status: 'Pending', requestDate: new Date('2025-02-01T12:30:00Z'), approvalDate: null, approvedBy: null, returnDate: null, returnedDate: null, reason: 'Audio recording for project', notes: '', parentRequestId: null },
      { requestId: 'REQ-010', itemID: 'INV-005', borrowerID: 'S00567890', status: 'Approved', requestDate: new Date('2025-02-01T07:40:00Z'), approvalDate: new Date('2025-02-01T08:20:00Z'), approvedBy: 'U002', returnDate: new Date('2025-02-15T18:00:00Z'), returnedDate: null, reason: 'HCI Lab experiment', notes: '', parentRequestId: null },
      { requestId: 'REQ-011', itemID: 'INV-010', borrowerID: 'U003', status: 'Approved', requestDate: new Date('2025-01-18T09:30:00Z'), approvalDate: new Date('2025-01-18T14:00:00Z'), approvedBy: 'U001', returnDate: new Date('2025-03-01'), returnedDate: null, reason: 'Printing course materials for department', notes: 'Return after semester ends', parentRequestId: null },
      { requestId: 'REQ-012', itemID: 'INV-007', borrowerID: 'U003', status: 'Approved', requestDate: new Date('2025-01-22T11:00:00Z'), approvalDate: new Date('2025-01-22T15:30:00Z'), approvedBy: 'U002', returnDate: new Date('2025-02-28'), returnedDate: null, reason: 'Web development project setup', notes: 'Handle with care', parentRequestId: null },
      { requestId: 'REQ-013', itemID: 'INV-009', borrowerID: 'U003', status: 'Pending', requestDate: new Date('2025-02-01T10:15:00Z'), approvalDate: null, approvedBy: null, returnDate: null, returnedDate: null, reason: 'GPU computing for data analysis', notes: '', parentRequestId: null },
      { requestId: 'REQ-014', itemID: 'INV-005', borrowerID: 'U003', status: 'Returned', requestDate: new Date('2024-12-10T08:45:00Z'), approvalDate: new Date('2024-12-10T11:30:00Z'), approvedBy: 'U002', returnDate: new Date('2025-01-10'), returnedDate: new Date('2025-01-08T16:20:00Z'), reason: 'Lab setup - Mouse needed for testing', notes: 'Returned in good condition', parentRequestId: null },
      { requestId: 'REQ-015', itemID: 'INV-003', borrowerID: 'U003', status: 'Returned', requestDate: new Date('2024-11-05T14:00:00Z'), approvalDate: new Date('2024-11-06T09:00:00Z'), approvedBy: 'U001', returnDate: new Date('2024-12-05'), returnedDate: new Date('2024-12-03T10:30:00Z'), reason: 'SSD benchmarking for research paper', notes: 'All good', parentRequestId: null },
      { requestId: 'REQ-016', itemID: 'INV-012', borrowerID: 'U003', status: 'Rejected', requestDate: new Date('2025-01-20T13:00:00Z'), approvalDate: new Date('2025-01-21T09:45:00Z'), approvedBy: 'U001', returnDate: null, returnedDate: null, reason: 'Need headphones for recording project', notes: 'Item reserved for audio lab', parentRequestId: null }
    ];

    await BorrowRequest.insertMany(requests);
    console.log(`Seeded ${requests.length} borrow requests.`);

    // ===== AUDIT LOGS =====
    const logs = [
      { logId: 'LOG-001', timestamp: new Date('2025-02-01T08:30:00Z'), userID: 'U001', action: 'LOGIN', details: 'Admin user logged in', affectedItemID: null, oldValue: null, newValue: null },
      { logId: 'LOG-002', timestamp: new Date('2025-02-01T09:15:00Z'), userID: 'U001', action: 'ITEM_STATUS_CHANGE', details: 'Item status updated', affectedItemID: 'INV-004', oldValue: 'Available', newValue: 'In-use' },
      { logId: 'LOG-003', timestamp: new Date('2025-02-01T10:00:00Z'), userID: 'U002', action: 'BORROW_REQUEST_APPROVED', details: 'Borrowing request approved for INV-004', affectedItemID: 'INV-004', oldValue: null, newValue: 'Approved' },
      { logId: 'LOG-004', timestamp: new Date('2025-02-01T10:30:00Z'), userID: 'S00123456', action: 'LOGIN', details: 'Student user logged in', affectedItemID: null, oldValue: null, newValue: null },
      { logId: 'LOG-005', timestamp: new Date('2025-02-01T11:00:00Z'), userID: 'S00123456', action: 'BORROW_REQUEST_CREATED', details: 'New borrowing request created for INV-001', affectedItemID: 'INV-001', oldValue: null, newValue: 'Pending' },
      { logId: 'LOG-006', timestamp: new Date('2025-01-31T14:20:00Z'), userID: 'U001', action: 'ITEM_STATUS_CHANGE', details: 'Item returned and status updated', affectedItemID: 'INV-002', oldValue: 'In-use', newValue: 'Available' },
      { logId: 'LOG-007', timestamp: new Date('2025-01-31T14:25:00Z'), userID: 'U002', action: 'ITEM_RETURNED', details: 'Item INV-002 marked as returned by S00345678', affectedItemID: 'INV-002', oldValue: null, newValue: 'Returned' },
      { logId: 'LOG-008', timestamp: new Date('2025-01-30T16:45:00Z'), userID: 'S00234567', action: 'LOGIN', details: 'Student user logged in', affectedItemID: null, oldValue: null, newValue: null },
      { logId: 'LOG-009', timestamp: new Date('2025-01-30T17:10:00Z'), userID: 'S00234567', action: 'BORROW_REQUEST_CREATED', details: 'New borrowing request created for INV-006', affectedItemID: 'INV-006', oldValue: null, newValue: 'Pending' },
      { logId: 'LOG-010', timestamp: new Date('2025-01-29T09:00:00Z'), userID: 'U001', action: 'INVENTORY_ITEM_ADDED', details: 'New inventory item INV-012 added', affectedItemID: 'INV-012', oldValue: null, newValue: 'Created' },
      { logId: 'LOG-011', timestamp: new Date('2025-01-28T13:30:00Z'), userID: 'U002', action: 'BORROW_REQUEST_APPROVED', details: 'Borrowing request approved for INV-011', affectedItemID: 'INV-011', oldValue: null, newValue: 'Approved' },
      { logId: 'LOG-012', timestamp: new Date('2025-01-25T10:15:00Z'), userID: 'S00345678', action: 'BORROW_REQUEST_CREATED', details: 'New borrowing request created for INV-008', affectedItemID: 'INV-008', oldValue: null, newValue: 'Pending' },
      { logId: 'LOG-013', timestamp: new Date('2025-01-25T11:45:00Z'), userID: 'U001', action: 'BORROW_REQUEST_APPROVED', details: 'Borrowing request approved for INV-008', affectedItemID: 'INV-008', oldValue: null, newValue: 'Approved' },
      { logId: 'LOG-014', timestamp: new Date('2025-01-20T14:00:00Z'), userID: 'U001', action: 'BORROW_REQUEST_APPROVED', details: 'Borrowing request approved for INV-004', affectedItemID: 'INV-004', oldValue: null, newValue: 'Approved' },
      { logId: 'LOG-015', timestamp: new Date('2025-01-20T14:30:00Z'), userID: 'U002', action: 'ITEM_STATUS_CHANGE', details: 'Item status changed to In-use', affectedItemID: 'INV-004', oldValue: 'Available', newValue: 'In-use' },
      { logId: 'LOG-016', timestamp: new Date('2025-01-18T09:30:00Z'), userID: 'S00456789', action: 'LOGIN', details: 'Student user logged in', affectedItemID: null, oldValue: null, newValue: null },
      { logId: 'LOG-017', timestamp: new Date('2025-01-15T08:00:00Z'), userID: 'U001', action: 'LOGIN', details: 'Admin user logged in', affectedItemID: null, oldValue: null, newValue: null },
      { logId: 'LOG-018', timestamp: new Date('2025-01-10T12:00:00Z'), userID: 'U001', action: 'BORROW_REQUEST_APPROVED', details: 'Borrowing request approved for INV-002', affectedItemID: 'INV-002', oldValue: null, newValue: 'Approved' }
    ];

    await AuditLog.insertMany(logs);
    console.log(`Seeded ${logs.length} audit logs.`);

    // ===== SET COUNTERS =====
    await Counter.create({ _id: 'itemId', seq: 20 });
    await Counter.create({ _id: 'requestId', seq: 16 });
    await Counter.create({ _id: 'logId', seq: 18 });
    console.log('Set counters.');

    console.log('\n=== Seeding completed successfully! ===');
    console.log('Demo credentials:');
    console.log('  Admin:    admin / admin123');
    console.log('  Operator: operator / operator123');
    console.log('  Teachers: teacher1-10 / teacher123');
    console.log('  Students: student1-10 / student123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
