import { coordinatesToGeohash, getNeighborCells } from '../geohash';

describe('coordinatesToGeohash', () => {
  it('converts São Paulo coordinates to a 6-char geohash', () => {
    const hash = coordinatesToGeohash(-23.5505, -46.6333);
    expect(hash).toHaveLength(6);
    expect(hash).toBe('6gyf4b');
  });

  it('respects custom precision', () => {
    const hash = coordinatesToGeohash(-23.5505, -46.6333, 4);
    expect(hash).toHaveLength(4);
  });

  it('defaults to precision 6', () => {
    const hash = coordinatesToGeohash(0, 0);
    expect(hash).toHaveLength(6);
  });
});

describe('getNeighborCells', () => {
  it('returns exactly 8 neighbors', () => {
    const neighbors = getNeighborCells('6gyf4b');
    expect(neighbors).toHaveLength(8);
  });

  it('returns geohashes of the same length', () => {
    const hash = '6gyf4b';
    const neighbors = getNeighborCells(hash);
    for (const n of neighbors) {
      expect(n).toHaveLength(hash.length);
    }
  });

  it('does not include the original cell', () => {
    const hash = '6gyf4b';
    const neighbors = getNeighborCells(hash);
    expect(neighbors).not.toContain(hash);
  });
});
