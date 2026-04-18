import { computed } from 'vue'
import { useAuth } from './useAuth'

export const usePermissions = () => {
  const { user } = useAuth()

  const isAdmin = computed(() => user.value?.role === 'admin')
  const isOperator = computed(() => user.value?.role === 'operator')
  const isTeacher = computed(() => user.value?.role === 'user' && user.value?.subRole === 'teacher')
  const isStudent = computed(() => user.value?.role === 'user' && user.value?.subRole !== 'teacher')

  /** Admin or operator */
  const isStaff = computed(() => isAdmin.value || isOperator.value)

  /** Admin, operator, or teacher — roles that can approve/manage requests */
  const canApproveRequests = computed(() => isAdmin.value || isOperator.value || isTeacher.value)

  /** Admin or operator — roles that can manage inventory items */
  const canManageItems = computed(() => isAdmin.value || isOperator.value)

  /** Any logged-in user (student/teacher) can borrow */
  const canBorrow = computed(() => !!user.value)

  /** Only admin can manage accounts */
  const canManageAccounts = computed(() => isAdmin.value)

  /** Admin can view audit log */
  const canViewAuditLog = computed(() => isAdmin.value)

  return {
    user,
    isAdmin,
    isOperator,
    isTeacher,
    isStudent,
    isStaff,
    canApproveRequests,
    canManageItems,
    canBorrow,
    canManageAccounts,
    canViewAuditLog,
  }
}
