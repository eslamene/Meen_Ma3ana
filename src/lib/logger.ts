import pino from 'pino'

// PII redaction patterns
const PII_PATTERNS = [
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers (various formats)
  /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
  // Credit card numbers
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  // SSN
  /\b\d{3}-?\d{2}-?\d{4}\b/g,
  // User IDs (UUIDs)
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  // Common sensitive fields
  /password|secret|token|key|auth/i,
]

// Sensitive field names to redact
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'key',
  'auth',
  'email',
  'phone',
  'ssn',
  'credit_card',
  'user_id',
  'id',
  'userId',
  'emailAddress',
  'phoneNumber',
  'fullName',
  'firstName',
  'lastName',
]

/**
 * Redacts PII from log data
 */
function redactPII(data: unknown): unknown {
  if (typeof data === 'string') {
    let redacted = data
    PII_PATTERNS.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]')
    })
    return redacted
  }

  if (Array.isArray(data)) {
    return data.map(redactPII)
  }

  if (data && typeof data === 'object') {
    const redacted: { [key: string]: unknown } = {}
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase()
      const isSensitiveField = SENSITIVE_FIELDS.some(field => 
        lowerKey.includes(field) || field.includes(lowerKey)
      )
      
      if (isSensitiveField) {
        redacted[key] = '[REDACTED]'
      } else {
        redacted[key] = redactPII(value)
      }
    }
    return redacted
  }

  return data
}

/**
 * Generate correlation ID for request tracking
 */
function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

/**
 * Create logger instance with environment-based configuration
 */
function createLogger() {
  const logLevel = process.env.LOG_LEVEL || 'info'
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // In Next.js, pino-pretty worker threads can cause issues
  // Use a simpler configuration that's more reliable
  const loggerConfig: pino.LoggerOptions = {
    level: logLevel,
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: redactPII(req.headers),
        correlationId: req.correlationId || generateCorrelationId(),
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: redactPII(res.headers),
      }),
      err: (err) => ({
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
        code: err.code,
      }),
    },
  }

  // Disable pino-pretty by default in Next.js to avoid worker thread issues
  // Next.js can have issues with worker threads used by pino-pretty
  // Use basic JSON logging instead, which is more reliable
  // Set ENABLE_PINO_PRETTY=true to enable pretty logging (may cause worker errors)
  const usePretty = isDevelopment && 
                    typeof process !== 'undefined' && 
                    process.env.NEXT_RUNTIME !== 'edge' &&
                    process.env.ENABLE_PINO_PRETTY === 'true'
  
  if (usePretty) {
    try {
      loggerConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
        }
      }
    } catch (error) {
      // If pino-pretty fails, fall back to basic logger
      // Use console.warn here since logger isn't available yet
      if (typeof console !== 'undefined') {
        console.warn('Failed to initialize pino-pretty, using basic logger:', error)
      }
    }
  }

  const logger = pino(loggerConfig)
  return logger
}

// Create singleton logger instance
const logger = createLogger()

/**
 * Enhanced logger with PII redaction and correlation IDs
 */
export class Logger {
  private correlationId?: string

  constructor(correlationId?: string) {
    this.correlationId = correlationId
  }

  private formatMessage(message: string, data?: unknown): { message: string; data?: unknown; correlationId?: string } {
    const result: { message: string; data?: unknown; correlationId?: string } = { message }
    
    if (data !== undefined && data !== null) {
      const redacted = redactPII(data)
      // Only add data if redactPII returned something meaningful
      if (redacted !== null && redacted !== undefined) {
        result.data = redacted
      }
    }
    
    if (this.correlationId) {
      result.correlationId = this.correlationId
    }
    
    return result
  }

  info(message: string, data?: unknown): void {
    try {
      logger.info(this.formatMessage(message, data))
    } catch (error) {
      // Fallback to console if logger worker fails
      console.info('[Logger]', message, data || '')
    }
  }

