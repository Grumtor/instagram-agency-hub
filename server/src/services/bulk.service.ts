import { prisma } from '../config/database';
import { PostStatus, PostType, AuditAction } from '../types/enums';
import { ValidationError } from '../utils/errors';
import { createAuditLog } from './auditLog.service';
import { safeParseMediaUrls } from '../utils/safeJson';
import { config } from '../config';

const MAX_BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// CSV parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse a single CSV line respecting quoted fields.
 * Handles: commas inside quotes, escaped double-quotes ("").
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuote) {
      if (ch === '"') {
        // Peek ahead — two consecutive quotes = escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Normalise Windows line-endings and split into non-empty lines. */
function splitLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// ---------------------------------------------------------------------------
// CSV template
// ---------------------------------------------------------------------------

const CSV_HEADERS = ['account', 'caption', 'scheduledAt', 'type', 'mediaUrl'];

export async function getCsvTemplate(workspaceId: string): Promise<string> {
  const accounts = await prisma.instagramAccount.findMany({
    where: { workspaceId, isActive: true },
    select: { igUsername: true },
    orderBy: { igUsername: 'asc' },
  });

  const exampleAccount = accounts.length > 0 ? accounts[0].igUsername : 'your_account';
  const exampleDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const rows = [
    CSV_HEADERS.join(','),
    `${exampleAccount},"Your caption here",${exampleDate},POST,https://example.com/image.jpg`,
    `${exampleAccount},"Another caption",${exampleDate},REEL,https://example.com/video.mp4`,
  ];

  return rows.join('\n');
}

// ---------------------------------------------------------------------------
// CSV upload
// ---------------------------------------------------------------------------

interface CsvRowError {
  line: number;
  reason: string;
}

interface CsvUploadResult {
  createdCount: number;
  posts: unknown[];
  errors: CsvRowError[];
  warning?: string;
}

export async function processCsvUpload(
  workspaceId: string,
  userId: string,
  csvText: string,
): Promise<CsvUploadResult> {
  const lines = splitLines(csvText);

  if (lines.length === 0) {
    throw new ValidationError('CSV file is empty');
  }

  // Validate header row
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase());
  const requiredHeaders = ['account', 'caption', 'scheduledat', 'type'];
  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new ValidationError(
      `CSV is missing required headers: ${missingHeaders.join(', ')}. Expected: ${CSV_HEADERS.join(', ')}`,
    );
  }

  const accountIdx = headers.indexOf('account');
  const captionIdx = headers.indexOf('caption');
  const scheduledAtIdx = headers.indexOf('scheduledat');
  const typeIdx = headers.indexOf('type');
  const mediaUrlIdx = headers.indexOf('mediaurl');

  const dataLines = lines.slice(1);
  let truncated = false;
  let processedLines = dataLines;

  if (dataLines.length > MAX_BATCH_SIZE) {
    processedLines = dataLines.slice(0, MAX_BATCH_SIZE);
    truncated = true;
  }

  // Fetch all workspace accounts for lookup
  const workspaceAccounts = await prisma.instagramAccount.findMany({
    where: { workspaceId },
    select: { id: true, igUsername: true },
  });

  const accountByUsername = new Map(
    workspaceAccounts.map((a) => [a.igUsername.toLowerCase(), a]),
  );

  const errors: CsvRowError[] = [];
  const toCreate: Array<{
    igAccountId: string;
    type: string;
    caption: string;
    mediaUrls: string[];
    scheduledAt: Date | null;
    status: string;
  }> = [];

  for (let i = 0; i < processedLines.length; i++) {
    const lineNum = i + 2; // 1-based, +1 for header
    const raw = processedLines[i];

    if (!raw.trim()) continue;

    const fields = parseCsvLine(raw);

    const accountUsername = fields[accountIdx]?.trim() ?? '';
    const caption = fields[captionIdx]?.trim() ?? '';
    const scheduledAtRaw = fields[scheduledAtIdx]?.trim() ?? '';
    const typeRaw = (fields[typeIdx]?.trim() ?? '').toUpperCase();
    const mediaUrl = mediaUrlIdx >= 0 ? (fields[mediaUrlIdx]?.trim() ?? '') : '';

    // Validate account
    if (!accountUsername) {
      errors.push({ line: lineNum, reason: 'account username is required' });
      continue;
    }

    const account = accountByUsername.get(accountUsername.toLowerCase());
    if (!account) {
      errors.push({
        line: lineNum,
        reason: `account "@${accountUsername}" not found in this workspace`,
      });
      continue;
    }

    // Validate caption
    if (!caption) {
      errors.push({ line: lineNum, reason: 'caption is required' });
      continue;
    }

    // Validate scheduledAt
    if (!scheduledAtRaw) {
      errors.push({ line: lineNum, reason: 'scheduledAt is required' });
      continue;
    }
    const scheduledAtDate = new Date(scheduledAtRaw);
    if (isNaN(scheduledAtDate.getTime())) {
      errors.push({ line: lineNum, reason: `scheduledAt "${scheduledAtRaw}" is not a valid date` });
      continue;
    }

    // Validate type
    const validTypes = Object.values(PostType) as string[];
    if (!validTypes.includes(typeRaw)) {
      errors.push({
        line: lineNum,
        reason: `type "${typeRaw}" is invalid. Valid values: ${validTypes.join(', ')}`,
      });
      continue;
    }

    const mediaUrls = mediaUrl ? [mediaUrl] : [];
    const status =
      scheduledAtDate > new Date() ? PostStatus.SCHEDULED : PostStatus.DRAFT;

    toCreate.push({
      igAccountId: account.id,
      type: typeRaw,
      caption,
      mediaUrls,
      scheduledAt: scheduledAtDate,
      status,
    });
  }

  if (toCreate.length === 0 && errors.length > 0) {
    // All rows had errors — return without creating
    return { createdCount: 0, posts: [], errors, warning: truncated ? `Batch truncated to ${MAX_BATCH_SIZE} rows` : undefined };
  }

  // Bulk create valid posts
  const createdPosts = await Promise.all(
    toCreate.map((row) =>
      prisma.post.create({
        data: {
          workspaceId,
          igAccountId: row.igAccountId,
          type: row.type as PostType,
          caption: row.caption,
          mediaUrls: row.mediaUrls,
          scheduledAt: row.scheduledAt,
          status: row.status as PostStatus,
          createdById: userId,
        },
        include: {
          igAccount: { select: { id: true, igUsername: true } },
        },
      }),
    ),
  );

  if (createdPosts.length > 0) {
    await createAuditLog(
      workspaceId,
      userId,
      AuditAction.POST_CREATED,
      'BulkPost',
      workspaceId,
      { count: createdPosts.length, source: 'csv' },
    );
  }

  return {
    createdCount: createdPosts.length,
    posts: createdPosts.map((p) => ({ ...p, mediaUrls: safeParseMediaUrls(p.mediaUrls) })),
    errors,
    ...(truncated && {
      warning: `Batch truncated to ${MAX_BATCH_SIZE} rows. Only the first ${MAX_BATCH_SIZE} rows were processed.`,
    }),
  };
}

