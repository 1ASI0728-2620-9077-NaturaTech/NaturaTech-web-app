<script setup lang="ts">
import { ref, nextTick } from "vue";
import FeatureNotice from "../components/feature-notice.vue";
const props = withDefaults(defineProps<{ demo?: boolean }>(), { demo: false });
type ProposalStatus = "pending" | "cancelled" | "simulated";
interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  proposal?: ProposalStatus;
}
const messages = ref<Message[]>([]);
const input = ref("");
const transcript = ref<HTMLElement>();
let nextId = 0;
async function send(text = input.value) {
  if (!props.demo || !text.trim() || text.trim().length > 500) return;
  messages.value.push({ id: ++nextId, role: "user", text: text.trim() });
  input.value = "";
  // Only a known walkthrough phrase creates the fixed example proposal.
  // Free text is not interpreted as authority to perform an action.
  const light = text.trim().toLocaleLowerCase() === "mi monstera necesita luz";
  messages.value.push({
    id: ++nextId,
    role: "assistant",
    text: light
      ? "Este ejemplo propone encender la luz de cultivo de la Monstera. Revisa la acción antes de confirmar la simulación."
      : "Respuesta de demostración: revisa la humedad del sustrato y la luz disponible antes de cambiar sus cuidados. Puedes probar «Mi Monstera necesita luz» para explorar una acción.",
    ...(light ? { proposal: "pending" as const } : {}),
  });
  await nextTick();
  transcript.value?.scrollTo?.({
    top: transcript.value.scrollHeight,
    behavior: "smooth",
  });
}
function confirm(message: Message) {
  if (props.demo && message.proposal === "pending")
    message.proposal = "simulated";
}
</script>
<template>
  <div class="workspace-page">
    <div class="ps-page-header">
      <div>
        <span class="eyebrow">CUIDADO CON INTENCIÓN</span>
        <h1 class="ps-page-header__title">Tu asistente de cultivo</h1>
        <p class="ps-page-header__subtitle">
          Entiende lo que necesita tu planta. Tú decides el siguiente paso.
        </p>
      </div>
      <span class="soft-tag"
        ><i class="pi pi-shield" aria-hidden="true"></i> Acciones con
        confirmación</span
      >
    </div>
    <FeatureNotice :demo="demo" />
    <div class="assistant-grid">
      <section class="ps-card assistant-panel">
        <div class="assistant-header">
          <div class="feature-icon small">
            <i class="pi pi-sparkles" aria-hidden="true"></i>
          </div>
          <div>
            <strong>Asistente PlantSync</strong>
            <p>{{ demo ? "Conversación de demostración" : "Próximamente" }}</p>
          </div>
        </div>
        <div
          ref="transcript"
          class="conversation"
          role="log"
          aria-live="polite"
          aria-label="Conversación con el asistente"
        >
          <div v-if="!messages.length" class="conversation-welcome">
            <span class="botanical-mark"
              ><i class="pi pi-sparkles" aria-hidden="true"></i
            ></span>
            <h2>Un poco de ayuda.<br />Mucho por crecer.</h2>
            <p>
              Pregunta sobre tus plantas o explora cómo revisar una acción antes
              de ejecutarla.
            </p>
            <div class="suggestions">
              <button
                :disabled="!demo"
                @click="send('Mi Monstera necesita luz')"
              >
                <i class="pi pi-sun" aria-hidden="true"></i> Mi Monstera
                necesita luz</button
              ><button
                :disabled="!demo"
                @click="send('¿Cómo reviso el riego?')"
              >
                <i class="pi pi-tint" aria-hidden="true"></i> ¿Cómo reviso el
                riego?
              </button>
            </div>
          </div>
          <article
            v-for="message in messages"
            :key="message.id"
            class="conversation-message"
            :class="message.role"
          >
            <span class="message-author">{{
              message.role === "user" ? "Tú" : "PlantSync · Demo"
            }}</span>
            <p>{{ message.text }}</p>
            <div v-if="message.proposal" class="action-proposal">
              <span class="eyebrow">REVISAR ACCIÓN DE EJEMPLO</span>
              <h3>
                <i class="pi pi-sun" aria-hidden="true"></i> Encender luz de
                cultivo
              </h3>
              <dl>
                <div>
                  <dt>Planta</dt>
                  <dd>Monstera · Sala de estar</dd>
                </div>
                <div>
                  <dt>Duración ilustrativa</dt>
                  <dd>5 minutos</dd>
                </div>
                <div>
                  <dt>Dispositivo</dt>
                  <dd>Simulador de luz</dd>
                </div>
              </dl>
              <div v-if="message.proposal === 'pending'" class="button-row">
                <button
                  class="ps-btn ps-btn--primary"
                  @click="confirm(message)"
                >
                  Confirmar simulación</button
                ><button
                  class="ps-btn ps-btn--outline"
                  @click="message.proposal = 'cancelled'"
                >
                  Cancelar
                </button>
              </div>
              <p v-else role="status" class="action-status">
                {{
                  message.proposal === "simulated"
                    ? "Simulación completada. No se envió ningún comando."
                    : "Acción cancelada. No se envió ningún comando."
                }}
              </p>
            </div>
          </article>
        </div>
        <form class="composer" @submit.prevent="send()">
          <label for="assistant-message" class="sr-only"
            >Escribe tu mensaje</label
          ><input
            id="assistant-message"
            v-model="input"
            maxlength="500"
            :disabled="!demo"
            placeholder="¿Qué necesita tu planta hoy?"
            autocomplete="off"
          /><button
            class="ps-btn ps-btn--primary"
            :disabled="!demo || !input.trim()"
            aria-label="Enviar mensaje"
          >
            <i class="pi pi-arrow-up" aria-hidden="true"></i>
          </button>
        </form>
        <p class="composer-note">
          {{
            demo
              ? "Respuestas de ejemplo. No hay conexión a IA ni dispositivos."
              : "El asistente se habilitará al conectar el servicio."
          }}
        </p>
      </section>
      <aside class="assistant-context">
        <section class="ps-card panel">
          <span class="eyebrow">TÚ TIENES EL CONTROL</span>
          <h2>Del consejo a la acción</h2>
          <ol class="care-steps">
            <li>Describe lo que necesita tu planta.</li>
            <li>Revisa el dispositivo y la duración.</li>
            <li>Confirma o cancela la propuesta.</li>
          </ol>
        </section>
        <div class="quiet-card">
          <i class="pi pi-shield" aria-hidden="true"></i>
          <h3>Cuidar también es poner límites</h3>
          <p>
            Podrás revisar cada acción y conocer su estado. Una solicitud
            enviada no significa que el dispositivo ya la haya ejecutado.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
