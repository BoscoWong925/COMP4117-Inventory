<template>
  <div class="p-6">
    <!-- ========== TABLE VIEW ========== -->
    <template v-if="!showForm">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Manage Accounts</h2>
        <div class="flex gap-2">
          <button @click="openNewUserForm" class="btn btn-outline-primary">Add New Account</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label class="filter-label">Search</label>
          <input v-model="searchText" type="text" class="form-input text-sm" placeholder="Name, ID, email..." />
        </div>
        <div>
          <label class="filter-label">Role</label>
          <select v-model="filterRole" class="form-select text-sm">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>
        <div>
          <label class="filter-label">Status</label>
          <select v-model="filterStatus" class="form-select text-sm">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div class="flex items-end">
          <button @click="clearFilters" class="filter-clear-btn">Clear All</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div class="theme-card p-3 text-center">
          <p class="text-xl font-bold text-accent">{{ allStats.total }}</p>
          <p class="text-xs text-muted">Total</p>
        </div>
        <div class="theme-card p-3 text-center">
          <p class="text-xl font-bold" style="color:#ef4444">{{ allStats.admins }}</p>
          <p class="text-xs text-muted">Admins</p>
        </div>
        <div class="theme-card p-3 text-center">
          <p class="text-xl font-bold" style="color:#f59e0b">{{ allStats.operators }}</p>
          <p class="text-xs text-muted">Operators</p>
        </div>
        <div class="theme-card p-3 text-center">
          <p class="text-xl font-bold" style="color:#8b5cf6">{{ allStats.teachers }}</p>
          <p class="text-xs text-muted">Teachers</p>
        </div>
        <div class="theme-card p-3 text-center">
          <p class="text-xl font-bold" style="color:#22c55e">{{ allStats.students }}</p>
          <p class="text-xs text-muted">Students</p>
        </div>
      </div>

      <p class="results-summary">
        Showing {{ paginatedUsers.length }} of {{ totalUsers }} accounts
      </p>

      <div v-if="paginatedUsers.length === 0" class="empty-state">No accounts found</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse table-striped theme-table">
          <thead>
            <tr>
              <th class="border p-2 text-left">User ID</th>
              <th class="border p-2 text-left">Name</th>
              <th class="border p-2 text-left">Username</th>
              <th class="border p-2 text-left">Email</th>
              <th class="border p-2 text-left">Role</th>
              <th class="border p-2 text-left">Department</th>
              <th class="border p-2 text-left">Status</th>
              <th class="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in paginatedUsers" :key="u.userId">
              <td class="border p-2 text-sm font-semibold">{{ u.userId }}</td>
              <td class="border p-2 text-sm">{{ u.name }}</td>
              <td class="border p-2 text-sm">{{ u.username }}</td>
              <td class="border p-2 text-sm">{{ u.email || '-' }}</td>
              <td class="border p-2 text-sm">
                <span :class="`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadge(u)}`">
                  {{ getDisplayRole(u) }}
                </span>
              </td>
              <td class="border p-2 text-sm">{{ u.department || '-' }}</td>
              <td class="border p-2 text-sm">
                <span v-if="u.isActive !== false" class="px-2 py-0.5 rounded text-xs font-medium action-badge action-badge-success">Active</span>
                <span v-else class="px-2 py-0.5 rounded text-xs font-medium action-badge action-badge-danger">Inactive</span>
              </td>
              <td class="border p-2 text-center whitespace-nowrap">
                <button @click="editUser(u)" class="btn btn-outline-success text-sm">Edit</button>
                <button
                  v-if="u.isActive !== false"
                  @click="toggleStatus(u, false)"
                  class="btn btn-outline-danger text-sm ml-1"
                >Disable</button>
                <button
                  v-else
                  @click="toggleStatus(u, true)"
                  class="btn btn-outline-primary text-sm ml-1"
                >Enable</button>
                <button @click="confirmDelete(u)" class="btn btn-outline-danger text-sm ml-1">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <PaginationControl v-model:currentPage="currentPage" :totalItems="totalUsers" :pageSize="pageSize" />
      </div>
    </template>

    <!-- ========== FORM VIEW ========== -->
    <template v-if="showForm">
      <div class="max-w-2xl mx-auto pt-8">
        <button @click="showForm = false; resetForm()" class="text-muted hover:text-[color:var(--text-primary)] text-lg px-3 py-1 rounded hover:bg-[color:var(--row-hover)] mb-2">
          &larr; Back
        </button>
        <h2 class="text-2xl font-bold mb-6">
          {{ editingUser ? 'Edit Account' : 'Create New Account' }}
        </h2>

        <form @submit.prevent="handleSubmit" class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">User ID *</label>
            <input type="text" required v-model="formData.userId" class="form-input" :disabled="!!editingUser" />
          </div>
          <div>
            <label class="form-label">Name *</label>
            <input type="text" required v-model="formData.name" class="form-input" />
          </div>
          <div>
            <label class="form-label">Username *</label>
            <input type="text" required v-model="formData.username" class="form-input" :disabled="!!editingUser" />
          </div>
          <div>
            <label class="form-label">Email *</label>
            <input type="email" v-model="formData.email" class="form-input" :required="!editingUser" />
          </div>
          <div>
            <label class="form-label">Role *</label>
            <select v-model="formData.displayRole" class="form-select" @change="onRoleChange">
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div>
            <label class="form-label">Department *</label>
            <input type="text" v-model="formData.department" class="form-input" placeholder="e.g. COMP" :required="!editingUser" />
          </div>
          <div>
            <label class="form-label">{{ editingUser ? 'New Password (leave blank to keep)' : 'Password *' }}</label>
            <input :type="showPassword ? 'text' : 'password'" v-model="formData.password" class="form-input" :required="!editingUser" :placeholder="editingUser ? 'Leave blank to keep current' : ''" />
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" v-model="showPassword" class="rounded" />
              <span class="text-sm">Show password</span>
            </label>
          </div>

          <div class="col-span-2 flex gap-3 justify-end p-4 form-action-bar">
            <button type="submit" class="btn btn-outline-success px-6 py-2">
              {{ editingUser ? 'Update' : 'Create' }} Account
            </button>
            <button type="button" @click="showForm = false; resetForm()" class="btn btn-outline-secondary px-6 py-2">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </template>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Confirm Delete</h3>
        <p class="mb-4">Are you sure you want to delete account <strong>{{ deleteTarget?.name }}</strong> ({{ deleteTarget?.userId }})?</p>
        <p class="text-sm text-red-500 mb-4">This action cannot be undone.</p>
        <div class="flex gap-2">
          <button @click="handleDelete" class="btn btn-outline-danger flex-1">Delete</button>
          <button @click="showDeleteModal = false; deleteTarget = null" class="btn btn-outline-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="message" class="fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm" :class="messageSuccess ? 'alert-success' : 'border-2 border-[color:var(--danger)]'" :style="!messageSuccess ? 'background:var(--danger-light);color:var(--danger-dark)' : ''">
      {{ message }}
      <button @click="message = ''" class="ml-2 font-bold">&times;</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { userService } from '../utils/services'
