import http from "@/shared/services/http-common";
import { isAxiosError } from "axios";
import type { Profile, UpdateProfileRequest } from "../model/profile.entity";

export class ProfileNotFoundError extends Error {
  constructor() {
    super("No profile is associated with this account");
  }
}

/**
 * Profile API Service
 */
export class ProfileApiService {
  private readonly basePath = "/profiles";

  /**
   * Fetch a profile by user ID.
   * Uses the scoped endpoint defined by ProfilesQueryController.
   */
  async getByUserId(userId: number): Promise<Profile> {
    try {
      // No directory fallback. Server must authorize ownership.
      const response = await http.get(`${this.basePath}/by-user-id`, {
        params: { userId },
      });
      const profile: Profile | null = response.data;
      if (!profile) throw new ProfileNotFoundError();
      if (profile.userId !== userId)
        throw new Error("Unexpected profile owner");
      return profile;
    } catch (error) {
      // This controller explicitly returns 404 when the account has no profile.
      if (isAxiosError(error) && error.response?.status === 404)
        throw new ProfileNotFoundError();
      throw error;
    }
  }

  /**
   * Update an existing profile.
   */
  update(profileId: number, request: UpdateProfileRequest): Promise<Profile> {
    return http
      .put(`${this.basePath}/${profileId}`, request)
      .then((r) => r.data);
  }

  /**
   * Create a new profile.
   */
  create(request: any): Promise<Profile> {
    return http.post(this.basePath, request).then((r) => r.data);
  }
}
