'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function useMenuState() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId)
      } else {
        newSet.add(moduleId)
      }
      return newSet
    })
  }

  const toggleItem = (itemHref: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemHref)) {
        newSet.delete(itemHref)
      } else {
        newSet.add(itemHref)
      }
      return newSet
    })
  }

  // Auto-expand module based on current path
  useEffect(() => {
    // This could be enhanced to automatically expand modules based on current route
    // For now, we'll keep it simple
  }, [pathname])

  // Close sidebar on mobile when route changes
  // Track pathname changes and close sidebar if needed
  useEffect(() => {
    const pathnameChanged = prevPathnameRef.current !== pathname
    const wasOpen = sidebarOpen
    prevPathnameRef.current = pathname

    // Only close if pathname changed, we're on mobile, and sidebar was open
    if (pathnameChanged && window.innerWidth < 1024 && wasOpen) {
      // Schedule the state update outside the effect using a microtask
      Promise.resolve().then(() => {
        setSidebarOpen(false)
      })
    }
  }, [pathname, sidebarOpen])

  return {
    sidebarOpen,
    setSidebarOpen,
    expandedModules,
    setExpandedModules,
    expandedItems,
    setExpandedItems,
    toggleSidebar,
    toggleModule,
    toggleItem
  }
}
