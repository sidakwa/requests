import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  User, Mail, Building2, Shield, Calendar, 
  Save, Edit2, Key, Bell, Globe, DollarSign,
  Loader2, CheckCircle, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
  department: string
  business_unit: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

interface UserRequest {
  id: string
  request_number: string
  title: string
  amount: number
  currency: string
  status: string
  created_at: string
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    business_unit: ''
  })
  const [userRequests, setUserRequests] = useState<UserRequest[]>([])
  const [stats, setStats] = useState({
    totalRequests: 0,
    approvedRequests: 0,
    pendingRequests: 0,
    totalAmount: 0
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        department: profile.department || '',
        business_unit: profile.business_unit || ''
      })
    }
    if (user) {
      fetchUserRequests()
    }
  }, [profile, user])

  const fetchUserRequests = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('funding_requests')
      .select('id, request_number, title, amount, currency, status, created_at')
      .eq('requester_email', user.email)
      .order('created_at', { ascending: false })
    
    if (error) {
      return
    }
    
    setUserRequests(data || [])
    
    // Calculate stats
    const total = data?.length || 0
    const approved = data?.filter(r => r.status === 'Approved').length || 0
    const pending = data?.filter(r => r.status === 'Pending').length || 0
    const totalAmount = data?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    
    setStats({ totalRequests: total, approvedRequests: approved, pendingRequests: pending, totalAmount })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          department: formData.department,
          business_unit: formData.business_unit,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)
      
      if (error) throw error
      
      await refreshProfile()
      toast.success('Profile updated successfully')
      setEditing(false)
    } catch (err) {
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700'
      case 'approver': return 'bg-blue-100 text-blue-700'
      case 'manager': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700'
      case 'Pending': return 'bg-yellow-100 text-yellow-700'
      case 'Returned': return 'bg-orange-100 text-orange-700'
      case 'Rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Not Signed In</h3>
            <p className="text-gray-600">Please sign in to view your profile</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>View and manage your profile details</CardDescription>
          </div>
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={getRoleBadgeColor(profile?.role || 'submitter')}>
                  <Shield className="w-3 h-3 mr-1" />
                  {profile?.role || 'Submitter'}
                </Badge>
                <Badge variant="outline">
                  <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                  Active
                </Badge>
              </div>
              <p className="text-sm text-gray-500">Member since {format(new Date(profile?.created_at || user.created_at), 'MMMM yyyy')}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-500">Full Name</Label>
              {editing ? (
                <Input 
                  value={formData.full_name} 
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="mt-1"
                />
              ) : (
                <p className="text-lg font-medium mt-1">{profile?.full_name || 'Not set'}</p>
              )}
            </div>
            <div>
              <Label className="text-gray-500">Email Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-gray-400" />
                <p className="text-lg font-medium">{user.email}</p>
              </div>
            </div>
            <div>
              <Label className="text-gray-500">Department</Label>
              {editing ? (
                <Input 
                  value={formData.department} 
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="mt-1"
                  placeholder="e.g., Engineering, Finance"
                />
              ) : (
                <p className="text-lg font-medium mt-1">{profile?.department || 'Not specified'}</p>
              )}
            </div>
            <div>
              <Label className="text-gray-500">Business Unit</Label>
              {editing ? (
                <Input 
                  value={formData.business_unit} 
                  onChange={(e) => setFormData({...formData, business_unit: e.target.value})}
                  className="mt-1"
                  placeholder="DI or DS"
                />
              ) : (
                <p className="text-lg font-medium mt-1">{profile?.business_unit || 'Not specified'}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.totalRequests}</p>
            <p className="text-sm text-gray-500">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.approvedRequests}</p>
            <p className="text-sm text-gray-500">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">${(stats.totalAmount / 1000).toFixed(0)}k</p>
            <p className="text-sm text-gray-500">Total Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>Your 5 most recent funding requests</CardDescription>
        </CardHeader>
        <CardContent>
          {userRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No requests found. Create your first request!
            </div>
          ) : (
            <div className="space-y-3">
              {userRequests.slice(0, 5).map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{req.title}</p>
                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                      <span className="font-mono">{req.request_number}</span>
                      <span>{req.currency} {req.amount?.toLocaleString()}</span>
                      <span>{format(new Date(req.created_at), 'PPP')}</span>
                    </div>
                  </div>
                  <Badge className={getStatusBadge(req.status)}>{req.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive updates about your requests</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Language & Region</p>
                <p className="text-sm text-gray-500">English (US) / USD</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Change</Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium">Security</p>
                <p className="text-sm text-gray-500">Manage your password and security settings</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Update</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
