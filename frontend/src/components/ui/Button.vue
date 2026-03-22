<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  class: { type: String, default: '' },
  as: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false }
})

const classes = computed(() => cn(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    'bg-accent text-white shadow-sm hover:bg-accent/90': props.variant === 'default',
    'bg-danger text-white shadow-sm hover:bg-danger/90': props.variant === 'destructive',
    'border border-border bg-transparent shadow-sm hover:bg-surface-100 hover:text-surface-900': props.variant === 'outline',
    'bg-surface-100 text-surface-900 shadow-sm hover:bg-surface-200': props.variant === 'secondary',
    'hover:bg-surface-100 hover:text-surface-900': props.variant === 'ghost',
    'text-accent underline-offset-4 hover:underline': props.variant === 'link',
    'bg-success text-white shadow-sm hover:bg-success/90': props.variant === 'success',
  },
  {
    'h-8 rounded-md px-3 text-xs': props.size === 'sm',
    'h-9 rounded-lg px-4 text-sm': props.size === 'default',
    'h-10 rounded-lg px-6 text-sm': props.size === 'lg',
    'h-9 w-9 rounded-lg p-0': props.size === 'icon',
  },
  props.class
))
</script>

<template>
  <component :is="as" :class="classes" :disabled="disabled">
    <slot />
  </component>
</template>
