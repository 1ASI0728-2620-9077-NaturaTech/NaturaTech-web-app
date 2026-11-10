import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import http from "../services/http-common";
import { useAuthenticationStore } from "@/iam/services/authentication.store";
import Tasks from "@/task-management/pages/tasks-timeline.page.vue";
import Plants from "@/plant-management/pages/plants.page.vue";
import Profile from "@/profile-management/pages/profile.page.vue";
import Dashboard from "@/analytics/pages/analytics-dashboard.page.vue";
import {
  ProfileApiService,
  ProfileNotFoundError,
} from "@/profile-management/services/profile-api.service";
import { loadPersonalTasks } from "../services/personal-workspace.service";
import { PlantService } from "@/plant-management/services/plant-api.service";
import { TaskApiService } from "@/task-management/services/task-api.service";
import { AxiosError } from "axios";

vi.mock("../services/http-common", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));
enableAutoUnmount(afterEach);
const profile = {
  id: 8,
  userId: 2,
  personName: "Jardín",
  subscriptionPlan: "BASIC",
};
const plant = {
  id: 5,
  profileId: 8,
  name: "Monstera",
  species: "Monstera deliciosa",
};
const task = {
  id: 6,
  profileId: 8,
  plantId: 5,
  action: "Regar",
  status: "PENDING",
  scheduledDate: "2026-11-10",
  humidity: 40,
};
const get = vi.mocked(http.get);
beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  vi.resetAllMocks();
  useAuthenticationStore().signIn(
    { id: 2, email: "owner@example.test", token: "fixture" },
    "admin",
  );
});

describe("Existing views and API compatibility", () => {
  it("shows a recoverable tasks error instead of an empty success", async () => {
    get.mockRejectedValue(new Error("offline"));
    const wrapper = mount(Tasks);
    await flushPromises();
    expect(wrapper.get("[role=alert]").text()).toContain("No pudimos cargar");
    expect(wrapper.text()).not.toContain("No hay tareas");
    get.mockImplementation(async (url) => ({
      data: url === "/tasks" ? [task] : url === "/plants" ? [plant] : [],
    }));
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Reintentar")!
      .trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Regar");
    expect(wrapper.find("[role=alert]").exists()).toBe(false);
  });
  it("retains live plants, searching and the table view", async () => {
    get.mockImplementation(async (url) => ({
      data: url === "/plants" ? [plant] : [],
    }));
    const wrapper = mount(Plants, {
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("Monstera");
    await wrapper.get('input[aria-label="Buscar plantas"]').setValue("otra");
    expect(wrapper.text()).toContain("No hay coincidencias");
    await wrapper.get("input").setValue("Monstera");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Tabla")!
      .trigger("click");
    expect(wrapper.get("tbody").text()).toContain("Monstera");
  });
  it("does not treat a profile network failure as permission to create a duplicate", async () => {
    get.mockRejectedValue(new Error("offline"));
    const wrapper = mount(Profile);
    await flushPromises();
    expect(wrapper.text()).toContain("No pudimos consultar tu perfil");
    expect(wrapper.find("#createName").exists()).toBe(false);
  });
  it("still supports editing an existing profile", async () => {
    get.mockResolvedValue({ data: profile });
    vi.mocked(http.put).mockResolvedValue({
      data: { ...profile, personName: "Nuevo nombre" },
    });
    const wrapper = mount(Profile);
    await flushPromises();
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Editar"))!
      .trigger("click");
    const textInput = wrapper.find("input[type=text]");
    await textInput.setValue("Nuevo nombre");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Guardar"))!
      .trigger("click");
    await flushPromises();
    expect(http.put).toHaveBeenCalledWith(
      "/profiles/8",
      expect.objectContaining({ personName: "Nuevo nombre" }),
    );
    expect(wrapper.text()).toContain("Perfil actualizado correctamente");
  });
  it("keeps available dashboard data and labels failed metrics", async () => {
    get.mockImplementation(async (url) => {
      if (url === "/plants") return { data: [plant] };
      throw new Error("offline");
    });
    const wrapper = mount(Dashboard, {
      global: { stubs: { RouterLink: true } },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("No se pudo consultar:");
    expect(wrapper.text()).toContain("No disponible");
    expect(wrapper.text()).not.toContain("Métricas de Tareas");
  });
  it("uses only scoped reads for an ordinary user", async () => {
    useAuthenticationStore().userRole = "user";
    get.mockImplementation(async (url) => ({
      data:
        url === "/profiles/by-user-id"
          ? profile
          : url === "/plants/by-profile/8"
            ? [plant]
            : [task],
    }));
    const result = await loadPersonalTasks();
    expect(result.tasks).toEqual([task]);
    expect(get.mock.calls.map((call) => call[0])).toEqual([
      "/profiles/by-user-id",
      "/plants/by-profile/8",
      "/tasks",
    ]);
    expect(get).toHaveBeenLastCalledWith("/tasks", { params: { plantId: 5 } });
    expect(get).toHaveBeenCalledWith("/profiles/by-user-id", {
      params: { userId: 2 },
    });
  });
  it("recognizes the backend missing-profile response without hiding network errors", async () => {
    const missing = new AxiosError("Not found");
    missing.response = { status: 404 } as typeof missing.response;
    get.mockRejectedValueOnce(missing);
    await expect(new ProfileApiService().getByUserId(2)).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
    get.mockRejectedValueOnce(new Error("offline"));
    await expect(
      new ProfileApiService().getByUserId(2),
    ).rejects.not.toBeInstanceOf(ProfileNotFoundError);
  });
  it("maps the documented empty plant collection to an empty view, but preserves server failures", async () => {
    get.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(PlantService.getAll()).resolves.toEqual([]);
    get.mockRejectedValueOnce({ response: { status: 500 } });
    await expect(PlantService.getAll()).rejects.toEqual({
      response: { status: 500 },
    });
  });
  it("rejects another owners data and never falls back to a profile directory", async () => {
    useAuthenticationStore().userRole = "user";
    get.mockResolvedValueOnce({ data: { ...profile, userId: 99 } });
    await expect(new ProfileApiService().getByUserId(2)).rejects.toThrow(
      "Unexpected profile owner",
    );
    expect(get).toHaveBeenCalledTimes(1);
    get.mockRejectedValueOnce(new Error("endpoint unavailable"));
    await expect(
      new ProfileApiService().getByUserId(2),
    ).rejects.not.toBeInstanceOf(ProfileNotFoundError);
    expect(get).not.toHaveBeenCalledWith("/profiles");
  });
  it("preserves existing task mutation endpoints", async () => {
    const service = new TaskApiService();
    vi.mocked(http.patch).mockResolvedValue({ data: task });
    vi.mocked(http.delete).mockResolvedValue({});
    await service.complete(6, { notes: "Hecho" });
    await service.delete(6);
    expect(http.patch).toHaveBeenCalledWith("/tasks/6/complete", {
      notes: "Hecho",
    });
    expect(http.delete).toHaveBeenCalledWith("/tasks/6");
  });
  it("preserves existing plant mutation endpoints", async () => {
    vi.mocked(http.put).mockResolvedValue({ data: plant });
    vi.mocked(http.delete).mockResolvedValue({});
    await PlantService.update(5, {
      name: "Monstera",
      species: "Monstera deliciosa",
    });
    await PlantService.delete(5);
    expect(http.put).toHaveBeenCalledWith("/plants/5", {
      name: "Monstera",
      species: "Monstera deliciosa",
    });
    expect(http.delete).toHaveBeenCalledWith("/plants/5");
  });
});
