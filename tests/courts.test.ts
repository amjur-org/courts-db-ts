import { describe, test, expect } from 'vitest';
import { 
  findCourt, 
  findCourtById, 
  courts, 
  courtDict 
} from '../src/index.js';

describe('Courts DB TypeScript', () => {
  test('should load courts data', () => {
    const allCourts = courts();
    expect(allCourts).toBeDefined();
    expect(Array.isArray(allCourts)).toBe(true);
    expect(allCourts.length).toBeGreaterThan(0);
  });

  test('should create court dictionary', () => {
    const dict = courtDict();
    expect(dict).toBeDefined();
    expect(typeof dict).toBe('object');
    expect(Object.keys(dict).length).toBeGreaterThan(0);
  });

  test('should find court by ID', () => {
    const results = findCourtById('scotus');
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0].id).toBe('scotus');
    }
  });

  test('should find courts by name', async () => {
    const results = await findCourt('Supreme Court of the United States');
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should handle unicode in court names', async () => {
    const results = await findCourt('Tribunal Dé Apelaciones De Puerto Rico');
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    // Should find the Puerto Rico appeals court
    expect(results).toContain('prapp');
  });

  test('should filter by location', async () => {
    const results = await findCourt('Calhoun County Circuit Court', { location: 'Florida' });
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results).toContain('flacirct14cal');
    expect(results).not.toContain('micirct37cal');
  });
});
