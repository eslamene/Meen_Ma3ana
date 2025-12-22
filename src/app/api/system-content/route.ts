import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { systemContent } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { withApiHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  try {
    const { searchParams } = new URL(request.url)
    const contentKey = searchParams.get('key')

    if (!contentKey) {
      return NextResponse.json(
        { error: 'Content key is required' },
        { status: 400 }
      )
    }

    const content = await db
      .select()
      .from(systemContent)
      .where(eq(systemContent.contentKey, contentKey))
      .limit(1)

    if (content.length === 0) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      content: content[0],
    })
  } catch (error) {
    logger.error('Error fetching system content:', { error: error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withApiHandler(handler, { loggerContext: 'api/system-content' })

