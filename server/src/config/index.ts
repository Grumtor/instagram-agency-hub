import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Auto-detect Railway: if RAILWAY_PUBLIC_DOMAIN or RAILWAY_ENVIRONMENT exists, we're on Railway
const isRailway = !!(process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID);

// Auto-generate deterministic secrets from DATABASE_URL (so they're stable across deploys)
// In production you should set real secrets, but this ensures the app boots
function deriveSecret(seed: string, label: string): string {
  return crypto.createHash('sha256').update(`${seed}:${label}`).digest('hex');
}

const dbUrl = process.env.DATABASE_URL || '';
const autoJwtAccess = deriveSecret(dbUrl, 'jwt-access-secret-instagram-agency-hub');
const autoJwtRefresh = deriveSecret(dbUrl, 'jwt-refresh-secret-instagram-agency-hub');
const autoEncryption = deriveSecret(dbUrl, 'encryption-key-instagram-agency-hub');
const autoOauthState = deriveSecret(dbUrl, 'oauth-state-instagram-agency-hub');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default(isRailway ? 'production' : 'development'),
  PORT: z.coerce.number().default(3001),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),

  DATABASE_URL: z.string().min(1).default('postgresql://placeholder:placeholder@localhost:5432/placeholder'),

  JWT_ACCESS_SECRET: z.string().min(32).default(autoJwtAccess),
  JWT_REFRESH_SECRET: z.string().min(32).default(autoJwtRefresh),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  ENCRYPTION_KEY: z.string().length(64).default(autoEncryption),

  META_APP_ID: z.string().default('not-set'),
  META_APP_SECRET: z.string().default('not-set'),
  META_REDIRECT_URI: z.string().default(''),
  META_WEBHOOK_VERIFY_TOKEN: z.string().default('not-set'),

  OAUTH_STATE_SECRET: z.string().default(autoOauthState),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(100),
  PUBLIC_UPLOAD_URL: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.flatten().fieldErrors;
  console.error('[Config] Invalid env:', issues);
  throw new Error('Invalid environment variables');
}

const data = parsed.data;

// Force production on Railway regardless of NODE_ENV value
const env = isRailway ? 'production' as const : data.NODE_ENV;

const railwayDomain = data.RAILWAY_PUBLIC_DOMAIN;
const publicBase = railwayDomain ? `https://${railwayDomain}` : `http://localhost:${data.PORT}`;

// Facebook exige HTTPS en production : on force l'URI de redirection en https si on est sur Railway
function ensureHttpsRedirectUri(uri: string, inProduction: boolean): string {
  if (!inProduction) return uri;
  if (uri.startsWith('http://')) {
    const fixed = 'https://' + uri.slice(7);
    console.warn(`[Config] META_REDIRECT_URI was HTTP; Facebook requires HTTPS. Using: "${fixed}"`);
    return fixed;
  }
  return uri;
}

// Always log key config for debugging
console.log('[Config] ===== CONFIGURATION =====');
console.log(`[Config] isRailway: ${isRailway}`);
console.log(`[Config] NODE_ENV: ${env}`);
console.log(`[Config] RAILWAY_PUBLIC_DOMAIN (raw env): "${process.env.RAILWAY_PUBLIC_DOMAIN || '(not set)'}"`);
console.log(`[Config] railwayDomain (parsed): "${railwayDomain || '(empty)'}"`);
console.log(`[Config] publicBase: "${publicBase}"`);
console.log(`[Config] META_REDIRECT_URI (raw env): "${process.env.META_REDIRECT_URI || '(not set)'}"`);
console.log(`[Config] META_REDIRECT_URI (parsed): "${data.META_REDIRECT_URI}"`);
if (isRailway) {
  console.log('[Config] Railway detected — production mode');
  console.log(`[Config] Database: ${data.DATABASE_URL.includes('placeholder') ? 'NOT SET — attach Postgres plugin!' : 'connected'}`);
}

export const config = {
  env,
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
    redirectUri: ensureHttpsRedirectUri(
      data.META_REDIRECT_URI || `${publicBase}/api/instagram/callback`,
      env === 'production'
    ),
    webhookVerifyToken: data.META_WEBHOOK_VERIFY_TOKEN,
  },
  oauthStateSecret: data.OAUTH_STATE_SECRET,
  upload: {
    dir: data.UPLOAD_DIR,
    maxFileSizeMb: data.MAX_FILE_SIZE_MB,
    publicUrl: data.PUBLIC_UPLOAD_URL || `${publicBase}/uploads`,
  },
  isDev: env === 'development',
  isProd: env === 'production',
} as const;

console.log(`[Config] FINAL meta.redirectUri: "${config.meta.redirectUri}"`);
console.log('[Config] ===== END CONFIGURATION =====');
