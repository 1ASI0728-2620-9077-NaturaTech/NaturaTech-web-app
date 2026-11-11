<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import OnboardingCard from "../components/onboarding-card.vue";
import { IoTApiService } from "@/iot-management/services/iot-api.service";
import { loadPersonalPlants } from "@/shared/services/personal-workspace.service";
import type { Plant } from "@/plant-management/model/plant.entity";
import {
  integrationApi as api,
  integrationError,
  type Wallet,
  type GreenReward,
} from "../services/integration-api";
import {
  getRabby,
  walletError,
  walletAccount,
  encodeMessage,
  type WalletProvider,
} from "../services/rabby";
const wallet = ref<Wallet | null>(null),
  account = ref(""),
  network = ref(""),
  rewards = ref<GreenReward[]>([]),
  plants = ref<Plant[]>([]);
const loaded = ref(false),
  linkedPlantIds = ref<number[]>([]);
const eligiblePlants = computed(() =>
  plants.value.filter((p) => linkedPlantIds.value.includes(p.id)),
);
const busy = ref(false),
  simulated = ref(false),
  available = ref(false),
  error = ref(""),
  plantId = ref<number | null>(null);
const matched = computed(
  () =>
    network.value === "0xaa36a7" &&
    !!account.value &&
    wallet.value?.address.toLowerCase() === account.value,
);
let provider: WalletProvider | undefined,
  generation = 0;
