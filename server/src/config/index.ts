import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),

  DATABASE_URL: z.string().default('postgresql://placeholder:placeholder@localhost:5432/placeholder'),

  JWT_ACCESS_SECRET: z.string().min(32).default('CHANGE_ME_jwt_access_secret_placeholder_32c'),
  JWT_REFRESH_SECRET: z.string().min(32).default('CHANGE_ME_jwt_refresh_secret_placeholder_32c'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  ENCRYPTION_KEY: z.string().length(64).default('0000000000000000000000000000000000000000000000000000000000000000'),

  META_APP_ID: z.string().default('not-set'),
  META_APP_SECRET: z.string().default('not-set'),
  META_REDIRECT_URI: z.string().default(''),
  META_WEBHOOK_VERIFY_TOKEN: z.string().default('not-set'),

  OAUTH_STATE_SECRET: z.string().default('not-set-change-me'),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(100),
  PUBLIC_UPLOAD_URL: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.flatten().fieldErrors;
  console.error('============================================');
  console.error('[Config] MISSING ENVIRONMENT VARIABLES:');
  Object.entries(issues).forEach(([key, messages]) => {
    console.error(`  - ${key}: ${(messages as string[]).join(', ')}`);
  });
  console.error('============================================');
  throw new Error('Invalid environment variables — see above');
}

const data = parsed.data;
const railwayDomain = data.RAILWAY_PUBLIC_DOMAIN;
const publicBase = railwayDomain ? `https://${railwayDomain}` : `http://localhost:${data.PORT}`;

// Warn about placeholder values
const placeholders = [];
if (data.DATABASE_URL.includes('placeholder')) placeholders.push('DATABASE_URL (attach Postgres in Railway!)');
if (data.JWT_ACCESS_SECRET.includes('CHANGE_ME')) placeholders.push('JWT_ACCESS_SECRET');
if (data.JWT_REFRESH_SECRET.includes('CHANGE_ME')) placeholders.push('JWT_REFRESH_SECRET');
if (data.ENCRYPTION_KEY === '0000000000000000000000000000000000000000000000000000000000000000') placeholders.push('ENCRYPTION_KEY');
if (data.META_APP_ID === 'not-set') placeholders.push('META_APP_ID');
if (data.META_APP_SECRET === 'not-set') placeholders.push('META_APP_SECRET');
if (data.OAUTH_STATE_SECRET === 'not-set-change-me') placeholders.push('OAUTH_STATE_SECRET');

if (placeholders.length > 0) {
  console.warn('============================================');
  console.warn('[Config] WARNING: These variables use placeholder defaults:');
  placeholders.forEach(k => console.warn(`  - ${k}`));
  console.warn('The app will start but these features will NOT work correctly.');
  console.warn('Set real values in Railway → Variables.');
  console.warn('============================================');
}

export const config = {
  env: data.NODE_ENV,
  port: data.PORT,
  clientUrl: railwayDomain ? publicBase : data.CLIENT_URL,
  publicBase,
  databaseUrl: data.DATABASE_URL,
  jwt: {
    accessSecret: data.JWT_ACCESS_SECRET,
    refreshSecret: data.JWT_REFRESH_SECRET,
    accessExpiry: data.JWT_ACCESS_EXPIRY,
    refreshExpiry: data.JWT_REFRESH_EXPIRY,
  },
  encryptionKey: data.ENCRYPTION_KEY,
  meta: {
    appId: data.META_APP_ID,
    appSecret: data.META_APP_SECRET,
    redirectUri: data.META_REDIRECT_URI || `${publicBase}/api/instagram/callback`,
    webhookVerifyToken: data.META_WEBHOOK_VERIFY_TOKEN,
  },
  oauthStateSecret: data.OAUTH_STATE_SECRET,
  upload: {
    dir: data.UPLOAD_DIR,
    maxFileSizeMb: data.MAX_FILE_SIZE_MB,
    publicUrl: data.PUBLIC_UPLOAD_URL || `${publicBase}/uploads`,
  },
  isDev: data.NODE_ENV === 'development',
  isProd: data.NODE_ENV === 'production',
} as const;
