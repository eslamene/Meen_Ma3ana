import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { landingStats } from '@/drizzle/schema'

export async function GET() {
  try {
    // Fetch all landing stats
    const stats = await db
      .select()
      .from(landingStats)
      .orderBy(landingStats.statKey)

    // Transform to a key-value map for easy lookup
    const statsMap: Record<string, { value: number; format?: string }> = {}
    
    for (const stat of stats) {
      statsMap[stat.statKey] = {
        value: Number(stat.statValue || 0),
        format: stat.displayFormat || undefined,
      }
    }

    // Return stats in the expected format
    return NextResponse.json({
      totalRaised: statsMap.total_raised?.value || 0,
      activeCases: statsMap.active_cases?.value || 0,
      beneficiaries: statsMap.beneficiaries?.value || 0,
      contributors: statsMap.contributors?.value || 0,
      storyMedicalRaised: statsMap.story_medical_raised?.value || 0,
      storyEducationStudents: statsMap.story_education_students?.value || 0,
      storyHousingFamilies: statsMap.story_housing_families?.value || 0,
    })
  } catch (error) {
    console.error('Error fetching landing stats:', error)
    // Return defaults if there's an error
    return NextResponse.json(
      {
        totalRaised: 0,
        activeCases: 0,
        beneficiaries: 0,
        contributors: 0,
        storyMedicalRaised: 0,
        storyEducationStudents: 0,
        storyHousingFamilies: 0,
      },
      { status: 500 }
    )
  }
}

