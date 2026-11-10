import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router/index";
import "./style.css";
import "./workspace/workspace.css";

import PrimeVue from "primevue/config";
import Aura from "@primevue/themes/aura";

import "primeicons/primeicons.css";

import ConfirmationService from "primevue/confirmationservice";
import DialogService from "primevue/dialogservice";
import ToastService from "primevue/toastservice";

import ConfirmDialog from "primevue/confirmdialog";
import Dialog from "primevue/dialog";
import Toast from "primevue/toast";

const app = createApp(App);

// Pinia
const pinia = createPinia();
app.use(pinia);

// PrimeVue
app.use(PrimeVue, {
  ripple: true,
  theme: {
    preset: Aura,
    options: {
      prefix: "p",
      cssLayer: false,
      darkModeSelector: '[data-theme="dark"]',
    },
  },
});

app.use(ConfirmationService);
app.use(DialogService);
app.use(ToastService);

// Vue Router
app.use(router);

// Global PrimeVue components
app.component("pv-confirm-dialog", ConfirmDialog);
app.component("pv-dialog", Dialog);
app.component("pv-toast", Toast);

app.mount("#app");
