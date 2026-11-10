<script setup lang="ts">
interface Props {
  message: string;
}

defineProps<Props>();

const emit = defineEmits<{
  dismiss: [];
}>();

function handleDismiss() {
  emit('dismiss');
}
</script>

<template>
  <div
    class="error-notification"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
  >
    <div class="error-notification__content">
      <i class="pi pi-exclamation-circle error-notification__icon" aria-hidden="true"></i>
      <span class="error-notification__message">{{ message }}</span>
    </div>
    <button
      class="error-notification__dismiss"
      type="button"
      aria-label="Dismiss error notification"
      @click="handleDismiss"
    >
      <i class="pi pi-times" aria-hidden="true"></i>
    </button>
  </div>
</template>

<style scoped>
.error-notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background-color: var(--p-red-50, #fef2f2);
  border: 1px solid var(--p-red-200, #fecaca);
  color: var(--p-red-700, #b91c1c);
  margin-bottom: 0.5rem;
  animation: slideIn 0.3s ease-out;
}

.error-notification__content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.error-notification__icon {
  font-size: 1.25rem;
  color: var(--p-red-500, #ef4444);
}

.error-notification__message {
  font-size: 0.875rem;
  line-height: 1.4;
}

.error-notification__dismiss {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  min-width: 44px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: var(--p-red-500, #ef4444);
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.error-notification__dismiss:hover {
  background-color: var(--p-red-100, #fee2e2);
}

.error-notification__dismiss:focus-visible {
  outline: 2px solid var(--p-red-500, #ef4444);
  outline-offset: 2px;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dark mode support */
:root[data-theme='dark'] .error-notification,
.p-dark .error-notification {
  background-color: var(--p-red-900, #7f1d1d);
  border-color: var(--p-red-700, #b91c1c);
  color: var(--p-red-100, #fee2e2);
}

:root[data-theme='dark'] .error-notification__icon,
.p-dark .error-notification__icon {
  color: var(--p-red-300, #fca5a5);
}

:root[data-theme='dark'] .error-notification__dismiss,
.p-dark .error-notification__dismiss {
  color: var(--p-red-300, #fca5a5);
}

:root[data-theme='dark'] .error-notification__dismiss:hover,
.p-dark .error-notification__dismiss:hover {
  background-color: var(--p-red-800, #991b1b);
}
</style>
