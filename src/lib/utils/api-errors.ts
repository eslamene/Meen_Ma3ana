import { NextResponse } from 'next/server'
import { Logger } from '@/lib/logger'
import type { ErrorResponse } from '@/types/api'

/**
 * Custom API Error class for standardized error handling
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON(): ErrorResponse {
    return {
      error: this.message,
      errorCode: this.code,
      details: this.details,
    }
  }
}

/**
 * Handle API errors and return appropriate NextResponse
 * 
 * @param error - The error to handle
 * @param logger - Optional logger instance (will create default if not provided)
 * @param correlationId - Optional correlation ID for request tracking
 * @returns NextResponse with error details
 */
export function handleApiError(
  error: unknown,
  logger?: Logger,
  correlationId?: string
): NextResponse {
  const errorLogger = logger || new Logger(correlationId)

  if (error instanceof ApiError) {
    errorLogger.warn('API error', {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
    })
    
    const response: ErrorResponse = error.toJSON()
    if (correlationId) {
      response.correlationId = correlationId
    }
    
    return NextResponse.json(response, { status: error.statusCode })
  }

  // Log unexpected errors with full details
  errorLogger.error('Unexpected error', { error })

  const response: ErrorResponse = {
    error: 'Internal server error',
    errorCode: 'INTERNAL_ERROR',
  }
  
  if (correlationId) {
    response.correlationId = correlationId
  }

  // Only include details in development
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && error instanceof Error) {
    response.details = {
      message: error.message,
      stack: error.stack,
    }
  }

  return NextResponse.json(response, { status: 500 })
}

/**
 * Common API error codes
 */
export const ApiErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

/**
 * Helper functions to create common errors
 */
export const createApiError = {
  unauthorized: (message = 'Authentication required') =>
    new ApiError(ApiErrorCodes.UNAUTHORIZED, message, 401),
  
  forbidden: (message = 'Access denied') =>
    new ApiError(ApiErrorCodes.FORBIDDEN, message, 403),
  
  notFound: (message = 'Resource not found') =>
    new ApiError(ApiErrorCodes.NOT_FOUND, message, 404),
  
  badRequest: (message = 'Invalid request', details?: unknown) =>
    new ApiError(ApiErrorCodes.BAD_REQUEST, message, 400, details),
  
  validationError: (message = 'Validation failed', details?: unknown) =>
    new ApiError(ApiErrorCodes.VALIDATION_ERROR, message, 400, details),
  
  internalError: (message = 'Internal server error') =>
    new ApiError(ApiErrorCodes.INTERNAL_ERROR, message, 500),
  
  rateLimitExceeded: (message = 'Rate limit exceeded') =>
    new ApiError(ApiErrorCodes.RATE_LIMIT_EXCEEDED, message, 429),
  
  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    new ApiError(ApiErrorCodes.SERVICE_UNAVAILABLE, message, 503),
}

