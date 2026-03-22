<template>
  <div :class="['login-page', darkMode ? '' : 'light-mode']">
    <!-- Animated background -->
    <div class="login-bg">
      <div class="login-orb login-orb-1"></div>
      <div class="login-orb login-orb-2"></div>
      <div class="login-orb login-orb-3"></div>
    </div>

    <!-- Theme toggle -->
    <button @click="$emit('toggle-theme')" class="theme-toggle-login">
      <svg v-if="darkMode" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    </button>

    <div class="login-container">
      <div class="login-card">
        <!-- Logo + Title -->
        <div class="login-header">
          <div class="login-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <h1 class="login-title">Inventory</h1>
          <p class="login-subtitle">COMP Department</p>
        </div>

        <!-- Error -->
        <div v-if="error" class="login-error animate-in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {{ error }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="login-form">
          <div class="input-group">
            <label class="input-label">Username</label>
            <div class="input-wrapper">
              <span class="input-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
              <input
                type="text"
                v-model="username"
                class="login-input"
                placeholder="Enter username"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Password</label>
            <div class="input-wrapper">
              <span class="input-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                class="login-input"
                placeholder="Enter password"
                autocomplete="current-password"
              />
              <button type="button" @click="showPassword = !showPassword" class="input-eye">
                <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <button type="submit" class="login-btn" :disabled="loading">
            <span v-if="loading" class="login-spinner"></span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <!-- Demo Credentials -->
        <div v-if="showDemoCredentials" class="demo-section">
          <button @click="showDemoExpanded = !showDemoExpanded" class="demo-toggle">
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>Demo Credentials</span>
            <span class="demo-chevron" :style="{transform: showDemoExpanded ? 'rotate(180deg)' : ''}">▾</span>
          </button>
          <div v-if="showDemoExpanded" class="demo-list animate-in">
            <button @click="fillDemo('admin', 'admin123')" class="demo-item">
              <span class="demo-badge demo-badge-admin">Admin</span>
              <span class="demo-creds">admin / admin123</span>
            </button>
            <button @click="fillDemo('operator', 'operator123')" class="demo-item">
              <span class="demo-badge demo-badge-op">Operator</span>
              <span class="demo-creds">operator / operator123</span>
            </button>
            <button @click="fillDemo('teacher1', 'teacher123')" class="demo-item">
              <span class="demo-badge demo-badge-user" style="background:#8b5cf6;color:white">Teacher</span>
              <span class="demo-creds">teacher1 / teacher123</span>
            </button>
            <button @click="fillDemo('student1', 'student123')" class="demo-item">
              <span class="demo-badge demo-badge-user" style="background:#06b6d4;color:white">Student</span>
              <span class="demo-creds">student1 / student123</span>
            </button>
          </div>
        </div>
      </div>

      <p class="login-footer">© 2025 University COMP Department</p>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  props: {
    onLogin: { type: Function, required: true },
    darkMode: { type: Boolean, default: true },
  },
  emits: ['toggle-theme'],
  setup(props) {
    const username = ref('')
    const password = ref('')
    const error = ref('')
    const showDemoCredentials = ref(true)
    const showDemoExpanded = ref(false)
    const showPassword = ref(false)
    const loading = ref(false)

    const handleSubmit = async () => {
      if (!username.value || !password.value) {
        error.value = 'Please enter username and password'
        return
      }

      error.value = ''
      loading.value = true
      try {
        const ok = await props.onLogin(username.value, password.value)
        if (!ok) {
          error.value = 'Invalid username or password'
        }
      } catch (e) {
        error.value = e.message || 'Login failed. Please try again.'
      } finally {
        loading.value = false
      }
    }

    const fillDemo = (u, p) => {
      username.value = u
      password.value = p
    }

    return {
      username,
      password,
      error,
      showDemoCredentials,
      showDemoExpanded,
      showPassword,
      loading,
      handleSubmit,
      fillDemo,
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: var(--background);
  padding: 1rem;
}

/* ===== Animated Background Orbs ===== */
.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.login-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation: orbFloat 8s ease-in-out infinite;
}

.login-orb-1 {
  width: 300px; height: 300px;
  background: #A6B1E1;
  top: -80px; left: -60px;
  animation-delay: 0s;
}
.login-orb-2 {
  width: 250px; height: 250px;
  background: #424874;
  bottom: -60px; right: -40px;
  animation-delay: 2s;
}
.login-orb-3 {
  width: 200px; height: 200px;
  background: #DCD6F7;
  top: 50%; left: 60%;
  animation-delay: 4s;
}

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
}

/* ===== Theme Toggle ===== */
.theme-toggle-login {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface-glass);
  backdrop-filter: blur(12px);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}
.theme-toggle-login:active {
  transform: scale(0.9);
}

/* ===== Login Container ===== */
.login-container {
  width: 100%;
  max-width: 24rem;
  z-index: 1;
}

.login-card {
  background: var(--surface-glass);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);
  padding: 2rem 1.5rem;
  box-shadow: var(--shadow-xl);
}

@media (min-width: 640px) {
  .login-card {
    padding: 2.5rem 2rem;
  }
}

/* ===== Login Header ===== */
.login-header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.login-logo {
  margin-bottom: 0.5rem;
  color: var(--accent);
  animation: logoPulse 3s ease-in-out infinite;
  display: flex;
  justify-content: center;
}

@keyframes logoPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.login-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.login-subtitle {
  font-size: 0.875rem;
  color: var(--muted-foreground);
  margin-top: 0.25rem;
}

/* ===== Error ===== */
.login-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.75rem;
  color: #fca5a5;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.light-mode .login-error {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
}

/* ===== Form ===== */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.input-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-wrapper:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.input-icon {
  padding: 0 0.75rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--muted-foreground);
}

.login-input {
  flex: 1;
  padding: 0.75rem 0.75rem 0.75rem 0;
  font-size: 1rem;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  min-width: 0;
}

.login-input::placeholder {
  color: var(--muted-foreground);
}

.input-eye {
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--muted-foreground);
  display: flex;
  align-items: center;
  -webkit-tap-highlight-color: transparent;
}

/* ===== Login Button ===== */
.login-btn {
  width: 100%;
  padding: 0.875rem;
  margin-top: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #A6B1E1, #424874);
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-btn:hover {
  box-shadow: 0 0 24px rgba(166, 177, 225, 0.4);
  filter: brightness(1.08);
}

.login-btn:active {
  transform: scale(0.98);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Demo Section ===== */
.demo-section {
  margin-top: 1.5rem;
}

.demo-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.demo-chevron {
  transition: transform 0.2s;
  font-size: 0.75rem;
}

.demo-list {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.demo-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  background: var(--surface-2);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.demo-item:active {
  background: var(--accent-glow);
}

.demo-badge {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.demo-badge-admin { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.demo-badge-op { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.demo-badge-user { background: rgba(34, 197, 94, 0.15); color: #4ade80; }

.light-mode .demo-badge-admin { color: #dc2626; }
.light-mode .demo-badge-op { color: #d97706; }
.light-mode .demo-badge-user { color: #16a34a; }

.demo-creds {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  font-family: var(--font-mono, 'JetBrains Mono', 'SF Mono', monospace);
}

/* ===== Footer ===== */
.login-footer {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.animate-in {
  animation: fadeInUp 0.3s ease-out both;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
