<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 pt-4" style="border-top:1px solid var(--filter-border)">
    <p class="text-sm text-muted">
      Showing {{ startIndex + 1 }}–{{ Math.min(endIndex, totalItems) }} of {{ totalItems }}
    </p>
    <div class="flex gap-1">
      <button
        @click="$emit('update:currentPage', 1)"
        :disabled="currentPage === 1"
        class="px-2 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed" style="border-color:var(--filter-border)" @mouseenter="$event.target.style.background='var(--row-hover)'" @mouseleave="$event.target.style.background=''"
      >«</button>
      <button
        @click="$emit('update:currentPage', currentPage - 1)"
        :disabled="currentPage === 1"
        class="px-2 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed" style="border-color:var(--filter-border)" @mouseenter="$event.target.style.background='var(--row-hover)'" @mouseleave="$event.target.style.background=''"
      >‹</button>
      <button
        v-for="page in visiblePages"
        :key="page"
        @click="$emit('update:currentPage', page)"
        class="px-3 py-1 text-sm rounded border"
        :style="page === currentPage ? 'background:var(--accent);color:#fff;border-color:var(--accent)' : 'border-color:var(--filter-border)'"
        @mouseenter="page !== currentPage && ($event.target.style.background='var(--row-hover)')"
        @mouseleave="page !== currentPage && ($event.target.style.background='')"
      >{{ page }}</button>
      <button
        @click="$emit('update:currentPage', currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="px-2 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed" style="border-color:var(--filter-border)" @mouseenter="$event.target.style.background='var(--row-hover)'" @mouseleave="$event.target.style.background=''"
      >›</button>
      <button
        @click="$emit('update:currentPage', totalPages)"
        :disabled="currentPage === totalPages"
        class="px-2 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed" style="border-color:var(--filter-border)" @mouseenter="$event.target.style.background='var(--row-hover)'" @mouseleave="$event.target.style.background=''"
      >»</button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  props: {
    currentPage: { type: Number, required: true },
    totalItems: { type: Number, required: true },
    pageSize: { type: Number, default: 10 }
  },
  emits: ['update:currentPage'],
  setup(props) {
    const totalPages = computed(() => Math.ceil(props.totalItems / props.pageSize))
    const startIndex = computed(() => (props.currentPage - 1) * props.pageSize)
    const endIndex = computed(() => startIndex.value + props.pageSize)

    const visiblePages = computed(() => {
      const pages = []
      let start = Math.max(1, props.currentPage - 2)
      let end = Math.min(totalPages.value, start + 4)
      start = Math.max(1, end - 4)
      for (let i = start; i <= end; i++) pages.push(i)
      return pages
    })

    return { totalPages, startIndex, endIndex, visiblePages }
  }
}
</script>
