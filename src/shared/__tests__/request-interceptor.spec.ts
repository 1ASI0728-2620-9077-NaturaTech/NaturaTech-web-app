import { describe, it, expect, beforeEach } from "vitest";
import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { requestInterceptor } from "../services/request.interceptor";

function createMockConfig(): InternalAxiosRequestConfig {
  return {
    headers: new AxiosHeaders(),
  } as InternalAxiosRequestConfig;
}

describe("Request Interceptor", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should attach Authorization header when token exists in localStorage", () => {
    localStorage.setItem("token", "my-test-token");
    const config = createMockConfig();

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBe("Bearer my-test-token");
  });

  it("should not attach Authorization header when no token in localStorage", () => {
    const config = createMockConfig();

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it("should not attach Authorization header when token is null", () => {
    // localStorage.getItem returns null for missing keys
    const config = createMockConfig();

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it("should return the config object", () => {
    const config = createMockConfig();

    const result = requestInterceptor(config);

    expect(result).toBe(config);
  });
  it("preserves the candidate token while verifying a new login", () => {
    localStorage.setItem("token", "old-session");
    const config = createMockConfig();
    config.headers.Authorization = "Bearer candidate";
    expect(requestInterceptor(config).headers.Authorization).toBe(
      "Bearer candidate",
    );
  });
  it("does not attach a stale session to authentication calls", () => {
    localStorage.setItem("token", "old-session");
    const config = createMockConfig();
    config.url = "/authentication/sign-in";
    expect(requestInterceptor(config).headers.Authorization).toBeUndefined();
  });
});
