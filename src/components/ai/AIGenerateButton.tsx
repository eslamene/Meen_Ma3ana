'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, ChevronDown, ChevronUp, Code } from 'lucide-react'
import { generateContent, type GenerateContentInputs } from '@/lib/services/aiContentService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface AIGenerateButtonProps {
  /**
   * Type of content to generate
   */
  type: 'title' | 'description' | 'both'
  
  /**
   * Language(s) to generate
   */
  language: 'en' | 'ar' | 'both'
  
  /**
   * Input data for AI generation
   */
  inputs: GenerateContentInputs
  
  /**
   * Callback when generation is complete
   */
  onGenerate: (result: {
    title_en?: string
    title_ar?: string
    description_en?: string
    description_ar?: string
  }) => void
  
  /**
   * Optional: Custom button label
   */
  label?: string
  
  /**
   * Optional: Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  
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
 * AIGenerateButton Component
 * 
 * A reusable button component that generates catchy titles and descriptions using AI
 * 
 * @example
 * ```tsx
 * <AIGenerateButton
 *   type="title"
 *   language="both"
 *   inputs={{
 *     beneficiaryName: "Ahmed",
 *     beneficiarySituation: "Single father with 3 children",
 *     category: "Educational Assistance",
 *     targetAmount: 5000
 *   }}
 *   onGenerate={(result) => {
 *     setTitleEn(result.title_en)
 *     setTitleAr(result.title_ar)
 *   }}
 * />
 * ```
 */
