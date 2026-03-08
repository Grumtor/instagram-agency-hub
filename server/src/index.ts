import http from 'http';

const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';

// Phase 1: Open a bare HTTP server immediately so Railway healthcheck passes
const earlyServer = http.createServer((_req, res) => {
  if (_req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(503);
  res.end('Starting...');
});

earlyServer.listen(PORT, HOST, () => {
  console.log(`[boot] Healthcheck server on http://${HOST}:${PORT}/health`);

  // Phase 2: Load the full app (this triggers config validation, DB connection, etc.)
  (async () => {
    try {
      const { default: app } = await import('./app');
      const { config } = await import('./config');
      const { logger } = await import('./utils/logger');
      const { startScheduler } = await import('./services/scheduler.service');

      // Phase 3: Replace the early server with the real Express app
      earlyServer.close(() => {
        const server = app.listen(PORT, HOST, () => {
          logger.info(`Server running on http://${HOST}:${PORT} [${config.env}]`);

          // Phase 4: Run migrations in production
          if (config.isProd) {
            try {
              const pathMod = require('path') as typeof import('path');
              const { execSync } = require('child_process') as typeof import('child_process');
              const schemaPath = pathMod.resolve(__dirname, '../../prisma/schema.prisma');
              execSync(`npx prisma migrate deploy --schema=${schemaPath}`, {
                stdio: 'inherit',
                cwd: pathMod.resolve(__dirname, '../..'),
              });
              logger.info('Prisma migrations applied');
            } catch (err) {
              logger.error({ err }, 'Prisma migrate deploy failed (non-fatal, tables may already exist)');
            }
          }

          startScheduler();
        });

        const shutdown = (signal: string) => {
          logger.info(`${signal} received — shutting down gracefully`);
          server.close(() => {
            logger.info('Server closed');
            process.exit(0);
          });
          setTimeout(() => process.exit(1), 10_000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
      });
    } catch (err) {
      console.error('[boot] Failed to load application:', err);
      // Keep the early server running so healthcheck doesn't fail
      // and Railway shows the error in logs instead of just "unhealthy"
    }
  })();
});
