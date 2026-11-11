<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Dialog from "primevue/dialog";
import { loadPersonalPlants } from "@/shared/services/personal-workspace.service";
import { PlantService } from "@/plant-management/services/plant-api.service";
import { TaskApiService } from "@/task-management/services/task-api.service";
import { IoTApiService } from "@/iot-management/services/iot-api.service";
import type { Plant } from "@/plant-management/model/plant.entity";
import { integrationError } from "../services/integration-api";

const props = defineProps<{
  visible: boolean;
  kind: "plant" | "task" | "device";
  existingNodeCode?: string;
}>();
const emit = defineEmits<{ "update:visible": [boolean]; created: [] }>();
const titles = {
  plant: "Una nueva vida en tu jardín",
  task: "Planifica su próximo cuidado",
  device: "Conecta tu jardín",
};
const labels = {
  plant: "Agregar planta",
  task: "Crear tarea",
  device: "Vincular dispositivo",
};
const loading = ref(false),
  saving = ref(false),
  error = ref(""),
  profileId = ref<number>();
const plants = ref<Plant[]>([]),
  plantId = ref<number | null>(null);
const name = ref(""),
  species = ref(""),
  notes = ref(""),
  nodeCode = ref("");
const date = ref(""),
  wateringDate = ref(""),
  humidity = ref<"BAJA" | "MEDIA" | "ALTA">("MEDIA");
const action = ref("Regar"),
  measuredHumidity = ref<number | null>(null);
const needsPlant = computed(
  () => props.kind !== "plant" && !plants.value.length,
);
let generation = 0;
watch(
  () => props.visible,
  async (visible) => {
    const version = ++generation;
    if (!visible) return;
    error.value = "";
    loading.value = true;
    profileId.value = undefined;
    name.value = "";
    species.value = "";
    notes.value = "";
    nodeCode.value = props.existingNodeCode || "";
    plantId.value = null;
    measuredHumidity.value = null;
    const now = new Date();
    date.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    wateringDate.value = date.value;
    try {
      const context = await loadPersonalPlants();
      if (version !== generation) return;
      profileId.value = context.profile.id;
      plants.value = context.plants;
      plantId.value = context.plants[0]?.id ?? null;
    } catch (e) {
      if (version === generation) error.value = integrationError(e);
    } finally {
      if (version === generation) loading.value = false;
    }
  },
  { immediate: true },
);

