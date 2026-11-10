<script setup lang="ts">
import Skeleton from "primevue/skeleton";

interface Props {
  lines?: number;
  width?: string;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  lines: 3,
  width: "100%",
  height: "1.2rem",
});
</script>

<template>
  <div
    class="loading-skeleton"
    role="status"
    aria-label="Loading content"
    aria-busy="true"
  >
    <Skeleton
      v-for="line in props.lines"
      :key="line"
      :width="props.width"
      :height="props.height"
      class="skeleton-line"
      :style="{ width: line === props.lines ? '75%' : props.width }"
    />
    <span class="sr-only">Loading...</span>
  </div>
</template>

<style scoped>
.loading-skeleton {
  padding: 0.5rem 0;
}
.skeleton-line {
  margin-bottom: 0.5rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
