// Test setup file for Jest
import { jest } from '@jest/globals';

// Mock the database pool for testing
jest.mock('../src/db/pool', () => ({
  getPool: jest.fn().mockReturnValue({
    getConnection: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    }),
    execute: jest.fn(),
    end: jest.fn()
  })
}));

// Mock the express app for testing
jest.mock('../src/app', () => ({
  createApp: jest.fn().mockReturnValue({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  })
}));