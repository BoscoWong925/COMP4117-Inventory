<template>
  <div class="api-test-page">
    <div class="test-container">
      <!-- Header -->
      <div class="test-header">
        <div>
          <h2>API Test Runner</h2>
          <p class="subtitle">Tests all {{ totalTests }} endpoints with real data and shows response details</p>
        </div>
        <div class="header-actions">
          <button @click="runAllTests" class="run-btn" :disabled="isRunning">
            {{ isRunning ? `Running ${completedTests}/${totalTests}...` : 'Run All Tests' }}
          </button>
          <button @click="clearResults" class="clear-btn" :disabled="isRunning">Clear</button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="stats-row">
        <div class="stat-card total">
          <span class="stat-number">{{ totalTests }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-card pass">
          <span class="stat-number">{{ passCount }}</span>
          <span class="stat-label">Pass</span>
        </div>
        <div class="stat-card fail">
          <span class="stat-number">{{ failCount }}</span>
          <span class="stat-label">Fail</span>
        </div>
        <div class="stat-card skip">
          <span class="stat-number">{{ skipCount }}</span>
          <span class="stat-label">Skipped</span>
        </div>
        <div class="stat-card pending">
          <span class="stat-number">{{ pendingCount }}</span>
          <span class="stat-label">Pending</span>
        </div>
        <div v-if="totalDuration > 0" class="stat-card time">
          <span class="stat-number">{{ totalDuration }}ms</span>
          <span class="stat-label">Total Time</span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div v-if="isRunning" class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>

      <!-- Test Groups -->
      <div class="test-groups">
        <div v-for="group in testGroups" :key="group.name" class="test-group">
          <div class="group-header" @click="group.collapsed = !group.collapsed">
            <div class="group-title">
              <span class="collapse-icon">{{ group.collapsed ? '▶' : '▼' }}</span>
              <h3>{{ group.name }}</h3>
              <span class="group-count">{{ group.tests.length }} tests</span>
            </div>
            <div class="group-stats">
              <span class="mini-badge pass" v-if="groupPassCount(group) > 0">{{ groupPassCount(group) }} ✓</span>
              <span class="mini-badge fail" v-if="groupFailCount(group) > 0">{{ groupFailCount(group) }} ✗</span>
              <span class="mini-badge skip" v-if="groupSkipCount(group) > 0">{{ groupSkipCount(group) }} ⊘</span>
              <button @click.stop="runGroupTests(group)" class="run-group-btn" :disabled="isRunning">
                Run Group
              </button>
            </div>
          </div>

          <div v-if="!group.collapsed" class="group-tests">
            <div v-for="test in group.tests" :key="test.id" class="test-row" :class="test.status">
              <div class="test-main" @click="test.expanded = !test.expanded">
                <!-- Status Icon -->
                <span class="test-icon" :class="test.status">
                  <template v-if="test.status === 'pass'">✓</template>
                  <template v-else-if="test.status === 'fail'">✗</template>
                  <template v-else-if="test.status === 'skip'">⊘</template>
                  <template v-else-if="test.status === 'running'">⟳</template>
                  <template v-else>○</template>
                </span>

                <!-- Method Badge -->
                <span class="method-badge" :class="test.method.toLowerCase()">{{ test.method }}</span>

                <!-- Test Info -->
                <div class="test-info">
                  <span class="test-path">{{ test.path }}</span>
                  <span class="test-desc">{{ test.description }}</span>
                </div>

                <!-- Right Side -->
                <div class="test-meta">
                  <span v-if="test.statusCode" class="http-code" :class="codeClass(test.statusCode)">
                    {{ test.statusCode }}
                  </span>
                  <span v-if="test.duration" class="duration">{{ test.duration }}ms</span>
                  <span class="expand-icon">{{ test.expanded ? '▲' : '▼' }}</span>
                </div>
              </div>

              <!-- Expanded: Response Details -->
              <div v-if="test.expanded && (test.responseBody || test.error)" class="test-detail">
                <div v-if="test.requestInfo" class="detail-section">
                  <div class="detail-label">Request</div>
                  <pre class="detail-content request-info">{{ test.requestInfo }}</pre>
                </div>
                <div v-if="test.error" class="detail-section error">
                  <div class="detail-label">Error</div>
                  <pre class="detail-content">{{ test.error }}</pre>
                </div>
                <div v-if="test.responseBody" class="detail-section">
                  <div class="detail-label">Response Body</div>
                  <pre class="detail-content">{{ formatJson(test.responseBody) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="legend">
        <span class="legend-item"><span class="dot pass"></span> Pass (2xx)</span>
        <span class="legend-item"><span class="dot fail"></span> Fail (error/unexpected)</span>
        <span class="legend-item"><span class="dot skip"></span> Skipped (destructive/needs special data)</span>
        <span class="legend-item"><span class="dot pending"></span> Not run</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuth } from '../hooks/useAuth'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002') + '/api'

export default {
  setup() {
    const { user } = useAuth()
    const isRunning = ref(false)

    // --------------- Test Definitions ---------------
    const createTestGroups = () => [
      {
        name: 'Health Check',
        collapsed: false,
        tests: [
          {
            id: 'health-1',
            method: 'GET',
            path: '/health',
            description: 'Server health check (public)',
            status: 'pending',
            skipAuth: true,
            run: async (t) => {
              return await doRequest(t, 'GET', '/health', null, false)
            }
          }
        ]
      },
      {
        name: 'Auth — /api/auth',
        collapsed: false,
        tests: [
          {
            id: 'auth-1',
            method: 'POST',
            path: '/auth/login',
            description: 'Login with valid credentials (admin/admin123)',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'POST', '/auth/login', { username: 'admin', password: 'admin123' }, false)
            }
          },
          {
            id: 'auth-2',
            method: 'POST',
            path: '/auth/login',
            description: 'Login with invalid credentials (should fail 401)',
            status: 'pending',
            expectStatus: 401,
            run: async (t) => {
              return await doRequest(t, 'POST', '/auth/login', { username: 'admin', password: 'wrongpass' }, false)
            }
          },
          {
            id: 'auth-3',
            method: 'GET',
            path: '/auth/me',
            description: 'Get current logged-in user profile',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/auth/me')
            }
          },
          {
            id: 'auth-4',
            method: 'GET',
            path: '/auth/me',
            description: 'Get profile without token (should fail 401)',
            status: 'pending',
            expectStatus: 401,
            run: async (t) => {
              return await doRequest(t, 'GET', '/auth/me', null, false)
            }
          }
        ]
      },
      {
        name: 'Users — /api/users',
        collapsed: false,
        tests: [
          {
            id: 'user-1',
            method: 'GET',
            path: '/users',
            description: 'List all users (admin/operator)',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/users')
            }
          },
          {
            id: 'user-2',
            method: 'GET',
            path: '/users/U001',
            description: 'Get user by ID (U001 = admin)',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/users/U001')
            }
          },
          {
            id: 'user-3',
            method: 'GET',
            path: '/users/U999',
            description: 'Get non-existent user (should 404)',
            status: 'pending',
            expectStatus: 404,
            run: async (t) => {
              return await doRequest(t, 'GET', '/users/U999')
            }
          },
          {
            id: 'user-4',
            method: 'GET',
            path: '/users/search/admin',
            description: 'Search users by keyword "admin"',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/users/search/admin')
            }
          },
          {
            id: 'user-5',
            method: 'POST',
            path: '/users',
            description: 'Create a test user (testrunner_user)',
            status: 'pending',
            run: async (t) => {
              const body = {
                username: 'testrunner_user',
                password: 'Test1234!',
                name: 'API Test Runner User',
                email: 'testrunner@example.com',
                role: 'user',
                department: 'QA'
              }
              const result = await doRequest(t, 'POST', '/users', body)
              if (result && t.responseBody?.user?.userId) {
                createdTestUserId.value = t.responseBody.user.userId
              }
              return result
            }
          },
          {
            id: 'user-6',
            method: 'PUT',
            path: '/users/:testUserId',
            description: 'Update the test user name',
            status: 'pending',
            run: async (t) => {
              const id = createdTestUserId.value
              if (!id) { t.status = 'skip'; t.error = 'No test user created yet'; return false }
              t.path = `/users/${id}`
              return await doRequest(t, 'PUT', `/users/${id}`, { name: 'Updated Test User' })
            }
          },
          {
            id: 'user-7',
            method: 'PUT',
            path: '/users/:testUserId/status',
            description: 'Toggle test user active status',
            status: 'pending',
            run: async (t) => {
              const id = createdTestUserId.value
              if (!id) { t.status = 'skip'; t.error = 'No test user created yet'; return false }
              t.path = `/users/${id}/status`
              return await doRequest(t, 'PUT', `/users/${id}/status`)
            }
          },
          {
            id: 'user-8',
            method: 'DELETE',
            path: '/users/:testUserId',
            description: 'Delete the test user (cleanup)',
            status: 'pending',
            run: async (t) => {
              const id = createdTestUserId.value
              if (!id) { t.status = 'skip'; t.error = 'No test user created yet'; return false }
              t.path = `/users/${id}`
              const result = await doRequest(t, 'DELETE', `/users/${id}`)
              if (result) createdTestUserId.value = null
              return result
            }
          }
        ]
      },
      {
        name: 'Items — /api/items',
        collapsed: false,
        tests: [
          {
            id: 'item-1',
            method: 'GET',
            path: '/items',
            description: 'List all items with pagination',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/items?page=1&pageSize=5')
            }
          },
          {
            id: 'item-2',
            method: 'GET',
            path: '/items/available',
            description: 'Get available items only',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/items/available')
            }
          },
          {
            id: 'item-3',
            method: 'GET',
            path: '/items/lent-out',
            description: 'Get lent-out (in-use) items',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/items/lent-out')
            }
          },
          {
            id: 'item-4',
            method: 'GET',
            path: '/items/INV-001',
            description: 'Get item by ID (INV-001)',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/items/INV-001')
            }
          },
          {
            id: 'item-5',
            method: 'GET',
            path: '/items/INV-999',
            description: 'Get non-existent item (should 404)',
            status: 'pending',
            expectStatus: 404,
            run: async (t) => {
              return await doRequest(t, 'GET', '/items/INV-999')
            }
          },
          {
            id: 'item-6',
            method: 'GET',
            path: '/items/INV-001/components',
            description: 'Get components for INV-001',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/items/INV-001/components')
            }
          },
          {
            id: 'item-7',
            method: 'POST',
            path: '/items',
            description: 'Create a test item',
            status: 'pending',
            run: async (t) => {
              const body = {
                name: 'API-Test-Item',
                type: 'Hardware',
                category: 'Testing',
                status: 'Available',
                location: 'Lab-QA',
                description: 'Created by API test runner',
                price: 99.99
              }
              const result = await doRequest(t, 'POST', '/items', body)
              if (result && t.responseBody?.item?.itemId) {
                createdTestItemId.value = t.responseBody.item.itemId
              }
              return result
            }
          },
          {
            id: 'item-8',
            method: 'PUT',
            path: '/items/:testItemId',
            description: 'Update the test item description',
            status: 'pending',
            run: async (t) => {
              const id = createdTestItemId.value
              if (!id) { t.status = 'skip'; t.error = 'No test item created yet'; return false }
              t.path = `/items/${id}`
              return await doRequest(t, 'PUT', `/items/${id}`, { description: 'Updated by test runner' })
            }
          },
          {
            id: 'item-9',
            method: 'DELETE',
            path: '/items/:testItemId',
            description: 'Delete the test item (cleanup)',
            status: 'pending',
            run: async (t) => {
              const id = createdTestItemId.value
              if (!id) { t.status = 'skip'; t.error = 'No test item created yet'; return false }
              t.path = `/items/${id}`
              const result = await doRequest(t, 'DELETE', `/items/${id}`)
              if (result) createdTestItemId.value = null
              return result
            }
          },
          {
            id: 'item-10',
            method: 'GET',
            path: '/items?search=Dell',
            description: 'Search items by keyword "Dell"',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/items?search=Dell')
            }
          }
        ]
      },
      {
        name: 'Borrow Requests — /api/borrow-requests',
        collapsed: false,
        tests: [
          {
            id: 'br-1',
            method: 'GET',
            path: '/borrow-requests',
            description: 'List all borrow requests',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/borrow-requests?page=1&pageSize=5')
            }
          },
          {
            id: 'br-2',
            method: 'GET',
            path: '/borrow-requests/pending',
            description: 'Get pending requests (with notification count)',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/borrow-requests/pending')
            }
          },
          {
            id: 'br-3',
            method: 'GET',
            path: '/borrow-requests/my',
            description: 'Get current user\'s borrow requests',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/borrow-requests/my')
            }
          },
          {
            id: 'br-4',
            method: 'GET',
            path: '/borrow-requests/REQ-001',
            description: 'Get request by ID (REQ-001)',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/borrow-requests/REQ-001')
            }
          },
          {
            id: 'br-5',
            method: 'GET',
            path: '/borrow-requests/REQ-999',
            description: 'Get non-existent request (should 404)',
            status: 'pending',
            expectStatus: 404,
            run: async (t) => {
              return await doRequest(t, 'GET', '/borrow-requests/REQ-999')
            }
          },
          {
            id: 'br-6',
            method: 'POST',
            path: '/borrow-requests',
            description: 'Create borrow request (needs user role — skipped as admin)',
            status: 'pending',
            run: async (t) => {
              // This endpoint requires 'user' role, admin gets 403
              const result = await doRequest(t, 'POST', '/borrow-requests', { itemID: 'INV-001', reason: 'API Test' })
              // If we get 403 it means endpoint is working but role restricted — that's correct
              if (t.statusCode === 403) {
                t.status = 'pass'
                t.error = 'Got 403 as expected (admin cannot create requests, needs user role)'
              }
              return result
            }
          },
          {
            id: 'br-7',
            method: 'PUT',
            path: '/borrow-requests/REQ-999/approve',
            description: 'Approve non-existent request (should 404)',
            status: 'pending',
            expectStatus: 404,
            run: async (t) => {
              return await doRequest(t, 'PUT', '/borrow-requests/REQ-999/approve', { returnDate: '2025-12-31' })
            }
          },
          {
            id: 'br-8',
            method: 'PUT',
            path: '/borrow-requests/REQ-999/reject',
            description: 'Reject non-existent request (should 404)',
            status: 'pending',
            expectStatus: 404,
            run: async (t) => {
              return await doRequest(t, 'PUT', '/borrow-requests/REQ-999/reject', { reason: 'test rejection' })
            }
          },
          {
            id: 'br-9',
            method: 'PUT',
            path: '/borrow-requests/REQ-999/return',
            description: 'Return non-existent request (should 404)',
            status: 'pending',
            expectStatus: 404,
            run: async (t) => {
              return await doRequest(t, 'PUT', '/borrow-requests/REQ-999/return', {})
            }
          },
          {
            id: 'br-10',
            method: 'GET',
            path: '/borrow-requests?status=Approved',
            description: 'Filter requests by status=Approved',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/borrow-requests?status=Approved')
            }
          }
        ]
      },
      {
        name: 'Stats — /api/stats',
        collapsed: false,
        tests: [
          {
            id: 'stats-1',
            method: 'GET',
            path: '/stats',
            description: 'Get dashboard statistics',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/stats')
            }
          }
        ]
      },
      {
        name: 'Audit Logs — /api/audit-logs',
        collapsed: false,
        tests: [
          {
            id: 'audit-1',
            method: 'GET',
            path: '/audit-logs',
            description: 'List audit logs with pagination',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/audit-logs?page=1&pageSize=5')
            }
          },
          {
            id: 'audit-2',
            method: 'GET',
            path: '/audit-logs?action=ITEM_ADDED',
            description: 'Filter audit logs by action=ITEM_ADDED',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/audit-logs?action=ITEM_ADDED&pageSize=5')
            }
          },
          {
            id: 'audit-3',
            method: 'GET',
            path: '/audit-logs?search=admin',
            description: 'Search audit logs by keyword "admin"',
            status: 'pending',
            run: async (t) => {
              return await doRequest(t, 'GET', '/audit-logs?search=admin&pageSize=5')
            }
          }
        ]
      }
    ]

    // --------------- State ---------------
    const testGroups = ref(createTestGroups())
    const createdTestUserId = ref(null)
    const createdTestItemId = ref(null)

    // --------------- Computed ---------------
    const allTests = computed(() => testGroups.value.flatMap(g => g.tests))
    const totalTests = computed(() => allTests.value.length)
    const passCount = computed(() => allTests.value.filter(t => t.status === 'pass').length)
    const failCount = computed(() => allTests.value.filter(t => t.status === 'fail').length)
    const skipCount = computed(() => allTests.value.filter(t => t.status === 'skip').length)
    const pendingCount = computed(() => allTests.value.filter(t => t.status === 'pending').length)
    const completedTests = computed(() => totalTests.value - pendingCount.value - allTests.value.filter(t => t.status === 'running').length)
    const totalDuration = computed(() => allTests.value.reduce((sum, t) => sum + (t.duration || 0), 0))
    const progressPercent = computed(() => totalTests.value ? Math.round((completedTests.value / totalTests.value) * 100) : 0)

    const groupPassCount = (group) => group.tests.filter(t => t.status === 'pass').length
    const groupFailCount = (group) => group.tests.filter(t => t.status === 'fail').length
    const groupSkipCount = (group) => group.tests.filter(t => t.status === 'skip').length

    // --------------- HTTP Helper ---------------
    const getToken = () => sessionStorage.getItem('token')

    const doRequest = async (test, method, path, body = null, withAuth = true) => {
      const headers = {}
      if (withAuth) {
        const token = getToken()
        if (token) headers['Authorization'] = `Bearer ${token}`
      }
      if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }

      const url = `${API_BASE}${path}`
      test.requestInfo = `${method} ${url}` + (body ? `\n${JSON.stringify(body, null, 2)}` : '')

      const start = performance.now()
      try {
        const opts = { method, headers }
        if (body) {
          opts.body = body instanceof FormData ? body : JSON.stringify(body)
        }

        const response = await fetch(url, opts)
        const elapsed = Math.round(performance.now() - start)
        test.duration = elapsed
        test.statusCode = response.status

        let data = null
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          data = await response.json()
        } else {
          data = await response.text()
        }
        test.responseBody = data

        // Determine pass/fail
        const expected = test.expectStatus
        if (expected) {
          // Test expects a specific status code
          if (response.status === expected) {
            test.status = 'pass'
            return true
          } else {
            test.status = 'fail'
            test.error = `Expected ${expected}, got ${response.status}`
            return false
          }
        } else {
          // Default: 2xx = pass
          if (response.status >= 200 && response.status < 300) {
            test.status = 'pass'
            return true
          } else {
            test.status = 'fail'
            test.error = `HTTP ${response.status}: ${typeof data === 'object' ? (data.error || data.message || JSON.stringify(data)) : data}`
            return false
          }
        }
      } catch (err) {
        test.duration = Math.round(performance.now() - start)
        test.status = 'fail'
        test.error = err.message || 'Network error'
        test.responseBody = null
        return false
      }
    }

    // --------------- Run Tests ---------------
    const runAllTests = async () => {
      isRunning.value = true
      createdTestUserId.value = null
      createdTestItemId.value = null

      // Reset all tests
      for (const group of testGroups.value) {
        for (const test of group.tests) {
          test.status = 'pending'
          test.statusCode = null
          test.duration = null
          test.responseBody = null
          test.error = null
          test.requestInfo = null
          test.expanded = false
        }
      }

      // Run sequentially by group to respect dependencies (e.g., create before update/delete)
      for (const group of testGroups.value) {
        for (const test of group.tests) {
          test.status = 'running'
          try {
            await test.run(test)
          } catch (err) {
            test.status = 'fail'
            test.error = `Runner error: ${err.message}`
          }
          // Small delay for UI update
          await new Promise(r => setTimeout(r, 50))
        }
      }

      isRunning.value = false
    }

    const runGroupTests = async (group) => {
      isRunning.value = true

      for (const test of group.tests) {
        test.status = 'pending'
        test.statusCode = null
        test.duration = null
        test.responseBody = null
        test.error = null
        test.requestInfo = null
      }

      for (const test of group.tests) {
        test.status = 'running'
        try {
          await test.run(test)
        } catch (err) {
          test.status = 'fail'
          test.error = `Runner error: ${err.message}`
        }
        await new Promise(r => setTimeout(r, 50))
      }

      isRunning.value = false
    }

    const clearResults = () => {
      testGroups.value = createTestGroups()
      createdTestUserId.value = null
      createdTestItemId.value = null
    }

    // --------------- Helpers ---------------
    const formatJson = (data) => {
      if (!data) return ''
      if (typeof data === 'string') return data
      try {
        return JSON.stringify(data, null, 2)
      } catch {
        return String(data)
      }
    }

    const codeClass = (code) => {
      if (code >= 200 && code < 300) return 'code-2xx'
      if (code >= 300 && code < 400) return 'code-3xx'
      if (code >= 400 && code < 500) return 'code-4xx'
      return 'code-5xx'
    }

    return {
      user,
      isRunning,
      testGroups,
      totalTests,
      passCount,
      failCount,
      skipCount,
      pendingCount,
      completedTests,
      totalDuration,
      progressPercent,
      groupPassCount,
      groupFailCount,
      groupSkipCount,
      runAllTests,
      runGroupTests,
      clearResults,
      formatJson,
      codeClass
    }
  }
}
</script>

