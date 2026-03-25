/**
 * Optional DB-backed public nav. Returns empty so callers fall back to config.
 * Replace with a real query when menu rows are stored for the public site.
 */

import type { PublicNavItem } from './public-nav-config'

export async function getPublicNavItemsFromDB(
  _isLandingPage: boolean,
  _locale: string
): Promise<PublicNavItem[]> {
  return []
}
