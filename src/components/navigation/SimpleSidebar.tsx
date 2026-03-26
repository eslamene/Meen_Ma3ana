'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { cn, formatNotificationCount } from '@/lib/utils'
import Logo from '@/components/ui/Logo'
import LayoutToggle from '@/components/layout/LayoutToggle'
import { createClient } from '@/lib/supabase/client'
import { useAdmin } from '@/lib/admin/hooks'
import { User } from '@supabase/supabase-js'
import {
  X,
  Home,
  User as UserIcon,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  PanelLeft,
  Heart,
  BarChart3,
  Maximize2,
  Columns,
  Search,
  MoreVertical,
  Globe,
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { locales } from '@/i18n/request'
import { useLayoutOptional } from '@/components/layout/LayoutProvider'
import type { AdminMenuItem } from '@/lib/admin/types'
import { getIcon } from '@/lib/icons/registry'

import { defaultLogger as logger } from '@/lib/logger'

const activeMenuClass =
  'data-[active=true]:bg-gradient-to-r data-[active=true]:from-[#6B8E7E] data-[active=true]:to-[#6B8E7E]/90 data-[active=true]:text-white data-[active=true]:shadow-md data-[active=true]:shadow-[#6B8E7E]/20 data-[active=true]:hover:text-white data-[active=true]:hover:from-[#5a7a6b] data-[active=true]:hover:to-[#5a7a6b]'

const inactiveMenuClass =
  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'

function hrefForLocale(pathname: string, loc: string): string {
  let pathWithoutLocale = pathname
  locales.forEach((l) => {
    pathWithoutLocale = pathWithoutLocale.replace(new RegExp(`^/${l}(/|$)`), '/')
  })
  pathWithoutLocale = pathWithoutLocale.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
  return pathWithoutLocale === '/' ? `/${loc}/landing` : `/${loc}${pathWithoutLocale}`
}

function filterMenuItemsByQuery(items: AdminMenuItem[], query: string): AdminMenuItem[] {
  if (!query.trim()) return items

  const lowerQuery = query.toLowerCase()
  const filtered: AdminMenuItem[] = []

  for (const item of items) {
    const labelMatch =
      item.label.toLowerCase().includes(lowerQuery) ||
      (item.label_ar && item.label_ar.toLowerCase().includes(lowerQuery))
    const filteredChildren = item.children
      ? filterMenuItemsByQuery(item.children, query)
      : undefined
    const childrenMatch = filteredChildren && filteredChildren.length > 0

    if (labelMatch) {
      filtered.push({
        ...item,
        children:
          filteredChildren && filteredChildren.length > 0 ? filteredChildren : item.children,
      })
    } else if (childrenMatch) {
      filtered.push({
        ...item,
        children: filteredChildren,
      })
    }
  }

  return filtered
}

function CollapsedNavDescendant({
  item,
  locale,
  isActive,
  hasActiveChild,
  getIcon,
  notificationCount,
  onNavigate,
}: {
  item: AdminMenuItem
  locale: string
  isActive: (href: string, hasChildren?: boolean) => boolean
  hasActiveChild: (item: AdminMenuItem) => boolean
  getIcon: (iconName: string) => React.ComponentType<{ className?: string }>
  notificationCount: number
  onNavigate: () => void
}) {
  const IconComponent = useMemo(() => getIcon(item.icon || 'Heart'), [item.icon, getIcon])
  const hasChildren = Boolean(item.children?.length)
  const displayLabel = locale === 'ar' && item.label_ar ? item.label_ar : item.label
  const itemPath = `/${locale}${item.href}`
  const childIsActive = hasChildren ? hasActiveChild(item) : false
  const itemIsActive = hasChildren
    ? isActive(item.href, true) && !childIsActive
    : isActive(item.href, false)
  const isNotifications = item.href === '/notifications'
  const branchActive = itemIsActive || childIsActive

  if (hasChildren) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className={cn(branchActive && 'bg-sidebar-accent')}>
          <IconComponent className="me-2 h-4 w-4 shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent
          sideOffset={4}
          className="max-h-[min(20rem,60vh)] w-52 overflow-y-auto"
        >
          <DropdownMenuItem asChild>
            <Link href={itemPath} onClick={onNavigate} className="flex cursor-pointer items-center gap-2">
              <IconComponent className="h-4 w-4 shrink-0" />
              <span className="truncate">{displayLabel}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {item.children!.map((child) => (
            <CollapsedNavDescendant
              key={child.id}
              item={child}
              locale={locale}
              isActive={isActive}
              hasActiveChild={hasActiveChild}
              getIcon={getIcon}
              notificationCount={notificationCount}
              onNavigate={onNavigate}
            />
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  }

  return (
    <DropdownMenuItem asChild className={cn(itemIsActive && 'bg-sidebar-accent')}>
      <Link href={itemPath} onClick={onNavigate} className="flex w-full cursor-pointer items-center gap-2">
        <IconComponent className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{displayLabel}</span>
        {isNotifications && notificationCount > 0 ? (
          <Badge
            variant="destructive"
            className="ms-auto shrink-0 bg-[#E74C3C] px-1.5 text-xs text-white"
          >
            {formatNotificationCount(notificationCount)}
          </Badge>
        ) : null}
      </Link>
    </DropdownMenuItem>
  )
}

function CollapsedParentNav({
  item,
  locale,
  isActive,
  hasActiveChild,
  getIcon,
  notificationCount,
}: {
  item: AdminMenuItem
  locale: string
  isActive: (href: string, hasChildren?: boolean) => boolean
  hasActiveChild: (item: AdminMenuItem) => boolean
  getIcon: (iconName: string) => React.ComponentType<{ className?: string }>
  notificationCount: number
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const IconComponent = useMemo(() => getIcon(item.icon || 'Heart'), [item.icon, getIcon])
  const displayLabel = locale === 'ar' && item.label_ar ? item.label_ar : item.label
  const childIsActive = hasActiveChild(item)
  const itemIsActive = isActive(item.href, true) && !childIsActive
  const parentActive = itemIsActive || childIsActive
  const dropdownSide = locale === 'ar' ? 'left' : 'right'

  const onNavigate = () => {
    if (isMobile) setOpenMobile(false)
  }

  const hrefTrimmed = item.href?.trim() ?? ''
  const showParentLink =
    Boolean(hrefTrimmed) &&
    hrefTrimmed !== '#' &&
    !item.children?.some((c) => c.href === item.href)

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            isActive={parentActive}
            tooltip={displayLabel}
            className={cn(activeMenuClass, inactiveMenuClass)}
          >
            <IconComponent className="h-4 w-4 shrink-0" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={dropdownSide}
          align="start"
          sideOffset={4}
          className="max-h-[min(24rem,70vh)] w-56 overflow-y-auto"
        >
          {showParentLink ? (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/${locale}${item.href}`} onClick={onNavigate}>
                  {displayLabel}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {item.children!.map((child) => (
            <CollapsedNavDescendant
              key={child.id}
              item={child}
              locale={locale}
              isActive={isActive}
              hasActiveChild={hasActiveChild}
              getIcon={getIcon}
              notificationCount={notificationCount}
              onNavigate={onNavigate}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

export default function SimpleSidebar() {
  const t = useTranslations('navigation')
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = params.locale as string
  const side = locale === 'ar' ? 'right' : 'left'
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [notificationCount, setNotificationCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()
  const { user, loading, menuItems } = useAdmin()
  const layoutContext = useLayoutOptional()
  const { isMobile, setOpenMobile, toggleSidebar, state } = useSidebar()

  const collapsed = state === 'collapsed'

  const [stableUser, setStableUser] = useState<User | null>(null)

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        setStableUser(user)
      })
    }
  }, [user])

  const fetchUnreadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count', {
        credentials: 'include',
      })
      if (!response.ok) {
        setNotificationCount(0)
        return
      }
      const data = await response.json()
      const count = typeof data.unreadCount === 'number' ? data.unreadCount : data.count ?? 0
      setNotificationCount(count)
    } catch (error) {
      logger.error('Error fetching unread notifications:', { error })
      setNotificationCount(0)
    }
  }, [])

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        fetchUnreadNotifications()
      })
    } else {
      Promise.resolve().then(() => {
        setNotificationCount(0)
      })
    }
  }, [user, fetchUnreadNotifications])

  const getIconComponent = useMemo(() => {
    return (iconName: string) => {
      const Icon = getIcon(iconName)
      return Icon || Heart
    }
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push(`/${locale}/landing`)
    } catch (error) {
      logger.error('Error signing out:', { error: error })
    }
  }

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  const isActive = (href: string, hasChildren: boolean = false) => {
    const fullPath = `/${locale}${href}`
    if (hasChildren) {
      return pathname === fullPath
    }
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`)
  }

  const hasActiveChild = (item: AdminMenuItem): boolean => {
    if (!item.children || item.children.length === 0) {
      return false
    }
    return item.children.some((child) => {
      const childPath = `/${locale}${child.href}`
      const childIsActive = pathname === childPath || pathname.startsWith(`${childPath}/`)
      return childIsActive || hasActiveChild(child)
    })
  }

  const filteredMenuItems = useMemo(() => {
    return filterMenuItemsByQuery(menuItems, searchQuery)
  }, [menuItems, searchQuery])

  const headerActions = (
    <div className={`flex items-center gap-1 ${locale === 'ar' ? 'flex-row-reverse' : ''}`}>
      {!isMobile && !collapsed && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="hidden size-8 shrink-0 lg:flex hover:bg-sidebar-accent"
          aria-label={t('collapseSidebar')}
        >
          <PanelLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Button>
      )}
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpenMobile(false)}
          className="lg:hidden h-8 w-8 p-0 hover:bg-sidebar-accent"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </Button>
      )}
    </div>
  )

  if (loading && menuItems.length === 0) {
    return (
      <Sidebar side={side} collapsible="icon" variant="sidebar" dir={dir}>
        <SidebarRail />
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <div
                className={cn(
                  'flex h-16 w-full items-center gap-2',
                  collapsed ? 'justify-center px-1' : 'justify-between px-2'
                )}
              >
                {!collapsed ? (
                  <Logo size="md" href={`/${locale}/dashboard`} />
                ) : (
                  <Logo size="icon" href={`/${locale}/dashboard`} showText={false} />
                )}
                {headerActions}
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {!isMobile && collapsed && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      type="button"
                      tooltip={t('expandSidebar')}
                      onClick={toggleSidebar}
                      className={inactiveMenuClass}
                      aria-label={t('expandSidebar')}
                    >
                      <PanelLeft className="h-4 w-4 rtl:rotate-180" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#6B8E7E]" />
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarFooterContent
            stableUser={stableUser}
            layoutContext={layoutContext}
            pathname={pathname}
            locale={locale}
            handleSignOut={handleSignOut}
            t={t}
          />
        </SidebarFooter>
      </Sidebar>
    )
  }

  return (
    <Sidebar side={side} collapsible="icon" variant="sidebar" dir={dir}>
      <SidebarRail />
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div
              className={cn(
                'flex min-h-16 w-full items-center gap-2 py-2',
                collapsed ? 'justify-center px-1' : 'justify-between px-2'
              )}
            >
              {!collapsed ? (
                <Logo size="md" href={`/${locale}/dashboard`} />
              ) : (
                <Logo size="icon" href={`/${locale}/dashboard`} showText={false} />
              )}
              {headerActions}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {!isMobile && collapsed && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    tooltip={t('expandSidebar')}
                    onClick={toggleSidebar}
                    className={inactiveMenuClass}
                    aria-label={t('expandSidebar')}
                  >
                    <PanelLeft className="h-4 w-4 rtl:rotate-180" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {!collapsed && (
                <SidebarMenuItem>
                  <div className="relative px-2 pb-2">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <SidebarInput
                      type="search"
                      placeholder={t('searchMenu') || 'Search menu...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-sidebar-accent/50 ps-9 focus-visible:ring-[#6B8E7E]/30"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </SidebarMenuItem>
              )}

              {!loading && filteredMenuItems.length > 0 ? (
                filteredMenuItems.map((item) => (
                  <MenuItemComponent
                    key={item.id}
                    item={item}
                    locale={locale}
                    pathname={pathname}
                    expandedModules={expandedModules}
                    toggleModule={toggleModule}
                    isActive={isActive}
                    hasActiveChild={hasActiveChild}
                    getIcon={getIconComponent}
                    notificationCount={notificationCount}
                    level={0}
                    collapsed={collapsed}
                  />
                ))
              ) : (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('')}
                      tooltip={t('home')}
                      className={cn(activeMenuClass, inactiveMenuClass)}
                    >
                      <Link href={`/${locale}`} onClick={() => isMobile && setOpenMobile(false)}>
                        <Home className="h-4 w-4" />
                        <span>{t('home')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/dashboard')}
                      tooltip={t('dashboard')}
                      className={cn(activeMenuClass, inactiveMenuClass)}
                    >
                      <Link
                        href={`/${locale}/dashboard`}
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span>{t('dashboard')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarFooterContent
          stableUser={stableUser}
          layoutContext={layoutContext}
          pathname={pathname}
          locale={locale}
          handleSignOut={handleSignOut}
          t={t}
        />
      </SidebarFooter>
    </Sidebar>
  )
}

function LayoutPickerInline({
  layoutContext,
}: {
  layoutContext: NonNullable<ReturnType<typeof useLayoutOptional>>
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-sidebar-border bg-muted/40 p-1.5">
      {(['full', 'boxed'] as const).map((variant) => {
        const Icon = variant === 'full' ? Maximize2 : Columns
        const active = layoutContext.containerVariant === variant
        return (
          <Button
            key={variant}
            variant={active ? 'default' : 'ghost'}
            size="sm"
            type="button"
            onClick={() => layoutContext.setContainerVariant(variant)}
            className={cn(
              'h-8 flex-1 px-3',
              active ? 'bg-[#6B8E7E] text-white hover:bg-[#5a7a6b]' : ''
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="ms-1.5 text-xs font-semibold">
              {variant === 'full' ? 'Full' : 'Boxed'}
            </span>
          </Button>
        )
      })}
    </div>
  )
}

function LanguagePickerInline({ pathname }: { pathname: string }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-sidebar-border bg-muted/40">
      {locales.map((loc) => {
        const currentLoc = pathname.split('/')[1] || 'en'
        const active = currentLoc === loc
        return (
          <button
            key={loc}
            type="button"
            onClick={() => {
              window.location.href = hrefForLocale(pathname, loc)
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors',
              active ? 'bg-[#E74C3C] text-white' : 'text-muted-foreground hover:bg-background'
            )}
          >
            <span className="text-lg leading-none">{loc === 'en' ? '🇬🇧' : '🇪🇬'}</span>
            <span className="font-bold">{loc === 'en' ? 'EN' : 'AR'}</span>
          </button>
        )
      })}
    </div>
  )
}

function SidebarFooterContent({
  stableUser,
  layoutContext,
  pathname,
  locale,
  handleSignOut,
  t,
}: {
  stableUser: User | null
  layoutContext: ReturnType<typeof useLayoutOptional>
  pathname: string
  locale: string
  handleSignOut: () => void
  t: (key: string) => string
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const dashboardHref = `/${locale}/dashboard`
  const dropdownSide = locale === 'ar' ? 'left' : 'right'

  const settingsMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="h-8 w-8 shrink-0 rounded-full p-0 hover:bg-sidebar-accent"
          aria-label={t('settings')}
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={dropdownSide}
        sideOffset={8}
        className="z-[100] w-64 rounded-xl border border-sidebar-border bg-background p-2 shadow-xl"
      >
        <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold">
          {t('settings')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {layoutContext ? (
          <>
            <DropdownMenuLabel className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('pageLayout')}
            </DropdownMenuLabel>
            <div className="px-3 pb-3">
              <LayoutPickerInline layoutContext={layoutContext} />
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuLabel className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('language')}
        </DropdownMenuLabel>
        <div className="px-3 pb-3">
          <LanguagePickerInline pathname={pathname} />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={!stableUser}
          className="mx-1 my-1 cursor-pointer rounded-lg px-3 py-2.5 font-semibold text-red-600 focus:bg-red-50 focus:text-red-700"
        >
          <LogOut className="me-2.5 h-4 w-4" />
          <span>{t('signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <SidebarMenu className="gap-1.5">
      {layoutContext ? (
        <>
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-2">
              <LayoutToggle />
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem className="hidden group-data-[collapsible=icon]:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip={t('pageLayout')}>
                  <Columns className="h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                side={dropdownSide}
                align="start"
                sideOffset={4}
              >
                <DropdownMenuLabel>{t('pageLayout')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['full', 'boxed'] as const).map((variant) => {
                  const Icon = variant === 'full' ? Maximize2 : Columns
                  const active = layoutContext.containerVariant === variant
                  return (
                    <DropdownMenuItem
                      key={variant}
                      onClick={() => layoutContext.setContainerVariant(variant)}
                      className={cn('gap-2', active && 'bg-sidebar-accent')}
                    >
                      <Icon className="h-4 w-4" />
                      {variant === 'full' ? 'Full' : 'Boxed'}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </>
      ) : null}

      <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
        <div className="flex justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-2">
          <LanguageSwitcher />
        </div>
      </SidebarMenuItem>
      <SidebarMenuItem className="hidden group-data-[collapsible=icon]:flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={t('language')}>
              <Globe className="h-4 w-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-48"
            side={dropdownSide}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {locales.map((loc) => {
              const currentLoc = pathname.split('/')[1] || 'en'
              const active = currentLoc === loc
              return (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => {
                    window.location.href = hrefForLocale(pathname, loc)
                  }}
                  className={cn('gap-2', active && 'bg-sidebar-accent')}
                >
                  <span className="text-base leading-none">{loc === 'en' ? '🇬🇧' : '🇪🇬'}</span>
                  <span className="font-semibold">{loc === 'en' ? 'English' : 'العربية'}</span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
        <div
          className={cn(
            'rounded-xl border border-sidebar-border bg-gradient-to-br from-sidebar-accent/40 to-sidebar p-3',
            locale === 'ar' && 'text-end'
          )}
        >
          <div
            className={cn(
              'flex w-full items-center gap-3',
              locale === 'ar' && 'flex-row-reverse'
            )}
          >
            {stableUser ? (
              <>
                <Link
                  href={dashboardHref}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6B8E7E] to-[#6B8E7E]/80 shadow-md ring-2 ring-sidebar"
                  onClick={() => isMobile && setOpenMobile(false)}
                >
                  <UserIcon className="h-5 w-5 text-white" />
                </Link>
                <Link
                  href={dashboardHref}
                  className="min-w-0 flex-1 truncate"
                  onClick={() => isMobile && setOpenMobile(false)}
                >
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">
                    {stableUser.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {stableUser.email || '…'}
                  </p>
                </Link>
                {settingsMenu()}
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="h-4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </>
            )}
          </div>
        </div>
      </SidebarMenuItem>

      <SidebarMenuItem className="hidden group-data-[collapsible=icon]:flex">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={stableUser?.email?.split('@')[0] || t('profile')}
              className="!h-10 !w-10 overflow-hidden rounded-full bg-gradient-to-br from-[#6B8E7E] to-[#6B8E7E]/80 p-0 ring-2 ring-sidebar data-[state=open]:ring-sidebar-ring"
            >
              <UserIcon className="h-5 w-5 text-white" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64"
            side={dropdownSide}
            align="start"
            sideOffset={4}
          >
            {stableUser ? (
              <DropdownMenuLabel className="truncate font-normal">
                <span className="block truncate text-sm font-medium">{stableUser.email?.split('@')[0]}</span>
                <span className="block truncate text-xs text-muted-foreground">{stableUser.email}</span>
              </DropdownMenuLabel>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={dashboardHref} onClick={() => isMobile && setOpenMobile(false)}>
                {t('dashboard')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/profile`} onClick={() => isMobile && setOpenMobile(false)}>
                {t('profile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={!stableUser}
              className="text-red-600 focus:text-red-700"
            >
              <LogOut className="me-2 h-4 w-4" />
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <SidebarMenuItem className="group-data-[collapsible=icon]:hidden px-2">
        <Button
          variant="outline"
          type="button"
          onClick={handleSignOut}
          disabled={!stableUser}
          className="w-full border-red-200/60 bg-background hover:border-red-300 hover:text-[#E74C3C]"
        >
          <LogOut className="me-2 h-4 w-4" />
          {t('signOut')}
        </Button>
      </SidebarMenuItem>

      <SidebarMenuItem className="hidden group-data-[collapsible=icon]:flex">
        <SidebarMenuButton
          type="button"
          tooltip={t('signOut')}
          disabled={!stableUser}
          onClick={handleSignOut}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function MenuItemComponent({
  item,
  locale,
  pathname,
  expandedModules,
  toggleModule,
  isActive,
  hasActiveChild,
  getIcon,
  notificationCount = 0,
  level = 0,
  collapsed = false,
}: {
  item: AdminMenuItem
  locale: string
  pathname: string
  expandedModules: Set<string>
  toggleModule: (id: string) => void
  isActive: (href: string, hasChildren?: boolean) => boolean
  hasActiveChild: (item: AdminMenuItem) => boolean
  getIcon: (iconName: string) => React.ComponentType<{ className?: string }>
  notificationCount?: number
  level?: number
  collapsed?: boolean
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const IconComponent = useMemo(() => getIcon(item.icon || 'Heart'), [item.icon, getIcon])
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedModules.has(item.id)
  const itemPath = `/${locale}${item.href}`
  const childIsActive = hasChildren ? hasActiveChild(item) : false
  const itemIsActive = hasChildren
    ? isActive(item.href, true) && !childIsActive
    : isActive(item.href, false)
  const isNotifications = item.href === '/notifications'
  const displayLabel = locale === 'ar' && item.label_ar ? item.label_ar : item.label

  const onNavigate = () => {
    if (isMobile) setOpenMobile(false)
  }

  const subListClass =
    locale === 'ar'
      ? 'mx-3.5 border-l-0 border-r border-sidebar-border pe-2.5 ps-0'
      : undefined

  if (hasChildren) {
    if (collapsed && level === 0) {
      return (
        <CollapsedParentNav
          item={item}
          locale={locale}
          isActive={isActive}
          hasActiveChild={hasActiveChild}
          getIcon={getIcon}
          notificationCount={notificationCount}
        />
      )
    }

    if (collapsed) {
      return null
    }

    const triggerBtn =
      level === 0 ? (
        <SidebarMenuButton
          className={cn(
            itemIsActive ? activeMenuClass : inactiveMenuClass,
            'w-full justify-between'
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <IconComponent className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </SidebarMenuButton>
      ) : (
        <SidebarMenuSubButton
          className={cn(itemIsActive ? activeMenuClass : inactiveMenuClass, 'w-full justify-between')}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <IconComponent className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </SidebarMenuSubButton>
      )

    const branch = (
      <Collapsible
        open={isExpanded}
        onOpenChange={(next) => {
          if (next !== isExpanded) toggleModule(item.id)
        }}
      >
        <CollapsibleTrigger asChild>{triggerBtn}</CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className={subListClass}>
            {item.children!.map((child) => (
              <MenuItemComponent
                key={child.id}
                item={child}
                locale={locale}
                pathname={pathname}
                expandedModules={expandedModules}
                toggleModule={toggleModule}
                isActive={isActive}
                hasActiveChild={hasActiveChild}
                getIcon={getIcon}
                notificationCount={notificationCount}
                level={level + 1}
                collapsed={collapsed}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    )

    if (level === 0) {
      return <SidebarMenuItem>{branch}</SidebarMenuItem>
    }

    return <SidebarMenuSubItem>{branch}</SidebarMenuSubItem>
  }

  const leafInner = (
    <>
      <IconComponent className="h-4 w-4 shrink-0" />
      {!collapsed ? <span className="truncate">{displayLabel}</span> : null}
    </>
  )

  if (level === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={itemIsActive}
          tooltip={displayLabel}
          className={cn(
            activeMenuClass,
            inactiveMenuClass,
            isNotifications && !collapsed && notificationCount > 0 ? 'pe-8' : ''
          )}
        >
          <Link href={itemPath} onClick={onNavigate} className="flex w-full items-center gap-2">
            {leafInner}
          </Link>
        </SidebarMenuButton>
        {isNotifications && notificationCount > 0 ? (
          <SidebarMenuBadge
            className={cn(
              '!bg-[#E74C3C] !text-white end-0.5 top-0.5 border-0 shadow-sm',
              collapsed &&
                'end-0.5 top-0.5 z-[1] h-4 min-h-4 min-w-4 max-w-[2.25rem] rounded-full px-0.5 text-[9px] leading-none ring-2 ring-sidebar'
            )}
          >
            {formatNotificationCount(notificationCount)}
          </SidebarMenuBadge>
        ) : null}
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={itemIsActive} size="md">
        <Link
          href={itemPath}
          onClick={onNavigate}
          className={cn(
            'flex w-full items-center gap-2',
            isNotifications && !collapsed && notificationCount > 0 && 'pe-6'
          )}
        >
          {leafInner}
          {!collapsed && isNotifications && notificationCount > 0 ? (
            <Badge
              variant="destructive"
              className="ms-auto min-w-[1.5rem] shrink-0 bg-[#E74C3C] px-1 text-xs text-white"
            >
              {formatNotificationCount(notificationCount)}
            </Badge>
          ) : null}
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}
