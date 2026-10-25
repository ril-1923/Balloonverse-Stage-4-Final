import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createMemoryStorage, finiteNumber, isHexColor, KEYS, readStored, removeStored, setStorageBackend, writeStored,
} from './storage';

const asNumber = (v: unknown) => (typeof v === 'number' ? v : null);

describe('safe storage', () => {
  beforeEach(() => setStorageBackend(createMemoryStorage()));
  afterEach(() => setStorageBackend(null));

  it('round-trips values', () => {
    expect(writeStored('k', { a: 1 })).toBe(true);
    expect(readStored('k', (r) => r as { a: number }, () => ({ a: 0 }))).toEqual({ a: 1 });
  });

  it('returns the default when the key is missing', () => {
    expect(readStored('missing', asNumber, () => 42)).toBe(42);
  });

  it('recovers from corrupt JSON', () => {
    const mem = createMemoryStorage();
    mem.setItem('k', '{not json');
    setStorageBackend(mem);
    expect(readStored('k', asNumber, () => 7)).toBe(7);
  });

  it('uses the default when validation rejects the data', () => {
    writeStored('k', 'a string');
    expect(readStored('k', asNumber, () => 9)).toBe(9);
  });

  it('survives a backend that throws', () => {
    const broken = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('denied'); },
    };
    setStorageBackend(broken);
    expect(writeStored('k', 1)).toBe(false);
    expect(readStored('k', asNumber, () => 3)).toBe(3);
    expect(() => removeStored('k')).not.toThrow();
  });

  it('removes keys', () => {
    writeStored('k', 1);
    removeStored('k');
    expect(readStored('k', asNumber, () => -1)).toBe(-1);
  });

  it('uses versioned keys', () => {
    for (const key of Object.values(KEYS)) expect(key).toMatch(/^balloonverse:v1:/);
  });

  it('validates numbers and colours', () => {
    expect(finiteNumber(5, 0, 0, 3)).toBe(3);
    expect(finiteNumber(-5, 0, 0, 3)).toBe(0);
    expect(finiteNumber(NaN, 8)).toBe(8);
    expect(finiteNumber('x', 8)).toBe(8);
    expect(isHexColor('#a1B2c3')).toBe(true);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#fff')).toBe(false);
  });
});
