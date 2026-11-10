/**
 * Sign up request model.
 * @summary
 * This interface defines the shape of a sign-up request payload.
 */
export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  subscriptionPlan: 'BASIC' | 'PRO';
}
