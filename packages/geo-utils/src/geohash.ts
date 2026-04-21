import ngeohash from 'ngeohash';
import { DEFAULT_PRECISION } from './constants';

export function coordinatesToGeohash(
  lat: number,
  lng: number,
  precision: number = DEFAULT_PRECISION,
): string {
  return ngeohash.encode(lat, lng, precision);
}

export function getNeighborCells(geohash: string): string[] {
  const n = ngeohash.neighbors(geohash);
  return [n[0], n[1], n[2], n[3], n[4], n[5], n[6], n[7]];
}
