import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { systemConfig } from '@/drizzle/schema'
import { inArray } from 'drizzle-orm'

export async function GET() {
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
    console.error('Error fetching social media config:', error)
    // Return empty object if there's an error
    return NextResponse.json(
      {
        socialMedia: {},
      },
      { status: 500 }
    )
  }
}

