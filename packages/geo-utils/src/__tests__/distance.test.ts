import { distanceMeters } from '../distance';

describe('distanceMeters', () => {
  it('returns 0 for the same point', () => {
    expect(distanceMeters(-23.5505, -46.6333, -23.5505, -46.6333)).toBe(0);
  });

  it('approximates 1° latitude as ~111km (within 1%)', () => {
    const d = distanceMeters(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it('returns ~20,015km for antipodes (within 0.1%)', () => {
    const d = distanceMeters(0, 0, 0, 180);
    expect(d).toBeGreaterThan(20_000_000);
    expect(d).toBeLessThan(20_030_000);
  });

  it('is symmetric', () => {
    const a = distanceMeters(-23.5505, -46.6333, -23.5605, -46.6433);
    const b = distanceMeters(-23.5605, -46.6433, -23.5505, -46.6333);
    expect(a).toBeCloseTo(b, 6);
  });
});
