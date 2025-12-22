/**
 * API Request/Response Type Definitions
 * 
 * Standard types for API routes to ensure consistency
 */

/**
 * Standard API response structure
 */
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  errorCode?: string
  details?: unknown
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  error: string
  errorCode: string
  details?: unknown
  correlationId?: string
}

/**
 * Success response
 */
export interface SuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}


