import { MetaApiError, AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { MetaError } from '../types/meta.types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function metaPost(
  endpoint: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH_API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { method: 'POST' });
  const data = await response.json();

  if (!response.ok) {
    const errorData = data as MetaError;
    logger.error({ errorData, endpoint }, 'Meta API POST error');
    throw new MetaApiError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.type,
      errorData.error.error_subcode,
    );
  }

  return data as Record<string, unknown>;
}

async function metaGet(
  endpoint: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH_API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    const errorData = data as MetaError;
    logger.error({ errorData, endpoint }, 'Meta API GET error');
    throw new MetaApiError(
      errorData.error.message,
      errorData.error.code,
      errorData.error.type,
      errorData.error.error_subcode,
    );
  }

  return data as Record<string, unknown>;
}

async function pollContainerStatus(
  containerId: string,
  accessToken: string,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    const status = await metaGet(`/${containerId}`, {
      fields: 'status_code',
      access_token: accessToken,
    });

    const statusCode = status.status_code as string;

    if (statusCode === 'FINISHED') {
      return;
    }

    if (statusCode === 'ERROR') {
      throw new AppError(
        `Media container ${containerId} processing failed with ERROR status`,
        502,
      );
    }

    logger.debug(
      { containerId, statusCode },
      'Polling container status...',
    );
    await sleep(POLL_INTERVAL_MS);
  }

  throw new AppError(
    `Media container ${containerId} processing timed out after 5 minutes`,
    504,
  );
}

export async function publishPhoto(
  igUserId: string,
  imageUrl: string,
  caption: string,
  accessToken: string,
): Promise<{ id: string; permalink?: string }> {
  const container = await metaPost(`/${igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });

  await pollContainerStatus(container.id as string, accessToken);

  const published = await metaPost(`/${igUserId}/media_publish`, {
    creation_id: container.id as string,
    access_token: accessToken,
  });

  const media = await metaGet(`/${published.id as string}`, {
    fields: 'permalink',
    access_token: accessToken,
  });

  return {
    id: published.id as string,
    permalink: media.permalink as string | undefined,
  };
}

export async function publishCarousel(
  igUserId: string,
  imageUrls: string[],
  caption: string,
  accessToken: string,
): Promise<{ id: string; permalink?: string }> {
  const childIds: string[] = [];
  for (const imageUrl of imageUrls) {
    const child = await metaPost(`/${igUserId}/media`, {
      image_url: imageUrl,
      is_carousel_item: 'true',
      access_token: accessToken,
    });
    await pollContainerStatus(child.id as string, accessToken);
    childIds.push(child.id as string);
  }

  const container = await metaPost(`/${igUserId}/media`, {
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
    access_token: accessToken,
  });

  await pollContainerStatus(container.id as string, accessToken);

  const published = await metaPost(`/${igUserId}/media_publish`, {
    creation_id: container.id as string,
    access_token: accessToken,
  });

  const media = await metaGet(`/${published.id as string}`, {
    fields: 'permalink',
    access_token: accessToken,
  });

  return {
    id: published.id as string,
    permalink: media.permalink as string | undefined,
  };
}

export async function publishReel(
  igUserId: string,
  videoUrl: string,
  caption: string,
  accessToken: string,
  coverUrl?: string,
): Promise<{ id: string; permalink?: string }> {
  const params: Record<string, string> = {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
    share_to_feed: 'true',
    access_token: accessToken,
  };
  if (coverUrl) {
    params.cover_url = coverUrl;
  }

  const container = await metaPost(`/${igUserId}/media`, params);

  await pollContainerStatus(container.id as string, accessToken);

  const published = await metaPost(`/${igUserId}/media_publish`, {
    creation_id: container.id as string,
    access_token: accessToken,
  });

  const media = await metaGet(`/${published.id as string}`, {
    fields: 'permalink',
    access_token: accessToken,
  });

  return {
    id: published.id as string,
    permalink: media.permalink as string | undefined,
  };
}

export async function publishStory(
  igUserId: string,
  mediaUrl: string,
  isVideo: boolean,
  accessToken: string,
): Promise<{ id: string }> {
  const params: Record<string, string> = {
    media_type: 'STORIES',
    access_token: accessToken,
  };

  if (isVideo) {
    params.video_url = mediaUrl;
  } else {
    params.image_url = mediaUrl;
  }

  const container = await metaPost(`/${igUserId}/media`, params);

  if (isVideo) {
    await pollContainerStatus(container.id as string, accessToken);
  }

  const published = await metaPost(`/${igUserId}/media_publish`, {
    creation_id: container.id as string,
    access_token: accessToken,
  });

  return { id: published.id as string };
}
