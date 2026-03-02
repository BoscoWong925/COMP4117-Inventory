<template>
  <div class="theme-card rounded-lg p-6 mb-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-bold">Lending Calendar</h3>
      <div class="flex items-center gap-2">
        <button @click="prevMonth" class="px-2 py-1 rounded text-secondary" style="hover:background:var(--row-hover)">&larr;</button>
        <span class="font-semibold text-secondary min-w-[160px] text-center">{{ monthLabel }}</span>
        <button @click="nextMonth" class="px-2 py-1 rounded text-secondary" style="hover:background:var(--row-hover)">&rarr;</button>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex gap-4 mb-3 text-xs text-muted">
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded-full inline-block" style="background:var(--danger)"></span> Return Due
      </span>
    </div>

    <!-- Day headers -->
    <div class="grid grid-cols-7 text-center text-xs font-semibold text-muted mb-1">
      <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d">{{ d }}</div>
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-px">
      <div
        v-for="(cell, idx) in calendarCells"
        :key="idx"
        :class="[
          'min-h-[64px] p-1 text-xs rounded relative',
          cell.isCurrentMonth ? '' : 'opacity-40',
          cell.isToday ? 'ring-2' : '',
          cell.events.length > 0 ? 'cursor-pointer' : ''
        ]"
        :style="`border:1px solid var(--filter-border);background:${cell.isCurrentMonth ? 'var(--modal-bg)' : 'var(--filter-bg)'};${cell.isToday ? 'box-shadow:0 0 0 2px var(--accent)' : ''}`"
        @click="cell.events.length > 0 && toggleDetail(cell)"
        @mouseenter="cell.events.length > 0 && ($event.target.style.background='var(--row-hover)')"
        @mouseleave="cell.events.length > 0 && ($event.target.style.background=cell.isCurrentMonth ? 'var(--modal-bg)' : 'var(--filter-bg)')"
      >
        <span class="font-medium">{{ cell.day }}</span>
        <div class="flex flex-wrap gap-0.5 mt-0.5">
          <span
            v-for="(evt, i) in cell.events.slice(0, 3)"
            :key="i"
            class="w-2 h-2 rounded-full inline-block"
            style="background:var(--danger)"
            :title="evt.label"
          ></span>
          <span v-if="cell.events.length > 3" class="text-[9px] text-muted">+{{ cell.events.length - 3 }}</span>
        </div>
      </div>
    </div>

    <!-- Event detail panel -->
    <div v-if="selectedCell && selectedCell.events.length > 0" class="mt-3 p-3 rounded-lg" style="background:var(--filter-bg);border:1px solid var(--filter-border)">
      <div class="flex justify-between items-center mb-2">
        <h4 class="text-sm font-semibold text-secondary">{{ formatCellDate(selectedCell) }}</h4>
        <button @click="selectedCell = null" class="text-muted hover:text-secondary text-lg">&times;</button>
      </div>
      <ul class="space-y-1">
        <li v-for="(evt, i) in selectedCell.events" :key="i" class="flex items-center gap-2 text-xs">
          <span class="w-2 h-2 rounded-full inline-block flex-shrink-0" style="background:var(--danger)"></span>
          <span class="font-medium" style="color:var(--danger-dark)">{{ evt.label }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { borrowingService, inventoryService, userService } from '../utils/services'

export default {
  setup() {
    const currentYear = ref(new Date().getFullYear())
    const currentMonth = ref(new Date().getMonth())
    const selectedCell = ref(null)
    const eventsList = ref([])

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

    const loadEvents = async () => {
      try {
        const requests = await borrowingService.getAllRequests()
        const events = []

        for (const req of requests) {
          // Only process approved requests with return dates
          if (req.status === 'Approved' && req.returnDate) {
            let itemName = req.itemName || 'Unknown Item'
            let borrowerName = req.borrowerID

            try {
              const item = await inventoryService.getItemById(req.itemID)
              if (item) itemName = item.name
            } catch (e) { /* use fallback name */ }

            try {
              const borrower = await userService.getUserById(req.borrowerID)
              if (borrower) borrowerName = borrower.name
            } catch (e) { /* use fallback ID */ }

            events.push({
              date: new Date(req.returnDate).toDateString(),
              type: 'due',
              label: `Return Due: ${itemName} (${borrowerName})`
            })
          }
        }

        eventsList.value = events
      } catch (e) {
        console.error('Failed to load calendar events:', e)
        eventsList.value = []
      }
    }

    const calendarCells = computed(() => {
      const year = currentYear.value
      const month = currentMonth.value
      const firstDay = new Date(year, month, 1).getDay()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const daysInPrevMonth = new Date(year, month, 0).getDate()
      const today = new Date()
      const events = eventsList.value

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

    onMounted(() => {
      loadEvents()
    })

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
