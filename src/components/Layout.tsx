import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { 
  LayoutDashboard, 
  FileText, 
  Inbox, 
  BarChart3, 
  Settings,
  LogOut,
  User,
  CircleDollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'My Requests', href: '/my-requests', icon: FileText },
  { name: 'Approvals Inbox', href: '/approvals', icon: Inbox },
  { name: 'New Request', href: '/new-request', icon: CircleDollarSign },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Admin', href: '/admin', icon: Settings },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { user, profile, signOut } = useAuthStore()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Funding Portal</h1>
              <p className="text-xs text-gray-500">SEACOM</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn(
                  "w-4 h-4 mr-3",
                  isActive ? "text-blue-600" : "text-gray-400"
                )} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {profile?.role || 'submitter'}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-400 hover:text-gray-600"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
