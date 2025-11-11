'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [content, setContent] = useState<SystemContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && contentKey) {
      fetchContent()
    }
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
          ? 'list-decimal list-inside mb-4 space-y-2 ml-4' 
          : 'list-disc list-inside mb-4 space-y-2 ml-4'
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
          result.push(`<pre class="bg-gray-800/50 rounded-lg p-4 my-4 overflow-x-auto border border-gray-700/50"><code class="text-sm text-gray-300">${codeBlockContent.join('\n')}</code></pre>`)
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
        result.push(`<h3 class="text-xl font-semibold mt-6 mb-3 text-white">${trimmed.substring(4)}</h3>`)
        continue
      }
      if (trimmed.startsWith('## ')) {
        flushList()
        result.push(`<h2 class="text-2xl font-bold mt-8 mb-4 text-white">${trimmed.substring(3)}</h2>`)
        continue
      }
      if (trimmed.startsWith('# ')) {
        flushList()
        result.push(`<h1 class="text-3xl font-bold mt-8 mb-4 text-white">${trimmed.substring(2)}</h1>`)
        continue
      }

      // Horizontal rules
      if (trimmed === '---' || trimmed === '***') {
        flushList()
        result.push('<hr class="my-6 border-gray-700/50" />')
        continue
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        flushList()
        const quoteText = processInlineMarkdown(trimmed.substring(2))
        result.push(`<blockquote class="border-l-4 border-gray-600 pl-4 my-4 italic text-gray-300">${quoteText}</blockquote>`)
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
        result.push(`<p class="mb-4 leading-relaxed text-gray-200">${processed}</p>`)
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
      return `<strong class="font-semibold text-white">${content}</strong>`
    })
    
    // Then handle italic (single * but not part of **)
    // Use a pattern that matches single asterisks not preceded or followed by asterisks
    result = result.replace(/(^|[^*])\*([^*\n]+?)\*([^*]|$)/g, '$1<em class="italic">$2</em>$3')
    
    // Handle inline code
    result = result.replace(/`([^`]+)`/g, '<code class="bg-gray-800/50 px-1.5 py-0.5 rounded text-sm border border-gray-700/50 text-gray-300">$1</code>')
    
    // Handle links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline transition-colors" target="_blank" rel="noopener noreferrer">$1</a>')
    
    return result
  }

  const title = isRTL ? content?.titleAr : content?.titleEn
  const markdownContent = isRTL ? content?.contentAr : content?.contentEn

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-2xl border-gray-700/50 text-white p-0 overflow-hidden flex flex-col shadow-2xl [&>button]:hidden">
        {/* Top Bar with Actions */}
        <DialogHeader className="px-6 py-4 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-white">
              {loading ? (
                <span className="text-gray-400">Loading...</span>
              ) : error ? (
                <span className="text-red-400">Error</span>
              ) : (
                title || 'Content'
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {content && (
                <>
                  {typeof window !== 'undefined' && 'share' in navigator ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShare}
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {isRTL ? 'مشاركة' : 'Share'}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
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
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400 animate-pulse">Loading content...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-400">{error}</div>
            </div>
          )}

          {content && markdownContent && (
            <div
              className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-gray-200 prose-strong:text-white prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:text-gray-300 prose-pre:bg-gray-800/50 prose-blockquote:text-gray-300 prose-li:text-gray-200"
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

