<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Audit Log & Trail</h2>
      <button @click="exportLogs" class="btn">Export to Excel</button>
    </div>

    <div class="mb-4 space-y-2">
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="action in actions"
          :key="action"
          @click="filter = action"
          :class="`px-3 py-1 rounded text-sm ${
            filter === action
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`"
        >
          {{ action }}
        </button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Search by user or details..."
          v-model="searchText"
          class="form-input"
        />
      </div>
    </div>

    <div v-if="filteredLogs.length === 0" class="bg-blue-50 p-4 rounded text-center">
      No logs found
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse border border-gray-300 table-striped">
        <thead class="bg-gray-200">
          <tr>
            <th class="border p-2 text-left">Timestamp</th>
            <th class="border p-2 text-left">User</th>
            <th class="border p-2 text-left">Action</th>
            <th class="border p-2 text-left">Details</th>
            <th class="border p-2 text-left">Item ID</th>
            <th class="border p-2 text-left">Old Value</th>
            <th class="border p-2 text-left">New Value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in filteredLogs" :key="log.id">
            <td class="border p-2 text-sm">{{ formatDateTime(log.timestamp) }}</td>
            <td class="border p-2">{{ log.userID }}</td>
            <td class="border p-2 text-sm font-medium">{{ log.action }}</td>
            <td class="border p-2 text-sm">{{ log.details }}</td>
            <td class="border p-2">{{ log.affectedItemID || '-' }}</td>
            <td class="border p-2">{{ log.oldValue || '-' }}</td>
            <td class="border p-2">{{ log.newValue || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { auditService } from '../utils/services'
import { formatDateTime, exportToExcel } from '../utils/helpers'

export default {
  setup() {
    const logs = ref([])
    const filter = ref('All')
    const searchText = ref('')

    const loadLogs = async () => {
      const allLogs = await auditService.getAllLogs()
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      logs.value = allLogs
    }

    const actions = computed(() => ['All', ...new Set(logs.value.map(l => l.action))])

    const filteredLogs = computed(() => {
      let result = logs.value
      if (filter.value !== 'All') {
        result = result.filter(l => l.action === filter.value)
      }
      if (searchText.value) {
        result = result.filter(l =>
          l.userID.toLowerCase().includes(searchText.value.toLowerCase()) ||
          l.details.toLowerCase().includes(searchText.value.toLowerCase())
        )
      }
      return result
    })

    const exportLogs = () => {
      exportToExcel(filteredLogs.value, 'audit_logs.xlsx')
    }

    onMounted(() => {
      loadLogs()
    })

    return {
      logs,
      filter,
      searchText,
      actions,
      filteredLogs,
      exportLogs,
      formatDateTime,
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
