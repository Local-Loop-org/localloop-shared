# ADR-005: Geohash precision 6 as the spatial unit

> **Partially superseded (2026-04-30)**: HOME-6 replaced the proximity-label
> outcome with precise haversine `distanceMeters`. Groups now also store
> `anchor_lat` / `anchor_lng` alongside the geohash. Geohash precision 6 is
> still the spatial unit for the `findNearby` cell lookup; the proximity-label
> generation described below is retired.

## Status
Accepted

## Date
2024-04-06

## Context
LocalLoop must connect users in physical proximity without exposing their exact location. We needed a spatial encoding that:
- Abstracts coordinates into a privacy-safe unit
- Enables efficient proximity queries (groups near me)
- Produces meaningful proximity labels (same place, same neighborhood, nearby)

## Decision
We use **geohash precision 6** (~1.2km × 0.6km per cell) as the base spatial unit for all proximity logic.

- User location is stored as `geohash CHAR(6)` — never as coordinates.
- Group anchors are stored as `anchor_geohash CHAR(6)` — never as coordinates.
- Proximity labels are derived server-side by comparing geohash prefixes:
  - Same cell (prefix 6): `"Mesmo local"`
  - Neighbor cell (8 surrounding cells): `"Mesmo bairro"`
  - Same prefix-4 (~45km²): `"Região próxima"`
  - Same city: `"Na cidade"`
- Location updates are lazy: client sends coordinates only when moved >300m or on app open.

The `packages/geo-utils` package will implement: coordinate → geohash conversion, neighbor cell calculation, proximity label generation.

## Consequences

### Positive
- Coordinates never stored or returned anywhere in the system
- B-tree index on geohash column is sufficient for prefix queries — no PostGIS functions needed in Phase 2
- Cells are ~1.2km², appropriate for neighborhood-scale granularity

### Negative
- Cell boundaries can split a single block across two cells — discovery queries must include all 8 neighbor cells to avoid missing nearby groups
- Precision 6 may be too coarse for `establishment` anchor type (~100m radius); accepted tradeoff for MVP

### Neutral
- geo-utils package must be shared between API and mobile (used for client-side lazy update threshold check)

## Alternatives considered

| Option | Why rejected |
|--------|-------------|
| Precision 7 (~150m × 150m) | Too fine for neighborhood groups; harder to achieve meaningful privacy |
| Precision 5 (~5km × 5km) | Too coarse for establishment-level groups |
| Store lat/lng, use PostGIS ST_DWithin | Coordinates stored → privacy violation per PRD |
