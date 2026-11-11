<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import {
  integrationApi as api,
  integrationError,
  type Analysis,
} from "../services/integration-api";
import { validateImage } from "../model";
import { loadPersonalPlants } from "@/shared/services/personal-workspace.service";
import type { Plant } from "@/plant-management/model/plant.entity";
const available = ref(false),
  capabilitiesLoaded = ref(false),
  loading = ref(true),
  busy = ref(false),
  error = ref(""),
  preview = ref("");
const nextCursor = ref<string | null>(null);
async function history(append = false) {
  const page = await api.analyses(append ? (nextCursor.value ?? "0") : "0");
  items.value = append
    ? [
        ...items.value,
        ...page.items.filter(
          (item) => !items.value.some((existing) => existing.id === item.id),
        ),
      ]
    : page.items;
  nextCursor.value = page.nextCursor;
}
async function more() {
  busy.value = true;
  try {
    await history(true);
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
const plants = ref<Plant[]>([]),
  plantId = ref<number | null>(null),
  file = ref<File>(),
  items = ref<Analysis[]>([]),
  current = ref<Analysis>();
const processing = computed(
  () =>
    !!current.value && ["QUEUED", "PROCESSING"].includes(current.value.status),
);
async function retryAnalysis() {
  renewKey();
  current.value = undefined;
  await submit();
}
let key = crypto.randomUUID(),
  timer: ReturnType<typeof setTimeout> | undefined,
  disposed = false;
function renewKey() {
  key = crypto.randomUUID();
}
function clear() {
  if (preview.value) URL.revokeObjectURL(preview.value);
  preview.value = "";
  file.value = undefined;
  key = crypto.randomUUID();
}
function select(event: Event) {
  clear();
  const selected = (event.target as HTMLInputElement).files?.[0];
  if (!selected) return;
  error.value = validateImage(selected) || "";
  if (error.value) return;
  file.value = selected;
  preview.value = URL.createObjectURL(selected);
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [caps, context] = await Promise.all([
      api.capabilities(),
      loadPersonalPlants(),
    ]);
    available.value = caps.plantAnalysis;
    capabilitiesLoaded.value = true;
    plants.value = context.plants;
    await history();
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    loading.value = false;
  }
}
async function refresh(id: string, attempt = 0) {
  clearTimeout(timer);
  try {
    const result = await api.analysis(id);
    if (disposed) return;
    current.value = result;
    if (["QUEUED", "PROCESSING"].includes(result.status) && attempt < 20)
      timer = setTimeout(() => void refresh(id, attempt + 1), 3000);
    else await history();
  } catch (e) {
    if (!disposed) error.value = integrationError(e);
  }
}
async function submit() {
  if (!file.value || busy.value || processing.value || !available.value) return;
  busy.value = true;
  error.value = "";
  try {
    const job = await api.submitImage(file.value, plantId.value, key);
    await refresh(job.id);
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
async function remove(id: string) {
  if (!window.confirm("¿Eliminar este análisis de tu historial?")) return;
  busy.value = true;
  try {
    await api.deleteAnalysis(id);
    if (current.value?.id === id) current.value = undefined;
    await load();
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
onMounted(load);
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(timer);
  clear();
});
</script>
<template>
  <div class="workspace-page">
    <div class="ps-page-header">
      <div>
        <span class="eyebrow">SALUD DE PLANTAS</span>
        <h1 class="ps-page-header__title">Conoce mejor tu planta</h1>
        <p class="ps-page-header__subtitle">
          Fotografías, orientación y un historial de cuidado.
        </p>
      </div>
      <button class="ps-btn ps-btn--outline" :disabled="loading" @click="load">
        Actualizar
      </button>
    </div>
    <p v-if="error" role="alert" class="ps-alert ps-alert--error">
      {{ error }}
    </p>
    <p v-if="loading" role="status">Consultando tu jardín…</p>
    <p v-else-if="capabilitiesLoaded && !available" class="ps-alert">
      El servidor todavía no tiene configurado Gemini. Tu historial sigue
      disponible.
    </p>
    <div class="feature-grid">
      <section class="ps-card panel">
        <h2>Fotografía de tu planta</h2>
        <label class="ps-input-group"
          >Planta (opcional)<select
            v-model="plantId"
            :disabled="busy"
            @change="renewKey"
          >
            <option :value="null">Sin asociar</option>
            <option v-for="p in plants" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select></label
        >
        <label class="ps-input-group"
          >Selecciona una fotografía<input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            :disabled="!available || busy || processing"
            @change="select"
        /></label>
        <p class="muted">
          JPG, PNG o WebP · Máximo 10 MB. Las fotos se procesan con Gemini.
        </p>
        <img
          v-if="preview"
          :src="preview"
          alt="Vista previa de tu planta"
          style="max-width: 100%; max-height: 280px; object-fit: contain"
        />
        <button
          class="ps-btn ps-btn--primary"
          :disabled="!file || busy || !available || processing"
          @click="submit"
        >
          {{
            busy
              ? "Enviando…"
              : processing
                ? "Analizando tu planta…"
                : "Analizar fotografía"
          }}
        </button>
      </section>
      <section class="ps-card panel" aria-live="polite">
        <h2>Resultado</h2>
        <template v-if="current"
          ><p class="soft-tag">{{ current.status }}</p>
          <p v-if="['QUEUED', 'PROCESSING'].includes(current.status)">
            Tu fotografía está en proceso. Puedes consultar el estado sin
            enviarla otra vez.
          </p>
          <p v-if="current.status === 'FAILED'">
            {{
              integrationError({
                response: { status: 502, data: { code: current.errorCode } },
              })
            }}
          </p>
          <button
            v-if="current.status === 'FAILED' && file"
            class="ps-btn ps-btn--primary"
            :disabled="busy"
            @click="retryAnalysis"
          >
            Reintentar esta fotografía
          </button>
          <h3 v-if="current.species">{{ current.species }}</h3>
          <p>{{ current.summary }}</p>
          <ul>
            <li v-for="text in current.observations" :key="text">{{ text }}</li>
          </ul>
          <ul>
            <li v-for="text in current.recommendations" :key="text">
              {{ text }}
            </li>
          </ul>
          <button class="ps-btn ps-btn--outline" @click="refresh(current.id)">
            Consultar estado
          </button></template
        >
        <p v-else class="muted">Selecciona una foto o un análisis anterior.</p>
        <p class="muted">
          La orientación puede ser inconclusa; no garantiza un diagnóstico.
        </p>
      </section>
    </div>
    <section class="ps-card panel">
      <h2>Historial</h2>
      <button
        v-if="nextCursor"
        class="ps-btn ps-btn--outline"
        :disabled="busy"
        @click="more"
      >
        Cargar anteriores
      </button>
      <p v-if="!items.length && !loading">Todavía no tienes análisis.</p>
      <div v-for="item in items" :key="item.id" class="live-row">
        <span
          >{{ new Date(item.createdAt).toLocaleString() }} ·
          {{ item.status }}</span
        >
        <div>
          <button class="ps-btn ps-btn--outline" @click="refresh(item.id)">
            Ver resultado
          </button>
          <button
            class="ps-btn ps-btn--outline"
            :disabled="busy || ['QUEUED', 'PROCESSING'].includes(item.status)"
            @click="remove(item.id)"
          >
            Eliminar
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
<style scoped>
.live-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 0;
  border-bottom: 1px solid var(--ps-border);
}
select {
  padding: 0.7rem;
  background: var(--ps-surface);
  color: var(--ps-text);
  max-width: 100%;
}
</style>
