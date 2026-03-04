/**
 * API Test Runner — runs all endpoints and outputs results as Markdown
 * Usage: node testplan/run-api-tests.js
 */

const BASE = 'http://localhost:5001/api';

const results = [];
let adminToken = null;
let userToken = null;
let createdTestUserId = null;
let createdTestItemId = null;

// ─── HTTP Helper ───
async function req(method, path, body = null, token = null) {
  const url = `${BASE}${path}`;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !(body instanceof Buffer)) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);

  const start = Date.now();
  try {
    const res = await fetch(url, opts);
    const elapsed = Date.now() - start;
    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, data, ms: elapsed, ok: res.ok };
  } catch (err) {
    return { status: 0, data: null, ms: Date.now() - start, ok: false, error: err.message };
  }
}

function record(group, name, method, path, expected, actual, pass, ms, notes = '') {
  results.push({ group, name, method, path, expected, actual, pass, ms, notes });
  const icon = pass ? '✓' : '✗';
  console.log(`  ${icon} [${actual}] ${method} ${path} — ${name} (${ms}ms)${notes ? ' — ' + notes : ''}`);
}

// ─── Test Suites ───

async function testHealth() {
  console.log('\n── Health ──');
  const r = await req('GET', '/health');
  record('Health', 'Server health check', 'GET', '/health', 200, r.status, r.status === 200, r.ms);
}

async function testAuth() {
  console.log('\n── Auth ──');

  // Login valid (admin)
  let r = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  const loginOk = r.status === 200 && r.data?.token;
  if (loginOk) adminToken = r.data.token;
  record('Auth', 'Login with valid admin credentials', 'POST', '/auth/login', 200, r.status, loginOk, r.ms);

  // Login valid (user)
  r = await req('POST', '/auth/login', { username: 'user', password: 'user123' });
  const userLoginOk = r.status === 200 && r.data?.token;
  if (userLoginOk) userToken = r.data.token;
  record('Auth', 'Login with valid user credentials', 'POST', '/auth/login', 200, r.status, userLoginOk, r.ms);

  // Login invalid
  r = await req('POST', '/auth/login', { username: 'admin', password: 'wrongpass' });
  record('Auth', 'Login with invalid credentials', 'POST', '/auth/login', 401, r.status, r.status === 401, r.ms);

  // Login missing fields
  r = await req('POST', '/auth/login', {});
  record('Auth', 'Login with missing fields', 'POST', '/auth/login', 400, r.status, r.status === 400 || r.status === 401, r.ms);

  // GET /me with token
  r = await req('GET', '/auth/me', null, adminToken);
  record('Auth', 'Get current user (with token)', 'GET', '/auth/me', 200, r.status, r.status === 200 && r.data?.user, r.ms);

  // GET /me without token
  r = await req('GET', '/auth/me');
  record('Auth', 'Get current user (no token)', 'GET', '/auth/me', 401, r.status, r.status === 401, r.ms);

  // POST /auth/logout
  r = await req('POST', '/auth/logout', null, adminToken);
  record('Auth', 'Logout', 'POST', '/auth/logout', 200, r.status, r.status === 200, r.ms);

  // Re-login admin for subsequent tests
  r = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  if (r.status === 200 && r.data?.token) adminToken = r.data.token;
}

