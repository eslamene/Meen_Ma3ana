'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Languages } from 'lucide-react'
import { translateText, type TranslationDirection } from '@/lib/services/translationService'
import { toast } from 'sonner'

interface TranslationButtonProps {
  /**
   * Source text to translate
   */
  sourceText: string
  
  /**
   * Translation direction
   */
  direction: TranslationDirection
  
  /**
   * Callback when translation is complete
   */
  onTranslate: (translatedText: string) => void
  
  /**
   * Optional: Custom button label
   */
  label?: string
  
  /**
   * Optional: Button size
   */
  size?: 'sm' | 'md' | 'lg' | 'icon'
  
  /**
   * Optional: Button variant
   */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  
  /**
   * Optional: Disable button
   */
  disabled?: boolean
  
  /**
   * Optional: Show icon only
   */
  iconOnly?: boolean
  
  /**
   * Optional: Additional className
   */
  className?: string
}

/**
 * TranslationButton Component
 * 
 * A reusable button component that translates text between Arabic and English
 * 
 * @example
 * ```tsx
 * <TranslationButton
 *   sourceText={titleAr}
 *   direction="ar-to-en"
 *   onTranslate={(translated) => setTitleEn(translated)}
 *   label="Translate to English"
 * />
 * ```
 */
export default function TranslationButton({
  sourceText,
  direction,
  onTranslate,
  label,
  size = 'sm',
  variant = 'outline',
  disabled = false,
  iconOnly = false,
  className = '',
}: TranslationButtonProps) {
  const [translating, setTranslating] = useState(false)

  const handleTranslate = async () => {
    if (!sourceText || sourceText.trim().length === 0) {
      toast.error('No text to translate', {
        description: 'Please enter some text before translating.',
      })
      return
    }

    setTranslating(true)

    try {
      const result = await translateText(sourceText, direction)
      onTranslate(result.translatedText)
      
      toast.success('Translation completed', {
        description: 'Text has been translated successfully.',
      })
    } catch (error) {
      console.error('Translation error:', error)
      toast.error('Translation failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      })
    } finally {
      setTranslating(false)
    }
  }

  // Determine button label based on direction
  const defaultLabel = direction === 'ar-to-en' 
    ? 'Translate to English' 
    : 'Translate to Arabic'

  const buttonLabel = label || defaultLabel

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleTranslate}
      disabled={disabled || translating || !sourceText || sourceText.trim().length === 0}
      className={className}
      title={iconOnly ? buttonLabel : undefined}
    >
      {translating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {!iconOnly && <span className="ml-2">Translating...</span>}
        </>
      ) : (
        <>
          <Languages className="h-4 w-4" />
          {!iconOnly && <span className="ml-2">{buttonLabel}</span>}
        </>
      )}
    </Button>
  )
}

