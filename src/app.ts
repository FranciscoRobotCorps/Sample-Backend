import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getPool } from './db/pool';
import { errorHandler, notFound } from './middleware/errors';
import todosRouter from './routes/todos';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false }));

  // Health check: also verifies DB connectivity on demand.
  app.get('/health', async (_req, res) => {
    const db = { status: 'ok' as string | 'error' };
    try {
      await getPool().query('SELECT 1');
    } catch {
      db.status = 'error';
    }
    res.status(db.status === 'ok' ? 200 : 503).json({ status: db.status === 'ok' ? 'ok' : 'degraded', db });
  });

  app.use('/api/todos', todosRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
