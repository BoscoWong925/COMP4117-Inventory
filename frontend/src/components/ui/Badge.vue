<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  variant: { type: String, default: 'default' },
  class: { type: String, default: '' }
})

const classes = computed(() => cn(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    'bg-surface-200/60 text-surface-700': props.variant === 'default',
    'bg-success-light text-success border border-success/20': props.variant === 'success',
    'bg-danger-light text-danger border border-danger/20': props.variant === 'destructive',
    'bg-warning-light text-warning-dark border border-warning/20': props.variant === 'warning',
    'bg-info-light text-info border border-info/20': props.variant === 'info',
    'bg-accent/10 text-accent border border-accent/20': props.variant === 'accent',
    'bg-surface-100 text-surface-500 border border-surface-200': props.variant === 'outline',
    'bg-danger/10 text-danger animate-pulse border border-danger/30': props.variant === 'urgent',
  },
  props.class
))
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
