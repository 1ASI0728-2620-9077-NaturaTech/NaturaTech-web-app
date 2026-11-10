/**
 * Sign up response model.
 * @summary
 * This interface defines the shape of a sign-up response from the API.
 */
export interface SignUpResponse {
  id: number;
  email: string;
  roles: string[];
}
