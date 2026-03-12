import { logger } from './logger';

/**
 * Safely parses a mediaUrls value into a string array.
 * Handles:
 * - Already-array input (post-JSONB migration: Prisma returns native arrays)
 * - JSON string input (pre-migration: stored as TEXT)
 * - Invalid/corrupt data (returns [] with warning log)
 * - null/undefined (returns [])
 */
export function safeParseMediaUrls(raw: unknown): string[] {
  if (raw == null) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw as string[];
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as string[];
      }
      logger.warn({ raw }, 'mediaUrls parsed but is not an array');
      return [];
    } catch {
      logger.warn({ raw }, 'Failed to parse mediaUrls JSON');
      return [];
    }
  }

  logger.warn({ raw, type: typeof raw }, 'Unexpected mediaUrls type');
  return [];
}
