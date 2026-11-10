<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useDemoStore } from "../demo.store";
import PlantArt from "../components/plant-art.vue";
import HealthPage from "./health.page.vue";
import AssistantPage from "./assistant.page.vue";
import RewardsPage from "./rewards.page.vue";
const route = useRoute();
const store = useDemoStore();
const section = computed(() => String(route.params.section || "dashboard"));
const search = ref("");
const selectedPlant = computed(() =>
  store.plants.find((plant) => String(plant.id) === route.query.plant),
);
const filteredPlants = computed(() =>
  store.plants.filter((p) =>
    `${p.name} ${p.species}`
      .toLocaleLowerCase()
      .includes(search.value.toLocaleLowerCase()),
  ),
);
const pending = computed(() => store.tasks.filter((task) => !task.done).length);
</script>
<template>
  <HealthPage v-if="section === 'health'" demo />
  <AssistantPage v-else-if="section === 'assistant'" demo />
  <RewardsPage v-else-if="section === 'rewards'" demo />
  <div v-else class="workspace-page">
    <template v-if="section === 'dashboard'">
      <div class="ps-page-header">
        <div>
          <span class="eyebrow">TU ESPACIO VERDE, CONECTADO</span>
          <h1 class="ps-page-header__title">Un buen día para crecer.</h1>
          <p class="ps-page-header__subtitle">
            Un vistazo a tus plantas. Un pequeño paso para cuidarlas mejor.
          </p>
        </div>
        <router-link to="/preview/health" class="ps-btn ps-btn--primary"
          ><i class="pi pi-camera" aria-hidden="true"></i> Analizar una
          planta</router-link
        >
      </div>
      <section class="garden-hero">
        <div class="garden-hero__copy">
          <span class="hero-label"
            ><span class="status-dot"></span> TU JARDÍN, A TU RITMO</span
          >
          <h2>Cuidar es conectar.<br /><em>Lo demás, florece.</em></h2>
          <p>
            Conoce lo que necesitan tus plantas y encuentra el equilibrio, hoja
            a hoja.
          </p>
          <router-link to="/preview/plants" class="hero-link"
            >Explorar mis plantas
            <i class="pi pi-arrow-right" aria-hidden="true"></i
          ></router-link>
        </div>
        <div class="garden-hero__art">
          <span class="hero-orbit"></span><PlantArt />
          <div class="floating-reading">
            <i class="pi pi-tint" aria-hidden="true"></i
            ><span
              >Humedad<strong>58% <small>· ejemplo</small></strong></span
            >
          </div>
        </div>
      </section>
      <section class="overview-metrics" aria-label="Resumen de ejemplo">
        <div class="ps-card overview-metric">
          <span class="metric-symbol"
            ><i class="pi pi-leaf" aria-hidden="true"></i
          ></span>
          <div>
            <span>Plantas en tu espacio</span
            ><strong>03 <small>conectadas al cuidado</small></strong>
          </div>
        </div>
        <div class="ps-card overview-metric">
          <span class="metric-symbol amber"
            ><i class="pi pi-check-circle" aria-hidden="true"></i
          ></span>
          <div>
            <span>Cuidados pendientes</span
            ><strong
              >{{ String(pending).padStart(2, "0") }}
              <small>un momento para ellas</small></strong
            >
          </div>
        </div>
        <div class="ps-card overview-metric">
          <span class="metric-symbol violet"
            ><i class="pi pi-trophy" aria-hidden="true"></i
          ></span>
          <div>
            <span>Tu próximo logro</span
            ><strong>24<small> / 30 días de cuidado</small></strong>
          </div>
        </div>
      </section>
    </template>
    <template v-if="section === 'dashboard' || section === 'plants'">
      <div v-if="section === 'plants'" class="ps-page-header">
        <div>
          <span class="eyebrow">CADA PLANTA, SU PROPIO MUNDO</span>
          <h1 class="ps-page-header__title">Tu colección verde</h1>
          <p class="ps-page-header__subtitle">
            Conoce sus condiciones y acompaña su crecimiento.
          </p>
        </div>
        <router-link to="/preview/health" class="ps-btn ps-btn--primary"
          ><i class="pi pi-camera" aria-hidden="true"></i> Analizar
          fotografía</router-link
        >
      </div>
      <template v-if="selectedPlant && section === 'plants'"
        ><router-link to="/preview/plants" class="text-link"
          ><i class="pi pi-arrow-left" aria-hidden="true"></i> Volver a la
          colección</router-link
        >
        <section class="plant-detail-preview ps-card">
          <div class="plant-visual" :class="selectedPlant.tone">
            <PlantArt :variant="selectedPlant.id" />
          </div>
          <div class="panel">
            <span class="eyebrow">{{ selectedPlant.location }}</span>
            <h2>{{ selectedPlant.name }}</h2>
            <p class="muted">
              <em>{{ selectedPlant.species }}</em>
            </p>
            <span class="soft-tag">{{ selectedPlant.status }}</span>
            <div class="plant-detail-values">
              <div>
                <span>Humedad</span
                ><strong>{{ selectedPlant.humidity }}%</strong>
              </div>
              <div>
                <span>Luz</span><strong>{{ selectedPlant.light }}%</strong>
              </div>
              <div>
                <span>Temperatura</span
                ><strong>{{ selectedPlant.temperature }} °C</strong>
              </div>
            </div>
            <p class="muted">
              Lecturas de ejemplo. En la versión conectada verás su fecha y
              estado de actualización.
            </p>
            <div class="button-row">
              <router-link to="/preview/health" class="ps-btn ps-btn--primary"
                >Revisar su salud</router-link
              ><router-link
                to="/preview/assistant"
                class="ps-btn ps-btn--outline"
                >Consultar al asistente</router-link
              >
            </div>
          </div>
        </section></template
      >
      <template v-else
        ><div class="section-heading">
          <h2>
            {{
              section === "dashboard"
                ? "Un vistazo a tus plantas"
                : "Todas tus plantas"
            }}
            <span class="count-label">03</span>
          </h2>
          <router-link
            v-if="section === 'dashboard'"
            class="text-link"
            to="/preview/plants"
            >Ver colección
            <i class="pi pi-arrow-up-right" aria-hidden="true"></i></router-link
          ><label v-else class="search-field"
            ><i class="pi pi-search" aria-hidden="true"></i
            ><input
              v-model="search"
              aria-label="Buscar plantas"
              placeholder="Buscar por nombre o especie"
          /></label>
        </div>
        <div class="plant-collection">
          <router-link
            v-for="plant in filteredPlants"
            :key="plant.id"
            :to="{ path: '/preview/plants', query: { plant: plant.id } }"
            class="plant-tile ps-card"
            ><div class="plant-visual" :class="plant.tone">
              <span class="plant-location">{{ plant.location }}</span
              ><PlantArt :variant="plant.id" /><span class="plant-open"
                ><i class="pi pi-arrow-up-right" aria-hidden="true"></i
              ></span>
            </div>
            <div class="plant-tile__body">
              <div class="section-heading">
                <h3>{{ plant.name }}</h3>
                <span
                  class="plant-health-dot"
                  :class="{ amber: plant.id === 1 }"
                  :aria-label="plant.status"
                ></span>
              </div>
              <p>{{ plant.species }}</p>
              <div class="plant-readings">
                <span
                  ><i class="pi pi-tint" aria-hidden="true"></i>
                  {{ plant.humidity }}%</span
                ><span
                  ><i class="pi pi-sun" aria-hidden="true"></i>
                  {{ plant.light }}%</span
                ><span>{{ plant.temperature }} °C</span>
              </div>
            </div></router-link
          >
        </div>
        <div v-if="!filteredPlants.length" class="ps-empty">
          No hay plantas que coincidan con tu búsqueda.
        </div></template
      >
    </template>
    <section
      v-if="section === 'dashboard' || section === 'tasks'"
      class="dashboard-bottom"
      :class="{ 'single-column': section === 'tasks' }"
    >
      <div class="ps-card panel">
        <div class="section-heading">
          <div>
            <span v-if="section === 'tasks'" class="eyebrow">PASO A PASO</span>
            <h2>
              {{
                section === "tasks"
                  ? "Tu agenda de cuidados"
                  : "Un momento para cuidarlas"
              }}
            </h2>
          </div>
          <span class="soft-tag">{{ pending }} pendientes</span>
        </div>
        <p class="muted">Pequeñas acciones que hacen la diferencia.</p>
        <div class="care-list">
          <label
            v-for="task in store.tasks"
            :key="task.id"
            class="care-item"
            :class="{ complete: task.done }"
            ><input
              type="checkbox"
              :checked="task.done"
              @change="store.toggleTask(task.id)" /><span
              ><strong>{{ task.title }}</strong
              ><small>{{ task.detail }}</small></span
            ><i class="pi pi-leaf" aria-hidden="true"></i
          ></label>
        </div>
        <p v-if="!pending" role="status" class="soft-tag">
          Todo listo. Tus cuidados de ejemplo están completos.
        </p>
      </div>
      <div v-if="section === 'dashboard'" class="discovery-card">
        <span class="eyebrow">MIRA UN POCO MÁS CERCA</span
        ><i class="pi pi-sparkles discovery-icon" aria-hidden="true"></i>
        <h2>¿Qué te dicen<br />sus hojas?</h2>
        <p>
          Explora una nueva forma de conocer y cuidar tus plantas con una
          fotografía.
        </p>
        <router-link to="/preview/health" class="text-link"
          >Probar análisis de imagen
          <i class="pi pi-arrow-right" aria-hidden="true"></i
        ></router-link>
      </div>
    </section>
    <template v-if="section === 'devices'"
      ><div class="ps-page-header">
        <div>
          <span class="eyebrow">CERCA, INCLUSO A DISTANCIA</span>
          <h1 class="ps-page-header__title">Dispositivos de tu jardín</h1>
          <p class="ps-page-header__subtitle">
            Lecturas claras y acciones bajo tu control.
          </p>
        </div>
        <span class="soft-tag">Simuladores</span>
      </div>
      <div class="plant-collection">
        <section
          v-for="plant in store.plants"
          :key="plant.id"
          class="ps-card panel device-card"
        >
          <div class="section-heading">
            <div class="feature-icon">
              <i class="pi pi-microchip" aria-hidden="true"></i>
            </div>
            <span class="soft-tag">{{
              plant.id === 3 ? "Sin conexión · Ejemplo" : "Conectado · Ejemplo"
            }}</span>
          </div>
          <h2>Nodo {{ plant.name }}</h2>
          <p class="muted">{{ plant.location }}</p>
          <dl class="device-readings">
            <div>
              <dt>Humedad</dt>
              <dd>
                {{
                  plant.id === 3 ? "Sin datos recientes" : `${plant.humidity}%`
                }}
              </dd>
            </div>
            <div>
              <dt>Luz</dt>
              <dd>
                {{ plant.id === 3 ? "Sin datos recientes" : `${plant.light}%` }}
              </dd>
            </div>
            <div>
              <dt>Origen</dt>
              <dd>Simulado</dd>
            </div>
          </dl>
          <router-link
            v-if="plant.id === 1"
            to="/preview/assistant"
            class="ps-btn ps-btn--outline wide-button"
            >Explorar control de luz</router-link
          >
          <p v-else class="privacy-note">
            Sin acciones disponibles en este ejemplo.
          </p>
        </section>
      </div></template
    >
  </div>
</template>
