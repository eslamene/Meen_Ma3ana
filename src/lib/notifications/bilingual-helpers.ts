/**
 * Helper functions for creating bilingual notification content
 */

export interface BilingualNotificationContent {
  title_en: string
  title_ar: string
  message_en: string
  message_ar: string
}

/**
 * Replace placeholders in a template string
 */
function replacePlaceholders(template: string, values: Record<string, string | number>): string {
  let result = template
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
  }
  return result
}

/**
 * Create bilingual notification content from translation keys
 * This function should be called with the actual translation function (t) from useTranslations
 * For server-side usage, we'll pass the translations directly
 */
export function createBilingualNotification(
  titleEn: string,
  titleAr: string,
  messageEn: string,
  messageAr: string,
  placeholders: Record<string, string | number> = {}
): BilingualNotificationContent {
  return {
    title_en: replacePlaceholders(titleEn, placeholders),
    title_ar: replacePlaceholders(titleAr, placeholders),
    message_en: replacePlaceholders(messageEn, placeholders),
    message_ar: replacePlaceholders(messageAr, placeholders),
  }
}

/**
 * Notification message templates
 * These match the keys in messages/en.json and messages/ar.json
 */
export const NOTIFICATION_TEMPLATES = {
  contributionApproved: {
    title_en: 'Contribution Approved',
    title_ar: 'تمت الموافقة على المساهمة',
    message_en: 'Your contribution of {amount} EGP for "{caseTitle}" has been approved. Thank you for your generosity!',
    message_ar: 'تمت الموافقة على مساهمتك بقيمة {amount} جنيه للحالة "{caseTitle}". شكراً لكرمك!',
  },
  contributionRejected: {
    title_en: 'Contribution Rejected',
    title_ar: 'تم رفض المساهمة',
    message_en: 'Your contribution of {amount} EGP for "{caseTitle}" has been rejected. Reason: {reason}',
    message_ar: 'تم رفض مساهمتك بقيمة {amount} جنيه للحالة "{caseTitle}". السبب: {reason}',
  },
  contributionPending: {
    title_en: 'Contribution Submitted',
    title_ar: 'تم إرسال المساهمة',
    message_en: 'Your contribution of {amount} EGP for "{caseTitle}" has been submitted and is under review.',
    message_ar: 'تم إرسال مساهمتك بقيمة {amount} جنيه للحالة "{caseTitle}" وهي قيد المراجعة.',
  },
  newContributionSubmitted: {
    title_en: 'New Contribution Submitted',
    title_ar: 'تم إرسال مساهمة جديدة',
    message_en: 'A new contribution of {amount} EGP has been submitted for case: {caseTitle}',
    message_ar: 'تم إرسال مساهمة جديدة بقيمة {amount} جنيه للحالة: {caseTitle}',
  },
} as const




