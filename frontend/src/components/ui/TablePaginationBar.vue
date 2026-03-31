<script setup>
import { computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import UiDropdownMenu from './DropdownMenu.vue'
import UiDropdownMenuItem from './DropdownMenuItem.vue'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  pageSize: { type: Number, required: true },
  pageSizeOptions: { type: Array, default: () => [10, 20, 30, 40, 50] },
  disabled: { type: Boolean, default: false },
  itemLabel: { type: String, default: 'items' }
})

const emit = defineEmits(['update:currentPage', 'update:pageSize'])

const totalPages = computed(() => {
  const total = Math.max(0, Number(props.totalItems) || 0)
  const size = Math.max(1, Number(props.pageSize) || 1)
  return Math.max(1, Math.ceil(total / size))
})

const safeCurrentPage = computed(() => {
  const page = Number(props.currentPage) || 1
  return Math.min(Math.max(page, 1), totalPages.value)
})

const pageStart = computed(() => {
  if (!props.totalItems) return 0
  return (safeCurrentPage.value - 1) * props.pageSize + 1
})

const pageEnd = computed(() => {
  if (!props.totalItems) return 0
  return Math.min(safeCurrentPage.value * props.pageSize, props.totalItems)
})

const pageInfo = computed(() => {
  if (!props.totalItems) return `0 of 0 ${props.itemLabel}`
  return `${pageStart.value}-${pageEnd.value} of ${props.totalItems}`
})

const pageIndicator = computed(() => `Page ${safeCurrentPage.value} of ${totalPages.value}`)

const visiblePages = computed(() => {
  const pages = []
  let start = Math.max(1, safeCurrentPage.value - 2)
  let end = Math.min(totalPages.value, start + 4)
  start = Math.max(1, end - 4)
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }
  return pages
})

const canGoPrev = computed(() => !props.disabled && safeCurrentPage.value > 1)
const canGoNext = computed(() => !props.disabled && safeCurrentPage.value < totalPages.value)

const setPage = (page) => {
  if (props.disabled) return
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === safeCurrentPage.value) return
  emit('update:currentPage', nextPage)
}

const setPageSize = (value) => {
  if (props.disabled) return
  const parsed = Number(value)
  if (!props.pageSizeOptions.includes(parsed)) return
  if (parsed === props.pageSize) return
  emit('update:pageSize', parsed)
}
</script>

<template>
  <div class="table-pagination-bar" :class="{ 'table-pagination-bar--disabled': disabled }">
    <div class="table-pagination-left">
      <div class="table-page-size-wrap">
        <span class="table-page-size-label">Rows per page</span>
        <UiDropdownMenu align="start">
          <template #trigger>
            <button class="table-page-size-trigger" :disabled="disabled">
              {{ pageSize }}
              <ChevronDown :size="10" />
            </button>
          </template>
          <template #default="{ close }">
            <UiDropdownMenuItem label>Rows per page</UiDropdownMenuItem>
            <UiDropdownMenuItem
              v-for="size in pageSizeOptions"
              :key="size"
              checkable
              :checked="size === pageSize"
              @click="setPageSize(size); close()"
            >
              {{ size }}
            </UiDropdownMenuItem>
          </template>
        </UiDropdownMenu>
      </div>
      <span class="table-pagination-info">{{ pageInfo }}</span>
    </div>

    <div class="table-pagination-right">
      <span class="table-pagination-page">{{ pageIndicator }}</span>
      <div class="table-pagination-buttons">
        <button class="table-page-btn" :disabled="!canGoPrev" @click="setPage(safeCurrentPage - 1)">‹</button>
        <button
          v-for="page in visiblePages"
          :key="page"
          class="table-page-btn"
          :class="{ active: page === safeCurrentPage }"
          :disabled="disabled"
          @click="setPage(page)"
        >
          {{ page }}
        </button>
        <button class="table-page-btn" :disabled="!canGoNext" @click="setPage(safeCurrentPage + 1)">›</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.625rem 1rem;
  border-top: 1px solid var(--border);
}

.table-pagination-bar--disabled {
  opacity: 0.82;
}

.table-pagination-left,
.table-pagination-right {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.table-page-size-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.table-page-size-label,
.table-pagination-info,
.table-pagination-page {
  font-size: 0.6875rem;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}

.table-page-size-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 3rem;
  height: 1.75rem;
  padding: 0 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s;
}

.table-page-size-trigger:hover {
  background: var(--surface-100);
  color: var(--text-primary);
}

.table-page-size-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  background: var(--surface-50);
  color: var(--muted-foreground);
}

.table-pagination-buttons {
  display: flex;
  gap: 0.125rem;
}

.table-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.625rem;
  height: 1.625rem;
  padding: 0 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s;
}

.table-page-btn:hover:not(:disabled) {
  background: var(--surface-100);
}

.table-page-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.table-page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
