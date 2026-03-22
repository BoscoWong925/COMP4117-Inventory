<script setup>
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps({
  class: { type: String, default: '' }
})

const classes = computed(() => cn(
  'rounded-xl border border-border bg-card text-card-foreground shadow-sm',
  props.class
))
</script>

<template>
  <div :class="classes"><slot /></div>
</template>
