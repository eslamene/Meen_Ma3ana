# Archived Test API Routes

This directory contains test endpoints that are protected by the `ENABLE_TEST_ENDPOINTS` environment variable.

## Routes

- **test-rls/** - Row Level Security (RLS) policy testing
- **test-storage/** - Storage access testing
- **test-anonymization/** - Data anonymization testing
- **test-db/** - Database connection testing
- **test-users/** - User testing utilities

## Usage

These endpoints are only available when `ENABLE_TEST_ENDPOINTS=true` is set in the environment. They are intended for development and testing purposes only.

## Security

All test endpoints require admin permissions and are logged via the audit service.

## Notes

These routes are archived but remain functional. They should not be used in production without proper security review.


