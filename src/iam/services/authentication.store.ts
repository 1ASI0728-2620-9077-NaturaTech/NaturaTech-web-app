import { defineStore } from "pinia";
import { ref } from "vue";
import type { SignInResponse } from "@/iam/model/sign-in.response";
import { AuthenticationApiService } from "./authentication-api.service";
import { isTokenExpired } from "./session-token";

const TOKEN_KEY = "token";

/**
 * Authentication store (Pinia setup store).
 *
 * Manages authentication state: signedIn flag, userId, email, and userRole.
 * Persists the JWT token to localStorage and provides signIn/signOut actions.
 */
export const useAuthenticationStore = defineStore("authentication", () => {
  // --- State ---
  const signedIn = ref<boolean>(false);
  const userId = ref<number | null>(null);
  const email = ref<string>("");
  const userRole = ref<"user" | "admin" | "">("");
  const profileId = ref<number | null>(null);
  let verifiedToken: string | null = null;
  let verifiedAt = 0;
  let verification: Promise<boolean> | null = null;

  // --- Initialization ---
  // If a token already exists in localStorage, mark the user as signed in
  // and restore userId/email from stored values.
  const existingToken = localStorage.getItem(TOKEN_KEY);
  if (existingToken) {
    signedIn.value = true;
    const storedUserId = localStorage.getItem("userId");
    const storedEmail = localStorage.getItem("userEmail");
    const storedProfileId = localStorage.getItem("profileId");
    if (storedUserId) userId.value = Number(storedUserId);
    if (storedEmail) email.value = storedEmail;
    if (storedProfileId) profileId.value = Number(storedProfileId);
  }

  // --- Actions ---

  /**
   * Processes a successful sign-in response.
   * Persists the token to localStorage and updates store state.
   */
  function signIn(
    response: SignInResponse,
    role: "admin" | "user" | "" = "",
  ): void {
    if (
      !Number.isSafeInteger(response.id) ||
      response.id <= 0 ||
      !response.token?.trim() ||
      !response.email
    ) {
      throw new Error("Invalid sign-in response");
    }
    clearSession();
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem("userId", String(response.id));
    localStorage.setItem("userEmail", response.email);
    signedIn.value = true;
    userId.value = response.id;
    email.value = response.email;
    userRole.value = role;
    verifiedToken = role ? response.token : null;
    verifiedAt = role ? Date.now() : 0;
  }

  /** Cached only in memory: a reload always verifies the role with the server. */
  async function validateSession(): Promise<boolean> {
    const token = localStorage.getItem(TOKEN_KEY);
    if (
      !token ||
      isTokenExpired(token) ||
      !userId.value ||
      userId.value <= 0 ||
      !Number.isSafeInteger(userId.value)
    ) {
      clearSession();
      return false;
    }
    if (verifiedToken === token && Date.now() - verifiedAt < 60_000)
      return true;
    if (verification) return verification;
    verification = (async () => {
      try {
        const roles = await new AuthenticationApiService().getRoles(
          userId.value!,
          token,
        );
        if (localStorage.getItem(TOKEN_KEY) !== token) return false;
        const role = roles.includes("ROLE_ADMIN")
          ? "admin"
          : roles.includes("ROLE_USER")
            ? "user"
            : "";
        if (!role) {
          clearSession();
          return false;
        }
        verifiedToken = token;
        verifiedAt = Date.now();
        userRole.value = role;
        signedIn.value = true;
        return true;
      } catch {
        if (localStorage.getItem(TOKEN_KEY) === token) clearSession();
        return false;
      } finally {
        verification = null;
      }
    })();
    return verification;
  }

  /**
   * Signs the user out.
   * Removes the token from localStorage, resets all state to defaults,
   * and navigates to the sign-in page.
   */
  function clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("profileId");
    localStorage.removeItem("userRole");
    verifiedToken = null;
    verifiedAt = 0;
    signedIn.value = false;
    userId.value = null;
    email.value = "";
    userRole.value = "";
    profileId.value = null;
  }

  function signOut(): void {
    clearSession();
    window.location.href = "/sign-in";
  }

  return {
    signedIn,
    userId,
    email,
    userRole,
    profileId,
    signIn,
    signOut,
    clearSession,
    validateSession,
  };
});
