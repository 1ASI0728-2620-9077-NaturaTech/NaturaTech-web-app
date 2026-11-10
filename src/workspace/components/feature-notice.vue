<script setup lang="ts">
defineProps<{ demo: boolean }>();
</script>
<template>
  <div v-if="!demo" class="workspace-notice" role="status">
    <i class="pi pi-info-circle" aria-hidden="true"></i>
    <div>
      <strong>Esta función estará disponible próximamente.</strong>
      <p>
        Mientras completamos la conexión, puedes explorar el recorrido con datos
        de ejemplo.
      </p>
    </div>
    <router-link
      class="ps-btn ps-btn--outline"
      :to="`/preview/${String($route.name)}`"
      >Explorar demo <i class="pi pi-arrow-up-right" aria-hidden="true"></i
    ></router-link>
  </div>
</template>