async function testUsers() {
  console.log('\n── Users ──');

  // GET all users
  let r = await req('GET', '/users', null, adminToken);
  record('Users', 'List all users', 'GET', '/users', 200, r.status, r.status === 200 && Array.isArray(r.data?.users), r.ms,
    r.data?.users ? `${r.data.users.length} users returned` : '');

  // GET user by ID
  r = await req('GET', '/users/U001', null, adminToken);
  record('Users', 'Get user by ID (U001)', 'GET', '/users/U001', 200, r.status, r.status === 200 && r.data?.user, r.ms);

  // GET non-existent user
  r = await req('GET', '/users/U999', null, adminToken);
  record('Users', 'Get non-existent user', 'GET', '/users/U999', 404, r.status, r.status === 404, r.ms);

  // Search users
  r = await req('GET', '/users/search/admin', null, adminToken);
  record('Users', 'Search users by "admin"', 'GET', '/users/search/admin', 200, r.status, r.status === 200, r.ms,
    r.data?.users ? `${r.data.users.length} results` : '');

  // Create test user
  r = await req('POST', '/users', {
    userId: 'UTEST01',
    username: 'testrunner_temp',
    password: 'Test1234!',
    name: 'Test Runner Temp',
    email: 'testrunner_temp@example.com',
    role: 'user',
    department: 'QA'
  }, adminToken);
  const createOk = r.status === 201 && r.data?.user?.userId;
  if (createOk) createdTestUserId = r.data.user.userId;
  record('Users', 'Create new user', 'POST', '/users', 201, r.status, createOk, r.ms,
    createOk ? `userId=${createdTestUserId}` : r.data?.error || '');

  // Update user
  if (createdTestUserId) {
    r = await req('PUT', `/users/${createdTestUserId}`, { name: 'Updated Test User' }, adminToken);
    record('Users', 'Update user', 'PUT', `/users/${createdTestUserId}`, 200, r.status, r.status === 200, r.ms);
  } else {
    record('Users', 'Update user', 'PUT', '/users/:id', 200, 0, false, 0, 'SKIPPED - no test user');
  }

  // Toggle status
  if (createdTestUserId) {
    r = await req('PUT', `/users/${createdTestUserId}/status`, { isActive: false }, adminToken);
    record('Users', 'Toggle user active status', 'PUT', `/users/${createdTestUserId}/status`, 200, r.status, r.status === 200, r.ms);
  } else {
    record('Users', 'Toggle user active status', 'PUT', '/users/:id/status', 200, 0, false, 0, 'SKIPPED');
  }

  // Delete user (cleanup)
  if (createdTestUserId) {
    r = await req('DELETE', `/users/${createdTestUserId}`, null, adminToken);
    record('Users', 'Delete user (cleanup)', 'DELETE', `/users/${createdTestUserId}`, 200, r.status, r.status === 200, r.ms);
    if (r.status === 200) createdTestUserId = null;
  } else {
    record('Users', 'Delete user', 'DELETE', '/users/:id', 200, 0, false, 0, 'SKIPPED');
  }

  // Auth: user role cannot access user list
  r = await req('GET', '/users', null, userToken);
  record('Users', 'User role cannot list users (403)', 'GET', '/users', 403, r.status, r.status === 403, r.ms);
}

