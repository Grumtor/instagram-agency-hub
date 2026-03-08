import { execSync } from 'child_process';
import path from 'path';
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { startScheduler } from './services/scheduler.service';

// Railway: use PORT from env (injected at runtime); listen immediately so healthcheck passes
const port = Number(process.env.PORT) || config.port;
const host = config.isProd ? '0.0.0.0' : 'localhost';

const server = app.listen(port, host, () => {
  logger.info(`Server running on http://${host}:${port} [${config.env}]`);
  startScheduler();

  // Run migrations after listen so /health succeeds first (avoids healthcheck timeout)
  if (config.isProd) {
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    try {
      execSync(`npx prisma migrate deploy --schema=${schemaPath}`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../..'),
      });
      logger.info('Prisma migrations applied');
    } catch (err) {
      logger.error('Prisma migrate deploy failed:', err);
      process.exit(1);
    }
  }
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
