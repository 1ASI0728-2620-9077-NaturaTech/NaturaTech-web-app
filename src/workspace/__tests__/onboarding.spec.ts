import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises, enableAutoUnmount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import CreateDialog from "../components/create-resource-dialog.vue";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  plant: vi.fn(),
  task: vi.fn(),
  device: vi.fn(),
  link: vi.fn(),
}));
vi.mock("@/shared/services/personal-workspace.service", () => ({
  loadPersonalPlants: mocks.context,
}));
vi.mock("@/plant-management/services/plant-api.service", () => ({
  PlantService: { create: mocks.plant },
}));
vi.mock("@/task-management/services/task-api.service", () => ({
  TaskApiService: class {
    create = mocks.task;
  },
}));
vi.mock("@/iot-management/services/iot-api.service", () => ({
  IoTApiService: class {
    createNode = mocks.device;
    linkPlant = mocks.link;
  },
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.context.mockResolvedValue({
    profile: { id: 42 },
    plants: [{ id: 7, name: "Pothos", profileId: 42 }],
  });
});
function render(kind: "plant" | "task" | "device", existingNodeCode?: string) {
  return mount(CreateDialog, {
    props: { visible: true, kind, existingNodeCode },
    attachTo: document.body,
    global: {
      plugins: [PrimeVue],
      stubs: { teleport: true, "router-link": { template: "<a><slot /></a>" } },
    },
  });
}
describe("New account creation dialogs", () => {
  it("renders the real modal and sends a plant with the session profile", async () => {
    const w = render("plant");
    await flushPromises();
    expect(w.find('[role="dialog"]').exists()).toBe(true);
    const inputs = w.findAll("input");
    await inputs[0].setValue(" Mi planta ");
    await inputs[1].setValue(" Pothos ");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(mocks.plant).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Mi planta",
        species: "Pothos",
        profileId: 42,
      }),
    );
    expect(w.emitted("created")).toHaveLength(1);
    expect(w.emitted("update:visible")?.[0]).toEqual([false]);
  });
  it("creates a scheduled care without inventing a humidity measurement", async () => {
    const w = render("task");
    await flushPromises();
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(mocks.task).toHaveBeenCalledWith(
      expect.objectContaining({
        plantId: 7,
        profileId: 42,
        humidity: null,
        action: "Regar",
      }),
    );
  });
  it("links a new SIM node to the selected own plant", async () => {
    const w = render("device");
    await flushPromises();
    await w.get("input").setValue("SIM-001");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(mocks.device).toHaveBeenCalledWith({
      nodeCode: "SIM-001",
      plantId: 7,
      profileId: 42,
    });
  });
  it("reuses an existing unlinked node instead of registering a duplicate", async () => {
    const w = render("device", "SIM-001");
    await flushPromises();
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(mocks.link).toHaveBeenCalledWith("SIM-001", 7);
    expect(mocks.device).not.toHaveBeenCalled();
  });
  it("keeps entered values and the modal open on API rejection", async () => {
    mocks.device.mockRejectedValue({ response: { status: 409 } });
    const w = render("device");
    await flushPromises();
    await w.get("input").setValue("SIM-001");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.get('[role="alert"]').text()).toContain("ya existe");
    expect((w.get("input").element as HTMLInputElement).value).toBe("SIM-001");
    expect(w.emitted("created")).toBeUndefined();
    expect(w.emitted("update:visible")).toBeUndefined();
  });
  it("offers the plant creation route instead of an unusable task form", async () => {
    mocks.context.mockResolvedValue({ profile: { id: 42 }, plants: [] });
    const w = render("task");
    await flushPromises();
    expect(w.text()).toContain("Agregar mi primera planta");
    expect(w.find("form").exists()).toBe(false);
    expect(mocks.task).not.toHaveBeenCalled();
  });
  it("does not send a duplicate while a request is pending", async () => {
    let finish!: () => void;
    mocks.device.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const w = render("device");
    await flushPromises();
    await w.get("input").setValue("SIM-001");
    await w.get("form").trigger("submit");
    await w.get("form").trigger("submit");
    expect(mocks.device).toHaveBeenCalledTimes(1);
    expect(w.get("fieldset").attributes("disabled")).toBeDefined();
    finish();
    await flushPromises();
  });
});
