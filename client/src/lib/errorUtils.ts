import type { AxiosError } from 'axios';

/**
 * Extracts a human-readable error message from an unknown caught value.
 *
 * Resolution order:
 * 1. Axios response body: `error.response.data.error.message`
 * 2. Generic error message: `error.message`
 * 3. The provided `fallback` string (defaults to 'An unexpected error occurred')
 */
export function extractErrorMessage(
  err: unknown,
  fallback = 'An unexpected error occurred',
): string {
  if (err && typeof err === 'object') {
    // Axios error — check the API response body first
    const axiosErr = err as AxiosError<{ error?: { message?: string }; message?: string }>;
    if (axiosErr.response?.data) {
      const msg = axiosErr.response.data.error?.message;
      if (msg) return msg;
    }
    // Plain Error or any object with a message property
    const errWithMsg = err as { message?: unknown };
    if (typeof errWithMsg.message === 'string' && errWithMsg.message) {
      return errWithMsg.message;
    }
  }
  return fallback;
}
