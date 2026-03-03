<template>
  <div class="api-status-page">
    <div class="status-container">
      <div class="status-header">
        <h2>API Status Monitor</h2>
        <button @click="checkAllEndpoints" class="check-btn" :disabled="isChecking">
          {{ isChecking ? 'Checking...' : 'Check All Endpoints' }}
        </button>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-label">Total Endpoints</span>
          <span class="stat-number">{{ endpoints.length }}</span>
        </div>
        <div class="stat-card active">
          <span class="stat-label">Active</span>
          <span class="stat-number">{{ activeCount }}</span>
        </div>
        <div class="stat-card inactive">
          <span class="stat-label">Inactive</span>
          <span class="stat-number">{{ inactiveCount }}</span>
        </div>
        <div class="stat-card pending">
          <span class="stat-label">Pending</span>
          <span class="stat-number">{{ pendingCount }}</span>
        </div>
      </div>

      <div class="endpoints-grid">
        <div v-for="endpoint in endpoints" :key="endpoint.path" class="endpoint-card" :class="endpoint.status">
          <div class="endpoint-header">
            <span class="method" :class="endpoint.method.toLowerCase()">{{ endpoint.method }}</span>
            <span class="path">{{ endpoint.path }}</span>
          </div>
          <div class="endpoint-details">
            <p class="description">{{ endpoint.description }}</p>
            <div class="status-badge" :class="endpoint.status">
              {{ statusLabel(endpoint.status) }}
            </div>
            <div v-if="endpoint.statusCode" class="status-info">
              Status Code: <span class="code">{{ endpoint.statusCode }}</span>
            </div>
            <div v-if="endpoint.error" class="error-message">
              {{ endpoint.error }}
            </div>
          </div>
        </div>
      </div>

      <div class="legend">
        <div class="legend-item active">
          <span class="legend-dot"></span>
          <span>Active (200-299)</span>
        </div>
        <div class="legend-item inactive">
          <span class="legend-dot"></span>
          <span>Inactive (300+)</span>
        </div>
        <div class="legend-item pending">
          <span class="legend-dot"></span>
          <span>Not Checked</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../utils/services'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001') + '/api'