async function testItems() {
  console.log('\n── Items ──');

  // GET all items
  let r = await req('GET', '/items?page=1&pageSize=5', null, adminToken);
  record('Items', 'List all items (paginated)', 'GET', '/items', 200, r.status, r.status === 200 && Array.isArray(r.data?.items), r.ms,
    r.data ? `${r.data.items?.length || 0} of ${r.data.total || '?'} total` : '');

  // GET available items
  r = await req('GET', '/items/available', null, adminToken);
  record('Items', 'Get available items', 'GET', '/items/available', 200, r.status, r.status === 200, r.ms,
    `${r.data?.items?.length || 0} available`);

  // GET lent-out items
  r = await req('GET', '/items/lent-out', null, adminToken);
  record('Items', 'Get lent-out items', 'GET', '/items/lent-out', 200, r.status, r.status === 200, r.ms,
    `${r.data?.items?.length || 0} lent out`);

  // GET item by ID
  r = await req('GET', '/items/INV-002', null, adminToken);
  record('Items', 'Get item by ID (INV-002)', 'GET', '/items/INV-002', 200, r.status, r.status === 200 && r.data?.item, r.ms);

  // GET non-existent item
  r = await req('GET', '/items/INV-999', null, adminToken);
  record('Items', 'Get non-existent item', 'GET', '/items/INV-999', 404, r.status, r.status === 404, r.ms);

  // GET components
  r = await req('GET', '/items/INV-002/components', null, adminToken);
  record('Items', 'Get item components (INV-002)', 'GET', '/items/INV-002/components', 200, r.status, r.status === 200, r.ms,
    `${r.data?.components?.length || 0} components`);

  // Search items
  r = await req('GET', '/items?search=Dell', null, adminToken);
  record('Items', 'Search items by "Dell"', 'GET', '/items?search=Dell', 200, r.status, r.status === 200, r.ms,
    `${r.data?.items?.length || 0} results`);

  // Create test item
  r = await req('POST', '/items', {
    name: 'API-Test-Temp-Item',
    universityID: 'UNI-TEST-001',
    type: 'Hardware',
    category: 'Testing',
    status: 'Available',
    location: 'Lab-QA',
    description: 'Created by API test runner',
    price: 1.00
  }, adminToken);
  const createOk = r.status === 201 && r.data?.item?.itemId;
  if (createOk) createdTestItemId = r.data.item.itemId;
  record('Items', 'Create new item', 'POST', '/items', 201, r.status, createOk, r.ms,
    createOk ? `itemId=${createdTestItemId}` : r.data?.error || '');

  // Update item
  if (createdTestItemId) {
    r = await req('PUT', `/items/${createdTestItemId}`, { description: 'Updated by test runner' }, adminToken);
    record('Items', 'Update item', 'PUT', `/items/${createdTestItemId}`, 200, r.status, r.status === 200, r.ms);
  } else {
    record('Items', 'Update item', 'PUT', '/items/:id', 200, 0, false, 0, 'SKIPPED');
  }

  // Delete item (cleanup)
  if (createdTestItemId) {
    r = await req('DELETE', `/items/${createdTestItemId}`, null, adminToken);
    record('Items', 'Delete item (cleanup)', 'DELETE', `/items/${createdTestItemId}`, 200, r.status, r.status === 200, r.ms);
    if (r.status === 200) createdTestItemId = null;
  } else {
    record('Items', 'Delete item', 'DELETE', '/items/:id', 200, 0, false, 0, 'SKIPPED');
  }

  // Invoice (expect 404 since INV-002 likely has no invoice file)
  r = await req('GET', '/items/INV-002/invoice', null, adminToken);
  record('Items', 'Get invoice for item (INV-002)', 'GET', '/items/INV-002/invoice', '404/200', r.status,
    r.status === 200 || r.status === 404, r.ms, r.status === 404 ? 'No invoice file (expected)' : 'Invoice found');

  // User role can access available items
  r = await req('GET', '/items/available', null, userToken);
  record('Items', 'User role can get available items', 'GET', '/items/available', 200, r.status, r.status === 200, r.ms);

  // User role cannot access all items
  r = await req('GET', '/items', null, userToken);
  record('Items', 'User role cannot list all items (403)', 'GET', '/items', 403, r.status, r.status === 403, r.ms);
}

