<template>
  <div class="page-container">
    <!-- ========== TABLE VIEW ========== -->
    <template v-if="!showForm">
      <ModulePageHeader title="Manage Accounts" :subtitle="`${totalUsers} accounts`">
        <Button variant="outline" size="sm" @click="showFilterPanel = !showFilterPanel">
          {{ showFilterPanel ? 'Hide Filters' : 'Filters' }}
        </Button>
        <Button size="sm" @click="openNewUserForm">Add New Account</Button>
      </ModulePageHeader>

      <ModuleFilterPanel v-if="showFilterPanel" @clear="clearFilters">
        <div class="accounts-filter-grid">
          <div>
            <label class="filter-label">Search</label>
            <Input v-model="searchText" type="text" placeholder="Name, ID, email..." />
          </div>
          <div>
            <label class="filter-label">Role</label>
            <Select v-model="filterRole">
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </Select>
          </div>
          <div>
            <label class="filter-label">Status</label>
            <Select v-model="filterStatus">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
      </ModuleFilterPanel>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Card class="p-3 text-center">
          <p class="text-xl font-bold text-accent">{{ allCounts.total }}</p>
          <p class="text-xs text-muted">Total</p>
        </Card>
        <Card class="p-3 text-center">
          <p class="text-xl font-bold" style="color:#ef4444">{{ allCounts.admin }}</p>
          <p class="text-xs text-muted">Admins</p>
        </Card>
        <Card class="p-3 text-center">
          <p class="text-xl font-bold" style="color:#f59e0b">{{ allCounts.operator }}</p>
          <p class="text-xs text-muted">Operators</p>
        </Card>
        <Card class="p-3 text-center">
          <p class="text-xl font-bold" style="color:#8b5cf6">{{ allCounts.teacher }}</p>
          <p class="text-xs text-muted">Teachers</p>
        </Card>
        <Card class="p-3 text-center">
          <p class="text-xl font-bold" style="color:#22c55e">{{ allCounts.student }}</p>
          <p class="text-xs text-muted">Students</p>
        </Card>
      </div>

      <Card class="accounts-table-card">
        <Transition name="bulk-bar">
          <div v-if="selectedUserIds.length > 0" class="bulk-toolbar">
            <div class="bulk-toolbar-left">
              <span class="bulk-chip">{{ selectedUserIds.length }} selected</span>
              <DropdownMenu align="start">
                <template #trigger>
                  <button class="toolbar-btn">
                    <Zap :size="12" /> Actions <ChevronDown :size="10" />
                  </button>
                </template>
                <template #default="{ close }">
                  <DropdownMenuItem @click="openBulkDisableModal(); close()">
                    <ShieldOff :size="12" /> Disable ({{ selectedUserIds.length }})
                  </DropdownMenuItem>
                  <DropdownMenuItem success @click="openBulkEnableModal(); close()">
                    <ShieldCheck :size="12" /> Enable ({{ selectedUserIds.length }})
                  </DropdownMenuItem>
                  <DropdownMenuItem separator />
                  <DropdownMenuItem destructive @click="openBulkDeleteModal(); close()">
                    <Trash2 :size="12" /> Delete ({{ selectedUserIds.length }})
                  </DropdownMenuItem>
                </template>
              </DropdownMenu>
              <button class="bulk-clear-btn" @click="selectedUserIds = []">Clear</button>
            </div>
          </div>
        </Transition>
        <div class="table-responsive">
          <table class="table-striped theme-table">
            <thead>
              <tr>
                <th class="text-center" style="width:2.5rem">
                  <Checkbox
                    :checked="allSelected"
                    :indeterminate="selectedUserIds.length > 0 && !allSelected"
                    @update:checked="toggleSelectAll"
                  />
                </th>
                <th>User ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.userId">
                <td class="text-center">
                  <Checkbox
                    :checked="selectedUserIds.includes(u.userId)"
                    @update:checked="toggleUserSelection(u.userId, $event)"
                  />
                </td>
                <td class="text-sm" style="font-weight:600">{{ u.userId }}</td>
                <td class="text-sm">{{ u.name }}</td>
                <td class="text-sm">{{ u.username }}</td>
                <td class="text-sm">{{ u.email || '-' }}</td>
                <td class="text-sm">
                  <Badge :variant="getRoleBadgeVariant(u)">{{ getDisplayRole(u) }}</Badge>
                </td>
                <td class="text-sm">{{ u.department || '-' }}</td>
                <td class="text-sm">
                  <Badge :variant="u.isActive !== false ? 'success' : 'destructive'">
                    {{ u.isActive !== false ? 'Active' : 'Inactive' }}
                  </Badge>
                </td>
                <td class="text-center">
                  <DropdownMenu align="end">
                    <template #trigger>
                      <button class="kebab-trigger" aria-label="Row actions">
                        <MoreVertical :size="14" />
                      </button>
                    </template>
                    <template #default="{ close }">
                      <DropdownMenuItem @click="editUser(u); close()">
                        <Pencil :size="12" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="openEmailModal(u); close()">
                        <Mail :size="12" /> Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem separator />
                      <DropdownMenuItem v-if="u.isActive !== false" @click="toggleStatus(u, false); close()">
                        <ShieldOff :size="12" /> Disable
                      </DropdownMenuItem>
                      <DropdownMenuItem v-else success @click="toggleStatus(u, true); close()">
                        <ShieldCheck :size="12" /> Enable
                      </DropdownMenuItem>
                      <DropdownMenuItem destructive @click="confirmDelete(u); close()">
                        <Trash2 :size="12" /> Delete
                      </DropdownMenuItem>
                    </template>
                  </DropdownMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <TablePaginationBar
          v-model:currentPage="currentPage"
          v-model:pageSize="pageSizeRef"
          :total-items="totalUsers"
        />
      </Card>
      <div v-if="users.length === 0 && !showFilterPanel" class="empty-state">No accounts found</div>
    </template>

    <!-- ========== FORM VIEW ========== -->
    <template v-if="showForm">
      <div class="max-w-2xl mx-auto pt-4">
        <Button variant="ghost" size="sm" @click="showForm = false; resetForm()" class="mb-2">
          &larr; Back
        </Button>
        <h2 class="page-title mb-6">
          {{ editingUser ? 'Edit Account' : 'Create New Account' }}
        </h2>

        <form @submit.prevent="handleSubmit" class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">User ID *</label>
            <Input type="text" required v-model="formData.userId" :disabled="!!editingUser" />
          </div>
          <div>
            <label class="form-label">Name *</label>
            <Input type="text" required v-model="formData.name" />
          </div>
          <div>
            <label class="form-label">Username *</label>
            <Input type="text" required v-model="formData.username" :disabled="!!editingUser" />
          </div>
          <div>
            <label class="form-label">Email *</label>
            <Input type="email" v-model="formData.email" :required="!editingUser" />
          </div>
          <div>
            <label class="form-label">Role *</label>
            <Select v-model="formData.displayRole" @change="onRoleChange">
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </Select>
          </div>
          <div>
            <label class="form-label">Department *</label>
            <Input type="text" v-model="formData.department" placeholder="e.g. COMP" :required="!editingUser" />
          </div>
          <div>
            <label class="form-label">{{ editingUser ? 'New Password (leave blank to keep)' : 'Password *' }}</label>
            <Input :type="showPassword ? 'text' : 'password'" v-model="formData.password" :required="!editingUser" :placeholder="editingUser ? 'Leave blank to keep current' : ''" />
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 cursor-pointer mb-2">
              <Checkbox :checked="showPassword" @update:checked="showPassword = $event" />
              <span class="text-sm">Show password</span>
            </label>
          </div>

          <div class="col-span-2 flex gap-3 justify-end p-4 form-action-bar">
            <Button variant="outline" type="submit">
              {{ editingUser ? 'Update' : 'Create' }} Account
            </Button>
            <Button variant="ghost" type="button" @click="showForm = false; resetForm()">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </template>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Confirm Delete</h3>
        <p class="mb-4" style="color:var(--text-secondary);font-size:0.875rem">Are you sure you want to delete account <strong>{{ deleteTarget?.name }}</strong> ({{ deleteTarget?.userId }})?</p>
        <p class="text-sm mb-4" style="color:var(--danger)">This action cannot be undone.</p>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleDelete">Delete</Button>
          <Button variant="outline" class="flex-1" @click="showDeleteModal = false; deleteTarget = null">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Bulk Disable Confirmation Modal -->
    <div v-if="showBulkDisableModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Confirm Disable</h3>
        <p class="mb-4" style="color:var(--text-secondary);font-size:0.875rem">Are you sure you want to disable <strong>{{ selectedUserIds.length }}</strong> account(s)?</p>
        <p class="text-sm mb-4" style="color:var(--warning)">These accounts will no longer be able to access the system.</p>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="handleBulkDisable">Disable</Button>
          <Button variant="ghost" class="flex-1" @click="showBulkDisableModal = false">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Bulk Enable Confirmation Modal -->
    <div v-if="showBulkEnableModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Confirm Enable</h3>
        <p class="mb-4">Are you sure you want to enable <strong>{{ selectedUserIds.length }}</strong> account(s)?</p>
        <p class="text-sm text-secondary mb-4">These accounts will be able to access the system again.</p>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1" @click="handleBulkEnable">Enable</Button>
          <Button variant="ghost" class="flex-1" @click="showBulkEnableModal = false">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Bulk Delete Confirmation Modal -->
    <div v-if="showBulkDeleteModal" class="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
      <div class="modal-card max-w-md w-full">
        <h3 class="modal-title">Confirm Delete</h3>
        <p class="mb-4" style="color:var(--text-secondary);font-size:0.875rem">Are you sure you want to delete <strong>{{ selectedUserIds.length }}</strong> account(s)?</p>
        <p class="text-sm mb-4" style="color:var(--danger)">This action cannot be undone.</p>
        <div class="flex gap-2">
          <Button variant="destructive" class="flex-1" @click="handleBulkDelete">Delete</Button>
          <Button variant="outline" class="flex-1" @click="showBulkDeleteModal = false">Cancel</Button>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="message" class="fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm" :class="messageSuccess ? 'alert-success' : 'border-2 border-[color:var(--danger)]'" :style="!messageSuccess ? 'background:var(--danger-light);color:var(--danger-dark)' : ''">
      {{ message }}
      <button @click="message = ''" class="ml-2 font-bold">&times;</button>
    </div>

    <SendEmailModal
      :visible="showEmailModal"
      :recipientId="emailTarget?.userId"
      :recipientName="emailTarget?.name"
      :recipientEmail="emailTarget?.email"
      @close="showEmailModal = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { MoreVertical, Pencil, Trash2, Zap, ChevronDown, Mail, ShieldOff, ShieldCheck } from 'lucide-vue-next'
