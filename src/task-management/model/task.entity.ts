/**
 * Represents a task associated with a plant.
 */
export interface Task {
  id: number;
  action: string;
  scheduledDate: string;
  completedAt?: string;
  plantId: number;
  profileId: number;
  humidity: number | null;
  notes?: string;
  status: string;
}

/**
 * Request payload for creating a new task.
 */
export interface CreateTaskRequest {
  action: string;
  scheduledDate: string;
  plantId: number;
  profileId: number;
  humidity: number | null;
  notes?: string;
}

/**
 * Request payload for completing a task.
 */
export interface CompleteTaskRequest {
  humidity?: number;
  notes?: string;
}
