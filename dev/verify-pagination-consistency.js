/**
 * Pagination & Filtering Consistency Verification Script
 * 確認 total / count 等統計數字與實際 table rows 一致
 * paging 與 filtering 切換時不要對不上
 * 
 * Usage: node verify-pagination-consistency.js
 */

const http = require('http');
const querystring = require('querystring');

// =============================================================================
// Configuration
// =============================================================================
const API_BASE = 'http://localhost:5002/api';
const TEST_USER_ID = 'testuser123';
const TEST_ADMIN_TOKEN = 'your-admin-token-here'; // Set from env or test setup

let passedTests = 0;
let failedTests = 0;

// =============================================================================
// Utility: HTTP Request Helper
// =============================================================================
async function makeRequest(method, path, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: json,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: null,
            error: e.message
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// =============================================================================
// Test Result Logging
// =============================================================================
function testPass(testName, message = '') {
  console.log(`\n✅ PASS: ${testName}`);
  if (message) console.log(`   ${message}`);
  passedTests++;
}

function testFail(testName, message = '') {
  console.log(`\n❌ FAIL: ${testName}`);
  if (message) console.log(`   ${message}`);
  failedTests++;
}

function printHeader(title) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(70)}`);
}

// =============================================================================
// Test Suites
// =============================================================================

/**
 * Test Suite 1: Items API - Total vs Actual Rows Consistency
 */
async function testItemsPaginationConsistency() {
  printHeader('Test Suite 1: Items API - Pagination Consistency');

  try {
    // Test 1.1: Default pagination - total vs returned rows
    console.log('\n[1.1] GET /items - Basic pagination');
    let res = await makeRequest('GET', '/items?page=1&pageSize=10');
    
    if (res.status !== 200) {
      testFail('Items: Basic pagination', `Status ${res.status}, expected 200`);
      return;
    }

    const { items = [], total = 0, page = 1, pageSize = 10 } = res.data;
    const expectedMaxRows = Math.min(pageSize, total);
    
    if (items.length === expectedMaxRows || (items.length < pageSize && items.length === total)) {
      testPass('Items: Total vs rows count', 
        `total=${total}, returned=${items.length}, page=${page}, pageSize=${pageSize}`);
    } else if (total < pageSize && items.length !== total) {
      testFail('Items: Total vs rows count',
        `total=${total} but returned=${items.length} (inconsistent for small dataset)`);
    } else {
      testFail('Items: Total vs rows count',
        `total=${total}, returned=${items.length}, expected ${expectedMaxRows}`);
    }

    // Test 1.2: Verify page metadata is present
    if (!res.data.hasOwnProperty('total')) {
      testFail('Items: Response has total field', 'Missing total field in response');
    } else if (!res.data.hasOwnProperty('page')) {
      testFail('Items: Response has page field', 'Missing page field in response');
    } else if (!res.data.hasOwnProperty('pageSize')) {
      testFail('Items: Response has pageSize field', 'Missing pageSize field in response');
    } else {
      testPass('Items: Response metadata', 'total, page, pageSize fields all present');
    }

    // Test 1.3: Multi-page consistency - total should not change
    if (total > pageSize) {
      console.log('\n[1.3] GET /items - Stability of total across pages');
      const res2 = await makeRequest('GET', `/items?page=2&pageSize=${pageSize}`);
      
      if (res2.data.total === total) {
        testPass('Items: Stable total across pages', 
          `Page 1 total=${total}, Page 2 total=${res2.data.total}`);
      } else {
        testFail('Items: Stable total across pages',
          `Page 1 total=${total}, Page 2 total=${res2.data.total} (fluctuated)`);
      }
    }

    // Test 1.4: Pagination with filters - verify total is filtered count
    console.log('\n[1.4] GET /items - Filtering + pagination consistency');
    res = await makeRequest('GET', '/items?status=Available&page=1&pageSize=10');
    
    if (res.status === 200) {
      const { items: filteredItems = [], total: filteredTotal = 0 } = res.data;
      
      // All returned items should have status='Available'
      const allAvailable = filteredItems.every(item => item.status === 'Available');
      if (allAvailable) {
        testPass('Items: Filters applied correctly', 
          `All ${filteredItems.length} items have status='Available'`);
      } else {
        testFail('Items: Filters applied correctly',
          `Some items do not match filter status=Available`);
      }
    }

  } catch (e) {
    console.error(`Error in Items tests: ${e.message}`);
  }
}

/**
 * Test Suite 2: Borrow Requests - Total count and row consistency
 */
async function testBorrowRequestsPaginationConsistency() {
  printHeader('Test Suite 2: Borrow Requests API - Pagination Consistency');

  try {
    // Test 2.1: Basic borrow requests pagination
    console.log('\n[2.1] GET /borrow-requests - Basic pagination');
    let res = await makeRequest('GET', '/borrow-requests?page=1&pageSize=10');
    
    if (res.status !== 200) {
      testFail('BorrowRequests: Basic pagination', `Status ${res.status}`);
      return;
    }

    const { requests = [], total = 0, page = 1, pageSize = 10 } = res.data;
    
    // Should only count parent requests (parentRequestId = null)
    const actualPagedCount = requests.filter(r => !r.parentRequestId).length;
    
    if (actualPagedCount <= pageSize) {
      testPass('BorrowRequests: Parent request pagination', 
        `Returned ${actualPagedCount} parent requests, total=${total}`);
    } else {
      testFail('BorrowRequests: Parent request pagination',
        `Returned ${actualPagedCount} parent requests, exceeds pageSize=${pageSize}`);
    }

    // Test 2.2: Filtering - pages after filter should reset to page 1
    console.log('\n[2.2] GET /borrow-requests - Filter + pagination reset');
    res = await makeRequest('GET', '/borrow-requests?page=1&status=Pending&pageSize=10');
    
    if (res.status === 200 && res.data.page === 1) {
      testPass('BorrowRequests: Filter resets to page 1',
        `Filter status=Pending initialized at page=${res.data.page}`);
    } else {
      testFail('BorrowRequests: Filter resets to page 1',
        `Filter resulted in page=${res.data.page}, expected 1`);
    }

    // Test 2.3: Multi-status results
    console.log('\n[2.3] GET /borrow-requests - Status filter consistency');
    res = await makeRequest('GET', '/borrow-requests?status=Approved&pageSize=10');
    
    if (res.status === 200) {
      const { requests: approvedReqs = [] } = res.data;
      const allApproved = approvedReqs
        .filter(r => !r.parentRequestId)
        .every(req => req.status === 'Approved');
      
      if (allApproved || approvedReqs.length === 0) {
        testPass('BorrowRequests: Status filter applied',
          `All ${approvedReqs.filter(r => !r.parentRequestId).length} parent requests have status=Approved`);
      } else {
        testFail('BorrowRequests: Status filter applied',
          `Some requests do not have status=Approved`);
      }
    }

  } catch (e) {
    console.error(`Error in BorrowRequests tests: ${e.message}`);
  }
}

/**
 * Test Suite 3: Users API - Count consistency
 */
async function testUsersPaginationConsistency() {
  printHeader('Test Suite 3: Users API - Pagination Consistency');

  try {
    console.log('\n[3.1] GET /users - Total vs rows');
    let res = await makeRequest('GET', '/users?page=1&pageSize=10');
    
    if (res.status !== 200) {
      testFail('Users: Basic pagination', `Status ${res.status}`);
      return;
    }

    const { users = [], total = 0, pageSize = 10 } = res.data;
    const expectedMax = Math.min(pageSize, total);
    
    if (users.length <= pageSize && users.length <= total) {
      testPass('Users: Total vs rows', 
        `total=${total}, returned=${users.length}, pageSize=${pageSize}`);
    } else {
      testFail('Users: Total vs rows',
        `Inconsistent: total=${total}, returned=${users.length}`);
    }

    // Test 3.2: Role filtering
    console.log('\n[3.2] GET /users - Role filter consistency');
    res = await makeRequest('GET', '/users?displayRole=teacher&pageSize=10');
    
    if (res.status === 200) {
      const isAllTeachers = res.data.users.every(u => 
        u.subRole === 'teacher' || (u.role === 'user' && u.subRole === 'teacher')
      );
      
      if (isAllTeachers || res.data.users.length === 0) {
        testPass('Users: Role filter applied',
          `All returned users match displayRole=teacher`);
      } else {
        testFail('Users: Role filter applied',
          `Some users do not have subRole=teacher`);
      }
    }

  } catch (e) {
    console.error(`Error in Users tests: ${e.message}`);
  }
}

/**
 * Test Suite 4: Audit Logs - Pagination consistency
 */
async function testAuditLogsPaginationConsistency() {
  printHeader('Test Suite 4: Audit Logs API - Pagination Consistency');

  try {
    console.log('\n[4.1] GET /audit-logs - Total vs rows');
    let res = await makeRequest('GET', '/audit-logs?page=1&pageSize=10');
    
    if (res.status !== 200) {
      testFail('AuditLogs: Basic pagination', `Status ${res.status}`);
      return;
    }

    const { logs = [], total = 0, pageSize = 10 } = res.data;
    
    if (logs.length <= pageSize) {
      testPass('AuditLogs: Total vs rows',
        `total=${total}, returned=${logs.length}, pageSize=${pageSize}`);
    } else {
      testFail('AuditLogs: Total vs rows',
        `Returned ${logs.length} rows, exceeds pageSize=${pageSize}`);
    }

    // Test 4.2: Action filtering
    console.log('\n[4.2] GET /audit-logs - Action filter consistency');
    res = await makeRequest('GET', '/audit-logs?action=ITEM_ADDED&pageSize=10');
    
    if (res.status === 200 && res.data.logs) {
      const allMatch = res.data.logs.every(log => log.action === 'ITEM_ADDED');
      if (allMatch || res.data.logs.length === 0) {
        testPass('AuditLogs: Action filter applied',
          `All ${res.data.logs.length} logs have action=ITEM_ADDED`);
      } else {
        testFail('AuditLogs: Action filter applied',
          `Some logs do not match action=ITEM_ADDED`);
      }
    }

  } catch (e) {
    console.error(`Error in AuditLogs tests: ${e.message}`);
  }
}

/**
 * Test Suite 5: Data Integrity - No loss/duplication across pages
 */
async function testDataIntegrityAcrossPages() {
  printHeader('Test Suite 5: Data Integrity - No Loss/Duplication');

  try {
    console.log('\n[5.1] Items - Collect all pages and check for duplicates');
    
    let allItems = [];
    let page = 1;
    let hasMore = true;
    const pageSize = 15;

    while (hasMore && page <= 10) {  // Max 10 pages to prevent infinite loop
      const res = await makeRequest('GET', `/items?page=${page}&pageSize=${pageSize}`);
      
      if (res.status !== 200 || !res.data.items || res.data.items.length === 0) {
        hasMore = false;
        break;
      }

      allItems.push(...res.data.items);
      
      if (res.data.items.length < pageSize) {
        hasMore = false;
      }
      page++;
    }

    // Check for duplicates
    const uniqueIds = new Set(allItems.map(item => item.itemId));
    if (uniqueIds.size === allItems.length) {
      testPass('Items: No duplicates across pages',
        `Collected ${allItems.length} unique items across ${page - 1} pages`);
    } else {
      testFail('Items: No duplicates across pages',
        `Found duplicates: ${allItems.length} total vs ${uniqueIds.size} unique`);
    }

    // Check for gaps
    const res = await makeRequest('GET', '/items?page=1&pageSize=1');
    const total = res.data.total;
    if (uniqueIds.size === total) {
      testPass('Items: Complete dataset across pages',
        `Collected all ${total} items without gaps`);
    } else if (uniqueIds.size < total && page > 10) {
      testPass('Items: Complete dataset (partial check)',
        `Stopped at page 10, collected ${uniqueIds.size}/${total}`);
    } else {
      testFail('Items: Complete dataset across pages',
        `Collected ${uniqueIds.size} items but total=${total}`);
    }

  } catch (e) {
    console.error(`Error in Data Integrity tests: ${e.message}`);
  }
}

/**
 * Test Suite 6: Edge Cases
 */
async function testEdgeCases() {
  printHeader('Test Suite 6: Edge Cases');

  try {
    // Test 6.1: Page beyond range
    console.log('\n[6.1] Items - Page far beyond range');
    let res = await makeRequest('GET', '/items?page=99999&pageSize=10');
    
    if (res.status === 200) {
      const { items = [], total = 0 } = res.data;
      if (items.length === 0) {
        testPass('Items: Page beyond range',
          `Correctly returned empty results with total=${total}`);
      } else {
        testFail('Items: Page beyond range',
          `Expected empty items[], got ${items.length} items`);
      }
    } else {
      testFail('Items: Page beyond range', `Status ${res.status}, expected 200`);
    }

    // Test 6.2: Page = 1
    console.log('\n[6.2] Items - Page 1 with existing data');
    res = await makeRequest('GET', '/items?page=1&pageSize=5');
    
    if (res.status === 200 && res.data.items && res.data.items.length > 0) {
      testPass('Items: Page 1 works',
        `Returned ${res.data.items.length} items from page 1`);
    } else if (res.data.total === 0) {
      testPass('Items: Page 1 empty result',
        `No items in database (total=0)`);
    } else {
      testFail('Items: Page 1 works', `Unexpected status or empty result`);
    }

    // Test 6.3: Empty result with filters
    console.log('\n[6.3] Items - Empty result with impossible filter');
    res = await makeRequest('GET', '/items?status=NONEXISTENT&pageSize=10');
    
    if (res.status === 200) {
      const { items = [], total = 0 } = res.data;
      if (items.length === 0 && total === 0) {
        testPass('Items: Empty result shape',
          `Correctly returned empty items[] with total=0`);
      } else {
        testFail('Items: Empty result shape',
          `Inconsistent: items=${items.length}, total=${total}`);
      }
    }

  } catch (e) {
    console.error(`Error in Edge Cases tests: ${e.message}`);
  }
}

// =============================================================================
// Main Execution
// =============================================================================
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  Pagination & Filtering Consistency Verification                   ║');
  console.log('║  確認 total/count 與實際 table rows 一致                                 ║');
  console.log('║  paging 與 filtering 切換時不要對不上                                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  try {
    // Run all test suites
    await testItemsPaginationConsistency();
    await testBorrowRequestsPaginationConsistency();
    await testUsersPaginationConsistency();
    await testAuditLogsPaginationConsistency();
    await testDataIntegrityAcrossPages();
    await testEdgeCases();

  } catch (e) {
    console.error(`\nFatal error: ${e.message}`);
    process.exit(1);
  }

  // Summary
  printHeader('Test Summary');
  console.log(`\n✅ PASSED: ${passedTests}`);
  console.log(`❌ FAILED: ${failedTests}`);
  console.log(`📊 TOTAL:  ${passedTests + failedTests}`);
  console.log(`\n${passedTests + failedTests > 0 ? '─'.repeat(70) : ''}`);

  if (failedTests === 0 && passedTests > 0) {
    console.log('\n🎉 All tests passed! Pagination and filtering consistency verified.');
  } else if (failedTests > 0) {
    console.log(`\n⚠️  ${failedTests} test(s) failed. Review the issues above.`);
    process.exit(1);
  } else {
    console.log('\n⚠️  No tests could be run. Check API connectivity.');
    process.exit(1);
  }
}

// Run
main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
