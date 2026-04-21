import { ProximityLabel, type ProximityLabelValue } from './constants';
import { getNeighborCells } from './geohash';

export function getProximityLabel(
  userGeohash: string,
  targetGeohash: string,
): ProximityLabelValue {
  if (userGeohash === targetGeohash) {
    return ProximityLabel.SAME_PLACE;
  }

  const samePrefix5 =
    userGeohash.substring(0, 5) === targetGeohash.substring(0, 5);
  const isNeighbor = getNeighborCells(userGeohash).includes(targetGeohash);

  if (samePrefix5 || isNeighbor) {
    return ProximityLabel.SAME_NEIGHBORHOOD;
  }

  if (userGeohash.substring(0, 4) === targetGeohash.substring(0, 4)) {
    return ProximityLabel.NEARBY_REGION;
  }

  return ProximityLabel.IN_CITY;
}
