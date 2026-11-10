/**
 * Represents a single field-level validation error returned by the API.
 */
export interface ApiValidationError {
  field: string;
  message: string;
}

/**
 * Represents a standardized API error response body.
 * Used by the response interceptor to parse 400-level errors.
 */
export interface ApiErrorResponse {
  message: string;
  errors?: ApiValidationError[];
}
