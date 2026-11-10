import { collection } from "@/shared/services/collection";
import http from "@/shared/services/http-common";
import type {
  Task,
  CreateTaskRequest,
  CompleteTaskRequest,
} from "../model/task.entity";

/**
 * Service class for task management API operations.
 */
export class TaskApiService {
  private readonly basePath = "/tasks";

  /**
   * Gets all tasks (optionally filtered by plantId).
   */
  getAll(plantId?: number): Promise<Task[]> {
    const params = plantId ? { plantId } : {};
    return http
      .get(this.basePath, { params })
      .then((r) => {
        const data = r.data;
        return collection<Task>(data);
      })
      .catch((e) => {
        if (e?.response?.status === 404) return [];
        throw e;
      });
  }

  /**
   * Creates a new task.
   */
  create(request: CreateTaskRequest): Promise<Task> {
    return http.post(this.basePath, request).then((r) => r.data);
  }

  /**
   * Creates a completed task (direct history log).
   */
  createCompleted(request: CreateTaskRequest): Promise<Task> {
    return http.post(`${this.basePath}/completed`, request).then((r) => r.data);
  }

  /**
   * Gets pending tasks for a specific plant.
   */
  getPending(plantId: number): Promise<Task[]> {
    return http
      .get(`${this.basePath}/pending`, { params: { plantId } })
      .then((r) => {
        const data = r.data;
        return collection<Task>(data);
      })
      .catch((e) => {
        if (e?.response?.status === 404) return [];
        throw e;
      });
  }

  /**
   * Gets completed task history for a specific plant.
   */
  getHistory(plantId: number): Promise<Task[]> {
    return http
      .get(`${this.basePath}/history`, { params: { plantId } })
      .then((r) => {
        const data = r.data;
        return collection<Task>(data);
      })
      .catch((e) => {
        if (e?.response?.status === 404) return [];
        throw e;
      });
  }

  /**
   * Gets all pending tasks across all plants (global timeline).
   */
  getAllPending(): Promise<Task[]> {
    return this.getAll();
  }

  /**
   * Marks a task as completed.
   */
  complete(taskId: number, request?: CompleteTaskRequest): Promise<Task> {
    return http
      .patch(`${this.basePath}/${taskId}/complete`, request || {})
      .then((r) => r.data);
  }

  /**
   * Deletes a task by its ID.
   */
  delete(taskId: number): Promise<void> {
    return http.delete(`${this.basePath}/${taskId}`).then(() => undefined);
  }
}
