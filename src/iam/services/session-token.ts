/** Expiry is only a UX hint. Token signature and authorization are server responsibilities. */
export function isTokenExpired(token: string, now = Date.now()): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const data: unknown = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (typeof data !== "object" || data === null || !("exp" in data))
      return false;
    return typeof data.exp === "number" && data.exp * 1000 <= now;
  } catch {
    return false;
  }
}
