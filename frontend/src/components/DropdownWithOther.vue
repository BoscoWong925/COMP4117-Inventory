<template>
  <div>
    <select
      :value="selectedValue"
      @change="handleChange($event.target.value)"
      class="form-select"
    >
      <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
    </select>
    <input
      v-if="showOtherInput"
      type="text"
      :placeholder="placeholder"
      v-model="otherValue"
      @keyup.enter="addOtherValue"
      class="form-input mt-2"
    />
    <button
      v-if="showOtherInput && otherValue.trim()"
      @click="addOtherValue"
      type="button"
      class="mt-1 text-xs text-accent-subtle hover:underline"
    >+ Add "{{ otherValue.trim() }}"</button>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  props: {
    modelValue: { type: String, default: '' },
    options: { type: Array, required: true },
    placeholder: { type: String, default: 'Enter custom value...' }
  },
  emits: ['update:modelValue', 'add-option'],
  setup(props, { emit }) {
    const otherValue = ref('')
    const selectedValue = computed(() => props.modelValue)
    const showOtherInput = computed(() => props.modelValue === 'Other')

    const handleChange = (val) => {
      emit('update:modelValue', val)
      if (val !== 'Other') otherValue.value = ''
    }

    const addOtherValue = () => {
      const val = otherValue.value.trim()
      if (!val) return
      emit('add-option', val)
      emit('update:modelValue', val)
      otherValue.value = ''
    }

    return { selectedValue, showOtherInput, otherValue, handleChange, addOtherValue }
  }
}
</script>