export default function AIGenerateButton({
  type,
  language,
  inputs,
  onGenerate,
  label,
  size = 'default',
  variant = 'outline',
  disabled = false,
  iconOnly = false,
  className = '',
}: AIGenerateButtonProps) {
  const [generating, setGenerating] = useState(false)
  const [showTitleHintDialog, setShowTitleHintDialog] = useState(false)
  const [showDescriptionHintDialog, setShowDescriptionHintDialog] = useState(false)
  const [titleHint, setTitleHint] = useState('')
  const [titleSource, setTitleSource] = useState<'manual' | 'title_en' | 'title_ar'>('manual')
  const [includedFields, setIncludedFields] = useState<Record<string, boolean>>({
    beneficiaryName: false,
    beneficiarySituation: false,
    beneficiaryNeeds: false,
    category: true,
    location: false,
    targetAmount: false,
    caseType: false,
  })
  const [descriptionHintSource, setDescriptionHintSource] = useState<'title_en' | 'title_ar' | 'both'>('title_en')
  const [debugInfo, setDebugInfo] = useState<{
    title_en?: { prompt: string; response: string }
    title_ar?: { prompt: string; response: string }
    description_en?: { prompt: string; response: string }
    description_ar?: { prompt: string; response: string }
  } | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  
  // Real-time log entries
  const [logEntries, setLogEntries] = useState<Array<{
    id: string
    timestamp: Date
    type: 'prompt' | 'response' | 'info'
    contentType: 'title_en' | 'title_ar' | 'description_en' | 'description_ar' | 'system'
    content: string
    status?: 'sending' | 'received' | 'error'
  }>>([])

  const handleButtonClick = () => {
    if (type === 'title' || type === 'both') {
      // Show dialog to ask for hint
      setTitleHint('')
      setTitleSource('manual')
      setIncludedFields({
        beneficiaryName: false,
        beneficiarySituation: false,
        beneficiaryNeeds: false,
        category: true, // Default to including category
        location: false,
        targetAmount: false,
        caseType: false,
      })
      setShowTitleHintDialog(true)
    } else if (type === 'description') {
      // Show dialog to select which title to use as hint
      // Determine default based on available titles
      if (inputs.title_en && inputs.title_ar) {
        setDescriptionHintSource('both')
      } else if (inputs.title_en) {
        setDescriptionHintSource('title_en')
      } else if (inputs.title_ar) {
        setDescriptionHintSource('title_ar')
      } else {
        toast.error('Title Required', {
          description: 'To generate a description, please provide or generate a case title first.',
        })
        return
      }
      setShowDescriptionHintDialog(true)
    } else {
      // For 'both' type, start with title generation
      setTitleHint('')
      setShowTitleHintDialog(true)
    }
  }

  const handleGenerate = async (hint?: string, hintSource?: 'title_en' | 'title_ar' | 'both') => {
    setGenerating(true)
    setLogEntries([]) // Clear previous logs
    setShowDebug(true) // Auto-expand debug panel
    
    // Add initial log entry
    setLogEntries([{
      id: `info-${Date.now()}`,
      timestamp: new Date(),
      type: 'info',
      contentType: 'system',
      content: `Starting AI generation: ${type} in ${language === 'both' ? 'both languages' : language.toUpperCase()}`,
      status: 'sending'
    }])
    
    // Prepare inputs with hint and selected fields
    const inputsWithHint: GenerateContentInputs = { ...inputs }
    
    if (type === 'title' || type === 'both') {
      // Determine hint source
      let hintText = ''
      
      if (titleSource === 'title_en' && inputs.title_en) {
        hintText = inputs.title_en
      } else if (titleSource === 'title_ar' && inputs.title_ar) {
        hintText = inputs.title_ar
      } else if (titleSource === 'manual' && hint && hint.trim()) {
        hintText = hint.trim()
      }
      
      // Add selected case fields to context
      const fieldParts: string[] = []
      if (hintText) {
        fieldParts.push(hintText)
      }
      
      // Add selected fields
      if (includedFields.beneficiaryName && inputs.beneficiaryName) {
        fieldParts.push(`Beneficiary: ${inputs.beneficiaryName}`)
      }
      if (includedFields.beneficiarySituation && inputs.beneficiarySituation) {
        fieldParts.push(`Situation: ${inputs.beneficiarySituation}`)
      }
      if (includedFields.beneficiaryNeeds && inputs.beneficiaryNeeds) {
        fieldParts.push(`Needs: ${inputs.beneficiaryNeeds}`)
      }
      if (includedFields.category && inputs.category) {
        fieldParts.push(`Category: ${inputs.category}`)
      }
      if (includedFields.location && inputs.location) {
        fieldParts.push(`Location: ${inputs.location}`)
      }
      if (includedFields.targetAmount && inputs.targetAmount) {
        fieldParts.push(`Target Amount: ${inputs.targetAmount} EGP`)
      }
      if (includedFields.caseType && inputs.caseType) {
        fieldParts.push(`Case Type: ${inputs.caseType}`)
      }
      
      inputsWithHint.additionalContext = fieldParts.join('\n')
    }
    
    if (type === 'description') {
      // Use selected title as hint
      if (hintSource === 'title_en' && inputs.title_en) {
        inputsWithHint.additionalContext = inputs.title_en
      } else if (hintSource === 'title_ar' && inputs.title_ar) {
        inputsWithHint.additionalContext = inputs.title_ar
      } else if (hintSource === 'both') {
        // Use both titles if available
        const titles = [inputs.title_en, inputs.title_ar].filter(Boolean).join(' / ')
        if (titles) {
          inputsWithHint.additionalContext = titles
        }
      }
    }

    try {
      // Add log entry for request
      setLogEntries(prev => [...prev, {
        id: `request-${Date.now()}`,
        timestamp: new Date(),
        type: 'info',
        contentType: 'system',
        content: `Sending request to AI service...`,
        status: 'sending'
      }])
      
      const result = await generateContent({
        type,
        language,
        inputs: inputsWithHint,
      })
      
      // Add log entries for each prompt and response
      if (result.debug) {
        setDebugInfo(result.debug)
        
        // Log all prompts and responses in real-time
        const newEntries: typeof logEntries = []
        
        if (result.debug.title_en) {
          newEntries.push({
            id: `prompt-title-en-${Date.now()}`,
            timestamp: new Date(),
            type: 'prompt',
            contentType: 'title_en',
            content: result.debug.title_en.prompt,
            status: 'sending'
          })
          newEntries.push({
            id: `response-title-en-${Date.now()}`,
            timestamp: new Date(),
            type: 'response',
            contentType: 'title_en',
            content: result.debug.title_en.response,
            status: 'received'
          })
        }
        
        if (result.debug.title_ar) {
          newEntries.push({
            id: `prompt-title-ar-${Date.now()}`,
            timestamp: new Date(),
            type: 'prompt',
            contentType: 'title_ar',
            content: result.debug.title_ar.prompt,
            status: 'sending'
          })
          newEntries.push({
            id: `response-title-ar-${Date.now()}`,
            timestamp: new Date(),
            type: 'response',
            contentType: 'title_ar',
            content: result.debug.title_ar.response,
            status: 'received'
          })
        }
        
        if (result.debug.description_en) {
          newEntries.push({
            id: `prompt-desc-en-${Date.now()}`,
            timestamp: new Date(),
            type: 'prompt',
            contentType: 'description_en',
            content: result.debug.description_en.prompt,
            status: 'sending'
          })
          newEntries.push({
            id: `response-desc-en-${Date.now()}`,
            timestamp: new Date(),
            type: 'response',
            contentType: 'description_en',
            content: result.debug.description_en.response,
            status: 'received'
          })
        }
        
        if (result.debug.description_ar) {
          newEntries.push({
            id: `prompt-desc-ar-${Date.now()}`,
            timestamp: new Date(),
            type: 'prompt',
            contentType: 'description_ar',
            content: result.debug.description_ar.prompt,
            status: 'sending'
          })
          newEntries.push({
            id: `response-desc-ar-${Date.now()}`,
            timestamp: new Date(),
            type: 'response',
            contentType: 'description_ar',
            content: result.debug.description_ar.response,
            status: 'received'
          })
        }
        
        setLogEntries(prev => [...prev, ...newEntries])
      }
      
      // Add completion log
      setLogEntries(prev => [...prev, {
        id: `complete-${Date.now()}`,
        timestamp: new Date(),
        type: 'info',
        contentType: 'system',
        content: 'AI generation completed successfully',
        status: 'received'
      }])
      
      onGenerate(result)
      
      const contentTypes = []
      if (result.title_en || result.title_ar) contentTypes.push('title')
      if (result.description_en || result.description_ar) contentTypes.push('description')
      
      toast.success('Content generated successfully', {
        description: `AI has generated ${contentTypes.join(' and ')} for you.`,
      })
      
      // Don't auto-close dialogs - let user review the log and close manually
      // setShowTitleHintDialog(false)
      // setShowDescriptionHintDialog(false)
      // setTitleHint('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.'
      
      // Add error log entry
      setLogEntries(prev => [...prev, {
        id: `error-${Date.now()}`,
        timestamp: new Date(),
        type: 'info',
        contentType: 'system',
        content: `Error: ${errorMessage}`,
        status: 'error'
      }])
      
      // Only log to console in development, avoid logger to prevent serialization issues
      if (process.env.NODE_ENV === 'development') {
        if (error instanceof Error) {
          // eslint-disable-next-line no-console
          console.error('AI generation error:', error.message, error)
        } else {
          // eslint-disable-next-line no-console
          console.error('AI generation error:', error)
        }
      }
      
      toast.error('Generation failed', {
        description: errorMessage,
      })
    } finally {
      setGenerating(false)
    }
  }
  
  const handleTitleHintConfirm = () => {
    // Validate: if manual source selected, hint is required
    if (titleSource === 'manual' && !titleHint.trim()) {
      toast.error('Hint Required', {
        description: 'Please provide a hint for title generation or select a title source.',
      })
      return
    }
    
    // Validate: if title source selected, that title must exist
    if (titleSource === 'title_en' && !inputs.title_en) {
      toast.error('Title Required', {
        description: 'English title is not available. Please provide a hint or select another source.',
      })
      return
    }
    
    if (titleSource === 'title_ar' && !inputs.title_ar) {
      toast.error('Title Required', {
        description: 'Arabic title is not available. Please provide a hint or select another source.',
      })
      return
    }
    
    handleGenerate(titleHint.trim())
  }
  
  const toggleField = (fieldName: string) => {
    setIncludedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }
  
  const handleDescriptionHintConfirm = () => {
    handleGenerate(undefined, descriptionHintSource)
  }

  // Determine button label
  const getDefaultLabel = () => {
    if (type === 'title') {
      return language === 'both' ? 'Generate Title (Both)' : `Generate Title (${language.toUpperCase()})`
    } else if (type === 'description') {
      return language === 'both' ? 'Generate Description (Both)' : `Generate Description (${language.toUpperCase()})`
    } else {
      return language === 'both' ? 'Generate Content (Both)' : `Generate Content (${language.toUpperCase()})`
    }
  }

  const buttonLabel = label || getDefaultLabel()

  // For description, check if title is available
  const isDescriptionDisabled = type === 'description' && !(
    (inputs.title_en && inputs.title_en.trim()) ||
    (inputs.title_ar && inputs.title_ar.trim())
  )

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleButtonClick}
        disabled={disabled || generating || isDescriptionDisabled}
        className={className}
        title={
          iconOnly 
            ? buttonLabel 
            : isDescriptionDisabled
              ? 'Provide a case title first to generate description'
              : undefined
        }
      >
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {!iconOnly && <span className="ml-2">Generating...</span>}
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          {!iconOnly && <span className="ml-2">{buttonLabel}</span>}
        </>
      )}
    </Button>

    {/* Title Hint Dialog */}
    <Dialog 
      open={showTitleHintDialog} 
      onOpenChange={(open) => {
        // Prevent closing during generation
        if (!open && generating) return
        setShowTitleHintDialog(open)
        if (!open) {
          setTitleHint('')
          setDebugInfo(null)
          setLogEntries([])
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Provide Hint for Title Generation
          </DialogTitle>
          <DialogDescription>
            Enter a hint or context about the case to generate a relevant title. The AI will use this hint to create a title that matches your case.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-2 -mr-2">
          {/* Source Selection */}
          <div className="space-y-2">
            <Label>Source of Data</Label>
            <Select value={titleSource} onValueChange={(value: 'manual' | 'title_en' | 'title_ar') => setTitleSource(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[300px]">
                <SelectItem value="manual">Manual Hint / Context</SelectItem>
                <SelectItem 
                  value="title_en" 
                  disabled={!inputs.title_en}
                >
                  {inputs.title_en ? (
                    <div className="flex flex-col">
                      <span>Use English Title</span>
                      <span className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">
                        {inputs.title_en.length > 40 ? `${inputs.title_en.substring(0, 40)}...` : inputs.title_en}
                      </span>
                    </div>
                  ) : (
                    'Use English Title (Not Available)'
                  )}
                </SelectItem>
                <SelectItem 
                  value="title_ar" 
                  disabled={!inputs.title_ar}
                >
                  {inputs.title_ar ? (
                    <div className="flex flex-col">
                      <span>Use Arabic Title</span>
                      <span className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]" dir="rtl">
                        {inputs.title_ar.length > 40 ? `${inputs.title_ar.substring(0, 40)}...` : inputs.title_ar}
                      </span>
                    </div>
                  ) : (
                    'Use Arabic Title (Not Available)'
                  )}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Select the source to use as the base for title generation.
            </p>
          </div>

          {/* Manual Hint Input (only shown when manual is selected) */}
          {titleSource === 'manual' && (
            <div className="space-y-2">
              <Label htmlFor="title-hint">Case Hint / Context *</Label>
              <Textarea
                id="title-hint"
                value={titleHint}
                onChange={(e) => setTitleHint(e.target.value)}
                placeholder="e.g., علاج طبي (Medical Treatment)"
                rows={4}
                className="resize-none"
                autoFocus
              />
              <p className="text-xs text-gray-500">
                This hint will be used to generate a title that is directly related to your case.
              </p>
            </div>
          )}

          {/* Show selected title when using title source */}
          {titleSource === 'title_en' && inputs.title_en && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-md border">
              <Label className="text-xs font-semibold">English Title (Source)</Label>
              <p className="text-sm text-gray-700">{inputs.title_en}</p>
            </div>
          )}

          {titleSource === 'title_ar' && inputs.title_ar && (
            <div className="space-y-2 p-3 bg-gray-50 rounded-md border">
              <Label className="text-xs font-semibold">Arabic Title (Source)</Label>
              <p className="text-sm text-gray-700" dir="rtl">{inputs.title_ar}</p>
            </div>
          )}

          {/* Case Fields to Include */}
          <div className="space-y-2">
            <Label>Include Case Fields (Optional)</Label>
            <p className="text-xs text-gray-500 mb-2">
              Select additional case information to include in the title generation context.
            </p>
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-md border">
              {inputs.beneficiaryName && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="field-beneficiaryName"
                    checked={includedFields.beneficiaryName}
                    onCheckedChange={() => toggleField('beneficiaryName')}
                  />
                  <Label htmlFor="field-beneficiaryName" className="text-sm font-normal cursor-pointer">
                    Beneficiary Name
                  </Label>
                </div>
              )}
              {inputs.beneficiarySituation && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="field-beneficiarySituation"
                    checked={includedFields.beneficiarySituation}
                    onCheckedChange={() => toggleField('beneficiarySituation')}
                  />
                  <Label htmlFor="field-beneficiarySituation" className="text-sm font-normal cursor-pointer">
                    Situation
                  </Label>
                </div>
              )}
              {inputs.beneficiaryNeeds && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="field-beneficiaryNeeds"
                    checked={includedFields.beneficiaryNeeds}
                    onCheckedChange={() => toggleField('beneficiaryNeeds')}
                  />
                  <Label htmlFor="field-beneficiaryNeeds" className="text-sm font-normal cursor-pointer">
                    Needs
                  </Label>
                </div>
              )}
              {inputs.category && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="field-category"
                    checked={includedFields.category}
                    onCheckedChange={() => toggleField('category')}
                  />
                  <Label htmlFor="field-category" className="text-sm font-normal cursor-pointer">
                    Category
                  </Label>
                </div>
              )}
              {inputs.location && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="field-location"
                    checked={includedFields.location}
                    onCheckedChange={() => toggleField('location')}
                  />
                  <Label htmlFor="field-location" className="text-sm font-normal cursor-pointer">
                    Location
                  </Label>
                </div>
              )}
              {inputs.targetAmount && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="field-targetAmount"
                    checked={includedFields.targetAmount}
                    onCheckedChange={() => toggleField('targetAmount')}
                  />
                  <Label htmlFor="field-targetAmount" className="text-sm font-normal cursor-pointer">
                    Target Amount
                  </Label>
                </div>
              )}
              {inputs.caseType && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="field-caseType"
                    checked={includedFields.caseType}
                    onCheckedChange={() => toggleField('caseType')}
                  />
                  <Label htmlFor="field-caseType" className="text-sm font-normal cursor-pointer">
                    Case Type
                  </Label>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowTitleHintDialog(false)
              setTitleHint('')
              setTitleSource('manual')
              setIncludedFields({
                beneficiaryName: false,
                beneficiarySituation: false,
                beneficiaryNeeds: false,
                category: true,
                location: false,
                targetAmount: false,
                caseType: false,
              })
              setDebugInfo(null)
              setLogEntries([])
            }}
            disabled={generating}
          >
            Cancel
          </Button>
          {!generating && logEntries.length > 0 && !logEntries.some(e => e.status === 'sending') ? (
            // Show "Done" button after generation completes
            <Button
              onClick={() => {
                setShowTitleHintDialog(false)
                setTitleHint('')
                setDebugInfo(null)
                setLogEntries([])
              }}
            >
              Done
            </Button>
          ) : (
            <Button
              onClick={handleTitleHintConfirm}
              disabled={generating || (titleSource === 'manual' && !titleHint.trim())}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Title
                </>
              )}
            </Button>
          )}
        </DialogFooter>
        
        {/* Real-time AI Interaction Log */}
        {(logEntries.length > 0 || debugInfo) && (
          <div className="border-t pt-4 mt-4">
            <Collapsible open={showDebug} onOpenChange={setShowDebug}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-xs"
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <Code className="h-3 w-3" />
                    AI Interaction Log {logEntries.length > 0 && `(${logEntries.length})`}
                    {generating && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
                  </span>
                  {showDebug ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 max-h-[500px] overflow-y-auto font-mono text-xs">
                  {logEntries.length === 0 && debugInfo ? (
                    // Fallback to old debug info format if no log entries yet
                    <div className="space-y-3 text-gray-300">
                      {debugInfo.title_en && (
                        <div className="space-y-2">
                          <div className="text-cyan-400">[PROMPT] Title (EN)</div>
                          <pre className="text-gray-300 whitespace-pre-wrap bg-gray-800 p-2 rounded">{debugInfo.title_en.prompt}</pre>
                          <div className="text-green-400">[RESPONSE] Title (EN)</div>
                          <pre className="text-gray-300 whitespace-pre-wrap bg-gray-800 p-2 rounded">{debugInfo.title_en.response}</pre>
                        </div>
                      )}
                      {debugInfo.title_ar && (
                        <div className="space-y-2">
                          <div className="text-cyan-400">[PROMPT] Title (AR)</div>
                          <pre className="text-gray-300 whitespace-pre-wrap bg-gray-800 p-2 rounded" dir="rtl">{debugInfo.title_ar.prompt}</pre>
                          <div className="text-green-400">[RESPONSE] Title (AR)</div>
                          <pre className="text-gray-300 whitespace-pre-wrap bg-gray-800 p-2 rounded" dir="rtl">{debugInfo.title_ar.response}</pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Real-time log entries
                    <div className="space-y-2">
                      {logEntries.map((entry) => {
                        const getContentTypeLabel = () => {
                          switch (entry.contentType) {
                            case 'title_en': return 'Title (EN)'
                            case 'title_ar': return 'Title (AR)'
                            case 'description_en': return 'Description (EN)'
                            case 'description_ar': return 'Description (AR)'
                            case 'system': return 'System'
                            default: return entry.contentType
                          }
                        }
                        
                        const getTypeColor = () => {
                          if (entry.status === 'error') return 'text-red-400'
                          if (entry.type === 'prompt') return 'text-cyan-400'
                          if (entry.type === 'response') return 'text-green-400'
                          return 'text-yellow-400'
                        }
                        
                        const getStatusIcon = () => {
                          if (entry.status === 'sending') return <Loader2 className="h-3 w-3 animate-spin inline ml-1" />
                          if (entry.status === 'error') return '❌'
                          if (entry.status === 'received') return '✓'
                          return ''
                        }
                        
                        return (
                          <div key={entry.id} className="border-b border-gray-700 pb-2 last:border-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`${getTypeColor()} font-semibold`}>
                                [{entry.type.toUpperCase()}] {getContentTypeLabel()}
                              </span>
                              <span className="text-gray-500 text-[10px]">
                                {entry.timestamp.toLocaleTimeString()}
                              </span>
                              {getStatusIcon()}
                            </div>
                            <pre 
                              className={`text-gray-300 whitespace-pre-wrap bg-gray-800 p-2 rounded text-[11px] ${
                                entry.contentType.includes('_ar') ? 'text-right' : ''
                              }`}
                              dir={entry.contentType.includes('_ar') ? 'rtl' : 'ltr'}
                            >
                              {entry.content}
                            </pre>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Description Hint Selection Dialog */}
    <Dialog 
      open={showDescriptionHintDialog} 
      onOpenChange={(open) => {
        // Prevent closing during generation
        if (!open && generating) return
        setShowDescriptionHintDialog(open)
        if (!open) {
          setDebugInfo(null)
          setLogEntries([])
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Select Title for Description Generation
          </DialogTitle>
          <DialogDescription>
            Choose which title to use as a hint for generating the description. The AI will create a description that expands on the selected title.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-2 -mr-2">
          <div className="space-y-2">
            <Label htmlFor="description-hint-source">Use Title As Hint *</Label>
            <Select
              value={descriptionHintSource}
              onValueChange={(value: 'title_en' | 'title_ar' | 'both') => setDescriptionHintSource(value)}
            >
              <SelectTrigger id="description-hint-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {inputs.title_en && (
                  <SelectItem value="title_en">
                    English Title: {inputs.title_en.length > 50 ? `${inputs.title_en.substring(0, 50)}...` : inputs.title_en}
                  </SelectItem>
                )}
                {inputs.title_ar && (
                  <SelectItem value="title_ar">
                    Arabic Title: {inputs.title_ar.length > 50 ? `${inputs.title_ar.substring(0, 50)}...` : inputs.title_ar}
                  </SelectItem>
                )}
                {inputs.title_en && inputs.title_ar && (
                  <SelectItem value="both">
                    Both Titles (English & Arabic)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              The selected title will be used as context for generating the description.
            </p>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowDescriptionHintDialog(false)
              setDebugInfo(null)
              setLogEntries([])
            }}
            disabled={generating}
          >
            Cancel
          </Button>
          {!generating && logEntries.length > 0 && !logEntries.some(e => e.status === 'sending') ? (
            // Show "Done" button after generation completes
            <Button
              onClick={() => {
                setShowDescriptionHintDialog(false)
                setDebugInfo(null)
                setLogEntries([])
              }}
            >
              Done
            </Button>
          ) : (
            <Button
              onClick={handleDescriptionHintConfirm}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Description
                </>
              )}
            </Button>
          )}
        </DialogFooter>
        
        {/* Real-time AI Interaction Log */}
        {(logEntries.length > 0 || debugInfo) && (
          <div className="border-t pt-4 mt-4">
            <Collapsible open={showDebug} onOpenChange={setShowDebug}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-xs"
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <Code className="h-3 w-3" />
                    AI Interaction Log {logEntries.length > 0 && `(${logEntries.length})`}
                    {generating && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
                  </span>
                  {showDebug ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-3 max-h-[500px] overflow-y-auto font-mono text-xs">
                  {logEntries.length === 0 && debugInfo ? (
                    // Fallback to old debug info format if no log entries yet
                    <div className="space-y-3 text-gray-300">
                      {debugInfo.description_en && (
                        <div className="space-y-2">
                          <div className="text-cyan-400">[PROMPT] Description (EN)</div>
                          <pre className="text-gray-300 whitespace-pre-wrap bg-gray-800 p-2 rounded">{debugInfo.description_en.prompt}</pre>
                          <div className="text-green-400">[RESPONSE] Description (EN)</div>
                          <pre className="text-gray-300 whitespace-pre-wrap bg-gray-800 p-2 rounded">{debugInfo.description_en.response}</pre>
                        </div>
                      )}
                      {debugInfo.description_ar && (
                        <div className="space-y-2">
                          <div className="text-cyan-400">[PROMPT] Description (AR)</div>
                          <pre className="text-gray-300 whitespace-pre-wrap bg-gray-800 p-2 rounded" dir="rtl">{debugInfo.description_ar.prompt}</pre>
                          <div className="text-green-400">[RESPONSE] Description (AR)</div>
                          <pre className="text-gray-300 whitespace-pre-wrap bg-gray-800 p-2 rounded" dir="rtl">{debugInfo.description_ar.response}</pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Real-time log entries
                    <div className="space-y-2">
                      {logEntries.map((entry) => {
                        const getContentTypeLabel = () => {
                          switch (entry.contentType) {
                            case 'title_en': return 'Title (EN)'
                            case 'title_ar': return 'Title (AR)'
                            case 'description_en': return 'Description (EN)'
                            case 'description_ar': return 'Description (AR)'
                            case 'system': return 'System'
                            default: return entry.contentType
                          }
                        }
                        
                        const getTypeColor = () => {
                          if (entry.status === 'error') return 'text-red-400'
                          if (entry.type === 'prompt') return 'text-cyan-400'
                          if (entry.type === 'response') return 'text-green-400'
                          return 'text-yellow-400'
                        }
                        
                        const getStatusIcon = () => {
                          if (entry.status === 'sending') return <Loader2 className="h-3 w-3 animate-spin inline ml-1" />
                          if (entry.status === 'error') return '❌'
                          if (entry.status === 'received') return '✓'
                          return ''
                        }
                        
                        return (
                          <div key={entry.id} className="border-b border-gray-700 pb-2 last:border-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`${getTypeColor()} font-semibold`}>
                                [{entry.type.toUpperCase()}] {getContentTypeLabel()}
                              </span>
                              <span className="text-gray-500 text-[10px]">
                                {entry.timestamp.toLocaleTimeString()}
                              </span>
                              {getStatusIcon()}
                            </div>
                            <pre 
                              className={`text-gray-300 whitespace-pre-wrap bg-gray-800 p-2 rounded text-[11px] ${
                                entry.contentType.includes('_ar') ? 'text-right' : ''
                              }`}
                              dir={entry.contentType.includes('_ar') ? 'rtl' : 'ltr'}
                            >
                              {entry.content}
                            </pre>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}

