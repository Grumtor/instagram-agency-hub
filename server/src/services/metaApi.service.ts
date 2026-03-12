import axios, { AxiosError, AxiosResponse } from 'axios';
import { config } from '../config';
import { MetaApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { MetaError } from '../types/meta.types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

let lastAppUsage: { call_count: number; total_cputime: number; total_time: number } | null = null;

export function getLastAppUsage(): { call_count: number; total_cputime: number; total_time: number } | null {
  return lastAppUsage;
}

const metaClient = axios.create({
  baseURL: GRAPH_API_BASE,
  timeout: 30_000,
});

metaClient.interceptors.response.use(
  (response: AxiosResponse) => {
    checkRateLimitHeaders(response);
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      checkRateLimitHeaders(error.response);
    }
    return Promise.reject(error);
  },
);

function checkRateLimitHeaders(response: AxiosResponse): void {
  const appUsage = response.headers['x-app-usage'];
  const businessUsage = response.headers['x-business-use-case-usage'];

  if (appUsage) {
    try {
      const usage = JSON.parse(appUsage as string);
      const callCount = usage.call_count ?? 0;
      const totalCpuTime = usage.total_cputime ?? 0;
      const totalTime = usage.total_time ?? 0;

      lastAppUsage = { call_count: callCount, total_cputime: totalCpuTime, total_time: totalTime };

      if (callCount > 80 || totalCpuTime > 80 || totalTime > 80) {
        logger.warn({ appUsage: usage }, 'Meta API app usage approaching rate limit');
      }
    } catch {
      // ignore malformed header
    }
  }

  if (businessUsage) {
    try {
      const usage = JSON.parse(businessUsage as string);
      for (const [businessId, limits] of Object.entries(usage)) {
        const entries = limits as Array<{ call_count: number; estimated_time_to_regain_access: number }>;
        for (const entry of entries) {
          if (entry.call_count > 80) {
            logger.warn({ businessId, usage: entry }, 'Meta API business usage approaching rate limit');
          }
        }
      }
    } catch {
      // ignore malformed header
    }
  }
}

function handleMetaError(error: unknown): never {
  if (error instanceof AxiosError && error.response?.data) {
    const metaError = error.response.data as MetaError;
    if (metaError.error) {
      logger.error({ metaError: metaError.error }, 'Meta API error response');
      throw new MetaApiError(
        metaError.error.message,
        metaError.error.code,
        metaError.error.type,
        metaError.error.error_subcode,
      );
    }
  }

  if (error instanceof AxiosError) {
    logger.error({ message: error.message, status: error.response?.status }, 'Meta API request failed');
    throw new MetaApiError(error.message, 0, 'AxiosError');
  }

  throw error;
}

export async function exchangeCodeForToken(
  code: string,
): Promise<{ access_token: string; token_type: string }> {
  logger.debug({ code: code.slice(0, 8) + '...' }, 'Exchanging code for short-lived token');

  try {
    const response = await metaClient.post('/oauth/access_token', null, {
      params: {
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        redirect_uri: config.meta.redirectUri,
        code,
      },
    });

    logger.debug('Successfully exchanged code for short-lived token');
    return response.data;
  } catch (error) {
    handleMetaError(error);
  }
}

export async function getLongLivedToken(
  shortLivedToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  logger.debug('Exchanging short-lived token for long-lived token');

  try {
    const response = await metaClient.get('/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    logger.debug({ expiresIn: response.data.expires_in }, 'Obtained long-lived token');
    return response.data;
  } catch (error) {
    handleMetaError(error);
  }
}

export async function getUserPages(
  accessToken: string,
): Promise<Array<{ id: string; name: string; access_token: string }>> {
  logger.debug('Fetching user Facebook pages');

  try {
    const response = await metaClient.get('/me/accounts', {
      params: { access_token: accessToken },
    });

    const pages = response.data.data ?? [];
    logger.debug({ pageCount: pages.length }, 'Fetched user Facebook pages');
    return pages;
  } catch (error) {
    handleMetaError(error);
  }
}

export async function getInstagramBusinessAccount(
  pageId: string,
  accessToken: string,
): Promise<{ id: string } | null> {
  logger.debug({ pageId }, 'Checking page for linked Instagram business account');

  try {
    const response = await metaClient.get(`/${pageId}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: accessToken,
      },
    });

    const igAccount = response.data.instagram_business_account;
    if (igAccount?.id) {
      logger.debug({ pageId, igAccountId: igAccount.id }, 'Found linked Instagram business account');
      return { id: igAccount.id };
    }

    logger.debug({ pageId }, 'No linked Instagram business account found');
    return null;
  } catch (error) {
    handleMetaError(error);
  }
}

export async function getInstagramProfile(
  igUserId: string,
  accessToken: string,
): Promise<{
  id: string;
  username: string;
  profile_picture_url: string;
  account_type: string;
  media_count?: number;
  followers_count?: number;
}> {
  logger.debug({ igUserId }, 'Fetching Instagram profile');

  try {
    const response = await metaClient.get(`/${igUserId}`, {
      params: {
        fields: 'id,username,profile_picture_url,account_type,media_count,followers_count',
        access_token: accessToken,
      },
    });

    logger.debug({ igUserId, username: response.data.username }, 'Fetched Instagram profile');
    return response.data;
  } catch (error) {
    handleMetaError(error);
  }
}

export async function debugToken(
  inputToken: string,
): Promise<{ data: { is_valid: boolean; expires_at: number; scopes: string[] } }> {
  logger.debug('Debugging token validity');

  try {
    const response = await metaClient.get('/debug_token', {
      params: {
        input_token: inputToken,
        access_token: `${config.meta.appId}|${config.meta.appSecret}`,
      },
    });

    logger.debug({ isValid: response.data.data?.is_valid }, 'Token debug result');
    return response.data;
  } catch (error) {
    handleMetaError(error);
  }
}

export async function refreshLongLivedToken(
  token: string,
): Promise<{ access_token: string; expires_in: number }> {
  logger.debug('Refreshing long-lived token');

  try {
    const response = await metaClient.get('/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        fb_exchange_token: token,
      },
    });

    logger.debug({ expiresIn: response.data.expires_in }, 'Refreshed long-lived token');
    return response.data;
  } catch (error) {
    handleMetaError(error);
  }
}

export async function getAccountInsights(
  igUserId: string,
  accessToken: string,
  since: Date,
  until: Date,
): Promise<Array<{ name: string; period: string; values: Array<{ value: number; end_time: string }> }>> {
  logger.debug({ igUserId }, 'Fetching account insights');

  try {
    const response = await metaClient.get(`/${igUserId}/insights`, {
      params: {
        metric: 'impressions,reach,profile_views',
        period: 'day',
        since: Math.floor(since.getTime() / 1000),
        until: Math.floor(until.getTime() / 1000),
        access_token: accessToken,
      },
    });

    logger.debug({ igUserId }, 'Fetched account insights');
    return response.data.data ?? [];
  } catch (error) {
    handleMetaError(error);
  }
}

export async function getMediaInsights(
  mediaId: string,
  accessToken: string,
): Promise<Array<{ name: string; values: Array<{ value: number }> }>> {
  logger.debug({ mediaId }, 'Fetching media insights');

  try {
    const response = await metaClient.get(`/${mediaId}/insights`, {
      params: {
        metric: 'like_count,comments_count,saved,reach,impressions',
        access_token: accessToken,
      },
    });

    logger.debug({ mediaId }, 'Fetched media insights');
    return response.data.data ?? [];
  } catch (error) {
    handleMetaError(error);
  }
}
