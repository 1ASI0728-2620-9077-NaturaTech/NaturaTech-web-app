<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import FeatureNotice from "../components/feature-notice.vue";
import { validateImage } from "../model";
withDefaults(defineProps<{ demo?: boolean }>(), { demo: false });
const preview = ref("");
const filename = ref("");
const error = ref("");
const result = ref(false);
const imageReady = ref(false);
const dragging = ref(false);
const fileInput = ref<HTMLInputElement>();
function clearImage() {
  if (preview.value) URL.revokeObjectURL(preview.value);
  preview.value = "";
  filename.value = "";
  result.value = false;
  imageReady.value = false;
  if (fileInput.value) fileInput.value.value = "";
}
function select(file?: File) {
  if (!file) return;
  clearImage();
  error.value = validateImage(file) || "";
  if (error.value) return;
  preview.value = URL.createObjectURL(file);
  filename.value = file.name;
}
function onInput(event: Event) {
  select((event.target as HTMLInputElement).files?.[0]);
}
function drop(event: DragEvent) {
  dragging.value = false;
  select(event.dataTransfer?.files[0]);
}
function invalidPreview() {
  clearImage();
  error.value = "No se pudo abrir la imagen. Prueba con otro archivo.";
}
onBeforeUnmount(clearImage);
</script>

<template>
  <div class="workspace-page">
    <div class="ps-page-header">
      <div>
        <span class="eyebrow">UNA MIRADA MÁS CERCA</span>
        <h1 class="ps-page-header__title">Conoce mejor tu planta</h1>
        <p class="ps-page-header__subtitle">
          Una foto, una orientación y el siguiente paso para cuidarla.
        </p>
      </div>
      <span class="soft-tag"
        ><i class="pi pi-sparkles" aria-hidden="true"></i> Análisis con IA</span
      >
    </div>
    <FeatureNotice :demo="demo" />
    <div class="feature-grid">
      <section class="ps-card panel">
        <div class="section-heading">
          <h2>Fotografía de tu planta</h2>
          <span class="step-number">01</span>
        </div>
        <p class="muted">
          Enfoca las hojas con luz natural y un fondo despejado.
        </p>
        <div
          class="upload-zone"
          :class="{ 'is-dragging': dragging }"
          @dragover.prevent="dragging = demo"
          @dragleave.prevent="dragging = false"
          @drop.prevent="demo && drop($event)"
        >
          <template v-if="preview"
            ><img
              :src="preview"
              alt="Vista previa de la fotografía seleccionada"
              @load="imageReady = true"
              @error="invalidPreview"
            />
            <p class="filename">{{ filename }}</p>
            <button class="ps-btn ps-btn--outline" @click="clearImage">
              Cambiar fotografía
            </button></template
          >
          <template v-else
            ><div class="feature-icon">
              <i class="pi pi-camera" aria-hidden="true"></i>
            </div>
            <h3>El cuidado empieza con una foto</h3>
            <p>Arrastra tu imagen aquí o selecciónala desde tu dispositivo.</p>
            <button
              class="ps-btn ps-btn--primary"
              :disabled="!demo"
              @click="fileInput?.click()"
            >
              <i class="pi pi-upload" aria-hidden="true"></i> Seleccionar
              fotografía</button
            ><small>JPG, PNG o WebP · Máximo 10 MB</small></template
          >
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="sr-only"
            aria-label="Fotografía de la planta"
            :disabled="!demo"
            @change="onInput"
          />
        </div>
        <p v-if="error" role="alert" class="form-error">{{ error }}</p>
        <p class="privacy-note">
          <i class="pi pi-lock" aria-hidden="true"></i>
          {{
            demo
              ? "Tu foto permanece en este navegador. No se envía a ningún servicio."
              : "El análisis estará disponible cuando se active el servicio."
          }}
        </p>
        <button
          class="ps-btn ps-btn--primary wide-button"
          :disabled="!demo || !imageReady || !!error"
          @click="result = true"
        >
          <i class="pi pi-sparkles" aria-hidden="true"></i> Ver resultado de
          ejemplo
        </button>
      </section>
      <section class="ps-card panel" aria-live="polite">
        <div class="section-heading">
          <h2>Una guía para su bienestar</h2>
          <span class="step-number">02</span>
        </div>
        <template v-if="result"
          ><span class="soft-tag"
            >Resultado ilustrativo · No analiza tu foto</span
          >
          <h3 class="result-title">Monstera deliciosa</h3>
          <p>En este ejemplo se observan hojas con bordes amarillentos.</p>
          <div class="insight-box">
            <i class="pi pi-info-circle" aria-hidden="true"></i>
            <p>
              El aspecto de las hojas puede tener distintas causas. Revisa el
              sustrato antes de cambiar el riego.
            </p>
          </div>
          <h3>Próximos pasos</h3>
          <ol class="care-steps">
            <li>Comprueba la humedad de la tierra.</li>
            <li>Busca una ubicación con luz indirecta.</li>
            <li>Observa los cambios durante los próximos días.</li>
          </ol>
          <p class="muted">
            La versión conectada ofrecerá una orientación generada por Gemini,
            que puede ser incorrecta.
          </p>
          <router-link class="ps-btn ps-btn--outline" to="/preview/assistant"
            >Consultar al asistente
            <i class="pi pi-arrow-right" aria-hidden="true"></i></router-link
        ></template>
        <div v-else class="result-placeholder">
          <i class="pi pi-leaf" aria-hidden="true"></i>
          <h3>Cada hoja cuenta una historia</h3>
          <p>
            Aquí encontrarás una posible especie, observaciones y consejos
            breves.
          </p>
          <div class="result-lines">
            <span></span><span></span><span></span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
