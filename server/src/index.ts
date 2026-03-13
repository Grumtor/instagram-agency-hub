import http from 'http';
import path from 'path';
import { exec } from 'child_process';

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
  res.end('App is starting...');
});

server.listen(PORT, HOST, () => {
  console.log(`[boot] Listening on port ${PORT}`);
  bootstrap();
});

async function runMigrations(): Promise<void> {
  return new Promise((resolve) => {
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    const cwd = path.resolve(__dirname, '../..');
    console.log('[boot] Running prisma migrate deploy...');
    const child = exec(`npx prisma migrate deploy --schema=${schemaPath}`, { cwd, env: { ...process.env } });
    child.stdout?.on('data', (d) => process.stdout.write(d));
    child.stderr?.on('data', (d) => process.stderr.write(d));
    child.on('close', (code) => {
      if (code === 0) {
        console.log('[boot] Migrations OK');
      } else {
        console.warn(`[boot] Migrations exited with code ${code} (may be OK if tables exist)`);
      }
      resolve();
    });
    child.on('error', (err) => {
      console.warn('[boot] Migration error:', err.message);
      resolve();
    });
  });
}

async function bootstrap() {
  // Step 1: Import the app (fast, no blocking)
  try {
    console.log('[boot] Loading Express app...');
    const { default: app } = await import('./app');
    console.log('[boot] Express loaded');

    // Step 2: Swap handler IMMEDIATELY so the app is live
    appHandler = app;
    console.log('[boot] Handler swapped — app is now serving requests');

    // Step 3: Run migrations in background (non-blocking)
    await runMigrations();

    // Step 4: Seed admin if DB is empty
    try {
      const { seedAdminIfEmpty } = await import('./services/auth.service');
      await seedAdminIfEmpty();
    } catch (e) {
      console.warn('[boot] Seed skipped:', String(e));
    }

    // Step 5: Start scheduler
    try {
      const { startScheduler } = await import('./services/scheduler.service');
      startScheduler();
      console.log('[boot] Scheduler started');
    } catch (e) {
      console.warn('[boot] Scheduler skipped:', String(e));
    }

    // Step 6: Start insights cron
    try {
      const { startInsightsCron } = await import('./workers/insightsCron');
      startInsightsCron();
      console.log('[boot] Insights cron started');
    } catch (e) {
      console.warn('[boot] Insights cron skipped:', String(e));
    }

    const { config } = await import('./config');
    console.log('============================================');
    console.log(`[boot] APP READY — ${config.env} mode`);
    console.log('============================================');
  } catch (err) {
    console.error('[boot] FATAL:', err);
    appHandler = (_req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Startup failed</h1><pre>${String(err)}</pre>`);
    };
  }
}

const shutdown = (signal: string) => {
  console.log(`${signal} — shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
