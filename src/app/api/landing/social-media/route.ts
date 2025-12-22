import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { systemConfig } from '@/drizzle/schema'
import { inArray } from 'drizzle-orm'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  try {
    // Fetch social media related config values
    // Expected keys: facebook_url, twitter_url, instagram_url, linkedin_url, youtube_url, email
    const socialMediaKeys = [
      'facebook_url',
      'twitter_url',
      'instagram_url',
      'linkedin_url',
      'youtube_url',
      'email',
    ]

    const configs = await db
      .select()
      .from(systemConfig)
      .where(inArray(systemConfig.configKey, socialMediaKeys))

    // Transform to a structured object
    const socialMedia: Record<string, string> = {}
    
    for (const config of configs) {
      // Extract platform name from key (e.g., 'facebook_url' -> 'facebook')
      const platform = config.configKey.replace('_url', '')
      socialMedia[platform] = config.configValue
    }

    return NextResponse.json({
      socialMedia,
    })
  } catch (error) {
    logger.error('Error fetching social media config:', { error: error })
    // Return empty object if there's an error
    return NextResponse.json(
      {
        socialMedia: {},
      },
      { status: 500 }
    )
  }
}

export const GET = withApiHandler(handler, { loggerContext: 'api/landing/social-media' })

