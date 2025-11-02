import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { systemConfig } from '@/drizzle/schema'
import { inArray } from 'drizzle-orm'

export async function GET() {
  try {
    // Fetch contact-related config values
    const configs = await db
      .select()
      .from(systemConfig)
      .where(inArray(systemConfig.configKey, ['whatsapp_number', 'whatsapp_default_message', 'whatsapp_default_message_ar', 'email']))

    // Transform to a key-value map for easy lookup
    const configMap: Record<string, string> = {}
    
    for (const config of configs) {
      configMap[config.configKey] = config.configValue
    }

    // Return contact info in the expected format
    return NextResponse.json({
      whatsappNumber: configMap.whatsapp_number || '',
      whatsappDefaultMessage: configMap.whatsapp_default_message || '',
      whatsappDefaultMessageAr: configMap.whatsapp_default_message_ar || '',
      email: configMap.email || '',
    })
  } catch (error) {
    console.error('Error fetching system config:', error)
    // Return defaults if there's an error
    return NextResponse.json(
      {
        whatsappNumber: '',
        whatsappDefaultMessage: '',
        whatsappDefaultMessageAr: '',
        email: '',
      },
      { status: 500 }
    )
  }
}

