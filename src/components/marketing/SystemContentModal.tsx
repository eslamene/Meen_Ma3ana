'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { X, Share2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SystemContentModalProps {
  contentKey: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SystemContent {
  id: string
  contentKey: string
  titleEn: string
  titleAr: string
  contentEn: string
  contentAr: string
  description?: string | null
  descriptionAr?: string | null
}

export default function SystemContentModal({
  contentKey,
  open,
  onOpenChange,
}: SystemContentModalProps) {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const isRTL = locale === 'ar'
  const [content, setContent] = useState<SystemContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && contentKey) {
      fetchContent()
    }
    // Note: locale is not in dependencies because content contains both languages
    // and we select the appropriate one in the render phase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contentKey])

  const fetchContent = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/system-content?key=${contentKey}`)
      if (!response.ok) {
        throw new Error('Failed to fetch content')
      }
      const data = await response.json()
      setContent(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (typeof window !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: isRTL ? content?.titleAr : content?.titleEn,
          text: isRTL ? content?.contentAr : content?.contentEn,
          url: window.location.href,
        })
      } catch (err) {
        // User cancelled or error occurred
        console.error('Error sharing:', err)
      }
    } else {
      // Fallback: copy to clipboard
      handleCopy()
    }
  }

  const handleCopy = async () => {
    const text = isRTL ? content?.contentAr : content?.contentEn
    if (text && typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Error copying:', err)
      }
    }
  }

  const renderMarkdown = (markdown: string) => {
    if (!markdown) return ''

    // Split into lines for better processing
    const lines = markdown.split('\n')
    const result: string[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let inList = false
    let listItems: string[] = []
    let listType: 'ul' | 'ol' | null = null

    const flushList = () => {
      if (listItems.length > 0) {
        const listClass = listType === 'ol' 
          ? 'list-decimal list-inside mb-4 space-y-2 ml-4 text-gray-700' 
          : 'list-disc list-inside mb-4 space-y-2 ml-4 text-gray-700'
        const tag = listType === 'ol' ? 'ol' : 'ul'
        result.push(`<${tag} class="${listClass}">${listItems.join('')}</${tag}>`)
        listItems = []
        inList = false
        listType = null
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Code blocks
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          result.push(`<pre class="bg-gray-100 rounded-lg p-4 my-4 overflow-x-auto border border-gray-200"><code class="text-sm text-gray-800">${codeBlockContent.join('\n')}</code></pre>`)
          codeBlockContent = []
          inCodeBlock = false
        } else {
          // Start code block
          flushList()
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        flushList()
        result.push(`<h3 class="text-xl font-semibold mt-6 mb-3 text-gray-900">${trimmed.substring(4)}</h3>`)
        continue
      }
      if (trimmed.startsWith('## ')) {
        flushList()
        result.push(`<h2 class="text-2xl font-bold mt-8 mb-4 text-gray-900">${trimmed.substring(3)}</h2>`)
        continue
      }
      if (trimmed.startsWith('# ')) {
        flushList()
        result.push(`<h1 class="text-3xl font-bold mt-8 mb-4 text-gray-900">${trimmed.substring(2)}</h1>`)
        continue
      }

      // Horizontal rules
      if (trimmed === '---' || trimmed === '***') {
        flushList()
        result.push('<hr class="my-6 border-gray-200" />')
        continue
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        flushList()
        const quoteText = processInlineMarkdown(trimmed.substring(2))
        result.push(`<blockquote class="border-l-4 border-[#6B8E7E] pl-4 my-4 italic text-gray-600">${quoteText}</blockquote>`)
        continue
      }

      // Lists
      if (/^\d+\.\s/.test(trimmed)) {
        if (!inList || listType !== 'ol') {
          flushList()
          inList = true
          listType = 'ol'
        }
        const itemText = processInlineMarkdown(trimmed.replace(/^\d+\.\s/, ''))
        listItems.push(`<li class="mb-2">${itemText}</li>`)
        continue
      }

      if (/^[-*]\s/.test(trimmed)) {
        if (!inList || listType !== 'ul') {
          flushList()
          inList = true
          listType = 'ul'
        }
        const itemText = processInlineMarkdown(trimmed.replace(/^[-*]\s/, ''))
        listItems.push(`<li class="mb-2">${itemText}</li>`)
        continue
      }

      // Regular paragraphs
      if (trimmed) {
        flushList()
        const processed = processInlineMarkdown(trimmed)
        result.push(`<p class="mb-4 leading-relaxed text-gray-700">${processed}</p>`)
      } else {
        // Empty line - flush list if we're in one
        flushList()
      }
    }

    // Flush any remaining list
    flushList()

    return result.join('\n')
  }

  const processInlineMarkdown = (text: string): string => {
    // First handle bold (which uses **) - this prevents italic from matching inside bold
    let result = text.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      return `<strong class="font-semibold text-gray-900">${content}</strong>`
    })
    
    // Then handle italic (single * but not part of **)
    // Use a pattern that matches single asterisks not preceded or followed by asterisks
    result = result.replace(/(^|[^*])\*([^*\n]+?)\*([^*]|$)/g, '$1<em class="italic">$2</em>$3')
    
    // Handle inline code
    result = result.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm border border-gray-200 text-gray-800">$1</code>')
    
    // Handle links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#6B8E7E] hover:text-[#5a7a6b] underline transition-colors font-medium" target="_blank" rel="noopener noreferrer">$1</a>')
    
    return result
  }

  const title = isRTL ? content?.titleAr : content?.titleEn
  const markdownContent = isRTL ? content?.contentAr : content?.contentEn

  // Debug: Log when modal should be open
  useEffect(() => {
    if (open) {
      console.log('SystemContentModal: Modal should be open, contentKey:', contentKey)
    }
  }, [open, contentKey])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-0 overflow-hidden [&>button]:hidden" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Glass effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none rounded-3xl z-0"></div>
        
        {/* Top Bar with Actions */}
        <DialogHeader className="px-6 py-5 border-b border-gray-200/50 flex-shrink-0 relative z-10 bg-white/20 backdrop-blur-sm rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {loading ? (
                  <span className="text-gray-500 animate-pulse">Loading...</span>
                ) : error ? (
                  <span className="text-[#E74C3C]">Error</span>
                ) : (
                  title || 'Content'
                )}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {content ? (isRTL ? content.descriptionAr || content.titleAr : content.description || content.titleEn) : 'Content modal'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {content && (
                <>
                  {typeof window !== 'undefined' && 'share' in navigator ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShare}
                      className="text-gray-700 hover:text-[#6B8E7E] hover:bg-white/40 transition-colors"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {isRTL ? 'مشاركة' : 'Share'}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="text-gray-700 hover:text-[#6B8E7E] hover:bg-white/40 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2 text-[#6B8E7E]" />
                          {isRTL ? 'تم النسخ' : 'Copied'}
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          {isRTL ? 'نسخ' : 'Copy'}
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-gray-700 hover:text-gray-900 hover:bg-white/40 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent relative z-10">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 animate-pulse">Loading content...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#E74C3C]">{error}</div>
            </div>
          )}

          {content && markdownContent && (
            <div
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-h1:text-3xl prose-h1:font-bold prose-h1:mt-8 prose-h1:mb-4 prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-strong:text-gray-900 prose-strong:font-semibold prose-a:text-[#6B8E7E] prose-a:no-underline hover:prose-a:underline prose-a:font-medium prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:border prose-code:border-gray-200 prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg prose-pre:p-4 prose-blockquote:text-gray-600 prose-blockquote:border-l-4 prose-blockquote:border-[#6B8E7E] prose-blockquote:pl-4 prose-blockquote:italic prose-li:text-gray-700 prose-ul:list-disc prose-ol:list-decimal"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(markdownContent),
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

