/**
 * Category Detection Utility
 * Uses database rules to categorize cases based on their descriptions
 */

import { db } from '@/lib/db'
import { categoryDetectionRules, caseCategories } from '@/drizzle/schema'
import { eq, and, desc } from 'drizzle-orm'

let rulesCache: Array<{ category_id: string; keyword: string; priority: number }> | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get all active category detection rules from database
 * Uses caching to avoid repeated database queries
 */
async function getActiveRules(): Promise<Array<{ category_id: string; keyword: string; priority: number }>> {
  const now = Date.now()
  
  // Return cached rules if still valid
  if (rulesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return rulesCache
  }

  try {
    const rules = await db
      .select({
        category_id: categoryDetectionRules.category_id,
        keyword: categoryDetectionRules.keyword,
        priority: categoryDetectionRules.priority,
      })
      .from(categoryDetectionRules)
      .where(eq(categoryDetectionRules.is_active, true))
      .orderBy(desc(categoryDetectionRules.priority), desc(categoryDetectionRules.created_at))

    // Cache the results
    rulesCache = rules
    cacheTimestamp = now

    return rules
  } catch (error) {
    console.error('Error fetching category detection rules:', error)
    // Return empty array on error to prevent crashes
    return []
  }
}

/**
 * Categorize a case based on its description using database rules
 * @param description - The case description to analyze
 * @returns The category ID (UUID) or null if no match
 */
export async function categorizeCase(description: string): Promise<string | null> {
  if (!description) return null

  const desc = description.toLowerCase()
  const rules = await getActiveRules()

  // Sort rules by priority (highest first) and check them in order
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

  // Check each rule - return the first match (highest priority)
  for (const rule of sortedRules) {
    if (desc.includes(rule.keyword.toLowerCase())) {
      return rule.category_id
    }
  }

  return null
}

/**
 * Synchronous version that uses cached rules
 * Use this when you need synchronous categorization and can accept slightly stale data
 */
export function categorizeCaseSync(description: string): string | null {
  if (!description) return null

  const desc = description.toLowerCase()

  // Use cached rules if available
  if (!rulesCache || rulesCache.length === 0) {
    // If no cache, return null - async version should be used for first call
    return null
  }

  const sortedRules = [...rulesCache].sort((a, b) => b.priority - a.priority)

  for (const rule of sortedRules) {
    if (desc.includes(rule.keyword.toLowerCase())) {
      return rule.category_id
    }
  }

  return null
}

/**
 * Clear the rules cache (useful after creating/updating/deleting rules)
 */
export function clearCategoryRulesCache(): void {
  rulesCache = null
  cacheTimestamp = 0
}

