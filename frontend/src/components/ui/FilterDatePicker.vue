<script setup>
import { computed, ref, watch } from 'vue'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import UiDropdownMenu from './DropdownMenu.vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Select date' },
  class: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const parseIsoDate = (value) => {
  if (!value || typeof value !== 'string') return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  if (Number.isNaN(date.getTime())) return null
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return date
}

const toIsoDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const selectedDate = computed(() => parseIsoDate(props.modelValue))

const currentViewSeed = selectedDate.value || new Date()
const viewYear = ref(currentViewSeed.getFullYear())
const viewMonth = ref(currentViewSeed.getMonth())

watch(
  () => props.modelValue,
  (value) => {
    const parsed = parseIsoDate(value)
    if (!parsed) return
    viewYear.value = parsed.getFullYear()
    viewMonth.value = parsed.getMonth()
  }
)

const monthStart = computed(() => new Date(viewYear.value, viewMonth.value, 1))
const daysInMonth = computed(() => new Date(viewYear.value, viewMonth.value + 1, 0).getDate())
const leadingDays = computed(() => monthStart.value.getDay())

const monthLabel = computed(() => {
  return monthStart.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const calendarDays = computed(() => {
  const days = []
  const prevMonthLast = new Date(viewYear.value, viewMonth.value, 0).getDate()

  for (let i = leadingDays.value - 1; i >= 0; i--) {
    days.push({ date: new Date(viewYear.value, viewMonth.value - 1, prevMonthLast - i), outside: true })
  }

  for (let day = 1; day <= daysInMonth.value; day++) {
    days.push({ date: new Date(viewYear.value, viewMonth.value, day), outside: false })
  }

  let nextDay = 1
  while (days.length % 7 !== 0 || days.length < 42) {
    days.push({ date: new Date(viewYear.value, viewMonth.value + 1, nextDay), outside: true })
    nextDay += 1
  }

  return days
})

const displayValue = computed(() => {
  if (!selectedDate.value) return props.placeholder
  return selectedDate.value.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
})

const triggerClasses = computed(() => cn('filter-date-trigger', props.class))

const previousMonth = () => {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
    return
  }
  viewMonth.value -= 1
}

const nextMonth = () => {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
    return
  }
  viewMonth.value += 1
}

const isSameDay = (a, b) => {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const isToday = (date) => {
  const today = new Date()
  return isSameDay(date, today)
}

const isSelected = (date) => {
  if (!selectedDate.value) return false
  return isSameDay(date, selectedDate.value)
}

const selectDay = (date, close) => {
  emit('update:modelValue', toIsoDate(date))
  if (close) close()
}

const clearDate = (close) => {
  emit('update:modelValue', '')
  if (close) close()
}

const jumpToday = () => {
  const today = new Date()
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
}
</script>

<template>
  <UiDropdownMenu align="start" class="filter-date-menu" v-bind="$attrs">
    <template #trigger>
      <button :class="triggerClasses" type="button">
        <Calendar :size="13" class="filter-date-leading-icon" />
        <span :class="['filter-date-text', { 'filter-date-text--placeholder': !modelValue }]">
          {{ displayValue }}
        </span>
        <span
          v-if="modelValue"
          class="filter-date-clear"
          role="button"
          tabindex="0"
          aria-label="Clear date"
          @click.stop.prevent="clearDate()"
          @keydown.enter.stop.prevent="clearDate()"
          @keydown.space.stop.prevent="clearDate()"
        >
          <X :size="12" />
        </span>
        <ChevronDown :size="13" class="filter-date-chevron" />
      </button>
    </template>

    <template #default="{ close }">
      <div class="filter-date-panel">
        <div class="filter-date-header">
          <button class="filter-date-nav" type="button" @click.stop="previousMonth">
            <ChevronLeft :size="14" />
          </button>
          <span class="filter-date-month">{{ monthLabel }}</span>
          <button class="filter-date-nav" type="button" @click.stop="nextMonth">
            <ChevronRight :size="14" />
          </button>
        </div>

        <div class="filter-date-weekdays">
          <span v-for="day in weekdays" :key="day" class="filter-date-weekday">{{ day }}</span>
        </div>

        <div class="filter-date-grid">
          <button
            v-for="cell in calendarDays"
            :key="cell.date.toISOString()"
            type="button"
            :class="[
              'filter-date-day',
              { 'filter-date-day--outside': cell.outside },
              { 'filter-date-day--today': isToday(cell.date) },
              { 'filter-date-day--selected': isSelected(cell.date) }
            ]"
            @click.stop="selectDay(cell.date, close)"
          >
            {{ cell.date.getDate() }}
          </button>
        </div>

        <div class="filter-date-footer">
          <button type="button" class="filter-date-action" @click.stop="jumpToday">Today</button>
          <button v-if="modelValue" type="button" class="filter-date-action filter-date-action--danger" @click.stop="clearDate(close)">
            Clear
          </button>
        </div>
      </div>
    </template>
  </UiDropdownMenu>
</template>

<style scoped>
.filter-date-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  min-height: 2.25rem;
  padding: 0.4rem 0.7rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--input);
  color: var(--text-primary);
  font-size: 0.8125rem;
  line-height: 1.2;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  text-align: left;
}

.filter-date-trigger:hover {
  background: var(--card);
}

.filter-date-trigger:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 24%, transparent);
}

.filter-date-leading-icon {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.filter-date-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-date-text--placeholder {
  color: var(--muted-foreground);
}

.filter-date-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
  border-radius: 999px;
  padding: 0.05rem;
}

.filter-date-clear:hover {
  color: var(--text-primary);
  background: var(--surface-100);
}

.filter-date-chevron {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.filter-date-menu {
  min-width: 16rem;
}

.filter-date-panel {
  width: 16rem;
  padding: 0.25rem;
}

.filter-date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0.2rem 0.4rem;
}

.filter-date-month {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
}

.filter-date-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}

.filter-date-nav:hover {
  background: var(--surface-100);
  color: var(--text-primary);
}

.filter-date-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.2rem;
  padding: 0 0.1rem;
}

.filter-date-weekday {
  text-align: center;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0;
}

.filter-date-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.2rem;
  padding: 0.1rem;
}

.filter-date-day {
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  min-height: 1.65rem;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.72rem;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.filter-date-day:hover {
  background: var(--surface-100);
}

.filter-date-day--outside {
  color: var(--muted-foreground);
  opacity: 0.55;
}

.filter-date-day--today {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
}

.filter-date-day--selected {
  background: var(--accent);
  color: var(--accent-foreground);
  border-color: var(--accent);
}

.filter-date-day--selected:hover {
  background: color-mix(in srgb, var(--accent) 90%, black 10%);
}

.filter-date-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.2rem 0.15rem;
}

.filter-date-action {
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.15rem 0.25rem;
}

.filter-date-action:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.filter-date-action--danger {
  color: var(--danger);
}

.filter-date-action--danger:hover {
  color: var(--danger-dark);
}
</style>
