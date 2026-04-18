<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  class: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' }
})

const emit = defineEmits(['update:modelValue'])

const classes = computed(() => cn(
  'ui-select flex h-9 w-full rounded-lg border border-border bg-input px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50',
  props.class
))
</script>

<template>
  <select :class="classes" :value="modelValue" @change="emit('update:modelValue', $event.target.value)" v-bind="$attrs">
    <slot />
  </select>
</template>

<style scoped>
.ui-select {
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  background-size: 12px 12px;
}

.ui-select:hover {
  background-color: var(--card);
}

.ui-select::-ms-expand {
  display: none;
}
</style>
