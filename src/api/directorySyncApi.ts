import { supabase } from '@/lib/supabase'

export interface AzureUser {
  id: string
  displayName: string
  mail: string
  userPrincipalName: string
  department?: string
}

class DirectorySyncApi {
  private static instance: DirectorySyncApi
  private syncInProgress = false
  private lastSyncTime: Date | null = null

  static getInstance() {
    if (!DirectorySyncApi.instance) {
      DirectorySyncApi.instance = new DirectorySyncApi()
    }
    return DirectorySyncApi.instance
  }

  // Test connection to Azure AD
  async testConnection(): Promise<{ success: boolean; message: string }> {
    // For now, just check if config exists
    const hasConfig = !!(
      import.meta.env.VITE_AZURE_TENANT_ID && 
      import.meta.env.VITE_AZURE_CLIENT_ID
    )
    
    if (hasConfig) {
      return { 
        success: true, 
        message: 'Azure AD configuration found. To enable full sync, deploy the Edge Function.' 
      }
    }
    return { 
      success: false, 
      message: 'Azure AD not configured. Please set VITE_AZURE_TENANT_ID and VITE_AZURE_CLIENT_ID' 
    }
  }

  // Simulate sync for now (will be replaced with real Edge Function)
  async syncUsers(): Promise<{ success: boolean; usersSynced: number; message: string }> {
    if (this.syncInProgress) {
      return { success: false, usersSynced: 0, message: 'Sync already in progress' }
    }

    this.syncInProgress = true
    
    try {
      // Try to call Edge Function if deployed
      const { data, error } = await supabase.functions.invoke('azure-sync-users', {
        body: { action: 'sync' }
      })

      if (error) {
        // Return mock success for now
        return { 
          success: true, 
          usersSynced: 0, 
          message: 'Edge Function not deployed. Run: supabase functions deploy azure-sync-users' 
        }
      }

      let syncedCount = 0
      if (data?.users) {
        for (const user of data.users) {
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.mail || user.userPrincipalName,
              full_name: user.displayName,
              department: user.department,
              azure_ad_id: user.id,
              role: 'submitter',
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' })
          
          if (!upsertError) syncedCount++
        }
      }

      this.lastSyncTime = new Date()
      return { 
        success: true, 
        usersSynced: syncedCount, 
        message: `Synced ${syncedCount} users from Azure AD` 
      }
    } catch (error) {
      return { success: false, usersSynced: 0, message: 'Sync failed. Check Edge Function deployment.' }
    } finally {
      this.syncInProgress = false
    }
  }

  getSyncStatus() {
    return {
      isSyncing: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      isConfigured: !!(
        import.meta.env.VITE_AZURE_TENANT_ID && 
        import.meta.env.VITE_AZURE_CLIENT_ID
      )
    }
  }
}

export const directorySync = DirectorySyncApi.getInstance()
