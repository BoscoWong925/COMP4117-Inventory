<script setup>
import { cn } from '@/lib/utils'
import { computed } from 'vue'

const props = defineProps({
  class: { type: String, default: '' },
  modelValue: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const classes = computed(() => cn(
  'flex w-full rounded-lg border border-border bg-input px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:border-accent disabled:cursor-not-allowed disabled:opacity-50 resize-vertical min-h-[5rem]',
  props.class
))
</script>

<template>
  <textarea :class="classes" :value="modelValue" @input="emit('update:modelValue', $event.target.value)" v-bind="$attrs" />
</template>
