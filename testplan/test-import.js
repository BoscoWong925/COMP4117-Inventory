/**
 * Test script for Excel import duplicate detection
 * Tests: backend check-duplicates endpoint + creates a test Excel file
 */
const XLSX = require('xlsx');
const path = require('path');

// Create test Excel file with mix of new and duplicate items
const testData = [
  // Duplicate items (these universityIDs already exist in seed data)
  { Name: 'MacBook Pro 16 (Duplicate)', 'University ID': 'UNI-LAPTOP-001', Type: 'Hardware', Category: 'Computer', Status: 'Available', Location: 'Lab A' },
  { Name: 'Dell Monitor (Duplicate)', 'University ID': 'UNI-MONITOR-001', Type: 'Hardware', Category: 'Display', Status: 'Available', Location: 'Lab B' },
  // New items (should import fine)
  { Name: 'New Test Keyboard', 'University ID': 'UNI-TEST-KB-001', Type: 'Hardware', Category: 'Peripherals', Status: 'Available', Location: 'Lab C' },
  { Name: 'New Test Mouse', 'University ID': 'UNI-TEST-MS-001', Type: 'Component', Category: 'Peripherals', Status: 'Available', Location: 'Lab C' },
  { Name: 'Another Duplicate Mouse', 'University ID': 'UNI-MOUSE-001', Type: 'Component', Category: 'Peripherals', Status: 'Available', Location: 'Lab C' },
];

const ws = XLSX.utils.json_to_sheet(testData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Items');

const testFile = path.join(__dirname, 'test_import_duplicates.xlsx');
XLSX.writeFile(wb, testFile);
console.log(`\n✅ Test Excel file created: ${testFile}`);
console.log(`   Contains ${testData.length} items (3 duplicates + 2 new)\n`);

// Now test the API
const http = require('http');

function apiRequest(endpoint, method, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: `/api${endpoint}`,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (global.authToken) {
      options.headers['Authorization'] = `Bearer ${global.authToken}`;
    }
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('=== Testing Duplicate Detection ===\n');

  // 1. Login
  const loginRes = await apiRequest('/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  if (!loginRes.success) {
    console.log('❌ Login failed');
    return;
  }
  global.authToken = loginRes.token;
  console.log('✅ Test 1: Login successful\n');

  // 2. Check duplicates with mixed IDs
  console.log('Test 2: Check duplicates with mixed universityIDs...');
  const dupRes = await apiRequest('/items/check-duplicates', 'POST', {
    universityIDs: ['UNI-LAPTOP-001', 'UNI-MONITOR-001', 'UNI-TEST-KB-001', 'UNI-TEST-MS-001', 'UNI-MOUSE-001']
  });
  console.log(`   Found ${dupRes.duplicates.length} duplicates:`);
  dupRes.duplicates.forEach(d => console.log(`   - ${d.universityID} → ${d.itemId} (${d.name}, ${d.status})`));
  const expectedDups = 3; // UNI-LAPTOP-001, UNI-MONITOR-001, UNI-MOUSE-001
  console.log(dupRes.duplicates.length === expectedDups
    ? `✅ Test 2: Correctly found ${expectedDups} duplicates\n`
    : `❌ Test 2: Expected ${expectedDups} duplicates, got ${dupRes.duplicates.length}\n`);

  // 3. Check duplicates with empty list
  console.log('Test 3: Check duplicates with empty list...');
  const emptyRes = await apiRequest('/items/check-duplicates', 'POST', { universityIDs: [] });
  console.log(emptyRes.duplicates.length === 0
    ? '✅ Test 3: Empty list returns no duplicates\n'
    : '❌ Test 3: Should return empty for empty input\n');

  // 4. Check duplicates with all new IDs
  console.log('Test 4: Check duplicates with all new IDs...');
  const newRes = await apiRequest('/items/check-duplicates', 'POST', {
    universityIDs: ['BRAND-NEW-001', 'BRAND-NEW-002']
  });
  console.log(newRes.duplicates.length === 0
    ? '✅ Test 4: No duplicates for all new IDs\n'
    : '❌ Test 4: Should return no duplicates for new IDs\n');

  // 5. Import a new item (non-duplicate) to verify normal import still works
  console.log('Test 5: Import a single new item via POST /items...');
  const newItem = {
    name: 'API Test Item',
    universityID: 'UNI-API-TEST-001',
    type: 'Hardware',
    category: 'Computer',
    status: 'Available',
    location: 'Lab A'
  };
  const createRes = await apiRequest('/items', 'POST', newItem);
  console.log(createRes.success
    ? `✅ Test 5: Created item ${createRes.item.itemId} successfully\n`
    : `❌ Test 5: Failed to create item: ${createRes.error}\n`);

  // 6. Verify the just-created item appears as duplicate now
  console.log('Test 6: Verify newly created item is now a duplicate...');
  const verifyRes = await apiRequest('/items/check-duplicates', 'POST', {
    universityIDs: ['UNI-API-TEST-001']
  });
  console.log(verifyRes.duplicates.length === 1
    ? '✅ Test 6: Newly created item correctly detected as duplicate\n'
    : '❌ Test 6: Should detect newly created item as duplicate\n');

  console.log('=== All Tests Complete ===');
  console.log(`\n📁 Test Excel file ready at: ${testFile}`);
  console.log('   You can use this file to test the Import Excel button in the UI.');
  console.log('   It contains 3 duplicate items and 2 new items.\n');
}

runTests().catch(err => console.error('Test error:', err));
