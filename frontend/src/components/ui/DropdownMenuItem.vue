<script setup>
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps({
  class: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  destructive: { type: Boolean, default: false },
  separator: { type: Boolean, default: false },
  label: { type: Boolean, default: false },
  checkable: { type: Boolean, default: false },
  checked: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

const classes = computed(() => {
  if (props.separator) return 'dropdown-menu-separator'
  if (props.label) return cn('dropdown-menu-label', props.class)
  return cn(
    'dropdown-menu-item',
    props.destructive && 'dropdown-menu-item--destructive',
    props.disabled && 'dropdown-menu-item--disabled',
    props.class
  )
})

function handleClick(e) {
  if (props.disabled || props.separator || props.label) return
  emit('click', e)
}
</script>

<template>
  <div v-if="separator" class="dropdown-menu-separator" />
  <div v-else-if="label" :class="classes">
    <slot />
  </div>
  <button v-else :class="classes" :disabled="disabled" @click="handleClick" type="button">
    <span v-if="checkable" class="dropdown-check-area">
      <svg v-if="checked" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
    <slot />
  </button>
</template>

<style scoped>
.dropdown-menu-item {
  position: relative;
  display: flex;
  cursor: pointer;
  user-select: none;
  align-items: center;
  gap: 0.5rem;
  border-radius: calc(var(--radius-lg, 0.5rem) - 4px);
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  outline: none;
  transition: background 0.1s, color 0.1s;
}
.dropdown-menu-item:hover {
  background: var(--surface-100);
  color: var(--text-primary);
}
.dropdown-menu-item:focus-visible {
  background: var(--surface-100);
  color: var(--text-primary);
}
.dropdown-menu-item--destructive {
  color: var(--danger);
}
.dropdown-menu-item--destructive:hover {
  background: var(--danger-light);
  color: var(--danger);
}
.dropdown-menu-item--disabled {
  pointer-events: none;
  opacity: 0.5;
}
.dropdown-menu-separator {
  height: 1px;
  margin: 0.25rem -0.25rem;
  background: var(--border);
}
.dropdown-menu-label {
  padding: 0.375rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.dropdown-check-area {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}
</style>
