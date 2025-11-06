# Centralized Logging Implementation

## Overview

This document describes the implementation of centralized logging across the Meen Ma3ana charity platform to address security concerns and improve observability.

## Problem Addressed

The original codebase had excessive `console.*` logging throughout API routes and libraries, which posed several risks:

1. **Security Risk**: Potential leakage of sensitive data (PII, user emails, tokens)
2. **Noisy Logs**: Unstructured logging made debugging difficult
3. **No Correlation**: No way to trace requests across services
4. **Inconsistent Error Handling**: No standardized error messages

## Solution Implemented

### 1. Centralized Logger (`src/lib/logger.ts`)

Created a centralized logging system using Pino with the following features:

- **PII Redaction**: Automatically redacts sensitive data (emails, phone numbers, SSNs, tokens, etc.)
- **Environment-based Configuration**: Uses `LOG_LEVEL` environment variable
- **Correlation IDs**: Tracks requests across the system
- **Stable Error Messages**: Predefined error messages for consistent logging
- **Development-friendly**: Pretty printing in development mode

### 2. Correlation ID System (`src/lib/correlation.ts`)

- Generates unique correlation IDs for each request
- Adds correlation IDs to request headers via middleware
- Enables request tracing across services

### 3. Middleware Integration (`middleware.ts`)

- Automatically adds correlation IDs to all requests
- Works with existing internationalization middleware
- Covers both API routes and page routes

### 4. Systematic Console Log Replacement

Created automated scripts to replace `console.*` calls:

- **API Routes**: Replaced with contextual loggers using correlation IDs
- **Library Files**: Replaced with default logger instance
- **Error Handling**: Standardized error logging with stable messages

## Usage Examples

### API Routes

```typescript
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  
  try {
    logger.info('Processing request')
    // ... business logic
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', error)
  }
}
```

### Library Files

```typescript
import { defaultLogger } from '@/lib/logger'

export function processData(data: any) {
  try {
    defaultLogger.info('Processing data', { dataCount: data.length })
    // ... processing
  } catch (error) {
    defaultLogger.error('Failed to process data', error)
  }
}
```

## Configuration

### Environment Variables

- `LOG_LEVEL`: Set logging level (debug, info, warn, error) - defaults to 'info'
- `NODE_ENV`: Automatically enables pretty printing in development

### PII Redaction Patterns

The logger automatically redacts:

- Email addresses
- Phone numbers
- Credit card numbers
- SSNs
- User IDs (UUIDs)
- Common sensitive field names (password, secret, token, etc.)

### Stable Error Messages

Predefined error messages for consistent logging:

- `DATABASE_CONNECTION_FAILED`
- `AUTHENTICATION_FAILED`
- `AUTHORIZATION_DENIED`
- `VALIDATION_ERROR`
- `INTERNAL_SERVER_ERROR`
- `RESOURCE_NOT_FOUND`
- `INVALID_REQUEST`
- `RATE_LIMIT_EXCEEDED`
- `EXTERNAL_SERVICE_ERROR`

## Files Modified

### Core Infrastructure
- `src/lib/logger.ts` - Centralized logger implementation
- `src/lib/correlation.ts` - Correlation ID utilities
- `middleware.ts` - Request correlation ID injection

### API Routes (47 files updated)
- All files in `src/app/api/**/route.ts`
- Added logger imports and correlation ID handling
- Replaced console logs with structured logging

### Library Files (22 files updated)
- All files in `src/lib/**/*.ts`
- Added default logger imports
- Replaced console logs with structured logging

### Scripts
- `scripts/replace-console-logs.js` - Automated API route updates
- `scripts/replace-console-logs-lib.js` - Automated library file updates

## Benefits

1. **Security**: PII is automatically redacted from logs
2. **Observability**: Correlation IDs enable request tracing
3. **Consistency**: Standardized error messages and logging format
4. **Performance**: Pino is highly performant with minimal overhead
5. **Debugging**: Structured logs with correlation IDs make debugging easier
6. **Compliance**: Better data protection compliance through PII redaction

## Migration Notes

- All existing `console.*` calls have been replaced
- No breaking changes to existing functionality
- Logs are now structured JSON in production
- Pretty printing available in development mode
- Correlation IDs automatically added to all requests

## Future Enhancements

1. **Log Aggregation**: Integration with log aggregation services (ELK, Datadog, etc.)
2. **Metrics**: Add performance metrics logging
3. **Audit Logging**: Enhanced audit trail for sensitive operations
4. **Custom Serializers**: Additional data serialization for specific use cases
