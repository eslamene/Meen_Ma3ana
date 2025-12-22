/**
 * useInfiniteScrollPagination Hook
 * 
 * A reusable hook for handling pagination with infinite scroll on mobile
 * and regular pagination on desktop. Supports both client-side and server-side pagination.
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { getPaginationSettings, DEFAULT_SCROLL_ITEMS_PER_PAGE } from '@/lib/utils/paginationSettings'

import { defaultLogger as logger } from '@/lib/logger'

export interface PaginationConfig {
  /**
   * Total number of items (for client-side pagination)
   * If not provided, assumes server-side pagination
   */
  totalItems?: number
  
  /**
   * Initial page number (default: 1)
   */
  initialPage?: number
  
  /**
   * Initial items per page for desktop (default: 10)
   */
  initialItemsPerPage?: number
  
  /**
   * Callback to fetch data (for server-side pagination)
   * Should return a promise that resolves when fetch is complete
   * If not provided, assumes client-side pagination
   */
  onFetch?: (page: number, limit: number) => Promise<void>
  
  /**
   * Dependencies that should trigger a reset to page 1
   * (e.g., filters, search terms)
   */
  resetDependencies?: unknown[]
  
  /**
   * Whether pagination is enabled (default: true)
   */
  enabled?: boolean
  
  /**
   * External loading state (for server-side pagination)
   * If provided, the hook will use this instead of managing its own loading state
   */
  externalLoading?: boolean
  
  /**
   * Total pages (for server-side pagination)
   * If provided, overrides the calculated totalPages from totalItems
   */
  totalPages?: number
  
  /**
   * Use "Load More" button instead of infinite scroll on mobile
   * If true, disables Intersection Observer and requires manual button click
   */
  useLoadMoreButton?: boolean
}

export interface PaginationState {
  /**
   * Current page number
   */
  currentPage: number
  
  /**
   * Items per page for desktop
   */
  itemsPerPage: number
  
  /**
   * Items per page for mobile scroll (loaded from system config)
   */
  scrollItemsPerPage: number | null
  
  /**
   * Whether loading more items (for infinite scroll)
   */
  isLoadingMore: boolean
  
  /**
   * Whether currently on mobile screen
   */
  isMobile: boolean
  
  /**
   * Total pages (calculated for client-side, Infinity for server-side)
   */
  totalPages: number
  
  /**
   * Effective items per page (mobile or desktop)
   */
  effectiveItemsPerPage: number
  
  /**
   * Start index for current page
   */
  startIndex: number
  
  /**
   * End index for current page
   */
  endIndex: number
}

export interface PaginationActions {
  /**
   * Set current page
   */
  setCurrentPage: (page: number) => void
  
  /**
   * Set items per page
   */
  setItemsPerPage: (items: number) => void
  
  /**
   * Reset to page 1
   */
  reset: () => void
}

export interface UseInfiniteScrollPaginationReturn {
  state: PaginationState
  actions: PaginationActions
  /**
   * Scroll sentinel element ID (for rendering in JSX)
   */
  sentinelId: string
  /**
   * Whether to show the scroll sentinel (for mobile infinite scroll)
   */
  showSentinel: boolean
  /**
   * Whether to show "Load More" button (for mobile when useLoadMoreButton is true)
   */
  showLoadMoreButton: boolean
  /**
   * Handler for "Load More" button click
   */
  handleLoadMore: () => void
  /**
   * Scroll position ref (internal use)
   */
  scrollPositionRef: React.MutableRefObject<{ height: number; top: number } | null>
}

const SENTINEL_ID = 'scroll-sentinel'
const MOBILE_BREAKPOINT = 640

