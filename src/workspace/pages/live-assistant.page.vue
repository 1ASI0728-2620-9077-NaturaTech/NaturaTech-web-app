<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import OnboardingCard from "../components/onboarding-card.vue";
const loaded = ref(false);
import { useAuthenticationStore } from "@/iam/services/authentication.store";
import { loadPersonalPlants } from "@/shared/services/personal-workspace.service";
import type { Plant } from "@/plant-management/model/plant.entity";
import type { ActionProposal } from "../model";
import {
  integrationApi as api,
  integrationError,
  type Message,
  type Command,
} from "../services/integration-api";
const auth = useAuthenticationStore(),
  storageKey = `plantsync:conversation:${auth.userId}`;
const id = ref(sessionStorage.getItem(storageKey) || ""),
  messages = ref<Message[]>([]),
  proposals = ref<Record<string, ActionProposal>>({}),
  commands = ref<Record<string, Command>>({});
const plants = ref<Plant[]>([]),
  plantId = ref<number | null>(null),
  content = ref(""),
  error = ref(""),
  busy = ref(false),
  available = ref(false);
const simulated = ref(false);
const actionsAvailable = ref(false);
let disposed = false;
let commandTimer: ReturnType<typeof setTimeout> | undefined;
async function pollCommands() {
  if (disposed) return;
  if (!busy.value) {
    for (const command of Object.values(commands.value)) {
      if (!["QUEUED", "SENT", "ACKNOWLEDGED"].includes(command.status))
        continue;
      try {
        const updated = await api.command(command.commandId);
        if (!disposed) commands.value[command.commandId] = updated;
      } catch (e) {
        if (!disposed) error.value = integrationError(e);
      }
    }
  }
  if (!disposed) commandTimer = setTimeout(pollCommands, 5000);
}
async function history() {
  if (!id.value) return;
  let data;
  try {
    data = await api.conversation(id.value);
  } catch (e) {
    if ((e as { response?: { status: number } }).response?.status !== 404)
      throw e;
    id.value = "";
    messages.value = [];
    proposals.value = {};
    commands.value = {};
    sessionStorage.removeItem(storageKey);
    return;
  }
  if (disposed) return;
  messages.value = data.messages;
  for (const message of data.messages) {
    if (!message.proposalId) continue;
    const p = await api.proposal(message.proposalId);
    proposals.value[p.id] = p;
    if (p.status === "CONFIRMED")
      commands.value[p.id] = await api.command(p.id);
  }
}
async function load() {
  busy.value = true;
  error.value = "";
  try {
    const [caps, context] = await Promise.all([
      api.capabilities(),
      loadPersonalPlants(),
    ]);
    available.value = caps.assistant;
    actionsAvailable.value = caps.actuatorCommands;
    simulated.value = caps.iotEnvironment === "SIMULATED";
    plants.value = context.plants;
    loaded.value = true;
    if (!plants.value.some((p) => p.id === plantId.value))
      plantId.value = plants.value[0]?.id ?? null;
    await history();
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
async function send() {
  if (
    busy.value ||
    !available.value ||
    !plants.value.length ||
    !content.value.trim()
  )
    return;
  busy.value = true;
  error.value = "";
  try {
    if (!id.value) {
      id.value = (await api.createConversation()).id;
      sessionStorage.setItem(storageKey, id.value);
    }
    await api.message(id.value, content.value.trim(), plantId.value);
    content.value = "";
    await history();
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
async function act(proposal: ActionProposal, confirm: boolean) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    if (confirm) commands.value[proposal.id] = await api.confirm(proposal.id);
    else await api.cancel(proposal.id);
    await history();
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
function reset() {
  if (busy.value) return;
  if (
    messages.value.length &&
    !window.confirm(
      "¿Comenzar otra conversación? La anterior permanece en el servidor.",
    )
  )
    return;
  id.value = "";
  sessionStorage.removeItem(storageKey);
  messages.value = [];
  proposals.value = {};
  commands.value = {};
  error.value = "";
}
onMounted(() => {
  void load();
  commandTimer = setTimeout(pollCommands, 5000);
});
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(commandTimer);
});
</script>
<template>
  <div class="workspace-page">
    <div class="ps-page-header">
      <div>
        <span class="eyebrow">CUIDADO ASISTIDO</span>
        <h1 class="ps-page-header__title">Tu asistente de jardín</h1>
        <p class="ps-page-header__subtitle">
          Consulta y revisa cada acción antes de confirmarla.
        </p>
      </div>
      <button class="ps-btn ps-btn--outline" :disabled="busy" @click="reset">
        Nueva conversación
      </button>
    </div>
    <p v-if="error" role="alert" class="ps-alert ps-alert--error">
      {{ error }}
    </p>
    <p v-if="loaded && !available && !busy" class="ps-alert">
      Gemini todavía no está configurado en el servidor.
    </p>
    <p v-if="simulated" class="ps-alert" role="status">
      Entorno IoT simulado: las acciones modifican un dispositivo virtual; no
      activan hardware físico.
    </p>
    <p v-if="loaded && available && !actionsAvailable" class="workspace-notice">
      Puedes consultar cuidados. Las acciones de riego y luz todavía necesitan
      un dispositivo autorizado y un simulador activo.
    </p>
    <OnboardingCard
      v-if="loaded && !plants.length"
      title="Tu asistente empieza por conocer tu planta"
      description="Necesitas agregar una planta para usar el asistente. Después podrás consultar sus cuidados y revisar acciones para su dispositivo."
      to="/plants"
      action="Agregar mi primera planta"
      step="PASO 1 · CREA TU JARDÍN"
    />
    <section v-else class="ps-card panel assistant-panel">
      <label
        >Planta para esta consulta
        <select v-model="plantId" :disabled="busy">
          <option :value="null">Consulta general</option>
          <option v-for="plant in plants" :key="plant.id" :value="plant.id">
            {{ plant.name }}
          </option>
        </select></label
      >
      <div aria-live="polite" class="live-messages">
        <p v-if="!messages.length" class="muted">
          Cuéntame qué necesita tu planta.
        </p>
        <article
          v-for="(message, index) in messages"
          :key="index"
          class="live-message"
        >
          <strong>{{ message.role === "user" ? "Tú" : "PlantSync" }}</strong>
          <p>{{ message.content }}</p>
          <template v-if="message.proposalId && proposals[message.proposalId]"
            ><div class="ps-card panel">
              <h3>Revisa la propuesta</h3>
              <p>
                {{
                  proposals[message.proposalId].actuator === "WATER_PUMP"
                    ? "Riego"
                    : "Luz de cultivo"
                }}
                · {{ proposals[message.proposalId].durationSeconds }} segundos ·
                Planta {{ proposals[message.proposalId].plantId }}
              </p>
              <p>
                Estado: {{ proposals[message.proposalId].status }} · Vence
                {{
                  new Date(
                    proposals[message.proposalId].expiresAt,
                  ).toLocaleTimeString()
                }}
              </p>
              <div
                v-if="
                  proposals[message.proposalId].status ===
                  'AWAITING_CONFIRMATION'
                "
              >
                <button
                  class="ps-btn ps-btn--primary"
                  :disabled="busy"
                  @click="act(proposals[message.proposalId], true)"
                >
                  Confirmar acción
                </button>
                <button
                  class="ps-btn ps-btn--outline"
                  :disabled="busy"
                  @click="act(proposals[message.proposalId], false)"
                >
                  Cancelar
                </button>
              </div>
              <p v-if="commands[message.proposalId]">
                Comando: {{ commands[message.proposalId].status }}. La recepción
                no equivale a ejecución.
              </p>
            </div></template
          >
        </article>
      </div>
      <form @submit.prevent="send">
        <label class="ps-input-group"
          >Tu mensaje<textarea
            v-model="content"
            maxlength="500"
            rows="3"
            :disabled="busy || !available || !plants.length"
            placeholder="¿Qué necesita tu planta?"
          ></textarea></label
        ><button
          class="ps-btn ps-btn--primary"
          :disabled="busy || !available || !plants.length || !content.trim()"
        >
          {{ busy ? "Procesando…" : "Enviar mensaje" }}
        </button>
        <button
          type="button"
          class="ps-btn ps-btn--outline"
          :disabled="busy"
          @click="load"
        >
          Actualizar conversación y comandos
        </button>
      </form>
      <p class="muted">
        Si se interrumpe la conexión, actualiza antes de reenviar. Ningún
        consejo activa por sí solo un dispositivo.
      </p>
    </section>
  </div>
</template>
<style scoped>
select,
textarea {
  padding: 0.8rem;
  max-width: 100%;
  background: var(--ps-surface);
  color: var(--ps-text);
  border: 1px solid var(--ps-border);
  border-radius: 8px;
}
.live-messages {
  margin: 1.5rem 0;
}
.live-message {
  padding: 1rem 0;
  border-bottom: 1px solid var(--ps-border);
}
.live-message p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