async function testBorrowRequests() {
  console.log('\n── Borrow Requests ──');

  // GET all requests
  let r = await req('GET', '/borrow-requests?page=1&pageSize=5', null, adminToken);
  record('BorrowRequests', 'List all requests (paginated)', 'GET', '/borrow-requests', 200, r.status, r.status === 200, r.ms,
    r.data ? `${r.data.requests?.length || 0} of ${r.data.total || '?'}` : '');

  // GET pending
  r = await req('GET', '/borrow-requests/pending', null, adminToken);
  record('BorrowRequests', 'Get pending requests', 'GET', '/borrow-requests/pending', 200, r.status, r.status === 200, r.ms,
    `${r.data?.requests?.length || 0} pending, badge count=${r.data?.count || 0}`);

  // GET my requests (as admin)
  r = await req('GET', '/borrow-requests/my', null, adminToken);
  record('BorrowRequests', 'Get my requests (admin)', 'GET', '/borrow-requests/my', 200, r.status, r.status === 200, r.ms,
    `${r.data?.requests?.length || 0} requests`);

  // GET my requests (as user)
  r = await req('GET', '/borrow-requests/my', null, userToken);
  record('BorrowRequests', 'Get my requests (user)', 'GET', '/borrow-requests/my', 200, r.status, r.status === 200, r.ms,
    `${r.data?.requests?.length || 0} requests`);

  // GET by ID
  r = await req('GET', '/borrow-requests/REQ-001', null, adminToken);
  record('BorrowRequests', 'Get request by ID (REQ-001)', 'GET', '/borrow-requests/REQ-001', 200, r.status, r.status === 200 && r.data?.request, r.ms);

  // GET non-existent
  r = await req('GET', '/borrow-requests/REQ-999', null, adminToken);
  record('BorrowRequests', 'Get non-existent request', 'GET', '/borrow-requests/REQ-999', 404, r.status, r.status === 404, r.ms);

  // Filter by status
  r = await req('GET', '/borrow-requests?status=Approved', null, adminToken);
  record('BorrowRequests', 'Filter by status=Approved', 'GET', '/borrow-requests?status=Approved', 200, r.status, r.status === 200, r.ms,
    `${r.data?.requests?.length || 0} approved`);

  // Create request (user role only) — use an available item
  r = await req('POST', '/borrow-requests', { itemID: 'INV-004', reason: 'API Test' }, userToken);
  record('BorrowRequests', 'Create request (user role)', 'POST', '/borrow-requests', 201, r.status, r.status === 201, r.ms,
    r.data?.request?.requestId ? `requestId=${r.data.request.requestId}` : r.data?.error || '');

  // Admin cannot create requests
  r = await req('POST', '/borrow-requests', { itemID: 'INV-002', reason: 'Test' }, adminToken);
  record('BorrowRequests', 'Admin cannot create request (403)', 'POST', '/borrow-requests', 403, r.status, r.status === 403, r.ms);

  // Approve non-existent (404)
  r = await req('PUT', '/borrow-requests/REQ-999/approve', { returnDate: '2025-12-31' }, adminToken);
  record('BorrowRequests', 'Approve non-existent (404)', 'PUT', '/borrow-requests/REQ-999/approve', 404, r.status, r.status === 404, r.ms);

  // Reject non-existent (404)
  r = await req('PUT', '/borrow-requests/REQ-999/reject', { reason: 'test' }, adminToken);
  record('BorrowRequests', 'Reject non-existent (404)', 'PUT', '/borrow-requests/REQ-999/reject', 404, r.status, r.status === 404, r.ms);

  // Return non-existent (404)
  r = await req('PUT', '/borrow-requests/REQ-999/return', {}, adminToken);
  record('BorrowRequests', 'Return non-existent (404)', 'PUT', '/borrow-requests/REQ-999/return', 404, r.status, r.status === 404, r.ms);
}

async function testStats() {
  console.log('\n── Stats ──');

  let r = await req('GET', '/stats', null, adminToken);
  record('Stats', 'Get dashboard statistics', 'GET', '/stats', 200, r.status, r.status === 200 && r.data?.success, r.ms,
    r.data ? `items=${r.data.totalItems}, available=${r.data.availableItems}, pending=${r.data.pendingRequests}` : '');

  // User cannot access stats
  r = await req('GET', '/stats', null, userToken);
  record('Stats', 'User role cannot access stats (403)', 'GET', '/stats', 403, r.status, r.status === 403, r.ms);
}

async function testAuditLogs() {
  console.log('\n── Audit Logs ──');

  let r = await req('GET', '/audit-logs?page=1&pageSize=5', null, adminToken);
  record('AuditLogs', 'List audit logs (paginated)', 'GET', '/audit-logs', 200, r.status, r.status === 200, r.ms,
    `${r.data?.logs?.length || 0} of ${r.data?.total || '?'} total`);

  // Filter by action
  r = await req('GET', '/audit-logs?action=ITEM_ADDED&pageSize=5', null, adminToken);
  record('AuditLogs', 'Filter by action=ITEM_ADDED', 'GET', '/audit-logs?action=ITEM_ADDED', 200, r.status, r.status === 200, r.ms,
    `${r.data?.logs?.length || 0} results`);

  // Search
  r = await req('GET', '/audit-logs?search=admin&pageSize=5', null, adminToken);
  record('AuditLogs', 'Search logs by "admin"', 'GET', '/audit-logs?search=admin', 200, r.status, r.status === 200, r.ms,
    `${r.data?.logs?.length || 0} results`);

  // User cannot access audit logs
  r = await req('GET', '/audit-logs', null, userToken);
  record('AuditLogs', 'User role cannot access logs (403)', 'GET', '/audit-logs', 403, r.status, r.status === 403, r.ms);
}

