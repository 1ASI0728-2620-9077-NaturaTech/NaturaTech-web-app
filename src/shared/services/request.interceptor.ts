import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

/**
 * Request interceptor that attaches the Bearer token from localStorage
 * to every outgoing request's Authorization header.
 */
export const requestInterceptor = (
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig => {
  const token = localStorage.getItem("token");
  if (
    token &&
    !config.headers.Authorization &&
    !config.url?.startsWith("/authentication/")
  ) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

/**
 * Registers the request interceptor on the provided Axios instance.
 */
export function registerRequestInterceptor(http: AxiosInstance): void {
  http.interceptors.request.use(requestInterceptor);
}
