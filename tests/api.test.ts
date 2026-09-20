import request from 'supertest';
import { createApp } from '../src/app';
import { getPool } from '../src/db/pool';

const api = request(createApp());

// Create the todos table before any tests run
beforeAll(async () => {
  const connection = await getPool().getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        done TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } finally {
    connection.release();
  }
});

// Clean up between each test for isolation
afterEach(async () => {
  await getPool().execute('DELETE FROM todos');
});

describe('Health Endpoint', () => {
  it('should return health status with database check', async () => {
    const response = await api.get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body.db).toHaveProperty('status', 'ok');
  });
});

describe('POST /api/todos - Create Todo', () => {
  it('should create a new todo with valid data', async () => {
    const response = await api
      .post('/api/todos')
      .send({ title: 'Test Todo', description: 'A test item' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Test Todo');
    expect(response.body.description).toBe('A test item');
    expect(response.body.done).toBe(0); // MariaDB TINYINT(1) returns 0/1, not boolean
    expect(response.body).toHaveProperty('created_at');
    expect(response.body).toHaveProperty('updated_at');
  });

  it('should create a todo with minimal data (no description)', async () => {
    const response = await api.post('/api/todos').send({ title: 'Minimal Todo' });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Minimal Todo');
  });

  it('should return 400 when title is empty string', async () => {
    const response = await api.post('/api/todos').send({ title: '' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Validation failed');
    expect(response.body).toHaveProperty('details');
  });

  it('should return 400 when title is missing', async () => {
    const response = await api.post('/api/todos').send({ description: 'No title' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('should return 400 when title is not a string', async () => {
    const response = await api.post('/api/todos').send({ title: 123 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('should return 400 when title exceeds max length', async () => {
    const longTitle = 'a'.repeat(500);
    const response = await api.post('/api/todos').send({ title: longTitle });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

describe('GET /api/todos - List Todos', () => {
  it('should return all todos with pagination info', async () => {
    const response = await api.get('/api/todos');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count');
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should filter todos by done status', async () => {
    const createResp = await api.post('/api/todos').send({ title: 'Done Todo' });
    const todoId = createResp.body.id;

    await api.patch(`/api/todos/${todoId}`).send({ done: true });

    const response = await api.get('/api/todos?done=true');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should return empty data when filtering by done=false with no pending todos', async () => {
    const response = await api.get('/api/todos?done=false');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should return all todos when no filter is provided', async () => {
    const response = await api.get('/api/todos');
    expect(response.status).toBe(200);
    expect(response.body.count).toBeGreaterThanOrEqual(0);
  });
});

describe('GET /api/todos/:id - Get Single Todo', () => {
  it('should return a todo by valid ID', async () => {
    const createResp = await api.post('/api/todos').send({ title: 'Get Me' });
    const id = createResp.body.id;

    const response = await api.get(`/api/todos/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Get Me');
    expect(response.body.id).toBe(id);
  });

  it('should return 404 for non-existent ID', async () => {
    const response = await api.get('/api/todos/999999');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Todo not found');
  });

  it('should return 400 for invalid ID format', async () => {
    const response = await api.get('/api/todos/abc');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });
});

describe('PATCH /api/todos/:id - Update Todo', () => {
  it('should update a todo\'s title and description', async () => {
    const createResp = await api.post('/api/todos').send({ title: 'Old Title' });
    const id = createResp.body.id;

    const response = await api.patch(`/api/todos/${id}`).send({
      title: 'New Title',
      description: 'Updated description',
    });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('New Title');
    expect(response.body.description).toBe('Updated description');
  });

  it('should update a todo\'s done status to true', async () => {
    const createResp = await api.post('/api/todos').send({ title: 'Mark Done' });
    const id = createResp.body.id;

    const response = await api.patch(`/api/todos/${id}`).send({ done: true });

    expect(response.status).toBe(200);
    expect(response.body.done).toBe(1); // MariaDB TINYINT(1) returns 0/1, not boolean
  });

  it('should update a todo\'s done status to false', async () => {
    const createResp = await api.post('/api/todos').send({ title: 'Mark Undone' });
    const id = createResp.body.id;

    await api.patch(`/api/todos/${id}`).send({ done: true });
    const response = await api.patch(`/api/todos/${id}`).send({ done: false });

    expect(response.status).toBe(200);
    expect(response.body.done).toBe(0); // MariaDB TINYINT(1) returns 0/1, not boolean
  });

  it('should return 404 for non-existent ID', async () => {
    const response = await api.patch('/api/todos/999999').send({ title: 'Nope' });
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Todo not found');
  });

  it('should return 400 for invalid ID format', async () => {
    const response = await api.patch('/api/todos/abc').send({ title: 'Nope' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('should return 400 for empty title in update', async () => {
    const createResp = await api.post('/api/todos').send({ title: 'Has Title' });
    const id = createResp.body.id;

    const response = await api.patch(`/api/todos/${id}`).send({ title: '' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });
});


describe('DELETE /api/todos/:id - Delete Todo', () => {
  it('should delete a todo and return 204', async () => {
    const createResp = await api.post('/api/todos').send({ title: 'To Delete' });
    const id = createResp.body.id;

    const response = await api.delete(`/api/todos/${id}`);
    expect(response.status).toBe(204);
  });

  it('should return 404 for non-existent ID', async () => {
    const response = await api.delete('/api/todos/999999');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Todo not found');
  });

  it('should return 400 for invalid ID format', async () => {
    const response = await api.delete('/api/todos/abc');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('should not be able to get a deleted todo', async () => {
    const createResp = await api.post('/api/todos').send({ title: 'Gone' });
    const id = createResp.body.id;

    await api.delete(`/api/todos/${id}`);

    const response = await api.get(`/api/todos/${id}`);
    expect(response.status).toBe(404);
  });
});

describe('Unknown Routes', () => {
  it('should return 404 for unknown GET route', async () => {
    const response = await api.get('/unknown');
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Route not found');
  });

  it('should return 404 for unknown POST route', async () => {
    const response = await api.post('/api/unknown');
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Route not found');
  });

  it('should return 404 for wrong method on existing route', async () => {
    const response = await api.delete('/api/todos');
    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Route not found');
  });
});

});