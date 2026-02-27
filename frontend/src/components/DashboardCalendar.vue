<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold">Lending Calendar</h3>
      <div class="flex items-center gap-2">
        <button @click="prevMonth" class="px-2 py-1 rounded hover:bg-gray-100 text-gray-600">&larr;</button>
        <span class="font-semibold text-gray-700 min-w-[160px] text-center">{{ monthLabel }}</span>
        <button @click="nextMonth" class="px-2 py-1 rounded hover:bg-gray-100 text-gray-600">&rarr;</button>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex gap-4 mb-3 text-xs text-gray-500">
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-full bg-red-400 inline-block"></span> Return Due
      </span>
    </div>

    <!-- Day headers -->
    <div class="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 mb-1">
      <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d">{{ d }}</div>
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-px">
      <div
        v-for="(cell, idx) in calendarCells"
        :key="idx"
        :class="[
          'min-h-[64px] p-1 text-xs border border-gray-100 rounded relative',
          cell.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-300',
          cell.isToday ? 'ring-2 ring-blue-400' : '',
          cell.events.length > 0 ? 'cursor-pointer hover:bg-blue-50' : ''
        ]"
        @click="cell.events.length > 0 && toggleDetail(cell)"
      >
        <span class="font-medium">{{ cell.day }}</span>
        <div class="flex flex-wrap gap-0.5 mt-0.5">
          <span
            v-for="(evt, i) in cell.events.slice(0, 3)"
            :key="i"
            class="w-2 h-2 rounded-full inline-block bg-red-400"
            :title="evt.label"
          ></span>
          <span v-if="cell.events.length > 3" class="text-[9px] text-gray-400">+{{ cell.events.length - 3 }}</span>
        </div>
      </div>
    </div>

    <!-- Event detail panel -->
    <div v-if="selectedCell && selectedCell.events.length > 0" class="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div class="flex justify-between items-center mb-2">
        <h4 class="text-sm font-semibold text-gray-700">{{ formatCellDate(selectedCell) }}</h4>
        <button @click="selectedCell = null" class="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
      </div>
      <ul class="space-y-1">
        <li v-for="(evt, i) in selectedCell.events" :key="i" class="flex items-center gap-2 text-xs">
          <span class="w-2 h-2 rounded-full inline-block flex-shrink-0 bg-red-400"></span>
          <span class="text-red-700 font-medium">{{ evt.label }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { borrowingService, inventoryService, userService } from '../utils/services'

export default {
  setup() {
    const currentYear = ref(new Date().getFullYear())
    const currentMonth = ref(new Date().getMonth())
    const selectedCell = ref(null)

    const monthLabel = computed(() => {
      const date = new Date(currentYear.value, currentMonth.value)
      return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    })

    const prevMonth = () => {
      if (currentMonth.value === 0) {
        currentMonth.value = 11
        currentYear.value--
      } else {
        currentMonth.value--
      }
      selectedCell.value = null
    }

    const nextMonth = () => {
      if (currentMonth.value === 11) {
        currentMonth.value = 0
        currentYear.value++
      } else {
        currentMonth.value++
      }
      selectedCell.value = null
    }

    const getEvents = () => {
      const requests = borrowingService.getAllRequests()
      const events = []

      requests.forEach(req => {
        const item = inventoryService.getItemById(req.itemID)
        const itemName = item ? item.name : 'Unknown Item'
        const borrower = userService.getUserById(req.borrowerID)
        const borrowerName = borrower ? borrower.name : req.borrowerID

        // Only show return due dates for currently lent-out (approved) items
        if (req.status === 'Approved' && req.returnDate) {
          events.push({
            date: new Date(req.returnDate).toDateString(),
            type: 'due',
            label: `Return Due: ${itemName} (${borrowerName})`
          })
        }
      })

      return events
    }

    const calendarCells = computed(() => {
      const year = currentYear.value
      const month = currentMonth.value
      const firstDay = new Date(year, month, 1).getDay()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const daysInPrevMonth = new Date(year, month, 0).getDate()
      const today = new Date()
      const events = getEvents()

      const cells = []

      // Previous month padding days
      for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i
        const date = new Date(year, month - 1, day)
        cells.push({
          day,
          isCurrentMonth: false,
          isToday: false,
          date,
          events: events.filter(e => e.date === date.toDateString())
        })
      }

      // Current month days
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d)
        const isToday = date.toDateString() === today.toDateString()
        cells.push({
          day: d,
          isCurrentMonth: true,
          isToday,
          date,
          events: events.filter(e => e.date === date.toDateString())
        })
      }

      // Next month padding days to fill 6 rows (42 cells)
      const remaining = 42 - cells.length
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(year, month + 1, d)
        cells.push({
          day: d,
          isCurrentMonth: false,
          isToday: false,
          date,
          events: events.filter(e => e.date === date.toDateString())
        })
      }

      return cells
    })

    const toggleDetail = (cell) => {
      if (selectedCell.value === cell) {
        selectedCell.value = null
      } else {
        selectedCell.value = cell
      }
    }

    const formatCellDate = (cell) => {
      return cell.date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    }

    return {
      currentYear,
      currentMonth,
      monthLabel,
      prevMonth,
      nextMonth,
      calendarCells,
      selectedCell,
      toggleDetail,
      formatCellDate
    }
  }
}
</script>

<style scoped>
@import '../index.css';
</style>
