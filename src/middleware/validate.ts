import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodType } from 'zod';

export interface ValidationParams {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validate req.body / req.query / req.params against zod schemas.
 * Parsed (and coerced/transformed) values replace the originals, so
 * downstream handlers receive safe, typed data.
 */
export function validate(schemas: ValidationParams): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const results: { key: 'body' | 'query' | 'params'; data: unknown }[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: 'Validation failed', details: result.error.issues });
        return;
      }
      results.push({ key: 'body', data: result.data });
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        res.status(400).json({ error: 'Validation failed', details: result.error.issues });
        return;
      }
      results.push({ key: 'query', data: result.data });
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        res.status(400).json({ error: 'Validation failed', details: result.error.issues });
        return;
      }
      results.push({ key: 'params', data: result.data });
    }

    for (const { key, data } of results) {
      if (key === 'body') {
        req.body = data;
      } else if (key === 'query') {
        Object.assign(req.query, data);
      } else {
        Object.assign(req.params, data);
      }
    }

    next();
  };
}
