export interface IoTNode {
  id: number;
  nodeCode: string;
  status: string;
  plantId: number;
  profileId: number;
  createdAt: string;
}

export interface SensorReading {
  id: number;
  nodeId: number;
  lightPercent: number;
  gasPercent: number;
  airTemperature: number;
  humidityPercent: number;
  timestamp: string;
}

export interface CreateNodeRequest {
  nodeCode: string;
  plantId: number;
  profileId: number;
}

export interface CreateReadingRequest {
  nodeId: number;
  lightPercent: number;  // 0-100
  gasPercent: number;    // 0-100
  airTemperature: number; // -40 to 80
  humidityPercent: number; // 0-100
}

export interface ActuatorState {
  buzzerMode: string;
  servoMode: string;
  ledMode: string;
}

export interface CreateActuatorCommand {
  nodeCode: string;
  actuatorType: 'UV_LIGHT' | 'WATER_SPRAYER' | 'BUZZER' | 'SERVO' | 'LED';
  action: 'ACTIVATE' | 'DEACTIVATE';
}

export interface ActuatorCommand {
  id: number;
  nodeId: number;
  actuatorType: string;
  action: string;
  status: string;
  issuedAt: string;
}
