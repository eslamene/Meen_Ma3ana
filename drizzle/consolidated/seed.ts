import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'
function logInfo(payload: unknown) {
  process.stdout.write(`${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n`)
}

function logError(payload: unknown) {
  process.stderr.write(`${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n`)
}


/**
 * Idempotent consolidated seed/data migration.
 *
 * Usage:
 *  DATABASE_URL=... tsx drizzle/consolidated/seed.ts
 *
 * Optional data imports:
 *  scripts/migration-data/users.json
 *  scripts/migration-data/cases.json
 *  scripts/migration-data/contributions.json
 */
async function run() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required')
  }

  const sql = postgres(connectionString, { max: 1 })
  const migrationDataDir = path.resolve(process.cwd(), 'scripts/migration-data')

  try {
    await sql.begin(async (tx) => {
      // 1) Seed baseline tenant
      await tx`
        INSERT INTO tenants (slug, name, is_active)
        VALUES ('default', 'Default Tenant', true)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          is_active = EXCLUDED.is_active
      `

      const [{ id: defaultTenantId }] = await tx<{ id: string }[]>`
        SELECT id FROM tenants WHERE slug = 'default' LIMIT 1
      `

      // 2) Seed baseline role and permission records
      await tx`
        INSERT INTO admin_roles (tenant_id, name, display_name, level, is_system, is_active)
        VALUES (${defaultTenantId}, 'super_admin', 'Super Admin', 100, true, true)
        ON CONFLICT (tenant_id, name) DO NOTHING
      `

      await tx`
        INSERT INTO admin_permissions (tenant_id, name, display_name, resource, action, is_system, is_active)
        VALUES
          (${defaultTenantId}, 'admin.users.read', 'Read Users', 'admin.users', 'read', true, true),
          (${defaultTenantId}, 'admin.users.write', 'Write Users', 'admin.users', 'write', true, true),
          (${defaultTenantId}, 'admin.roles.manage', 'Manage Roles', 'admin.roles', 'manage', true, true)
        ON CONFLICT (tenant_id, name) DO NOTHING
      `

      // 3) Optional data import from production-clone exports (JSON files)
      await importUsers(tx, migrationDataDir, defaultTenantId)
      await importCases(tx, migrationDataDir, defaultTenantId)
      await importContributions(tx, migrationDataDir, defaultTenantId)
    })

    // Verification checks
    const [tenantCount] = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM tenants`
    const [userCount] = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM users`
    const [caseCount] = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM cases`
    const [contributionCount] = await sql<{ count: string }[]>`SELECT COUNT(*)::text AS count FROM contributions`

    logInfo('Seed completed successfully')
    logInfo({
      tenants: tenantCount?.count ?? '0',
      users: userCount?.count ?? '0',
      cases: caseCount?.count ?? '0',
      contributions: contributionCount?.count ?? '0',
    })
  } finally {
    await sql.end()
  }
}

async function importUsers(tx: postgres.TransactionSql, dir: string, tenantId: string) {
  const file = path.join(dir, 'users.json')
  if (!fs.existsSync(file)) return
  const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<{
    id: string
    email: string
    first_name?: string
    last_name?: string
    role?: string
  }>
  for (const row of rows) {
    await tx`
      INSERT INTO users (id, email, first_name, last_name, role)
      VALUES (${row.id}, ${row.email}, ${row.first_name ?? null}, ${row.last_name ?? null}, ${row.role ?? 'donor'})
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        role = EXCLUDED.role
    `

    await tx`
      INSERT INTO tenant_members (tenant_id, user_id, role, is_active)
      VALUES (${tenantId}, ${row.id}, ${row.role ?? 'member'}, true)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active
    `
  }
}

async function importCases(tx: postgres.TransactionSql, dir: string, tenantId: string) {
  const file = path.join(dir, 'cases.json')
  if (!fs.existsSync(file)) return
  const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<{
    id: string
    title_en: string
    description_ar: string
    target_amount: string
    created_by: string
    status?: string
    priority?: string
  }>
  for (const row of rows) {
    await tx`
      INSERT INTO cases (
        id, tenant_id, title_en, description_ar, target_amount, current_amount, created_by, status, priority
      )
      VALUES (
        ${row.id}, ${tenantId}, ${row.title_en}, ${row.description_ar}, ${row.target_amount}, 0,
        ${row.created_by}, ${row.status ?? 'draft'}, ${row.priority ?? 'medium'}
      )
      ON CONFLICT (id) DO UPDATE SET
        title_en = EXCLUDED.title_en,
        description_ar = EXCLUDED.description_ar,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority
    `
  }
}

async function importContributions(tx: postgres.TransactionSql, dir: string, tenantId: string) {
  const file = path.join(dir, 'contributions.json')
  if (!fs.existsSync(file)) return
  const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<{
    id: string
    donor_id: string
    case_id?: string
    amount: string
    type?: string
    status?: string
  }>
  for (const row of rows) {
    await tx`
      INSERT INTO contributions (id, tenant_id, donor_id, case_id, amount, type, status)
      VALUES (
        ${row.id}, ${tenantId}, ${row.donor_id}, ${row.case_id ?? null}, ${row.amount},
        ${row.type ?? 'donation'}, ${row.status ?? 'pending'}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        amount = EXCLUDED.amount
    `
  }
}

run().catch((error) => {
  logError(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
