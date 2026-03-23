<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  checked: { type: [Boolean, String], default: false },
  indeterminate: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  class: { type: String, default: '' }
})

const emit = defineEmits(['update:checked'])

const classes = computed(() => cn(
  'peer h-4 w-4 shrink-0 rounded border border-border shadow-sm transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'data-[state=checked]:bg-accent data-[state=checked]:text-white data-[state=checked]:border-accent',
  'data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-white data-[state=indeterminate]:border-accent',
  props.class
))

const state = computed(() => {
  if (props.indeterminate) return 'indeterminate'
  return props.checked ? 'checked' : 'unchecked'
})

function toggle() {
  if (props.disabled) return
  emit('update:checked', !props.checked)
}
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="indeterminate ? 'mixed' : checked"
    :data-state="state"
    :disabled="disabled"
    :class="classes"
    @click="toggle"
  >
    <span class="flex items-center justify-center">
      <svg v-if="indeterminate" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <line x1="2" y1="5" x2="8" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <svg v-else-if="checked" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  </button>
</template>
