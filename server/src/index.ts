import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { startScheduler } from './services/scheduler.service';

const host = config.isProd ? '0.0.0.0' : 'localhost';
const server = app.listen(config.port, host, () => {
  logger.info(`Server running on http://${host}:${config.port} [${config.env}]`);
  startScheduler();
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
