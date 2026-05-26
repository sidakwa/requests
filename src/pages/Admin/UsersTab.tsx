import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw, Search, Shield, Users, UserCheck, UserCog,
  Mail, Calendar, Building2, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

type Role = 'admin' | 'approver' | 'submitter'

interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  role: Role | null
  department: string | null
  business_unit: string | null
  created_at: string | null
  last_sign_in_at: string | null
}

const ROLE_CONFIG: Record<Role, { label: string; badge: string; icon: typeof Shield }> = {
  admin:     { label: 'Admin',     badge: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield },
  approver:  { label: 'Approver',  badge: 'bg-blue-100 text-blue-700 border-blue-200',       icon: UserCheck },
  submitter: { label: 'Submitter', badge: 'bg-green-100 text-green-700 border-green-200',    icon: Users },
}

function RoleBadge({ role }: { role: Role | null }) {
  if (!role || !ROLE_CONFIG[role]) {
    return <Badge variant="outline" className="text-gray-500">No role</Badge>
  }
  const cfg = ROLE_CONFIG[role]
  const Icon = cfg.icon
  return (
    <Badge className={`${cfg.badge} border gap-1`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  )
}

export function UsersTab() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')

  // Role change dialog
  const [pendingChange, setPendingChange] = useState<{ user: UserProfile; newRole: Role } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-users')
      if (error) throw error
      setUsers((data?.users || []) as UserProfile[])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const confirmRoleChange = (user: UserProfile, newRole: Role) => {
    if (user.role === newRole) return
    if (user.id === currentUser?.id && newRole !== 'admin') {
      toast.error("You can't remove your own admin role")
      return
    }
    setPendingChange({ user, newRole })
  }

  const applyRoleChange = async () => {
    if (!pendingChange) return
    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-role', {
        body: {
          userId: pendingChange.user.id,
          newRole: pendingChange.newRole,
          email: pendingChange.user.email,
          fullName: pendingChange.user.full_name,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      setUsers(prev =>
        prev.map(u => u.id === pendingChange.user.id ? { ...u, role: pendingChange.newRole } : u)
      )
      toast.success(`${pendingChange.user.full_name || pendingChange.user.email} → ${ROLE_CONFIG[pendingChange.newRole].label}`)
    } catch {
      toast.error('Failed to update role')
    } finally {
      setSaving(false)
      setPendingChange(null)
    }
  }

  // Stats
  const stats = {
    total:     users.length,
    admins:    users.filter(u => u.role === 'admin').length,
    approvers: users.filter(u => u.role === 'approver').length,
    submitters: users.filter(u => u.role === 'submitter').length,
  }

  // Filter
  const filtered = users.filter(u => {
    const matchesSearch =
      !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Admins</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{stats.admins}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Approvers</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{stats.approvers}</p>
              </div>
              <UserCheck className="w-8 h-8 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Submitters</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{stats.submitters}</p>
              </div>
              <UserCog className="w-8 h-8 text-green-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Azure AD Users</CardTitle>
              <CardDescription>All users who have signed in via Azure AD. Assign roles to control access.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={v => setRoleFilter(v as Role | 'all')}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="approver">Approver</SelectItem>
                <SelectItem value="submitter">Submitter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No users found</p>
              <p className="text-sm mt-1">{search ? 'Try a different search term' : 'No users have signed in yet'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(u => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors">

                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {u.full_name || '(no name)'}
                        </p>
                        {u.id === currentUser?.id && (
                          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded">You</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{u.email || '—'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {u.department && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Building2 className="w-3 h-3" />{u.department}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {u.last_sign_in_at
                            ? `Last seen ${format(new Date(u.last_sign_in_at), 'dd MMM yyyy')}`
                            : 'Never signed in'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Role + actions */}
                  <div className="flex items-center gap-3 flex-shrink-0 pl-12 sm:pl-0">
                    <RoleBadge role={u.role} />
                    <Select
                      value={u.role || 'submitter'}
                      onValueChange={v => confirmRoleChange(u, v as Role)}
                      disabled={u.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitter">Submitter</SelectItem>
                        <SelectItem value="approver">Approver</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {filtered.length} of {users.length} users
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm role change dialog */}
      <Dialog open={!!pendingChange} onOpenChange={open => { if (!open) setPendingChange(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Role Change
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p>You are about to change the role for:</p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900">{pendingChange?.user.full_name || pendingChange?.user.email}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{pendingChange?.user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <RoleBadge role={pendingChange?.user.role ?? null} />
                    <span className="text-gray-400 text-xs">→</span>
                    {pendingChange && <RoleBadge role={pendingChange.newRole} />}
                  </div>
                </div>
                {pendingChange?.newRole === 'admin' && (
                  <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Admins have full access to all system settings, user management, and data. Only grant this role to trusted personnel.</span>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingChange(null)}>Cancel</Button>
            <Button
              onClick={applyRoleChange}
              disabled={saving}
              className={pendingChange?.newRole === 'admin' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
