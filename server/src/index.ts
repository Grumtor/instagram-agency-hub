import http from 'http';
import path from 'path';

const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';

// Single HTTP server — starts with a minimal handler, then swaps to Express
let appHandler: http.RequestListener | null = null;

const server = http.createServer((req, res) => {
  if (appHandler) {
    return appHandler(req, res);
  }
  // Before Express loads, only respond to healthcheck
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
  try {
    // Phase 1: Run migrations
    console.log('[boot] Running database migrations...');
    try {
      const { execSync } = require('child_process') as typeof import('child_process');
      const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
      execSync(`npx prisma migrate deploy --schema=${schemaPath}`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..'),
      });
      console.log('[boot] Migrations applied successfully');
    } catch {
      console.warn('[boot] Migration failed (tables may already exist, continuing...)');
    }

    // Phase 2: Load the full Express app
    console.log('[boot] Loading application...');
    const { default: app } = await import('./app');
    const { config } = await import('./config');
    const { logger } = await import('./utils/logger');
    const { startScheduler } = await import('./services/scheduler.service');

    // Phase 3: Seed admin user if no users exist
    try {
      const { seedAdminIfEmpty } = await import('./services/auth.service');
      await seedAdminIfEmpty();
    } catch (err) {
      console.warn('[boot] Auto-seed skipped:', err);
    }

    // Phase 4: Swap handler — all requests now go through Express
    appHandler = app;
    logger.info(`App ready on http://${HOST}:${PORT} [${config.env}]`);

    startScheduler();
  } catch (err) {
    console.error('[boot] ========================================');
    console.error('[boot] FAILED TO START APPLICATION:');
    console.error(err);
    console.error('[boot] ========================================');
    console.error('[boot] Healthcheck will keep running. Check the error above.');
  }
}

const shutdown = (signal: string) => {
  console.log(`${signal} received — shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
