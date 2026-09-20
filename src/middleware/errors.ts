import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/** Operational error carrying an HTTP status code. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFound(req: Request): void {
  throw new HttpError(404, `Route not found: ${req.method} ${req.path}`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  // MariaDB / mysql2 errors carry a `code` (e.g. ER_DUP_ENTRY, ECONNREFUSED)
  const dbErr = err as { code?: string; errno?: number };
  if (dbErr && typeof dbErr.code === 'string') {
    if (dbErr.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Duplicate entry', details: String(err) });
      return;
    }
    if (dbErr.code === 'ECONNREFUSED' || dbErr.code === 'PROTOCOL_CONNECTION_LOST') {
      res.status(503).json({ error: 'Database unavailable', details: String(err) });
      return;
    }
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
