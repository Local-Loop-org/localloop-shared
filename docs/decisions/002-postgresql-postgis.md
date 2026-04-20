# ADR-002: PostgreSQL + PostGIS for geospatial data

## Status
Accepted

## Date
2024-03-18

## Context
LocalLoop's core feature is proximity-based group discovery. We need to:
- Store user locations without exposing exact coordinates (privacy requirement)
- Query "groups near a point" efficiently
- Support future radius queries if geohash prefix matching proves insufficient

Geohash precision 6 (~1.2km²) was chosen as the primary spatial unit. The immediate approach (geohash prefix matching + neighbor cells) works without PostGIS, but we want the option to add polygon or radius queries later without a migration to a different database.

## Decision
We use **PostgreSQL 17 with the PostGIS 3.5 extension**.

For Phase 1–2, spatial queries use geohash prefix comparison and the 8-neighbor-cell algorithm (no PostGIS functions needed). PostGIS is installed now so that future phases can use `ST_DWithin`, spatial indexes, or geo-polygon group anchors without schema changes.

User coordinates (`lat`/`lng`) are **never stored**. Only `geohash CHAR(6)` is stored per user and per group anchor.

## Consequences

### Positive
- Geohash prefix queries are simple string operations, fast with a B-tree index
- PostGIS available for future radius/polygon queries with no migration needed
- PostgreSQL is a battle-tested choice with broad hosting support

### Negative
- PostGIS adds deploy complexity (need the `postgis/postgis` Docker image instead of plain postgres)
- Geohash cells are rectangular, not circular — edge effects at cell boundaries require neighbor-cell inclusion

### Neutral
- Coordinates are converted to geohash in the application layer, never persisted — aligns with privacy requirements

## Alternatives considered

| Option | Why rejected |
|--------|-------------|
| MongoDB + 2dsphere | No strong relational model for members/messages; less familiar |
| Plain PostgreSQL without PostGIS | Forecloses future radius queries; PostGIS is low cost to add now |
| Storing lat/lng directly | Privacy violation — PRD explicitly forbids exposing coordinates |
