# Drizzle Consolidation Runbook

## Objective

Promote a single deterministic baseline migration and idempotent seed flow using production-clone truth.

## Inputs

- `drizzle/consolidated/schema.ts`
- `drizzle/consolidated/migration.sql`
- `drizzle/consolidated/seed.ts`
- Production-clone export files under `scripts/migration-data/*.json`

## Execution Steps

1. Create fresh target database.
2. Apply baseline:
   - `psql "$DATABASE_URL" -f drizzle/consolidated/migration.sql`
3. Seed / import:
   - `tsx drizzle/consolidated/seed.ts`
4. Verify counts and relational integrity:
   - Check FK consistency and tenant coverage.
5. Run application smoke and integration tests.

## Rollback Strategy

- Execute in isolated maintenance window.
- Keep pre-cutover snapshot and logical backup.
- If validation fails, drop target DB and rehydrate from snapshot.
- Never run destructive migration against production primary without blue/green cutover.

## Idempotency Guarantees

- Migration uses `IF NOT EXISTS` where feasible.
- Seed uses `ON CONFLICT DO UPDATE/DO NOTHING`.
- Import order respects FK dependencies: tenants -> users -> memberships -> cases -> contributions.
