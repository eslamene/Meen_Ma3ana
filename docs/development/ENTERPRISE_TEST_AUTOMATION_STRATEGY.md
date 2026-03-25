# Enterprise Test Automation Strategy

## Goals

- Prevent regressions in financial and authorization workflows.
- Enforce multi-tenant isolation through automated test gates.
- Provide fast feedback in PR and deep verification in scheduled pipelines.

## Test Pyramid

- Unit (`tests/unit`): core business rules and pure helpers.
- Integration (`tests/integration`): route handlers + adapters + DB boundaries.
- Contract (`tests/contract`): stable API contracts for provider/consumer confidence.
- E2E (`tests/e2e`): critical business journeys.
- Load (`tests/load`): p95 latency and error-rate baselines.
- Security (`tests/security`): dependency and authz regression checks.

## Required CI Gates

- `npm run lint`
- `npm run typecheck`
- `npm run test`

## Scheduled Gates

- `npm run test:e2e`
- `npm run test:load`
- `npm run test:security`

## Coverage Policy

- Global minimum: 80%
- Critical domains: 90% (`auth`, `permissions`, `contributions`, `approval`)
- New/changed code should not reduce global thresholds.

## Sample Implementations Included

- Unit: `tests/unit/lib/api-errors.test.ts`
- Integration: `tests/integration/api/auth-availability-route.test.ts`
- E2E: `tests/e2e/smoke/homepage.spec.ts`
- Load: `tests/load/contribution-checkout.js`

## Future Enhancements

- Add ephemeral Postgres integration tests with migration bootstrap.
- Add Pact-based provider/consumer contract tests.
- Add Semgrep + DAST baseline workflow.