import { userService } from '../utils/services'
import SendEmailModal from '../components/SendEmailModal.vue'
import {
  UiBadge as Badge,
  UiButton as Button,
  UiCard as Card,
  UiCheckbox as Checkbox,
  UiDropdownMenu as DropdownMenu,
  UiDropdownMenuItem as DropdownMenuItem,
  UiInput as Input,
  UiModuleFilterPanel as ModuleFilterPanel,
  UiModulePageHeader as ModulePageHeader,
  UiSelect as Select,
  UiTablePaginationBar as TablePaginationBar,
} from '../components/ui'

export default {
  components: {
    Badge, Button, Card, Checkbox, ChevronDown,
    DropdownMenu, DropdownMenuItem, Input, Mail,
    ModuleFilterPanel, ModulePageHeader, MoreVertical,
    Pencil, Select, SendEmailModal, ShieldCheck, ShieldOff,
    TablePaginationBar, Trash2, Zap,
  },
  setup() {
    const users = ref([])
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
    const pageSizeRef = ref(pageSize)
    const totalUsers = ref(0)
    const message = ref('')
    const messageSuccess = ref(true)
    const allCounts = ref({ total: 0, admin: 0, operator: 0, teacher: 0, student: 0 })
    const selectedUserIds = ref([])
    const showBulkDisableModal = ref(false)
    const showBulkEnableModal = ref(false)
    const showBulkDeleteModal = ref(false)
    const showEmailModal = ref(false)
    const emailTarget = ref(null)
    const showFilterPanel = ref(false)
    let searchDebounceTimer = null

    const formData = ref({
      userId: '', name: '', username: '', email: '',
      displayRole: 'student', department: '', password: ''
    })

    const getDisplayRole = (u) => {
      if (u.role === 'admin') return 'Admin'
      if (u.role === 'operator') return 'Operator'
      if (u.role === 'user' && u.subRole === 'teacher') return 'Teacher'
      return 'Student'
    }

    const getRoleBadgeVariant = (u) => {
      if (u.role === 'admin') return 'destructive'
      if (u.role === 'operator') return 'warning'
      if (u.role === 'user' && u.subRole === 'teacher') return 'info'
      return 'success'
    }

    const loadUsers = async () => {
      try {
        const params = {
          page: currentPage.value,
          pageSize,
        }
        if (filterRole.value) params.displayRole = filterRole.value
        if (filterStatus.value) params.isActive = filterStatus.value === 'active' ? 'true' : 'false'
        if (searchText.value) params.search = searchText.value

        const data = await userService.getAllUsers(params)
        users.value = data.users || []
        totalUsers.value = data.total || 0
      } catch (e) {
        console.error('Failed to load users:', e)
        showMessage('Failed to load accounts', false)
      }
    }

    const loadAllCounts = async () => {
      try {
        const data = await userService.getAllUsers({ pageSize: 5000 })
        const all = data.users || []
        allCounts.value = {
          total: data.total || all.length,
          admin: all.filter(u => u.role === 'admin').length,
          operator: all.filter(u => u.role === 'operator').length,
          teacher: all.filter(u => u.role === 'user' && u.subRole === 'teacher').length,
          student: all.filter(u => u.role === 'user' && (!u.subRole || u.subRole === 'student')).length,
        }
      } catch (e) {
        console.error('Failed to load account counts:', e)
      }
    }

    // Watch dropdown filters and pagination -> reload immediately
    watch([filterRole, filterStatus, currentPage], () => {
      loadUsers()
    })

    // Debounced watcher for search text
    watch(searchText, () => {
      currentPage.value = 1
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = setTimeout(() => {
        loadUsers()
      }, 400)
    })

    const clearFilters = () => {
      searchText.value = ''
      filterRole.value = ''
      filterStatus.value = ''
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

    const allSelected = computed(() => {
      return users.value.length > 0 && users.value.every(user => selectedUserIds.value.includes(user.userId))
    })

    const toggleSelectAll = (checked) => {
      const pageIds = users.value.map(user => user.userId)
      if (checked) {
        const newSet = new Set([...selectedUserIds.value, ...pageIds])
        selectedUserIds.value = Array.from(newSet)
      } else {
        selectedUserIds.value = selectedUserIds.value.filter(id => !pageIds.includes(id))
      }
    }

    const toggleUserSelection = (userId, checked) => {
      if (checked) {
        if (!selectedUserIds.value.includes(userId)) {
          selectedUserIds.value = [...selectedUserIds.value, userId]
        }
      } else {
        selectedUserIds.value = selectedUserIds.value.filter(id => id !== userId)
      }
    }

    const openBulkDisableModal = () => {
      showBulkDisableModal.value = true
    }

    const openBulkEnableModal = () => {
      showBulkEnableModal.value = true
    }

    const openBulkDeleteModal = () => {
      showBulkDeleteModal.value = true
    }

    const handleBulkDisable = async () => {
      showBulkDisableModal.value = false
      try {
        for (const userId of selectedUserIds.value) {
          try {
            await userService.toggleUserStatus(userId, false)
          } catch (e) {
            console.error(`Failed to disable user ${userId}:`, e)
          }
        }
        selectedUserIds.value = []
        showMessage(`Disabled ${selectedUserIds.value.length} account(s)`, true)
        await loadUsers()
      } catch (e) {
        console.error('Failed to bulk disable users:', e)
        showMessage('Error disabling accounts', false)
      }
    }

    const handleBulkEnable = async () => {
      showBulkEnableModal.value = false
      try {
        for (const userId of selectedUserIds.value) {
          try {
            await userService.toggleUserStatus(userId, true)
          } catch (e) {
            console.error(`Failed to enable user ${userId}:`, e)
          }
        }
        selectedUserIds.value = []
        showMessage(`Enabled ${selectedUserIds.value.length} account(s)`, true)
        await loadUsers()
      } catch (e) {
        console.error('Failed to bulk enable users:', e)
        showMessage('Error enabling accounts', false)
      }
    }

    const handleBulkDelete = async () => {
      showBulkDeleteModal.value = false
      try {
        for (const userId of selectedUserIds.value) {
          try {
            await userService.deleteUser(userId)
          } catch (e) {
            console.error(`Failed to delete user ${userId}:`, e)
          }
        }
        selectedUserIds.value = []
        showMessage(`Deleted ${selectedUserIds.value.length} account(s)`, true)
        await loadUsers()
      } catch (e) {
        console.error('Failed to bulk delete users:', e)
        showMessage('Error deleting accounts', false)
      }
    }

    const showMessage = (msg, success) => {
      message.value = msg
      messageSuccess.value = success
      setTimeout(() => { message.value = '' }, 4000)
    }

    const openEmailModal = (u) => {
      emailTarget.value = u
      showEmailModal.value = true
    }

    onMounted(() => { loadUsers(); loadAllCounts() })

    return {
      users, showForm, editingUser, showDeleteModal, deleteTarget,
      showPassword, searchText, filterRole, filterStatus,
      currentPage, pageSizeRef, totalUsers, message, messageSuccess, formData,
      allCounts, selectedUserIds, showBulkDisableModal,
      showBulkEnableModal, showBulkDeleteModal,
      showEmailModal, emailTarget, showFilterPanel,
      getDisplayRole, getRoleBadgeVariant, clearFilters, onRoleChange,
      openNewUserForm, editUser, resetForm, handleSubmit,
      confirmDelete, handleDelete, toggleStatus, loadUsers,
      allSelected, toggleSelectAll, toggleUserSelection,
      openBulkDisableModal, openBulkEnableModal,
      openBulkDeleteModal, handleBulkDisable, handleBulkEnable, handleBulkDelete,
      openEmailModal
    }
  }
}
</script>

<style scoped>
/* Filter grid */
.accounts-filter-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.75rem;
}
@media (min-width: 768px) {
  .accounts-filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.filter-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted-foreground);
}

/* Table card */
.accounts-table-card { padding: 0; }

/* Kebab trigger */
.kebab-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.12s;
}
.kebab-trigger:hover { background: var(--surface-100); color: var(--text-primary); }

/* Bulk toolbar */
.bulk-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface-50);
}
.bulk-toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}
.bulk-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-surface);
  border-radius: 999px;
}
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.toolbar-btn:hover { background: var(--surface-100); color: var(--text-secondary); }
.bulk-clear-btn {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--muted-foreground);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.bulk-clear-btn:hover { color: var(--text-primary); }

/* Bulk bar animation */
.bulk-bar-enter-active,
.bulk-bar-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
}
.bulk-bar-enter-from,
.bulk-bar-leave-to {
  max-height: 0;
  opacity: 0;
}
.bulk-bar-enter-to,
.bulk-bar-leave-from {
  max-height: 4rem;
  opacity: 1;
}
</style>
