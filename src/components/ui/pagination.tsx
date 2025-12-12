'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

export interface PaginationProps {
  /** Current page number (1-indexed) */
  page: number
  /** Total number of pages */
  totalPages: number
  /** Total number of items */
  total?: number
  /** Items per page */
  limit?: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Whether pagination is loading */
  loading?: boolean
  /** Show item count text */
  showItemCount?: boolean
  /** Custom item name (e.g., "cases", "notifications") */
  itemName?: string
  /** Custom className */
  className?: string
  /** Show on mobile (default: false, hidden on mobile) */
  showOnMobile?: boolean
  /** Maximum number of page buttons to show (default: 5) */
  maxVisiblePages?: number
  /** Scroll to top on page change */
  scrollToTop?: boolean
}

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  loading = false,
  showItemCount = false,
  itemName = 'items',
  className,
  showOnMobile = false,
  maxVisiblePages = 5,
  scrollToTop = false,
}: PaginationProps) {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const isRTL = locale === 'ar'
  const t = useTranslations('common')
  
  if (totalPages <= 1) return null

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || loading) return
    onPageChange(newPage)
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = []
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)
      
      // Calculate start and end of visible range around current page
      let start = Math.max(2, page - 1)
      let end = Math.min(totalPages - 1, page + 1)
      
      // Adjust range to show more pages if we're near the edges
      if (page <= 3) {
        end = Math.min(maxVisiblePages - 1, totalPages - 1)
      } else if (page >= totalPages - 2) {
        start = Math.max(totalPages - (maxVisiblePages - 2), 2)
      }
      
      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('ellipsis-start')
      }
      
      // Add visible pages around current page (only if they're not already added)
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i)
        }
      }
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis-end')
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()
  // For RTL, reverse the page numbers array so they display in correct order from right to left
  const displayPageNumbers = isRTL ? [...pageNumbers].reverse() : pageNumbers
  const hasPrevPage = page > 1
  const hasNextPage = page < totalPages

  const startItem = total && limit ? (page - 1) * limit + 1 : undefined
  const endItem = total && limit ? Math.min(page * limit, total) : undefined
  
  // Get translations
  const previousText = t('previous')
  const nextText = t('next')

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-between gap-4",
      !showOnMobile && "hidden sm:flex",
      className
    )}>
      {/* Item Count */}
      {showItemCount && total && startItem && endItem && (
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{startItem}</span> to{' '}
          <span className="font-semibold text-gray-900">{endItem}</span> of{' '}
          <span className="font-semibold text-gray-900">{total}</span> {itemName}
        </div>
      )}

      {/* Pagination Controls */}
      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(page - 1)}
          disabled={!hasPrevPage || loading}
          className={cn("h-9", isRTL && "flex-row-reverse")}
        >
          {isRTL ? (
            <>
              <ChevronRight className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">{previousText}</span>
              <span className="sm:hidden">{previousText}</span>
            </>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{previousText}</span>
              <span className="sm:hidden">{previousText}</span>
            </>
          )}
        </Button>

        {/* Page Numbers */}
        <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
          {displayPageNumbers.map((pageNum, index) => {
            if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-gray-500 font-medium"
                >
                  ...
                </span>
              )
            }

            const pageNumber = pageNum as number
            const isActive = page === pageNumber

            return (
              <Button
                key={pageNumber}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePageChange(pageNumber)}
                disabled={loading}
                className={cn(
                  "h-9 w-9 p-0",
                  isActive && "bg-indigo-600 hover:bg-indigo-700 text-white"
                )}
              >
                {pageNumber}
              </Button>
            )
          })}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(page + 1)}
          disabled={!hasNextPage || loading}
          className={cn("h-9", isRTL && "flex-row-reverse")}
        >
          {isRTL ? (
            <>
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{nextText}</span>
              <span className="sm:hidden">{nextText}</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">{nextText}</span>
              <span className="sm:hidden">{nextText}</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