// ---------------------------------------------------------------------------
// Multi-media upload → preview
// ---------------------------------------------------------------------------

interface MediaPreviewPost {
  igAccountId: string;
  type: string;
  caption: string;
  mediaUrls: string[];
  scheduledAt: string;
  status: string;
}

interface MediaUploadPreviewResult {
  postCount: number;
  spacing: 'auto';
  editable: true;
  posts: MediaPreviewPost[];
}

export async function previewMediaBatch(
  workspaceId: string,
  files: Express.Multer.File[],
  accountId: string,
  startDate: string,
): Promise<MediaUploadPreviewResult> {
  // Validate account belongs to workspace
  const account = await prisma.instagramAccount.findFirst({
    where: { id: accountId, workspaceId },
    select: { id: true, igUsername: true },
  });
  if (!account) {
    throw new ValidationError('Instagram account not found in this workspace');
  }

  const start = new Date(startDate);
  if (isNaN(start.getTime())) {
    throw new ValidationError('startDate is not a valid date');
  }

  const limitedFiles = files.slice(0, MAX_BATCH_SIZE);

  const posts: MediaPreviewPost[] = limitedFiles.map((file, idx) => {
    const scheduledAt = new Date(start);
    scheduledAt.setDate(scheduledAt.getDate() + idx);

    const mediaUrl = `${config.upload.publicUrl}/${file.filename}`;
    const isVideo =
      file.mimetype.startsWith('video/');
    const type = isVideo ? PostType.REEL : PostType.POST;

    return {
      igAccountId: account.id,
      type,
      caption: '',
      mediaUrls: [mediaUrl],
      scheduledAt: scheduledAt.toISOString(),
      status: scheduledAt > new Date() ? PostStatus.SCHEDULED : PostStatus.DRAFT,
    };
  });

  return {
    postCount: posts.length,
    spacing: 'auto',
    editable: true,
    posts,
  };
}

// ---------------------------------------------------------------------------
// Confirm bulk
// ---------------------------------------------------------------------------

interface BulkConfirmPostInput {
  igAccountId: string;
  type: string;
  caption?: string;
  mediaUrls?: string[];
  scheduledAt?: string;
}

interface BulkConfirmResult {
  createdCount: number;
  posts: unknown[];
}

export async function confirmBulkPosts(
  workspaceId: string,
  userId: string,
  posts: BulkConfirmPostInput[],
): Promise<BulkConfirmResult> {
  if (posts.length === 0) {
    throw new ValidationError('No posts provided');
  }

  const limited = posts.slice(0, MAX_BATCH_SIZE);

  // Validate all accounts belong to this workspace
  const accountIds = [...new Set(limited.map((p) => p.igAccountId))];
  const accounts = await prisma.instagramAccount.findMany({
    where: { id: { in: accountIds }, workspaceId },
    select: { id: true },
  });
  const validAccountIds = new Set(accounts.map((a) => a.id));

  const invalidPosts = limited.filter((p) => !validAccountIds.has(p.igAccountId));
  if (invalidPosts.length > 0) {
    throw new ValidationError(
      `Some posts reference accounts not in this workspace: ${[...new Set(invalidPosts.map((p) => p.igAccountId))].join(', ')}`,
    );
  }

  const created = await Promise.all(
    limited.map((postInput) => {
      const scheduledAt = postInput.scheduledAt ? new Date(postInput.scheduledAt) : null;
      const status =
        scheduledAt && scheduledAt > new Date() ? PostStatus.SCHEDULED : PostStatus.DRAFT;

      return prisma.post.create({
        data: {
          workspaceId,
          igAccountId: postInput.igAccountId,
          type: postInput.type as PostType,
          caption: postInput.caption ?? null,
          mediaUrls: postInput.mediaUrls ?? [],
          scheduledAt,
          status,
          createdById: userId,
        },
        include: {
          igAccount: { select: { id: true, igUsername: true } },
        },
      });
    }),
  );

  await createAuditLog(
    workspaceId,
    userId,
    AuditAction.POST_CREATED,
    'BulkPost',
    workspaceId,
    { count: created.length, source: 'bulk_confirm' },
  );

  return {
    createdCount: created.length,
    posts: created.map((p) => ({ ...p, mediaUrls: safeParseMediaUrls(p.mediaUrls) })),
  };
}
