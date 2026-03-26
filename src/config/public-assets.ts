/**
 * URLs for files under /public (served from site root).
 * Update here when reorganizing public/.
 */
export const publicAssets = {
  brand: {
    logo: '/assets/brand/logo.png',
    icon: '/assets/brand/icon.png',
    appleTouchIcon: '/assets/brand/apple-icon.png',
    openGraphImage: '/assets/brand/opengraph-image.png',
  },
  marketing: {
    bannerSvg: (filename: string) =>
      `/assets/marketing/banner/svg/${filename}` as const,
    childPovertyGeneral: '/assets/images/marketing/child-poverty-general.jpeg',
    /** Available for future sections */
    givingHands: '/assets/images/marketing/giving-hands.png',
    handsSupportingHeart: '/assets/images/marketing/hands-supporting-heart.png',
  },
} as const
