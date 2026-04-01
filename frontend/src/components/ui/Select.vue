<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  class: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' }
})

const emit = defineEmits(['update:modelValue'])

const classes = computed(() => cn(
  'flex h-9 w-full rounded-lg border border-border bg-input px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50',
  props.class
))
</script>

<template>
  <select :class="classes" :value="modelValue" @change="emit('update:modelValue', $event.target.value)" v-bind="$attrs">
    <slot />
  </select>
</template>