  warn(message: string, data?: unknown): void {
    try {
      logger.warn(this.formatMessage(message, data))
    } catch (error) {
      // Fallback to console if logger worker fails
      if (typeof console !== 'undefined') {
        console.warn('[Logger]', message, data || '')
      }
    }
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    try {
      const logData: Record<string, unknown> = { ...this.formatMessage(message, data) }
      
      // Ensure logData always has at least a message
      if (!logData.message) {
        logData.message = message
      }
      
      if (error instanceof Error) {
        const errorData: Record<string, unknown> = {}
        // Only extract non-empty properties
        if (error.name && String(error.name).trim().length > 0) {
          errorData.name = error.name
        }
        if (error.message && String(error.message).trim().length > 0) {
          errorData.message = error.message
        }
        if (error.stack && String(error.stack).trim().length > 0) {
          errorData.stack = error.stack
        }
        // Only add error object if it has at least one property with actual content
        if (Object.keys(errorData).length > 0) {
          logData.error = errorData
        } else {
          // Error instance has no meaningful properties - add a generic error message instead
          logData.error = {
            message: message || 'An error occurred but no error details were available',
            note: 'Error object had no extractable properties'
          }
        }
      } else if (error) {
        // Handle error-like objects (e.g., Supabase errors)
        // Extract essential error information before redaction
        const errorObj = error as Record<string, unknown>
        const essentialFields: Record<string, unknown> = {}
        
        // Preserve essential error fields that are safe to log
        if (typeof errorObj.message === 'string') {
          essentialFields.message = errorObj.message
        }
        if (typeof errorObj.code === 'string') {
          essentialFields.code = errorObj.code
        }
        if (typeof errorObj.name === 'string') {
          essentialFields.name = errorObj.name
        }
        if (typeof errorObj.details === 'string') {
          essentialFields.details = errorObj.details
        }
        if (typeof errorObj.hint === 'string') {
          essentialFields.hint = errorObj.hint
        }
        
        // Redact the rest of the error object
        const redactedError = redactPII(error)
        
        // Merge essential fields with redacted error, prioritizing essential fields
        // Only create error object if we have essential fields or redactedError has meaningful data
        const hasRedactedData = redactedError !== null && 
                               redactedError !== undefined && 
                               typeof redactedError === 'object' &&
                               Object.keys(redactedError as Record<string, unknown>).length > 0
        
        if (Object.keys(essentialFields).length > 0 || hasRedactedData) {
          logData.error = {
            ...essentialFields,
            ...(hasRedactedData ? (redactedError as Record<string, unknown>) : {}),
          }
        }
      }
      
      // Remove empty error object if it exists
      if (logData.error && Object.keys(logData.error as Record<string, unknown>).length === 0) {
        delete logData.error
      }
      
      // Ensure we always have at least a message
      if (!logData.message || logData.message === '') {
        logData.message = message || 'Unknown error'
      }
      
      // Ensure logData is not empty before logging
      if (Object.keys(logData).length === 0) {
        logData.message = message || 'Unknown error'
      }
      
      // Final safety check: never log an empty object or object with only empty error
      const hasValidMessage = logData.message && String(logData.message).trim().length > 0
      const hasValidError = logData.error && 
                            typeof logData.error === 'object' && 
                            Object.keys(logData.error as Record<string, unknown>).length > 0
      const hasOtherData = Object.keys(logData).some(key => 
        key !== 'error' && 
        key !== 'message' && 
        logData[key] !== undefined && 
        logData[key] !== null
      )
      
      // Additional check: ensure error object is not empty
      if (logData.error && typeof logData.error === 'object') {
        const errorKeys = Object.keys(logData.error as Record<string, unknown>)
        if (errorKeys.length === 0) {
          delete logData.error
        }
      }
      
      if (!hasValidMessage && !hasValidError && !hasOtherData) {
        // This should never happen, but if it does, log a safe fallback
        logger.error({ 
          message: message || 'Unknown error occurred', 
          note: 'Empty logData prevented',
          timestamp: new Date().toISOString()
        })
        return
      }
      
      // Final check: ensure we never pass an empty object to console.error
      const finalKeys = Object.keys(logData)
      if (finalKeys.length === 0 || (finalKeys.length === 1 && !logData.message)) {
        // Last resort: create a safe log entry
        logData.message = message || 'An error occurred (empty log data prevented)'
        logData.timestamp = new Date().toISOString()
      }
      
      // Ensure message exists even if error doesn't
      if (!hasValidMessage) {
        logData.message = message || 'An error occurred'
      }
      
      logger.error(logData)
    } catch (loggerError) {
      // Fallback to console if logger worker fails
      if (typeof console !== 'undefined') {
        console.error('[Logger]', message, data || '')
        if (loggerError instanceof Error) {
          console.error('[Logger Error]', loggerError.message)
        }
      }
    }
  }

  debug(message: string, data?: unknown): void {
    try {
      logger.debug(this.formatMessage(message, data))
    } catch (error) {
      // Fallback to console if logger worker fails
      console.debug('[Logger]', message, data || '')
    }
  }

  // Stable error messages for common scenarios
  static readonly ERROR_MESSAGES = {
    DATABASE_CONNECTION_FAILED: 'Database connection failed',
    AUTHENTICATION_FAILED: 'Authentication failed',
    AUTHORIZATION_DENIED: 'Authorization denied',
    VALIDATION_ERROR: 'Validation error',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    RESOURCE_NOT_FOUND: 'Resource not found',
    INVALID_REQUEST: 'Invalid request',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    EXTERNAL_SERVICE_ERROR: 'External service error',
  } as const

  // Log stable error with correlation ID
  logStableError(errorType: keyof typeof Logger.ERROR_MESSAGES, error?: Error | unknown, data?: unknown): void {
    const stableMessage = Logger.ERROR_MESSAGES[errorType]
    
    // Convert error to proper Error instance if needed
    let errorToLog: Error | undefined = undefined
    if (error instanceof Error) {
      errorToLog = error
    } else if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>
      const message = errorObj.message as string | undefined
      const code = errorObj.code as string | undefined
      
      if (message && message.trim()) {
        errorToLog = new Error(message)
      } else if (code) {
        errorToLog = new Error(`Error code: ${code}`)
      } else if (Object.keys(errorObj).length > 0) {
        // Has properties but no message/code - create error with stringified object
        errorToLog = new Error(`Error: ${JSON.stringify(errorObj)}`)
      }
      // If errorObj is empty, errorToLog remains undefined
    }
    
    // Only call error if we have a valid error to log
    if (errorToLog) {
      this.error(stableMessage, errorToLog, data)
    } else {
      // No valid error - just log the stable message with data
      this.error(stableMessage, undefined, data)
    }
  }
}

// Export default logger instance
export const defaultLogger = new Logger()

// Export logger factory for creating loggers with correlation IDs
export function createLoggerWithCorrelation(correlationId: string): Logger {
  return new Logger(correlationId)
}

// Export the base pino logger for advanced usage
export { logger }

// Export utility functions
export { redactPII, generateCorrelationId }
