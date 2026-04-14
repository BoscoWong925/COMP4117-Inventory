/**
 * Global action lock — prevents navigation while async operations are running
 * and provides a unified progress overlay to the user.
 *
 * Uses module-level refs so every component shares the same state.
 */
import { ref, readonly } from 'vue'

const actionInProgress = ref(false)
const actionMessage = ref('')
const actionProgress = ref('')  // e.g. "3 / 10"

/**
 * Run an async action with the global lock.
 * While the action is running:
 *   - actionInProgress is true (nav guard blocks leaving)
 *   - actionMessage is displayed in the overlay
 *   - For bulk ops, call onProgress to update "3 / 10" text
 *
 * @param {string} message - Displayed in overlay, e.g. "Deleting items..."
 * @param {(onProgress: (current: number, total: number) => void) => Promise<any>} fn
 * @returns {Promise<any>} the return value of fn
 */
const runAction = async (message, fn) => {
  actionInProgress.value = true
  actionMessage.value = message
  actionProgress.value = ''

  const onProgress = (current, total) => {
    actionProgress.value = `${current} / ${total}`
  }

  try {
    return await fn(onProgress)
  } finally {
    actionInProgress.value = false
    actionMessage.value = ''
    actionProgress.value = ''
  }
}

export function useActionLock() {
  return {
    actionInProgress: readonly(actionInProgress),
    actionMessage: readonly(actionMessage),
    actionProgress: readonly(actionProgress),
    runAction,
    // Expose raw ref for App.vue nav guard
    _actionInProgress: actionInProgress,
  }
}
