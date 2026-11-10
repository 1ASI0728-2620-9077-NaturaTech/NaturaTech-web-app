import http from "@/shared/services/http-common";
import type {
  IoTNode,
  CreateNodeRequest,
  CreateReadingRequest,
  SensorReading,
  ActuatorState,
  CreateActuatorCommand,
  ActuatorCommand,
} from "../model/iot-node.entity";

export class IoTApiService {
  createNode(request: CreateNodeRequest): Promise<IoTNode> {
    return http.post("/iot/nodes", request).then((r) => r.data);
  }

  getNodesByProfile(profileId: number): Promise<IoTNode[]> {
    return http
      .get(`/iot/nodes/by-profile/${profileId}`)
      .then((r) => r.data)
      .catch((e) => {
        if (e?.response?.status === 404) return [];
        throw e;
      });
  }

  createReading(request: CreateReadingRequest): Promise<SensorReading> {
    return http.post("/iot/readings", request).then((r) => r.data);
  }

  getLatestReading(plantId: number): Promise<SensorReading | null> {
    return http
      .get(`/iot/plants/${plantId}/readings/latest`)
      .then((r) => r.data)
      .catch((error) => {
        if (error?.response?.status === 404) return null;
        throw error;
      });
  }

  linkPlant(nodeCode: string, plantId: number): Promise<IoTNode> {
    return http
      .patch(`/iot/nodes/${nodeCode}/link-plant`, { plantId })
      .then((r) => r.data);
  }

  unlinkPlant(nodeCode: string): Promise<IoTNode> {
    return http.post(`/iot/nodes/${nodeCode}/unlink`).then((r) => r.data);
  }

  updateDesiredState(
    nodeCode: string,
    state: ActuatorState,
  ): Promise<ActuatorState> {
    return http
      .put(`/iot/nodes/${nodeCode}/actuators/desired`, state)
      .then((r) => r.data);
  }

  getSyncStatus(nodeCode: string): Promise<any> {
    return http.get(`/iot/nodes/${nodeCode}/sync/status`).then((r) => r.data);
  }

  createActuatorCommand(
    command: CreateActuatorCommand,
  ): Promise<ActuatorCommand> {
    return http.post("/iot/actuator-commands", command).then((r) => r.data);
  }
}
