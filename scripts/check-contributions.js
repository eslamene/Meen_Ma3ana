const { drizzle } = require('drizzle-orm/postgres-js')
const postgres = require('postgres')
const { contributions } = require('../drizzle/schema.ts')
const { eq, desc } = require('drizzle-orm')

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/meen_ma3ana'
const client = postgres(connectionString)
const db = drizzle(client)

async function checkContributions() {
  try {
    console.log('Checking contributions in database...')
    
    // Get total count
    const totalCount = await db.select({ count: contributions.id }).from(contributions)
    console.log(`Total contributions in database: ${totalCount.length}`)
    
    // Get count by user
    const userContributions = await db
      .select({ count: contributions.id })
      .from(contributions)
      .where(eq(contributions.donor_id, 'b75855d4-775e-4024-b831-76123a2051aa'))
    
    console.log(`Contributions for user b75855d4-775e-4024-b831-76123a2051aa: ${userContributions.length}`)
    
    // Get recent contributions
    const recentContributions = await db
      .select({
        id: contributions.id,
        created_at: contributions.created_at,
        amount: contributions.amount,
        status: contributions.status
      })
      .from(contributions)
      .orderBy(desc(contributions.created_at))
      .limit(5)
    
    console.log('\nRecent 5 contributions:')
    recentContributions.forEach((cont, index) => {
      console.log(`${index + 1}. ID: ${cont.id}, Amount: ${cont.amount}, Status: ${cont.status}, Created: ${cont.created_at}`)
    })
    
  } catch (error) {
    console.error('Error checking contributions:', error)
  } finally {
    await client.end()
  }
}

checkContributions() 