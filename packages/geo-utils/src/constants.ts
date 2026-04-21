export const DEFAULT_PRECISION = 6;

export const ProximityLabel = {
  SAME_PLACE: 'Mesmo local',
  SAME_NEIGHBORHOOD: 'Mesmo bairro',
  NEARBY_REGION: 'Região próxima',
  IN_CITY: 'Na cidade',
} as const;

export type ProximityLabelValue =
  (typeof ProximityLabel)[keyof typeof ProximityLabel];
