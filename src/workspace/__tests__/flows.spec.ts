import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import HealthPage from "../pages/health.page.vue";
import AssistantPage from "../pages/assistant.page.vue";
import RewardsPage from "../pages/rewards.page.vue";
import { IMAGE_MAX_BYTES, validateImage } from "../model";

const globalOptions = {
  stubs: { RouterLink: { template: "<a><slot /></a>" } },
  mocks: { $route: { name: "health" } },
};
beforeEach(() => {
  setActivePinia(createPinia());
  vi.restoreAllMocks();
});
enableAutoUnmount(afterEach);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Local image selection", () => {
  it("rejects unsupported, empty and oversized files", () => {
    expect(validateImage({ type: "image/svg+xml", size: 12 })).toBeTruthy();
    expect(validateImage({ type: "image/png", size: 0 })).toBeTruthy();
    expect(
      validateImage({ type: "image/jpeg", size: IMAGE_MAX_BYTES + 1 }),
    ).toBeTruthy();
    expect(
      validateImage({ type: "image/webp", size: IMAGE_MAX_BYTES }),
    ).toBeNull();
  });
  it("uses a local preview, labels the result as illustrative and revokes the URL", async () => {
    const create = vi.fn(() => "blob:local-fixture");
    const revoke = vi.fn();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = create;
        static revokeObjectURL = revoke;
      },
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const wrapper = mount(HealthPage, {
      props: { demo: true },
      global: globalOptions,
    });
    const input = wrapper.get("input[type=file]");
    Object.defineProperty(input.element, "files", {
      value: [new File(["image"], "leaf.png", { type: "image/png" })],
    });
    await input.trigger("change");
    expect(wrapper.get("img").attributes("src")).toBe("blob:local-fixture");
    await wrapper.get("img").trigger("load");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Ver resultado"))!
      .trigger("click");
    expect(wrapper.text()).toContain("No analiza tu foto");
    expect(fetchSpy).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(revoke).toHaveBeenCalledWith("blob:local-fixture");
  });
  it("does not permit photo selection in the unconnected real route", () => {
    const wrapper = mount(HealthPage, { global: globalOptions });
    expect(
      wrapper.get("input[type=file]").attributes("disabled"),
    ).toBeDefined();
    expect(wrapper.text()).toContain("estará disponible próximamente");
  });
});

describe("Action review", () => {
  it("requires explicit confirmation and never invokes a live API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const wrapper = mount(AssistantPage, {
      props: { demo: true },
      global: globalOptions,
    });
    await wrapper.get("input").setValue("Mi Monstera necesita luz");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.text()).not.toContain("Simulación completada");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Confirmar simulación")!
      .trigger("click");
    expect(wrapper.text()).toContain("No se envió ningún comando");
    expect(
      wrapper
        .findAll("button")
        .some((button) => button.text() === "Confirmar simulación"),
    ).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("allows cancellation and does not turn generic advice into an action", async () => {
    const wrapper = mount(AssistantPage, {
      props: { demo: true },
      global: globalOptions,
    });
    await wrapper.get("input").setValue("Mi Monstera necesita luz");
    await wrapper.get("form").trigger("submit");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Cancelar")!
      .trigger("click");
    expect(wrapper.text()).toContain("Acción cancelada");
    await wrapper.get("input").setValue("Apaga la luz");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.findAll(".action-proposal")).toHaveLength(1);
  });
  it("renders hostile input as text and leaves real mode disabled", async () => {
    const wrapper = mount(AssistantPage, {
      props: { demo: true },
      global: globalOptions,
    });
    await wrapper.get("input").setValue("<img src=x onerror=alert(1)>");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.find(".conversation img").exists()).toBe(false);
    wrapper.unmount();
    const real = mount(AssistantPage, { global: globalOptions });
    expect(real.get("input").attributes("disabled")).toBeDefined();
  });
});

describe("Reward walkthrough", () => {
  it("requires simulated wallet connection, awards only once and never requests a wallet", async () => {
    const request = vi.fn();
    vi.stubGlobal("ethereum", { request });
    const wrapper = mount(RewardsPage, {
      props: { demo: true },
      global: globalOptions,
    });
    const claim = () =>
      wrapper
        .findAll("button")
        .find((button) => /medalla/i.test(button.text()))!;
    expect(claim().attributes("disabled")).toBeDefined();
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Simular conexión"))!
      .trigger("click");
    await claim().trigger("click");
    expect(wrapper.text()).toContain("1 medalla de ejemplo");
    expect(claim().attributes("disabled")).toBeDefined();
    expect(request).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("keeps real rewards unavailable even after using the demo store", async () => {
    const demo = mount(RewardsPage, {
      props: { demo: true },
      global: globalOptions,
    });
    await demo
      .findAll("button")
      .find((button) => button.text().includes("Simular conexión"))!
      .trigger("click");
    demo.unmount();
    const real = mount(RewardsPage, { global: globalOptions });
    expect(
      real
        .findAll("button")
        .every((button) => button.attributes("disabled") !== undefined),
    ).toBe(true);
    expect(real.text()).not.toContain("Billetera de demostración");
  });
});
