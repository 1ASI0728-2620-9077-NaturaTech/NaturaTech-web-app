/**
 * Sign in response model.
 * @summary
 * This interface defines the shape of a sign-in response from the API.
 */
export interface SignInResponse {
  id: number;
  email: string;
  token: string;
  roles?: string[];
}
