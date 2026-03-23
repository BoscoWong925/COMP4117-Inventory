<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  class: { type: String, default: '' },
  align: { type: String, default: 'end' }, // 'start' | 'end'
  side: { type: String, default: 'bottom' } // 'bottom' | 'top'
})

const open = ref(false)
const triggerRef = ref(null)
const menuRef = ref(null)

function toggle() {
  open.value = !open.value
  if (open.value) {
    nextTick(() => positionMenu())
  }
}

function close() {
  open.value = false
}

function positionMenu() {
  if (!triggerRef.value || !menuRef.value) return
  const trigger = triggerRef.value.getBoundingClientRect()
  const menu = menuRef.value
  // Reset first
  menu.style.top = ''
  menu.style.bottom = ''
  menu.style.left = ''
  menu.style.right = ''

  if (props.side === 'bottom') {
    menu.style.top = '100%'
    menu.style.marginTop = '4px'
  } else {
    menu.style.bottom = '100%'
    menu.style.marginBottom = '4px'
  }

  if (props.align === 'end') {
    menu.style.right = '0'
  } else {
    menu.style.left = '0'
  }
}

function onClickOutside(e) {
  if (!triggerRef.value?.contains(e.target) && !menuRef.value?.contains(e.target)) {
    close()
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, true)
  document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, true)
  document.removeEventListener('keydown', onKeyDown)
})

defineExpose({ close })
</script>

<template>
  <div class="dropdown-menu-root" ref="triggerRef">
    <div @click.stop="toggle">
      <slot name="trigger" />
    </div>
    <Teleport to="body">
      <div v-if="open" class="dropdown-menu-backdrop" @click="close">
        <div
          ref="menuRef"
          :class="cn(
            'dropdown-menu-content',
            props.class
          )"
          :style="{
            position: 'fixed',
            top: triggerRef ? (triggerRef.getBoundingClientRect().bottom + 4) + 'px' : '0',
            left: align === 'start' ? (triggerRef ? triggerRef.getBoundingClientRect().left + 'px' : '0') : undefined,
            right: align === 'end' ? (triggerRef ? (window.innerWidth - triggerRef.getBoundingClientRect().right) + 'px' : '0') : undefined,
          }"
          @click.stop
        >
          <slot :close="close" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dropdown-menu-root {
  position: relative;
  display: inline-flex;
}
.dropdown-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
}
.dropdown-menu-content {
  z-index: 51;
  min-width: 10rem;
  overflow: hidden;
  border-radius: var(--radius-lg, 0.5rem);
  border: 1px solid var(--border);
  background: var(--card);
  padding: 0.25rem;
  color: var(--text-primary);
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1);
  animation: scaleIn 0.12s ease-out;
}

@keyframes scaleIn {
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
</style>
