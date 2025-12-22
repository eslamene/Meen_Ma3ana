# Archived Debug API Routes

This directory contains debug endpoints that are protected by the `ENABLE_DEBUG_ENDPOINTS` environment variable.

## Routes

- **debug/** - Debug utilities (auth, cookies, guard, permission)
- **refresh-role/** - Role refresh utility

## Usage

These endpoints are only available when `ENABLE_DEBUG_ENDPOINTS=true` is set in the environment. They are intended for development and debugging purposes only.

## Security

All debug endpoints require appropriate permissions and should never be enabled in production.

## Notes

These routes are archived but remain functional. They should not be used in production.


