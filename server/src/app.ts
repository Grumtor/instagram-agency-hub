import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';
import routes from './routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

// Healthcheck first (no middleware) — for Railway / load balancers
app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// Mount webhook routes BEFORE global JSON parser so we can capture raw body
app.use('/api/webhooks', express.json({
  limit: '10mb',
  verify: (req: any, _res: any, buf: Buffer) => {
    req.rawBody = buf;
  },
}), webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

// Serve uploads with authentication (AC-3)
app.use('/uploads', requireAuth, express.static(path.resolve(config.upload.dir)));

app.use('/api', routes);

if (config.isProd) {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // Express 5 SPA fallback: serve index.html for any unmatched GET request
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    } else {
      next();
    }
  });
}

app.use(errorHandler);

export default app;
