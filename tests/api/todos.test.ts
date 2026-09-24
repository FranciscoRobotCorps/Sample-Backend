import request from 'supertest';
import { createApp } from '../../src/app';
import { getPool } from '../../src/db/pool';
import bcrypt from 'bcrypt';

const api = request(createApp());

describe('POST /api/todos - Create Todo', () => {
  beforeAll(async () => {
    const connection = await getPool().getConnection();
    try {
      // Create tables if they don't exist
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
      
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(60) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      // Insert a test user for authentication
      const passwordHash = await bcrypt.hash('password123', 10);
      await connection.query(
        'INSERT IGNORE INTO users (email, password_hash) VALUES (?, ?)',
        ['test@test.com', passwordHash]
      );
    } finally {
      connection.release();
    }
  });

  // Clean up between each test for isolation
  afterEach(async () => {
    await getPool().execute('DELETE FROM todos');
  });

  it('should create a new todo with valid data', async () => {
    // First, login to get a proper token
    const loginResponse = await api.post('/api/auth/login').send({
      email: 'test@test.com',
      password: 'password123'
    });
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('access_token');
    
    // Use the access token to create a todo
    const response = await api
      .post('/api/todos')
      .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
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
    // First, login to get a proper token
    const loginResponse = await api.post('/api/auth/login').send({
      email: 'test@test.com',
      password: 'password123'
    });
    
    expect(loginResponse.status).toBe(200);
    
    const response = await api.post('/api/todos')
      .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
      .send({ title: 'Minimal Todo' });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Minimal Todo');
  });
});