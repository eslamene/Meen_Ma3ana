# AI_RULES.md

Strict architectural rules for all generated and human-written code. These rules are non-negotiable.

## 1) Layering and Module Boundaries

1. Controllers MUST only orchestrate request parsing, validation, response mapping.
2. Business logic MUST live in application/domain services.
3. Repositories MUST be the only layer allowed to perform database access.
4. UI components MUST NOT embed data-fetching business rules; use hooks/services.
5. Cross-module imports MUST go through public module interfaces; deep private imports are forbidden.

## 2) Data Access and Transactions

1. Direct table access outside repositories is forbidden.
2. New persistence logic MUST use Drizzle repositories, not ad hoc Supabase `.from(...)` calls.
3. Every mutation use case MUST define transactional boundaries explicitly.
4. Any multi-step financial write MUST be atomic or compensated through a saga/outbox workflow.
5. Raw SQL is allowed only inside repository/infrastructure with query comments and test coverage.

## 3) API Contract Rules

1. Every API route MUST validate request input with Zod before invoking services.
2. Every API route MUST return the standardized error envelope from shared API error utilities.
3. Public APIs MUST be versioned (e.g. `/api/v1/...`).
4. Contract types MUST be shared and generated from a single source definition.
5. Breaking contract changes MUST include migration/deprecation notes and compatibility tests.

## 4) Tenant Isolation Rules

1. Tenant-scoped tables MUST contain `tenant_id`.
2. Request context MUST carry tenant identity for all tenant-scoped operations.
3. Every repository query on tenant-scoped entities MUST filter by `tenant_id`.
4. RLS policies MUST enforce tenant boundaries in the database layer.
5. Super-admin bypasses MUST be explicit, audited, and feature-flag guarded.

## 5) AuthN/AuthZ Rules

1. AuthN check is mandatory for all non-public routes.
2. AuthZ MUST be evaluated at service boundary, not only at route boundary.
3. Permission checks MUST use a single policy engine abstraction.
4. Role checks hard-coded in route handlers are forbidden.
5. Any privileged action MUST produce an audit log entry with actor, action, target, tenant, and timestamp.

## 6) Async and Eventing Rules

1. All async side effects (notifications, analytics, emails) MUST be event-driven.
2. Event publishing MUST use outbox pattern for reliability.
3. Consumers MUST be idempotent using deterministic dedupe keys.
4. Retries MUST use exponential backoff and bounded retry count.
5. Dead-letter handling is mandatory for poison messages.

## 7) Security Rules

1. All external input MUST be validated and sanitized.
2. Secrets MUST NOT be hard-coded or stored in source control.
3. Service-role credentials MUST be limited to infrastructure boundaries.
4. File upload endpoints MUST enforce MIME/size/extension checks and malware scanning pipeline integration.
5. Security-relevant logs MUST be tamper-evident and retained by policy.

## 8) Reliability and Observability Rules

1. Every request MUST have correlation ID propagation.
2. Critical flows MUST emit trace spans and structured logs.
3. SLO-backed modules MUST expose RED metrics (Rate, Errors, Duration).
4. External dependency calls MUST use timeout + circuit breaker + retry policy.
5. Health checks MUST cover readiness and liveness separately.

## 9) Frontend Rules

1. UI state and server state MUST be separated.
2. Server state caching MUST use a single query abstraction and invalidation strategy.
3. Components MUST be pure/presentational when possible; side effects in hooks/services only.
4. Forms MUST use schema validation shared with API where feasible.
5. Authorization-driven UI visibility MUST not be treated as a security control by itself.

## 10) Testing and Delivery Rules

1. No feature is complete without unit + integration tests.
2. Financial and authorization paths require negative tests and idempotency tests.
3. CI MUST block merge on lint, typecheck, tests, and coverage thresholds.
4. Migrations MUST be backward-compatible for zero-downtime deployment.
5. Any change in policy/auth/data contracts MUST include regression tests.

## 11) Forbidden Patterns

- Business logic in route handlers.
- Supabase direct table writes in UI/client code.
- Unversioned API contract changes.
- Tenant query without tenant predicate.
- Silent catch-and-ignore for persistence errors.
- Non-idempotent retryable handlers.

## 12) Enforcement

1. PR review checklist MUST include this document.
2. Lint rules and static checks SHOULD codify these constraints incrementally.
3. Any exception MUST be documented in an ADR with expiration date.
