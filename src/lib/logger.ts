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
  
  const logger = pino({
    level: logLevel,
    ...(isDevelopment && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        }
      }
    }),
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
  })

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
    
    if (data !== undefined) {
      result.data = redactPII(data)
    }
    
    if (this.correlationId) {
      result.correlationId = this.correlationId
    }
    
    return result
  }

  info(message: string, data?: unknown): void {
    logger.info(this.formatMessage(message, data))
  }

  warn(message: string, data?: unknown): void {
    logger.warn(this.formatMessage(message, data))
  }

  error(message: string, error?: Error | unknown, data?: unknown): void {
    const logData: Record<string, unknown> = { ...this.formatMessage(message, data) }
    
    if (error instanceof Error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } else if (error) {
      logData.error = redactPII(error)
    }
    
    logger.error(logData)
  }

  debug(message: string, data?: unknown): void {
    logger.debug(this.formatMessage(message, data))
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
    this.error(stableMessage, error, data)
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
