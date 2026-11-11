<script setup lang="ts">
import FeatureNotice from "../components/feature-notice.vue";
import { useDemoStore } from "../demo.store";
withDefaults(defineProps<{ demo?: boolean }>(), { demo: false });
const store = useDemoStore();
</script>
<template>
  <div class="workspace-page">
    <div class="ps-page-header">
      <div>
        <span class="eyebrow">PEQUEÑOS CUIDADOS, GRANDES LOGROS</span>
        <h1 class="ps-page-header__title">Tu constancia florece</h1>
        <p class="ps-page-header__subtitle">
          Celebra el cuidado de tus plantas con medallas digitales.
        </p>
      </div>
      <span class="soft-tag"
        ><span class="status-dot"></span> Ethereum Sepolia · Red de
        pruebas</span
      >
    </div>
    <FeatureNotice :demo="demo" />
    <section class="reward-hero">
      <div>
        <span class="eyebrow">EL RETO DE LOS 30 DÍAS</span>
        <h2>El mejor hábito<br />es cuidar lo que crece.</h2>
        <p>
          Mantén condiciones adecuadas de humedad y luz. Cada día con lecturas
          válidas te acerca a tu próxima medalla.
        </p>
        <div class="reward-progress">
          <strong>{{ demo ? "24" : "0" }} <span>/ 30 días</span></strong
          ><span>{{ demo ? "Progreso de ejemplo" : "Sin reto activo" }}</span>
        </div>
        <progress
          :value="demo ? 24 : 0"
          max="30"
          aria-label="Progreso del reto de cuidado"
        ></progress>
        <p class="reward-footnote">
          Los periodos sin lecturas válidas no cuentan como cuidado verificado.
        </p>
      </div>
      <div class="medal-art" aria-hidden="true">
        <div class="medal-ring">
          <i class="pi pi-leaf"></i><span>PLANTSYNC</span><strong>30</strong
          ><small>DÍAS DE CUIDADO</small>
        </div>
      </div>
    </section>
    <div class="feature-grid">
      <section class="ps-card panel">
        <div class="section-heading">
          <h2>Tu billetera</h2>
          <i class="pi pi-wallet" aria-hidden="true"></i>
        </div>
        <p class="muted">
          Rabby Wallet será tu acceso a las medallas en Ethereum Sepolia.
        </p>
        <div class="wallet-box">
          <i class="pi pi-wallet" aria-hidden="true"></i>
          <div>
            <strong>{{
              demo && store.walletConnected
                ? "Billetera de demostración"
                : "Conecta cuando estés listo"
            }}</strong>
            <p>
              {{
                demo && store.walletConnected
                  ? "Conexión ficticia · Sin dirección real"
                  : "No necesitas una billetera para cuidar tus plantas."
              }}
            </p>
          </div>
        </div>
        <button
          v-if="!store.walletConnected || !demo"
          class="ps-btn ps-btn--primary wide-button"
          :disabled="!demo"
          @click="store.walletConnected = true"
        >
          Simular conexión de Rabby Wallet</button
        ><button
          v-else
          class="ps-btn ps-btn--outline wide-button"
          @click="store.walletConnected = false"
        >
          Desconectar simulación
        </button>
        <p class="privacy-note">
          <i class="pi pi-lock" aria-hidden="true"></i> Nunca te pediremos tu
          frase de recuperación.
        </p>
      </section>
      <section class="ps-card panel">
        <div class="section-heading">
          <h2>Tu colección</h2>
          <span class="soft-tag">{{
            demo && store.rewardClaimed
              ? "1 medalla de ejemplo"
              : "Sin medallas"
          }}</span>
        </div>
        <div class="collection-item">
          <div class="mini-medal">
            <i class="pi pi-trophy" aria-hidden="true"></i>
          </div>
          <div>
            <h3>Guardián verde</h3>
            <p>Un ciclo completo de cuidado.</p>
            <span class="muted">{{
              demo
                ? "Reto anterior · Ejemplo de elegibilidad"
                : "Completa tu primer reto para obtenerla."
            }}</span>
          </div>
        </div>
        <button
          class="ps-btn ps-btn--outline wide-button"
          :disabled="!demo || !store.walletConnected || store.rewardClaimed"
          @click="store.rewardClaimed = true"
        >
          {{
            demo && store.rewardClaimed
              ? "Medalla de ejemplo añadida"
              : "Simular obtención de medalla"
          }}
        </button>
        <p class="privacy-note" role="status">
          {{
            demo
              ? "Esta demo no abre Rabby Wallet, no firma y no envía transacciones."
              : "La emisión se habilitará después de verificar los logros."
          }}
        </p>
      </section>
    </div>
  </div>
</template>