function changed() {
  generation++;
  account.value = "";
  network.value = "";
  error.value =
    "La cuenta o red de Rabby Wallet cambió. Conecta y verifica de nuevo antes de continuar.";
}
async function providerInstance() {
  if (!provider) {
    provider = await getRabby();
    provider.on?.("accountsChanged", changed);
    provider.on?.("chainChanged", changed);
    provider.on?.("disconnect", changed);
  }
  return provider;
}
async function load() {
  busy.value = true;
  error.value = "";
  try {
    const [caps, binding, context] = await Promise.all([
      api.capabilities(),
      api.wallet(),
      loadPersonalPlants(),
    ]);
    available.value = caps.rewards;
    simulated.value = caps.iotEnvironment === "SIMULATED";
    wallet.value = binding;
    plants.value = context.plants;
    loaded.value = true;
    const nodes = await new IoTApiService().getNodesByProfile(
      context.profile.id,
    );
    linkedPlantIds.value = nodes
      .filter((n) => n.profileId === context.profile.id && n.plantId)
      .map((n) => n.plantId);
    const list = await api.rewards();
    rewards.value = list.items;
    for (const item of list.items) {
      try {
        const updated = await api.reward(item.id);
        rewards.value = rewards.value.map((r) =>
          r.id === updated.id ? updated : r,
        );
      } catch (e) {
        error.value = integrationError(e);
      }
    }
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
async function connect() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    const p = await providerInstance();
    account.value = await walletAccount(p, true);
    network.value = String(await p.request({ method: "eth_chainId" }));
    if (network.value !== "0xaa36a7")
      error.value = "Cambia a Ethereum Sepolia para verificar esta billetera.";
  } catch (e) {
    error.value = walletError(e);
  } finally {
    busy.value = false;
  }
}
async function switchNetwork() {
  if (busy.value) return;
  busy.value = true;
  try {
    await (
      await providerInstance()
    ).request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }],
    });
    account.value = await walletAccount(await providerInstance());
    network.value = String(
      await (await providerInstance()).request({ method: "eth_chainId" }),
    );
    error.value = "";
  } catch {
    error.value =
      "No se pudo cambiar a Sepolia. Habilita las redes de prueba en Rabby Wallet e inténtalo de nuevo.";
  } finally {
    busy.value = false;
  }
}
async function verify() {
  if (busy.value || !account.value || network.value !== "0xaa36a7") return;
  busy.value = true;
  error.value = "";
  const expected = account.value,
    version = generation;
  try {
    const p = await providerInstance();
    const challenge = await api.challenge(expected);
    if (version !== generation) throw new Error("Cuenta modificada");
    const signature = await p.request({
      method: "personal_sign",
      params: [encodeMessage(challenge.message), expected],
    });
    if (
      version !== generation ||
      (await walletAccount(p)) !== expected ||
      String(await p.request({ method: "eth_chainId" })) !== "0xaa36a7"
    )
      throw new Error("Cuenta modificada");
    if (typeof signature !== "string") throw new Error("Firma inválida");
    wallet.value = await api.verifyWallet(challenge.challengeId, signature);
  } catch (e) {
    error.value = (e as { response?: unknown })?.response
      ? integrationError(e)
      : walletError(e);
  } finally {
    busy.value = false;
  }
}
async function unlink() {
  if (
    busy.value ||
    !window.confirm(
      "¿Desvincular tu billetera? Las emisiones ya enviadas conservan su destinatario.",
    )
  )
    return;
  busy.value = true;
  try {
    await api.unlinkWallet();
    wallet.value = null;
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
async function enroll() {
  if (
    busy.value ||
    !plantId.value ||
    !available.value ||
    !eligiblePlants.value.some((p) => p.id === plantId.value)
  )
    return;
  busy.value = true;
  error.value = "";
  try {
    await api.enroll(plantId.value);
    await load();
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
async function claim(item: GreenReward) {
  if (busy.value || !available.value || !matched.value) return;
  busy.value = true;
  error.value = "";
  try {
    const p = await providerInstance();
    if (
      (await walletAccount(p)) !== account.value ||
      String(await p.request({ method: "eth_chainId" })) !== "0xaa36a7"
    ) {
      changed();
      return;
    }
    const updated = await api.claim(item.id);
    rewards.value = rewards.value.map((r) =>
      r.id === updated.id ? updated : r,
    );
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
async function restart(item: GreenReward) {
  if (
    busy.value ||
    !window.confirm(
      "¿Reiniciar el reto? El periodo actual se reemplazará y el conteo comenzará desde hoy.",
    )
  )
    return;
  busy.value = true;
  try {
    await api.restart(item.id);
    await load();
  } catch (e) {
    error.value = integrationError(e);
  } finally {
    busy.value = false;
  }
}
function explorer(hash: string | null) {
  return hash && /^0x[0-9a-fA-F]{64}$/.test(hash)
    ? "https://sepolia.etherscan.io/tx/" + hash
    : null;
}
onMounted(load);
onBeforeUnmount(() => {
  provider?.removeListener?.("accountsChanged", changed);
  provider?.removeListener?.("chainChanged", changed);
  provider?.removeListener?.("disconnect", changed);
});
</script>
<template>
  <div class="workspace-page">
    <div class="ps-page-header">
      <div>
        <span class="eyebrow">CONSTANCIA QUE FLORECE</span>
        <h1 class="ps-page-header__title">Tus medallas verdes</h1>
        <p class="ps-page-header__subtitle">
          30 días de lecturas válidas · Ethereum Sepolia
        </p>
      </div>
      <button class="ps-btn ps-btn--outline" :disabled="busy" @click="load">
        Actualizar progreso
      </button>
    </div>
    <p v-if="error" role="alert" class="ps-alert ps-alert--error">
      {{ error }}
    </p>
    <p v-if="loaded && !available && !busy" class="ps-alert">
      La emisión de medallas todavía no está configurada. No se enviarán
      transacciones.
    </p>
    <p v-if="simulated" class="ps-alert" role="status">
      Entorno IoT simulado: estos retos utilizan lecturas generadas por
      software. Las medallas en Sepolia son de prueba y no acreditan cuidado
      físico.
    </p>
    <OnboardingCard
      v-if="loaded && !plants.length"
      title="Una medalla empieza con una planta"
      description="1. Agrega una planta. 2. Vincula su dispositivo. 3. Inicia un reto con lecturas continuas durante 30 días."
      to="/plants"
      action="Agregar planta"
      step="PASO 1 DE 3"
    />
    <OnboardingCard
      v-else-if="loaded && !eligiblePlants.length"
      title="Conecta un dispositivo a tu planta"
      description="Necesitamos lecturas de humedad y luz para medir su cuidado. Vincula un dispositivo y mantén el simulador en ejecución."
      to="/iot"
      action="Vincular dispositivo"
      step="PASO 2 DE 3"
    />
    <div class="feature-grid">
      <section class="ps-card panel">
        <h2>Tu billetera</h2>
        <p class="muted">
          Conectar no equivale a verificar. La firma acredita tu dirección y no
          envía fondos.
        </p>
        <p class="form-hint">
          Usa un navegador con la extensión Rabby habilitada, o el navegador
          integrado de Rabby en móvil.
          <a href="https://rabby.io" target="_blank" rel="noopener noreferrer"
            >Obtener Rabby Wallet</a
          >
        </p>
        <p v-if="wallet" class="wallet-address">
          Vinculada: {{ wallet.address }}
        </p>
        <p v-if="account" class="wallet-address">Rabby Wallet: {{ account }}</p>
        <p v-if="matched" role="status">
          Cuenta verificada y red Sepolia seleccionada.
        </p>
        <div class="wallet-actions">
          <button
            class="ps-btn ps-btn--primary"
            :disabled="busy"
            @click="connect"
          >
            Conectar Rabby Wallet</button
          ><button
            v-if="account && network !== '0xaa36a7'"
            class="ps-btn ps-btn--outline"
            :disabled="busy"
            @click="switchNetwork"
          >
            Cambiar a Sepolia</button
          ><button
            v-if="account && network === '0xaa36a7' && !matched"
            class="ps-btn ps-btn--outline"
            :disabled="busy"
            @click="verify"
          >
            Firmar y verificar</button
          ><button
            v-if="wallet"
            class="ps-btn ps-btn--outline"
            :disabled="busy"
            @click="unlink"
          >
            Desvincular
          </button>
        </div>
      </section>
      <section class="ps-card panel">
        <h2>Comienza un reto</h2>
        <p>
          El conteo utiliza las lecturas del dispositivo desde la inscripción.
          Los huecos o valores fuera de rango interrumpen el periodo.
        </p>
        <label class="ps-input-group"
          >Tu planta<select v-model="plantId" :disabled="busy">
            <option :value="null">Selecciona una planta</option>
            <option
              v-for="plant in eligiblePlants"
              :key="plant.id"
              :value="plant.id"
            >
              {{ plant.name }}
            </option>
          </select></label
        ><button
          class="ps-btn ps-btn--primary"
          :disabled="busy || !available || !plantId || !eligiblePlants.length"
          @click="enroll"
        >
          Iniciar reto de 30 días
        </button>
      </section>
    </div>
    <section class="ps-card panel">
      <h2>Retos y medallas</h2>
      <p v-if="!rewards.length && !busy" class="muted">
        Todavía no tienes retos inscritos.
      </p>
      <article v-for="item in rewards" :key="item.id" class="reward-entry">
        <h3>
          {{
            plants.find((p) => p.id === item.plantId)?.name ||
            "Planta " + item.plantId
          }}
        </h3>
        <p>
          {{ item.eligibleDays }} / {{ item.requiredDays }} días ·
          {{ item.status }}
        </p>
        <progress
          :value="item.eligibleDays"
          :max="item.requiredDays"
          aria-label="Días válidos de cuidado"
        ></progress>
        <p v-if="item.status === 'SUBMITTED'">
          Transacción pendiente de confirmación. Actualiza el progreso; no es
          necesario solicitar otra medalla.
        </p>
        <p v-if="item.status === 'FAILED'">
          La emisión requiere revisión. No se creará una transacción duplicada
          automáticamente.
        </p>
        <button
          v-if="item.status === 'ELIGIBLE'"
          class="ps-btn ps-btn--primary"
          :disabled="busy || !matched || !available"
          @click="claim(item)"
        >
          Solicitar medalla</button
        ><button
          v-if="item.status === 'IN_PROGRESS'"
          class="ps-btn ps-btn--outline"
          :disabled="busy"
          @click="restart(item)"
        >
          Reiniciar periodo</button
        ><a
          v-if="explorer(item.transactionHash)"
          :href="explorer(item.transactionHash)!"
          target="_blank"
          rel="noopener noreferrer"
          >Ver transacción en Sepolia</a
        >
      </article>
    </section>
  </div>
</template>
<style scoped>
.wallet-address {
  overflow-wrap: anywhere;
}
.wallet-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.reward-entry {
  padding: 1.3rem 0;
  border-bottom: 1px solid var(--ps-border);
}
.reward-entry a {
  display: block;
  margin-top: 1rem;
}
select {
  padding: 0.7rem;
  background: var(--ps-surface);
  color: var(--ps-text);
  max-width: 100%;
}
</style>
