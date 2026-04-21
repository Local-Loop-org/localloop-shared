import { getProximityLabel } from '../proximity';
import { getNeighborCells } from '../geohash';
import { ProximityLabel } from '../constants';

describe('getProximityLabel', () => {
  it('returns "Mesmo local" for identical geohashes', () => {
    expect(getProximityLabel('6gyf4b', '6gyf4b')).toBe(
      ProximityLabel.SAME_PLACE,
    );
  });

  it('returns "Mesmo bairro" for a neighbor cell', () => {
    const center = '6gyf4b';
    const neighbor = getNeighborCells(center)[0];
    expect(getProximityLabel(center, neighbor)).toBe(
      ProximityLabel.SAME_NEIGHBORHOOD,
    );
  });

  it('returns "Mesmo bairro" for same prefix-5 (not necessarily a neighbor)', () => {
    // Same first 5 chars, different 6th char
    const user = '6gyf4b';
    const target = '6gyf4c';
    // Only assert if they share prefix-5
    expect(user.substring(0, 5)).toBe(target.substring(0, 5));
    expect(getProximityLabel(user, target)).toBe(
      ProximityLabel.SAME_NEIGHBORHOOD,
    );
  });

  it('returns "Região próxima" for same prefix-4 only', () => {
    // Same first 4 chars, different 5th char → not same neighborhood
    // We need hashes that share prefix-4 but NOT prefix-5 and are not neighbors
    const user = '6gyf4b';
    const target = '6gyfzz';
    expect(user.substring(0, 4)).toBe(target.substring(0, 4));
    expect(user.substring(0, 5)).not.toBe(target.substring(0, 5));

    const neighbors = getNeighborCells(user);
    if (!neighbors.includes(target)) {
      expect(getProximityLabel(user, target)).toBe(
        ProximityLabel.NEARBY_REGION,
      );
    }
  });

  it('returns "Na cidade" for completely different geohashes', () => {
    expect(getProximityLabel('6gyf4b', 'u33dc0')).toBe(ProximityLabel.IN_CITY);
  });
});
