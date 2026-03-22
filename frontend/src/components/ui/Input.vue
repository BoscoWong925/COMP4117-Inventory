<script setup>
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps({
  class: { type: String, default: '' }
})

const classes = computed(() => cn(
  'flex h-9 w-full rounded-lg border border-border bg-input px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50',
  props.class
))
</script>

<template>
  <input :class="classes" v-bind="$attrs" />
</template>
