import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  ENCRYPTION_KEY: z.string().length(64),

  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_REDIRECT_URI: z.string(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1),

  OAUTH_STATE_SECRET: z.string().min(1),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(100),
  PUBLIC_UPLOAD_URL: z.string().default('http://localhost:3001/uploads'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.flatten().fieldErrors;
  console.error('[Config] Missing or invalid environment variables:');
  Object.entries(issues).forEach(([key, messages]) => {
    console.error(`  - ${key}: ${(messages as string[]).join(', ')}`);
  });
  console.error('Set these in Railway → your service → Variables.');
  process.exit(1);
}

const railwayDomain = parsed.data.RAILWAY_PUBLIC_DOMAIN;
const publicBase = railwayDomain ? `https://${railwayDomain}` : `http://localhost:${parsed.data.PORT}`;

export const config = {
  env: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  clientUrl: railwayDomain ? publicBase : parsed.data.CLIENT_URL,
  publicBase,
  databaseUrl: parsed.data.DATABASE_URL,
  jwt: {
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessExpiry: parsed.data.JWT_ACCESS_EXPIRY,
    refreshExpiry: parsed.data.JWT_REFRESH_EXPIRY,
  },
  encryptionKey: parsed.data.ENCRYPTION_KEY,
  meta: {
    appId: parsed.data.META_APP_ID,
    appSecret: parsed.data.META_APP_SECRET,
    redirectUri: parsed.data.META_REDIRECT_URI || `${publicBase}/api/instagram/callback`,
    webhookVerifyToken: parsed.data.META_WEBHOOK_VERIFY_TOKEN,
  },
  oauthStateSecret: parsed.data.OAUTH_STATE_SECRET,
  upload: {
    dir: parsed.data.UPLOAD_DIR,
    maxFileSizeMb: parsed.data.MAX_FILE_SIZE_MB,
    publicUrl: parsed.data.PUBLIC_UPLOAD_URL || `${publicBase}/uploads`,
  },
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',
} as const;
