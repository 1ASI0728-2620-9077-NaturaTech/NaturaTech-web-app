/**
 * Plant entity and request interfaces for the Plant Management module.
 */

/**
 * Represents a plant entity as returned by the API.
 */
export interface Plant {
  id: number;
  profileId: number;
  name: string;
  species: string;
  description?: string;
  acquisitionDate?: string;
  humidity?: string;
  nextWateringDate?: string;
  imageUrl?: string;
  notificationsEnabled?: boolean;
  temperatureThresholdMin?: number;
  temperatureThresholdMax?: number;
  lightThresholdMin?: number;
  humidityThresholdMin?: number;
  humidityThresholdMax?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Request payload for creating a new plant.
 */
export interface CreatePlantRequest {
  name: string;
  species: string;
  description?: string;
  acquisitionDate: string;
  humidity: 'BAJA' | 'MEDIA' | 'ALTA';
  nextWateringDate?: string;
  imageUrl?: string;
  notificationsEnabled: boolean;
  profileId: number;
}

/**
 * Request payload for updating an existing plant.
 */
export interface UpdatePlantRequest {
  name: string;       // 1-100 characters
  species: string;    // 1-100 characters
  imageUrl?: string;
}
