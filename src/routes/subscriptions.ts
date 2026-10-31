import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool } from '../db/pool';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  createSubscriptionSchema,
  listSubscriptionsQuerySchema,
  subscriptionIdParamsSchema,
  updateSubscriptionSchema,
} from '../schemas/subscription.schema';
import { asyncHandler } from '../utils/asyncHandler';

interface DbSubscription extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  status: string;
  category_id: number | null;
  tags: unknown;
  created_at: string;
  updated_at: string;
}

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// GET /api/subscriptions?status=active&limit=50&offset=0
router.get(
  '/',
  validate({ query: listSubscriptionsQuerySchema }),
  asyncHandler(async (req, res) => {
    const { status, limit, offset } = req.query as unknown as {
      status: string | undefined;
      limit: number;
      offset: number;
    };

    const conditions: string[] = [];
    const values: (string | number)[] = [];
    if (status !== undefined) {
      conditions.push('status = ?');
      values.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await getPool().execute<DbSubscription[]>(
      `SELECT id, title, description, status, category_id, tags, created_at, updated_at
         FROM subscriptions ${where}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );

    res.json({ count: rows.length, data: rows });
  }),
);

// GET /api/subscriptions/:id
router.get(
  '/:id',
  validate({ params: subscriptionIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await getPool().execute<DbSubscription[]>(
      'SELECT id, title, description, status, category_id, tags, created_at, updated_at FROM subscriptions WHERE id = ?',
      [id],
    );
    const subscription = rows[0];
    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }
    res.json(subscription);
  }),
);

// POST /api/subscriptions
router.post(
  '/',
  validate({ body: createSubscriptionSchema }),
  asyncHandler(async (req, res) => {
    const { title, description, status, category_id, tags } = req.body as {
      title: string;
      description?: string | undefined;
      status?: string;
      category_id?: number;
      tags?: unknown;
    };
    const [result] = await getPool().execute<ResultSetHeader>(
      'INSERT INTO subscriptions (title, description, status, category_id, tags) VALUES (?, ?, ?, ?, ?)',
      [title, description ?? null, status ?? 'active', category_id ?? null, JSON.stringify(tags)],
    );

    const [rows] = await getPool().execute<DbSubscription[]>(
      'SELECT id, title, description, status, category_id, tags, created_at, updated_at FROM subscriptions WHERE id = ?',
      [result.insertId],
    );
    res.status(201).json(rows[0]);
  }),
);

// PATCH /api/subscriptions/:id
router.patch(
  '/:id',
  validate({ params: subscriptionIdParamsSchema, body: updateSubscriptionSchema }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { title, description, status, category_id, tags } = req.body as {
      title?: string;
      description?: string | null;
      status?: string;
      category_id?: number;
      tags?: unknown;
    };

    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      values.push(status);
    }
    if (category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(category_id);
    }
    if (tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(tags));
    }

    values.push(id);
    const [result] = await getPool().execute<ResultSetHeader>(
      `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    const [rows] = await getPool().execute<DbSubscription[]>(
      'SELECT id, title, description, status, category_id, tags, created_at, updated_at FROM subscriptions WHERE id = ?',
      [id],
    );
    res.json(rows[0]);
  }),
);

// DELETE /api/subscriptions/:id
router.delete(
  '/:id',
  validate({ params: subscriptionIdParamsSchema }),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [result] = await getPool().execute<ResultSetHeader>('DELETE FROM subscriptions WHERE id = ?', [
      id,
    ]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }
    res.status(204).send();
  }),
);

export default router;
