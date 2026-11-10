export interface GlobalTelemetry {
  averageLightPercent: number;
  averageAirTemperature: number;
  averageGasPercent: number;
  averageHumidityPercent: number;
}

export interface DeviceStatus {
  onlineCount: number;
  offlineCount: number;
  errorCount: number;
}
