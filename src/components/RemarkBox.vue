<template>
  <div>
    <label v-if="label" class="block text-gray-700 text-sm font-medium mb-1">{{ label }}</label>
    <textarea
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :rows="rows"
      :placeholder="placeholder"
      class="form-input"
    />
  </div>
</template>

<script>
export default {
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, default: '' },
    rows: { type: Number, default: 3 },
    placeholder: { type: String, default: 'Enter remarks...' }
  },
  emits: ['update:modelValue']
}
</script>
