import { config } from '../config';
import { MetaApiError } from './errors';
import { logger } from './logger';
import type { MetaTokenResponse, MetaError } from '../types/meta.types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export async function refreshLongLivedToken(currentToken: string): Promise<MetaTokenResponse> {
  const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', config.meta.appId);
  url.searchParams.set('client_secret', config.meta.appSecret);
  url.searchParams.set('fb_exchange_token', currentToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    const errorData = data as MetaError;
    logger.error({ errorData }, 'Failed to refresh Meta token');
    throw new MetaApiError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.type,
      errorData.error.error_subcode,
    );
  }

  return data as MetaTokenResponse;
}

export async function debugToken(
  token: string,
): Promise<{ is_valid: boolean; expires_at: number; scopes: string[] }> {
  const url = new URL(`${GRAPH_API_BASE}/debug_token`);
  url.searchParams.set('input_token', token);
  url.searchParams.set('access_token', `${config.meta.appId}|${config.meta.appSecret}`);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    const errorData = data as MetaError;
    logger.error({ errorData }, 'Failed to debug Meta token');
    throw new MetaApiError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.type,
      errorData.error.error_subcode,
    );
  }

  const debugData = (data as { data: { is_valid: boolean; expires_at: number; scopes: string[] } }).data;
  return debugData;
}
