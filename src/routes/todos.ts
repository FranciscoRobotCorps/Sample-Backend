import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool } from '../db/pool';
import { validate } from '../middleware/validate';
import {
  createTodoSchema,
  listTodosQuerySchema,
  todoIdParamsSchema,
  updateTodoSchema,
} from '../schemas/todo.schema';
import { asyncHandler } from '../utils/asyncHandler';

export interface TodoRow extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  done: number; // 0/1 in MariaDB TINYINT(1)
  created_at: string;
  updated_at: string;
}

const router = Router();

// GET /api/todos?done=true|false&limit=50&offset=0
router.get(
  '/',
  validate({ query: listTodosQuerySchema }),
  asyncHandler(async (req, res) => {
    const { done, limit, offset } = req.query as unknown as {
      done: boolean | undefined;
      limit: number;
      offset: number;
    };

    const conditions: string[] = [];
    const values: number[] = [];
    if (done !== undefined) {
      conditions.push('done = ?');
      values.push(done ? 1 : 0);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await getPool().execute<TodoRow[]>(
      `SELECT id, title, description, done, created_at, updated_at
         FROM todos ${where}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );

    res.json({ count: rows.length, data: rows });
  }),
);

// GET /api/todos/:id
router.get(
  '/:id',
  validate({ params: todoIdParamsSchema }),
  async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await getPool().execute<TodoRow[]>(
      'SELECT id, title, description, done, created_at, updated_at FROM todos WHERE id = ?',
      [id],
    );
    const todo = rows[0];
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json(todo);
  },
);

// POST /api/todos
router.post(
  '/',
  validate({ body: createTodoSchema }),
  async (req, res) => {
    const { title, description } = req.body as {
      title: string;
      description?: string;
    };
    const [result] = await getPool().execute<ResultSetHeader>(
      'INSERT INTO todos (title, description) VALUES (?, ?)',
      [title, description ?? null],
    );

    const [rows] = await getPool().execute<TodoRow[]>(
      'SELECT id, title, description, done, created_at, updated_at FROM todos WHERE id = ?',
      [result.insertId],
    );
    res.status(201).json(rows[0]);
  },
);

// PATCH /api/todos/:id
router.patch(
  '/:id',
  validate({ params: todoIdParamsSchema, body: updateTodoSchema }),
  async (req, res) => {
    const id = Number(req.params.id);
    const { title, description, done } = req.body as {
      title?: string;
      description?: string | null;
      done?: boolean;
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
    if (done !== undefined) {
      fields.push('done = ?');
      values.push(done ? 1 : 0);
    }

    values.push(id);
    const [result] = await getPool().execute<ResultSetHeader>(
      `UPDATE todos SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    const [rows] = await getPool().execute<TodoRow[]>(
      'SELECT id, title, description, done, created_at, updated_at FROM todos WHERE id = ?',
      [id],
    );
    res.json(rows[0]);
  },
);

// DELETE /api/todos/:id
router.delete(
  '/:id',
  validate({ params: todoIdParamsSchema }),
  async (req, res) => {
    const id = Number(req.params.id);
    const [result] = await getPool().execute<ResultSetHeader>('DELETE FROM todos WHERE id = ?', [
      id,
    ]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.status(204).send();
  },
);

export default router;
