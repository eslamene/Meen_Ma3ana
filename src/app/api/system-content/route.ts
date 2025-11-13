import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { systemContent } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request) {
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
    console.error('Error fetching system content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

