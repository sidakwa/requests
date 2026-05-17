import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, RefreshCw, Users, Shield, AlertCircle } from 'lucide-react'
import { directorySync } from '@/api/directorySyncApi'
import { toast } from 'sonner'

export function IntegrationTab() {
  const [syncing, setSyncing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncStatus, setSyncStatus] = useState(directorySync.getSyncStatus())
  const [azureConfig, setAzureConfig] = useState({
    tenant_id: import.meta.env.VITE_AZURE_TENANT_ID || '',
    client_id: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    notification_channel: 'teams_email'
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(directorySync.getSyncStatus())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const result = await directorySync.testConnection()
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSyncUsers = async () => {
    setSyncing(true)
    try {
      const result = await directorySync.syncUsers()
      if (result.success) {
        toast.success(result.message)
        setSyncStatus(directorySync.getSyncStatus())
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Azure & System Integration</CardTitle>
        <CardDescription>Configure Azure Entra ID and API settings for directory synchronization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className={`p-4 rounded-lg border ${syncStatus.isConfigured ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center gap-3">
            {syncStatus.isConfigured ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <div>
              <p className={`font-medium ${syncStatus.isConfigured ? 'text-green-900' : 'text-yellow-900'}`}>
                {syncStatus.isConfigured ? '✓ Azure Entra ID Configured' : '⚠ Azure AD Configuration Required'}
              </p>
              {syncStatus.lastSyncTime && (
                <p className="text-sm text-green-700 mt-1">
                  Last sync: {syncStatus.lastSyncTime.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <div>
            <Label>Tenant ID</Label>
            <Input 
              value={azureConfig.tenant_id} 
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Set in .env.local as VITE_AZURE_TENANT_ID</p>
          </div>
          <div>
            <Label>Client ID</Label>
            <Input 
              value={azureConfig.client_id} 
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Set in .env.local as VITE_AZURE_CLIENT_ID</p>
          </div>
          <div>
            <Label>Notification Channel</Label>
            <select 
              className="w-full p-2 border rounded-md"
              value={azureConfig.notification_channel}
              onChange={(e) => setAzureConfig({...azureConfig, notification_channel: e.target.value})}
            >
              <option value="teams_email">Teams + Email</option>
              <option value="email">Email Only</option>
              <option value="teams">Teams Only</option>
            </select>
          </div>
        </div>

        {/* Directory Sync Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <h4 className="font-semibold">Directory Sync</h4>
            </div>
            <Badge>Microsoft Graph API v1.0</Badge>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleSyncUsers}
            disabled={syncing || !syncStatus.isConfigured}
          >
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync Users from Azure AD
          </Button>
          
          <Alert className="mt-4 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800 text-sm">
              <strong>To enable full Azure AD sync:</strong><br />
              1. Deploy the Edge Function: <code className="bg-blue-100 px-1 rounded">supabase functions deploy azure-sync-users</code><br />
              2. Set client secret: <code className="bg-blue-100 px-1 rounded">supabase secrets set AZURE_CLIENT_SECRET=your_secret</code><br />
              3. Grant Graph API permissions: User.Read.All, Group.Read.All
            </AlertDescription>
          </Alert>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t">
          <Button 
            onClick={handleTestConnection} 
            disabled={testing}
            variant="secondary"
          >
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
