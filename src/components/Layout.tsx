import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  FileText,
  Inbox,
  BarChart3,
  Settings,
  LogOut,
  CircleDollarSign,
  User,
  PlusCircle,
  History,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  badge?: boolean
}

const getNavigation = (userRole: string | null): NavItem[] => {
  const baseNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Overview & key metrics' },
    { name: 'My Requests', href: '/my-requests', icon: FileText, description: 'View and track your requests' },
    { name: 'New Request', href: '/new-request', icon: PlusCircle, description: 'Create CAPEX request' },
  ]

  const approverNav = [
    { name: 'Approvals Inbox', href: '/approvals', icon: Inbox, description: 'Pending approvals', badge: true }
  ]

  const reportsNav = [
    { name: 'Reports & Analytics', href: '/reports', icon: BarChart3, description: 'Insights and forecasts' }
  ]

  const adminNav = [
    { name: 'Admin Panel', href: '/admin', icon: Settings, description: 'System configuration' }
  ]

  let nav = [...baseNav]
  if (userRole === 'approver' || userRole === 'admin') nav = [...nav, ...approverNav]
  nav = [...nav, ...reportsNav]
  if (userRole === 'admin') nav = [...nav, ...adminNav]
  return nav
}

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, profile, signOut, userRole } = useAuth()
  const navigation = getNavigation(userRole)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile nav tap)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const getRoleBadgeClass = () => {
    switch (userRole) {
      case 'admin': return 'bg-purple-100 text-purple-700'
      case 'approver': return 'bg-blue-100 text-blue-700'
      case 'submitter': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <CircleDollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">CAPEX Portal</h1>
            <p className="text-xs text-gray-500">SEACOM</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          className="md:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={cn(
                  'w-4 h-4 mr-3 flex-shrink-0 transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                )} />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </Link>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-100">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</p>
          <div className="mt-2 space-y-1">
            <Link to="/new-request" className="flex items-center px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
              <PlusCircle className="w-4 h-4 mr-3 flex-shrink-0" />
              New CAPEX Request
            </Link>
            <Link to="/my-requests" className="flex items-center px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
              <History className="w-4 h-4 mr-3 flex-shrink-0" />
              My Recent Requests
            </Link>
          </div>
        </div>

        {/* Help */}
        <div className="pt-4 border-t border-gray-100">
          <Link to="/help" className="flex items-center px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
            <HelpCircle className="w-4 h-4 mr-3 flex-shrink-0" />
            Help & Support
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors">
              <Avatar className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600">
                <AvatarFallback className="text-white text-sm">
                  {profile?.full_name ? getInitials(profile.full_name) : user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className={cn('text-xs capitalize rounded px-1.5 py-0.5 inline-block mt-0.5', getRoleBadgeClass())}>
                  {userRole || 'submitter'}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = '/my-requests'}>
              <FileText className="mr-2 h-4 w-4" />
              <span>My Requests</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out',
          'md:relative md:w-64 md:translate-x-0 md:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Right side: top bar + content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <CircleDollarSign className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">CAPEX Portal</span>
          </div>
          {/* Avatar shortcut on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="w-8 h-8 cursor-pointer bg-gradient-to-br from-blue-500 to-blue-600">
                <AvatarFallback className="text-white text-sm">
                  {profile?.full_name ? getInitials(profile.full_name) : user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="truncate text-xs">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
