import http from '@/shared/services/http-common';
import type { GlobalTelemetry, DeviceStatus } from '../model/analytics.entity';

/**
 * Service for fetching analytics data from the backend API.
 */
export class AnalyticsApiService {
  private readonly basePath = '/analytics';

  /**
   * Fetches global telemetry summary including aggregate stats and time-series data points.
   */
  getGlobalTelemetry(): Promise<GlobalTelemetry> {
    return http.get(`${this.basePath}/global-telemetry`).then(r => r.data);
  }

  /**
   * Fetches the overall device status metrics.
   */
  getDeviceStatus(): Promise<DeviceStatus> {
    return http.get(`${this.basePath}/device-status`).then(r => r.data);
  }
}

/**
 * Convenience function that fetches both telemetry and device status in parallel.
 * Returns a tuple of [GlobalTelemetry, DeviceStatus].
 */
export function fetchAllAnalytics(): Promise<[GlobalTelemetry, DeviceStatus]> {
  const service = new AnalyticsApiService();
  return Promise.all([service.getGlobalTelemetry(), service.getDeviceStatus()]);
}