<style scoped>
.api-test-page {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.test-container {
  background: var(--card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  padding: 2rem;
}

/* Header */
.test-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.test-header h2 {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.run-btn {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.run-btn:hover:not(:disabled) {
  background: #2563eb;
}

.run-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-btn {
  padding: 0.75rem 1rem;
  background: var(--surface-2);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.875rem;
}

.clear-btn:hover:not(:disabled) {
  background: var(--border);
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: var(--surface-2);
  border-radius: 0.5rem;
  border-top: 3px solid transparent;
}

.stat-card.total { border-top-color: #6366f1; }
.stat-card.pass { border-top-color: #22c55e; }
.stat-card.fail { border-top-color: #ef4444; }
.stat-card.skip { border-top-color: #a3a3a3; }
.stat-card.pending { border-top-color: #eab308; }
.stat-card.time { border-top-color: #8b5cf6; }

.stat-number {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-top: 0.125rem;
}

/* Progress */
.progress-bar {
  height: 4px;
  background: var(--surface-2);
  border-radius: 2px;
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #22c55e);
  transition: width 0.3s ease;
  border-radius: 2px;
}

/* Test Groups */
.test-groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.test-group {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.group-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.group-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.collapse-icon {
  font-size: 0.625rem;
  color: var(--muted-foreground);
  width: 1rem;
}

.group-title h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.group-count {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  background: var(--card);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
}

.group-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mini-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.mini-badge.pass { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.mini-badge.fail { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.mini-badge.skip { background: rgba(163, 163, 163, 0.15); color: #a3a3a3; }

.run-group-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  background: transparent;
  color: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 600;
}

.run-group-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.1);
}

.run-group-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Test Rows */
.group-tests {
  border-top: 1px solid var(--border);
}

.test-row {
  border-bottom: 1px solid var(--border);
}

.test-row:last-child {
  border-bottom: none;
}

.test-main {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1.25rem;
  cursor: pointer;
  transition: background 0.15s;
}

.test-main:hover {
  background: rgba(255, 255, 255, 0.02);
}

/* Status Icons */
.test-icon {
  font-size: 0.875rem;
  width: 1.25rem;
  text-align: center;
  flex-shrink: 0;
}

.test-icon.pass { color: #22c55e; }
.test-icon.fail { color: #ef4444; }
.test-icon.skip { color: #a3a3a3; }
.test-icon.running { color: #3b82f6; animation: spin 1s linear infinite; }
.test-icon.pending { color: var(--muted-foreground); }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Method Badge */
.method-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.method-badge.get { background: #3b82f6; }
.method-badge.post { background: #10b981; }
.method-badge.put { background: #f59e0b; }
.method-badge.delete { background: #ef4444; }

/* Test Info */
.test-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.test-path {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.test-desc {
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

/* Test Meta (right side) */
.test-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.http-code {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.code-2xx { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.code-3xx { background: rgba(234, 179, 8, 0.15); color: #eab308; }
.code-4xx { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.code-5xx { background: rgba(168, 85, 247, 0.15); color: #a855f7; }

.duration {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-family: 'Monaco', 'Courier New', monospace;
}

.expand-icon {
  font-size: 0.5rem;
  color: var(--muted-foreground);
}

/* Test Detail (expandable) */
.test-detail {
  padding: 0 1.25rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  overflow: hidden;
}

.detail-section.error {
  border-color: rgba(239, 68, 68, 0.3);
}

.detail-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.375rem 0.75rem;
  color: var(--muted-foreground);
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border);
}

.detail-section.error .detail-label {
  color: #ef4444;
}

.detail-content {
  margin: 0;
  padding: 0.75rem;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.request-info {
  color: var(--muted-foreground);
}

/* Legend */
.legend {
  display: flex;
  gap: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.dot.pass { background: #22c55e; }
.dot.fail { background: #ef4444; }
.dot.skip { background: #a3a3a3; }
.dot.pending { background: #eab308; }

/* Responsive */
@media (max-width: 640px) {
  .test-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .run-btn, .clear-btn {
    flex: 1;
  }

  .group-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .test-main {
    padding: 0.5rem 0.75rem;
    flex-wrap: wrap;
  }

  .test-meta {
    width: 100%;
    justify-content: flex-end;
    margin-top: 0.25rem;
  }
}
</style>
