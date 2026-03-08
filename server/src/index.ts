import http from 'http';
import path from 'path';

const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';

let appHandler: http.RequestListener | null = null;

const server = http.createServer((req, res) => {
  if (appHandler) {
    return appHandler(req, res);
  }
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(503, { 'Content-Type': 'text/plain' });
  res.end('App is starting, please wait...');
});

server.listen(PORT, HOST, () => {
  console.log(`[boot] Server listening on http://${HOST}:${PORT}`);
  bootstrap();
});

async function bootstrap() {
  console.log('[boot] Step 1: Running migrations...');
  try {
    const { execSync } = require('child_process') as typeof import('child_process');
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    console.log('[boot] Schema path:', schemaPath);
    console.log('[boot] DATABASE_URL set:', !!process.env.DATABASE_URL);
    execSync(`npx prisma migrate deploy --schema=${schemaPath}`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env },
    });
    console.log('[boot] Migrations OK');
  } catch (e) {
    console.warn('[boot] Migration warning (continuing):', String(e));
  }

  console.log('[boot] Step 2: Importing app...');
  try {
    const appModule = await import('./app');
    console.log('[boot] app.ts loaded');
    const app = appModule.default;

    console.log('[boot] Step 3: Importing config...');
    const { config } = await import('./config');
    console.log('[boot] Config loaded, env:', config.env);

    console.log('[boot] Step 4: Seeding admin...');
    try {
      const { seedAdminIfEmpty } = await import('./services/auth.service');
      await seedAdminIfEmpty();
      console.log('[boot] Seed done');
    } catch (seedErr) {
      console.warn('[boot] Seed warning:', String(seedErr));
    }

    console.log('[boot] Step 5: Starting scheduler...');
    try {
      const { startScheduler } = await import('./services/scheduler.service');
      startScheduler();
      console.log('[boot] Scheduler started');
    } catch (schedErr) {
      console.warn('[boot] Scheduler warning:', String(schedErr));
    }

    console.log('[boot] Step 6: Swapping handler...');
    appHandler = app;
    console.log('[boot] ============================================');
    console.log('[boot] APP IS READY');
    console.log(`[boot] URL: http://${HOST}:${PORT}`);
    console.log('[boot] ============================================');
  } catch (err) {
    console.error('[boot] ============================================');
    console.error('[boot] FATAL: Failed to load app');
    console.error('[boot] Error:', err);
    console.error('[boot] ============================================');

    // Serve an error page instead of "Starting..."
    appHandler = (_req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>App failed to start</h1><pre>${String(err)}</pre><p>Check Railway deploy logs.</p>`);
    };
  }
}

const shutdown = (signal: string) => {
  console.log(`${signal} received — shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
