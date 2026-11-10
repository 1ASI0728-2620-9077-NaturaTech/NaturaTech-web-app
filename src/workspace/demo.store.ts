import { defineStore } from "pinia";
import { ref } from "vue";

/** Isolated, in-memory fixtures. Never imported by API services or persisted as user data. */
export const useDemoStore = defineStore("workspace-demo", () => {
  const plants = [
    {
      id: 1,
      name: "Monstera",
      species: "Monstera deliciosa",
      location: "Sala de estar",
      humidity: 42,
      light: 68,
      temperature: 24,
      tone: "sage",
      status: "Necesita agua",
    },
    {
      id: 2,
      name: "Ficus",
      species: "Ficus elastica",
      location: "Estudio",
      humidity: 61,
      light: 74,
      temperature: 23,
      tone: "sand",
      status: "En equilibrio",
    },
    {
      id: 3,
      name: "Pothos",
      species: "Epipremnum aureum",
      location: "Dormitorio",
      humidity: 58,
      light: 52,
      temperature: 22,
      tone: "mint",
      status: "En equilibrio",
    },
  ];
  const tasks = ref([
    {
      id: 1,
      title: "Regar la Monstera",
      detail: "Sala de estar · Riego",
      done: false,
    },
    {
      id: 2,
      title: "Revisar las hojas del Ficus",
      detail: "Estudio · Revisión semanal",
      done: false,
    },
    {
      id: 3,
      title: "Girar la maceta del Pothos",
      detail: "Dormitorio · Cuidado",
      done: true,
    },
  ]);
  const walletConnected = ref(false);
  const rewardClaimed = ref(false);
  function toggleTask(id: number) {
    const task = tasks.value.find((item) => item.id === id);
    if (task) task.done = !task.done;
  }
  return { plants, tasks, walletConnected, rewardClaimed, toggleTask };
});
