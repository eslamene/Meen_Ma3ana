'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function useMenuState() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const pathname = usePathname()

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
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      setSidebarOpen(false)
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
