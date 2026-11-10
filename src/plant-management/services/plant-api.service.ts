import { collection } from "@/shared/services/collection";
import http from "@/shared/services/http-common";
import type {
  Plant,
  CreatePlantRequest,
  UpdatePlantRequest,
} from "../model/plant.entity";

/**
 * Service class for Plant Management API operations.
 * Provides static methods for CRUD operations on plant entities.
 */
export class PlantService {
  private static readonly basePath = "/plants";

  /**
   * Fetches all plants for the authenticated user.
   * @returns A promise resolving to an array of Plant entities.
   */
  static getAll(): Promise<Plant[]> {
    return http
      .get(this.basePath)
      .then((response) => {
        // API may return a single object or an array
        const data = response.data;
        return collection<Plant>(data);
      })
      .catch((e) => {
        if (e?.response?.status === 404) return [];
        throw e;
      });
  }

  /**
   * Fetches all plants associated with a given profile.
   * @param profileId - The ID of the profile to fetch plants for.
   * @returns A promise resolving to an array of Plant entities.
   */
  static getByProfile(profileId: number): Promise<Plant[]> {
    return http
      .get(`${this.basePath}/by-profile/${profileId}`)
      .then((response) => {
        const data = response.data;
        return collection<Plant>(data);
      })
      .catch((e) => {
        if (e?.response?.status === 404) return [];
        throw e;
      });
  }

  /**
   * Fetches a single plant by its ID.
   * @param plantId - The ID of the plant to fetch.
   * @returns A promise resolving to a Plant entity.
   */
  static getById(plantId: number): Promise<Plant> {
    return http
      .get(`${this.basePath}/${plantId}`)
      .then((response) => response.data);
  }

  /**
   * Creates a new plant.
   * @param request - The plant creation request payload.
   * @returns A promise resolving to the created Plant entity.
   */
  static create(request: CreatePlantRequest): Promise<Plant> {
    return http.post(this.basePath, request).then((response) => response.data);
  }

  /**
   * Updates an existing plant.
   * @param plantId - The ID of the plant to update.
   * @param request - The plant update request payload.
   * @returns A promise resolving to the updated Plant entity.
   */
  static update(plantId: number, request: UpdatePlantRequest): Promise<Plant> {
    return http
      .put(`${this.basePath}/${plantId}`, request)
      .then((response) => response.data);
  }

  /**
   * Deletes a plant by its ID.
   * @param plantId - The ID of the plant to delete.
   * @returns A promise resolving when the plant is deleted.
   */
  static delete(plantId: number): Promise<void> {
    return http.delete(`${this.basePath}/${plantId}`).then(() => undefined);
  }
}
