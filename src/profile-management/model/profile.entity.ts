/**
 * Profile entity model — matches the real backend response.
 */
export interface Profile {
  id: number;
  personName: string;
  profilePictureBase64?: string | null;
  subscriptionPlan: 'BASIC' | 'PRO';
  userId: number;
}

/**
 * Update profile request model.
 */
export interface UpdateProfileRequest {
  personName?: string;
  subscriptionPlan?: 'BASIC' | 'PRO';
  profilePictureBase64?: string | null;
}