async function save() {
  if (saving.value || loading.value || !profileId.value || needsPlant.value)
    return;
  error.value = "";
  if (props.kind === "plant" && (!name.value.trim() || !species.value.trim())) {
    error.value = "Escribe el nombre y la especie de tu planta.";
    return;
  }
  if (
    props.kind !== "plant" &&
    !plants.value.some((p) => p.id === plantId.value)
  ) {
    error.value = "Selecciona una planta de tu cuenta.";
    return;
  }
  if (
    props.kind === "device" &&
    !/^[a-zA-Z0-9_-]{3,64}$/.test(nodeCode.value.trim())
  ) {
    error.value =
      "Usa de 3 a 64 letras, números, guiones o guiones bajos para el código.";
    return;
  }
  saving.value = true;
  try {
    if (props.kind === "plant")
      await PlantService.create({
        name: name.value.trim(),
        species: species.value.trim(),
        description: notes.value.trim(),
        acquisitionDate: date.value,
        nextWateringDate: wateringDate.value,
        humidity: humidity.value,
        notificationsEnabled: true,
        profileId: profileId.value,
      });
    else if (props.kind === "task")
      await new TaskApiService().create({
        action: action.value,
        scheduledDate: date.value,
        plantId: plantId.value!,
        profileId: profileId.value,
        humidity:
          typeof measuredHumidity.value === "number"
            ? measuredHumidity.value
            : null,
        notes: notes.value.trim(),
      });
    else if (props.existingNodeCode)
      await new IoTApiService().linkPlant(
        props.existingNodeCode,
        plantId.value!,
      );
    else
      await new IoTApiService().createNode({
        nodeCode: nodeCode.value.trim(),
        plantId: plantId.value!,
        profileId: profileId.value,
      });
    emit("created");
    emit("update:visible", false);
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="!saving && emit('update:visible', $event)"
    modal
    :closable="!saving"
    :close-on-escape="!saving"
    :header="titles[kind]"
    :style="{ width: 'min(540px, 94vw)' }"
    class="garden-dialog"
  >
    <p class="muted">
      {{
        kind === "plant"
          ? "Empieza con lo esencial. Después podrás conocerla mejor."
          : kind === "task"
            ? "Un pequeño hábito hace la diferencia."
            : "Asocia un sensor real o simulado a una de tus plantas."
      }}
    </p>
    <p v-if="loading" role="status">Preparando tu jardín…</p>
    <p v-if="error" role="alert" class="ps-alert ps-alert--error">
      {{ error }}
    </p>
    <div v-if="!loading && needsPlant" class="onboarding-card">
      <h3>Primero, una planta</h3>
      <p>Los cuidados y dispositivos se asocian a una planta de tu jardín.</p>
      <router-link
        class="ps-btn ps-btn--primary"
        to="/plants"
        @click="emit('update:visible', false)"
        >Agregar mi primera planta</router-link
      >
    </div>
    <form
      v-else-if="!loading && profileId"
      class="garden-form"
      @submit.prevent="save"
    >
      <fieldset :disabled="saving">
        <template v-if="kind === 'plant'">
          <label
            >Nombre de tu planta<input
              v-model="name"
              autofocus
              required
              maxlength="100"
              placeholder="Mi Monstera"
          /></label>
          <label
            >Especie<input
              v-model="species"
              required
              maxlength="100"
              placeholder="Monstera deliciosa o Por identificar"
          /></label>
          <div class="garden-form-grid">
            <label
              >Fecha de llegada<input v-model="date" type="date" required
            /></label>
            <label
              >Necesidad de humedad<select v-model="humidity">
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
              </select></label
            >
          </div>
          <label
            >Próximo riego<input v-model="wateringDate" type="date" required
          /></label>
        </template>
        <label v-else
          >Planta<select v-model="plantId" required>
            <option :value="null" disabled>Selecciona una planta</option>
            <option v-for="plant in plants" :key="plant.id" :value="plant.id">
              {{ plant.name }}
            </option>
          </select></label
        >
        <template v-if="kind === 'task'">
          <div class="garden-form-grid">
            <label
              >Cuidado<select v-model="action">
                <option>Regar</option>
                <option>Fertilizar</option>
                <option>Podar</option>
                <option>Trasplantar</option>
                <option>Revisar hojas</option>
              </select></label
            >
            <label
              >Fecha programada<input v-model="date" type="date" required
            /></label>
          </div>
          <label
            >Humedad medida (opcional, %)<input
              v-model.number="measuredHumidity"
              type="number"
              min="0"
              max="100"
              placeholder="Sin lectura"
          /></label>
        </template>
        <template v-if="kind === 'device'">
          <label
            >Código del dispositivo<input
              v-model="nodeCode"
              :readonly="!!existingNodeCode"
              required
              minlength="3"
              maxlength="64"
              pattern="[a-zA-Z0-9_-]{3,64}"
              placeholder="SIM-001"
              autocomplete="off"
          /></label>
          <p class="form-hint">
            Usa el código configurado en tu simulador. Vincularlo no inicia la
            simulación: aparecerán lecturas cuando esté en ejecución.
          </p>
        </template>
        <label v-else
          >Notas (opcional)<textarea
            v-model="notes"
            maxlength="255"
            rows="3"
            placeholder="Algo que quieras recordar…"
          ></textarea>
        </label>
        <div class="garden-form-actions">
          <button
            type="button"
            class="ps-btn ps-btn--outline"
            @click="emit('update:visible', false)"
          >
            Cancelar</button
          ><button class="ps-btn ps-btn--primary" type="submit">
            {{ saving ? "Guardando…" : labels[kind] }}
          </button>
        </div>
      </fieldset>
    </form>
  </Dialog>
</template>
