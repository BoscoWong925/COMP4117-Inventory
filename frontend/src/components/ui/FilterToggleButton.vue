<script setup>
import { computed } from 'vue'
import { SlidersHorizontal } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false
})

const props = defineProps({
  expanded: { type: Boolean, default: false },
  moreLabel: { type: String, default: 'More Filters' },
  lessLabel: { type: String, default: 'Less Filters' },
  count: { type: Number, default: 0 },
  class: { type: String, default: '' }
})

const classes = computed(() => cn(
  'filter-toggle-btn',
  { 'filter-toggle-btn--active': props.expanded },
  props.class
))
</script>

<template>
  <button :class="classes" type="button" v-bind="$attrs">
    <SlidersHorizontal :size="12" />
    <span>{{ expanded ? lessLabel : moreLabel }}</span>
    <span v-if="count > 0" class="filter-toggle-badge">{{ count }}</span>
  </button>
</template>

<style scoped>
.filter-toggle-btn {
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
  position: relative;
  line-height: 1.1;
}

.filter-toggle-btn:hover {
  background: var(--surface-100);
  color: var(--text-secondary);
}

.filter-toggle-btn:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 24%, transparent);
}

.filter-toggle-btn--active {
  border-color: var(--accent);
  color: var(--accent);
}

.filter-toggle-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1;
  color: var(--accent);
  background: var(--accent-surface);
  border-radius: 999px;
}

.filter-toggle-btn--active .filter-toggle-badge {
  color: #fff;
  background: var(--accent);
}
</style>