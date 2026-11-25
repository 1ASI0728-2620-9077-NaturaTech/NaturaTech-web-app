<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
} from "vue";
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
const thread = ref<HTMLElement>();
const input = ref<HTMLTextAreaElement>();
const pendingText = ref("");
const selectedPlant = computed(() =>
  plants.value.find((p) => p.id === plantId.value),
);
const suggestions = [
  {
    icon: "pi pi-sun",
    title: "Revisar la luz",
    text: "¿Cómo están las condiciones de luz de mi planta?",
  },
  {
    icon: "pi pi-heart",
    title: "Entender sus cuidados",
    text: "¿Qué cuidados necesita mi planta según sus lecturas?",
  },
  {
    icon: "pi pi-bolt",
    title: "Probar la luz",
    text: "Enciende la luz de cultivo durante 5 segundos.",
  },
];
function suggest(text: string) {
  content.value = text;
  void nextTick(() => input.value?.focus());
}
function enter(event: KeyboardEvent) {
  if (!event.shiftKey && !event.isComposing) {
    event.preventDefault();
    void send();
  }
}
function commandLabel(status: string) {
  return (
    (
      {
        QUEUED: "En cola",
        SENT: "Enviado al dispositivo",
        ACKNOWLEDGED: "Recibido",
        EXECUTED: "Acción completada",
        FAILED: "No se pudo ejecutar",
        EXPIRED: "Comando vencido",
        UNKNOWN: "Ejecución sin confirmar",
      } as Record<string, string>
    )[status] || status
  );
}
watch(
  () => [messages.value.length, pendingText.value],
  async () => {
    await nextTick();
    if (thread.value) thread.value.scrollTop = thread.value.scrollHeight;
  },
);
const actionsAvailable = ref(false);
let contextInitialized = false;
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
    if (
      !contextInitialized ||
      (plantId.value !== null &&
        !plants.value.some((p) => p.id === plantId.value))
    )
      plantId.value = plants.value[0]?.id ?? null;
    contextInitialized = true;
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
    pendingText.value = content.value.trim();
    const answer = await api.message(
      id.value,
      pendingText.value,
      plantId.value,
    );
    messages.value.push({ role: "user", content: pendingText.value });
    messages.value.push({
      role: "assistant",
      content: answer.reply,
      ...(answer.proposal ? { proposalId: answer.proposal.id } : {}),
    });
    if (answer.proposal) proposals.value[answer.proposal.id] = answer.proposal;
    content.value = "";
    pendingText.value = "";
    try {
      await history();
    } catch (e) {
      error.value = integrationError(e);
    }
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    pendingText.value = "";
    busy.value = false;
  }
}
async function act(proposal: ActionProposal, confirm: boolean) {
  if (busy.value) return;
  if (confirm && new Date(proposal.expiresAt).getTime() <= Date.now()) {
    proposals.value[proposal.id] = { ...proposal, status: "EXPIRED" };
    error.value =
      "La propuesta venció. Solicita una nueva acción al asistente.";
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    if (confirm) {
      commands.value[proposal.id] = await api.confirm(proposal.id);
      proposals.value[proposal.id] = { ...proposal, status: "CONFIRMED" };
    } else {
      proposals.value[proposal.id] = await api.cancel(proposal.id);
    }
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
  <div class="workspace-page intelligence-page copilot-page">
    <header class="ps-page-header intelligence-header">
      <div>
        <span class="eyebrow">CUIDADO QUE CONVERSA</span>
        <h1 class="ps-page-header__title">Tu asistente de jardín</h1>
        <p class="ps-page-header__subtitle">
          Una conversación para entender y cuidar mejor tus plantas.
        </p>
      </div>
      <button class="ps-btn ps-btn--outline" :disabled="busy" @click="reset">
        <i class="pi pi-plus" aria-hidden="true"></i> Nueva conversación
      </button>
    </header>
    <p v-if="error" role="alert" class="ps-alert ps-alert--error">
      {{ error }}
    </p>
    <p v-if="loaded && !available && !busy" class="ps-alert">
      El asistente no está disponible en el servidor. Puedes volver a consultar
      su estado.
    </p>
    <OnboardingCard
      v-if="loaded && !plants.length"
      title="Tu asistente empieza por conocer tu planta"
      description="Necesitas agregar una planta para usar el asistente. Después podrás consultar sus cuidados y revisar acciones para su dispositivo."
      to="/plants"
      action="Agregar mi primera planta"
      step="PASO 1 · CREA TU JARDÍN"
    />
    <section v-else class="chat-shell" aria-label="Conversación con PlantSync">
      <div class="chat-topbar">
        <div class="agent-identity">
          <span class="agent-avatar"
            ><i class="pi pi-sparkles" aria-hidden="true"></i
          ></span>
          <div>
            <strong>PlantSync Copiloto</strong
            ><span>{{
              available
                ? "Listo para ayudarte"
                : busy
                  ? "Conectando con tu jardín…"
                  : "Servicio no disponible"
            }}</span>
          </div>
        </div>
        <label class="context-picker"
          ><i class="pi pi-leaf" aria-hidden="true"></i
          ><span class="sr-only">Planta para esta consulta</span
          ><select v-model="plantId" :disabled="busy">
            <option :value="null">Consulta general</option>
            <option v-for="plant in plants" :key="plant.id" :value="plant.id">
              {{ plant.name }}
            </option></select
          ><i class="pi pi-chevron-down" aria-hidden="true"></i
        ></label>
      </div>
      <div
        v-if="simulated || (loaded && available && !actionsAvailable)"
        class="chat-context-note"
        role="status"
      >
        <i class="pi pi-shield" aria-hidden="true"></i
        ><span
          >{{
            simulated
              ? "IoT simulado · Las acciones se ejecutan en un dispositivo virtual."
              : "Puedes consultar cuidados. Las acciones necesitan un dispositivo autorizado y un simulador activo."
          }}
          Cada acción requiere tu confirmación.</span
        >
      </div>
      <div
        ref="thread"
        class="chat-thread"
        role="log"
        aria-label="Historial de mensajes"
        :aria-busy="!!pendingText"
      >
        <div v-if="!messages.length && !pendingText" class="chat-welcome">
          <span class="welcome-emblem"
            ><i class="pi pi-leaf" aria-hidden="true"></i></span
          ><span class="eyebrow">UN POCO DE ATENCIÓN, MUCHA VIDA</span>
          <h2>¿Qué necesita tu jardín hoy?</h2>
          <p>
            Hablemos de {{ selectedPlant?.name || "tus plantas" }}. Puedes
            consultar sus lecturas, entender sus cuidados o proponer una acción.
          </p>
          <div class="prompt-grid">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion.title"
              type="button"
              :disabled="busy || !available"
              @click="suggest(suggestion.text)"
            >
              <i :class="suggestion.icon" aria-hidden="true"></i
              ><span>{{ suggestion.title }}</span
              ><i class="pi pi-arrow-up-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <article
          v-for="(message, index) in messages"
          :key="index"
          class="chat-message"
          :class="message.role === 'user' ? 'is-user' : 'is-agent'"
        >
          <span class="message-avatar" aria-hidden="true"
            ><i
              :class="message.role === 'user' ? 'pi pi-user' : 'pi pi-sparkles'"
            ></i
          ></span>
          <div class="message-body">
            <span class="message-author">{{
              message.role === "user" ? "Tú" : "PlantSync"
            }}</span>
            <div class="message-bubble">
              <p>{{ message.content }}</p>
            </div>
            <div
              v-if="message.proposalId && proposals[message.proposalId]"
              class="action-card"
            >
              <span class="status-badge"
                ><i class="pi pi-bolt" aria-hidden="true"></i
                >{{
                  simulated ? "Acción IoT simulada" : "Acción del dispositivo"
                }}</span
              >
              <h3>Revisa la propuesta</h3>
              <p>
                <strong>{{
                  proposals[message.proposalId].actuator === "WATER_PUMP"
                    ? "Riego"
                    : "Luz de cultivo"
                }}</strong>
                · {{ proposals[message.proposalId].durationSeconds }} segundos
              </p>
              <p class="subtle">
                {{
                  plants.find(
                    (p) => p.id === proposals[message.proposalId!].plantId,
                  )?.name || "Planta " + proposals[message.proposalId].plantId
                }}
                · Vence
                {{
                  new Date(
                    proposals[message.proposalId].expiresAt,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </p>
              <div
                v-if="
                  proposals[message.proposalId].status ===
                    'AWAITING_CONFIRMATION' && !commands[message.proposalId]
                "
                class="action-buttons"
              >
                <button
                  class="ps-btn ps-btn--primary"
                  :disabled="busy"
                  @click="act(proposals[message.proposalId], true)"
                >
                  Confirmar acción</button
                ><button
                  class="ps-btn ps-btn--outline"
                  :disabled="busy"
                  @click="act(proposals[message.proposalId], false)"
                >
                  Cancelar
                </button>
              </div>
              <p v-else-if="!commands[message.proposalId]" class="subtle">
                {{
                  proposals[message.proposalId].status === "CANCELLED"
                    ? "Propuesta cancelada"
                    : proposals[message.proposalId].status === "EXPIRED"
                      ? "Propuesta vencida"
                      : "Propuesta confirmada"
                }}
              </p>
              <p
                v-if="commands[message.proposalId]"
                class="command-status"
                role="status"
              >
                <i
                  :class="
                    commands[message.proposalId].status === 'EXECUTED'
                      ? 'pi pi-check-circle'
                      : 'pi pi-clock'
                  "
                  aria-hidden="true"
                ></i
                >{{ commandLabel(commands[message.proposalId].status)
                }}<span class="subtle"
                  >La recepción no equivale a ejecución.</span
                >
              </p>
            </div>
          </div>
        </article>
        <template v-if="pendingText"
          ><article class="chat-message is-user">
            <span class="message-avatar" aria-hidden="true"
              ><i class="pi pi-user"></i
            ></span>
            <div class="message-body">
              <span class="message-author">Tú</span>
              <div class="message-bubble">
                <p>{{ pendingText }}</p>
              </div>
            </div>
          </article>
          <div class="typing-indicator" role="status">
            <span></span><span></span><span></span
            ><small>PlantSync está preparando tu respuesta…</small>
          </div></template
        >
      </div>
      <div class="chat-bottom">
        <form class="chat-composer" @submit.prevent="send">
          <label for="agent-message" class="sr-only">Tu mensaje</label
          ><textarea
            id="agent-message"
            ref="input"
            v-model="content"
            maxlength="500"
            rows="2"
            :disabled="busy || !available || !plants.length"
            placeholder="Pregunta por tu planta o solicita una acción…"
            @keydown.enter="enter"
          ></textarea>
          <div class="composer-toolbar">
            <span
              >{{ content.length }} / 500
              <span class="desktop-hint"
                >· Enter para enviar · Shift + Enter para otra línea</span
              ></span
            >
            <div>
              <button
                type="button"
                class="icon-button"
                :disabled="busy"
                @click="load"
                aria-label="Actualizar conversación y comandos"
                title="Actualizar conversación y comandos"
              >
                <i class="pi pi-refresh" aria-hidden="true"></i></button
              ><button
                class="send-button"
                :disabled="
                  busy || !available || !plants.length || !content.trim()
                "
                aria-label="Enviar mensaje"
                title="Enviar mensaje"
              >
                <i
                  :class="
                    pendingText ? 'pi pi-spinner pi-spin' : 'pi pi-arrow-up'
                  "
                  aria-hidden="true"
                ></i>
              </button>
            </div>
          </div>
        </form>
        <p class="composer-footnote">
          <i class="pi pi-lock" aria-hidden="true"></i> Tú decides. Un consejo
          nunca activa un dispositivo por sí solo.
        </p>
      </div>
    </section>
  </div>
</template>
<style src="../styles/intelligence.css"></style>
