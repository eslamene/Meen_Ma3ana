import { db } from '@/lib/db'
import { users, cases, contributions } from '@/lib/db'
import { eq } from 'drizzle-orm'

import { defaultLogger } from '@/lib/logger'

/**
 * Data anonymization service for protecting sensitive information
 * while preserving data utility for analysis
 */
export class AnonymizationService {
  /**
   * Anonymization levels for different use cases
   */
  static readonly ANONYMIZATION_LEVELS = {
    NONE: 'none',
    PARTIAL: 'partial',    // Mask sensitive parts
    FULL: 'full',          // Completely anonymize
    AGGREGATE: 'aggregate' // Only show aggregated data
  } as const

  /**
   * Anonymize email address
   */
  static anonymizeEmail(email: string, level: string = 'partial'): string {
    if (!email) return ''
    
    const [localPart, domain] = email.split('@')
    
    switch (level) {
      case 'full':
        return `user_${this.hashString(email)}@${domain}`
      case 'partial':
        return `${localPart.charAt(0)}***@${domain}`
      default:
        return email
    }
  }

  /**
   * Anonymize phone number
   */
  static anonymizePhone(phone: string, level: string = 'partial'): string {
    if (!phone) return ''
    
    switch (level) {
      case 'full':
        return `+***-***-${phone.slice(-4)}`
      case 'partial':
        return phone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2')
      default:
        return phone
    }
  }

  /**
   * Anonymize name
   */
  static anonymizeName(name: string, level: string = 'partial'): string {
    if (!name) return ''
    
    switch (level) {
      case 'full':
        return `User_${this.hashString(name)}`
      case 'partial':
        return `${name.charAt(0)}*** ${name.split(' ').pop()?.charAt(0) || ''}***`
      default:
        return name
    }
  }

  /**
   * Anonymize address
   */
  static anonymizeAddress(address: string, level: string = 'partial'): string {
    if (!address) return ''
    
    switch (level) {
      case 'full':
        return 'Address Hidden'
      case 'partial':
        const parts = address.split(' ')
        return `${parts[0]} *** ${parts[parts.length - 1]}`
      default:
        return address
    }
  }

  /**
   * Anonymize financial amount
   */
  static anonymizeAmount(amount: number, level: string = 'partial'): string {
    switch (level) {
      case 'full':
        return 'Amount Hidden'
      case 'partial':
        const range = this.getAmountRange(amount)
        return range
      default:
        return amount.toString()
    }
  }

  /**
   * Get amount range for anonymization
   */
  private static getAmountRange(amount: number): string {
    if (amount < 100) return '< $100'
    if (amount < 500) return '$100 - $500'
    if (amount < 1000) return '$500 - $1000'
    if (amount < 5000) return '$1000 - $5000'
    if (amount < 10000) return '$5000 - $10000'
    return '> $10000'
  }

