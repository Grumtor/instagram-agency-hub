# Instagram Agency Hub

A full-stack web application for agencies to manage multiple Instagram Business accounts from a single dashboard. Connect Instagram accounts via Meta OAuth, schedule and publish posts (photos, carousels, reels, stories), monitor DMs, and track all activity with an audit log.

## Tech Stack

**Backend**
- Node.js + Express 5 + TypeScript
- Prisma ORM (PostgreSQL)
- JWT authentication (access + refresh tokens)
- AES-256-GCM encryption for stored tokens
- Zod validation
- node-cron scheduler

**Frontend**
- React 18 + TypeScript
- Vite 5
- React Router v6
- Tailwind CSS
- Axios with token refresh interceptor
- Lucide React icons

**Infrastructure**
- Railway (hosting + PostgreSQL database)
- Single-service deployment (server serves client build in production)

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **PostgreSQL** (local dev) or a Railway Postgres plugin (production)

## Local Development Setup

### 1. Clone and install

```bash
git clone <repo-url> instagram-agency-hub
cd instagram-agency-hub
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/instagram_agency_hub` |
| `JWT_ACCESS_SECRET` | Random string, min 32 chars |
| `JWT_REFRESH_SECRET` | Random string, min 32 chars |
| `ENCRYPTION_KEY` | 64-char hex string (32 bytes) for AES-256-GCM |
| `META_APP_ID` | Your Meta App ID from developers.facebook.com |
| `META_APP_SECRET` | Your Meta App Secret |
| `META_REDIRECT_URI` | OAuth callback URL (default: `http://localhost:3001/api/instagram/callback`) |
| `META_WEBHOOK_VERIFY_TOKEN` | Token you set in Meta webhook config |
| `OAUTH_STATE_SECRET` | Secret for signing OAuth state parameter |

### 3. Database setup

```bash
npm run db:generate
npm run db:migrate
```

### 4. Seed (optional)

Creates a demo user (`admin@example.com` / `password123`) and workspace:

```bash
npm run db:seed
```

### 5. Start development

In two terminals:

```bash
npm run dev:server   # Express API on http://localhost:3001
npm run dev:client   # Vite dev server on http://localhost:5173
```

---

## Deploy to Railway

### 1. Create a Railway project