export default {
  setup() {
    const { user } = useAuth()
    const isChecking = ref(false)
    const endpoints = ref([
      // Auth endpoints
      { method: 'POST', path: '/auth/login', description: 'User login', status: 'pending' },
      { method: 'POST', path: '/auth/logout', description: 'User logout', status: 'pending' },
      { method: 'GET', path: '/auth/me', description: 'Get current user', status: 'pending' },

      // User endpoints
      { method: 'GET', path: '/users', description: 'List all users', status: 'pending' },
      { method: 'POST', path: '/users', description: 'Create new user', status: 'pending' },
      { method: 'GET', path: '/users/:id', description: 'Get user by ID', status: 'pending' },
      { method: 'PUT', path: '/users/:id', description: 'Update user', status: 'pending' },
      { method: 'DELETE', path: '/users/:id', description: 'Delete user', status: 'pending' },
      { method: 'PUT', path: '/users/:id/status', description: 'Toggle user status', status: 'pending' },
      { method: 'GET', path: '/users/search/:query', description: 'Search users', status: 'pending' },

      // Item endpoints
      { method: 'GET', path: '/items', description: 'List all items', status: 'pending' },
      { method: 'GET', path: '/items/available', description: 'Get available items', status: 'pending' },
      { method: 'GET', path: '/items/lent-out', description: 'Get lent-out items', status: 'pending' },
      { method: 'GET', path: '/items/:id', description: 'Get item by ID', status: 'pending' },
      { method: 'POST', path: '/items', description: 'Create new item', status: 'pending' },
      { method: 'PUT', path: '/items/:id', description: 'Update item', status: 'pending' },
      { method: 'DELETE', path: '/items/:id', description: 'Delete item', status: 'pending' },

      // Borrow Request endpoints
      { method: 'GET', path: '/borrow-requests', description: 'List all requests', status: 'pending' },
      { method: 'GET', path: '/borrow-requests/pending', description: 'Get pending requests', status: 'pending' },
      { method: 'GET', path: '/borrow-requests/my', description: 'Get my requests', status: 'pending' },
      { method: 'GET', path: '/borrow-requests/:id', description: 'Get request by ID', status: 'pending' },
      { method: 'POST', path: '/borrow-requests', description: 'Create borrow request', status: 'pending' },
      { method: 'PUT', path: '/borrow-requests/:id/approve', description: 'Approve request', status: 'pending' },
      { method: 'PUT', path: '/borrow-requests/:id/reject', description: 'Reject request', status: 'pending' },
      { method: 'PUT', path: '/borrow-requests/:id/return', description: 'Return item', status: 'pending' },

      // Stats endpoints
      { method: 'GET', path: '/stats', description: 'Get dashboard stats', status: 'pending' },

      // Audit Log endpoints
      { method: 'GET', path: '/audit-logs', description: 'List audit logs', status: 'pending' },
    ])

    const activeCount = computed(() =>
      endpoints.value.filter(e => e.status === 'active').length
    )
    const inactiveCount = computed(() =>
      endpoints.value.filter(e => e.status === 'inactive').length
    )
    const pendingCount = computed(() =>
      endpoints.value.filter(e => e.status === 'pending').length
    )

    const statusLabel = (status) => {
      const labels = {
        active: '✓ Active',
        inactive: '✗ Inactive',
        pending: '⏳ Not Checked'
      }
      return labels[status] || status
    }

    const getToken = () => sessionStorage.getItem('token')

    const testEndpoint = async (endpoint) => {
      try {
        const token = getToken()
        const headers = {}

        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        // Use a sample/test path for parameterized endpoints
        let url = `${API_BASE}${endpoint.path}`
        if (endpoint.path.includes(':id')) {
          url = url.replace(':id', 'test-id')
        }
        if (endpoint.path.includes(':query')) {
          url = url.replace(':query', 'test')
        }

        let response
        if (endpoint.method === 'GET') {
          response = await fetch(url, { headers })
        } else if (endpoint.method === 'POST') {
          response = await fetch(url, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })
        } else if (endpoint.method === 'PUT') {
          response = await fetch(url, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          })
        } else if (endpoint.method === 'DELETE') {
          response = await fetch(url, {
            method: 'DELETE',
            headers
          })
        }

        endpoint.statusCode = response.status
        if (response.status >= 200 && response.status < 300) {
          endpoint.status = 'active'
          endpoint.error = null
        } else if (response.status === 401 || response.status === 403) {
          // Auth errors are still considered "active" endpoints (just auth required)
          endpoint.status = 'active'
          endpoint.error = `Auth required (${response.status})`
        } else {
          endpoint.status = 'inactive'
          endpoint.error = `HTTP ${response.status}`
        }
      } catch (error) {
        endpoint.status = 'inactive'
        endpoint.statusCode = null
        endpoint.error = error.message || 'Connection failed'
      }
    }

    const checkAllEndpoints = async () => {
      isChecking.value = true
      const promises = endpoints.value.map(endpoint => testEndpoint(endpoint))
      await Promise.all(promises)
      isChecking.value = false
    }

    onMounted(() => {
      // Auto-check endpoints on page load if user is authenticated
      if (user.value) {
        checkAllEndpoints()
      }
    })

    return {
      endpoints,
      isChecking,
      activeCount,
      inactiveCount,
      pendingCount,
      statusLabel,
      checkAllEndpoints,
      user
    }
  }
}
</script>

<style scoped>
.api-status-page {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.status-container {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
  padding: 2rem;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.status-header h2 {
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0;
}

.check-btn {
  padding: 0.75rem 1.5rem;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.check-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.check-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: 0.75rem;
  border-left: 4px solid var(--text-muted);
}

.stat-card.active {
  border-left-color: #22c55e;
}

.stat-card.inactive {
  border-left-color: #ef4444;
}

.stat-card.pending {
  border-left-color: #eab308;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.stat-number {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
}

.endpoints-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.endpoint-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.endpoint-card.active {
  border-left: 4px solid #22c55e;
}

.endpoint-card.inactive {
  border-left: 4px solid #ef4444;
}

.endpoint-card.pending {
  border-left: 4px solid #eab308;
}

.endpoint-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.method {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
}

.method.get {
  background: #3b82f6;
}

.method.post {
  background: #10b981;
}

.method.put {
  background: #f59e0b;
}

.method.delete {
  background: #ef4444;
}

.path {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.endpoint-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.active {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-badge.inactive {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.status-badge.pending {
  background: rgba(234, 179, 8, 0.1);
  color: #eab308;
}

.status-info {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.code {
  font-family: 'Monaco', 'Courier New', monospace;
  font-weight: 600;
  color: var(--text-primary);
}

.error-message {
  font-size: 0.75rem;
  color: #ef4444;
  padding: 0.375rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 0.25rem;
}

.legend {
  display: flex;
  gap: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.legend-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.legend-item:has(.legend-dot) .legend-dot {
  background: #22c55e;
}

@media (max-width: 640px) {
  .endpoints-grid {
    grid-template-columns: 1fr;
  }

  .status-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .check-btn {
    width: 100%;
  }
}
</style>
