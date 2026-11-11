<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from "vue";
import http from "@/shared/services/http-common";
import { PlantService } from "@/plant-management/services/plant-api.service";
import { useAuthenticationStore } from "@/iam/services/authentication.store";
import { ProfileApiService } from "@/profile-management/services/profile-api.service";
import type { ChatMessage } from "@/chatbot/model/chat-message.entity";
import type { Plant } from "@/plant-management/model/plant.entity";

const authStore = useAuthenticationStore();
const profileApi = new ProfileApiService();

const messages = ref<ChatMessage[]>([]);
const input = ref("");
const sending = ref(false);
const error = ref("");
const controller = new AbortController();
onBeforeUnmount(() => controller.abort());
const chatContainer = ref<HTMLElement | null>(null);
const plants = ref<Plant[]>([]);

let messageId = 0;

const popularQuestions = [
  "¿Con qué frecuencia debo regar mis plantas?",
  "¿Qué luz necesitan las plantas de interior?",
  "¿Cómo prevengo enfermedades en mis plantas?",
  "¿Cuándo debo trasplantar mis plantas?",
];

onMounted(async () => {
  // Load user's plants for context
  if (authStore.userId) {
    try {
      const profile = await profileApi.getByUserId(authStore.userId);
      plants.value = await PlantService.getByProfile(profile.id);
    } catch {
      /* silent */
    }
  }
});

function buildSystemPrompt(): string {
  let plantContext = "";
  if (plants.value.length > 0) {
    plantContext = "\n\nThe user has the following plants:\n";
    plantContext += plants.value
      .map(
        (p) =>
          `- ${p.name} (${p.species}): humidity=${p.humidity || "unknown"}, next watering=${p.nextWateringDate || "unknown"}, description=${p.description || "none"}`,
      )
      .join("\n");
  }

  return `You are PlantCare Assistant, a friendly and knowledgeable AI expert in plant care, gardening, and botany. You help users take care of their plants by providing specific, actionable advice.

Your responses should be:
- Concise and practical (2-4 sentences max unless the user asks for more detail)
- Focused on plant care: watering, light, soil, fertilizing, pests, repotting, propagation
- Personalized based on the user's specific plants when available
- In the same language the user writes in (Spanish or English)

If the user asks about something unrelated to plants or gardening, politely redirect them to plant-related topics.${plantContext}`;
}

async function sendMessage(text?: string) {
  const msg = (text || input.value).trim();
  if (!msg || msg.length > 500 || sending.value) return;
  error.value = "";

  messages.value.push({
    id: ++messageId,
    content: msg,
    sender: "user",
    timestamp: new Date().toISOString(),
  });
  input.value = "";
  sending.value = true;
  await scrollToBottom();

  try {
    // Build messages array with system prompt + conversation history
    const apiMessages = [
      { role: "system", content: buildSystemPrompt() },
      ...messages.value.slice(-20).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    const response = await http.post(
      "/chat",
      { messages: apiMessages },
      { timeout: 30000, signal: controller.signal },
    );
    const reply = response.data.reply;
    if (typeof reply !== "string" || !reply.trim())
      throw new Error("Empty response");

    messages.value.push({
      id: ++messageId,
      content: reply,
      sender: "bot",
      timestamp: new Date().toISOString(),
    });
  } catch {
    messages.value.pop();
    input.value = msg;
    if (!controller.signal.aborted)
      error.value =
        "El chat no pudo responder. Conservamos tu mensaje para que puedas reenviarlo.";
  } finally {
    sending.value = false;
    await scrollToBottom();
  }
}

async function scrollToBottom() {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}
</script>

<template>
  <div class="chatbot-page">
    <div class="ps-page-header">
      <div>
        <h1 class="ps-page-header__title">Chat de consultas</h1>
        <p class="ps-page-header__subtitle">
          Tu espacio para consultar sobre el cuidado de tus plantas.
        </p>
      </div>
    </div>

    <p v-if="error" role="alert" class="workspace-notice">{{ error }}</p>
    <!-- Chat area -->
    <div class="chat-container ps-card">
      <div ref="chatContainer" class="chat-messages">
        <div v-if="messages.length === 0" class="chat-empty">
          <i class="pi pi-comments"></i>
          <p>Inicia una conversación sobre tus plantas.</p>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="ps-chat-bubble"
          :class="
            msg.sender === 'user'
              ? 'ps-chat-bubble--user'
              : 'ps-chat-bubble--bot'
          "
        >
          <p class="chat-msg-text">{{ msg.content }}</p>
          <span class="chat-msg-time">{{
            new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          }}</span>
        </div>

        <div v-if="sending" class="ps-chat-bubble ps-chat-bubble--bot">
          <i class="pi pi-spinner pi-spin"></i> Preparando respuesta...
        </div>
      </div>

      <div class="chat-input-area">
        <input
          v-model="input"
          type="text"
          placeholder="Escribe tu consulta..."
          class="chat-input"
          aria-label="Mensaje para el chat de consultas"
          :maxlength="500"
          @keydown.enter="sendMessage()"
          :disabled="sending"
        />
        <button
          class="chat-send-btn"
          aria-label="Enviar mensaje"
          @click="sendMessage()"
          :disabled="!input.trim() || sending"
        >
          <i class="pi pi-send"></i>
        </button>
      </div>
    </div>

    <!-- Popular questions -->
    <div class="popular-questions">
      <h3 class="popular-questions__title">Preguntas frecuentes:</h3>
      <div class="popular-questions__grid">
        <button
          v-for="q in popularQuestions"
          :key="q"
          class="popular-questions__item"
          @click="sendMessage(q)"
          :disabled="sending"
        >
          {{ q }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 55vh;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ps-text-secondary);
}

.chat-empty i {
  font-size: 3rem;
  margin-bottom: 0.75rem;
  color: var(--ps-border);
}

.chat-msg-text {
  margin: 0 0 0.25rem;
}

.chat-msg-time {
  font-size: 0.7rem;
  opacity: 0.7;
}

.chat-input-area {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--ps-border);
}

.chat-input {
  flex: 1;
  padding: 0.7rem 1rem;
  border: 1px solid var(--ps-border);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  outline: none;
  color: var(--ps-text);
  background: var(--ps-bg);
}

.chat-input:focus {
  border-color: var(--ps-primary);
  box-shadow: 0 0 0 3px rgba(107, 124, 62, 0.1);
}

.chat-send-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--ps-primary);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.chat-send-btn:hover:not(:disabled) {
  background: var(--ps-primary-dark);
}

.chat-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.popular-questions {
  margin-top: 1.5rem;
}

.popular-questions__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ps-text);
  margin: 0 0 1rem;
}

.popular-questions__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.popular-questions__item {
  padding: 0.75rem 1rem;
  border: 1px solid var(--ps-border);
  border-radius: 0.5rem;
  background: var(--ps-card);
  color: var(--ps-text);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.popular-questions__item:hover:not(:disabled) {
  border-color: var(--ps-primary);
  background: rgba(107, 124, 62, 0.03);
}

.popular-questions__item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