  /**
   * Hash string for anonymization
   */
  private static hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8)
  }

  /**
   * Create anonymized user view
   */
  static async createAnonymizedUserView(level: string = 'partial') {
    const anonymizedFields = {
      email: level === 'full' ? 'user_***@***.com' : '***@***.com',
      firstName: level === 'full' ? 'User' : '***',
      lastName: level === 'full' ? '***' : '***',
      phone: level === 'full' ? '+***-***-****' : '***-***-****',
      address: level === 'full' ? 'Address Hidden' : '*** ***',
      profileImage: null
    }

    return anonymizedFields
  }

  /**
   * Get anonymized users for public display
   */
  static async getAnonymizedUsers(level: string = 'partial') {
    try {
      const usersData = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.first_name,
        lastName: users.last_name,
        role: users.role,
        createdAt: users.created_at
      }).from(users)

      return usersData.map(user => ({
        id: user.id,
        email: this.anonymizeEmail(user.email, level),
        firstName: this.anonymizeName(user.firstName || '', level),
        lastName: this.anonymizeName(user.lastName || '', level),
        role: user.role,
        createdAt: user.createdAt
      }))
    } catch (error) {
      defaultLogger.error('Error getting anonymized users:', error)
      return []
    }
  }

  /**
   * Get anonymized cases for public display
   */
  static async getAnonymizedCases(level: string = 'partial') {
    try {
      const casesData = await db.select({
        id: cases.id,
        title: cases.title_en,
        description: cases.description_en,
        targetAmount: cases.target_amount,
        currentAmount: cases.current_amount,
        status: cases.status,
        categoryId: cases.category_id,
        createdAt: cases.created_at
      }).from(cases).where(eq(cases.status, 'published'))

      return casesData.map(caseItem => ({
        id: caseItem.id,
        title: caseItem.title,
        description: caseItem.description,
        targetAmount: this.anonymizeAmount(Number(caseItem.targetAmount), level),
        currentAmount: this.anonymizeAmount(Number(caseItem.currentAmount), level),
        status: caseItem.status,
        categoryId: caseItem.categoryId,
        createdAt: caseItem.createdAt
      }))
    } catch (error) {
      defaultLogger.error('Error getting anonymized cases:', error)
      return []
    }
  }

  /**
   * Get anonymized contributions for analytics
   */
  static async getAnonymizedContributions(level: string = 'partial') {
    try {
      const contributionsData = await db.select({
        id: contributions.id,
        amount: contributions.amount,
        status: contributions.status,
        createdAt: contributions.created_at
      }).from(contributions)

      return contributionsData.map(contribution => ({
        id: contribution.id,
        amount: this.anonymizeAmount(Number(contribution.amount), level),
        status: contribution.status,
        createdAt: contribution.createdAt
      }))
    } catch (error) {
      defaultLogger.error('Error getting anonymized contributions:', error)
      return []
    }
  }

  /**
   * Create database view for anonymized data
   */
  static async createAnonymizedViews() {
    try {
      // Create anonymized users view
      await db.execute(`
        CREATE OR REPLACE VIEW anonymized_users AS
        SELECT 
          id,
          CONCAT(LEFT(email, 1), '***@', SPLIT_PART(email, '@', 2)) as email,
          CONCAT(LEFT(first_name, 1), '***') as first_name,
          CONCAT(LEFT(last_name, 1), '***') as last_name,
          role,
          created_at
        FROM users
        WHERE is_active = true
      `)

      // Create anonymized cases view
      await db.execute(`
        CREATE OR REPLACE VIEW anonymized_cases AS
        SELECT 
          id,
          title,
          description,
          CASE 
            WHEN target_amount < 100 THEN '< $100'
            WHEN target_amount < 500 THEN '$100 - $500'
            WHEN target_amount < 1000 THEN '$500 - $1000'
            WHEN target_amount < 5000 THEN '$1000 - $5000'
            WHEN target_amount < 10000 THEN '$5000 - $10000'
            ELSE '> $10000'
          END as target_amount_range,
          status,
          category_id,
          created_at
        FROM cases
        WHERE status = 'published'
      `)

      // Create anonymized contributions view
      await db.execute(`
        CREATE OR REPLACE VIEW anonymized_contributions AS
        SELECT 
          id,
          CASE 
            WHEN amount < 100 THEN '< $100'
            WHEN amount < 500 THEN '$100 - $500'
            WHEN amount < 1000 THEN '$500 - $1000'
            WHEN amount < 5000 THEN '$1000 - $5000'
            WHEN amount < 10000 THEN '$5000 - $10000'
            ELSE '> $10000'
          END as amount_range,
          status,
          created_at
        FROM contributions
      `)

      return true
    } catch (error) {
      defaultLogger.error('Error creating anonymized views:', error)
      return false
    }
  }

  /**
   * Export anonymized data for analysis
   */
  static async exportAnonymizedData(level: string = 'partial') {
    try {
      const data = {
        users: await this.getAnonymizedUsers(level),
        cases: await this.getAnonymizedCases(level),
        contributions: await this.getAnonymizedContributions(level),
        exportDate: new Date().toISOString(),
        anonymizationLevel: level
      }

      return data
    } catch (error) {
      defaultLogger.error('Error exporting anonymized data:', error)
      throw new Error('Failed to export anonymized data')
    }
  }

  /**
   * Get anonymization statistics
   */
  static async getAnonymizationStats() {
    try {
      const stats = {
        totalUsers: 0,
        totalCases: 0,
        totalContributions: 0,
        anonymizedUsers: 0,
        anonymizedCases: 0,
        anonymizedContributions: 0
      }

      // Get counts from anonymized views
      const userCount = await db.execute('SELECT COUNT(*) FROM anonymized_users')
      const caseCount = await db.execute('SELECT COUNT(*) FROM anonymized_cases')
      const contributionCount = await db.execute('SELECT COUNT(*) FROM anonymized_contributions')

      const extractCount = (result: unknown): number => {
        // Handle different possible result structures from drizzle execute
        type QueryResult = 
          | { rows?: Array<{ count?: string | number }> }
          | Array<{ count?: string | number }>
          | { count?: string | number }
          | unknown
        
        const r = result as QueryResult
        const raw = 
          (r && typeof r === 'object' && 'rows' in r && Array.isArray((r as { rows?: Array<{ count?: string | number }> }).rows))
            ? (r as { rows: Array<{ count?: string | number }> }).rows[0]?.count
            : Array.isArray(r) && r.length > 0
              ? r[0]?.count
              : (r && typeof r === 'object' && 'count' in r)
                ? (r as { count?: string | number }).count
                : '0'
        
        const num = parseInt(String(raw ?? '0'))
        return isNaN(num) ? 0 : num
      }

      stats.anonymizedUsers = extractCount(userCount)
      stats.anonymizedCases = extractCount(caseCount)
      stats.anonymizedContributions = extractCount(contributionCount)

      return stats
    } catch (error) {
      defaultLogger.error('Error getting anonymization stats:', error)
      return null
    }
  }
} 