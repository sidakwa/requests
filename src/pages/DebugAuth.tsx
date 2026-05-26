import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DebugAuth() {
  const { user, userRole, loading } = useAuth()
  const [dbProfile, setDbProfile] = useState<any>(null)
  const [loadingDb, setLoadingDb] = useState(false)

  const checkDatabase = async () => {
    if (!user) return
    
    setLoadingDb(true)
    try {
      // Check profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) {
        setDbProfile({ error: error.message })
      } else {
        setDbProfile(profile)
      }
      
      // Also check if user exists in any role-specific tables
      const { data: adminCheck } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .eq('role', 'admin')
        .single()
      
    } catch (err) {
    } finally {
      setLoadingDb(false)
    }
  }

  const updateRoleToAdmin = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id)
      .select()
    
    if (error) {
      alert('Error updating role: ' + error.message)
    } else {
      alert('Role updated to admin! Please refresh the page.')
      setDbProfile(data?.[0])
    }
  }

  if (loading) {
    return <div className="p-8">Loading auth...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Auth Debug Page</h1>
      
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Current Auth State</h2>
          <div className="space-y-2">
            <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
            <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
            <p><strong>Auth Role State:</strong> {userRole || 'null'}</p>
            <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
          </div>
        </CardContent>
      </Card>

      {user && (
        <>
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Database Profile</h2>
              <Button onClick={checkDatabase} disabled={loadingDb}>
                {loadingDb ? 'Checking...' : 'Check Database'}
              </Button>
              {dbProfile && (
                <pre className="bg-gray-100 p-4 rounded mt-4 overflow-auto">
                  {JSON.stringify(dbProfile, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Actions</h2>
              <Button onClick={updateRoleToAdmin} variant="default">
                Force Update Role to Admin
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Use this if your role in the database is not 'admin'
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