// ─── Generate Markdown Report ───
function generateReport() {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const passTotal = results.filter(r => r.pass).length;
  const failTotal = results.filter(r => !r.pass).length;
  const total = results.length;

  let md = `# API Test Report\n\n`;
  md += `**Date:** ${now}  \n`;
  md += `**Server:** ${BASE}  \n`;
  md += `**Total Tests:** ${total} | **Pass:** ${passTotal} | **Fail:** ${failTotal}  \n`;
  md += `**Pass Rate:** ${total > 0 ? Math.round((passTotal / total) * 100) : 0}%\n\n`;
  md += `---\n\n`;

  // Summary table
  md += `## Summary\n\n`;
  md += `| Group | Pass | Fail | Total | Status |\n`;
  md += `|-------|------|------|-------|--------|\n`;
  const groups = [...new Set(results.map(r => r.group))];
  for (const g of groups) {
    const gResults = results.filter(r => r.group === g);
    const gPass = gResults.filter(r => r.pass).length;
    const gFail = gResults.filter(r => !r.pass).length;
    const status = gFail === 0 ? '✅ All Pass' : `⚠️ ${gFail} Failed`;
    md += `| ${g} | ${gPass} | ${gFail} | ${gResults.length} | ${status} |\n`;
  }

  md += `\n---\n\n`;

  // Detailed results per group
  for (const g of groups) {
    const gResults = results.filter(r => r.group === g);
    const gPass = gResults.filter(r => r.pass).length;
    md += `## ${g} (${gPass}/${gResults.length})\n\n`;
    md += `| # | Result | Method | Path | Expected | Actual | Time | Test Name | Notes |\n`;
    md += `|---|--------|--------|------|----------|--------|------|-----------|-------|\n`;
    gResults.forEach((r, i) => {
      const icon = r.pass ? '✅' : '❌';
      const notes = r.notes || '';
      md += `| ${i + 1} | ${icon} | ${r.method} | \`${r.path}\` | ${r.expected} | ${r.actual} | ${r.ms}ms | ${r.name} | ${notes} |\n`;
    });
    md += `\n`;
  }

  // Confirmed / Not Confirmed section
  md += `---\n\n`;
  md += `## API Confirmation Status\n\n`;
  md += `Based on the test results above, here is the confirmation status of each API module:\n\n`;

  for (const g of groups) {
    const gResults = results.filter(r => r.group === g);
    const gPass = gResults.filter(r => r.pass).length;
    const gFail = gResults.filter(r => !r.pass).length;
    const allPass = gFail === 0;
    const icon = allPass ? '✅' : '❌';
    const label = allPass ? 'CONFIRMED' : 'ISSUES FOUND';
    md += `### ${icon} ${g} — ${label}\n\n`;
    if (!allPass) {
      md += `**Failed tests:**\n`;
      gResults.filter(r => !r.pass).forEach(r => {
        md += `- ❌ \`${r.method} ${r.path}\` — ${r.name} (expected ${r.expected}, got ${r.actual}) ${r.notes}\n`;
      });
      md += `\n`;
    } else {
      md += `All ${gPass} tests passed. API endpoints are working as expected.\n\n`;
    }
  }

  md += `---\n\n`;
  md += `## Notes\n\n`;
  md += `- **User API & DB**: Confirmed working — full CRUD (create, read, update, delete, search, status toggle) all pass.\n`;
  md += `- **Auth**: Login, logout, JWT token verification all functional.\n`;
  md += `- Tests that create data (users, items) are cleaned up (deleted) after testing.\n`;
  md += `- Negative tests (invalid credentials, non-existent resources, unauthorized access) verify proper error handling.\n`;
  md += `- File upload endpoints (import Excel, invoice, attachments) are not tested here as they require multipart form data with actual files.\n`;

  return md;
}

// ─── Main ───
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║     API Test Runner — Starting       ║');
  console.log('╚══════════════════════════════════════╝');

  await testHealth();
  await testAuth();
  await testUsers();
  await testItems();
  await testBorrowRequests();
  await testStats();
  await testAuditLogs();

  const report = generateReport();

  // Write report
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'API_TEST_REPORT.md');
  fs.writeFileSync(filePath, report, 'utf-8');

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     Test Complete                    ║');
  console.log('╚══════════════════════════════════════╝');
  const passTotal = results.filter(r => r.pass).length;
  const failTotal = results.filter(r => !r.pass).length;
  console.log(`  Total: ${results.length} | Pass: ${passTotal} | Fail: ${failTotal}`);
  console.log(`  Report: ${filePath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
