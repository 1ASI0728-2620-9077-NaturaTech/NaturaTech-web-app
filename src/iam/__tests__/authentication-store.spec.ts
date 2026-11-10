import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthenticationStore } from "@/iam/services/authentication.store.ts";
import type { SignInResponse } from "@/iam/model/sign-in.response";

describe("Authentication Store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("initialization", () => {
    it("should default to signed out state when no token in localStorage", () => {
      const store = useAuthenticationStore();

      expect(store.signedIn).toBe(false);
      expect(store.userId).toBeNull();
      expect(store.email).toBe("");
      expect(store.userRole).toBe("");
    });

    it("should set signedIn to true when token exists in localStorage", () => {
      localStorage.setItem("token", "existing-jwt-token");

      const store = useAuthenticationStore();

      expect(store.signedIn).toBe(true);
    });

    it("should not set userId or email on init even with token present", () => {
      localStorage.setItem("token", "existing-jwt-token");

      const store = useAuthenticationStore();

      expect(store.userId).toBeNull();
      expect(store.email).toBe("");
      expect(store.userRole).toBe("");
    });
  });

  describe("signIn", () => {
    it("should persist token to localStorage and update state", () => {
      const store = useAuthenticationStore();
      const response: SignInResponse = {
        id: 42,
        email: "user@example.com",
        token: "jwt-token-abc123",
      };

      store.signIn(response);

      expect(localStorage.getItem("token")).toBe("jwt-token-abc123");
      expect(store.signedIn).toBe(true);
      expect(store.userId).toBe(42);
      expect(store.email).toBe("user@example.com");
    });

    it("should overwrite previous state on subsequent sign-in", () => {
      const store = useAuthenticationStore();

      store.signIn({ id: 1, email: "first@test.com", token: "token-1" });
      store.signIn({ id: 2, email: "second@test.com", token: "token-2" });

      expect(localStorage.getItem("token")).toBe("token-2");
      expect(store.userId).toBe(2);
      expect(store.email).toBe("second@test.com");
    });
  });

  describe("signOut", () => {
    it("should remove token from localStorage and reset state to defaults", () => {
      const store = useAuthenticationStore();

      // First sign in
      store.signIn({ id: 10, email: "test@mail.com", token: "my-token" });
      store.userRole = "admin";

      // Mock window.location.href assignment
      const locationMock = { href: "" };
      vi.stubGlobal("location", locationMock);

      store.signOut();

      expect(localStorage.getItem("token")).toBeNull();
      expect(store.signedIn).toBe(false);
      expect(store.userId).toBeNull();
      expect(store.email).toBe("");
      expect(store.userRole).toBe("");
    });

    it("should navigate to /sign-in via window.location.href", () => {
      const store = useAuthenticationStore();
      store.signIn({ id: 5, email: "nav@test.com", token: "nav-token" });

      const locationMock = { href: "" };
      vi.stubGlobal("location", locationMock);

      store.signOut();

      expect(locationMock.href).toBe("/sign-in");
    });
  });
  it("clears old profile and role values when switching accounts", () => {
    const store = useAuthenticationStore();
    store.signIn({ id: 1, email: "first@test.com", token: "one" }, "admin");
    localStorage.setItem("profileId", "10");
    localStorage.setItem("userRole", "admin");
    store.profileId = 10;
    store.signIn({ id: 2, email: "second@test.com", token: "two" }, "user");
    expect(store.profileId).toBeNull();
    expect(localStorage.getItem("profileId")).toBeNull();
    expect(localStorage.getItem("userRole")).toBeNull();
    expect(store.userRole).toBe("user");
  });
  it("rejects an expired token even if it was verified earlier", async () => {
    const store = useAuthenticationStore();
    const token = `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`;
    store.signIn({ id: 1, email: "first@test.com", token }, "admin");
    expect(await store.validateSession()).toBe(false);
    expect(store.signedIn).toBe(false);
  });
});