export function useInfiniteScrollPagination(
  config: PaginationConfig = {}
): UseInfiniteScrollPaginationReturn {
  const {
    totalItems,
    initialPage = 1,
    initialItemsPerPage = 10,
    onFetch,
    resetDependencies = [],
    enabled = true,
    externalLoading = false,
    totalPages: externalTotalPages,
    useLoadMoreButton = true // Default to Load More button for reliability
  } = config

  const [currentPage, setCurrentPage] = useState(initialPage)
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)
  const [scrollItemsPerPage, setScrollItemsPerPage] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const scrollPositionRef = useRef<{ height: number; top: number } | null>(null)
  const isLoadingRef = useRef(false)
  const currentPageRef = useRef(initialPage)
  const totalPagesRef = useRef(Infinity)
  const isLoadingMoreRef = useRef(false)
  const externalLoadingRef = useRef(externalLoading)
  const initialScrollTopRef = useRef<number | null>(null)

  // Fetch pagination settings on mount
  useEffect(() => {
    const loadPaginationSettings = async () => {
      try {
        const settings = await getPaginationSettings()
        setScrollItemsPerPage(settings.scrollItemsPerPage)
      } catch (error) {
        logger.error('Error loading pagination settings:', { error: error })
        setScrollItemsPerPage(DEFAULT_SCROLL_ITEMS_PER_PAGE)
      }
    }
    loadPaginationSettings()
  }, [])

  // Track screen size for mobile/desktop detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Calculate pagination values
  const effectiveItemsPerPage = isMobile 
    ? (scrollItemsPerPage ?? DEFAULT_SCROLL_ITEMS_PER_PAGE) 
    : itemsPerPage

  // Calculate totalPages - treat 0 as "unknown" (Infinity) to allow observer setup
  const totalPages = externalTotalPages !== undefined && externalTotalPages > 0
    ? externalTotalPages
    : totalItems !== undefined
    ? Math.ceil(totalItems / effectiveItemsPerPage)
    : Infinity // Server-side pagination - total pages unknown or not loaded yet

  // Keep refs in sync with state
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])
  
  useEffect(() => {
    totalPagesRef.current = totalPages
  }, [totalPages])
  
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore
  }, [isLoadingMore])
  
  useEffect(() => {
    externalLoadingRef.current = externalLoading
  }, [externalLoading])

  const startIndex = (currentPage - 1) * effectiveItemsPerPage
  const endIndex = startIndex + effectiveItemsPerPage

  // Reset to page 1 when dependencies change
  useEffect(() => {
    if (!enabled) return
    setCurrentPage(1)
    setIsLoadingMore(false)
    isLoadingRef.current = false
    // Reset initial scroll position when filters change
    initialScrollTopRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDependencies)
  
  // Capture initial scroll position on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (initialScrollTopRef.current === null) {
      initialScrollTopRef.current = window.pageYOffset || document.documentElement.scrollTop || 0
    }
  }, [])

  // Restore scroll position after DOM updates
  useLayoutEffect(() => {
    if (!enabled) return
    if (scrollPositionRef.current && typeof window !== 'undefined') {
      const { height: oldScrollHeight, top: oldScrollTop } = scrollPositionRef.current
      const newScrollHeight = document.documentElement.scrollHeight
      const scrollHeightDifference = newScrollHeight - oldScrollHeight
      
      window.scrollTo({
        top: oldScrollTop + scrollHeightDifference,
        behavior: 'auto'
      })
      
      scrollPositionRef.current = null
    }
  }, [currentPage, enabled])

  // Reset loading flags for mobile scroll pagination when currentPage changes
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined' || window.innerWidth >= MOBILE_BREAKPOINT) return
    
    if (onFetch) {
      // Server-side pagination: only reset if not loading
      if (!externalLoading && !isLoadingMore) {
        isLoadingRef.current = false
      }
    } else {
      // Client-side pagination: reset immediately
      setIsLoadingMore(false)
      isLoadingRef.current = false
    }
  }, [currentPage, externalLoading, isLoadingMore, onFetch, enabled])

  // Handle page change with optional fetch
  const handlePageChange = useCallback(async (page: number) => {
    if (!enabled) return
    
    if (onFetch) {
      // Server-side pagination: fetch data
      setIsLoadingMore(true)
      isLoadingRef.current = true
      try {
        await onFetch(page, effectiveItemsPerPage)
      } finally {
        setIsLoadingMore(false)
        isLoadingRef.current = false
      }
    }
    
    setCurrentPage(page)
  }, [onFetch, effectiveItemsPerPage, enabled])

  // Handle "Load More" button click
  const handleLoadMore = useCallback(() => {
    if (!enabled) return
    
    const currentPageValue = currentPageRef.current
    const currentTotalPages = totalPagesRef.current
    const currentIsLoadingMore = isLoadingMoreRef.current
    const currentExternalLoading = externalLoadingRef.current
    
    // Check if we can load more
    if (
      currentIsLoadingMore || 
      currentExternalLoading || 
      isLoadingRef.current || 
      currentPageValue >= currentTotalPages
    ) {
      return
    }
    
    const nextPage = currentPageValue + 1
    if (onFetch) {
      handlePageChange(nextPage)
    } else {
      setCurrentPage(nextPage)
    }
  }, [enabled, onFetch, handlePageChange])

  // Scroll-based pagination for mobile using Intersection Observer (only if useLoadMoreButton is false)
  useEffect(() => {
    if (!enabled) return
    if (useLoadMoreButton) return // Skip observer if using Load More button
    if (typeof window === 'undefined' || window.innerWidth >= MOBILE_BREAKPOINT) return
    if (scrollItemsPerPage === null) return

    const isMobileScreen = window.innerWidth < MOBILE_BREAKPOINT
    const effectiveLimit = isMobileScreen ? scrollItemsPerPage : itemsPerPage
    
    // Calculate total pages for scroll
    const totalPagesForScroll = externalTotalPages !== undefined && externalTotalPages > 0
      ? externalTotalPages
      : totalItems !== undefined
      ? Math.ceil(totalItems / effectiveLimit)
      : Infinity

    const loading = externalLoading || isLoadingMore

    const hasMorePages = totalPagesForScroll === Infinity || currentPage < totalPagesForScroll
    if (!hasMorePages || loading) {
      return
    }

    let observer: IntersectionObserver | null = null
    
    const setupObserver = () => {
      const sentinel = document.getElementById(SENTINEL_ID)
      
      if (!sentinel) {
        setTimeout(setupObserver, 50)
        return
      }

      if (observer) {
        observer.disconnect()
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            
            const currentPageValue = currentPageRef.current
            const currentTotalPages = totalPagesRef.current
            const currentIsLoadingMore = isLoadingMoreRef.current
            const currentExternalLoading = externalLoadingRef.current
            
            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop || 0
            const isAtAbsoluteTop = currentScrollTop < 10
            const hasScrolled = !isAtAbsoluteTop
            
            if (
              hasScrolled && 
              !currentIsLoadingMore && 
              !currentExternalLoading && 
              !isLoadingRef.current && 
              currentPageValue < currentTotalPages
            ) {
              const oldScrollHeight = document.documentElement.scrollHeight
              const oldScrollTop = currentScrollTop
              scrollPositionRef.current = { height: oldScrollHeight, top: oldScrollTop }
              isLoadingRef.current = true
              
              setIsLoadingMore(true)
              
              const nextPage = currentPageValue + 1
              if (onFetch) {
                handlePageChange(nextPage)
              } else {
                setCurrentPage(nextPage)
              }
            }
          })
        },
        {
          root: null,
          rootMargin: '0px 0px 200px 0px',
          threshold: 0.01
        }
      )

      observer.observe(sentinel)
    }

    setupObserver()
    
    return () => {
      if (observer) {
        observer.disconnect()
        observer = null
      }
    }
  }, [
    currentPage, 
    totalItems, 
    externalTotalPages,
    itemsPerPage, 
    scrollItemsPerPage, 
    isLoadingMore, 
    externalLoading, 
    onFetch,
    handlePageChange,
    enabled,
    useLoadMoreButton
  ])

  // Determine if sentinel should be shown (only if not using Load More button)
  const showSentinel = enabled && 
    !useLoadMoreButton &&
    isMobile && 
    scrollItemsPerPage !== null &&
    (totalItems === undefined || currentPage < totalPages)

  // Determine if Load More button should be shown
  const showLoadMoreButton = enabled &&
    useLoadMoreButton &&
    isMobile &&
    scrollItemsPerPage !== null &&
    currentPage < totalPages &&
    !isLoadingMore &&
    !externalLoading

  const reset = useCallback(() => {
    setCurrentPage(1)
    setIsLoadingMore(false)
    isLoadingRef.current = false
  }, [])

  return {
    state: {
      currentPage,
      itemsPerPage,
      scrollItemsPerPage,
      isLoadingMore,
      isMobile,
      totalPages,
      effectiveItemsPerPage,
      startIndex,
      endIndex
    },
    actions: {
      setCurrentPage: handlePageChange,
      setItemsPerPage,
      reset
    },
    sentinelId: SENTINEL_ID,
    showSentinel: !!showSentinel,
    showLoadMoreButton: !!showLoadMoreButton,
    handleLoadMore,
    scrollPositionRef
  }
}

