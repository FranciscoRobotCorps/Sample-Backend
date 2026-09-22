import { describe, it, expect } from '@jest/globals';

describe('Example Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1).toBe(1);
  });
  
  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});