import PaginationControl from '../components/PaginationControl.vue'

export default {
  components: { PaginationControl },
  setup() {
    const users = ref([])
    const totalUsers = ref(0)
    const allStats = ref({ total: 0, admins: 0, operators: 0, teachers: 0, students: 0 })
    const showForm = ref(false)
    const editingUser = ref(null)
    const showDeleteModal = ref(false)
    const deleteTarget = ref(null)
    const showPassword = ref(false)
    const searchText = ref('')
    const filterRole = ref('')
    const filterStatus = ref('')
    const currentPage = ref(1)
    const pageSize = 15
    const message = ref('')
    const messageSuccess = ref(true)

    const formData = ref({
      userId: '', name: '', username: '', email: '',
      displayRole: 'student', department: '', password: ''
    })

    watch([searchText, filterRole, filterStatus], () => { currentPage.value = 1; loadUsers() })
    watch(currentPage, () => { loadUsers() })

    const getDisplayRole = (u) => {
      if (u.role === 'admin') return 'Admin'
      if (u.role === 'operator') return 'Operator'
      if (u.role === 'user' && u.subRole === 'teacher') return 'Teacher'
      return 'Student'
    }

    const getRoleBadge = (u) => {
      if (u.role === 'admin') return 'action-badge action-badge-danger'
      if (u.role === 'operator') return 'action-badge action-badge-warning'
      if (u.role === 'user' && u.subRole === 'teacher') return 'action-badge action-badge-accent'
      return 'action-badge action-badge-success'
    }

    const paginatedUsers = computed(() => users.value)

    const loadUsers = async () => {
      try {
        const params = {
          page: currentPage.value,
          pageSize: pageSize
        }
        
        if (searchText.value) {
          params.search = searchText.value
        }
        
        if (filterRole.value) {
          if (filterRole.value === 'teacher') {
            params.role = 'user'
            params.subRole = 'teacher'
          } else if (filterRole.value === 'student') {
            params.role = 'user'
            params.subRole = 'student'
          } else {
            params.role = filterRole.value
          }
        }
        
        if (filterStatus.value) {
          params.isActive = filterStatus.value === 'active' ? 'true' : 'false'
        }
        
        const data = await userService.getAllUsers(params)
        users.value = data.users || []
        totalUsers.value = data.total || 0
        
        // Load stats separately without filters
        if (currentPage.value === 1 && !searchText.value && !filterRole.value && !filterStatus.value) {
          calculateStats()
        }
      } catch (e) {
        console.error('Failed to load users:', e)
        showMessage('Failed to load accounts', false)
      }
    }
    
    const calculateStats = async () => {
      try {
        const allData = await userService.getAllUsers({ pageSize: 10000 })
        const all = allData.users || []
        allStats.value = {
          total: all.length,
          admins: all.filter(u => u.role === 'admin').length,
          operators: all.filter(u => u.role === 'operator').length,
          teachers: all.filter(u => u.role === 'user' && u.subRole === 'teacher').length,
          students: all.filter(u => u.role === 'user' && (!u.subRole || u.subRole === 'student')).length
        }
      } catch (e) {
        console.error('Failed to calculate stats:', e)
      }
    }

    const clearFilters = () => {
      searchText.value = ''
      filterRole.value = ''
      filterStatus.value = ''
      currentPage.value = 1
    }

    const onRoleChange = () => {
      // role mapping is handled in handleSubmit
    }

    const openNewUserForm = () => {
      resetForm()
      showForm.value = true
    }

    const editUser = (u) => {
      editingUser.value = u
      formData.value = {
        userId: u.userId,
        name: u.name,
        username: u.username,
        email: u.email || '',
        displayRole: getDisplayRole(u).toLowerCase(),
        department: u.department || '',
        password: ''
      }
      showForm.value = true
    }

    const resetForm = () => {
      editingUser.value = null
      formData.value = {
        userId: '', name: '', username: '', email: '',
        displayRole: 'student', department: '', password: ''
      }
      showPassword.value = false
    }

    const handleSubmit = async () => {
      const dr = formData.value.displayRole
      let role, subRole
      if (dr === 'admin') { role = 'admin'; subRole = undefined }
      else if (dr === 'operator') { role = 'operator'; subRole = undefined }
      else if (dr === 'teacher') { role = 'user'; subRole = 'teacher' }
      else { role = 'user'; subRole = 'student' }

      const payload = {
        userId: formData.value.userId,
        name: formData.value.name,
        username: formData.value.username,
        email: formData.value.email,
        role,
        subRole,
        department: formData.value.department
      }
      if (formData.value.password) {
        payload.password = formData.value.password
      }

      try {
        if (editingUser.value) {
          // Don't send userId/username on update (they're immutable)
          delete payload.userId
          delete payload.username
          await userService.updateUser(editingUser.value.userId, payload)
          showMessage('Account updated successfully', true)
        } else {
          if (!formData.value.password) {
            alert('Password is required for new accounts')
            return
          }
          await userService.createUser(payload)
          showMessage('Account created successfully', true)
        }
        showForm.value = false
        resetForm()
        await loadUsers()
      } catch (e) {
        console.error('Failed to save account:', e)
        showMessage('Error: ' + e.message, false)
      }
    }

    const confirmDelete = (u) => {
      deleteTarget.value = u
      showDeleteModal.value = true
    }

    const handleDelete = async () => {
      if (!deleteTarget.value) return
      try {
        await userService.deleteUser(deleteTarget.value.userId)
        showMessage('Account deleted', true)
        showDeleteModal.value = false
        deleteTarget.value = null
        await loadUsers()
      } catch (e) {
        showMessage('Error: ' + e.message, false)
      }
    }

    const toggleStatus = async (u, isActive) => {
      try {
        await userService.toggleUserStatus(u.userId, isActive)
        showMessage(`Account ${isActive ? 'enabled' : 'disabled'}`, true)
        await loadUsers()
      } catch (e) {
        showMessage('Error: ' + e.message, false)
      }
    }

    const showMessage = (msg, success) => {
      message.value = msg
      messageSuccess.value = success
      setTimeout(() => { message.value = '' }, 4000)
    }

    onMounted(() => { loadUsers() })

    return {
      users, totalUsers, allStats, showForm, editingUser, showDeleteModal, deleteTarget,
      showPassword, searchText, filterRole, filterStatus,
      currentPage, pageSize, message, messageSuccess, formData,
      paginatedUsers,
      getDisplayRole, getRoleBadge, clearFilters, onRoleChange,
      openNewUserForm, editUser, resetForm, handleSubmit,
      confirmDelete, handleDelete, toggleStatus, loadUsers
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