1. Go to [railway.app](https://railway.app) and create a new project
2. Add a **PostgreSQL** plugin — Railway auto-provisions the database and sets `DATABASE_URL`

### 2. Connect your repo

Connect your GitHub/GitLab repo to Railway, or use `railway up` via CLI.

### 3. Set environment variables

In Railway's dashboard, go to your service **Variables** and add:

```
NODE_ENV=production
JWT_ACCESS_SECRET=<random-32+-char-string>
JWT_REFRESH_SECRET=<random-32+-char-string>
ENCRYPTION_KEY=<64-hex-char-string>
META_APP_ID=<your-meta-app-id>
META_APP_SECRET=<your-meta-app-secret>
META_REDIRECT_URI=https://<your-railway-domain>/api/instagram/callback
META_WEBHOOK_VERIFY_TOKEN=<your-webhook-token>
OAUTH_STATE_SECRET=<random-string>
```

**Railway auto-provides:** `DATABASE_URL`, `PORT`, `RAILWAY_PUBLIC_DOMAIN`

The app auto-detects `RAILWAY_PUBLIC_DOMAIN` and uses it for the client URL, upload URLs, and OAuth redirects.

### 4. Deploy

Railway will automatically:
1. Run `npm install` (which triggers `postinstall` → `prisma generate`)
2. Run `npm run build` (builds client + server)
3. Run the start command: `prisma migrate deploy && node server/dist/index.js`

The healthcheck endpoint is `/api/health`.

### 5. Update Meta App

After deployment, update your Meta App settings at developers.facebook.com:
- OAuth redirect URI → `https://<your-railway-domain>/api/instagram/callback`
- Webhook callback URL → `https://<your-railway-domain>/api/webhooks/instagram`

---

## Meta App Configuration

1. Create an app at [developers.facebook.com](https://developers.facebook.com/)
2. Add the **Instagram** and **Facebook Login** products
3. Configure OAuth redirect URI to match `META_REDIRECT_URI`
4. Enable required permissions: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `business_management`
5. For webhooks, subscribe to the `messages` field on the Instagram product and set your verify token to match `META_WEBHOOK_VERIFY_TOKEN`

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev:server` | Start backend in watch mode (tsx) |
| `npm run dev:client` | Start frontend Vite dev server |
| `npm run build` | Generate Prisma + build client + build server |
| `npm start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:migrate:deploy` | Run Prisma migrations (production) |
| `npm run db:seed` | Seed database with demo data |

## Project Structure

```
instagram-agency-hub/
├── railway.json              # Railway deployment config
├── Procfile                  # Alternative deploy config
├── prisma/
│   ├── schema.prisma         # Database schema (7 models, PostgreSQL)
│   └── seed.ts               # Database seeder
├── server/
│   └── src/
│       ├── index.ts          # Server entry (binds 0.0.0.0 in prod)
│       ├── app.ts            # Express app (serves client/dist in prod)
│       ├── config/           # Env config, Prisma client, encryption
│       ├── middleware/        # Auth, workspace access, rate limiter, upload
│       ├── routes/           # 9 route modules
│       ├── controllers/      # Request handlers
│       ├── services/         # Business logic (Meta API, publishing, messaging)
│       ├── workers/          # Publish worker with retry logic
│       ├── validators/       # Zod schemas
│       └── types/            # TypeScript types
├── client/
│   └── src/
│       ├── App.tsx           # Routes (lazy-loaded pages)
│       ├── context/          # Auth + Workspace React contexts
│       ├── hooks/            # Custom hooks
│       ├── pages/            # 8 page components
│       ├── components/       # Reusable UI components
│       └── lib/              # API client, constants, utilities
└── package.json              # npm workspaces root
```

## API Overview

All API routes are prefixed with `/api`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register a new user |
| `POST` | `/auth/login` | No | Login and get tokens |
| `POST` | `/auth/refresh` | No | Refresh access token |
| `GET` | `/auth/me` | Yes | Get current user |
| `POST` | `/workspaces` | Yes | Create workspace |
| `GET` | `/workspaces` | Yes | List user's workspaces |
| `GET` | `/workspaces/:id` | Yes | Get workspace details |
| `PATCH` | `/workspaces/:id` | Yes (Admin+) | Update workspace |
| `DELETE` | `/workspaces/:id` | Yes (Owner) | Delete workspace |
| `GET/POST/DELETE` | `/workspaces/:id/members` | Yes | Manage members |
| `GET` | `/instagram/auth-url` | Yes | Get Instagram OAuth URL |
| `GET` | `/instagram/callback` | No | OAuth callback handler |
| `GET` | `/workspaces/:wid/accounts` | Yes | List connected accounts |
| `GET` | `/workspaces/:wid/accounts/:aid` | Yes | Get account details |
| `DELETE` | `/workspaces/:wid/accounts/:aid` | Yes (Admin+) | Disconnect account |
| `POST` | `/workspaces/:wid/accounts/:aid/refresh-token` | Yes (Admin+) | Refresh token |
| `GET/POST` | `/workspaces/:wid/posts` | Yes | List / create posts |
| `POST` | `/workspaces/:wid/posts/upload-media` | Yes | Upload media files |
| `GET/PATCH/DELETE` | `/workspaces/:wid/posts/:pid` | Yes | Get / update / delete post |
| `POST` | `/workspaces/:wid/posts/:pid/publish` | Yes | Publish now |
| `GET` | `/workspaces/:wid/dashboard/stats` | Yes | Dashboard statistics |
| `GET` | `/workspaces/:wid/audit-log` | Yes (Admin+) | Audit log |
| `GET` | `/workspaces/:wid/messages/conversations` | Yes | List DM conversations |
| `GET` | `/workspaces/:wid/messages/conversations/:cid` | Yes | Get conversation messages |
| `POST` | `/workspaces/:wid/messages/send` | Yes | Send a DM |
| `GET` | `/webhooks/instagram` | No | Meta webhook verification |
| `POST` | `/webhooks/instagram` | No | Meta webhook event handler |
| `GET` | `/health` | No | Health check |
