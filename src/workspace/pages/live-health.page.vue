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
const fileInput = ref<HTMLInputElement>();
const dragging = ref(false);
const thumbnails = ref<Record<string, string>>({});
const analysisFiles = ref<
  Record<string, { file: File; plantId: number | null }>
>({});
const pollingPaused = ref(false);
let requestVersion = 0;
const statusNames: Record<string, string> = {
  QUEUED: "En espera",
  PROCESSING: "Analizando",
  SUCCEEDED: "Análisis completado",
  INCONCLUSIVE: "Necesitamos una foto más clara",
  FAILED: "No se pudo analizar",
};
function statusName(status: string) {
  return statusNames[status] || "Estado no disponible";
}
function plantName(id: number | null) {
  return plants.value.find((p) => p.id === id)?.name || "Sin planta asociada";
}
function dateLabel(date: string) {
  return new Date(date).toLocaleString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function choose(selected?: File) {
  if (!available.value || busy.value || processing.value || !selected) return;
  const invalid = validateImage(selected);
  clear();
  error.value = invalid || "";
  if (invalid) return;
  current.value = undefined;
  clearTimeout(timer);
  requestVersion++;
  file.value = selected;
  preview.value = URL.createObjectURL(selected);
}
function drop(event: DragEvent) {
  dragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 1) {
    error.value = "Selecciona una sola fotografía por análisis.";
    return;
  }
  choose(files?.[0]);
}
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
  const original = current.value && analysisFiles.value[current.value.id];
  if (!original) return;
  clear();
  file.value = original.file;
  plantId.value = original.plantId;
  preview.value = URL.createObjectURL(original.file);
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
  const element = event.target as HTMLInputElement;
  choose(element.files?.[0]);
  element.value = "";
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
  const version = ++requestVersion;
  pollingPaused.value = false;
  try {
    const result = await api.analysis(id);
    if (disposed || version !== requestVersion) return;
    current.value = result;
    if (["QUEUED", "PROCESSING"].includes(result.status) && attempt < 60)
      timer = setTimeout(() => void refresh(id, attempt + 1), 3000);
    else {
      pollingPaused.value = ["QUEUED", "PROCESSING"].includes(result.status);
      await history();
    }
  } catch (e) {
    if (!disposed && version === requestVersion)
      error.value = integrationError(e);
  }
}
async function submit() {
  if (!file.value || busy.value || processing.value || !available.value) return;
  busy.value = true;
  error.value = "";
  try {
    const job = await api.submitImage(file.value, plantId.value, key);
    analysisFiles.value[job.id] = { file: file.value, plantId: plantId.value };
    if (file.value && !thumbnails.value[job.id])
      thumbnails.value[job.id] = URL.createObjectURL(file.value);
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
    delete analysisFiles.value[id];
    if (thumbnails.value[id]) {
      URL.revokeObjectURL(thumbnails.value[id]);
      delete thumbnails.value[id];
    }
    if (current.value?.id === id) {
      current.value = undefined;
      clear();
    }
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
  Object.values(thumbnails.value).forEach((url) => URL.revokeObjectURL(url));
});
</script>
<template>
  <div class="workspace-page intelligence-page health-page">
    <header class="ps-page-header intelligence-header">
      <div>
        <span class="eyebrow">OBSERVA · COMPRENDE · CUIDA</span>
        <h1 class="ps-page-header__title">Salud de plantas</h1>
        <p class="ps-page-header__subtitle">
          Una fotografía, una mirada más atenta a tu jardín.
        </p>
      </div>
      <button
        class="ps-btn ps-btn--outline"
        :disabled="loading || busy"
        @click="load"
      >
        <i class="pi pi-refresh" aria-hidden="true"></i> Actualizar
      </button>
    </header>
    <p v-if="error" role="alert" class="ps-alert ps-alert--error">
      {{ error }}
    </p>
    <p v-if="loading" class="subtle" role="status">
      <i class="pi pi-spinner pi-spin" aria-hidden="true"></i> Consultando tu
      jardín…
    </p>
    <p v-else-if="capabilitiesLoaded && !available" class="ps-alert">
      El servidor todavía no tiene configurado Gemini. Tu historial sigue
      disponible.
    </p>
    <div class="health-grid">
      <section class="health-upload ps-card">
        <div class="section-kicker">
          <span class="step-dot">01</span><span>La mirada empieza aquí</span>
        </div>
        <h2>Muéstranos tu planta</h2>
        <p class="subtle">
          Busca luz natural y enfoca las hojas que te preocupan.
        </p>
        <label class="field-label" for="health-plant"
          >Asociar a una planta <span class="subtle">· opcional</span></label
        >
        <div class="health-select">
          <i class="pi pi-leaf" aria-hidden="true"></i
          ><select
            id="health-plant"
            v-model="plantId"
            :disabled="busy || processing"
            @change="renewKey"
          >
            <option :value="null">Selecciona una planta de tu jardín</option>
            <option v-for="p in plants" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>
        <label
          class="photo-dropzone"
          :class="{
            'is-dragging': dragging,
            'has-preview': preview,
            'is-disabled': !available || busy || processing,
          }"
          tabindex="0"
          role="button"
          aria-label="Seleccionar fotografía de tu planta"
          :aria-disabled="!available || busy || processing"
          @keydown.enter.prevent="fileInput?.click()"
          @keydown.space.prevent="fileInput?.click()"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="drop"
        >
          <input
            ref="fileInput"
            class="sr-only"
            tabindex="-1"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            :disabled="!available || busy || processing"
            @change="select"
          />
          <img
            v-if="preview"
            :src="preview"
            alt="Vista previa de tu planta"
            class="upload-preview"
          /><span v-if="preview" class="change-photo"
            ><i class="pi pi-camera" aria-hidden="true"></i> Cambiar
            fotografía</span
          >
          <template v-else
            ><span class="upload-emblem"
              ><i class="pi pi-camera" aria-hidden="true"></i></span
            ><strong>Arrastra tu fotografía aquí</strong
            ><span>o <span class="text-link">elige un archivo</span></span
            ><small>JPG, PNG o WebP · Hasta 10 MB</small></template
          >
        </label>
        <div v-if="file" class="file-summary">
          <i class="pi pi-image" aria-hidden="true"></i
          ><span>{{ file.name }}</span
          ><small>{{ (file.size / 1024 / 1024).toFixed(1) }} MB</small
          ><button
            class="icon-button"
            aria-label="Quitar fotografía seleccionada"
            :disabled="busy || processing"
            @click="clear"
          >
            <i class="pi pi-times" aria-hidden="true"></i>
          </button>
        </div>
        <button
          class="ps-btn ps-btn--primary analyze-button"
          :disabled="!file || busy || !available || processing"
          @click="submit"
        >
          <i
            :class="
              busy || processing ? 'pi pi-spinner pi-spin' : 'pi pi-sparkles'
            "
            aria-hidden="true"
          ></i
          >{{
            busy
              ? "Enviando…"
              : processing
                ? "Analizando tu planta…"
                : "Analizar fotografía"
          }}
        </button>
        <p class="privacy-note">
          <i class="pi pi-lock" aria-hidden="true"></i> La imagen se envía a
          Gemini para su análisis. El servidor elimina la foto al finalizar el
          procesamiento.
        </p>
      </section>
      <section
        class="diagnosis-card ps-card"
        aria-live="polite"
        :aria-busy="processing"
      >
        <div class="section-kicker">
          <span class="step-dot">02</span
          ><span>Una guía para el siguiente cuidado</span>
        </div>
        <h2>Resultado del análisis</h2>
        <template v-if="current"
          ><div class="diagnosis-status" :data-state="current.status">
            <span class="status-badge" :data-state="current.status"
              ><i
                :class="
                  processing
                    ? 'pi pi-spinner pi-spin'
                    : current.status === 'SUCCEEDED'
                      ? 'pi pi-check-circle'
                      : current.status === 'FAILED'
                        ? 'pi pi-exclamation-circle'
                        : 'pi pi-eye'
                "
                aria-hidden="true"
              ></i
              >{{ statusName(current.status) }}</span
            >
          </div>
          <img
            v-if="thumbnails[current.id]"
            :src="thumbnails[current.id]"
            alt="Fotografía de este análisis"
            class="result-photo"
          />
          <p class="subtle">
            {{ plantName(current.plantId) }} ·
            {{ dateLabel(current.createdAt) }}
          </p>
          <div v-if="processing" class="processing-state">
            <div class="scan-emblem">
              <i class="pi pi-leaf" aria-hidden="true"></i>
            </div>
            <h3>Estamos observando los detalles</h3>
            <p>
              El análisis continúa en el servidor. Puedes consultar su estado
              sin enviar otra vez la fotografía.
            </p>
            <p v-if="pollingPaused" role="status">
              Está tardando más de lo esperado. Pulsa «Consultar estado» para
              continuar.
            </p>
          </div>
          <div v-else-if="current.status === 'FAILED'" class="result-callout">
            <h3>Podemos volver a intentarlo</h3>
            <p>
              {{
                integrationError({
                  response: { status: 502, data: { code: current.errorCode } },
                })
              }}
            </p>
            <button
              v-if="file && thumbnails[current.id]"
              class="ps-btn ps-btn--outline"
              :disabled="busy"
              @click="retryAnalysis"
            >
              Reintentar esta fotografía
            </button>
          </div>
          <template v-else
            ><h3 class="diagnosis-species">
              {{
                current.species ||
                (current.status === "INCONCLUSIVE"
                  ? "Hace falta otra mirada"
                  : "Lo que observamos")
              }}
            </h3>
            <p class="diagnosis-summary">{{ current.summary }}</p>
            <div v-if="current.observations.length" class="result-section">
              <h4>
                <i class="pi pi-eye" aria-hidden="true"></i> Observaciones
              </h4>
              <ul>
                <li v-for="text in current.observations" :key="text">
                  {{ text }}
                </li>
              </ul>
            </div>
            <div
              v-if="current.recommendations.length"
              class="result-section recommendations"
            >
              <h4>
                <i class="pi pi-leaf" aria-hidden="true"></i> Próximos cuidados
              </h4>
              <ol>
                <li v-for="text in current.recommendations" :key="text">
                  {{ text }}
                </li>
              </ol>
            </div></template
          >
          <button
            class="ps-btn ps-btn--outline result-refresh"
            :disabled="busy"
            @click="refresh(current.id)"
          >
            <i class="pi pi-refresh" aria-hidden="true"></i> Consultar estado
          </button>
        </template>
        <div v-else class="diagnosis-empty">
          <span class="empty-illustration"
            ><i class="pi pi-leaf" aria-hidden="true"></i
            ><i class="pi pi-search" aria-hidden="true"></i
          ></span>
          <h3>Cada hoja tiene algo que contar</h3>
          <p>
            Sube una fotografía para descubrir observaciones y recomendaciones,
            o abre un análisis de tu historial.
          </p>
          <span class="status-badge">A la espera de tu fotografía</span>
        </div>
        <p class="diagnosis-footnote">
          <i class="pi pi-info-circle" aria-hidden="true"></i> La orientación
          puede ser inconclusa y no garantiza un diagnóstico.
        </p>
      </section>
    </div>
    <section class="health-history ps-card">
      <div class="history-heading">
        <div>
          <span class="eyebrow">EL CAMINO DE TU JARDÍN</span>
          <h2>
            Historial de análisis
            <span class="count-chip">{{ items.length }}</span>
          </h2>
        </div>
        <span class="subtle">Tus observaciones, en un solo lugar</span>
      </div>
      <div v-if="!items.length && !loading" class="history-empty">
        <i class="pi pi-images" aria-hidden="true"></i>
        <p>Tu primera fotografía inicia esta historia.</p>
      </div>
      <article
        v-for="item in items"
        :key="item.id"
        class="analysis-record"
        :class="{ 'is-selected': current?.id === item.id }"
      >
        <div class="history-thumbnail">
          <img v-if="thumbnails[item.id]" :src="thumbnails[item.id]" alt="" /><i
            v-else
            class="pi pi-leaf"
            aria-hidden="true"
          ></i>
        </div>
        <div class="record-detail">
          <strong>{{ item.species || plantName(item.plantId) }}</strong
          ><span
            >{{ dateLabel(item.createdAt) }} ·
            {{ plantName(item.plantId) }}</span
          >
        </div>
        <span class="status-badge" :data-state="item.status">{{
          statusName(item.status)
        }}</span>
        <div class="record-actions">
          <button
            class="ps-btn ps-btn--outline"
            :disabled="busy"
            @click="refresh(item.id)"
          >
            Ver resultado</button
          ><button
            class="icon-button"
            :disabled="busy || ['QUEUED', 'PROCESSING'].includes(item.status)"
            :aria-label="'Eliminar análisis del ' + dateLabel(item.createdAt)"
            title="Eliminar análisis"
            @click="remove(item.id)"
          >
            <i class="pi pi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </article>
      <p v-if="items.length" class="history-note">
        Las miniaturas están disponibles para las fotos que subas durante esta
        sesión. Las fotografías originales no se conservan en el historial.
      </p>
      <button
        v-if="nextCursor"
        class="ps-btn ps-btn--outline load-more"
        :disabled="busy"
        @click="more"
      >
        Cargar anteriores
      </button>
    </section>
  </div>
</template>
<style src="../styles/intelligence.css"></style>
